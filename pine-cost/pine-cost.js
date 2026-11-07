// A LANDING DO PINE COST PRO (v3, 07/11/2026, o Andrews: "eu quero que a interface seja altamente interativa").
// Aqui só desenha e liga os toques; as contas ficam em demo.js (testadas no Node).
//   1. o palco: os 4 exemplos oficiais num carrossel (dedo, mouse, setas do teclado), o cupom da ficha que se refaz
//      rolando os números, a régua do preço (arrasta com inércia; teclado; − e +) e o cadeado 3D do preço certo:
//      tocou, ele abre e a conta completa aparece (o preço certo e a faixa da média do ramo na régua)
//   2. as 5 camadas que se montam com a rolagem; tocar numa mostra um pedacinho dela funcionando
//   3. o grátis ↔ pacote: as fichas e as fotos contando (3 → 8) e a foto de exemplo com a marca e sem ela
//   4. as perguntas que abrem com mola (o <details> continua: sem JavaScript, abre do jeito de sempre)
// Toda conta é a da calculadora de verdade, com os exemplos marcados "exemplo". Nada é gravado e nada sai daqui.
// Quem pediu menos movimento vê tudo funcionando, só que parado (sem inércia, sem giro, sem mola).
import * as D from './demo.js';
import * as F from '../comum/ficha.js';
import { EXEMPLOS } from '../comum/exemplos.js';
import { cadeadoSvg } from '../valores.js';
import {
  animarNumero, trocarConteudo, estourarEm, vibrar, pegar, escrever, pedeMenosMovimento,
  suavizar, entre, limitar, ligarInteracao,
} from '../comum/interacao.js';
import { ligarCadeados3d, fecharCadeado3d } from '../comum/cadeado3d.js';

const PX = 14; // px por passo da régua (50 centavos)
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const reaisDe = (v) => F.reais(Math.round(v * 100));
const esc = F.esc;

const estado = {
  tab: null,
  ex: 0, preco: 0, pos: 0, alvo: null, faixa: null, zonas: [], ficha: null, mesmoNoApp: false, completa: false,
  camada: 'despensa', extras: {}, tomate: 8, abertos: new Set(), par: 0, giro: 0, quantas: 40, comprados: new Set(),
  plano: 'gratis',
};

// o que já está na tela (não desenha de novo o que não mudou)
const ultimo = new WeakMap();
function por(el, html) {
  if (!el || ultimo.get(el) === html) return false;
  ultimo.set(el, html);
  el.innerHTML = html;
  return true;
}

// =====================================================================================================
// 1. O PALCO
// =====================================================================================================

const P = {};
const ROTULO_TRANCADO = 'Abrir o cadeado: a conta completa, com o preço certo';

/** O cadeado 3D do preço certo (o SVG de reserva é o do valores.js). Sem WebGL ou com menos movimento, fica o desenho. */
function montarCadeado() {
  const botao = $('[data-abrir]');
  if (!botao) return;
  botao.innerHTML = `<span class="cadeado-3d pc-cadeado" data-cadeado-3d>${cadeadoSvg()}</span>`;
  try { ligarCadeados3d(document); } catch { /* sem WebGL: fica o cadeado desenhado */ }
}

function ligarPalco() {
  Object.assign(P, {
    trilho: $('[data-trilho]'), fila: $('[data-fila]'), setas: $$('[data-anda]'), conta: $('[data-conta]'), dica: $('[data-dica-exemplos]'),
    item: $('[data-item]'), itemLeitor: $('[data-item-leitor]'), negocio: $('[data-negocio]'),
    cupom: $('[data-cupom]'), nota: $('[data-nota]'), leitura: $('[data-leitura]'),
    mapa: $('[data-mapa]'), zonas: $('[data-mapa-zonas]'), marcador: $('[data-marcador]'),
    regua: $('[data-regua]'), fita: $('[data-fita]'), precoNota: $('[data-preco-nota]'),
    certo: $('[data-certo]'), certoCorpo: $('[data-certo-corpo]'), abrir: $('[data-abrir]'), trancar: $('[data-trancar]'),
  });
  if (!P.fila || !P.cupom || !P.regua) return;
  P.textoTrancado = P.certoCorpo.innerHTML;
  P.fila.innerHTML = D.htmlCartoes(estado.ex);
  P.cartoes = $$('.pc-cartao', P.fila);
  P.conta.setAttribute('aria-labelledby', P.cartoes[estado.ex].id);
  carregarExemplo(estado.ex);
  moverFita(estado.pos);
  desenharConta({ primeira: true });
  ligarCarrossel();
  ligarRegua();
  ligarCadeado();
  // as cores da régua dos outros 3 exemplos ficam prontas antes da pessoa chegar neles (a troca responde na hora)
  D.ORDEM.forEach((id, k) => setTimeout(() => zonasDe(id), 1200 + k * 300));
}

// ---------- o exemplo da vez ----------

// a régua de cada exemplo (a faixa, com a média do ramo dentro) e as cores dela (a conta em cada preço): feitas uma vez só
const reguas = new Map();
function reguaDe(id) {
  if (!reguas.has(id)) {
    const faixa = D.faixaDoExemplo(id, estado.tab);
    reguas.set(id, { faixa, zonas: D.zonasDoBalcao(id, faixa, estado.tab) });
  }
  return reguas.get(id);
}
const zonasDe = (id) => reguaDe(id).zonas;

function carregarExemplo(i) {
  const id = D.ORDEM[i];
  const e = EXEMPLOS[id];
  estado.faixa = reguaDe(id).faixa;
  estado.preco = estado.pos = D.noPasso(e.precos.balcao, estado.faixa);
  estado.alvo = null;
  estado.zonas = zonasDe(id);
  estado.mesmoNoApp = e.precos.app !== undefined && e.precos.app !== null;
  P.fita.innerHTML = D.htmlFita(estado.faixa, PX);
  P.fita.style.width = `${D.naFita(estado.faixa.max, estado.faixa, PX)}px`;
  P.regua.setAttribute('aria-valuemin', String(estado.faixa.min));
  P.regua.setAttribute('aria-valuemax', String(estado.faixa.max));
  ultimo.delete(P.zonas);
}

/** Refaz a conta pela calculadora e põe na tela: o cupom (os números rolam), a régua, o mapa e o preço certo. */
function desenharConta({ ms = 600, primeira = false, dir = 0 } = {}) {
  const id = D.ORDEM[estado.ex];
  let ficha;
  try {
    ficha = D.fichaDoPalco(id, estado.preco, estado.tab, { completa: estado.completa });
  } catch (e) {
    P.cupom.textContent = `Não deu para fazer a conta (${e.message}).`;
    return;
  }
  estado.ficha = ficha;
  const { cupom, nota } = D.htmlDaConta(ficha);
  if (primeira || dir) {
    const e = EXEMPLOS[id];
    P.negocio.textContent = e.negocio;
    P.itemLeitor.textContent = e.item;
    if (primeira) P.item.textContent = e.item; else escrever(P.item, e.item, { ms: 20 });
  }
  if (dir) {
    P.cupom.classList.remove('entra-dir', 'entra-esq');
    void P.cupom.offsetWidth; // recomeça a entrada do papel
    P.cupom.classList.add(dir > 0 ? 'entra-dir' : 'entra-esq');
  }
  if (primeira) { P.cupom.innerHTML = cupom; ultimo.set(P.cupom, cupom); } else if (ultimo.get(P.cupom) !== cupom) { ultimo.set(P.cupom, cupom); trocarConteudo(P.cupom, cupom, { ms }); }
  P.cupom.setAttribute('aria-busy', 'false');
  por(P.nota, nota);
  animarNumero(P.leitura, estado.preco, { formato: reaisDe, ms: primeira ? 0 : Math.min(ms, 320) });
  P.regua.setAttribute('aria-valuenow', String(estado.preco));
  P.regua.setAttribute('aria-valuetext', reaisDe(estado.preco));
  por(P.zonas, D.htmlMapa(estado.zonas, estado.faixa, ficha));
  por(P.precoNota, D.notaDoPreco(ficha, { completa: estado.completa, mesmoNoApp: estado.mesmoNoApp }));
  if (estado.completa) por(P.certoCorpo, D.htmlPrecoCerto(ficha));
}

// ---------- o carrossel dos exemplos ----------

function ligarCarrossel() {
  const { trilho, fila } = P;
  let m = { cartao: 200, passo: 212, largura: 300 };
  const medir = () => {
    const c = P.cartoes[0];
    const gap = parseFloat(getComputedStyle(fila).columnGap) || 0;
    m = { cartao: c.offsetWidth, passo: c.offsetWidth + gap, largura: trilho.clientWidth };
  };
  P.posicionar = (p = estado.ex, dx = 0) => {
    const d = D.deslocamentoDaFila({ p, ...m, total: D.ORDEM.length, dx });
    fila.style.translate = `${d.x}px 0`;
    trilho.classList.toggle('pc-cabem', d.cabem);
    if (P.dica) P.dica.textContent = d.cabem ? 'toque num deles' : 'arraste pro lado';
    P.cartoes.forEach((c, i) => {
      const j = D.jeitoDoCartao(i, p);
      c.style.setProperty('--k', String(j.k));
      c.style.setProperty('--r', String(d.cabem ? 0 : j.r));
    });
    for (const s of P.setas) {
      const anda = Number(s.dataset.anda);
      s.setAttribute('aria-disabled', String((anda < 0 && estado.ex === 0) || (anda > 0 && estado.ex === D.ORDEM.length - 1)));
    }
  };
  medir();
  trilho.classList.add('pc-sem-anima'); // a primeira posição entra sem deslizar
  P.posicionar();
  requestAnimationFrame(() => requestAnimationFrame(() => trilho.classList.remove('pc-sem-anima')));
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { medir(); P.posicionar(); }).observe(trilho);

  pegar(trilho, {
    eixo: 'x',
    aoMover: ({ dx }) => P.posicionar(D.posicaoNoArrasto(estado.ex, dx, m.passo, D.ORDEM.length), dx),
    aoSoltar: ({ dx, vx, x, y, cancelou }) => {
      if (cancelou) { P.posicionar(); return; }
      if (Math.abs(dx) < 6) { // foi um toque: escolhe o cartão que estava embaixo do dedo
        const c = document.elementFromPoint(x, y)?.closest?.('.pc-cartao');
        if (c && fila.contains(c)) escolherExemplo(Number(c.dataset.i)); else P.posicionar();
        return;
      }
      escolherExemplo(D.alvoDoCarrossel({ indice: estado.ex, dx, vx, passo: m.passo, total: D.ORDEM.length }));
    },
  });
  // pelo teclado: o Enter e o espaço no cartão (o clique do dedo e do mouse já foi pelo arrasto, acima)
  fila.addEventListener('click', (ev) => {
    const c = ev.target.closest('.pc-cartao');
    if (c && ev.detail === 0) escolherExemplo(Number(c.dataset.i));
  });
  fila.addEventListener('keydown', (ev) => {
    const anda = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
    let alvo = null;
    if (anda) alvo = estado.ex + anda;
    if (ev.key === 'Home') alvo = 0;
    if (ev.key === 'End') alvo = D.ORDEM.length - 1;
    if (alvo === null) return;
    ev.preventDefault();
    escolherExemplo(alvo, { foco: true });
  });
  for (const s of P.setas) s.addEventListener('click', () => escolherExemplo(estado.ex + Number(s.dataset.anda)));
}

function escolherExemplo(i, { foco = false } = {}) {
  const antes = estado.ex;
  const novo = limitar(Math.round(i), 0, D.ORDEM.length - 1);
  estado.ex = novo;
  P.cartoes.forEach((c, j) => { c.setAttribute('aria-selected', String(j === novo)); c.tabIndex = j === novo ? 0 : -1; });
  P.posicionar();
  if (foco) P.cartoes[novo].focus({ preventScroll: true });
  if (novo === antes) return;
  vibrar(8);
  pararDeslize();
  carregarExemplo(novo);
  moverFita(estado.pos);
  P.conta.setAttribute('aria-labelledby', P.cartoes[novo].id);
  desenharConta({ dir: novo > antes ? 1 : -1 });
}

// ---------- a régua do preço ----------

function moverFita(v) {
  P.fita.style.translate = `${(-D.naFita(v, estado.faixa, PX)).toFixed(1)}px 0`;
  P.marcador.style.left = `${D.naFaixa(v, estado.faixa)}%`;
}

function mudarPreco(p, { ms = 600 } = {}) {
  if (p === estado.preco) return;
  estado.preco = p;
  desenharConta({ ms });
}

let deslize = 0;
function pararDeslize() {
  if (deslize) cancelAnimationFrame(deslize);
  deslize = 0;
}

/** A fita anda até o preço (com a curva que chega devagar); a conta acompanha a cada 50 centavos. */
function deslizar(alvo) {
  pararDeslize();
  estado.alvo = alvo;
  const de = estado.pos;
  if (pedeMenosMovimento() || typeof requestAnimationFrame !== 'function' || Math.abs(alvo - de) < 1e-6) {
    estado.pos = alvo;
    moverFita(alvo);
    mudarPreco(alvo);
    return;
  }
  const dur = limitar(200 + (Math.abs(alvo - de) / estado.faixa.passo) * 26, 240, 680);
  const t0 = performance.now();
  const passo = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    estado.pos = k >= 1 ? alvo : entre(de, alvo, suavizar(k));
    moverFita(estado.pos);
    mudarPreco(D.noPasso(estado.pos, estado.faixa), { ms: 240 });
    deslize = k < 1 ? requestAnimationFrame(passo) : 0;
  };
  deslize = requestAnimationFrame(passo);
}

const proximoPreco = (passos) => D.noPasso((estado.alvo ?? estado.preco) + passos * estado.faixa.passo, estado.faixa);

function ligarRegua() {
  const { regua } = P;
  let inicio = 0;
  let mexeu = false;
  pegar(regua, {
    eixo: 'x',
    aoComecar: () => { pararDeslize(); estado.alvo = null; inicio = estado.pos; mexeu = false; },
    aoMover: ({ dx }) => {
      if (Math.abs(dx) > 3) mexeu = true;
      estado.pos = D.precoDoArrasto(inicio, dx, estado.faixa, PX);
      moverFita(estado.pos);
      mudarPreco(D.noPasso(estado.pos, estado.faixa), { ms: 220 });
    },
    aoSoltar: ({ vx, x, cancelou }) => {
      const f = estado.faixa;
      if (cancelou) { deslizar(D.noPasso(estado.pos, f)); return; }
      if (!mexeu) { // tocou num ponto da régua: vai até ele
        const r = regua.getBoundingClientRect();
        deslizar(D.noPasso(estado.pos + ((x - (r.left + r.width / 2)) / PX) * f.passo, f));
        return;
      }
      deslizar(D.precoDaInercia(estado.pos, vx, f, PX));
    },
  });
  regua.addEventListener('keydown', (ev) => {
    const f = estado.faixa;
    const passos = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: f.rotulo / f.passo, PageDown: -f.rotulo / f.passo }[ev.key];
    let alvo = null;
    if (passos) alvo = proximoPreco(passos);
    if (ev.key === 'Home') alvo = f.min;
    if (ev.key === 'End') alvo = f.max;
    if (alvo === null) return;
    ev.preventDefault();
    deslizar(alvo);
  });
  // o − e o +: um toque anda 50 centavos; segurando, vai andando
  for (const b of $$('[data-mexe]')) {
    let espera = 0;
    let repete = 0;
    const um = () => deslizar(proximoPreco(Number(b.dataset.mexe)));
    const para = () => { clearTimeout(espera); clearInterval(repete); };
    b.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      um();
      espera = setTimeout(() => { repete = setInterval(um, 110); }, 420);
    });
    for (const n of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(n, para);
    b.addEventListener('click', (ev) => { if (ev.detail === 0) um(); }); // o Enter e o espaço
  }
  // o mapa de cima: tocou, a régua vai até lá
  P.mapa.addEventListener('pointerdown', (ev) => {
    const r = P.mapa.getBoundingClientRect();
    const f = estado.faixa;
    deslizar(D.noPasso(f.min + limitar((ev.clientX - r.left) / r.width, 0, 1) * (f.max - f.min), f));
  });
}

// ---------- o cadeado do preço certo ----------

function ligarCadeado() {
  P.abrir.addEventListener('click', () => {
    if (estado.completa || P.abrindo || !estado.tab) return;
    P.abrindo = true;
    P.certo.dataset.estado = 'abrindo';
    vibrar(10);
    // a alça sobe e gira (o cadeado 3D); a conta completa entra logo depois
    const espera = $('.cadeado-3d.tem-3d', P.abrir) && !pedeMenosMovimento() ? 460 : 0;
    setTimeout(abrirConta, espera);
  });
  P.trancar.addEventListener('click', () => {
    estado.completa = false;
    P.certo.dataset.estado = 'trancado';
    ultimo.delete(P.certoCorpo);
    P.certoCorpo.innerHTML = P.textoTrancado;
    P.abrir.setAttribute('aria-label', ROTULO_TRANCADO);
    P.abrir.removeAttribute('aria-disabled');
    P.trancar.hidden = true;
    if (!fecharCadeado3d(P.abrir)) montarCadeado(); // a alça desce de novo (sem 3D, volta o desenho fechado)
    desenharConta();
    P.abrir.focus({ preventScroll: true });
  });
}

function abrirConta() {
  P.abrindo = false;
  estado.completa = true;
  P.certo.dataset.estado = 'aberto';
  P.abrir.setAttribute('aria-label', 'Cadeado aberto: a conta completa está na tela');
  P.abrir.setAttribute('aria-disabled', 'true');
  P.trancar.hidden = false;
  desenharConta();
  estourarEm(P.abrir, { quantos: 18, raio: 80 });
  vibrar(16);
}

// =====================================================================================================
// 2. AS 5 CAMADAS
// =====================================================================================================

const CAM = {};

function ligarCamadas() {
  CAM.pilha = $('[data-pilha]');
  CAM.painel = $('[data-camada-painel]');
  if (!CAM.pilha || !CAM.painel) return;
  CAM.lajes = $$('.pc-laje', CAM.pilha);
  const montar = (p) => CAM.pilha.classList.toggle('montada', p >= 0.36);
  CAM.pilha.addEventListener('cena', (ev) => montar(ev.detail.p));
  montar(Number(CAM.pilha.dataset.p ?? 1)); // quem pediu menos movimento já recebeu a cena pronta
  CAM.pilha.addEventListener('click', (ev) => {
    const l = ev.target.closest('.pc-laje');
    if (l) escolherCamada(l.dataset.camada, { mostrar: true });
  });
  CAM.pilha.addEventListener('keydown', (ev) => {
    const i = D.CAMADAS.findIndex((c) => c.id === estado.camada);
    // a pilha cresce para cima: a seta para cima vai para a camada de cima (a de número maior)
    const anda = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[ev.key];
    let alvo = null;
    if (anda) alvo = limitar(i + anda, 0, D.CAMADAS.length - 1);
    if (ev.key === 'Home') alvo = 0;
    if (ev.key === 'End') alvo = D.CAMADAS.length - 1;
    if (alvo === null) return;
    ev.preventDefault();
    escolherCamada(D.CAMADAS[alvo].id, { foco: true });
  });
  CAM.painel.addEventListener('click', cliqueNoPainel);
  CAM.painel.addEventListener('input', mexeuNoPainel);
  escolherCamada('despensa', { primeira: true });
}

function htmlDoPainel(id) {
  const t = estado.tab;
  const i = D.CAMADAS.findIndex((c) => c.id === id);
  const prox = D.CAMADAS[i + 1];
  const pe = `<div class="pc-camada-pe"><button type="button" class="botao claro pc-proxima" data-proxima="${prox ? prox.id : D.CAMADAS[0].id}">${prox ? `Próxima: ${esc(prox.nome.toLowerCase())}` : 'Voltar pra despensa'} <span aria-hidden="true">→</span></button></div>`;
  let corpo = '';
  try {
    if (id === 'despensa') corpo = `<div class="pc-rolar" data-rolar>${D.htmlDespensa(D.despensaMini(t, estado.extras))}</div>`;
    if (id === 'receitas') {
      corpo = `<div class="pc-rolar" data-rolar>${D.htmlReceitas(D.cadeiaDoMolho(t, estado.tomate))}</div>
        <label class="pc-faixa"><span>O preço do tomate mudou? <b data-tomate-rot>${reaisDe(estado.tomate)} o kg</b></span>
          <input type="range" min="4" max="20" step="0.5" value="${estado.tomate}" data-tomate aria-label="O preço do quilo do tomate, de 4 a 20 reais"></label>
        <p class="pc-camada-nota">O tomate entra no molho, o molho entra na pizza. Mexa no tomate e veja cada camada mudar.</p>`;
    }
    if (id === 'ficha') corpo = `<div class="pc-arvore-caixa">${D.htmlFicha(D.fichaMini(t), estado.abertos)}</div>`;
    if (id === 'meio') {
      const x = D.meioMini(t, estado.par);
      corpo = `<div class="chips pc-pares" role="group" aria-label="Os 2 sabores">${D.htmlParesDoMeio(estado.par)}</div>
        <div class="pc-meio"><div class="pc-pizza-gira" data-gira style="--giro: ${estado.giro}deg">${D.pizzaSvg(x.a, x.b)}</div>
        <div class="pc-rolar" data-rolar>${D.htmlRegrasDoMeio(x)}</div></div>`;
    }
    if (id === 'compras') {
      corpo = `<label class="pc-faixa"><span>Pizzas de calabresa na semana: <b data-quantas-rot>${estado.quantas}</b></span>
          <input type="range" min="0" max="120" step="5" value="${estado.quantas}" data-quantas aria-label="Quantas pizzas de calabresa na semana, de 0 a 120"></label>
        <div class="pc-rolar" data-rolar>${D.htmlCompras(D.comprasMini(t, estado.quantas), estado.comprados)}</div>`;
    }
  } catch (e) {
    corpo = `<p class="pc-camada-nota">Não deu para montar o exemplo (${esc(e.message)}).</p>`;
  }
  return `${D.htmlCabecaDaCamada(id)}${corpo}${pe}`;
}

/**
 * Troca o painel com uma entrada em CSS (o conteúdo novo sobe e acende). Aqui não vai o trocarVista do kit: enquanto a
 * transição de vista roda (~0,5 s), a camada dela fica por cima da página e o toque seguinte se perde (testado no Chrome).
 */
function trocarSoOPainel(fazer) {
  fazer();
  CAM.painel.classList.remove('entra');
  void CAM.painel.offsetWidth; // recomeça a entrada
  CAM.painel.classList.add('entra');
}

function escolherCamada(id, { primeira = false, mostrar = false, foco = false } = {}) {
  if (!primeira && id === estado.camada) return;
  estado.camada = id;
  for (const l of CAM.lajes) {
    const sim = l.dataset.camada === id;
    l.setAttribute('aria-selected', String(sim));
    l.tabIndex = sim ? 0 : -1;
    if (sim && foco) l.focus({ preventScroll: true });
  }
  const fazer = () => {
    CAM.painel.innerHTML = htmlDoPainel(id);
    CAM.painel.setAttribute('aria-labelledby', `pc-laje-${id}`);
    ligarInteracao(CAM.painel); // o ímã e a onda no botão novo
  };
  if (primeira) fazer(); else { vibrar(8); trocarSoOPainel(fazer); }
  if (mostrar) trazerPraTela(CAM.painel);
}

/** No celular, o painel fica embaixo da pilha: se ele estiver fora da tela, a página desce até ele. */
function trazerPraTela(el) {
  const r = el.getBoundingClientRect();
  if (r.top < window.innerHeight - 160) return;
  window.scrollBy({ top: r.top - 84, behavior: pedeMenosMovimento() ? 'auto' : 'smooth' });
}

function redesenhar(html, { ms = 600 } = {}) {
  const alvo = $('[data-rolar]', CAM.painel);
  if (alvo) trocarConteudo(alvo, html, { ms });
}

/** Depois de refazer um pedaço, o foco volta para o botão novo do mesmo lugar (quem usa o teclado não se perde). */
function devolverFoco(seletor, tinha) {
  if (tinha) $(seletor, CAM.painel)?.focus({ preventScroll: true });
}

function cliqueNoPainel(ev) {
  const b = ev.target.closest('button');
  if (!b || !CAM.painel.contains(b)) return;
  const tinhaFoco = document.activeElement === b;
  const t = estado.tab;
  if (b.dataset.mais) {
    const id = b.dataset.mais;
    const antes = D.despensaMini(t, estado.extras);
    estado.extras = { ...estado.extras, [id]: (estado.extras[id] ?? 0) + 1 };
    const depois = D.despensaMini(t, estado.extras);
    redesenhar(D.htmlDespensa(depois));
    devolverFoco(`[data-mais="${id}"]`, tinhaFoco);
    vibrar(8);
    const era = antes.find((x) => x.id === id);
    const ficou = depois.find((x) => x.id === id);
    if (era?.abaixo && !ficou?.abaixo) { estourarEm($(`[data-ins="${id}"] .pill`, CAM.painel), { quantos: 12, raio: 54 }); vibrar(14); }
    if (antes.some((x) => x.abaixo) && depois.every((x) => !x.abaixo)) estourarEm($('.pc-camada-nota', CAM.painel), { quantos: 24, raio: 110 });
  } else if (b.dataset.recomecar) {
    estado.extras = {};
    redesenhar(D.htmlDespensa(D.despensaMini(t, estado.extras)));
    $('[data-mais]', CAM.painel)?.focus({ preventScroll: true });
  } else if (b.dataset.no) {
    const caixa = document.getElementById(b.getAttribute('aria-controls'));
    const abre = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(abre));
    if (abre) estado.abertos.add(b.dataset.no); else estado.abertos.delete(b.dataset.no);
    if (caixa) {
      caixa.dataset.aberto = String(abre);
      if (abre) { caixa.removeAttribute('inert'); caixa.removeAttribute('aria-hidden'); } else { caixa.setAttribute('inert', ''); caixa.setAttribute('aria-hidden', 'true'); }
    }
    vibrar(6);
  } else if (b.dataset.par !== undefined) {
    const par = Number(b.dataset.par);
    if (par === estado.par) return;
    estado.par = par;
    for (const c of $$('[data-par]', CAM.painel)) c.setAttribute('aria-pressed', String(Number(c.dataset.par) === par));
    const x = D.meioMini(t, par);
    estado.giro += 180;
    const gira = $('[data-gira]', CAM.painel);
    if (gira) { gira.style.setProperty('--giro', `${estado.giro}deg`); gira.innerHTML = D.pizzaSvg(x.a, x.b); }
    redesenhar(D.htmlRegrasDoMeio(x));
    vibrar(8);
  } else if (b.dataset.comprei) {
    const id = b.dataset.comprei;
    const tinha = estado.comprados.has(id);
    if (tinha) estado.comprados.delete(id); else estado.comprados.add(id);
    const x = D.comprasMini(t, estado.quantas);
    redesenhar(D.htmlCompras(x, estado.comprados));
    devolverFoco(`[data-comprei="${id}"]`, tinhaFoco);
    if (!tinha) {
      estourarEm($(`[data-comprei="${id}"]`, CAM.painel), { quantos: 10, raio: 46 });
      vibrar(10);
      if (x.comprar.every((i) => estado.comprados.has(i.id))) { estourarEm($('.pc-total', CAM.painel), { quantos: 26, raio: 120 }); vibrar(22); }
    }
  } else if (b.dataset.proxima) {
    escolherCamada(b.dataset.proxima, { foco: true });
    trazerPraTela(CAM.painel);
  }
}

function mexeuNoPainel(ev) {
  const el = ev.target;
  if (el.matches('[data-tomate]')) {
    estado.tomate = Number(el.value);
    $('[data-tomate-rot]', CAM.painel).textContent = `${reaisDe(estado.tomate)} o kg`;
    redesenhar(D.htmlReceitas(D.cadeiaDoMolho(estado.tab, estado.tomate)), { ms: 320 });
  }
  if (el.matches('[data-quantas]')) {
    estado.quantas = Number(el.value);
    $('[data-quantas-rot]', CAM.painel).textContent = String(estado.quantas);
    redesenhar(D.htmlCompras(D.comprasMini(estado.tab, estado.quantas), estado.comprados), { ms: 320 });
  }
}

// =====================================================================================================
// 3. O QUE VOCÊ RECEBE: o grátis ↔ o pacote
// =====================================================================================================

function ligarRecebe() {
  const caixa = $('[data-recebe]');
  if (!caixa) return;
  const q = D.quantidades();
  const minis = {};
  for (const tipo of ['fichas', 'fotos']) {
    const el = $(`[data-minis="${tipo}"]`, caixa);
    el.innerHTML = D.htmlMinis(tipo, 'gratis', q);
    minis[tipo] = $$('.pc-mini', el);
  }
  const botoes = $$('button[data-plano]', caixa);
  const foto = $('[data-foto]', caixa);
  const legenda = $('[data-foto-legenda]', caixa);
  const cartoesDosPlanos = $$('[data-plano-cartao]');
  const mostrar = (plano, { primeira = false } = {}) => {
    const mudou = plano !== estado.plano;
    estado.plano = plano;
    caixa.dataset.plano = plano;
    for (const b of botoes) b.setAttribute('aria-pressed', String(b.dataset.plano === plano));
    for (const tipo of ['fichas', 'fotos']) {
      const n = q[plano][tipo] ?? 0;
      animarNumero($(`[data-quantos="${tipo}"]`, caixa), n, { ms: primeira ? 0 : 750 });
      minis[tipo].forEach((m, i) => {
        m.classList.toggle('cheio', i < n);
        if (tipo === 'fotos') m.classList.toggle('com-marca', plano === 'gratis' && i < n);
      });
    }
    foto.dataset.marca = plano === 'gratis' ? 'sim' : 'nao';
    legenda.textContent = plano === 'gratis' ? 'No grátis, a foto vai com a marca da Pineapple no canto.' : 'No pacote, as fotos vão sem a marca.';
    for (const c of cartoesDosPlanos) c.classList.toggle('escolhido', c.dataset.planoCartao === plano);
    if (!primeira && mudou) {
      vibrar(10);
      if (plano === 'pacote') estourarEm(foto, { quantos: 16, raio: 90 });
    }
  };
  caixa.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-plano]');
    if (b) mostrar(b.dataset.plano);
  });
  mostrar('gratis', { primeira: true });
}

// =====================================================================================================
// 4. AS PERGUNTAS QUE ABREM COM MOLA (sem JavaScript, ou com menos movimento, o <details> abre sozinho)
// =====================================================================================================

function ligarPerguntas() {
  for (const d of $$('.pc-perguntas details')) {
    const resumo = $('summary', d);
    const corpo = $('.pc-resp', d);
    if (!resumo || !corpo || typeof corpo.animate !== 'function') continue;
    resumo.addEventListener('click', (ev) => {
      if (pedeMenosMovimento()) return;
      ev.preventDefault();
      if (d.dataset.mexendo) return;
      d.dataset.mexendo = '1';
      if (!d.open) {
        d.open = true;
        const h = corpo.scrollHeight;
        const a = corpo.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.3, 1.4, .45, 1)' });
        a.onfinish = a.oncancel = () => { delete d.dataset.mexendo; };
      } else {
        d.classList.add('fechando');
        const a = corpo.animate([{ height: `${corpo.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 240, easing: 'cubic-bezier(.4, 0, .2, 1)' });
        a.onfinish = a.oncancel = () => { d.open = false; d.classList.remove('fechando'); delete d.dataset.mexendo; };
      }
    });
  }
}

// =====================================================================================================
// LIGAR
// =====================================================================================================

async function comecar() {
  montarCadeado();
  ligarPerguntas();
  ligarRecebe();
  try {
    estado.tab = await F.carregarTabelas();
  } catch (e) {
    const cupom = $('[data-cupom]');
    if (cupom) { cupom.textContent = `Não deu para abrir a calculadora (${e.message}).`; cupom.setAttribute('aria-busy', 'false'); }
    return;
  }
  ligarPalco();
  ligarCamadas();
}

if (typeof document !== 'undefined') comecar();
