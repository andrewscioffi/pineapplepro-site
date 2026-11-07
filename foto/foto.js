// A FOTO COM CARA DE CARDÁPIO (v3, 07/11/2026, o Andrews: "eu quero que a interface seja altamente interativa").
// A demonstração da página, em 6 partes:
//   0. o antes e depois de verdade (antes-depois.js), no começo: 4 exemplos reais (07/11, o Andrews: "a gente podia pôr
//      exemplo real nosso"). Um toque troca a foto do celular pela revitalizada; deslizar troca o exemplo. A foto
//      revitalizada do exemplo escolhido vai junto pros lugares e pra marca (o --foto-exemplo), até a pessoa pôr a dela
//   1. o estudo de luz (luz.js): a pessoa arrasta a janela em volta da esfera e a luz, o brilho e a sombra vão junto;
//      quando a luz vem de onde o robô pede (da esquerda), acende "é assim que a gente pede"
//   2. os lugares (lugares.js): a mesma foto, quadrada como o robô entrega, na lista, no cartão, aberta, no feed e na
//      grade do Instagram (que corta em 3:4); a moldura muda de forma e a foto se arrasta dentro dela
//   3. a marca da amostra (divisoria.js): a linha entre a amostra grátis (com a marca) e o pacote (sem a marca)
//   4. a foto da pessoa: solta em qualquer lugar da página (ou pelo botão), ela "cai" no lugar com o estouro, e a medida
//      da luz aparece com os números rolando. A foto abre aqui mesmo (um endereço do próprio aparelho, blob:) e nunca sai
//      dele. Fechou a página, ela some. Nada é enviado, nada é guardado
//   5. as guias (luz, fundo, ângulo, prato cheio): entram e saem com animação, uma por vez ou todas juntas
// Nada aqui finge a IA: a foto da pessoa é mostrada do jeito que ela está (a revitalizada dela sai no Direct); os
// exemplos do começo são fotos revitalizadas de verdade, cada uma com o antes dela.
// As contas (e os textos) ficam em contas.js: o teste confere sem navegador.
export * from './contas.js';
import {
  ORDEM_DAS_GUIAS, GUIA_NENHUMA, GUIA_TODAS, LUZES, LUZ_DICA, textoDaGuia, textoDaLuz, seloDaMedida, seloDaLuz,
  corteNoMeio, medirLuz, numerosDaMedida, vistaAoLado, fotoDoExemplo,
} from './contas.js';
import { animarNumero, estourarEm, vibrar, pedeMenosMovimento } from '../comum/interacao.js';
import { ligarAntesDepois } from './antes-depois.js';
import { ligarEstudo } from './luz.js';
import { ligarLugares } from './lugares.js';
import { ligarDivisoria } from './divisoria.js';

const pedeMenos = () => pedeMenosMovimento();

/**
 * O passeio: enquanto ninguém mexe, os passos se revezam sozinhos (a cada `ms`), só com a área na tela.
 * Para no 1º toque, tecla ou foco dentro da área. Sem passeio pra quem pediu menos movimento.
 */
function passear(area, passo, ms, parou = () => {}) {
  if (!area || pedeMenos() || typeof IntersectionObserver !== 'function') return () => {};
  let relogio = 0;
  let ativo = true;
  const parar = () => {
    if (!ativo) return;
    ativo = false;
    clearInterval(relogio);
    olho.disconnect();
    parou();
  };
  const olho = new IntersectionObserver(([e]) => {
    clearInterval(relogio);
    if (ativo && e?.isIntersecting) relogio = setInterval(passo, ms);
  }, { threshold: 0.35 });
  olho.observe(area);
  for (const n of ['pointerdown', 'keydown', 'focusin', 'drop']) area.addEventListener(n, parar, { capture: true, once: true });
  return parar;
}

function medirNaTela(img) {
  const lado = 64;
  const tela = document.createElement('canvas');
  tela.width = lado;
  tela.height = lado;
  const ctx = tela.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const c = corteNoMeio(img.naturalWidth, img.naturalHeight);
  if (!c.lado) return null;
  ctx.drawImage(img, c.sx, c.sy, c.lado, c.lado, 0, 0, lado, lado);
  return medirLuz(ctx.getImageData(0, 0, lado, lado).data, lado, lado);
}

function ligarPagina(doc) {
  const raiz = doc.documentElement;
  const quadro = doc.querySelector('[data-quadro-img]');
  const figura = doc.querySelector('[data-quadro]') ?? quadro;
  const foto = doc.querySelector('[data-foto]');
  if (!quadro || !foto) return;
  const entrada = doc.querySelector('[data-arquivo]');
  const soltar = doc.querySelector('[data-soltar]');
  const voltar = doc.querySelector('[data-voltar]');
  const aviso = doc.querySelector('[data-aviso-foto]');
  const rotulo = doc.querySelector('[data-quadro-rot]');
  const tituloSoltar = doc.querySelector('[data-soltar-titulo]');
  const diz = doc.querySelector('[data-diz]');
  const medido = doc.querySelector('[data-medido]');
  const zonaEl = doc.querySelector('[data-luz-zona]');
  const zonaTxt = doc.querySelector('[data-luz-zona-txt]');
  const palcoRot = doc.querySelector('[data-palco-rot]');
  const palcoVivo = doc.querySelector('[data-palco-vivo]');
  const janela = doc.querySelector('[data-janela]');
  const painel = doc.querySelector('[data-medida]');
  const chipsGuia = [...doc.querySelectorAll('[data-guia]')];
  const solte = doc.querySelector('[data-solte]');
  const EXEMPLO = foto.getAttribute('src');
  const ALT_EXEMPLO = foto.dataset.altExemplo || foto.alt;
  const ROTULO_EXEMPLO = rotulo?.textContent ?? '';
  const TITULO_SOLTAR = tituloSoltar?.textContent ?? '';
  let endereco = null; // o blob: da foto da pessoa (só existe neste aparelho)
  let medida = null;
  let ultimaGuia = null;
  let ultimoEstouro = 0;

  const avisar = (texto, erro = false) => { if (aviso) { aviso.textContent = texto; aviso.classList.toggle('erro', erro); } };
  // o texto embaixo do quadro (a luz da janela ou a guia mexida por último): troca com uma entradinha
  const dizer = (texto) => {
    if (!diz || diz.textContent === texto) return;
    diz.textContent = texto;
    if (pedeMenos()) return;
    diz.classList.remove('troca');
    void diz.offsetWidth;
    diz.classList.add('troca');
  };
  const temFoto = () => Boolean(endereco);

  // ---------- 0. o antes e depois de verdade: a revitalizada do exemplo escolhido vai pros lugares e pra marca ----------
  ligarAntesDepois(doc.querySelector('[data-ad]'), {
    aoTrocarExemplo: (ex) => raiz.style.setProperty('--foto-exemplo', `url("${new URL(fotoDoExemplo(ex.id, 'depois'), doc.baseURI).href}")`),
  });

  // ---------- 1. o estudo de luz ----------
  const estudo = ligarEstudo(quadro, {
    aoComecar: () => { janela?.classList.remove('convida'); ultimaGuia = null; marcarFala(); },
    aoMudar: (luz, { quem }) => {
      if (zonaTxt) zonaTxt.textContent = seloDaLuz(luz);
      if (temFoto()) return;
      // na apresentação, o texto só troca no fim (quando a luz chega da esquerda); com a pessoa, a cada zona
      if (quem === 'pessoa' || quem === 'teclado' || (quem === 'intro' && luz.certa)) dizer(LUZES[luz.zona] ?? LUZ_DICA);
      // a pessoa achou a luz que o robô pede: o "deu certo"
      if (luz.certa && (quem === 'pessoa' || quem === 'teclado') && Date.now() - ultimoEstouro > 1400) {
        ultimoEstouro = Date.now();
        if (zonaEl && !pedeMenos()) { zonaEl.classList.remove('acendeu'); void zonaEl.offsetWidth; zonaEl.classList.add('acendeu'); }
        estourarEm(zonaEl ?? quadro, { quantos: 16, raio: 60 });
        vibrar(12);
      }
    },
  });
  // a apresentação: a janela dá a volta sozinha uma vez, quando o quadro aparece na tela
  if (estudo && typeof IntersectionObserver === 'function' && !pedeMenos()) {
    const olho = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      olho.disconnect();
      setTimeout(() => { if (!temFoto() && !estudo.mexeu()) estudo.intro(); }, 700);
    }, { threshold: 0.55 });
    olho.observe(quadro);
  }

  // ---------- 5. as guias ----------
  const chip = (g) => chipsGuia.find((b) => b.dataset.guia === g);
  const ligada = (g) => chip(g)?.getAttribute('aria-pressed') === 'true';
  const ligadas = () => ORDEM_DAS_GUIAS.filter(ligada);
  function marcarFala() {
    for (const camada of quadro.querySelectorAll('[data-camada]')) camada.classList.toggle('falando', camada.dataset.camada === ultimaGuia);
  }
  function mostrarGuias() {
    const on = ligadas();
    for (const camada of quadro.querySelectorAll('[data-camada]')) camada.classList.toggle('ligada', on.includes(camada.dataset.camada));
    marcarFala();
    chip('todas')?.setAttribute('aria-pressed', String(on.length === ORDEM_DAS_GUIAS.length));
    quadro.classList.toggle('com-guia-luz', on.includes('luz'));
    if (medido) {
      const mostra = Boolean(medida) && on.includes('luz');
      medido.hidden = !mostra;
      if (mostra) { medido.dataset.lado = medida.lado; medido.textContent = seloDaMedida(medida); }
    }
  }
  function ligarGuia(guia, ligar, { falar = true } = {}) {
    const b = chip(guia);
    if (!b) return;
    b.setAttribute('aria-pressed', String(ligar));
    if (ligar) ultimaGuia = guia;
    else if (ultimaGuia === guia) ultimaGuia = ligadas().at(-1) ?? null;
    mostrarGuias();
    if (falar) dizer(ultimaGuia ? textoDaGuia(ultimaGuia, medida) : temFoto() ? textoDaLuz(medida) : GUIA_NENHUMA);
  }
  // "Todas": uma de cada vez (a luz, o fundo, o ângulo e o prato), e depois o resumo; de novo, saem uma por uma
  let fila = [];
  const limparFila = () => { for (const t of fila) clearTimeout(t); fila = []; };
  function todas() {
    limparFila();
    const espera = pedeMenos() ? 0 : 190;
    if (ligadas().length === ORDEM_DAS_GUIAS.length) {
      [...ORDEM_DAS_GUIAS].reverse().forEach((g, i) => fila.push(setTimeout(() => ligarGuia(g, false, { falar: false }), i * espera * 0.6)));
      fila.push(setTimeout(() => dizer(temFoto() ? textoDaLuz(medida) : GUIA_NENHUMA), ORDEM_DAS_GUIAS.length * espera * 0.6));
      return;
    }
    ORDEM_DAS_GUIAS.filter((g) => !ligada(g)).forEach((g, i) => fila.push(setTimeout(() => ligarGuia(g, true, { falar: false }), i * espera)));
    fila.push(setTimeout(() => { ultimaGuia = null; marcarFala(); dizer(GUIA_TODAS); }, ORDEM_DAS_GUIAS.length * espera));
  }
  for (const b of chipsGuia) {
    b.addEventListener('click', () => {
      if (b.dataset.guia === 'todas') { todas(); return; }
      limparFila();
      ligarGuia(b.dataset.guia, !ligada(b.dataset.guia));
    });
  }

  // ---------- 2 e 3. os lugares e a marca ----------
  const secaoLugares = doc.querySelector('[data-foto-cai="lugares"]');
  const secaoMarca = doc.querySelector('[data-foto-cai="marca"]');
  const lugares = ligarLugares(secaoLugares, { aoMexer: () => pararPasseio() });
  const pararPasseio = passear(secaoLugares?.querySelector('[data-celular]'), () => {
    if (!lugares) return;
    secaoLugares.querySelector('[data-vista-diz]')?.setAttribute('aria-live', 'off');
    lugares.ir(vistaAoLado(lugares.vista(), 1, { volta: true }));
  }, 2900, () => secaoLugares?.querySelector('[data-vista-diz]')?.setAttribute('aria-live', 'polite'));
  ligarDivisoria(secaoMarca);

  // ---------- 4. a foto da pessoa: abre aqui, nunca sai do aparelho ----------
  function porFoto(src, alt) {
    foto.src = src;
    foto.alt = alt;
    if (src === EXEMPLO) raiz.style.removeProperty('--foto');
    else raiz.style.setProperty('--foto', `url("${src}")`);
  }
  function modoFoto(tem) {
    quadro.classList.toggle('com-estudo', !tem);
    figura.classList.toggle('tem-foto', tem);
    doc.body.classList.toggle('tem-foto', tem);
    foto.hidden = !tem;
    if (palcoRot) palcoRot.textContent = tem ? 'A sua foto' : 'Estudo de luz';
    if (palcoVivo) palcoVivo.textContent = tem ? 'Ligue as guias' : 'Arraste a janela';
    if (rotulo) rotulo.textContent = tem ? 'A sua foto, como ela está hoje. A revitalizada sai no Direct.' : ROTULO_EXEMPLO;
    if (tituloSoltar) tituloSoltar.textContent = tem ? 'Trocar a foto' : TITULO_SOLTAR;
    if (voltar) voltar.hidden = !tem;
  }
  // a medida da luz, com os números rolando (do zero até a conta)
  function mostrarMedida(m) {
    const n = numerosDaMedida(m);
    if (!painel) return;
    painel.hidden = !n;
    if (!n) return;
    const ms = pedeMenos() ? 0 : 1100;
    animarNumero(painel.querySelector('[data-num-brilho]'), n.brilho, { de: 0, ms, formato: (v) => `${Math.round(v)}%` });
    animarNumero(painel.querySelector('[data-num-diferenca]'), n.diferenca, { de: 0, ms });
    const barra = painel.querySelector('[data-barra-brilho]');
    if (barra) {
      barra.style.setProperty('--b', '0%');
      void barra.offsetWidth;
      barra.style.setProperty('--b', `${n.brilho}%`);
    }
    const faixa = painel.querySelector('[data-medida-faixa]');
    if (faixa) { faixa.textContent = n.faixa === 'boa' ? 'na faixa boa' : n.faixa === 'escura' ? 'escura' : 'bem clara'; faixa.dataset.faixa = n.faixa; }
    const lado = painel.querySelector('[data-medida-lado]');
    if (lado) lado.textContent = n.de;
    painel.querySelector('[data-medida-diferenca]').hidden = n.angulo === null;
    const agulha = painel.querySelector('[data-bussola]');
    if (agulha) { agulha.parentElement.classList.toggle('igual', n.angulo === null); agulha.style.setProperty('--a', `${n.angulo ?? 0}deg`); }
    painel.classList.remove('entrou');
    void painel.offsetWidth;
    painel.classList.add('entrou');
  }
  // a foto "cai" no lugar que a pessoa está vendo, com o estouro
  const lugarDaFoto = {
    quadro: () => quadro,
    lugares: () => secaoLugares?.querySelector('[data-moldura]'),
    marca: () => secaoMarca?.querySelector('[data-divisoria]'),
  };
  function naTela(el) {
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const visto = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    return r.height > 0 ? Math.max(0, visto) / r.height : 0;
  }
  function escolherLugar(origem) {
    if (origem && lugarDaFoto[origem] && naTela(lugarDaFoto[origem]()) > 0.3) return origem;
    const melhor = Object.keys(lugarDaFoto).map((k) => [k, naTela(lugarDaFoto[k]())]).sort((a, b) => b[1] - a[1])[0];
    return melhor && melhor[1] > 0.3 ? melhor[0] : 'quadro';
  }
  function cair(onde) {
    const alvo = lugarDaFoto[onde]?.() ?? quadro;
    if (onde === 'quadro' && naTela(quadro) < 0.3) quadro.scrollIntoView({ behavior: pedeMenos() ? 'auto' : 'smooth', block: 'center' });
    if (!pedeMenos()) {
      alvo.classList.remove('caiu');
      void alvo.offsetWidth;
      alvo.classList.add('caiu');
      setTimeout(() => alvo.classList.remove('caiu'), 1300);
    }
    setTimeout(() => { estourarEm(alvo, { quantos: 18, raio: 90 }); vibrar(14); }, pedeMenos() ? 0 : 430);
  }
  function voltarProExemplo() {
    if (endereco) URL.revokeObjectURL(endereco);
    endereco = null;
    medida = null;
    porFoto(EXEMPLO, ALT_EXEMPLO);
    modoFoto(false);
    if (painel) painel.hidden = true;
    if (entrada) entrada.value = '';
    avisar('');
    mostrarGuias();
    dizer(LUZES[estudo?.luz()?.zona] ?? LUZ_DICA);
  }
  function abrirArquivo(arquivo, { origem = 'quadro' } = {}) {
    if (!arquivo) return;
    if (arquivo.type && !arquivo.type.startsWith('image/')) { avisar('Esse arquivo não é uma foto. Escolha uma foto do produto (JPG ou PNG).', true); return; }
    const novo = URL.createObjectURL(arquivo);
    const teste = new Image();
    figura.classList.add('trocando');
    teste.onload = () => {
      // onde a foto cai (o lugar que a pessoa está vendo) e onde ele está agora: a página não pode pular quando o
      // topo cresce (a medida, o "voltar"), senão a pessoa perde o lugar que estava olhando
      const onde = escolherLugar(origem);
      const ancora = onde !== 'quadro' ? lugarDaFoto[onde]?.() : null;
      const antes = ancora?.getBoundingClientRect().top;
      if (endereco) URL.revokeObjectURL(endereco);
      endereco = novo;
      porFoto(novo, 'A sua foto, no corte quadrado do robô');
      modoFoto(true);
      figura.classList.remove('trocando', 'chegou');
      void figura.offsetWidth; // recomeça a luz que passa por cima
      figura.classList.add('chegou');
      setTimeout(() => figura.classList.remove('chegou'), 1500);
      try { medida = medirNaTela(teste); } catch { medida = null; }
      avisar('Pronto: a sua foto abriu aqui, só no seu aparelho.');
      limparFila();
      ligarGuia('luz', true, { falar: false }); // a medida da luz aparece na hora
      dizer(textoDaLuz(medida));
      mostrarMedida(medida);
      if (ancora && antes !== undefined) {
        const pulo = ancora.getBoundingClientRect().top - antes;
        if (Math.abs(pulo) > 1) window.scrollBy({ top: pulo, behavior: 'instant' });
      }
      cair(onde);
    };
    teste.onerror = () => {
      URL.revokeObjectURL(novo);
      figura.classList.remove('trocando');
      avisar('Essa foto não abriu aqui. Tente outra, em JPG ou PNG.', true);
    };
    teste.src = novo;
  }
  entrada?.addEventListener('change', () => {
    const origem = entrada.dataset.origem || 'quadro';
    delete entrada.dataset.origem;
    abrirArquivo(entrada.files?.[0], { origem });
  });
  voltar?.addEventListener('click', () => voltarProExemplo());
  for (const b of doc.querySelectorAll('[data-escolher]')) {
    b.addEventListener('click', () => { if (entrada) { entrada.dataset.origem = b.dataset.origem || 'quadro'; entrada.click(); } });
  }

  // solte a foto em qualquer lugar da página (no computador): a página inteira vira o lugar de soltar
  const temArquivo = (ev) => Array.from(ev.dataTransfer?.types ?? []).includes('Files');
  let dentro = 0;
  const mostrarSolte = (sim) => {
    if (solte) solte.hidden = !sim;
    soltar?.classList.toggle('arrastando', sim);
  };
  doc.addEventListener('dragenter', (ev) => { if (!temArquivo(ev)) return; ev.preventDefault(); dentro++; mostrarSolte(true); });
  doc.addEventListener('dragover', (ev) => { if (!temArquivo(ev)) return; ev.preventDefault(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy'; });
  doc.addEventListener('dragleave', (ev) => { if (!temArquivo(ev)) return; dentro = Math.max(0, dentro - 1); if (!dentro) mostrarSolte(false); });
  doc.addEventListener('drop', (ev) => {
    if (!temArquivo(ev)) return;
    ev.preventDefault();
    dentro = 0;
    mostrarSolte(false);
    // cai onde a pessoa soltou (a seção do ponto), ou no lugar que ela está vendo
    const sob = doc.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('[data-foto-cai]')?.dataset.fotoCai;
    abrirArquivo(ev.dataTransfer?.files?.[0], { origem: sob || 'quadro' });
  });

  // fechou ou saiu da página: a foto some da memória
  addEventListener('pagehide', () => { if (endereco) URL.revokeObjectURL(endereco); });
  mostrarGuias();
}

if (typeof document !== 'undefined') ligarPagina(document);
