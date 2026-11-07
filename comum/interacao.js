// AS INTERAÇÕES DA V3 (07/11/2026). Pedido do Andrews: "eu quero que a interface seja altamente interativa".
// Liga sozinho em toda página que carrega o site.js. Quem pediu menos movimento (prefers-reduced-motion) fica com
// tudo parado e legível; sem JavaScript, nada some (o HTML já traz o texto e o número final).
//
// O que liga sozinho:
//   .botao e [data-magnetico]  o botão vem atrás do mouse e afunda no toque; no .botao (e em [data-onda]) a onda sai do dedo
//                              ([data-magnetico="nao"] desliga num .botao)
//   [data-conta-ate="22"]      o número conta de 0 até 22 quando aparece na tela
//   [data-cena]                ganha --p (0 com ele entrando por baixo, 1 com ele saindo por cima) e solta o evento "cena"
//                              (ev.detail.p). Quem pediu menos movimento recebe a cena pronta (p = 1)
//   o fio da rolagem           o fio no topo mostra quanto da página já rolou (<body data-sem-fio> desliga)
//   a luz do cursor            a luz suave segue o mouse (só no computador)
//   a troca de página          a página nova entra com a transição de vista (Chrome e Safari novos; os outros só trocam);
//                              o cartão da vitrine vira o palco do produto (view-transition-name: vt-<id>)
//
// As ferramentas para as páginas (import { ... } from '../comum/interacao.js'):
//   animarNumero(el, para, { formato, ms, de })   o número rola até o valor novo (e marca .num-subiu ou .num-desceu)
//   trocarConteudo(el, html)                      põe o HTML novo e faz rolar o que mudou: cada número marcado com
//                                                 data-rola="chave" data-rola-num="8.42" vai do valor velho ao novo, e o
//                                                 que tem data-rola-anima="width" anda até o tamanho novo (a ficha já vem marcada)
//   estourar(x, y, { quantos, cores, raio })      o "deu certo": pedacinhos saindo do ponto (coordenadas da tela)
//   estourarEm(el, opcoes)                        o mesmo, saindo do meio do elemento
//   vibrar(ms)                                    o toque no celular (o Android vibra; o iPhone ignora)
//   pegar(el, { eixo, aoComecar, aoMover, aoSoltar })  arrastar com o dedo ou o mouse; no fim vem a velocidade
//   escrever(el, texto, { ms })                   o texto se escreve letra por letra (devolve uma promessa)
//   trocarVista(fazer)                            troca o que está na tela com a transição de vista (na mesma página)
//   ligarInteracao(doc)                           liga de novo o que for HTML novo (pode chamar quantas vezes quiser)

// ---------- as contas (funções puras, testadas em testes/interacao.test.mjs) ----------

export const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
/** A curva que chega devagar (de 0 a 1). */
export const suavizar = (t) => 1 - Math.pow(1 - limitar(t, 0, 1), 3);
export const entre = (de, para, t) => de + (para - de) * t;

/** O puxão do ímã: quanto o botão anda na direção do cursor, em px (a caixa é a do botão parado). */
export function puxao(cursor, caixa, { forca = 0.3, alcance = 10 } = {}) {
  const cx = caixa.left + caixa.width / 2;
  const cy = caixa.top + caixa.height / 2;
  return {
    dx: +limitar((cursor.x - cx) * forca, -alcance, alcance).toFixed(2),
    dy: +limitar((cursor.y - cy) * forca, -alcance, alcance).toFixed(2),
  };
}

/** Quanto o elemento já atravessou a tela: 0 com o topo dele entrando por baixo, 1 com o fim dele saindo por cima. */
export function progressoNaTela(caixa, alturaJanela) {
  const total = alturaJanela + caixa.height;
  if (!(total > 0)) return 0;
  return +limitar((alturaJanela - caixa.top) / total, 0, 1).toFixed(4);
}

/** Quanto da página já rolou (0 a 1). Página que não rola: 0. */
export function rolou(topo, alturaPagina, alturaJanela) {
  const falta = alturaPagina - alturaJanela;
  return falta > 0 ? +limitar(topo / falta, 0, 1).toFixed(4) : 0;
}

/** O pedaço do texto que já apareceu (t de 0 a 1), sem quebrar emoji nem acento. */
export function textoAte(texto, t) {
  const letras = Array.from(String(texto ?? ''));
  return letras.slice(0, Math.round(letras.length * limitar(t, 0, 1))).join('');
}

/** A velocidade do fim do arrasto (px por ms), pelos últimos pontos { x, y, t }. */
export function velocidade(pontos) {
  if (!pontos || pontos.length < 2) return { vx: 0, vy: 0 };
  const a = pontos[0];
  const b = pontos[pontos.length - 1];
  const dt = Math.max(1, b.t - a.t);
  return { vx: +((b.x - a.x) / dt).toFixed(4), vy: +((b.y - a.y) / dt).toFixed(4) };
}

/** O sorteio com semente: o mesmo estouro sai igual no teste. */
export function sorteio(semente = 1) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** As cores da marca (as dos posts): o amarelo, o verde, o laranja e o creme. */
export const CORES_ESTOURO = ['#F9C748', '#a6e02e', '#FF6B1A', '#f7f4ec'];

/** Os pedacinhos do estouro: para onde cada um vai (px), o tamanho, o giro, a cor, a forma e a espera. */
export function pedacinhos(quantos = 14, { raio = 70, cores = CORES_ESTOURO, semente = 1 } = {}) {
  const r = sorteio(semente);
  return Array.from({ length: quantos }, (_, i) => {
    const ang = (i / quantos) * Math.PI * 2 + (r() - 0.5) * 0.9;
    const dist = raio * (0.55 + r() * 0.6);
    return {
      x: +(Math.cos(ang) * dist).toFixed(1),
      y: +(Math.sin(ang) * dist - raio * 0.25).toFixed(1), // puxa um pouco para cima: parece que pulou
      tamanho: +(5 + r() * 6).toFixed(1),
      giro: Math.round((r() - 0.5) * 540),
      cor: cores[i % cores.length],
      forma: i % 3 === 0 ? 'bola' : 'losango',
      espera: Math.round(r() * 60),
    };
  });
}

// ---------- o navegador ----------

const temDoc = typeof document !== 'undefined';
const consulta = (q) => typeof matchMedia === 'function' && matchMedia(q).matches;
export const pedeMenosMovimento = () => consulta('(prefers-reduced-motion: reduce)');
export const temMouse = () => consulta('(hover: hover) and (pointer: fine)');
const temToque = () => consulta('(pointer: coarse)');
const quadro = (f) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(f) : setTimeout(() => f(Date.now()), 16));
const agora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// ---------- o número que rola ----------

const rolando = new WeakMap(); // elemento → { valor, quadro, tempo }

/**
 * O número rola do valor que está na tela até `para`. `formato` escreve o número (ex.: o `reais` da calculadora);
 * o último quadro é sempre `formato(para)`, igual ao que a conta deu. Sem animação, escreve direto.
 */
export function animarNumero(el, para, { formato = (n) => String(Math.round(n)), ms = 650, de, marcar = false } = {}) {
  if (!el) return;
  const antes = rolando.get(el);
  const inicio = de ?? antes?.valor ?? para;
  if (antes?.quadro && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(antes.quadro);
  clearTimeout(antes?.seguro);
  const estado = { valor: inicio, quadro: 0, tempo: antes?.tempo, seguro: 0 };
  rolando.set(el, estado);
  if (para !== inicio && (antes || marcar)) marcarMudanca(el, estado, para > inicio);
  const parado = pedeMenosMovimento() || ms <= 0 || para === inicio || (temDoc && document.hidden) || typeof requestAnimationFrame !== 'function';
  if (parado) { estado.valor = para; el.textContent = formato(para); return; }
  el.textContent = formato(inicio); // o primeiro quadro já sai agora (o HTML novo não pisca o valor final antes de rolar)
  const t0 = agora();
  const passo = (t) => {
    const k = Math.min(1, Math.max(0, (t - t0) / ms));
    estado.valor = k >= 1 ? para : entre(inicio, para, suavizar(k));
    el.textContent = formato(estado.valor);
    estado.quadro = k < 1 ? requestAnimationFrame(passo) : 0;
    if (!estado.quadro) clearTimeout(estado.seguro);
  };
  estado.quadro = requestAnimationFrame(passo);
  // a garantia: se o navegador parar os quadros (aba escondida), o número certo entra mesmo assim
  estado.seguro = setTimeout(() => {
    if (!estado.quadro) return;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(estado.quadro);
    estado.quadro = 0;
    estado.valor = para;
    el.textContent = formato(para);
  }, ms + 350);
}

function marcarMudanca(el, estado, subiu) {
  el.classList.remove('num-subiu', 'num-desceu');
  void el.offsetWidth; // reinicia o brilho
  el.classList.add(subiu ? 'num-subiu' : 'num-desceu');
  clearTimeout(estado.tempo);
  estado.tempo = setTimeout(() => el.classList.remove('num-subiu', 'num-desceu'), 900);
}

// ---------- trocar o conteúdo e fazer rolar o que mudou ----------

// o número escrito do jeito brasileiro: 8,42 · 1.234,56 · 25
const NUMERO_BR = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/;

/** O molde do número no texto: o que vem antes, as casas depois da vírgula e o que vem depois ("uns R$ 8,42"). */
export function moldeDoNumero(texto) {
  const t = String(texto ?? '');
  const m = t.match(NUMERO_BR);
  if (!m) return null;
  return { antes: t.slice(0, m.index), casas: (m[0].split(',')[1] ?? '').length, depois: t.slice(m.index + m[0].length) };
}

/** Escreve o valor no molde (sem o sinal: o "−" faz parte do texto de antes). */
export function noMolde(molde, valor) {
  const n = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: molde.casas, maximumFractionDigits: molde.casas }).format(Math.abs(valor));
  return `${molde.antes}${n}${molde.depois}`;
}

function rolarTexto(el, velho, para, ms) {
  const final = el.textContent;
  const moldeNovo = moldeDoNumero(final);
  if (!moldeNovo) return;
  const moldeVelho = moldeDoNumero(velho.texto) ?? moldeNovo;
  // enquanto o valor ainda tem o sinal velho, usa o texto velho ("uns R$ 2,00" → "− R$ 1,00" passa pelo zero certo)
  const formato = (v) => (v === para ? final : noMolde(Math.sign(v) === Math.sign(para) || v === 0 ? moldeNovo : moldeVelho, v));
  animarNumero(el, para, { de: velho.num, ms, formato, marcar: true });
}

/**
 * Põe o HTML novo no lugar e faz rolar o que mudou (pelo data-rola, que é a chave de cada número).
 * Os controles (o input que a pessoa está mexendo) ficam FORA do el, senão perdem o dedo.
 */
export function trocarConteudo(el, html, { ms = 600 } = {}) {
  if (!el) return;
  const antes = new Map();
  for (const n of el.querySelectorAll('[data-rola]')) {
    antes.set(n.dataset.rola, { num: n.dataset.rolaNum === undefined ? NaN : Number(n.dataset.rolaNum), texto: n.textContent, estilo: n.getAttribute('style') ?? '' });
  }
  el.innerHTML = html;
  if (!antes.size || pedeMenosMovimento()) return;
  for (const n of el.querySelectorAll('[data-rola]')) {
    const velho = antes.get(n.dataset.rola);
    if (!velho) continue;
    const novo = n.dataset.rolaNum === undefined ? NaN : Number(n.dataset.rolaNum);
    if (Number.isFinite(novo) && Number.isFinite(velho.num) && novo !== velho.num && n.children.length === 0) rolarTexto(n, velho, novo, ms);
    if (n.dataset.rolaAnima && velho.estilo !== (n.getAttribute('style') ?? '')) {
      const props = n.dataset.rolaAnima.split(/\s+/).filter(Boolean);
      const novos = props.map((q) => n.style.getPropertyValue(q));
      const molde = document.createElement('i');
      molde.setAttribute('style', velho.estilo);
      for (const q of props) n.style.setProperty(q, molde.style.getPropertyValue(q));
      void n.offsetWidth; // o navegador desenha o tamanho velho antes de andar
      props.forEach((q, i) => n.style.setProperty(q, novos[i]));
    }
  }
}

// ---------- o estouro (o "deu certo") ----------

export function estourar(x, y, { quantos = 14, cores = CORES_ESTOURO, raio = 70 } = {}) {
  if (!temDoc || !document.body || pedeMenosMovimento()) return null;
  const caixa = document.createElement('div');
  caixa.className = 'estouro';
  caixa.setAttribute('aria-hidden', 'true');
  caixa.style.left = `${Math.round(x)}px`;
  caixa.style.top = `${Math.round(y)}px`;
  for (const p of pedacinhos(quantos, { raio, cores, semente: Math.floor(Math.random() * 1e9) })) {
    const i = document.createElement('i');
    i.className = p.forma;
    i.style.cssText = `--x:${p.x}px;--y:${p.y}px;--s:${p.tamanho}px;--g:${p.giro}deg;--c:${p.cor};--t:${p.espera}ms`;
    caixa.append(i);
  }
  document.body.append(caixa);
  setTimeout(() => caixa.remove(), 1200);
  return caixa;
}

export function estourarEm(el, opcoes) {
  if (!el?.getBoundingClientRect) return null;
  const r = el.getBoundingClientRect();
  return estourar(r.left + r.width / 2, r.top + r.height / 2, opcoes);
}

/** O toque no celular (só em tela de toque; o iPhone não vibra pelo navegador). */
export function vibrar(ms = 10) {
  try {
    if (!temToque() || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; // antes do 1º toque, o navegador recusa
    navigator.vibrate(ms);
  } catch { /* sem vibração */ }
}

// ---------- arrastar ----------

/**
 * Arrastar com o dedo ou o mouse. `eixo`: 'x' (a página ainda rola na vertical), 'y' ou 'livre'.
 * aoComecar({ x, y, ev }), aoMover({ dx, dy, x, y, ev }), aoSoltar({ dx, dy, vx, vy, x, y, ev, cancelou }).
 * Devolve a função que desliga.
 */
export function pegar(el, { eixo = 'livre', aoComecar, aoMover, aoSoltar } = {}) {
  el.style.touchAction = eixo === 'x' ? 'pan-y' : eixo === 'y' ? 'pan-x' : 'none';
  let ini = null;
  const rastro = [];
  const ponto = (ev) => ({ x: ev.clientX, y: ev.clientY, t: agora() });
  const desce = (ev) => {
    if (ev.button !== undefined && ev.button !== 0) return;
    ini = ponto(ev);
    rastro.length = 0;
    rastro.push(ini);
    try { el.setPointerCapture?.(ev.pointerId); } catch { /* o ponteiro já saiu */ }
    el.classList.add('pegando');
    aoComecar?.({ x: ini.x, y: ini.y, ev });
  };
  const move = (ev) => {
    if (!ini) return;
    const p = ponto(ev);
    rastro.push(p);
    while (rastro.length > 6) rastro.shift();
    aoMover?.({ dx: p.x - ini.x, dy: p.y - ini.y, x: p.x, y: p.y, ev });
  };
  const sobe = (ev) => {
    if (!ini) return;
    const p = ponto(ev);
    rastro.push(p);
    const { vx, vy } = velocidade(rastro.filter((q) => p.t - q.t < 120));
    const fim = { dx: p.x - ini.x, dy: p.y - ini.y, vx, vy, x: p.x, y: p.y, ev, cancelou: ev.type === 'pointercancel' };
    ini = null;
    el.classList.remove('pegando');
    aoSoltar?.(fim);
  };
  const pares = [['pointerdown', desce], ['pointermove', move], ['pointerup', sobe], ['pointercancel', sobe]];
  for (const [n, f] of pares) el.addEventListener(n, f);
  return () => { for (const [n, f] of pares) el.removeEventListener(n, f); };
}

// ---------- o texto que se escreve ----------

const escrevendo = new WeakMap();

/**
 * O texto aparece letra por letra. Chamar de novo no mesmo elemento troca o texto (o anterior para).
 * Para o leitor de tela não soletrar: ponha aria-hidden="true" no elemento e o texto inteiro num .so-leitor.
 */
export function escrever(el, texto, { ms = 26 } = {}) {
  const vez = (escrevendo.get(el) ?? 0) + 1;
  escrevendo.set(el, vez);
  const total = Math.max(1, Array.from(String(texto)).length * ms);
  if (pedeMenosMovimento() || typeof requestAnimationFrame !== 'function') { el.textContent = texto; return Promise.resolve(); }
  return new Promise((pronto) => {
    const t0 = agora();
    let acabou = false;
    const fim = () => { if (!acabou) { acabou = true; clearTimeout(seguro); pronto(); } };
    const passo = (t) => {
      if (acabou) return;
      if (escrevendo.get(el) !== vez) { fim(); return; } // outro texto tomou o lugar
      const k = Math.min(1, Math.max(0, (t - t0) / total));
      el.textContent = textoAte(texto, k);
      if (k < 1) requestAnimationFrame(passo); else fim();
    };
    // a garantia: com os quadros parados (aba escondida), o texto inteiro entra no tempo certo
    const seguro = setTimeout(() => { if (escrevendo.get(el) === vez) el.textContent = texto; fim(); }, total + 350);
    requestAnimationFrame(passo);
  });
}

// ---------- a troca de vista na mesma página ----------

/** Troca o que está na tela com a transição de vista (onde o navegador tiver). Devolve quando a tela nova já está montada.
 *  É para troca de TELA (um passo, uma vista inteira): enquanto a transição roda (uns 0,3 a 0,5 s), o navegador põe a
 *  transição por cima da página e o toque não chega nos botões (conferido no Chrome em 07/11). Para o que a pessoa toca
 *  várias vezes seguidas (uma aba, um exemplo, uma camada), use transição de CSS. */
let trocasNaPagina = 0; // as trocas de vista dentro da página que estão rodando agora
export function trocarVista(fazer) {
  if (!temDoc || pedeMenosMovimento() || typeof document.startViewTransition !== 'function' || document.hidden) { fazer(); return Promise.resolve(); }
  // dentro da página, só o que mudou se cruza (html.troca-na-pagina, no estilo.css); o vt-sai e o vt-entra são da troca de página
  const raiz = document.documentElement;
  const acabou = () => { trocasNaPagina = Math.max(0, trocasNaPagina - 1); if (!trocasNaPagina) raiz.classList.remove('troca-na-pagina'); };
  trocasNaPagina++;
  raiz.classList.add('troca-na-pagina');
  let t;
  try { t = document.startViewTransition(() => fazer()); } catch { acabou(); fazer(); return Promise.resolve(); }
  // a transição pode ser cortada (outra começou, a aba escondeu, o quadro demorou): não é erro, a tela nova já entrou
  t.ready.catch(() => {});
  t.finished.catch(() => {}).finally(acabou);
  return t.updateCallbackDone.catch((e) => { console.error('a troca de tela falhou:', e); });
}

// ---------- o que liga sozinho ----------

function ligarIma(el) {
  const atual = { dx: 0, dy: 0 };
  const comIma = el.dataset.magnetico !== 'nao' && temMouse() && !pedeMenosMovimento();
  const comOnda = (el.classList.contains('botao') || el.hasAttribute('data-onda')) && !pedeMenosMovimento();
  if (comIma) {
    el.addEventListener('pointermove', (ev) => {
      if (ev.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const caixa = { left: r.left - atual.dx, top: r.top - atual.dy, width: r.width, height: r.height };
      Object.assign(atual, puxao({ x: ev.clientX, y: ev.clientY }, caixa, {
        forca: Number(el.dataset.forcaIma || 0.3), alcance: Number(el.dataset.alcanceIma || 10),
      }));
      el.classList.add('ima-ativo');
      el.style.setProperty('--ima-x', `${atual.dx}px`);
      el.style.setProperty('--ima-y', `${atual.dy}px`);
    });
    el.addEventListener('pointerleave', () => {
      atual.dx = 0; atual.dy = 0;
      el.classList.remove('ima-ativo');
      el.style.setProperty('--ima-x', '0px');
      el.style.setProperty('--ima-y', '0px');
    });
  }
  el.addEventListener('pointerdown', (ev) => {
    el.classList.add('afunda');
    if (!comOnda) return;
    const r = el.getBoundingClientRect();
    const onda = document.createElement('span');
    onda.className = 'onda';
    onda.setAttribute('aria-hidden', 'true');
    onda.style.left = `${ev.clientX - r.left}px`;
    onda.style.top = `${ev.clientY - r.top}px`;
    el.append(onda);
    setTimeout(() => onda.remove(), 750);
  });
  const solta = () => el.classList.remove('afunda');
  for (const n of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(n, solta);
}

function ligarContagens(doc) {
  const itens = [...doc.querySelectorAll('[data-conta-ate]:not([data-conta-ligada])')];
  for (const el of itens) el.dataset.contaLigada = '1';
  if (!itens.length || pedeMenosMovimento() || typeof IntersectionObserver !== 'function') return; // o HTML já tem o número final
  const olho = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      olho.unobserve(e.target);
      const alvo = Number(e.target.dataset.contaAte);
      if (Number.isFinite(alvo)) animarNumero(e.target, alvo, { de: 0, ms: Number(e.target.dataset.contaMs || 1200) });
    }
  }, { threshold: 0.5 });
  for (const el of itens) olho.observe(el);
}

// as cenas e o fio da rolagem: uma medida por quadro, só do que está perto da tela
const cenas = new Set();
let quadroDaRolagem = 0;
let fio = null;
let ouvindoRolagem = false;

function medirCena(el) {
  const p = progressoNaTela(el.getBoundingClientRect(), window.innerHeight);
  if (el.dataset.p !== undefined && Math.abs(p - Number(el.dataset.p)) < 0.0005) return;
  el.dataset.p = String(p);
  el.style.setProperty('--p', String(p));
  el.dispatchEvent(new CustomEvent('cena', { detail: { p } }));
}

function medirRolagem() {
  quadroDaRolagem = 0;
  for (const el of cenas) medirCena(el);
  if (fio) {
    const d = document.documentElement;
    fio.hidden = d.scrollHeight <= window.innerHeight + 4;
    fio.style.transform = `scaleX(${rolou(window.scrollY, d.scrollHeight, window.innerHeight)})`;
  }
}
const pedirMedida = () => { if (!quadroDaRolagem) quadroDaRolagem = quadro(medirRolagem); };

function ouvirRolagem() {
  if (ouvindoRolagem || typeof window === 'undefined') return;
  ouvindoRolagem = true;
  window.addEventListener('scroll', pedirMedida, { passive: true });
  window.addEventListener('resize', pedirMedida, { passive: true });
}

function ligarCenas(doc) {
  const itens = [...doc.querySelectorAll('[data-cena]:not([data-cena-ligada])')];
  if (!itens.length) return;
  for (const el of itens) el.dataset.cenaLigada = '1';
  if (pedeMenosMovimento() || typeof IntersectionObserver !== 'function') {
    for (const el of itens) { el.style.setProperty('--p', '1'); el.dataset.p = '1'; el.dispatchEvent(new CustomEvent('cena', { detail: { p: 1 } })); }
    return;
  }
  const olho = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (e.isIntersecting) cenas.add(e.target);
      else { medirCena(e.target); cenas.delete(e.target); } // saiu: fica com o 0 ou o 1 certinho
    }
    pedirMedida();
  }, { rootMargin: '15% 0px 15% 0px' });
  for (const el of itens) olho.observe(el);
  ouvirRolagem();
}

function ligarFio(doc) {
  if (fio || !doc.body || doc.body.hasAttribute('data-sem-fio')) return;
  fio = doc.createElement('div');
  fio.className = 'fio-rolagem';
  fio.setAttribute('aria-hidden', 'true');
  doc.body.append(fio);
  ouvirRolagem();
  pedirMedida();
}

let cursorLigado = false;

function ligarCursor(doc) {
  if (cursorLigado || !doc.body || !temMouse() || pedeMenosMovimento()) return;
  cursorLigado = true;
  // só a luz suave que segue o mouse (o círculo em volta do cursor saiu em 07/11: o Andrews achou que não devia ficar)
  const luz = doc.createElement('div');
  luz.className = 'luz-cursor';
  luz.setAttribute('aria-hidden', 'true');
  doc.body.append(luz);
  const raiz = doc.documentElement;
  let alvo = null;
  let pLuz = null;
  let andando = 0;
  const passo = () => {
    andando = 0;
    if (!alvo) return;
    pLuz = pLuz ? { x: entre(pLuz.x, alvo.x, 0.09), y: entre(pLuz.y, alvo.y, 0.09) } : { ...alvo };
    luz.style.translate = `${pLuz.x.toFixed(1)}px ${pLuz.y.toFixed(1)}px`;
    if (Math.abs(pLuz.x - alvo.x) + Math.abs(pLuz.y - alvo.y) > 0.6) andando = quadro(passo);
  };
  doc.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    alvo = { x: ev.clientX, y: ev.clientY };
    raiz.classList.add('cursor-vivo');
    if (!andando) andando = quadro(passo);
  }, { passive: true });
  raiz.addEventListener('pointerleave', () => raiz.classList.remove('cursor-vivo'));
}

/** O palco do produto ganha o nome do cartão da vitrine: na troca de página, um vira o outro. */
function nomearPalco(doc) {
  const id = doc.body?.dataset.produto;
  if (!id || doc.body.classList.contains('app')) return;
  const palco = doc.querySelector('.produto-abre .palco');
  if (palco && !palco.style.viewTransitionName) palco.style.viewTransitionName = `vt-${id}`;
}

/** Liga tudo o que ainda não foi ligado (pode chamar de novo depois de pôr HTML novo na tela). */
export function ligarInteracao(doc = temDoc ? document : undefined) {
  if (!doc?.querySelectorAll) return;
  for (const el of doc.querySelectorAll('.botao:not([data-ima-ligado]), [data-magnetico]:not([data-ima-ligado])')) {
    el.dataset.imaLigado = '1';
    ligarIma(el);
  }
  ligarContagens(doc);
  ligarCenas(doc);
  ligarFio(doc);
  ligarCursor(doc);
  nomearPalco(doc);
}
