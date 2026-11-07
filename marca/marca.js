// A PÁGINA DA MARCA (07/11/2026; v3, o Andrews: "eu quero que a interface seja altamente interativa").
//   1. a lupa com peso: segue o mouse ou o dedo com inércia (a mola) e anda pelas setas; onde ela passa, o vetor fica
//      nítido (o rastro some devagar). O tamanho vai do ícone à fachada; o raio-X mostra do que cada uma é feita
//   2. do rabisco ao vetor: o controle leva a logo da foto borrada ao contorno sendo desenhado (os pontos e as curvas) e à
//      logo pronta (só a logo da Pineapple). A rolagem conta a história até a pessoa pegar o controle
//   3. o cardápio ao vivo: o item novo entra com animação, o preço rola enquanto a pessoa digita, a ordem muda arrastando
//      (ou pelas setas), o story e a folha mudam a forma com animação e as 3 letras trocam sem pular o layout
// As contas ficam em lupa.js, rabisco.js e cardapio.js (testadas). Nada é guardado e nada sai da página.
// Quem pediu menos movimento vê tudo funcionando, só que parado (sem mola, sem rastro que some, sem transição).
import { CAMINHO, COR, FUNDO, CAIXA } from './logo-vetor.js';
import {
  PARADAS, fatorDoControle, valorDaParada, caixaDaLogo, janelaDaLupa, zoomDaFoto, mostraQuadradinhos, desenhoDoRaioX,
  passoDaMola, molaParada, alvoDoArremesso, rastroEntre, apagarRastro, MOLA_SOLTA, MOLA_PRESA,
} from './lupa.js';
import { ETAPAS, medirCaminho, estadoDoRabisco, pedacoDoContorno, pontosAte } from './rabisco.js';
import {
  LIMITE_FOLHA, LIMITE_ITENS, cardapioDeExemplo, cardapioVazio, mudarLinha, mudarCampo, tirarLinha, acrescentar, podeAcrescentar,
  montarCardapio, desenharCardapio, precoEstranho, esc, moverLinha, indiceNoArrasto, rolagemNaBorda, numerosDoPreco, comMilhar,
} from './cardapio.js';
import { animarNumero, pegar, vibrar, estourarEm, pedeMenosMovimento, limitar } from '../comum/interacao.js';

const SVG = 'http://www.w3.org/2000/svg';
const pedeMenos = () => pedeMenosMovimento();
const agora = () => performance.now();
const RASTRO_MS = 3200; // depois disso sem a lupa andar, o rastro já sumiu (o canvas é limpo e o quadro para)

/* ------------------------------ 1. a lupa com peso ------------------------------ */

function ligarLupa(raiz) {
  const mesa = raiz.querySelector('[data-mesa]');
  if (!mesa) return;
  const foto = mesa.querySelector('[data-foto]');
  const grade = mesa.querySelector('[data-grade]');
  const lente = mesa.querySelector('[data-lente]');
  const zoom = mesa.querySelector('[data-zoom]');
  const tela = mesa.querySelector('[data-rastro]');
  const controle = raiz.querySelector('[data-tamanho]');
  const nome = raiz.querySelector('[data-parada]');
  const frase = raiz.querySelector('[data-frase-tamanho]');
  const paradas = [...raiz.querySelectorAll('[data-ir-parada]')];
  const raiox = raiz.querySelector('[data-raiox]');
  const ctx = tela?.getContext?.('2d') ?? null;
  const logoPath = ctx && typeof Path2D === 'function' ? new Path2D(CAMINHO) : null;

  // o vetor dentro da lupa, com o raio-X (os nós e as alças) pronto e escondido
  const rx = desenhoDoRaioX(CAMINHO);
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'lupa-vetor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = `<path class="lv-logo" fill="${COR}" fill-rule="evenodd" d="${CAMINHO}"/><g class="lv-raiox"><path class="lv-contorno" d="${CAMINHO}"/>`
    + `<path class="lv-alcas" d="${rx.alcas}"/><path class="lv-pontas" d="${rx.pontas}"/><path class="lv-nos-fundo" d="${rx.nos}"/><path class="lv-nos" d="${rx.nos}"/></g>`;
  lente.prepend(svg);
  mesa.classList.add('ligada');

  let medida = { largura: 1, altura: 1 };
  let diametro = 1;
  let dpr = 1;
  const pos = { x: 0.5, y: 0.4 }; // o centro da lupa, de 0 a 1 na mesa
  const vel = { x: 0, y: 0 }; // em "mesas" por segundo
  const alvo = { x: 0.5, y: 0.4 }; // para onde a mola leva
  let livre = !pedeMenos(); // a lupa passeia sozinha até a pessoa mexer
  let visivel = true;
  let presa = false; // o dedo (ou o botão do mouse) segura a lupa
  let quadro = 0;
  let t0 = 0;
  let inicioPasseio = null;
  let pintado = null; // onde o rastro foi pintado por último (px da mesa)
  let pintouEm = -1e9;

  function medir() {
    medida = { largura: mesa.clientWidth || 1, altura: mesa.clientHeight || 1 };
    diametro = lente.offsetWidth || 1;
    if (tela) {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      tela.width = Math.round(medida.largura * dpr);
      tela.height = Math.round(medida.altura * dpr);
    }
    chave = '';
    pintado = null;
  }

  function limparRastro({ esquecer = false } = {}) {
    if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, tela.width, tela.height); }
    if (esquecer) pintado = null;
  }

  let logo = null;
  let chave = '';
  /** O tamanho da foto na mesa (só muda quando o controle ou a mesa mudam: o passeio da lupa não mexe aqui). */
  function desenharFoto() {
    const { fator, parada } = fatorDoControle(controle.value);
    const nova = `${controle.value}|${medida.largura}|${medida.altura}`;
    if (nova === chave) return;
    chave = nova;
    logo = caixaDaLogo(medida, fator * medida.altura);
    const caixa = `left:${logo.x.toFixed(1)}px;top:${logo.y.toFixed(1)}px;width:${logo.largura.toFixed(1)}px;height:${logo.altura.toFixed(1)}px`;
    foto.style.cssText = caixa;
    grade.style.cssText = caixa;
    limparRastro({ esquecer: true }); // a logo mudou de tamanho: o rastro velho não serve mais
    mesa.classList.toggle('sem-quadradinhos', !mostraQuadradinhos(logo.altura));
    zoom.textContent = `zoom ${zoomDaFoto(logo.altura)}%`;
    controle.style.setProperty('--p', `${controle.value}%`);
    controle.setAttribute('aria-valuetext', parada.nome);
    if (nome.textContent !== parada.nome) nome.textContent = parada.nome;
    if (frase.dataset.parada !== parada.id) { frase.dataset.parada = parada.id; frase.textContent = parada.frase; }
    for (const b of paradas) b.setAttribute('aria-pressed', String(b.dataset.irParada === parada.id));
  }

  /** Onde a lupa passa, o vetor fica nítido: pinta a logo em vetor (no papel limpo) dentro do caminho da lupa. */
  function pintarRastro() {
    if (!logoPath || !logo) return;
    const aqui = { x: pos.x * medida.largura, y: pos.y * medida.altura };
    if (pintado && Math.hypot(aqui.x - pintado.x, aqui.y - pintado.y) < 0.6) return; // parada: nada novo
    const r = (diametro / 2) * 0.94;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.beginPath();
    for (const a of rastroEntre(pintado, aqui, r)) ctx.arc(a.x, a.y, a.r, a.de, a.ate);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = FUNDO;
    ctx.fillRect(0, 0, medida.largura, medida.altura);
    const s = logo.largura / CAIXA.largura;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * logo.x, dpr * logo.y);
    ctx.fillStyle = COR;
    ctx.fill(logoPath, 'evenodd');
    ctx.restore();
    pintado = aqui;
    pintouEm = agora();
  }

  /** O rastro some devagar (quem pediu menos movimento: ele fica até o tamanho mudar). */
  function apagar(dt) {
    if (!ctx || pedeMenos()) return;
    if (agora() - pintouEm > RASTRO_MS) { limparRastro(); return; }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0, 0, 0, ${apagarRastro(dt).toFixed(4)})`;
    ctx.fillRect(0, 0, tela.width, tela.height);
    ctx.restore();
  }

  function desenhar() {
    desenharFoto();
    const cx = pos.x * medida.largura;
    const cy = pos.y * medida.altura;
    lente.style.transform = `translate3d(${(cx - diametro / 2).toFixed(1)}px, ${(cy - diametro / 2).toFixed(1)}px, 0)`;
    // o peso: a sombra fica para trás quando a lupa corre
    lente.style.setProperty('--sx', `${limitar(-vel.x * medida.largura * 0.016, -16, 16).toFixed(1)}px`);
    lente.style.setProperty('--sy', `${(22 + limitar(-vel.y * medida.altura * 0.016, -16, 16)).toFixed(1)}px`);
    svg.setAttribute('viewBox', janelaDaLupa(cx, cy, logo, diametro).map((n) => n.toFixed(2)).join(' '));
  }

  function passo(t) {
    quadro = 0;
    const dt = Math.min(0.05, Math.max(0, (t - t0) / 1000));
    t0 = t;
    if (livre && visivel) {
      inicioPasseio ??= t;
      const s = (t - inicioPasseio) / 1000;
      alvo.x = 0.5 + 0.25 * Math.sin(s * 0.45 - 0.6);
      alvo.y = 0.42 + 0.22 * Math.sin(s * 0.33 + 0.4);
    }
    if (pedeMenos()) {
      pos.x = alvo.x; pos.y = alvo.y; vel.x = 0; vel.y = 0;
    } else {
      const mola = presa ? MOLA_PRESA : MOLA_SOLTA;
      for (const e of ['x', 'y']) {
        const r = passoDaMola(pos[e], vel[e], alvo[e], dt, mola);
        pos[e] = r.p;
        vel[e] = r.v;
      }
    }
    desenhar();
    pintarRastro();
    apagar(dt);
    const parada = molaParada(pos.x, vel.x, alvo.x) && molaParada(pos.y, vel.y, alvo.y);
    const rastroVivo = Boolean(ctx) && !pedeMenos() && agora() - pintouEm <= RASTRO_MS + 50;
    if ((livre && visivel) || presa || !parada || rastroVivo) quadro = requestAnimationFrame(passo);
  }
  const acordar = () => { if (!quadro) { t0 = agora(); quadro = requestAnimationFrame(passo); } };

  const naMesa = (x, y) => {
    const r = mesa.getBoundingClientRect();
    return { x: (x - r.left) / (r.width || 1), y: (y - r.top) / (r.height || 1) };
  };
  const irPara = (p) => { alvo.x = limitar(p.x, 0.03, 0.97); alvo.y = limitar(p.y, 0.03, 0.97); acordar(); };
  const mexeu = () => { livre = false; };

  // o mouse: a lupa vai atrás do cursor, com peso
  mesa.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse' || presa) return;
    mexeu();
    irPara(naMesa(ev.clientX, ev.clientY));
  });
  // o dedo na mesa (fora da lupa): a lupa vai até lá; o dedo que anda de lado leva a lupa junto (o de cima e baixo rola a página)
  let tocando = null;
  mesa.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('[data-lente]')) return; // a lupa tem o "pegar" dela
    mexeu();
    tocando = ev.pointerId;
    irPara(naMesa(ev.clientX, ev.clientY));
  });
  mesa.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'mouse' || ev.pointerId !== tocando || presa) return;
    irPara(naMesa(ev.clientX, ev.clientY));
  });
  const soltar = (ev) => { if (ev.pointerId === tocando) tocando = null; };
  mesa.addEventListener('pointerup', soltar);
  mesa.addEventListener('pointercancel', soltar);

  // a própria lupa: pega com o dedo ou o mouse; solta andando, ela continua um pouco e para (o peso)
  let pega = null;
  pegar(lente, {
    eixo: 'livre',
    aoComecar: ({ x, y }) => {
      mexeu();
      presa = true;
      const p = naMesa(x, y);
      pega = { dx: pos.x - p.x, dy: pos.y - p.y };
      lente.classList.add('presa');
      acordar();
    },
    aoMover: ({ x, y }) => {
      if (!pega) return;
      const p = naMesa(x, y);
      irPara({ x: p.x + pega.dx, y: p.y + pega.dy });
    },
    aoSoltar: ({ vx, vy, cancelou }) => {
      presa = false;
      pega = null;
      lente.classList.remove('presa');
      if (!cancelou && !pedeMenos()) {
        const r = mesa.getBoundingClientRect();
        vel.x = (vx * 1000) / (r.width || 1);
        vel.y = (vy * 1000) / (r.height || 1);
        alvo.x = alvoDoArremesso(pos.x, vel.x);
        alvo.y = alvoDoArremesso(pos.y, vel.y);
      }
      acordar();
    },
  });

  // o teclado: as setas andam com a lupa (com Shift, mais longe); o Home volta para o meio
  mesa.addEventListener('keydown', (ev) => {
    const d = ev.shiftKey ? 0.14 : 0.06;
    const anda = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[ev.key];
    if (ev.key === 'Home') { ev.preventDefault(); mexeu(); irPara({ x: 0.5, y: 0.5 }); return; }
    if (!anda) return;
    ev.preventDefault();
    mexeu();
    irPara({ x: alvo.x + anda[0], y: alvo.y + anda[1] });
  });

  controle.addEventListener('input', () => { mexeu(); acordar(); });
  for (const b of paradas) {
    b.addEventListener('click', () => {
      mexeu();
      controle.value = String(valorDaParada(PARADAS.findIndex((p) => p.id === b.dataset.irParada)));
      acordar();
    });
  }
  raiox?.addEventListener('click', () => {
    const ligado = raiox.getAttribute('aria-pressed') !== 'true';
    raiox.setAttribute('aria-pressed', String(ligado));
    mesa.classList.toggle('raiox', ligado);
  });

  // o passeio sozinho: só enquanto a mesa aparece na tela e ninguém mexeu (fora da tela, nada anda)
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(([e]) => { visivel = e.isIntersecting; if (visivel) acordar(); }, { threshold: 0.05 }).observe(mesa);
  }

  medir();
  desenhar();
  acordar();
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { medir(); acordar(); }).observe(mesa);
  else addEventListener('resize', () => { medir(); acordar(); });
}

/* ------------------------------ 2. do rabisco ao vetor ------------------------------ */

function ligarRabisco(raiz) {
  const palco = raiz.querySelector('[data-rabisco]');
  if (!palco) return;
  const desenho = palco.querySelector('[data-rb-quadro]');
  const svg = desenho?.querySelector('svg');
  const controle = palco.querySelector('[data-rb-t]');
  if (!svg || !controle) return;
  const frase = palco.querySelector('[data-rb-frase]');
  const conta = palco.querySelector('[data-rb-conta]');
  const etapas = [...palco.querySelectorAll('[data-rb-etapa]')];
  const $s = (sel) => svg.querySelector(sel);
  const medida = medirCaminho(CAMINHO);
  const r1 = (n) => Math.round(n * 10) / 10;
  const nos = medida.nos.map((n) => `M${r1(n.x)} ${r1(n.y)}h0`);
  const alcas = medida.alcas.map((a) => `M${r1(a.de[0])} ${r1(a.de[1])}L${r1(a.ate[0])} ${r1(a.ate[1])}`);
  const pontas = medida.alcas.map((a) => `M${r1(a.ate[0])} ${r1(a.ate[1])}h0`);

  // as camadas: a logo cheia e um caminho por contorno (cada um se desenha na vez dele)
  $s('.rb-cheia').setAttribute('d', CAMINHO);
  const grupo = $s('.rb-contornos');
  const contornos = medida.contornos.map((c) => {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', c.d);
    p.setAttribute('pathLength', '1');
    grupo.append(p);
    return p;
  });
  const camada = { foto: $s('.rb-foto'), grade: $s('.rb-grade'), papel: $s('.rb-papel'), cheia: $s('.rb-cheia'), raiox: $s('.rb-raiox'), ponta: $s('.rb-ponta') };
  const caminhos = { nos: [$s('.rb-nos'), $s('.rb-nos-fundo')], alcas: $s('.rb-alcas'), pontas: $s('.rb-pontas') };
  let mostrando = { nos: -1, alcas: -1, etapa: '' };
  let tocou = false;

  function aplicar(t) {
    const e = estadoDoRabisco(t);
    camada.foto.style.opacity = e.foto.toFixed(3);
    camada.grade.style.opacity = e.grade.toFixed(3);
    camada.papel.style.opacity = e.papel.toFixed(3);
    camada.cheia.style.opacity = e.cheia.toFixed(3);
    grupo.style.opacity = e.linha.toFixed(3);
    contornos.forEach((p, i) => { p.style.strokeDashoffset = (1 - pedacoDoContorno(e.traco, medida.contornos[i])).toFixed(4); });
    const n = e.traco > 0 ? pontosAte(e.traco, medida.nos) : 0;
    const a = e.traco > 0 ? medida.alcas.filter((x) => x.f <= e.traco + 1e-9).length : 0;
    if (n !== mostrando.nos) { mostrando.nos = n; for (const c of caminhos.nos) c.setAttribute('d', nos.slice(0, n).join('') || 'M0 0'); }
    if (a !== mostrando.alcas) {
      mostrando.alcas = a;
      caminhos.alcas.setAttribute('d', alcas.slice(0, a).join('') || 'M0 0');
      caminhos.pontas.setAttribute('d', pontas.slice(0, a).join('') || 'M0 0');
    }
    camada.raiox.style.opacity = (n ? e.raiox : 0).toFixed(3);
    // a ponta do lápis: onde o traço está agora
    const k = medida.contornos.findIndex((c) => e.traco > c.ini && e.traco < c.fim);
    if (k >= 0 && typeof contornos[k].getPointAtLength === 'function') {
      const p = contornos[k];
      const pt = p.getPointAtLength(p.getTotalLength() * pedacoDoContorno(e.traco, medida.contornos[k]));
      camada.ponta.setAttribute('cx', pt.x.toFixed(1));
      camada.ponta.setAttribute('cy', pt.y.toFixed(1));
      camada.ponta.style.opacity = '1';
    } else camada.ponta.style.opacity = '0';
    // o texto: a etapa e os pontos que já apareceram
    const etapa = ETAPAS.find((x) => x.id === e.etapa);
    if (mostrando.etapa !== e.etapa) {
      mostrando.etapa = e.etapa;
      frase.textContent = etapa.frase;
      for (const li of etapas) li.toggleAttribute('aria-current', li.dataset.rbEtapa === e.etapa);
      palco.dataset.etapa = e.etapa;
      if (e.etapa === 'pronta' && tocou) { estourarEm(desenho, { quantos: 16, raio: 90 }); vibrar(12); }
    }
    conta.textContent = e.etapa === 'foto' ? '65 × 80 quadradinhos' : `${n} de ${medida.nos.length} pontos · ${medida.contornos.length} contornos`;
    controle.setAttribute('aria-valuetext', `${etapa.nome}: ${conta.textContent}`);
    controle.style.setProperty('--p', `${(e.t * 100).toFixed(1)}%`);
  }

  controle.addEventListener('input', () => { tocou = true; aplicar(Number(controle.value) / 1000); });
  // arrastar de lado em cima do desenho também anda (o dedo que sobe e desce rola a página)
  let ini = 0;
  pegar(desenho, {
    eixo: 'x',
    aoComecar: () => { ini = Number(controle.value); },
    aoMover: ({ dx }) => {
      if (Math.abs(dx) < 4) return;
      tocou = true;
      controle.value = String(Math.round(limitar(ini + (dx / (desenho.offsetWidth || 1)) * 1000, 0, 1000)));
      aplicar(Number(controle.value) / 1000);
    },
  });
  // a rolagem conta a história até a pessoa pegar o controle (com menos movimento, o kit já manda a cena pronta: a logo pronta)
  const pelaRolagem = (p) => {
    if (tocou) return;
    const t = limitar((p - 0.2) / 0.42, 0, 1);
    controle.value = String(Math.round(t * 1000));
    aplicar(t);
  };
  palco.addEventListener('cena', (ev) => pelaRolagem(ev.detail.p));
  if (palco.dataset.p !== undefined) pelaRolagem(Number(palco.dataset.p));
  else aplicar(Number(controle.value) / 1000);
}

/* ------------------------------ 3. o cardápio ao vivo ------------------------------ */

const ICONE_TIRAR = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
const ICONE_MOVER = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>';
const MOLA_CSS = 'cubic-bezier(.3, 1.25, .45, 1)';

/** Faz o cardápio caber no formato: diminui a letra (de 100% até 45%) até não sobrar nada para fora. Devolve se coube. */
function caber(cv) {
  const papel = cv?.querySelector('.cv-papel');
  if (!papel) return true;
  const cabe = () => papel.scrollHeight <= papel.clientHeight + 1;
  cv.style.setProperty('--e', '1');
  if (cabe()) return true;
  let baixo = 0.45;
  let alto = 1;
  for (let k = 0; k < 7; k++) {
    const meio = (baixo + alto) / 2;
    cv.style.setProperty('--e', meio.toFixed(3));
    if (cabe()) baixo = meio; else alto = meio;
  }
  cv.style.setProperty('--e', baixo.toFixed(3));
  const coube = cabe();
  cv.classList.toggle('cv-cheio', !coube);
  return coube;
}

// o preço que rola: o inteiro e os centavos andam juntos, e o último quadro é o preço escrito (o mesmo do cardapio.js)
function rolarPreco(el, de, para) {
  const i = el?.querySelector('.cv-int');
  const c = el?.querySelector('.cv-cent');
  if (!i || !c) return;
  const a = numerosDoPreco(de);
  const b = numerosDoPreco(para);
  animarNumero(i, b.inteiro, { de: a.inteiro, ms: 460, marcar: true, formato: (v) => comMilhar(Math.round(v)) });
  animarNumero(c, b.centavos, { de: a.centavos, ms: 460, formato: (v) => `,${String(Math.round(v)).padStart(2, '0')}` });
}

function ligarCardapio(raiz) {
  const area = raiz.querySelector('[data-cardapio]');
  if (!area) return;
  const lista = area.querySelector('[data-linhas]');
  const previa = area.querySelector('[data-previa]');
  const moldura = area.querySelector('[data-moldura]');
  const loja = area.querySelector('[data-campo="loja"]');
  const rodape = area.querySelector('[data-campo="rodape"]');
  const exLoja = area.querySelector('[data-ex-loja]');
  const contagem = area.querySelector('[data-contagem]');
  const aviso = area.querySelector('[data-cabe]');
  const anuncio = area.querySelector('[data-cv-anuncio]');
  const maisItem = area.querySelector('[data-mais="item"]');
  const maisSecao = area.querySelector('[data-mais="secao"]');
  const pip = area.querySelector('[data-pip]');
  const pipTela = area.querySelector('[data-pip-tela]');

  let cardapio = cardapioDeExemplo();
  let estilo = 'bistro';
  let formato = 'folha';
  let pedido = 0;
  let provisoria = null; // enquanto a pessoa arrasta uma linha: a ordem que a prévia mostra
  let vistos = null; // os itens da última prévia (null: a primeira vez, nada "entra")
  const entrando = new Map(); // o item que acabou de aparecer → quando (a entrada continua de onde estava a cada letra digitada)
  let precos = new Map(); // o preço de cada item na última prévia
  let rolar = false; // a próxima prévia rola os preços (só enquanto a pessoa digita)
  let deslizar = false; // a próxima prévia faz deslizar o que mudou de lugar

  function linhaHtml(l, n) {
    const ex = `<span class="cv-ex-chip"${l.exemplo ? '' : ' hidden'}>exemplo</span>`;
    const qual = l.tipo === 'secao' ? `a categoria${l.nome ? ` ${esc(l.nome)}` : ''}` : `o item ${n}${l.nome ? `, ${esc(l.nome)}` : ''}`;
    const mover = `<button type="button" class="cv-mover" data-mover aria-label="Mudar de lugar ${qual}" aria-describedby="cv-mover-dica">${ICONE_MOVER}</button>`;
    if (l.tipo === 'secao') {
      return `<li class="cv-linha cv-categoria" data-id="${l.id}">${ex}${mover}<input class="cv-entrada" data-parte="nome" value="${esc(l.nome)}" maxlength="40" placeholder="Categoria (ex.: Lanches)" aria-label="Categoria" autocomplete="off">`
        + `<button type="button" class="cv-tirar" data-tirar aria-label="Tirar ${qual}">${ICONE_TIRAR}</button></li>`;
    }
    return `<li class="cv-linha" data-id="${l.id}">${ex}${mover}<input class="cv-entrada" data-parte="nome" value="${esc(l.nome)}" maxlength="60" placeholder="Nome do item" aria-label="Item ${n}: nome" autocomplete="off">`
      + `<span class="cv-preco-in"><span aria-hidden="true">R$</span><input class="cv-entrada" data-parte="preco" value="${esc(l.preco)}" inputmode="decimal" maxlength="10" placeholder="0,00" aria-label="Item ${n}: preço" autocomplete="off"${precoEstranho(l.preco) ? ' aria-invalid="true"' : ''}></span>`
      + `<button type="button" class="cv-tirar" data-tirar aria-label="Tirar ${qual}">${ICONE_TIRAR}</button></li>`;
  }

  function montarLista({ foco = null, entra = null, focoMover = null } = {}) {
    let n = 0;
    lista.innerHTML = cardapio.linhas.map((l) => linhaHtml(l, l.tipo === 'item' ? ++n : n)).join('');
    for (const alca of lista.querySelectorAll('[data-mover]')) ligarMover(alca);
    if (entra != null && !pedeMenos()) lista.querySelector(`[data-id="${entra}"]`)?.classList.add('entra');
    if (foco != null) lista.querySelector(`[data-id="${foco}"] input`)?.focus();
    if (focoMover != null) lista.querySelector(`[data-id="${focoMover}"] [data-mover]`)?.focus({ preventScroll: true });
  }

  const topos = (raizDe, sel, chave) => new Map([...raizDe.querySelectorAll(sel)].map((el) => [el.dataset[chave], el.getBoundingClientRect().top]));
  /** O que mudou de lugar desliza do lugar velho ao novo (a técnica do "primeiro, último, inverte, toca"). */
  function deslizarDe(antes, raizDe, sel, chave, { ms = 420, prop = 'transform' } = {}) {
    for (const el of raizDe.querySelectorAll(sel)) {
      const t = antes.get(el.dataset[chave]);
      if (t == null) continue;
      const d = t - el.getBoundingClientRect().top;
      if (Math.abs(d) < 0.5) continue;
      const de = prop === 'translate' ? { translate: `0 ${d}px` } : { transform: `translateY(${d}px)` };
      const ate = prop === 'translate' ? { translate: '0 0' } : { transform: 'none' };
      el.animate([de, ate], { duration: ms, easing: MOLA_CSS });
    }
  }

  function desenharAgora() {
    pedido = 0;
    const m = montarCardapio(provisoria ?? cardapio);
    const comDeslize = deslizar && !pedeMenos();
    const comRolagem = rolar && !pedeMenos();
    deslizar = false;
    rolar = false;
    const antes = comDeslize ? topos(previa, '[data-linha]', 'linha') : null;
    const precosAntes = precos;
    moldura.dataset.vista = formato;
    previa.innerHTML = desenharCardapio(m, { estilo, formato });
    const coube = caber(previa.firstElementChild);
    previa.querySelectorAll('.cv-item, .cv-secao-nome').forEach((el, i) => el.style.setProperty('--i', String(Math.min(i, 24))));
    const ids = new Set();
    precos = new Map();
    for (const s of m.secoes) for (const it of s.itens) { ids.add(String(it.id)); if (it.preco != null) precos.set(String(it.id), it.preco); }
    // o item que acabou de ganhar nome entra com animação; a prévia é refeita a cada letra, então a entrada segue de onde estava
    const t = agora();
    if (vistos && !pedeMenos()) for (const id of ids) if (!vistos.has(id)) entrando.set(id, t);
    vistos = ids;
    for (const [id, desde] of entrando) {
      const passou = t - desde;
      if (passou > 560 || !ids.has(id)) { entrando.delete(id); continue; }
      const el = previa.querySelector(`.cv-item[data-linha="${id}"]`);
      if (el) { el.classList.add('entra'); el.style.animationDelay = `${-Math.round(passou)}ms`; }
    }
    if (comRolagem) for (const [id, valor] of precos) if (precosAntes.get(id) !== valor) rolarPreco(previa.querySelector(`[data-linha="${id}"] .cv-preco`), precosAntes.get(id) ?? 0, valor);
    if (antes) deslizarDe(antes, previa, '[data-linha]', 'linha');
    if (pipTela) pipTela.innerHTML = previa.innerHTML; // a miniatura do celular é a mesma prévia, menor (tudo nela é em cqi)
    const n = m.itens;
    const itens = `${n} ${n === 1 ? 'item' : 'itens'}`;
    contagem.textContent = formato === 'folha' ? `${itens} · a folha A4 vai até ${LIMITE_FOLHA}` : `${itens} no story`;
    let texto = '';
    if (formato === 'folha' && n > LIMITE_FOLHA) texto = `Passou de ${LIMITE_FOLHA} itens: fica melhor frente e verso (até ${LIMITE_ITENS}).`;
    else if (!coube) texto = formato === 'story' ? 'Não coube tudo no story. Tire alguns itens ou troque para a folha.' : 'Não coube tudo na folha. Tire alguns itens.';
    aviso.textContent = texto;
    maisItem.disabled = !podeAcrescentar(cardapio, 'item');
    maisSecao.disabled = !podeAcrescentar(cardapio, 'secao');
  }
  const agendar = () => { if (!pedido) pedido = requestAnimationFrame(desenharAgora); };

  function sincronizar() {
    loja.value = cardapio.loja.texto;
    rodape.value = cardapio.rodape.texto;
    exLoja.hidden = !cardapio.loja.exemplo;
    montarLista();
    vistos = null; // o cardápio inteiro trocou: nada "entra" de novo
    desenharAgora();
  }

  function anunciarLugar(id) {
    const i = cardapio.linhas.findIndex((l) => l.id === id);
    const l = cardapio.linhas[i];
    if (!l || !anuncio) return;
    const quem = l.nome.trim() || (l.tipo === 'secao' ? 'A categoria sem nome' : 'O item sem nome');
    anuncio.textContent = `${quem}: agora na posição ${i + 1} de ${cardapio.linhas.length}.`;
  }

  /** Pelo teclado: a seta para cima ou para baixo no botão de mover leva a linha 1 lugar. */
  function moverComTeclado(id, passo) {
    const i = cardapio.linhas.findIndex((l) => l.id === id);
    const para = i + passo;
    if (i < 0 || para < 0 || para >= cardapio.linhas.length) return;
    const antes = topos(lista, ':scope > [data-id]', 'id');
    cardapio = moverLinha(cardapio, id, para);
    montarLista({ focoMover: id });
    if (!pedeMenos()) deslizarDe(antes, lista, ':scope > [data-id]', 'id', { ms: 280, prop: 'translate' });
    deslizar = true;
    desenharAgora();
    anunciarLugar(id);
  }

  /** O arrasto da linha (pela alça): ela anda com o dedo, as outras abrem espaço e a prévia já mostra a ordem nova. */
  function ligarMover(alca) {
    const li = alca.closest('[data-id]');
    const id = Number(li.dataset.id);
    let a = null;
    let rolando = 0;
    const vao = () => parseFloat(getComputedStyle(lista).rowGap) || 12;
    const aplicar = () => {
      const desloca = a.y - a.y0 + (window.scrollY - a.rolar0);
      li.style.translate = `0 ${desloca.toFixed(1)}px`;
      const novo = indiceNoArrasto(a.caixas, a.de, desloca);
      const h = a.caixas[a.de].altura + a.vao;
      a.lis.forEach((x, k) => {
        if (x === li) return;
        let s = 0;
        if (a.de < novo && k > a.de && k <= novo) s = -h;
        if (a.de > novo && k >= novo && k < a.de) s = h;
        x.style.translate = s ? `0 ${s}px` : '';
      });
      if (novo !== a.para) {
        a.para = novo;
        provisoria = moverLinha(cardapio, id, novo);
        deslizar = true;
        desenharAgora();
        vibrar(6);
      }
    };
    const rolarNaBorda = () => {
      rolando = 0;
      if (!a?.moveu) return;
      const d = rolagemNaBorda(a.y, window.innerHeight);
      if (d) { window.scrollBy(0, d); aplicar(); }
      rolando = requestAnimationFrame(rolarNaBorda);
    };
    pegar(alca, {
      eixo: 'y', // o dedo que anda de lado na alça não faz nada; o de cima e baixo arrasta a linha
      aoComecar: ({ y }) => {
        const lis = [...lista.children];
        a = {
          de: lis.indexOf(li), para: lis.indexOf(li), lis, y0: y, y, rolar0: window.scrollY, moveu: false, vao: vao(),
          caixas: lis.map((x) => { const r = x.getBoundingClientRect(); return { top: r.top + window.scrollY, altura: r.height }; }),
        };
      },
      aoMover: ({ y, dy }) => {
        if (!a) return;
        a.y = y;
        if (!a.moveu) {
          if (Math.abs(dy) < 4) return;
          a.moveu = true;
          li.classList.add('arrastando');
          lista.classList.add('reordenando');
          rolando = requestAnimationFrame(rolarNaBorda);
        }
        aplicar();
      },
      aoSoltar: ({ cancelou }) => {
        cancelAnimationFrame(rolando);
        rolando = 0;
        const fim = a;
        a = null;
        if (!fim?.moveu) return;
        const onde = li.getBoundingClientRect().top;
        lista.classList.remove('reordenando');
        for (const x of fim.lis) x.style.translate = '';
        provisoria = null;
        const para = cancelou ? fim.de : fim.para;
        if (para !== fim.de) cardapio = moverLinha(cardapio, id, para);
        montarLista({ focoMover: id });
        const nova = lista.querySelector(`[data-id="${id}"]`);
        if (nova && !pedeMenos()) nova.animate([{ translate: `0 ${(onde - nova.getBoundingClientRect().top).toFixed(1)}px` }, { translate: '0 0' }], { duration: 300, easing: MOLA_CSS });
        deslizar = true;
        desenharAgora();
        if (para !== fim.de) { anunciarLugar(id); vibrar(10); }
      },
    });
    alca.addEventListener('keydown', (ev) => {
      const passo = { ArrowUp: -1, ArrowDown: 1 }[ev.key];
      if (!passo) return;
      ev.preventDefault();
      moverComTeclado(id, passo);
    });
  }

  // digitando: só a linha muda (a lista não é redesenhada, para não perder o lugar de quem digita); o preço rola
  lista.addEventListener('input', (ev) => {
    const li = ev.target.closest('[data-id]');
    if (!li) return;
    cardapio = mudarLinha(cardapio, Number(li.dataset.id), ev.target.dataset.parte, ev.target.value);
    li.querySelector('.cv-ex-chip').hidden = true;
    if (ev.target.dataset.parte === 'preco') {
      rolar = true;
      if (precoEstranho(ev.target.value)) ev.target.setAttribute('aria-invalid', 'true');
      else ev.target.removeAttribute('aria-invalid');
    }
    agendar();
  });
  lista.addEventListener('click', (ev) => {
    const botao = ev.target.closest('[data-tirar]');
    if (!botao) return;
    const id = Number(botao.closest('[data-id]').dataset.id);
    const i = cardapio.linhas.findIndex((l) => l.id === id);
    cardapio = tirarLinha(cardapio, id);
    const vizinha = cardapio.linhas[Math.min(i, cardapio.linhas.length - 1)];
    montarLista({ foco: vizinha?.id });
    if (!vizinha) maisItem.focus();
    deslizar = true; // os que ficaram sobem para o lugar do que saiu
    desenharAgora();
  });
  for (const b of [maisItem, maisSecao]) {
    b.addEventListener('click', () => {
      const r = acrescentar(cardapio, b.dataset.mais);
      if (!r) return;
      cardapio = r.cardapio;
      montarLista({ foco: r.id, entra: r.id });
      desenharAgora();
    });
  }
  loja.addEventListener('input', () => { cardapio = mudarCampo(cardapio, 'loja', loja.value); exLoja.hidden = true; agendar(); });
  rodape.addEventListener('input', () => { cardapio = mudarCampo(cardapio, 'rodape', rodape.value); agendar(); });
  area.querySelector('[data-recomecar]').addEventListener('click', () => { cardapio = cardapioVazio(); sincronizar(); loja.focus(); });
  area.querySelector('[data-voltar-exemplo]').addEventListener('click', () => { cardapio = cardapioDeExemplo(); sincronizar(); });

  // as 3 letras e os 2 formatos: a troca anima em CSS (a pessoa toca várias vezes seguidas: nada de troca de vista aqui)
  const marcar = () => {
    for (const b of area.querySelectorAll('button[data-estilo]')) b.setAttribute('aria-pressed', String(b.dataset.estilo === estilo));
    for (const b of area.querySelectorAll('button[data-formato]')) b.setAttribute('aria-pressed', String(b.dataset.formato === formato));
  };
  const tirarFantasmas = () => { for (const f of moldura.querySelectorAll('.cv-fantasma')) f.remove(); };

  /** A letra nova: a velha some por cima (um retrato dela) e os itens novos chegam um depois do outro. A folha não muda de tamanho. */
  function trocarEstilo(novo) {
    if (novo === estilo) return;
    const velho = previa.firstElementChild;
    estilo = novo;
    marcar();
    tirarFantasmas();
    if (velho && !pedeMenos()) {
      const f = velho.cloneNode(true);
      f.classList.add('cv-fantasma');
      f.setAttribute('aria-hidden', 'true');
      moldura.append(f);
      setTimeout(() => f.remove(), 600);
    }
    desenharAgora();
    if (!pedeMenos()) previa.firstElementChild?.classList.add('cv-chega');
    vibrar(6);
  }

  /** O formato novo: a moldura anda do tamanho velho ao novo (a folha vira o story e volta), com mola. */
  function trocarFormato(novo) {
    if (novo === formato) return;
    const r0 = moldura.getBoundingClientRect();
    formato = novo;
    marcar();
    tirarFantasmas();
    for (const anim of moldura.getAnimations?.() ?? []) anim.cancel();
    moldura.classList.remove('cv-mudando');
    desenharAgora();
    vibrar(6);
    if (pedeMenos() || typeof moldura.animate !== 'function') return;
    const r1 = moldura.getBoundingClientRect();
    if (Math.abs(r0.width - r1.width) < 1 && Math.abs(r0.height - r1.height) < 1) return;
    moldura.classList.add('cv-mudando');
    const anim = moldura.animate(
      [{ width: `${r0.width}px`, height: `${r0.height}px` }, { width: `${r1.width}px`, height: `${r1.height}px` }],
      { duration: 560, easing: MOLA_CSS },
    );
    anim.onfinish = () => moldura.classList.remove('cv-mudando');
    anim.oncancel = () => moldura.classList.remove('cv-mudando');
  }
  for (const b of area.querySelectorAll('button[data-estilo]')) b.addEventListener('click', () => trocarEstilo(b.dataset.estilo));
  for (const b of area.querySelectorAll('button[data-formato]')) b.addEventListener('click', () => trocarFormato(b.dataset.formato));

  // no celular a prévia fica longe de quem digita: uma miniatura ao vivo no canto, só enquanto o editor aparece e a prévia não
  const mesaCv = area.querySelector('.cv-mesa');
  const editor = area.querySelector('.estudio-editor');
  const estreita = typeof matchMedia === 'function' ? matchMedia('(max-width: 959px)') : null;
  let veMesa = true;
  let veEditor = false;
  const mostrarPip = () => {
    if (!pip) return;
    pip.hidden = !(estreita?.matches && veEditor && !veMesa);
    if (!pip.hidden) pip.style.top = `${(document.querySelector('.barra-topo')?.offsetHeight ?? 58) + 10}px`; // logo abaixo do topo
  };
  if (pip && mesaCv && editor && typeof IntersectionObserver === 'function') {
    // a prévia "aparece" enquanto pelo menos 1/5 dela está na tela
    new IntersectionObserver(([e]) => { veMesa = e.intersectionRatio >= 0.2; mostrarPip(); }, { threshold: [0, 0.2, 0.4] }).observe(mesaCv);
    new IntersectionObserver(([e]) => { veEditor = e.isIntersecting; mostrarPip(); }, { threshold: 0 }).observe(editor);
    estreita?.addEventListener?.('change', mostrarPip);
  }

  area.classList.add('ligado');
  marcar();
  sincronizar();
  // as letras chegam do Google Fonts depois: quando chegam, o cardápio é medido de novo
  document.fonts?.ready?.then(() => agendar());
  document.fonts?.addEventListener?.('loadingdone', () => agendar());
}

if (typeof document !== 'undefined') {
  const ligar = () => { ligarLupa(document); ligarRabisco(document); ligarCardapio(document); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar);
  else ligar();
}
