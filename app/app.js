// A TELA DO USUÁRIO DO PINE COST PRO (prévia, v3 de 07/11/2026). É PROTÓTIPO: sem login, sem gravar nada (nem no navegador)
// e sem mandar nada para lugar nenhum. Tudo fica na memória da aba e some quando ela fecha (ou quando recarrega).
// Pedido do Andrews: a ficha técnica dentro de uma empresa, com as camadas (o molho que vai na pizza), o meio a meio e a
// lista de compras. E na v3: "eu quero que a interface seja altamente interativa". A ordem guiada, uma rota por passo:
//   #despensa        1. o que se compra; "e se o preço mudar?" desce pelas camadas até o cardápio e a semana
//   #receitas        2. as receitas da casa: uma pode ir dentro da outra (arraste da despensa ou "+ adicionar")
//   #cardapio        3. a base da pizza, os sabores, os adicionais e as contas da loja
//   #cardapio/<id>      a ficha de 1 produto: o cupom da ficha V2, o preço que se arrasta e a pizza por dentro (o anel)
//   #meio            4. o meio a meio: a pizza que gira, tocar numa metade troca o sabor, e as 2 regras de preço
//   #compras         5. o plano da semana e a lista de compras viva (o "comprei" põe no estoque)
//   #loja               (camadas a fundo) as contas da loja em reais: o % de verdade que entra em todas as fichas
//   #ferramentas        os outros produtos (o menu do celular)
// As camadas a fundo (07/11 à tarde): o aproveitamento de cada insumo (a faixa "e se aproveitar mais?" desce pelas camadas),
// a perda no preparo das receitas da casa (a faixa muda o quanto rende), a pizza em broto, média e grande (o desenho cresce
// e os números rolam), a pizza com a borda e os adicionais, e as contas da loja.
// As rotas de antes continuam abrindo: #fichas e #nova (o cardápio), #ficha/x-bacon e #nova/exemplo (o exemplo oficial).
// Atalhos: ⌘K, Ctrl+K ou / abrem a busca; 1 a 5 trocam de passo (fora de campo de texto).
// A conta sai sempre de ../comum/cozinha.js, em cima da calculadora de verdade. Os dados de exemplo vão marcados "exemplo".
import * as C from '../comum/cozinha.js';
import { carregarTabelas, esc, reais } from '../comum/ficha.js';
import { COZINHAS } from '../comum/exemplos-cozinha.js';
import { ligarVidro } from '../comum/vidro.js';
import { trocarConteudo, trocarVista, estourarEm, vibrar, pedeMenosMovimento, temMouse } from '../comum/interacao.js';
import * as T from './telas.js';
import * as V from './vivo.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const copia = (x) => JSON.parse(JSON.stringify(x));
const sel = (v) => CSS.escape(String(v));

const VAZIA = () => ({
  exemplo: false, negocio: 'Minha cozinha', loja: { regime: 'mei', faturamento_mes: '', custos_fixos: [], maquininha_taxa: '', maquininha_parte: '' },
  despensa: [], receitas: [], bases: [], cardapio: [], adicionais: [], tamanhos: [], meio_a_meio: { sabores: [], regra: 'mais_caro' }, plano: [],
});

const estado = {
  tab: null, // as tabelas da calculadora
  cozinha: 'pizzaria',
  dados: null, // a cozinha que está na tela (uma cópia: o exemplo original nunca muda)
  calc: null, // a conta de tudo, refeita a cada tecla
  rota: { vista: 'despensa' },
  completa: true, // a ficha: o pacote completo (com o preço certo) ou a grátis
  garantirMinimo: false, // a lista de compras: só o que falta ou também o que deixa o estoque no mínimo
  comprados: new Map(), // o "comprei" da lista: id → { pacotes, custo_c, antes (o estoque de antes, para desfazer) }
  simula: new Map(), // "e se o preço mudar?": id → { hoje (o preço de hoje), pct (de −50 a +100) }
  filtro: 'todos', // a despensa: tudo, uma categoria ou o que está abaixo do mínimo
  aberto: null, // a despensa: o insumo com o "mexer no preço" aberto
  editando: null, // a despensa no celular: o insumo aberto para mudar
  abrirTudo: false, // a árvore: abrir até a última camada
  alternados: new Set(), // a árvore: o que a pessoa abriu ou fechou à mão
  focoAnel: new Map(), // a pizza por dentro: a receita aberta no anel de cada produto
  giroPizza: 0, // o meio a meio: quanto a pizza está girada (graus)
  pegaAberto: null, // as receitas: a lista com o "+ adicionar" aberto
  linhaNova: null, // a linha que acabou de entrar (acende)
  editorAberto: false,
  lojaAberta: false,
  jaTemAberto: false,
  selecionar: false,
  depois: null, // o que fazer quando a tela nova terminar de desenhar (a busca leva até o item)
  // (camadas a fundo)
  simulaAprov: new Map(), // "e se aproveitar mais?": id → { hoje (o aproveitamento de antes de mexer na faixa) }
  tamanho: null, // o tamanho na tela: a broto, a média ou a grande (vale no cardápio, no produto e no meio a meio)
  adicionaisLigados: new Set(), // a pizza com a borda: os adicionais ligados na ficha do produto
  tamEditorAberto: false,
};

// ---------- a cozinha ----------

function sabores(d) {
  const [a, b] = d.meio_a_meio.sabores;
  const pizza = (id) => d.cardapio.find((p) => p.id === id && p.base);
  if (pizza(a) && pizza(b) && a !== b) return;
  for (const p of d.cardapio.filter((x) => x.base)) {
    const par = d.cardapio.find((x) => x.base === p.base && x.id !== p.id);
    if (par) { d.meio_a_meio.sabores = [p.id, par.id]; return; }
  }
  d.meio_a_meio.sabores = [];
}

/** Deixa a cozinha pronta para a tela: as listas existem, e o plano tem 1 linha por produto (e os meio a meio). */
function arrumar(d) {
  d.loja = d.loja ?? {};
  d.loja.custos_fixos = Array.isArray(d.loja.custos_fixos) ? d.loja.custos_fixos : [];
  // (camadas a fundo) as contas que toda loja tem já aparecem, vazias (a vazia não conta: a ficha fica com a média do ramo)
  if (!d.loja.custos_fixos.length) d.loja.custos_fixos = T.CONTAS_DA_LOJA.map((nome) => ({ nome, por_mes: '' }));
  for (const k of ['despensa', 'receitas', 'bases', 'cardapio', 'adicionais', 'plano', 'tamanhos']) d[k] = Array.isArray(d[k]) ? d[k] : [];
  for (const r of d.receitas) r.itens = r.itens ?? [];
  for (const b of d.bases) { b.itens = b.itens ?? []; b.embalagem = b.embalagem ?? []; }
  for (const t of d.tamanhos) t.embalagem = Array.isArray(t.embalagem) ? t.embalagem : [];
  for (const p of [...d.cardapio, ...d.adicionais]) { p.itens = p.itens ?? []; p.embalagem = p.embalagem ?? []; p.precos = p.precos ?? {}; }
  // (camadas a fundo) cada sabor e cada adicional tem o lugar do preço de cada tamanho (o da receita fica em precos)
  const ref = T.tamanhoDaReceita(d);
  if (ref) {
    for (const p of [...d.cardapio.filter((x) => x.base), ...d.adicionais]) {
      p.precos_tamanho = p.precos_tamanho ?? {};
      const daReceita = T.tamanhoDaReceitaDe(d, p);
      for (const t of d.tamanhos) if (t.id !== daReceita) p.precos_tamanho[t.id] = p.precos_tamanho[t.id] ?? (d.adicionais.includes(p) ? { balcao: '' } : { balcao: '', app: '' });
    }
  }
  d.meio_a_meio = d.meio_a_meio ?? { regra: 'mais_caro' };
  d.meio_a_meio.sabores = d.meio_a_meio.sabores ?? [];
  sabores(d);
  const existe = (id) => d.cardapio.some((p) => p.id === id);
  const tamanhoExiste = (id) => d.tamanhos.some((t) => t.id === id);
  d.plano = [
    ...d.cardapio.map((p) => d.plano.find((e) => e.produto === p.id && !e.tamanho) ?? { produto: p.id, quantidade: 0 }),
    // (camadas a fundo) a pizza num outro tamanho (a broto de calabresa) fica no plano
    ...d.plano.filter((e) => e.produto && e.tamanho && existe(e.produto) && tamanhoExiste(e.tamanho)),
    ...d.plano.filter((e) => Array.isArray(e.meio) && existe(e.meio[0]) && existe(e.meio[1]) && (!e.tamanho || tamanhoExiste(e.tamanho))),
    ...d.adicionais.map((a) => d.plano.find((e) => e.adicional === a.id && !e.tamanho) ?? { adicional: a.id, quantidade: 0 }),
  ];
  return d;
}

function usarCozinha(id) {
  const c = COZINHAS.find((x) => x.id === id);
  estado.cozinha = c ? id : 'zero';
  estado.dados = arrumar(c ? copia(c.dados) : VAZIA());
  estado.comprados = new Map();
  estado.simula = new Map();
  estado.simulaAprov = new Map();
  estado.adicionaisLigados = new Set();
  estado.tamanho = T.tamanhoDaReceita(estado.dados);
  estado.focoAnel = new Map();
  estado.giroPizza = 0;
  estado.pegaAberto = null;
  estado.linhaNova = null;
  estado.filtro = 'todos';
  // a pizzaria abre com o tomate aberto: mexa no preço dele e veja o molho, a base e as pizzas mudarem
  estado.aberto = estado.dados.despensa.some((i) => i.id === 'tomate') ? 'tomate' : null;
  estado.editando = estado.aberto;
  estado.alternados = new Set();
  for (const s of $$('[data-trocar-cozinha]')) s.value = estado.cozinha;
}

const opcoesCozinha = () => `<optgroup label="O exemplo completo">${COZINHAS.filter((c) => c.id === 'pizzaria').map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</optgroup>`
  + `<optgroup label="Uma ficha só (os exemplos da ferramenta)">${COZINHAS.filter((c) => c.id !== 'pizzaria').map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</optgroup>`
  + '<optgroup label="A sua"><option value="zero">Começar do zero</option></optgroup>';

let contador = 0;
function novoId(prefixo) {
  const d = estado.dados;
  const usados = new Set([...d.despensa, ...d.receitas, ...d.bases, ...d.cardapio, ...d.adicionais].map((x) => x.id));
  let id;
  do { id = `${prefixo}-${++contador}`; } while (usados.has(id));
  return id;
}

/** O lugar nos dados pelo caminho do campo ("despensa.3.preco_pacote"). */
function pegar(caminho) {
  return caminho.split('.').reduce((o, p) => (o == null ? o : o[/^\d+$/.test(p) ? Number(p) : p]), estado.dados);
}
function definir(caminho, valor) {
  const partes = caminho.split('.');
  const dono = pegar(partes.slice(0, -1).join('.'));
  if (dono && typeof dono === 'object') dono[partes.at(-1)] = valor;
}
const todasAsLinhas = (d) => [...d.receitas.flatMap((r) => r.itens), ...d.bases.flatMap((b) => [...b.itens, ...b.embalagem]),
  ...[...d.cardapio, ...d.adicionais].flatMap((p) => [...p.itens, ...p.embalagem])];

// ---------- a conta e as saídas ----------

function recalcular() {
  estado.calc = C.calcularCozinha(estado.dados, estado.tab, { completa: estado.completa, garantirMinimo: estado.garantirMinimo });
}

// o que as saídas vivas pedem de volta para a tela
const contexto = {
  guardarFoco: (id, caminho) => { if (caminho) estado.focoAnel.set(id, caminho); else estado.focoAnel.delete(id); },
  trocarMetade: (lado) => trocarMetade(lado),
};

const ultimo = new WeakMap();
/** Refaz a conta e redesenha as saídas que mudaram (sem tocar nos campos: o cursor fica onde está). Os números rolam. */
function atualizar(so = null, { refazer = true } = {}) {
  if (refazer) recalcular();
  for (const el of $$('[data-saida]')) {
    const nome = el.dataset.saida;
    if (so && !so.includes(nome)) continue;
    const viva = T.VIVAS[nome];
    if (viva) {
      try { viva(el, estado, contexto); } catch (err) { console.error(err); }
      continue;
    }
    const fazer = T.SAIDAS[nome];
    if (!fazer) continue;
    let html;
    try {
      html = fazer(estado, el.dataset);
    } catch (err) {
      console.error(err);
      html = `<p class="erro-linha">Não deu pra mostrar esta parte (${esc(err.message)}).</p>`;
    }
    if (ultimo.get(el) === html) continue;
    const antes = ultimo.has(el);
    ultimo.set(el, html);
    if (antes) trocarConteudo(el, html); else el.innerHTML = html;
  }
}

function chaveDoFoco(el) {
  if (!el || el === document.body || !el.dataset) return null;
  if (el.dataset.e) return `[data-e="${sel(el.dataset.e)}"]`;
  if (el.dataset.faixa) return `[data-faixa="${sel(el.dataset.faixa)}"]`;
  if (el.dataset.simula) return `[data-simula="${sel(el.dataset.simula)}"]`;
  if (el.dataset.aprov) return `[data-aprov="${sel(el.dataset.aprov)}"]`;
  if (el.dataset.perda) return `[data-perda="${sel(el.dataset.perda)}"]`;
  if (el.hasAttribute?.('data-loja-fat')) return '[data-loja-fat]';
  if (el.dataset.planoFaixa) return `[data-plano-faixa="${sel(el.dataset.planoFaixa)}"]`;
  if (el.dataset.acao) {
    return `[data-acao="${sel(el.dataset.acao)}"]${['id', 'lado', 'v', 'i', 'lista', 'j'].map((k) => (el.dataset[k] !== undefined ? `[data-${k}="${sel(el.dataset[k])}"]` : '')).join('')}`;
  }
  return null;
}

const TELAS = { despensa: T.telaDespensa, receitas: T.telaReceitas, cardapio: T.telaCardapio, meio: T.telaMeio, compras: T.telaCompras, loja: T.telaLoja };

/** Desenha o passo da rota (o editor) e as saídas. `rolar` volta para o topo (troca de passo). */
function desenhar({ rolar = false, focar = null } = {}) {
  const r = estado.rota;
  const foco = focar ?? chaveDoFoco(document.activeElement);
  recalcular();
  let html = '';
  if (r.vista === 'produto') {
    html = T.telaProduto(estado, r.id);
    if (html === null) { history.replaceState(null, '', '#cardapio'); estado.rota = { vista: 'cardapio' }; html = T.telaCardapio(estado); }
  } else if (TELAS[r.vista]) html = TELAS[r.vista](estado);
  const tela = $('[data-tela]');
  tela.hidden = r.vista === 'ferramentas';
  $('[data-vista="ferramentas"]').hidden = r.vista !== 'ferramentas';
  tela.innerHTML = html;
  atualizar(null, { refazer: false });
  ligarVidro(document);
  if (r.vista === 'receitas') V.ligarArrastos(tela, { aoSoltar: (id, lista) => porNaLista(lista, id, { arrastou: true }) });
  const passo = r.vista === 'produto' ? 'cardapio' : r.vista;
  for (const a of $$('[data-vai]')) {
    if (a.dataset.vai === passo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  if (rolar) window.scrollTo(0, 0);
  if (foco) {
    const f = $(foco);
    f?.focus({ preventScroll: true });
    if (estado.selecionar && typeof f?.select === 'function') f.select();
  }
  estado.linhaNova = null;
  const depois = estado.depois;
  estado.depois = null;
  depois?.();
}

// ---------- as rotas ----------

const VISTAS = ['despensa', 'receitas', 'cardapio', 'meio', 'compras', 'loja', 'ferramentas'];

function lerRota() {
  const [a, b] = decodeURIComponent(location.hash.replace(/^#/, '')).split('/');
  if (a === 'ficha' || (a === 'nova' && b === 'exemplo')) {
    const id = a === 'nova' ? 'x-bacon' : b;
    if (COZINHAS.some((c) => c.id === id && c.id !== 'pizzaria')) {
      if (estado.cozinha !== id) usarCozinha(id);
      history.replaceState(null, '', `#cardapio/${id}`);
      return { vista: 'produto', id };
    }
    if (estado.dados.cardapio.some((p) => p.id === b)) { history.replaceState(null, '', `#cardapio/${b}`); return { vista: 'produto', id: b }; }
    return { vista: 'cardapio' };
  }
  if (a === 'fichas' || a === 'nova') return { vista: 'cardapio' };
  if (a === 'cardapio' && b) return { vista: 'produto', id: b };
  return { vista: VISTAS.includes(a) ? a : 'despensa' };
}

let jaMostrou = false;
/** Mostra a rota. Trocar de passo (ou de produto) usa a transição de vista do navegador (o kit: trocarVista). */
function mostrar() {
  const antes = estado.rota;
  const nova = lerRota();
  const fazer = () => { estado.rota = nova; arrumar(estado.dados); desenhar({ rolar: true }); };
  const mudou = jaMostrou && (nova.vista !== antes.vista || nova.id !== antes.id);
  jaMostrou = true;
  if (mudou) trocarVista(fazer); else fazer();
}

/** Vai para a rota (e redesenha mesmo se a rota for a mesma de agora). */
function irPara(alvo) {
  if (location.hash === alvo) mostrar(); else location.hash = alvo;
}

function trocarCozinha(id) {
  usarCozinha(id);
  const d = estado.dados;
  irPara(id !== 'pizzaria' && id !== 'zero' && d.cardapio[0] ? `#cardapio/${d.cardapio[0].id}` : '#despensa');
}

// ---------- o aviso com "desfazer" ----------

let avisoTempo = 0;
let desfazerAgora = null;
function fecharAviso() { $('[data-aviso-desfazer]')?.classList.remove('mostra'); desfazerAgora = null; }
function avisar(texto, desfazer = null) {
  const caixa = $('[data-aviso-desfazer]');
  if (!caixa) return;
  caixa.querySelector('[data-aviso-texto]').textContent = texto;
  caixa.querySelector('[data-acao="desfazer"]').hidden = !desfazer;
  desfazerAgora = desfazer;
  caixa.classList.add('mostra');
  clearTimeout(avisoTempo);
  avisoTempo = setTimeout(fecharAviso, desfazer ? 6500 : 3800);
}

// ---------- 1. e se o preço mudar? ----------

const pulsos = new Map();
/** A luz que desce pela cascata (o tomate → o molho → a pizza), no máximo 1 a cada 0,65 s enquanto a pessoa arrasta. */
function pulsar(id) {
  if (pedeMenosMovimento()) return;
  const t = performance.now();
  if (t - (pulsos.get(id) ?? -1e9) < 650) return;
  pulsos.set(id, t);
  const c = $(`[data-cascata="${sel(id)}"]`);
  const ol = c?.querySelector('.ce-camadas');
  if (!ol) return;
  c.style.setProperty('--de', `${ol.offsetTop + 6}px`);
  c.style.setProperty('--ate', `${ol.offsetTop + ol.offsetHeight - 18}px`);
  c.classList.remove('pulsa');
  void c.offsetWidth;
  c.classList.add('pulsa');
}

/** Põe o preço do insumo `pct` % acima (ou abaixo) do preço de hoje, em tudo: a despensa, as receitas, o cardápio, a lista. */
function simular(id, pct, { fim = false } = {}) {
  const d = estado.dados;
  const i = d.despensa.findIndex((x) => x.id === id);
  const ins = d.despensa[i];
  if (!ins) return;
  const s = estado.simula.get(id) ?? { hoje: ins.preco_pacote, pct: 0 };
  let novo;
  try { novo = C.precoSimulado(s.hoje, pct); } catch { return; } // sem preço: nada para simular
  if (pct) { s.pct = pct; estado.simula.set(id, s); ins.preco_pacote = novo; } else { ins.preco_pacote = s.hoje; estado.simula.delete(id); }
  const campo = $(`[data-e="despensa.${i}.preco_pacote"]`);
  if (campo) campo.value = T.dinheiro(ins.preco_pacote);
  const rot = $(`[data-simula-pct="${sel(id)}"]`);
  if (rot) { rot.textContent = T.textoPct(pct); rot.classList.toggle('sobe', pct > 0); rot.classList.toggle('desce', pct < 0); }
  const volta = $(`[data-acao="preco-hoje"][data-id="${sel(id)}"]`);
  if (volta) volta.hidden = !pct;
  const faixa = $(`[data-simula="${sel(id)}"]`);
  if (faixa) {
    if (Number(faixa.value) !== pct) faixa.value = String(pct);
    faixa.setAttribute('aria-valuetext', `${T.textoPct(pct)}: ${reais(Math.round(novo * 100))} o pacote`);
  }
  $(`.insumo[data-id="${sel(id)}"]`)?.classList.toggle('em-simulacao', Boolean(pct));
  atualizar();
  pulsar(id);
  if (fim) {
    const fala = $(`[data-simula-fala="${sel(id)}"]`);
    if (fala) fala.textContent = T.textoDoEfeito(estado, id);
  }
}

function precosDeHoje() {
  for (const [id, s] of estado.simula) {
    const ins = estado.dados.despensa.find((x) => x.id === id);
    if (ins) ins.preco_pacote = s.hoje;
  }
  estado.simula.clear();
  // (camadas a fundo) o aproveitamento de hoje também volta
  for (const [id, s] of estado.simulaAprov) {
    const ins = estado.dados.despensa.find((x) => x.id === id);
    if (ins) ins.aproveitamento = s.hoje;
  }
  estado.simulaAprov.clear();
  desenhar();
}

// ---------- (camadas a fundo) 1. e se aproveitar mais (ou menos)? ----------

/** Põe o aproveitamento do insumo em `valor` % (a faixa), em tudo: o quilo limpo, as receitas, o cardápio e a lista. */
function simularAprov(id, valor, { fim = false } = {}) {
  const d = estado.dados;
  const i = d.despensa.findIndex((x) => x.id === id);
  const ins = d.despensa[i];
  if (!ins) return;
  const s = estado.simulaAprov.get(id) ?? { hoje: ins.aproveitamento };
  const hoje = T.aprovPct({ ...ins, aproveitamento: s.hoje });
  if (Math.abs(valor - hoje) > 1e-9) { estado.simulaAprov.set(id, s); ins.aproveitamento = valor; } else { ins.aproveitamento = s.hoje; estado.simulaAprov.delete(id); }
  const campo = $(`[data-e="despensa.${i}.aproveitamento"]`);
  if (campo) campo.value = T.textoAprov(ins.aproveitamento);
  const mexendo = estado.simulaAprov.has(id);
  const rot = $(`[data-aprov-pct="${sel(id)}"]`);
  if (rot) { rot.textContent = `${String(T.aprovPct(ins)).replace('.', ',')}%`; rot.classList.toggle('desce', mexendo && valor > hoje); rot.classList.toggle('sobe', mexendo && valor < hoje); }
  const volta = $(`[data-acao="aprov-hoje"][data-id="${sel(id)}"]`);
  if (volta) volta.hidden = !mexendo;
  $(`.insumo[data-id="${sel(id)}"]`)?.classList.toggle('em-simulacao', mexendo || estado.simula.has(id));
  atualizar();
  const faixa = $(`[data-aprov="${sel(id)}"]`);
  if (faixa) {
    if (Number(faixa.value) !== Math.round(valor)) faixa.value = String(Math.round(valor));
    faixa.setAttribute('aria-valuetext', T.textoDoAprov(estado, ins));
  }
  pulsar(id);
  if (fim) {
    const fala = $(`[data-aprov-fala="${sel(id)}"]`);
    if (fala) fala.textContent = T.textoDoEfeito(estado, id);
  }
}

// ---------- (camadas a fundo) 1. a perda no preparo (a receita da casa) ----------

/** A faixa da perda muda o "rende" da receita: entra 2,68 kg e perde 30% → rende 1,87 kg. O quilo dela rola junto. */
function perdaNaReceita(caminho, pct) {
  const r = pegar(caminho);
  const feita = r && estado.calc.receitas.get(r.id);
  if (!r || !feita?.entra) return;
  const valor = feita.entra.valor * (1 - pct / 100);
  if (!(valor > 0)) return;
  r.rende = C.mostrarQuantidade(valor, feita.entra.unidade);
  const campo = $(`[data-e="${sel(`${caminho}.rende`)}"]`);
  if (campo) campo.value = r.rende;
  atualizar();
  const faixa = $(`[data-perda="${sel(caminho)}"]`);
  const nova = estado.calc.receitas.get(r.id);
  if (faixa && nova) faixa.setAttribute('aria-valuetext', T.textoDaPerda(nova));
}

/** Digitou o que a receita rende (ou mudou o que vai nela): a faixa da perda acompanha (e some se a perda não dá pra medir). */
function acompanharPerda(id) {
  const mexe = $(`[data-perda-mexe="${sel(id)}"]`);
  const faixa = mexe?.querySelector('[data-perda]');
  const feita = estado.calc.receitas.get(id);
  if (!mexe || !faixa) return;
  const ok = feita && !feita.erro && feita.perda !== null;
  mexe.hidden = !ok;
  if (!ok || document.activeElement === faixa) return;
  const { min, max } = T.faixaDaPerda(feita.perda);
  faixa.min = String(min);
  faixa.max = String(max);
  faixa.value = (Math.round(feita.perda * 200) / 2).toFixed(1);
  faixa.setAttribute('aria-valuetext', T.textoDaPerda(feita));
}

// ---------- (camadas a fundo) 2. o tamanho e os adicionais ----------

/** Troca o tamanho na tela (a broto, a média, a grande): os números rolam, o desenho da pizza cresce ou diminui. */
function trocarTamanho(id) {
  if (!estado.dados.tamanhos.some((t) => t.id === id) || estado.tamanho === id) return;
  estado.tamanho = id;
  marcarTamanho();
  // os campos do preço são os do tamanho (o editor é trocado no lugar: o toque estava no botão, não no campo)
  for (const el of $$('[data-precos-tamanho]')) el.innerHTML = T.precosDoTamanho(estado, { lista: el.dataset.lista, i: el.dataset.i, faixa: Boolean(el.dataset.faixa) });
  const pizza = $('.meio-pizza');
  if (pizza) pizza.style.setProperty('--escala', T.escalaDaPizza(estado).toFixed(4));
  atualizar();
  vibrar(8);
}
function marcarTamanho() {
  const atual = T.tamanhoAtual(estado);
  for (const b of $$('[data-acao="tamanho"]')) b.setAttribute('aria-pressed', String(b.dataset.id === atual));
}

/** Liga ou desliga um adicional na ficha da pizza (a pizza com a borda): a ficha, o preço e a pizza por dentro mudam. */
function ligarExtra(el) {
  const id = el.dataset.id;
  const ligado = !estado.adicionaisLigados.has(id);
  if (ligado) estado.adicionaisLigados.add(id); else estado.adicionaisLigados.delete(id);
  el.setAttribute('aria-pressed', String(ligado));
  estado.alternados.clear();
  atualizar();
  if (ligado) { estourarEm(el, { quantos: 10, raio: 50 }); vibrar(10); }
}

// ---------- (camadas a fundo) 3. as contas da loja ----------

let enchendo = 0;
/** "Pôr as contas de exemplo": cada conta entra uma depois da outra, e as fichas rolam a cada uma. */
function porContasDeExemplo() {
  const d = estado.dados;
  const ex = d.loja_exemplo;
  if (!ex) return;
  clearTimeout(enchendo);
  const passos = [];
  const l = d.loja;
  const antes = copia(l);
  const desfazer = () => { clearTimeout(enchendo); estado.dados.loja = copia(antes); desenhar({ focar: '' }); };
  // as contas do mês, uma de cada vez; depois o que a loja vende (aí o % vira o de verdade) e a maquininha
  for (const c of ex.custos_fixos) {
    passos.push(() => {
      let linha = l.custos_fixos.find((x) => x.nome === c.nome);
      if (!linha) { linha = { nome: c.nome, por_mes: '' }; l.custos_fixos.push(linha); }
      Object.assign(linha, { por_mes: c.por_mes, exemplo: true });
      return linha;
    });
  }
  passos.push(() => { l.faturamento_mes = ex.faturamento_mes; l.faturamento_exemplo = true; return null; });
  passos.push(() => { Object.assign(l, { maquininha_taxa: ex.maquininha_taxa, maquininha_parte: ex.maquininha_parte, maquininha_exemplo: true }); return null; });
  const faltaLinha = ex.custos_fixos.some((c) => !l.custos_fixos.some((x) => x.nome === c.nome));
  const rapido = pedeMenosMovimento();
  if (faltaLinha || rapido) {
    for (const p of passos) p();
    desenhar({ focar: '' });
    estourarEm($('[data-saida="loja-resultado"]'), { quantos: 18, raio: 90 });
    avisar('As contas de exemplo entraram: todas as fichas usam o % delas agora.', desfazer);
    return;
  }
  // uma de cada vez: o campo enche, o % rola e as fichas acompanham
  let k = 0;
  const proximo = () => {
    const linha = passos[k]();
    if (linha) {
      const j = l.custos_fixos.indexOf(linha);
      const campo = $(`[data-e="loja.custos_fixos.${j}.por_mes"]`);
      if (campo) campo.value = T.dinheiro(linha.por_mes);
      campo?.closest('.conta')?.classList.add('de-exemplo', 'entrou');
      setTimeout(() => campo?.closest('.conta')?.classList.remove('entrou'), 700);
    } else {
      const fat = $('[data-e="loja.faturamento_mes"]');
      if (fat) fat.value = T.dinheiro(l.faturamento_mes);
      const faixa = $('[data-loja-fat]');
      if (faixa) faixa.value = String(Math.min(T.FAT_MAX, Math.max(T.FAT_MIN, Number(l.faturamento_mes) || T.FAT_MIN)));
      const taxa = $('[data-e="loja.maquininha_taxa"]');
      if (taxa) taxa.value = T.textoAprov(l.maquininha_taxa);
      const parte = $('[data-e="loja.maquininha_parte"]');
      if (parte) parte.value = T.textoAprov(l.maquininha_parte);
    }
    atualizar();
    k++;
    if (k < passos.length) enchendo = setTimeout(proximo, 160);
    else {
      estourarEm($('[data-saida="loja-resultado"]'), { quantos: 18, raio: 90 });
      vibrar(14);
      avisar('As contas de exemplo entraram: todas as fichas usam o % delas agora.', desfazer);
    }
  };
  proximo();
}

/** Limpar as contas: volta pra média do ramo (os nomes das contas ficam, sem o valor). */
function limparContas() {
  clearTimeout(enchendo);
  const l = estado.dados.loja;
  l.custos_fixos = l.custos_fixos.map((c) => ({ nome: c.nome, por_mes: '' }));
  l.faturamento_mes = '';
  l.maquininha_taxa = '';
  l.maquininha_parte = '';
  delete l.faturamento_exemplo;
  delete l.maquininha_exemplo;
  desenhar({ focar: '' });
}

/** O − e o + de uma conta: de 10 em 10 reais (segurando, acelera). */
function passoDaConta(j, v) {
  const c = estado.dados.loja.custos_fixos[j];
  if (!c) return;
  const atual = (T.emCentavos(c.por_mes) ?? 0) / 100;
  c.por_mes = Math.max(0, Math.round((atual + v * 10) * 100) / 100);
  delete c.exemplo;
  const campo = $(`[data-e="loja.custos_fixos.${j}.por_mes"]`);
  if (campo) campo.value = T.dinheiro(c.por_mes);
  campo?.closest('.conta')?.classList.remove('de-exemplo');
  atualizar();
}

// ---------- o + e o − (e as setas) ----------

function passoDoEstoque(caminho, v) {
  const ins = pegar(caminho.split('.').slice(0, -1).join('.'));
  if (!ins) return;
  let pac;
  try { pac = C.medida(ins.pacote, estado.tab, ins.nome || 'O insumo'); } catch { return; }
  let tem = 0;
  try { tem = C.quantidadeGuardada(ins.estoque, pac, estado.tab, { nome: ins.nome, refTexto: ins.pacote }); } catch { tem = 0; }
  ins.estoque = C.mostrarQuantidade(Math.max(0, tem + v * pac.valor), pac.unidade);
  estado.comprados.delete(ins.id); // mexeu no estoque à mão: o "comprei" de antes fica valendo como está
  const campo = $(`[data-e="${sel(caminho)}"]`);
  if (campo) campo.value = ins.estoque;
  atualizar();
}

function quantidadeNoPlano(i, n) {
  const e = estado.dados.plano[i];
  if (!e) return;
  e.quantidade = Math.max(0, Math.round(n));
  const campo = $(`[data-e="plano.${i}.quantidade"]`);
  if (campo && document.activeElement !== campo) campo.value = String(e.quantidade);
  const faixa = $(`[data-plano-faixa="${i}"]`);
  if (faixa) {
    if (e.quantidade > Number(faixa.max)) faixa.max = String(T.fimDaFaixa(e.quantidade));
    if (document.activeElement !== faixa || Number(faixa.value) !== e.quantidade) faixa.value = String(e.quantidade);
    faixa.style.setProperty('--cheio', `${((e.quantidade / Number(faixa.max)) * 100).toFixed(1)}%`);
  }
  atualizar();
}
const passoDoPlano = (i, v) => quantidadeNoPlano(i, T.quantidadeDo(estado.dados.plano[i]) + v);

// ---------- as receitas: pôr um ingrediente (arrastando ou no "+ adicionar") ----------

function vaiPadrao(id) {
  const d = estado.dados;
  const ins = d.despensa.find((x) => x.id === id);
  const r = d.receitas.find((x) => x.id === id);
  let u = 'g';
  try { u = C.medida(ins ? ins.pacote : r?.rende, estado.tab, 'O ingrediente').unidade; } catch { /* sem medida: o peso */ }
  return u === 'un' ? '1 un' : u === 'ml' ? '50 ml' : '100 g';
}

function porNaLista(caminho, id, { arrastou = false } = {}) {
  const lista = pegar(caminho);
  if (!Array.isArray(lista)) return;
  const d = estado.dados;
  const dono = pegar(caminho.split('.').slice(0, -1).join('.'));
  const ehReceita = d.receitas.some((r) => r.id === id);
  if (ehReceita && dono?.id && (id === dono.id || C.ondeEntra(d, dono.id).receitas.includes(id))) {
    avisar(`Não dá: ${T.nomeDe(d, id)} já leva ${dono.nome || 'esta receita'} (uma não pode ir dentro da outra e vice-versa).`);
    return;
  }
  const linha = { usa: id, vai: vaiPadrao(id) };
  lista.push(linha);
  estado.linhaNova = linha;
  estado.pegaAberto = null;
  estado.selecionar = true;
  desenhar({ focar: temMouse() ? `[data-e="${sel(`${caminho}.${lista.length - 1}.vai`)}"]` : '' });
  estado.selecionar = false;
  const nova = $('.linha-usa.nova');
  if (nova) {
    nova.scrollIntoView({ block: 'nearest', behavior: pedeMenosMovimento() ? 'auto' : 'smooth' });
    estourarEm(nova, { quantos: arrastou ? 16 : 10, raio: 60 });
    vibrar(10);
  }
  avisar(`${T.nomeDe(d, id)} entrou em ${dono?.nome || 'a receita'} (${linha.vai}).`, () => {
    const k = lista.indexOf(linha);
    if (k >= 0) lista.splice(k, 1);
    desenhar({ focar: '' });
  });
}

// ---------- 4. o meio a meio ----------

function marcarSabores() {
  const d = estado.dados;
  const s = d.meio_a_meio.sabores;
  for (const b of $$('[data-acao="sabor"]')) b.setAttribute('aria-pressed', String(s[Number(b.dataset.lado)] === b.dataset.id));
  for (const i of $$('[data-cor-lado]')) i.style.setProperty('--cor', T.corDo(d, s[Number(i.dataset.corLado)]));
}

function escolherSabor(lado, id) {
  const s = estado.dados.meio_a_meio.sabores;
  if (s[1 - lado] === id) s[1 - lado] = s[lado]; // o mesmo sabor dos 2 lados: troca de lado
  s[lado] = id;
  estado.alternados.clear();
  marcarSabores();
  atualizar();
}

/** Tocar numa metade da pizza: vai para o próximo sabor (da mesma base, sem repetir o da outra metade). */
function trocarMetade(lado) {
  const d = estado.dados;
  const s = d.meio_a_meio.sabores;
  const outra = d.cardapio.find((p) => p.id === s[1 - lado]);
  const pizzas = d.cardapio.filter((p) => p.base && (!outra || p.base === outra.base));
  const k = pizzas.findIndex((p) => p.id === s[lado]);
  const prox = [...pizzas.slice(k + 1), ...pizzas.slice(0, k + 1)].find((p) => p.id !== s[1 - lado] && p.id !== s[lado]);
  if (!prox) return;
  escolherSabor(lado, prox.id);
  const el = $('[data-saida="pizza"]');
  if (el) V.pizzaViva(el, {}).pulsar(lado);
  vibrar(8);
}

// ---------- 5. o "comprei" ----------

function comprei(caixa) {
  const id = caixa.dataset.id;
  const ins = estado.dados.despensa.find((x) => x.id === id);
  if (!ins) return;
  const li = caixa.closest('li');
  if (caixa.checked) {
    const item = estado.calc.compras.itens.find((x) => x.id === id);
    if (!item?.comprar) { atualizar(); return; }
    let novo;
    try { novo = C.estoqueDepoisDaCompra(ins, item.pacotes, estado.tab); } catch (err) {
      caixa.checked = false;
      avisar(err.erros?.[0] ?? err.message);
      return;
    }
    const antes = estado.comprados.get(id);
    estado.comprados.set(id, { pacotes: (antes?.pacotes ?? 0) + item.pacotes, custo_c: (antes?.custo_c ?? 0) + item.custo_c, antes: antes?.antes ?? ins.estoque });
    ins.estoque = novo;
    estourarEm(li ?? caixa);
    vibrar(12);
    atualizar();
    if (!estado.calc.compras.itens.some((x) => x.comprar)) {
      setTimeout(() => { estourarEm($('[data-saida="compras-total"]'), { quantos: 26, raio: 130 }); vibrar(30); }, 240);
    }
  } else {
    const c = estado.comprados.get(id);
    if (c) { ins.estoque = c.antes; estado.comprados.delete(id); }
    atualizar();
  }
}

// ---------- o que cada botão faz ----------

function tirarItem(lista, i) {
  const d = estado.dados;
  const item = d[lista][i];
  if (!item) return;
  // as linhas que usavam o item guardam o nome dele: o aviso diz qual saiu
  for (const l of todasAsLinhas(d)) if (l.usa === item.id) l.nome = item.nome;
  d[lista].splice(i, 1);
  if (estado.aberto === item.id) estado.aberto = null;
  estado.simula.delete(item.id);
  estado.comprados.delete(item.id);
  desenhar();
}

function tirarProduto(id) {
  const d = estado.dados;
  d.cardapio = d.cardapio.filter((p) => p.id !== id);
  d.adicionais = d.adicionais.filter((p) => p.id !== id);
  d.plano = d.plano.filter((e) => e.produto !== id && e.adicional !== id && !(e.meio ?? []).includes(id));
  arrumar(d);
  irPara('#cardapio');
}

async function copiarLista() {
  const texto = C.textoDaLista(estado.calc.compras, estado.dados, { comprados: estado.comprados });
  const aviso = $('[data-aviso-lista]');
  const caixa = $('[data-lista-texto]');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('sem copiar');
    await navigator.clipboard.writeText(texto);
    if (aviso) aviso.textContent = 'Lista copiada: é só colar no WhatsApp ou nas notas.';
    if (caixa) caixa.hidden = true;
    estourarEm($('[data-acao="copiar"]'));
    vibrar(12);
  } catch {
    if (caixa) { caixa.value = texto; caixa.hidden = false; caixa.select(); }
    if (aviso) aviso.textContent = 'Não deu pra copiar sozinho: selecione o texto abaixo e copie.';
  }
}

const marcarBotoes = (acao, valor) => { for (const b of $$(`[data-acao="${acao}"]`)) b.setAttribute('aria-pressed', String(b.dataset.v === valor || b.dataset.id === valor)); };

const ACOES = {
  filtro: (el) => { estado.filtro = el.dataset.id; desenhar(); },
  onde: (el) => { estado.aberto = estado.aberto === el.dataset.id ? null : el.dataset.id; desenhar(); },
  'editar-insumo': (el) => {
    const id = el.dataset.id;
    const abrir = estado.editando !== id;
    estado.editando = abrir ? id : null;
    estado.aberto = abrir ? id : null; // no celular, abrir o insumo já mostra o "mexer no preço"
    desenhar({ focar: `[data-acao="editar-insumo"][data-id="${sel(id)}"]` });
  },
  pacote: (el, tamanho = 1) => passoDoEstoque(el.dataset.alvo, Number(el.dataset.v) * tamanho),
  'preco-hoje': (el) => simular(el.dataset.id, 0, { fim: true }),
  'precos-hoje': () => precosDeHoje(),
  'mais-insumo': () => {
    const d = estado.dados;
    const categoria = !['todos', 'falta'].includes(estado.filtro) ? estado.filtro : 'Outros';
    const id = novoId('insumo');
    d.despensa.push({ id, nome: '', categoria, pacote: '', preco_pacote: '', estoque: '', minimo: '' });
    estado.editando = id;
    desenhar({ focar: `[data-e="despensa.${d.despensa.length - 1}.nome"]` });
  },
  'tirar-insumo': (el) => tirarItem('despensa', Number(el.dataset.i)),
  'mais-receita': () => {
    const d = estado.dados;
    d.receitas.push({ id: novoId('receita'), nome: '', rende: '', pronto: '', itens: [] });
    estado.pegaAberto = `receitas.${d.receitas.length - 1}.itens`;
    desenhar({ focar: `[data-e="receitas.${d.receitas.length - 1}.nome"]` });
  },
  'tirar-receita': (el) => tirarItem('receitas', Number(el.dataset.i)),
  pega: (el) => {
    estado.pegaAberto = estado.pegaAberto === el.dataset.lista ? null : el.dataset.lista;
    desenhar({ focar: `[data-acao="pega"][data-lista="${sel(el.dataset.lista)}"]` });
  },
  por: (el) => porNaLista(el.dataset.lista, el.dataset.id),
  desfazer: () => { const f = desfazerAgora; fecharAviso(); f?.(); },
  'mais-linha': (el) => {
    const lista = pegar(el.dataset.lista);
    if (!Array.isArray(lista)) return;
    lista.push({ usa: '', vai: '' });
    desenhar({ focar: `[data-e="${sel(`${el.dataset.lista}.${lista.length - 1}.usa`)}"]` });
  },
  'tirar-linha': (el) => {
    const lista = pegar(el.dataset.lista);
    if (!Array.isArray(lista)) return;
    const j = Number(el.dataset.j);
    const [linha] = lista.splice(j, 1);
    desenhar({ focar: '' });
    if (linha?.usa) {
      avisar(`Tirou ${T.nomeDe(estado.dados, linha.usa)} da lista.`, () => { lista.splice(Math.min(j, lista.length), 0, linha); desenhar({ focar: '' }); });
    }
  },
  'mais-conta': () => { estado.dados.loja.custos_fixos.push({ nome: '', por_mes: '' }); estado.lojaAberta = true; desenhar(); },
  'mais-produto': () => {
    const d = estado.dados;
    const id = novoId('produto');
    d.cardapio.push({ id, nome: d.bases.length ? 'Sabor novo' : 'Produto novo', base: d.bases[0]?.id, itens: [{ usa: '', vai: '' }], embalagem: [], precos: { balcao: '', app: '' } });
    arrumar(d);
    estado.editorAberto = true;
    location.hash = `#cardapio/${id}`;
  },
  'mais-base': () => {
    const d = estado.dados;
    d.bases.push({ id: novoId('base'), nome: 'Pizza grande', itens: [{ usa: '', vai: '' }], embalagem: [] });
    desenhar();
  },
  'mais-adicional': () => {
    const d = estado.dados;
    d.adicionais.push({ id: novoId('adicional'), nome: 'Adicional novo', itens: [{ usa: '', vai: '' }], embalagem: [], precos: { balcao: '' } });
    arrumar(d);
    desenhar();
  },
  'tirar-adicional': (el) => tirarProduto(estado.dados.adicionais[Number(el.dataset.i)]?.id),
  'tirar-produto': (el) => tirarProduto(el.dataset.id),
  completa: (el) => { estado.completa = el.dataset.v === 'sim'; marcarBotoes('completa', el.dataset.v); atualizar(); },
  'arvore-tudo': () => { estado.abrirTudo = !estado.abrirTudo; estado.alternados.clear(); desenhar(); },
  sabor: (el) => escolherSabor(Number(el.dataset.lado), el.dataset.id),
  regra: (el) => { estado.dados.meio_a_meio.regra = el.dataset.id; marcarBotoes('regra', el.dataset.id); atualizar(); },
  qtd: (el, tamanho = 1) => passoDoPlano(Number(el.dataset.i), Number(el.dataset.v) * tamanho),
  'mais-meio': () => {
    const d = estado.dados;
    const [a, b] = d.meio_a_meio.sabores;
    const antesDosAdicionais = d.plano.findIndex((e) => e.adicional);
    d.plano.splice(antesDosAdicionais < 0 ? d.plano.length : antesDosAdicionais, 0, { meio: [a, b], quantidade: 10 });
    desenhar();
  },
  'tirar-plano': (el) => { estado.dados.plano.splice(Number(el.dataset.i), 1); desenhar({ focar: '' }); },
  minimo: (el) => { estado.garantirMinimo = el.dataset.v === 'sim'; marcarBotoes('minimo', el.dataset.v); atualizar(); },
  copiar: () => copiarLista(),
  rolar: (el) => document.getElementById(el.dataset.id)?.scrollIntoView({ behavior: pedeMenosMovimento() ? 'auto' : 'smooth', block: 'start' }),
  buscar: () => busca?.abrir(),
  // (camadas a fundo)
  'aprov-hoje': (el) => {
    const id = el.dataset.id;
    const ins = estado.dados.despensa.find((x) => x.id === id);
    const s = estado.simulaAprov.get(id);
    if (!ins || !s) return;
    simularAprov(id, T.aprovPct({ ...ins, aproveitamento: s.hoje }), { fim: true });
  },
  tamanho: (el) => trocarTamanho(el.dataset.id),
  extra: (el) => ligarExtra(el),
  'loja-exemplo': () => porContasDeExemplo(),
  'loja-limpar': () => {
    const antes = copia(estado.dados.loja);
    limparContas();
    avisar('As contas saíram: as fichas voltaram pra média do ramo.', () => { estado.dados.loja = antes; desenhar({ focar: '' }); });
  },
  'conta-passo': (el, tamanho = 1) => passoDaConta(Number(el.dataset.j), Number(el.dataset.v) * tamanho),
  'mais-tamanhos': () => {
    // os 3 tamanhos de sempre, sem o diâmetro (a pessoa põe o dela); a receita da base fica sendo a da grande
    const d = estado.dados;
    const novos = [['Broto', 'broto'], ['Média', 'media'], ['Grande', 'grande']].map(([nome, id]) => ({ id: d.tamanhos.some((t) => t.id === id) ? novoId(id) : id, nome, diametro: '', embalagem: [] }));
    d.tamanhos.push(...novos);
    const b = d.bases[0];
    if (b && !b.tamanho) b.tamanho = novos[2].id;
    estado.tamEditorAberto = true;
    arrumar(d);
    desenhar({ focar: `[data-e="tamanhos.${d.tamanhos.length - 3}.diametro"]` });
  },
  'mais-tamanho': () => {
    const d = estado.dados;
    d.tamanhos.push({ id: novoId('tamanho'), nome: '', diametro: '', embalagem: [] });
    arrumar(d);
    desenhar({ focar: `[data-e="tamanhos.${d.tamanhos.length - 1}.nome"]` });
  },
  'tirar-tamanho': (el) => {
    const d = estado.dados;
    const t = d.tamanhos[Number(el.dataset.j)];
    if (!t) return;
    if (d.bases.some((b) => b.tamanho === t.id)) { avisar(`A receita da base é a da ${t.nome || 'deste tamanho'}: escolha outro tamanho pra receita antes de tirar este.`); return; }
    d.tamanhos.splice(Number(el.dataset.j), 1);
    if (estado.tamanho === t.id) estado.tamanho = T.tamanhoDaReceita(d);
    arrumar(d);
    desenhar({ focar: '' });
    avisar(`O tamanho ${t.nome || ''} saiu.`.replace('  ', ' '), () => { d.tamanhos.push(t); arrumar(d); desenhar({ focar: '' }); });
  },
  'mais-tamanho-plano': () => {
    const d = estado.dados;
    const produto = $('[data-plano-sabor]')?.value;
    const tamanho = $('[data-plano-tam]')?.value;
    if (!produto || !tamanho) return;
    const ja = d.plano.find((e) => e.produto === produto && e.tamanho === tamanho);
    if (ja) { avisar(`${T.nomeDe(d, produto)} ${T.nomeDoTamanho(d, tamanho).toLowerCase()} já está no plano.`); return; }
    const k = d.plano.findIndex((e) => e.meio || e.adicional);
    d.plano.splice(k < 0 ? d.plano.length : k, 0, { produto, tamanho, quantidade: 10 });
    desenhar();
    const nova = $(`[data-e="plano.${d.plano.findIndex((e) => e.produto === produto && e.tamanho === tamanho)}.quantidade"]`)?.closest('.plano-q');
    if (nova) { estourarEm(nova, { quantos: 10, raio: 50 }); vibrar(10); }
  },
};

// ---------- a busca rápida ----------

let busca = null;

/** Leva até o que a pessoa escolheu na busca, e acende ele. */
function irParaItem(x) {
  const acender = (seletor, focar) => {
    estado.depois = () => {
      const el = $(seletor);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: pedeMenosMovimento() ? 'auto' : 'smooth' });
      el.classList.remove('achado');
      void el.offsetWidth;
      el.classList.add('achado');
      setTimeout(() => el.classList.remove('achado'), 2400);
      const f = focar && temMouse() ? el.querySelector(focar) : null;
      (f ?? el).focus?.({ preventScroll: true });
    };
  };
  if (x.tipo === 'passo') { irPara(x.rota); return; }
  // (camadas a fundo) as contas da loja, cada conta e os tamanhos
  if (x.tipo === 'loja') { acender('.loja-resultado'); irPara('#loja'); return; }
  if (x.tipo === 'conta') {
    if (x.campo === 'faturamento') acender('.loja-vende', 'input[data-e]');
    else if (x.campo === 'maquininha') acender('.loja-maq', 'input[data-e]');
    else acender(`.conta[data-conta="${x.j}"]`, 'input[inputmode="decimal"]');
    irPara('#loja');
    return;
  }
  if (x.tipo === 'tamanho') {
    estado.tamanho = x.id;
    acender('.tamanhos');
    irPara('#cardapio');
    return;
  }
  if (x.tipo === 'insumo') {
    estado.filtro = 'todos';
    estado.aberto = x.id;
    estado.editando = x.id;
    acender(`.insumo[data-id="${sel(x.id)}"]`, '.nome-grande');
    irPara('#despensa');
    return;
  }
  if (x.tipo === 'receita') { acender(`#receita-${sel(x.id)}`, '.nome-grande'); irPara('#receitas'); return; }
  if (x.tipo === 'base') { acender(`#base-${sel(x.id)}`, '.nome-grande'); irPara('#cardapio'); return; }
  irPara(`#cardapio/${encodeURIComponent(x.id)}`);
}

// o que é campo de texto (onde as teclas 1 a 5 e o / são da pessoa, não atalho)
const NAO_TEXTO = ['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color'];
const campoDeTexto = (el) => Boolean(el?.closest?.('textarea, select, [contenteditable="true"]')) || (el?.matches?.('input') && !NAO_TEXTO.includes(el.type));

// ---------- os cliques e as teclas ----------

function ligar() {
  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.matches('[data-simula]')) { simular(el.dataset.simula, Number(el.value)); return; }
    // (camadas a fundo) as faixas novas: o aproveitamento, a perda no preparo e o que a loja vende
    if (el.matches('[data-aprov]')) { simularAprov(el.dataset.aprov, Number(el.value)); return; }
    if (el.matches('[data-perda]')) { perdaNaReceita(el.dataset.perda, Number(el.value)); return; }
    if (el.matches('[data-loja-fat]')) {
      const l = estado.dados.loja;
      l.faturamento_mes = Number(el.value);
      delete l.faturamento_exemplo;
      const campo = $('[data-e="loja.faturamento_mes"]');
      if (campo) campo.value = T.dinheiro(l.faturamento_mes);
      el.setAttribute('aria-valuetext', `${reais(Math.round(l.faturamento_mes * 100))} por mês`);
      atualizar();
      return;
    }
    if (el.matches('[data-plano-faixa]')) { quantidadeNoPlano(Number(el.dataset.planoFaixa), Number(el.value)); return; }
    if (el.matches('[data-faixa]')) {
      const v = Number(el.value);
      definir(el.dataset.faixa, v);
      const campo = $(`[data-e="${sel(el.dataset.faixa)}"]`);
      if (campo) campo.value = T.dinheiro(v);
      atualizar();
      return;
    }
    if (!el.matches('input[data-e]') || el.type === 'checkbox') return;
    definir(el.dataset.e, el.value);
    const plano = el.dataset.e.match(/^plano\.(\d+)\.quantidade$/);
    if (plano) {
      const faixa = $(`[data-plano-faixa="${plano[1]}"]`);
      const n = T.quantidadeDo(estado.dados.plano[Number(plano[1])]);
      if (faixa) { if (n > Number(faixa.max)) faixa.max = String(T.fimDaFaixa(n)); faixa.value = String(n); faixa.style.setProperty('--cheio', `${((n / Number(faixa.max)) * 100).toFixed(1)}%`); }
    }
    const preco = el.dataset.e.match(/^despensa\.(\d+)\.preco_pacote$/);
    if (preco) {
      // digitou o preço: esse vira o preço de hoje (a simulação daquele item acaba)
      const id = estado.dados.despensa[Number(preco[1])]?.id;
      if (id && estado.simula.delete(id)) {
        const faixa = $(`[data-simula="${sel(id)}"]`);
        if (faixa) faixa.value = '0';
        const rot = $(`[data-simula-pct="${sel(id)}"]`);
        if (rot) { rot.textContent = T.textoPct(0); rot.classList.remove('sobe', 'desce'); }
        const volta = $(`[data-acao="preco-hoje"][data-id="${sel(id)}"]`);
        if (volta) volta.hidden = true;
        $(`.insumo[data-id="${sel(id)}"]`)?.classList.remove('em-simulacao');
      }
    }
    if (/^despensa\.\d+\.estoque$/.test(el.dataset.e)) estado.comprados.delete(pegar(el.dataset.e.split('.').slice(0, 2).join('.'))?.id);
    if (/\.(precos|precos_tamanho\.[^.]+)\.balcao$/.test(el.dataset.e)) {
      const faixa = $(`[data-faixa="${sel(el.dataset.e)}"]`);
      const c = T.emCentavos(el.value);
      if (faixa && c) faixa.value = String(c / 100);
    }
    // (camadas a fundo) o aproveitamento digitado vira o de hoje (a faixa acompanha) e deixa de ser o de exemplo
    const aprov = el.dataset.e.match(/^despensa\.(\d+)\.aproveitamento$/);
    if (aprov) {
      const ins = estado.dados.despensa[Number(aprov[1])];
      if (ins) {
        estado.simulaAprov.delete(ins.id);
        delete ins.aproveitamento_exemplo;
        const faixa = $(`[data-aprov="${sel(ins.id)}"]`);
        if (faixa) faixa.value = String(Math.max(T.APROV_MIN, Math.round(T.aprovPct(ins))));
        const rot = $(`[data-aprov-pct="${sel(ins.id)}"]`);
        if (rot) { rot.textContent = `${String(T.aprovPct(ins)).replace('.', ',')}%`; rot.classList.remove('sobe', 'desce'); }
        const volta = $(`[data-acao="aprov-hoje"][data-id="${sel(ins.id)}"]`);
        if (volta) volta.hidden = true;
      }
    }
    // as contas da loja digitadas: deixam de ser as de exemplo
    const conta = el.dataset.e.match(/^loja\.custos_fixos\.(\d+)\.(por_mes|nome)$/);
    if (conta) { const c = estado.dados.loja.custos_fixos[Number(conta[1])]; if (c) delete c.exemplo; el.closest('.conta')?.classList.remove('de-exemplo'); }
    if (el.dataset.e === 'loja.faturamento_mes') {
      delete estado.dados.loja.faturamento_exemplo;
      const faixa = $('[data-loja-fat]');
      const c = T.emCentavos(el.value);
      if (faixa && c) faixa.value = String(Math.min(T.FAT_MAX, Math.max(T.FAT_MIN, c / 100)));
    }
    if (/^loja\.maquininha_/.test(el.dataset.e)) delete estado.dados.loja.maquininha_exemplo;
    if (/^(despensa|receitas)\.\d+\.nome$/.test(el.dataset.e)) {
      const [lista, i] = el.dataset.e.split('.');
      const item = estado.dados[lista]?.[Number(i)];
      if (item) for (const op of $$(`option[value="${sel(item.id)}"]`)) op.textContent = item.nome || 'sem nome';
    }
    atualizar();
    // (camadas a fundo) a faixa da perda acompanha o que a receita rende; os botões do tamanho, o nome e o diâmetro
    const rec = el.dataset.e.match(/^receitas\.(\d+)\./);
    if (rec) { const r = estado.dados.receitas[Number(rec[1])]; if (r) acompanharPerda(r.id); }
    if (/^tamanhos\.\d+\.(nome|diametro)$/.test(el.dataset.e)) {
      // o tamanho da receita ganhou (ou perdeu) o diâmetro: a caixa do tamanho aparece (ou some) no cardápio
      if (estado.rota.vista === 'cardapio' && T.temTamanhos(estado.dados) !== Boolean($('.tamanhos'))) {
        const caminho = el.dataset.e;
        const pos = el.selectionStart ?? el.value.length;
        desenhar({ focar: `[data-e="${sel(caminho)}"]` });
        $(`[data-e="${sel(caminho)}"]`)?.setSelectionRange?.(pos, pos);
        return;
      }
      for (const g of $$('[data-tam-chips]')) g.outerHTML = T.chipsDoTamanho(estado, { rotulo: g.getAttribute('aria-label') });
    }
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.matches('[data-trocar-cozinha]')) { trocarCozinha(el.value); return; }
    if (el.matches('[data-acao="comprei"]')) { comprei(el); return; }
    if (el.matches('[data-simula]')) { simular(el.dataset.simula, Number(el.value), { fim: true }); return; }
    if (el.matches('[data-aprov]')) { simularAprov(el.dataset.aprov, Number(el.value), { fim: true }); return; }
    if (!el.matches('[data-e]') || !(el.tagName === 'SELECT' || el.type === 'checkbox')) return;
    definir(el.dataset.e, el.type === 'checkbox' ? el.checked : el.value);
    if (/\.(base|categoria)$/.test(el.dataset.e) || /^bases\.\d+\.tamanho$/.test(el.dataset.e)) { arrumar(estado.dados); desenhar(); } else atualizar();
  });
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('button[data-acao]');
    if (!el || !ACOES[el.dataset.acao]) return;
    ACOES[el.dataset.acao](el);
  });
  // segurar o + ou o −: repete cada vez mais rápido
  V.ligarSegurar(document, { aoPasso: (b, tamanho) => ACOES[b.dataset.acao]?.(b, tamanho) });
  document.addEventListener('keydown', (ev) => {
    const el = ev.target;
    if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && String(ev.key).toLowerCase() === 'k') { ev.preventDefault(); busca?.abrir(); return; }
    // as setas no estoque e no plano: de 1 em 1 (com Shift, de 10 em 10)
    if ((ev.key === 'ArrowUp' || ev.key === 'ArrowDown') && el.matches?.('input[data-e]') && !ev.altKey && !ev.metaKey && !ev.ctrlKey) {
      const v = (ev.key === 'ArrowUp' ? 1 : -1) * (ev.shiftKey ? 10 : 1);
      const plano = el.dataset.e.match(/^plano\.(\d+)\.quantidade$/);
      if (plano) { ev.preventDefault(); passoDoPlano(Number(plano[1]), v); el.value = String(estado.dados.plano[Number(plano[1])].quantidade); return; }
      if (/^despensa\.\d+\.estoque$/.test(el.dataset.e)) { ev.preventDefault(); passoDoEstoque(el.dataset.e, v); return; }
      // (camadas a fundo) as contas da loja: de 10 em 10 reais (com Shift, de 100 em 100); o que vende, de 500 em 500
      const conta = el.dataset.e.match(/^loja\.custos_fixos\.(\d+)\.por_mes$/);
      if (conta) { ev.preventDefault(); passoDaConta(Number(conta[1]), v); return; }
      if (el.dataset.e === 'loja.faturamento_mes') {
        ev.preventDefault();
        const l = estado.dados.loja;
        l.faturamento_mes = Math.max(0, (T.emCentavos(l.faturamento_mes) ?? 0) / 100 + v * 500);
        delete l.faturamento_exemplo;
        el.value = T.dinheiro(l.faturamento_mes);
        const faixa = $('[data-loja-fat]');
        if (faixa) faixa.value = String(Math.min(T.FAT_MAX, Math.max(T.FAT_MIN, l.faturamento_mes)));
        atualizar();
        return;
      }
    }
    if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey || campoDeTexto(el) || $('dialog[open]')) return;
    if (ev.key === '/') { ev.preventDefault(); busca?.abrir(); return; }
    if (/^[1-5]$/.test(ev.key)) { ev.preventDefault(); location.hash = `#${T.PASSOS[Number(ev.key) - 1].id}`; }
  });
  // a lista em texto e o anel: passar o mouse (ou o foco do teclado) numa linha acende a fatia
  const anel = () => { const el = $('[data-saida="anel"]'); return el ? V.anelExistente(el) : null; };
  const caminhoDaLinha = (alvo) => {
    const no = alvo?.closest?.('.arvore-caixa [data-no]');
    const chave = no?.dataset.no ?? '';
    return chave.startsWith('p-') ? chave.slice(chave.indexOf(':') + 1) : null;
  };
  document.addEventListener('pointerover', (ev) => { if (ev.pointerType === 'mouse') { const c = caminhoDaLinha(ev.target); if (c !== null) anel()?.acenderDeFora(c); } });
  document.addEventListener('pointerout', (ev) => { if (ev.pointerType === 'mouse' && caminhoDaLinha(ev.target) !== null && caminhoDaLinha(ev.relatedTarget) === null) anel()?.acenderDeFora(null); });
  document.addEventListener('focusin', (ev) => { const c = caminhoDaLinha(ev.target); if (c !== null) anel()?.acenderDeFora(c); });
  document.addEventListener('focusout', (ev) => { if (caminhoDaLinha(ev.target) !== null && caminhoDaLinha(ev.relatedTarget) === null) anel()?.acenderDeFora(null); });
  // a árvore e as caixas que abrem: lembra o que a pessoa abriu ou fechou (o toggle não sobe, por isso a captura)
  document.addEventListener('toggle', (ev) => {
    const el = ev.target;
    if (el.matches?.('details[data-no]')) {
      const padrao = el.dataset.padrao === 'true';
      if (el.open !== padrao) estado.alternados.add(el.dataset.no); else estado.alternados.delete(el.dataset.no);
    }
    if (el.matches?.('details[data-guarda]')) estado[el.dataset.guarda] = el.open;
  }, true);
  window.addEventListener('hashchange', mostrar);
  // a busca: o atalho certo de cada sistema
  const dialogo = $('[data-busca-caixa]');
  if (dialogo) {
    busca = V.ligarBusca(dialogo, { itens: () => T.itensDaBusca(estado), aoEscolher: irParaItem });
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    for (const k of $$('[data-atalho]')) k.textContent = mac ? '⌘K' : 'Ctrl K';
  }
}

async function comecar() {
  for (const s of $$('[data-trocar-cozinha]')) s.innerHTML = opcoesCozinha();
  usarCozinha('pizzaria');
  try {
    estado.tab = await carregarTabelas();
  } catch (err) {
    $('[data-tela]').innerHTML = `<p class="erros">Não deu para abrir a calculadora (${esc(err.message)}).</p>`;
    return;
  }
  ligar();
  mostrar();
}

comecar();
