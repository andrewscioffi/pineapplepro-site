// O CARDÁPIO DIGITAL (prévia, 07/11/2026; v3 "altamente interativa" no mesmo dia): a demonstração da página. É PROTÓTIPO:
// nada é gravado (nem no navegador) e nada sai daqui; o "pedir no WhatsApp" fica desligado.
//   1. o item que voa pro pedido: pôr um item faz uma cópia dele voar até a sacola, o total rola e a sacola pula;
//      "Fechar o pedido" estoura, e o "Pedir no WhatsApp" continua desligado ("na prévia, não manda nada")
//   2. as categorias com o dedo: arrastar a lista de lado passa de categoria; a barra acompanha a rolagem (a categoria
//      que está na tela acende) e a pílula escura anda junto com o dedo
//   3. o "e se o que você compra subir?" vivo: a régua vai de hoje até o dobro; os preços e as sobras rolam, e o item que
//      passa a dar prejuízo acende, com quanto ele precisaria custar
//   4. o item aberto: tocar num item abre ele grande (a folha cresce do cartão); fecha arrastando pra baixo, no ✕ ou no Esc
// Todo preço sai da calculadora de verdade (pedido.js → comum/ficha.js → calculadora/contas.mjs), escrito com o reais().
// As contas dos gestos ficam em gestos.js (testadas). Quem pediu menos movimento vê tudo funcionando, só que parado.
import { carregarTabelas, esc, seloExemplo } from '../comum/ficha.js';
import { EXEMPLOS } from '../comum/exemplos.js';
import { reais } from '../calculadora/contas.mjs';
import { ligarVidro } from '../comum/vidro.js';
import { animarNumero, trocarConteudo, estourarEm, vibrar, pegar, pedeMenosMovimento } from '../comum/interacao.js';
import * as P from './pedido.js';
import * as Gd from './gestos.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const estado = {
  tab: null, // as tabelas da calculadora
  itens: [], // o cardápio de exemplo, já com a conta
  usarFicha: false, // a chave
  subiu: 0, // a simulação (0,3 = +30%)
  pedido: {}, // { id: quantidade }
  categoria: 0, // a categoria que está na tela (a posição em P.CATEGORIAS)
  folha: null, // 'item' | 'pedido' | null
  item: null, // o id do item aberto
  qtdFolha: 1,
  voltar: null, // quem recebe o foco quando a folha fecha
  trocou: false, // a chave acabou de mudar (a etiqueta "no cardápio" acende do outro lado)
  fechado: false, // o pedido fechado (o recibo da prévia)
  prejuizos: new Set(), // os itens que já estavam dando prejuízo (o que entra agora acende uma vez)
};

const itemPor = (id) => estado.itens.find((i) => i.id === id);
const precoDe = (item) => P.precoNoCardapio(item, estado.usarFicha);
const pctTxt = (s) => `+${Math.round(s * 100)}%`;
// o "R$ 8,42" nunca quebra no meio (espaço que não quebra), como na ficha
const dinheiro = (c) => reais(c).replace(' ', ' ');
const sobraTxt = (c) => (c >= 0 ? `sobra uns ${dinheiro(c)}` : `sobra − ${dinheiro(-c)}`);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const rola = (chave, c) => ` data-rola="${esc(chave)}" data-rola-num="${(c / 100).toFixed(2)}"`;
const traco = (d, largura = 2.2) => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="${largura}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
const MAIS = traco('M8 3.4v9.2M3.4 8h9.2');
const MENOS = traco('M3.4 8h9.2');
const FECHAR = traco('M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6', 2);
const OK = traco('m3.5 8.5 3 3 6-7', 2);
const CONVERSA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h16v10H9.5L5 19.5v-4H4z"/><path d="M8.5 10.5h7"/></svg>';
const INFO = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v3.8M8 5v.01"/></svg>';
const SUAVE = 'cubic-bezier(.2, .75, .2, 1)';

// o celular só vibra depois que a pessoa tocou na página (o Chrome bloqueia antes do 1º toque)
const tremerCelular = (ms) => {
  if (typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  vibrar(ms);
};

// ---------- o preço na tela: rola até o número novo (o kit), com um brilho laranja ----------

const esperas = new WeakMap(); // a varrida da chave (um preço depois do outro): a espera de cada número
function escreverPreco(el, c, { animar = true, atraso = 0 } = {}) {
  if (!el) return;
  clearTimeout(esperas.get(el));
  const vai = () => {
    const antes = el.dataset.c === undefined ? null : Number(el.dataset.c);
    el.dataset.c = String(c);
    animarNumero(el, c, { formato: (v) => dinheiro(Math.round(v)), ms: animar ? 560 : 0 });
    if (animar && antes !== null && antes !== c && !pedeMenosMovimento()) {
      el.classList.remove('mudou');
      void el.offsetWidth; // recomeça o brilho
      el.classList.add('mudou');
    }
  };
  if (atraso && animar && !pedeMenosMovimento()) esperas.set(el, setTimeout(vai, atraso));
  else vai();
}

// ---------- o celular: as categorias e a lista ----------

const NOME_CAT = Object.fromEntries(P.CATEGORIAS.map((c) => [c.id, c.nome]));

function desenharAbas() {
  $('[data-cd-abas]').innerHTML = '<span class="cd-abas-marca" data-cd-marca aria-hidden="true"></span>'
    + P.CATEGORIAS.map((c, i) => `<button type="button" class="cd-aba" data-cd-aba="${i}"${i === estado.categoria ? ' aria-current="true"' : ''}>${esc(c.nome)}</button>`).join('');
}

const prato = (item, grande = false) =>
  `<span class="cd-prato cat-${esc(item.categoria)}${grande ? ' grande' : ''}" aria-hidden="true"${grande ? ' data-cd-prato-grande' : ''}><b>${esc(item.inicial)}</b></span>`;

function passo(item, onde) {
  const qtd = estado.pedido[item.id] ?? 0;
  const nome = esc(item.nome);
  return `<div class="cd-passo" data-cd-passo="${esc(item.id)}" data-qtd="${qtd}">
    <button type="button" class="menos" data-cd-tirar="${esc(item.id)}" data-onde="${onde}" aria-label="Tirar 1 ${nome}">${MENOS}</button>
    <span class="num">${qtd}</span>
    <button type="button" class="mais" data-cd-por="${esc(item.id)}" data-onde="${onde}" aria-label="Pôr 1 ${nome} no pedido">${MAIS}</button>
  </div>`;
}

function desenharLista() {
  $('[data-cd-lista]').innerHTML = estado.itens.map((item) => `
    <section class="cd-grupo" data-cd-grupo="${esc(item.categoria)}" aria-labelledby="cd-cat-${esc(item.categoria)}">
      <h3 class="cd-cat" id="cd-cat-${esc(item.categoria)}">${esc(NOME_CAT[item.categoria] ?? '')}</h3>
      <article class="cd-item">
        <button type="button" class="cd-item-abre" data-cd-abrir="${esc(item.id)}">
          ${prato(item)}
          <span class="cd-item-txt">
            <span class="cd-item-nome">${esc(item.nome)}</span>
            <span class="cd-item-desc">${esc(P.descricao(item))}</span>
            <span class="cd-item-preco rola" data-cd-preco="${esc(item.id)}"></span><span class="so-leitor">. Ver o item</span>
          </span>
        </button>
        ${passo(item, 'lista')}
      </article>
    </section>`).join('')
    + '<p class="cd-fim" data-cd-fim>Fim do cardápio de exemplo: os 4 exemplos oficiais da ficha técnica.</p>';
  medirFim();
}

/** O espaço no fim da lista: a última categoria também consegue chegar no topo (e acender na barra). */
function medirFim() {
  const lista = $('[data-cd-lista]');
  const grupos = $$('[data-cd-grupo]', lista);
  const ultimo = grupos[grupos.length - 1];
  if (!ultimo || !lista.clientHeight) return;
  const nota = $('[data-cd-fim]', lista)?.offsetHeight ?? 0;
  lista.style.setProperty('--cd-fim', `${Gd.sobraNoFim(lista.clientHeight, ultimo.offsetHeight + nota)}px`);
}

// a barra das categorias: a pílula escura fica atrás da categoria que está na tela
const toposDosGrupos = () => $$('[data-cd-grupo]').map((g) => g.offsetTop);
const caixaDaAba = (i) => { const b = $(`[data-cd-aba="${i}"]`); return b ? { x: b.offsetLeft, w: b.offsetWidth, y: b.offsetTop, h: b.offsetHeight } : { x: 0, w: 0, y: 0, h: 0 }; };
let espiaParada = 0; // enquanto a lista rola sozinha até a categoria tocada, a barra não pula de aba em aba

function moverMarca(i, outra = null, t = 0) {
  const m = $('[data-cd-marca]');
  if (!m) return;
  const a = caixaDaAba(i);
  const p = outra === null ? a : Gd.marcaEntre(a, caixaDaAba(outra), t);
  m.style.translate = `${p.x}px ${a.y}px`;
  m.style.width = `${p.w}px`;
  m.style.height = `${a.h}px`;
}

function mostrarAba(i) {
  const abas = $('[data-cd-abas]');
  const b = $(`[data-cd-aba="${i}"]`, abas);
  if (!b || abas.scrollWidth <= abas.clientWidth) return;
  abas.scrollTo({ left: Math.max(0, b.offsetLeft - (abas.clientWidth - b.offsetWidth) / 2), behavior: pedeMenosMovimento() ? 'auto' : 'smooth' });
}

function marcarCategoria(i) {
  estado.categoria = i;
  for (const b of $$('[data-cd-aba]')) {
    if (Number(b.dataset.cdAba) === i) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  }
  moverMarca(i);
  mostrarAba(i);
}

function irParaCategoria(i, { foco = false } = {}) {
  const lista = $('[data-cd-lista]');
  const g = $$('[data-cd-grupo]', lista)[i];
  if (!g) return;
  marcarCategoria(i);
  espiaParada = performance.now() + 750;
  lista.scrollTo({ top: Math.max(0, g.offsetTop - 4), behavior: pedeMenosMovimento() ? 'auto' : 'smooth' });
  if (foco) $(`[data-cd-aba="${i}"]`)?.focus({ preventScroll: true });
}

function aoRolarLista() {
  if (performance.now() < espiaParada) return;
  const i = Gd.categoriaNaTela(toposDosGrupos(), $('[data-cd-lista]').scrollTop);
  if (i !== estado.categoria) marcarCategoria(i);
}

/** Arrastar a lista de lado passa de categoria (a lista e a pílula andam junto com o dedo). */
function ligarDedo(lista) {
  let ini = null;
  let engolir = false;
  const total = P.CATEGORIAS.length;
  const soltar = (dx, vx) => {
    const i = ini;
    ini = null;
    lista.classList.remove('arrastando');
    $('[data-cd-abas]').classList.remove('seguindo');
    lista.style.translate = '';
    if (!i?.andou) return;
    engolir = true;
    setTimeout(() => { engolir = false; }, 0);
    const destino = Gd.destinoDoArrasto({ atual: i.atual, dx, vx, total });
    if (destino !== i.atual) { irParaCategoria(destino); tremerCelular(8); } else moverMarca(i.atual);
  };
  pegar(lista, {
    eixo: 'x',
    aoComecar: ({ ev }) => {
      // com o mouse, o ponteiro preso na lista tiraria o clique dos botões de dentro: a lista solta o ponteiro
      if (ev.pointerType === 'mouse') { try { lista.releasePointerCapture(ev.pointerId); } catch { /* já solto */ } }
      ini = estado.folha ? null : { atual: estado.categoria, mouse: ev.pointerType === 'mouse', lado: null, andou: false };
    },
    aoMover: ({ dx, dy, ev }) => {
      if (!ini) return;
      if (ini.mouse && ev.buttons === 0) { soltar(0, 0); return; } // soltou fora da lista
      if (!ini.lado) {
        if (Math.hypot(dx, dy) < 8) return;
        ini.lado = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (ini.lado !== 'x') return;
      ini.andou = true;
      lista.classList.add('arrastando');
      $('[data-cd-abas]').classList.add('seguindo'); // a pílula anda junto com o dedo, sem atraso
      lista.style.translate = `${Gd.puxarDeLado(dx, { atual: ini.atual, total })}px 0px`;
      moverMarca(ini.atual, Gd.limitar(ini.atual + (dx < 0 ? 1 : -1), 0, total - 1), Math.abs(dx) / 140);
    },
    aoSoltar: ({ dx, vx, cancelou }) => soltar(cancelou ? 0 : dx, vx),
  });
  // o clique que vem depois de arrastar não abre o item nem põe no pedido
  lista.addEventListener('click', (ev) => { if (engolir) { engolir = false; ev.stopPropagation(); ev.preventDefault(); } }, true);
  lista.addEventListener('scroll', aoRolarLista, { passive: true });
}

// ---------- o pedido ----------

const falar = (t) => { const el = $('[data-cd-falar]'); if (el) el.textContent = t; };

function atualizarPedido({ animar = true } = {}) {
  const qtd = P.quantidade(estado.pedido);
  const total = P.total(estado.pedido, estado.itens, estado.usarFicha);
  for (const el of $$('[data-cd-lista] [data-cd-passo]')) {
    const q = estado.pedido[el.dataset.cdPasso] ?? 0;
    el.dataset.qtd = String(q);
    el.querySelector('.num').textContent = q;
  }
  const sacola = $('[data-cd-abrir-pedido]');
  const vazio = qtd === 0;
  sacola.dataset.vazio = vazio ? 'sim' : 'nao';
  sacola.tabIndex = vazio ? -1 : 0;
  sacola.setAttribute('aria-hidden', String(vazio));
  sacola.setAttribute('aria-label', `Ver pedido: ${plural(qtd, 'item', 'itens')}, ${reais(total)}`);
  animarNumero($('[data-cd-qtd]'), qtd, { ms: animar ? 360 : 0 });
  escreverPreco($('[data-cd-total]'), total, { animar });
  if (estado.folha === 'pedido') desenharFolhaPedido();
  return { qtd, total };
}

function pularSacola() {
  const b = $('[data-cd-abrir-pedido]');
  b.classList.remove('pulou');
  void b.offsetWidth;
  b.classList.add('pulou');
}

/** O lugar da bolinha da sacola sem o transform (com o pedido vazio, a sacola ainda está subindo). */
function lugarDaSacola() {
  const tela = $('[data-cd-tela]').getBoundingClientRect();
  const sacola = $('[data-cd-abrir-pedido]');
  const bola = $('[data-cd-qtd]');
  return { left: tela.left + sacola.offsetLeft + bola.offsetLeft, top: tela.top + sacola.offsetTop + bola.offsetTop, width: bola.offsetWidth, height: bola.offsetHeight };
}

/** A cópia do item voa do lugar dele até a sacola (FLIP); quando chega, a sacola pula. */
function voarPraSacola(de, item) {
  if (pedeMenosMovimento() || !Gd.vale(de)) { pularSacola(); return; }
  const tela = $('[data-cd-tela]');
  const t = tela.getBoundingClientRect();
  const para = lugarDaSacola();
  const copia = document.createElement('span');
  copia.className = 'cd-voo';
  copia.setAttribute('aria-hidden', 'true');
  copia.innerHTML = prato(item);
  copia.style.cssText = `left:${para.left - t.left}px;top:${para.top - t.top}px;width:${para.width}px;height:${para.height}px`;
  tela.append(copia);
  const voo = copia.animate(Gd.quadrosDoVoo(de, para), { duration: 640, easing: 'cubic-bezier(.45, .05, .4, 1)' });
  voo.onfinish = () => { copia.remove(); pularSacola(); };
  voo.oncancel = () => copia.remove();
}

function por(id, botao) {
  const item = itemPor(id);
  if (!item) return;
  const antes = estado.pedido[id] ?? 0;
  estado.pedido = P.adicionar(estado.pedido, id);
  estado.fechado = false;
  const { qtd, total } = manterFoco(() => atualizarPedido());
  const subiu = estado.pedido[id] !== antes;
  if (subiu && botao?.dataset.onde === 'lista') {
    const tile = botao.closest('.cd-item')?.querySelector('.cd-prato');
    voarPraSacola(tile?.getBoundingClientRect(), item);
  } else pularSacola();
  if (subiu) tremerCelular(8);
  falar(subiu
    ? `${item.nome}: ${estado.pedido[id]} no pedido. Pedido com ${plural(qtd, 'item', 'itens')}, ${reais(total)}.`
    : `O máximo é ${P.QTD_MAX} de cada item na demonstração.`);
}

function tirarUm(id, botao) {
  const item = itemPor(id);
  if (!item) return;
  estado.pedido = P.tirar(estado.pedido, id);
  estado.fechado = false;
  const { qtd, total } = manterFoco(() => atualizarPedido());
  // o "−" some quando o item sai do pedido: o foco vai para o "+" do mesmo item
  if (botao && document.contains(botao) && botao.offsetParent === null) botao.parentElement.querySelector('.mais')?.focus({ preventScroll: true });
  falar(`${item.nome}: ${estado.pedido[id] ?? 0} no pedido. ${qtd ? `Pedido com ${plural(qtd, 'item', 'itens')}, ${reais(total)}.` : 'O pedido está vazio.'}`);
}

/** Redesenhar uma folha sem perder o foco de quem usa o teclado (o mesmo botão volta a ter o foco). */
function manterFoco(fn) {
  const ativo = document.activeElement;
  const folha = ativo?.closest?.('[data-cd-folha]');
  const chave = folha ? ['cdPor', 'cdTirar'].find((k) => k in ativo.dataset) : null;
  const id = chave ? ativo.dataset[chave] : null;
  const volta = fn();
  if (folha && document.contains(folha) && !document.contains(ativo)) {
    const attr = chave === 'cdPor' ? 'data-cd-por' : 'data-cd-tirar';
    const novo = (chave && folha.querySelector(`[${attr}="${CSS.escape(id)}"]`)) || folha.querySelector('[data-cd-por], [data-cd-fechar]');
    novo?.focus({ preventScroll: true });
  }
  return volta;
}

// ---------- as folhas (o item e o pedido): o item cresce do cartão; as duas fecham arrastando pra baixo ----------

function abrirFolha(nome, origem) {
  estado.folha = nome;
  estado.voltar = origem ?? document.activeElement;
  for (const f of $$('[data-cd-folha]')) {
    const aberta = f.dataset.cdFolha === nome;
    f.classList.toggle('aberta', aberta);
    f.setAttribute('aria-hidden', String(!aberta));
    f.inert = !aberta;
  }
  $('.cd-veu').classList.add('aberto');
  $('[data-cd-fundo]').inert = true;
  const folha = $(`[data-cd-folha="${nome}"]`);
  folha.scrollTop = 0;
  requestAnimationFrame(() => folha.querySelector('[data-cd-fechar]')?.focus({ preventScroll: true }));
}

function fecharFolha() {
  if (!estado.folha) return;
  estado.folha = null;
  for (const f of $$('[data-cd-folha]')) {
    for (const a of f.getAnimations?.() ?? []) a.cancel();
    f.classList.remove('aberta', 'cresce');
    f.setAttribute('aria-hidden', 'true');
    f.inert = true;
  }
  $('.cd-veu').classList.remove('aberto');
  $('[data-cd-fundo]').inert = false;
  const volta = estado.voltar;
  estado.voltar = null;
  // o foco volta para quem abriu; se ele sumiu (a sacola some com o pedido vazio), vai para o 1º item do cardápio
  const daPraFocar = (el) => el && document.contains(el) && el.offsetParent !== null && el.tabIndex >= 0 && getComputedStyle(el).visibility !== 'hidden';
  const destino = daPraFocar(volta) ? volta : $('[data-cd-lista] [data-cd-abrir]');
  destino?.focus({ preventScroll: true });
}

/** A alça da folha (o topo dela): arrastar pra baixo fecha; pouco, ela volta. O resto da folha continua rolando. */
function ligarAlca(folha) {
  const alca = $('[data-cd-puxa]', folha);
  if (!alca || alca.dataset.ligada) return;
  alca.dataset.ligada = '1';
  let ini = null;
  const veu = $('.cd-veu');
  pegar(alca, {
    eixo: 'y',
    aoComecar: ({ ev }) => {
      // o ✕ fica na alça: com o mouse, o ponteiro preso tiraria o clique dele
      if (ev.pointerType === 'mouse' && ev.target.closest?.('button')) { try { alca.releasePointerCapture(ev.pointerId); } catch { /* já solto */ } ini = null; return; }
      ini = { altura: folha.offsetHeight, andou: false };
    },
    aoMover: ({ dy }) => {
      if (!ini) return;
      if (!ini.andou && Math.abs(dy) < 6) return;
      ini.andou = true;
      for (const a of folha.getAnimations?.() ?? []) a.finish();
      folha.classList.add('puxando');
      folha.style.transform = `translateY(${Gd.puxarFolha(dy)}px)`;
      veu.style.opacity = String(Gd.limitar(1 - Math.max(0, dy) / ini.altura, 0, 1));
    },
    aoSoltar: ({ dy, vy, cancelou }) => {
      const i = ini;
      ini = null;
      if (!i?.andou) return;
      folha.classList.remove('puxando');
      folha.style.transform = '';
      veu.style.opacity = '';
      if (!cancelou && Gd.fechaAoSoltar({ dy, vy, altura: i.altura })) { fecharFolha(); tremerCelular(8); }
    },
  });
}

/** O item abre grande: a folha cresce do cartão do item, e o prato pequeno vira o prato grande. */
function crescerDoCartao(folha, origem) {
  if (pedeMenosMovimento() || !origem || typeof folha.animate !== 'function') return;
  const cartao = origem.closest('.cd-item')?.getBoundingClientRect();
  const pequeno = origem.querySelector('.cd-prato')?.getBoundingClientRect();
  const grande = $('[data-cd-prato-grande]', folha);
  if (!Gd.vale(cartao)) return;
  folha.classList.add('cresce');
  const f = folha.getBoundingClientRect();
  const { dy, recorte } = Gd.folhaDoCartao(cartao, f);
  const opcoes = { duration: 460, easing: SUAVE };
  folha.animate([{ transform: `translateY(${dy}px)`, clipPath: recorte }, { transform: 'none', clipPath: 'inset(0px 0px 0px 0px round 28px 28px 0px 0px)' }], opcoes)
    .onfinish = () => folha.classList.remove('cresce');
  if (grande && Gd.vale(pequeno)) {
    const p = Gd.pratoDoCartao(pequeno, grande.getBoundingClientRect(), dy);
    grande.animate([{ transform: p.transform, clipPath: p.recorte }, { transform: 'none', clipPath: 'inset(0px 0px 0px 0px round 20px)' }], opcoes);
  }
  for (const el of $$('.cd-folha-nome, .cd-folha-preco, .cd-folha-rot, .cd-folha-ingr, .cd-folha-pe, .cd-folha-negocio', folha)) {
    el.animate([{ opacity: 0, translate: '0px 10px' }, { opacity: 0, translate: '0px 10px', offset: 0.35 }, { opacity: 1, translate: '0px 0px' }], opcoes);
  }
}

function desenharFolhaItem() {
  const item = itemPor(estado.item);
  if (!item) return;
  const folha = $('[data-cd-folha="item"]');
  folha.innerHTML = `
    <div class="cd-folha-puxa" data-cd-puxa>
      <div class="cd-folha-topo">
        <p class="cd-folha-negocio">${esc(item.negocio)} ${seloExemplo(item)}</p>
        <button type="button" class="cd-fechar" data-cd-fechar aria-label="Fechar">${FECHAR}</button>
      </div>
      ${prato(item, true)}
      <h3 class="cd-folha-nome" id="cd-item-nome">${esc(item.nome)}</h3>
      <p class="cd-folha-preco rola" data-cd-folha-preco></p>
    </div>
    <p class="cd-folha-rot">O que vai <small>· da ficha técnica</small></p>
    <ul class="cd-folha-ingr">${item.ingredientes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    <div class="cd-folha-pe">
      <div class="cd-passo" data-qtd="${estado.qtdFolha}">
        <button type="button" class="menos" data-cd-folha-menos aria-label="Menos 1">${MENOS}</button>
        <span class="num" data-cd-folha-num>${estado.qtdFolha}</span>
        <button type="button" class="mais" data-cd-folha-mais aria-label="Mais 1">${MAIS}</button>
      </div>
      <button type="button" class="cd-adicionar" data-cd-adicionar>Adicionar <span class="rola" data-cd-folha-total></span></button>
    </div>`;
  ligarAlca(folha);
  atualizarFolhaItem({ animar: false });
}

function atualizarFolhaItem({ animar = true } = {}) {
  const item = itemPor(estado.item);
  if (!item) return;
  const folha = $('[data-cd-folha="item"]');
  escreverPreco($('[data-cd-folha-preco]', folha), precoDe(item), { animar });
  escreverPreco($('[data-cd-folha-total]', folha), precoDe(item) * estado.qtdFolha, { animar });
  $('[data-cd-folha-num]', folha).textContent = estado.qtdFolha;
  $('[data-cd-folha-menos]', folha).disabled = estado.qtdFolha <= 1;
  $('[data-cd-folha-mais]', folha).disabled = estado.qtdFolha >= P.QTD_MAX;
}

function abrirItem(id, origem) {
  estado.item = id;
  estado.qtdFolha = 1;
  desenharFolhaItem();
  abrirFolha('item', origem);
  crescerDoCartao($('[data-cd-folha="item"]'), origem);
}

function mudarQtdFolha(d) {
  estado.qtdFolha = Math.min(Math.max(estado.qtdFolha + d, 1), P.QTD_MAX);
  atualizarFolhaItem();
}

function adicionarDaFolha() {
  const item = itemPor(estado.item);
  if (!item) return;
  const de = $('[data-cd-folha="item"] [data-cd-prato-grande]')?.getBoundingClientRect();
  estado.pedido = P.adicionar(estado.pedido, item.id, estado.qtdFolha);
  estado.fechado = false;
  const n = estado.qtdFolha;
  fecharFolha();
  const { qtd, total } = atualizarPedido();
  voarPraSacola(de, item); // o prato grande voa pra sacola enquanto a folha desce
  tremerCelular(8);
  falar(`${plural(n, 'unidade', 'unidades')} de ${item.nome} no pedido. Pedido com ${plural(qtd, 'item', 'itens')}, ${reais(total)}.`);
}

function desenharFolhaPedido() {
  const r = P.resumoDoPedido(estado.pedido, estado.itens, estado.usarFicha);
  if (!r.linhas.length) estado.fechado = false;
  const folha = $('[data-cd-folha="pedido"]');
  const topo = `<div class="cd-folha-puxa" data-cd-puxa><div class="cd-folha-topo">
      <h3 id="cd-pedido-tit">${estado.fechado ? 'Pedido fechado' : 'Seu pedido'}</h3>
      <button type="button" class="cd-fechar" data-cd-fechar aria-label="Fechar">${FECHAR}</button>
    </div></div>`;
  let corpo;
  if (!r.linhas.length) {
    corpo = `<p class="cd-vazio">O pedido está vazio.</p>
    <button type="button" class="cd-voltar" data-cd-fechar>Ver o cardápio</button>`;
  } else if (estado.fechado) {
    corpo = `<div class="cd-recibo" data-cd-recibo>
      <span class="cd-recibo-ok" aria-hidden="true">${OK}</span>
      <ul class="cd-recibo-linhas">${r.linhas.map((l) => `<li><span>${l.qtd}× ${esc(l.nome)}</span><b>${dinheiro(l.subtotal_c)}</b></li>`).join('')}</ul>
      <p class="cd-total"><span>Total · ${plural(r.qtd, 'item', 'itens')}</span><b>${dinheiro(r.total_c)}</b></p>
    </div>
    <button type="button" class="cd-whats" disabled aria-describedby="cd-aviso-previa">${CONVERSA}Pedir no WhatsApp</button>
    <p class="cd-aviso-previa" id="cd-aviso-previa">${INFO}Na prévia, não manda nada.</p>
    <div class="cd-recibo-botoes">
      <button type="button" class="cd-limpar" data-cd-mexer>Mexer no pedido</button>
      <button type="button" class="cd-limpar" data-cd-limpar>Começar outro</button>
    </div>`;
  } else {
    corpo = `<ul class="cd-linhas">${r.linhas.map((l) => `
      <li class="cd-linha">
        <span class="cd-linha-nome">${esc(l.nome)}</span>
        <span class="cd-linha-conta">${dinheiro(l.preco_c)} cada · <b>${dinheiro(l.subtotal_c)}</b></span>
        ${passo(itemPor(l.id), 'pedido')}
      </li>`).join('')}
    </ul>
    <p class="cd-total"><span>Total</span><b>${dinheiro(r.total_c)}</b></p>
    <button type="button" class="cd-fechar-pedido" data-cd-fecha-pedido>${OK}Fechar o pedido</button>
    <button type="button" class="cd-limpar" data-cd-limpar>Limpar o pedido</button>`;
  }
  folha.innerHTML = topo + corpo;
  ligarAlca(folha);
}

function abrirPedido(origem) {
  desenharFolhaPedido();
  abrirFolha('pedido', origem);
}

/** O "deu certo" do cardápio: o pedido fecha, estoura, e o WhatsApp continua desligado (na prévia, não manda nada). */
function fecharPedido() {
  const r = P.resumoDoPedido(estado.pedido, estado.itens, estado.usarFicha);
  if (!r.linhas.length) return;
  estado.fechado = true;
  desenharFolhaPedido();
  const folha = $('[data-cd-folha="pedido"]');
  estourarEm($('.cd-recibo-ok', folha), { quantos: 22, raio: 90 });
  tremerCelular(18);
  $('[data-cd-mexer]', folha)?.focus({ preventScroll: true });
  falar(`Pedido fechado: ${plural(r.qtd, 'item', 'itens')}, ${reais(r.total_c)}. Na prévia, não manda nada.`);
}

function mexerNoPedido() {
  estado.fechado = false;
  desenharFolhaPedido();
  $('[data-cd-folha="pedido"] [data-cd-fecha-pedido]')?.focus({ preventScroll: true });
}

function limpar() {
  estado.pedido = {};
  estado.fechado = false;
  atualizarPedido();
  $('[data-cd-folha="pedido"] [data-cd-fechar]')?.focus({ preventScroll: true });
  falar('O pedido está vazio.');
}

// ---------- o seu lado: a simulação, a chave e o seu preço × o da ficha ----------

function desenharComparar({ primeira = false } = {}) {
  const itens = estado.itens;
  const sobem = itens.filter((i) => i.ficha.motivo === 'sobe').length;
  const perdem = itens.filter((i) => P.daPrejuizo(i.hoje));
  const comSubida = estado.subiu > 0 ? `Com tudo <b>${pctTxt(estado.subiu)}</b> mais caro, ` : 'Com o que você compra hoje, ';
  let resumo;
  if (!sobem) {
    resumo = `${comSubida}os ${itens.length} preços já deixam mais que a média do ramo: a ficha não mexe em nenhum.${estado.subiu ? '' : ' Arraste o <b>1</b> e veja o que muda.'}`;
  } else if (perdem.length && !estado.usarFicha) {
    const quem = perdem.length === 1 ? `o <b>${esc(perdem[0].nome)}</b> ${perdem[0].hoje.sinal.txt.toLowerCase()}` : `<b>${perdem.length} dos ${itens.length}</b> itens ficam no vermelho`;
    resumo = `${comSubida}${quem} com o seu preço. Ligue o <b>2</b>: a ficha põe o preço que deixa sobra.`;
  } else if (!estado.usarFicha) {
    resumo = `${comSubida}a ficha sobe <b>${sobem} dos ${itens.length}</b> preços. O cardápio ainda está com o seu preço: ligue o <b>2</b>.`;
  } else {
    resumo = `${comSubida}a ficha subiu <b>${sobem} dos ${itens.length}</b> preços no cardápio. Os outros ficam como estão.`;
  }
  const el = $('[data-cd-resumo]');
  if (el.innerHTML !== resumo) el.innerHTML = resumo;

  const html = itens.map((item) => {
    const h = item.hoje;
    const f = item.ficha;
    const hojeAtivo = !estado.usarFicha;
    const perde = P.daPrejuizo(h);
    const acendeAgora = perde && !estado.prejuizos.has(item.id) && !primeira; // entrou no prejuízo agora: acende uma vez
    const acende = estado.trocou ? ' trocou' : '';
    const noCardapio = '<span class="cd-no-cardapio">no cardápio</span>';
    const pill = (s) => `<span class="pill ${s.cls}"><i></i>${s.txt}</span>`;
    const fica = f.motivo === 'sem-conta'
      ? `fica o seu: ${esc(f.aviso)}`
      : f.acima ? 'já deixa mais que a média do ramo' : 'já está no topo da média do ramo';
    const ladoFicha = f.motivo === 'sobe'
      ? `<span class="cd-comp-linha"><b class="cd-comp-preco"${rola(`${item.id}-ficha-preco`, f.preco_c)}>${dinheiro(f.preco_c)}</b>${pill(f.sinal)}</span>
         <span class="cd-comp-sobra"${rola(`${item.id}-ficha-sobra`, f.sobra_c)}>${sobraTxt(f.sobra_c)}</span>
         <span class="cd-comp-sobe"${rola(`${item.id}-ficha-sobe`, f.preco_c - h.preco_c)}>sobe ${dinheiro(f.preco_c - h.preco_c)}</span>`
      : `<span class="cd-comp-linha"><b class="cd-comp-preco"${rola(`${item.id}-ficha-preco`, f.preco_c)}>${dinheiro(f.preco_c)}</b><span class="cd-comp-fica">${OK}fica o seu</span></span>
         <span class="cd-comp-sobra">${fica}</span>`;
    return `<li class="cd-comp${perde ? ' prejuizo' : ''}${acendeAgora ? ' acende' : ''}" data-motivo="${f.motivo}">
      <p class="cd-comp-nome"><b>${esc(item.nome)}</b><small>${esc(item.negocio)}</small></p>
      <div class="cd-comp-lado hoje${hojeAtivo ? ` ativo${acende}` : ''}">
        ${hojeAtivo ? noCardapio : ''}
        <span class="cd-comp-rot">Seu preço</span>
        <span class="cd-comp-linha"><b class="cd-comp-preco"${rola(`${item.id}-hoje-preco`, h.preco_c)}>${dinheiro(h.preco_c)}</b>${pill(h.sinal)}</span>
        <span class="cd-comp-sobra"${rola(`${item.id}-hoje-sobra`, h.sobra_c)}>${sobraTxt(h.sobra_c)}</span>
      </div>
      <span class="cd-comp-seta" aria-hidden="true">→</span>
      <div class="cd-comp-lado ficha${hojeAtivo ? '' : ` ativo${acende}`}">
        ${hojeAtivo ? '' : noCardapio}
        <span class="cd-comp-rot">${perde && f.motivo === 'sobe' ? 'Precisaria custar' : 'Na ficha'}</span>
        ${ladoFicha}
      </div>
    </li>`;
  }).join('');
  const lista = $('[data-cd-comparar]');
  if (primeira) lista.innerHTML = html;
  else trocarConteudo(lista, html, { ms: 420 });
  estado.prejuizos = new Set(perdem.map((i) => i.id));
  estado.trocou = false;
}

function escreverAgora() {
  const sobem = estado.itens.filter((i) => i.ficha.motivo === 'sobe').length;
  const perde = estado.itens.find((i) => P.daPrejuizo(i.hoje) && P.precisaCustar(i) !== null);
  let t;
  if (estado.usarFicha) t = `No cardápio agora: <b>o preço da ficha</b>${sobem ? ` (${plural(sobem, 'preço subiu', 'preços subiram')})` : ' (nenhum precisou subir)'}.`;
  else if (perde) t = `No cardápio agora: <b>o seu preço</b>. Com a ficha, o ${esc(perde.nome)} iria pra <b>${dinheiro(P.precisaCustar(perde))}</b>.`;
  else t = 'No cardápio agora: <b>o seu preço</b>.';
  const el = $('[data-cd-agora]');
  if (el.innerHTML !== t) el.innerHTML = t;
}

function atualizar({ animar = true, varrer = false, primeira = false } = {}) {
  estado.itens.forEach((item, i) => escreverPreco($(`[data-cd-preco="${CSS.escape(item.id)}"]`), precoDe(item), { animar, atraso: varrer ? i * 110 : 0 }));
  atualizarPedido({ animar });
  if (estado.folha === 'item') atualizarFolhaItem({ animar });
  desenharComparar({ primeira });
  escreverAgora();
}

function trocarChave() {
  estado.usarFicha = !estado.usarFicha;
  $('[data-cd-chave]').setAttribute('aria-checked', String(estado.usarFicha));
  estado.trocou = true;
  atualizar({ varrer: true });
  tremerCelular(10);
  const tela = $('[data-cd-tela]');
  if (!pedeMenosMovimento()) {
    tela.classList.remove('varre');
    void tela.offsetWidth;
    tela.classList.add('varre');
  }
}

function mudarSubida(valor) {
  const regua = $('[data-cd-subiu]');
  estado.subiu = P.subidaValida(Number(valor) / 100);
  estado.itens = P.montarCardapio(EXEMPLOS, estado.tab, { subiu: estado.subiu });
  const texto = pctTxt(estado.subiu);
  regua.style.setProperty('--pct', `${(Number(regua.value) / Number(regua.max || 100)) * 100}%`);
  regua.setAttribute('aria-valuetext', texto);
  $('[data-cd-subiu-txt]').textContent = texto;
  atualizar();
}

// ---------- ligar tudo ----------

function ligarEventos(raiz) {
  raiz.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('button, [data-cd-fechar]');
    if (!alvo || !raiz.contains(alvo)) return;
    const d = alvo.dataset;
    if (d.cdAba !== undefined) irParaCategoria(Number(d.cdAba));
    else if (d.cdAbrir) abrirItem(d.cdAbrir, alvo);
    else if (d.cdPor) por(d.cdPor, alvo);
    else if (d.cdTirar) tirarUm(d.cdTirar, alvo);
    else if ('cdAbrirPedido' in d) abrirPedido(alvo);
    else if ('cdFechar' in d) fecharFolha();
    else if ('cdFolhaMais' in d) mudarQtdFolha(1);
    else if ('cdFolhaMenos' in d) mudarQtdFolha(-1);
    else if ('cdAdicionar' in d) adicionarDaFolha();
    else if ('cdFechaPedido' in d) fecharPedido();
    else if ('cdMexer' in d) mexerNoPedido();
    else if ('cdLimpar' in d) limpar();
    else if ('cdChave' in d) trocarChave();
  });
  $('[data-cd-subiu]', raiz).addEventListener('input', (ev) => { ev.target.classList.remove('chama'); mudarSubida(ev.target.value); });
  const abas = $('[data-cd-abas]', raiz);
  // com o mouse, a rodinha também passa as categorias para o lado (até a ponta; depois a página rola normal)
  abas.addEventListener('wheel', (ev) => {
    if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;
    const fim = abas.scrollWidth - abas.clientWidth;
    if (fim <= 0 || (ev.deltaY < 0 && abas.scrollLeft <= 0) || (ev.deltaY > 0 && abas.scrollLeft >= fim - 1)) return;
    abas.scrollLeft += ev.deltaY;
    ev.preventDefault();
  }, { passive: false });
  // pelo teclado: as setas passam de categoria (como o dedo de lado)
  abas.addEventListener('keydown', (ev) => {
    const anda = { ArrowRight: 1, ArrowLeft: -1 }[ev.key];
    let i = null;
    if (anda) i = Gd.limitar(estado.categoria + anda, 0, P.CATEGORIAS.length - 1);
    if (ev.key === 'Home') i = 0;
    if (ev.key === 'End') i = P.CATEGORIAS.length - 1;
    if (i === null) return;
    ev.preventDefault();
    irParaCategoria(i, { foco: true });
  });
  $('[data-cd-tela]', raiz).addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && estado.folha) { ev.preventDefault(); fecharFolha(); }
  });
  const lista = $('[data-cd-lista]', raiz);
  ligarDedo(lista);
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { medirFim(); moverMarca(estado.categoria); }).observe(lista);
}

async function iniciar() {
  const raiz = $('[data-cd]');
  if (!raiz) return;
  const lista = $('[data-cd-lista]', raiz);
  // o que o leitor de tela fala quando o pedido muda
  const voz = document.createElement('p');
  voz.className = 'so-leitor';
  voz.setAttribute('aria-live', 'polite');
  voz.dataset.cdFalar = '';
  $('[data-cd-tela]', raiz).append(voz);
  for (const f of $$('[data-cd-folha]', raiz)) f.inert = true;
  try {
    estado.tab = await carregarTabelas();
    estado.itens = P.montarCardapio(EXEMPLOS, estado.tab, { subiu: estado.subiu });
    const regua = $('[data-cd-subiu]', raiz);
    regua.value = '0'; // o navegador pode lembrar a régua de antes: a demonstração sempre começa do zero
    regua.setAttribute('aria-valuetext', pctTxt(0));
    desenharAbas();
    desenharLista();
    atualizar({ animar: false, primeira: true });
    moverMarca(0);
    lista.setAttribute('aria-busy', 'false');
    ligarEventos(raiz);
    ligarVidro(document);
  } catch (e) {
    lista.setAttribute('aria-busy', 'false');
    lista.textContent = `Não deu para montar o cardápio (${e.message}).`;
  }
}

if (typeof document !== 'undefined') iniciar();
