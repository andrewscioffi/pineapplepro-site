// A TELA DO USUÁRIO DO PINE COST PRO: o desenho de cada passo (v3, 07/11/2026). Só desenha.
// Toda conta sai de ../comum/cozinha.js, que usa a calculadora de verdade (a mesma das fichas do robô).
// Cada passo tem 3 tipos de peça:
//   - o editor (os campos e os controles): desenhado 1 vez, quando o passo abre ou quando entra/sai uma linha
//   - as saídas ([data-saida], SAIDAS lá embaixo): refeitas a cada tecla, sem tirar o cursor do campo. Cada número vem
//     marcado (data-rola) e rola do valor velho ao novo (o trocarConteudo do comum/interacao.js)
//   - as saídas vivas (VIVAS): o anel da pizza por dentro, a pizza do meio a meio e a lista de compras, que mudam no
//     lugar (./vivo.js), para a fatia, o giro e o item que entra e sai andarem
import * as F from '../comum/ficha.js';
import * as C from '../comum/cozinha.js';
import { centavos } from '../calculadora/contas.mjs';
import * as D from './desenho.js';
import { anelVivo, pizzaViva, listaViva } from './vivo.js';

export const esc = F.esc;
const R = (c) => F.reais(c);
const q = (v, u) => C.mostrarQuantidade(v, u);
const sobraDe = (c) => (c >= 0 ? `uns ${R(c)}` : `− ${R(-c)}`);
const sobraTxt = (k) => sobraDe(k.sobra);
const centavo = (c, qtd = 1) => (c === 0 && qtd > 0 ? 'menos de 1 centavo' : R(c));
const selo = (d) => (d.exemplo ? '<span class="selo-exemplo">exemplo</span>' : '');
const TITULO = { balcao: 'No balcão', app: 'No app (sugerido)', app_hoje: 'No app, hoje' };
const erroHtml = (lista) => `<p class="erro-linha">${esc([].concat(lista ?? []).join(' '))}</p>`;
/** A marca do número que rola (o trocarConteudo do kit): a chave e o valor (de centavos para reais). */
const rola = (chave, c) => ` data-rola="${esc(chave)}" data-rola-num="${(Number(c) / 100).toFixed(2)}"`;
/** O mesmo, para o que conta sem centavos (itens, receitas). */
const rolaN = (chave, n, casas = 0) => ` data-rola="${esc(chave)}" data-rola-num="${Number(n).toFixed(casas)}"`;
/** O mesmo, para a quantidade como a cozinha escreve (900 g, 1,35 kg): o número é o que aparece; trocou de g para kg, não rola. */
const rolaQ = (chave, valor, unidade) => {
  const [n, u] = C.mostrarQuantidade(valor, unidade).split(' ');
  return rolaN(`${chave}-${u}`, Number(n.replace(/\./g, '').replace(',', '.')), (n.split(',')[1] ?? '').length);
};

/** O dinheiro no campo: o número do exemplo aparece como na nota (14.4 → "14,40"); o que a pessoa digitou fica como ela digitou. */
export const dinheiro = (v) => (typeof v === 'number' ? F.reais(Math.round(v * 100), { simbolo: false }) : String(v ?? ''));
/** A mudança do preço: +40% · −10% · "o preço de hoje". */
export const textoPct = (p) => (p ? `${p > 0 ? '+' : '−'}${Math.abs(p)}%` : 'o preço de hoje');

// ---------- (camadas a fundo, 07/11 à tarde) o aproveitamento, os tamanhos e as contas da loja ----------

/** O aproveitamento no campo: 90 → "90%"; o que a pessoa digitou fica como ela digitou. */
export const textoAprov = (v) => (typeof v === 'number' ? `${String(v).replace('.', ',')}%` : String(v ?? ''));
/** O aproveitamento em % (de 1 a 100); vazio ou escrito errado: 100. */
export const aprovPct = (ins) => { try { return Math.round(C.aproveitamentoDe(ins) * 1000) / 10; } catch { return 100; } };
const pctTxt = (n) => `${String(Math.round(n * 10) / 10).replace('.', ',')}%`;
const exTag = (sim) => (sim ? ' <i class="ex">exemplo</i>' : '');

/** O tamanho em que a receita foi escrita (o da 1ª base que diz): a grande. */
export const tamanhoDaReceita = (d) => d.bases.find((b) => b.tamanho && d.tamanhos?.some((t) => t.id === b.tamanho))?.tamanho ?? null;
const temDiametro = (d, id) => { const t = d.tamanhos?.find((x) => x.id === id); return Boolean(t && diametroDe0(t)); };
function diametroDe0(t) { try { return C.diametroDe(t); } catch { return 0; } }
/** A cozinha tem tamanhos (a broto, a média) e a base diz em que tamanho a receita foi escrita (com o diâmetro dele)? */
export const temTamanhos = (d) => (d.tamanhos?.length ?? 0) > 0 && temDiametro(d, tamanhoDaReceita(d));
/** O tamanho que está na tela: o escolhido (se tiver o diâmetro), ou o da receita. Sem tamanhos: null. */
export function tamanhoAtual(estado) {
  const d = estado.dados;
  if (!temTamanhos(d)) return null;
  return temDiametro(d, estado.tamanho) ? estado.tamanho : tamanhoDaReceita(d);
}
export const nomeDoTamanho = (d, id) => d.tamanhos?.find((t) => t.id === id)?.nome ?? '';
export const diametroOu = (t) => { try { return C.diametroDe(t); } catch { return null; } };
const comTamanho = (d, p) => Boolean(p && (p.base || d.adicionais.some((a) => a.id === p.id)));
/** O preço (em centavos) que a pessoa digitou, ou null: 42, "42", "42,50", "1.500" → 4200, 4200, 4250, 150000. */
export const emCentavos = (v) => { try { const c = centavos(v); return c > 0 ? c : null; } catch { return null; } };
const cmTxt = (n) => `${String(Math.round(n * 10) / 10).replace('.', ',')} cm`;

/** Onde mora o preço do produto (ou do adicional) no tamanho: no da receita, em precos; nos outros, em precos_tamanho. */
export function caminhoDoPreco(estado, lista, i) {
  const d = estado.dados;
  const p = d[lista]?.[i];
  const t = tamanhoAtual(estado);
  if (!t || !comTamanho(d, p) || t === tamanhoDaReceitaDe(d, p)) return `${lista}.${i}.precos`;
  return `${lista}.${i}.precos_tamanho.${t}`;
}
/** O tamanho em que a receita do produto foi escrita: o da base dele (a pizza) ou o do adicional. */
export const tamanhoDaReceitaDe = (d, p) => (p?.base ? d.bases.find((b) => b.id === p.base)?.tamanho : p?.tamanho) ?? tamanhoDaReceita(d);
const precosDe = (estado, lista, i) => caminhoDoPreco(estado, lista, i).split('.').reduce((o, k) => o?.[/^\d+$/.test(k) ? Number(k) : k], estado.dados) ?? {};

/**
 * A ficha do produto na tela: no tamanho escolhido (a pizza e o adicional) e com os adicionais ligados, se pedir.
 * Feita 1 vez por conta (a conta da cozinha refeita a cada tecla zera o guardado). Sem tamanho e sem adicional: a da cozinha.
 */
export function fichaNaTela(e, id, { adicionais = [], tamanho = tamanhoAtual(e) } = {}) {
  const d = e.dados;
  const p = d.cardapio.find((x) => x.id === id) ?? d.adicionais.find((x) => x.id === id);
  const t = tamanho && comTamanho(d, p) ? tamanho : null;
  const extras = p?.base ? adicionais.filter((a) => a !== id && d.adicionais.some((x) => x.id === a)) : [];
  if (!t && !extras.length) return e.calc.produtos.get(id) ?? e.calc.adicionais.get(id);
  const chave = `${id}|${t ?? ''}|${extras.join(',')}`;
  e.calc.fichas = e.calc.fichas ?? new Map();
  if (!e.calc.fichas.has(chave)) {
    try { e.calc.fichas.set(chave, C.fichaDoProduto(d, id, e.tab, { completa: e.completa, receitas: e.calc.receitas, tamanho: t, adicionais: extras })); }
    catch (err) { e.calc.fichas.set(chave, { erro: err.erros ?? [err.message] }); }
  }
  return e.calc.fichas.get(chave);
}

/** O meio a meio na tela: no tamanho escolhido (no da receita, o da cozinha). */
export function meioNaTela(e) {
  const t = tamanhoAtual(e);
  if (!t || t === tamanhoDaReceita(e.dados) || !e.calc.meio || e.calc.meio.erro) return e.calc.meio;
  e.calc.meios = e.calc.meios ?? new Map();
  if (!e.calc.meios.has(t)) {
    try { e.calc.meios.set(t, C.meioAMeio(e.dados, e.dados.meio_a_meio.sabores, e.tab, { completa: e.completa, receitas: e.calc.receitas, tamanho: t })); }
    catch (err) { e.calc.meios.set(t, { erro: err.erros ?? [err.message] }); }
  }
  return e.calc.meios.get(t);
}

/** Os adicionais ligados que valem pra este produto (só a pizza leva a borda). */
export const extrasDe = (estado, id) => (estado.dados.cardapio.find((p) => p.id === id)?.base ? [...estado.adicionaisLigados].filter((a) => estado.dados.adicionais.some((x) => x.id === a)) : []);

export function nomeDe(d, id) {
  for (const lista of [d.despensa, d.receitas, d.cardapio, d.adicionais, d.bases]) {
    const x = (lista ?? []).find((i) => i.id === id);
    if (x) return x.nome || 'sem nome';
  }
  return id;
}

// as cores dos sabores (só as da marca), para a pizza do meio a meio e os pontos
const CORES = ['#F9C748', '#FF6B1A', '#a6e02e', '#f7f4ec', '#d2852e', '#ffd96e'];
export const corDo = (d, id) => CORES[Math.max(0, d.cardapio.findIndex((p) => p.id === id)) % CORES.length];

// ---------- os 5 passos ----------

export const PASSOS = [
  { id: 'despensa', n: 1, nome: 'Despensa', titulo: 'A <em class="brilha">despensa</em>',
    sub: () => 'Tudo o que você compra: o pacote, o preço, quanto sobra depois de limpar e quanto tem agora. Mexa no preço ou no aproveitamento de um item e veja a conta descer até o cardápio.' },
  { id: 'receitas', n: 2, nome: 'Receitas da casa', titulo: 'As receitas <em class="brilha">da casa</em>',
    sub: () => 'O que você faz antes de vender: o molho, a massa, o tempero. Cada uma tem a ficha dela, e uma pode ir dentro da outra.' },
  { id: 'cardapio', n: 3, nome: 'Cardápio', titulo: 'O <em class="brilha">cardápio</em>',
    sub: (d) => (d.bases?.length
      ? 'O que você vende. Cada sabor leva a base da pizza e a cobertura dele. Abra um sabor para ver a ficha e a pizza por dentro.'
      : 'O que você vende. Abra um produto para ver a ficha e o que vai nele, camada por camada.') },
  { id: 'meio', n: 4, nome: 'Meio a meio', titulo: 'Meio a <em class="brilha">meio</em>',
    sub: () => 'A base vai inteira e cada cobertura vai pela metade. Toque numa metade pra trocar o sabor e veja quanto sobra em cada jeito de cobrar.' },
  { id: 'compras', n: 5, nome: 'Lista de compras', titulo: 'A lista de <em class="brilha">compras</em>',
    sub: () => 'Diga quanto vai fazer na semana. A conta desce pelas camadas (a pizza, o molho, o tomate), tira o estoque e diz o que comprar.' },
];

function cabecalho(estado, p) {
  const d = estado.dados;
  return `<header class="passo-cab">
    <div class="progresso" aria-hidden="true">${PASSOS.map((x) => `<i class="${x.n < p.n ? 'feito' : x.n === p.n ? 'agora' : ''}"></i>`).join('')}</div>
    <p class="chapeu">Passo ${p.n} de 5<span class="cab-cozinha"> · ${esc(d.negocio || 'Minha cozinha')}</span> ${selo(d)}</p>
    <h1 id="t-passo">${p.titulo}</h1>
    <p class="sub">${p.sub(d)}</p>
    <div data-saida="simulando"></div>
  </header>`;
}

function fimDoPasso(p) {
  const ant = PASSOS[p.n - 2];
  const prox = PASSOS[p.n];
  return `<nav class="passo-fim" aria-label="Os passos">
    ${ant ? `<a class="botao claro" href="#${ant.id}"><span aria-hidden="true">←</span> ${ant.nome}</a>` : '<span></span>'}
    ${prox ? `<a class="botao" href="#${prox.id}">Próximo: ${prox.nome} <span aria-hidden="true">→</span></a>` : '<a class="botao" href="#despensa">Voltar ao começo</a>'}
  </nav>`;
}

// ---------- as peças do editor ----------

function campo(rotulo, caminho, valor, { dica = '', modo = '', classe = '', ajuda = '' } = {}) {
  return `<label class="campo ${classe}"><span class="campo-rot">${rotulo}</span><input data-e="${caminho}" value="${esc(valor ?? '')}" placeholder="${esc(dica)}" autocomplete="off" spellcheck="false"${modo ? ` inputmode="${modo}"` : ''}>${ajuda ? `<small>${ajuda}</small>` : ''}</label>`;
}

function campoEstoque(rotulo, caminho, valor, nome) {
  const id = `r-${caminho.replace(/\./g, '-')}`;
  return `<div class="campo campo-passo"><span class="campo-rot" id="${id}">${rotulo}</span><div class="passo-num">
    <button type="button" class="pn" data-acao="pacote" data-alvo="${caminho}" data-v="-1" aria-label="${esc(nome)}: 1 pacote a menos (segure pra ir mais rápido)">−</button>
    <input data-e="${caminho}" value="${esc(valor ?? '')}" placeholder="0" autocomplete="off" spellcheck="false" aria-labelledby="${id}" aria-describedby="dica-setas">
    <button type="button" class="pn" data-acao="pacote" data-alvo="${caminho}" data-v="1" aria-label="${esc(nome)}: 1 pacote a mais (segure pra ir mais rápido)">+</button>
  </div></div>`;
}

const CATEGORIAS = ['Massa e secos', 'Hortifrúti', 'Temperos', 'Frios', 'Carnes', 'Bebidas', 'Ingredientes', 'Embalagens', 'Outros'];
export const categorias = (d) => [...new Set(d.despensa.map((i) => i.categoria || 'Outros'))];
const opcoesCategoria = (atual) => [...new Set([...CATEGORIAS, atual || 'Outros'])]
  .map((c) => `<option${c === (atual || 'Outros') ? ' selected' : ''}>${esc(c)}</option>`).join('');

function opcoesUsa(d, atual, exceto) {
  const ins = d.despensa.map((i) => `<option value="${esc(i.id)}"${i.id === atual ? ' selected' : ''}>${esc(i.nome || 'sem nome')}</option>`).join('');
  const rec = d.receitas.filter((r) => r.id !== exceto)
    .map((r) => `<option value="${esc(r.id)}"${r.id === atual ? ' selected' : ''}>${esc(r.nome || 'sem nome')}</option>`).join('');
  const existe = d.despensa.some((i) => i.id === atual) || d.receitas.some((r) => r.id === atual && r.id !== exceto);
  return `<option value=""${atual ? '' : ' selected'}>Escolha o que vai…</option>${atual && !existe ? `<option value="${esc(atual)}" selected>(saiu da despensa)</option>` : ''}`
    + `<optgroup label="Da despensa">${ins}</optgroup>${rec ? `<optgroup label="Receitas da casa">${rec}</optgroup>` : ''}`;
}

function linhaUsa(d, caminho, l, { exceto = null, saida = '', lista, j, dica = '150 g', nova = false }) {
  return `<div class="linha-usa${nova ? ' nova' : ''}">
    <label class="campo campo-usa"><span class="so-leitor">O que vai</span><select data-e="${caminho}.usa">${opcoesUsa(d, l.usa, exceto)}</select></label>
    <label class="campo campo-vai"><span class="so-leitor">Quanto vai</span><input data-e="${caminho}.vai" value="${esc(l.vai ?? '')}" placeholder="${esc(dica)}" autocomplete="off" spellcheck="false"></label>
    <span class="linha-custo" ${saida}></span>
    <button type="button" class="tirar" data-acao="tirar-linha" data-lista="${lista}" data-j="${j}" aria-label="Tirar esta linha">×</button>
  </div>`;
}

/** O "+ adicionar": os itens da despensa e as receitas da casa (menos as que dariam receita dentro dela mesma), num toque. */
function pegaHtml(estado, lista, exceto) {
  const d = estado.dados;
  const aberto = estado.pegaAberto === lista;
  const proibidas = exceto ? new Set([exceto, ...C.ondeEntra(d, exceto).receitas]) : new Set();
  const chip = (x, receita) => `<button type="button" class="chip-c pega-chip${receita ? ' receita' : ''}" data-acao="por" data-lista="${lista}" data-id="${esc(x.id)}">${esc(x.nome || 'sem nome')}${receita ? '<small>receita</small>' : ''}</button>`;
  return `<button type="button" class="botao-linha" data-acao="pega" data-lista="${lista}" aria-expanded="${aberto}">${aberto ? 'Fechar' : '+ adicionar'}</button>
    ${aberto ? `<div class="pega" role="group" aria-label="Pôr na receita"><p class="pega-rot">Toque no que vai na receita</p><div class="pega-lista">${d.despensa.map((i) => chip(i, false)).join('')}${d.receitas.filter((r) => !proibidas.has(r.id)).map((r) => chip(r, true)).join('')}</div></div>` : ''}`;
}

// ---------- 1. a despensa ----------

function ondeHtml(estado, ins) {
  const id = esc(ins.id);
  const pct = estado.simula.get(ins.id)?.pct ?? 0;
  // o que o leitor de tela fala na faixa: a mudança e o preço do pacote de agora
  let valor = textoPct(pct);
  try { valor = `${textoPct(pct)}: ${F.reais(Math.round(C.precoSimulado(ins.preco_pacote, 0) * 100))} o pacote`; } catch { /* sem preço ainda */ }
  return `<div class="onde" data-onde="${id}">
    <div class="onde-mexe">
    <div class="simula">
      <div class="simula-cab"><p class="simula-rot">E se o preço mudar?</p><b class="simula-pct${pct > 0 ? ' sobe' : pct < 0 ? ' desce' : ''}" data-simula-pct="${id}">${textoPct(pct)}</b></div>
      <input type="range" class="faixa simula-faixa" data-simula="${id}" min="-50" max="100" step="1" value="${pct}" aria-label="E se o preço de ${esc(ins.nome)} mudar? De 50% mais barato a 100% mais caro" aria-valuetext="${esc(valor)}">
      <div class="simula-marcas" aria-hidden="true"><span style="--p:0">−50%</span><span style="--p:.3333">hoje</span><span style="--p:.6667">+50%</span><span style="--p:1">+100%</span></div>
      <p class="simula-dica">Arraste: a conta desce pelas camadas até o cardápio. É só uma simulação: o preço não muda.</p>
      <button type="button" class="botao-mini simula-volta" data-acao="preco-hoje" data-id="${id}"${pct ? '' : ' hidden'}>Voltar ao preço de hoje</button>
      <p class="so-leitor" aria-live="polite" data-simula-fala="${id}"></p>
    </div>
    ${aprovHtml(estado, ins)}
    </div>
    <div class="cascata" data-cascata="${id}"><span class="ce-pulso" aria-hidden="true"></span><div class="ce-corpo" data-saida="efeito" data-id="${id}"></div></div>
  </div>`;
}

// (camadas a fundo) E SE APROVEITAR MAIS (OU MENOS)? a faixa do aproveitamento: o quilo limpo e as fichas mudam juntos
export const APROV_MIN = 20;
function aprovHtml(estado, ins) {
  const id = esc(ins.id);
  const i = estado.dados.despensa.indexOf(ins);
  const v = aprovPct(ins);
  const mexendo = estado.simulaAprov.has(ins.id);
  const marca = (n) => `<span style="--p:${((n - APROV_MIN) / (100 - APROV_MIN)).toFixed(4)}">${n}%</span>`;
  return `<div class="simula aprov">
      <div class="simula-cab"><p class="simula-rot">E se aproveitar mais (ou menos)?${exTag(ins.aproveitamento_exemplo && !mexendo)}</p><b class="simula-pct aprov-pct" data-aprov-pct="${id}">${pctTxt(v)}</b></div>
      <input type="range" class="faixa aprov-faixa" data-aprov="${id}" min="${APROV_MIN}" max="100" step="1" value="${Math.max(APROV_MIN, Math.round(v))}" aria-label="O aproveitamento de ${esc(ins.nome)}: o que sobra depois de limpar, de ${APROV_MIN}% a 100%" aria-valuetext="${esc(textoDoAprov(estado, ins))}">
      <div class="simula-marcas" aria-hidden="true">${marca(APROV_MIN)}${marca(50)}${marca(75)}${marca(100)}</div>
      <p class="aprov-conta" data-saida="aprov-conta" data-id="${id}"></p>
      <label class="campo aprov-sai"><span class="campo-rot">O que sai na limpeza</span><input data-e="despensa.${i}.sai" value="${esc(ins.sai ?? '')}" placeholder="a casca, o talo, o osso" autocomplete="off" spellcheck="false"></label>
      <button type="button" class="botao-mini simula-volta" data-acao="aprov-hoje" data-id="${id}"${mexendo ? '' : ' hidden'}>Voltar ao aproveitamento de hoje</button>
      <p class="so-leitor" aria-live="polite" data-aprov-fala="${id}"></p>
    </div>`;
}

/** O que a faixa do aproveitamento fala (e o leitor de tela lê): "90%: 1 kg comprado dá 900 g limpo, o kg limpo sai R$ 8,89". */
export function textoDoAprov(estado, ins) {
  const x = estado.calc?.insumos?.get(ins.id);
  const v = aprovPct(ins);
  if (!x || x.erro) return `${pctTxt(v)} de aproveitamento`;
  const pac = x.pacote;
  return `${pctTxt(v)}: ${q(pac, x.unidade)} comprado dá ${q(x.pacote_limpo, x.unidade)} limpo, ${C.mostrarPrecoPor(x.por_limpo).replace(/ o (kg|litro)$/, ' o $1 limpo')}`;
}

function linhaInsumo(estado, ins, i) {
  const p = `despensa.${i}`;
  const aberto = estado.aberto === ins.id;
  const editando = estado.editando === ins.id;
  const simulando = (estado.simula.get(ins.id)?.pct ?? 0) !== 0;
  // no celular o cartão começa fechado (o nome, o custo e o estoque); toca e abre para mudar
  return `<article class="insumo${aberto ? ' aberto' : ''}${editando ? ' editando' : ''}${simulando ? ' em-simulacao' : ''}" data-id="${esc(ins.id)}">
    <button type="button" class="insumo-topo" data-acao="editar-insumo" data-id="${esc(ins.id)}" aria-expanded="${editando}">
      <span class="insumo-titulo" data-saida="nome-insumo" data-id="${esc(ins.id)}">${esc(ins.nome || 'Insumo novo')}</span><span class="insumo-seta">mudar</span>
    </button>
    <div class="insumo-nome">
      <input class="nome-grande" data-e="${p}.nome" value="${esc(ins.nome)}" aria-label="O nome do insumo" placeholder="Ex.: Farinha de trigo" autocomplete="off" spellcheck="false">
      <select class="cat" data-e="${p}.categoria" aria-label="A categoria de ${esc(ins.nome)}">${opcoesCategoria(ins.categoria)}</select>
    </div>
    ${campo('O pacote', `${p}.pacote`, ins.pacote, { dica: '1 kg', classe: 'c-pacote' })}
    ${campo('Preço do pacote', `${p}.preco_pacote`, dinheiro(ins.preco_pacote), { dica: '5,00', modo: 'decimal', classe: 'c-preco' })}
    ${campo('Aproveita', `${p}.aproveitamento`, textoAprov(ins.aproveitamento), { dica: '100%', modo: 'decimal', classe: 'c-aprov' })}
    ${campoEstoque('Tem agora', `${p}.estoque`, ins.estoque, ins.nome)}
    ${campo('Mínimo', `${p}.minimo`, ins.minimo, { dica: '2 kg', classe: 'c-minimo' })}
    <div class="insumo-saida" data-saida="insumo" data-id="${esc(ins.id)}"></div>
    <div class="insumo-acoes">
      <button type="button" class="botao-mini" data-acao="onde" data-id="${esc(ins.id)}" aria-expanded="${aberto}" aria-label="E se o preço de ${esc(ins.nome || 'este insumo')} mudar?">Simular</button>
      <button type="button" class="botao-mini insumo-pronto" data-acao="editar-insumo" data-id="${esc(ins.id)}">Pronto</button>
      <button type="button" class="tirar" data-acao="tirar-insumo" data-i="${i}" aria-label="Tirar ${esc(ins.nome)} da despensa">×</button>
    </div>
    ${aberto ? ondeHtml(estado, ins) : ''}
  </article>`;
}

export function telaDespensa(estado) {
  const d = estado.dados;
  const f = estado.filtro;
  const passa = (ins) => f === 'todos' || (f === 'falta' ? estado.calc.insumos.get(ins.id)?.abaixo : (ins.categoria || 'Outros') === f);
  const linhas = d.despensa.map((ins, i) => (passa(ins) ? linhaInsumo(estado, ins, i) : '')).join('');
  const chips = [['todos', 'Tudo'], ...categorias(d).map((c) => [c, c]), ['falta', 'Abaixo do mínimo']];
  return `<section class="passo" aria-labelledby="t-passo">
    ${cabecalho(estado, PASSOS[0])}
    <div class="placar" data-saida="placar-despensa"></div>
    ${d.despensa.length ? `<div class="chips filtros" role="group" aria-label="Mostrar na lista">${chips.map(([id, nome]) => `<button type="button" class="chip" data-acao="filtro" data-id="${esc(id)}" aria-pressed="${f === id}">${esc(nome)}</button>`).join('')}</div>` : ''}
    <div class="despensa">
      ${d.despensa.length ? '<div class="despensa-cab" aria-hidden="true"><span>Insumo</span><span>O pacote</span><span>Preço do pacote</span><span>Aproveita</span><span>Tem agora</span><span>Mínimo</span><span>O custo e o estoque</span><span></span></div>' : ''}
      ${linhas || `<p class="vazio">${d.despensa.length ? 'Nada nesse filtro.' : 'Comece pelo que você compra: a farinha, o queijo, a caixa. O pacote e o preço estão na nota.'}</p>`}
    </div>
    <button type="button" class="botao-linha" data-acao="mais-insumo">+ insumo</button>
    <p class="ajuda dica-setas" id="dica-setas">No estoque e no plano: segure o + ou o − pra ir mais rápido; no campo, as setas ↑ ↓ (com Shift, de 10 em 10).</p>
    ${fimDoPasso(PASSOS[0])}
  </section>`;
}

// ---------- 2. as receitas da casa ----------

function cartaoReceita(estado, r, i) {
  const d = estado.dados;
  const p = `receitas.${i}`;
  return `<article class="receita vidro-leve" id="receita-${esc(r.id)}" data-id="${esc(r.id)}" data-solta="${p}.itens">
    <header class="receita-cab">
      <input class="nome-grande" data-e="${p}.nome" value="${esc(r.nome)}" aria-label="O nome da receita" placeholder="Ex.: Molho de tomate" autocomplete="off" spellcheck="false">
      <span data-saida="receita-camada" data-id="${esc(r.id)}"></span>
      <button type="button" class="tirar" data-acao="tirar-receita" data-i="${i}" aria-label="Tirar a receita ${esc(r.nome)}">×</button>
    </header>
    <div class="receita-campos">
      ${campo('A receita rende', `${p}.rende`, r.rende, { dica: '2 kg ou 8 un' })}
      ${campo('Já tem pronto', `${p}.pronto`, r.pronto, { dica: '0', ajuda: 'entra na lista de compras' })}
    </div>
    ${perdaHtml(estado, r, i)}
    <div class="linhas-cab" aria-hidden="true"><span>O que vai</span><span>Quanto</span><span>Custo</span><span></span></div>
    <div class="linhas">${(r.itens ?? []).map((l, j) => linhaUsa(d, `${p}.itens.${j}`, l, { exceto: r.id, saida: `data-saida="linha-receita" data-id="${esc(r.id)}" data-j="${j}"`, lista: `${p}.itens`, j, nova: estado.linhaNova === l })).join('')}</div>
    ${pegaHtml(estado, `${p}.itens`, r.id)}
    <p class="solta-aqui" aria-hidden="true">Solte aqui pra pôr na receita</p>
    <footer class="receita-total" data-saida="receita" data-id="${esc(r.id)}"></footer>
  </article>`;
}

// (camadas a fundo) A PERDA NO PREPARO: o que entra (limpo) e o que a receita rende. A faixa muda o "rende" (o molho que
// reduz mais no fogo rende menos, e o quilo dele sai mais caro). A faixa fica fora da saída: o dedo não perde ela.
export const PERDA_MAX = 80;
export const faixaDaPerda = (perda) => ({ min: Math.min(0, Math.floor(perda * 100) - 10), max: Math.max(PERDA_MAX, Math.ceil(perda * 100) + 5) });
function perdaHtml(estado, r, i) {
  const feita = estado.calc?.receitas?.get(r.id);
  const id = esc(r.id);
  const temFaixa = feita && !feita.erro && feita.perda !== null && feita.entra?.valor > 0;
  const faixa = temFaixa ? faixaDaPerda(feita.perda) : null;
  return `<div class="perda" data-perda-caixa="${id}">
      <div class="perda-saida" data-saida="perda" data-id="${id}"></div>
      ${temFaixa ? `<div class="perda-mexe" data-perda-mexe="${id}">
        <label class="perda-rot" for="perda-${id}">Quanto perde no preparo</label>
        <input type="range" class="faixa perda-faixa" id="perda-${id}" data-perda="receitas.${i}" data-id="${id}" min="${faixa.min}" max="${faixa.max}" step="0.5" value="${(Math.round(feita.perda * 200) / 2).toFixed(1)}" aria-valuetext="${esc(textoDaPerda(feita))}">
        <p class="ajuda">Arraste: o quanto ela rende muda, e o quilo dela também.</p>
      </div>` : ''}
    </div>`;
}

/** A perda em texto: "perde 25,2% no preparo: entra 2,68 kg e rende 2 kg". */
export function textoDaPerda(feita) {
  if (!feita || feita.perda === null || !feita.entra) return '';
  const entra = q(feita.entra.valor, feita.entra.unidade);
  const rende = q(feita.rende.valor, feita.rende.unidade);
  return feita.perda >= 0 ? `perde ${pctTxt(feita.perda * 100)} no preparo: entra ${entra} e rende ${rende}` : `rende ${pctTxt(-feita.perda * 100)} a mais do que entra: entra ${entra} e rende ${rende}`;
}

export function telaReceitas(estado) {
  const d = estado.dados;
  const arrasta = d.receitas.length && (d.despensa.length || d.receitas.length > 1)
    ? `<div class="arrasta-faixa" aria-hidden="true"><p class="arrasta-rot"><b>Arraste da despensa</b> pra dentro de uma receita</p><div class="arrasta-lista">${d.despensa.map((ins) => `<span class="chip-c arrasta-chip" data-arrasta="${esc(ins.id)}">${esc(ins.nome || 'sem nome')}</span>`).join('')}${d.receitas.map((r) => `<span class="chip-c arrasta-chip receita" data-arrasta="${esc(r.id)}">${esc(r.nome || 'sem nome')}<small>receita</small></span>`).join('')}</div></div>`
    : '';
  return `<section class="passo" aria-labelledby="t-passo">
    ${cabecalho(estado, PASSOS[1])}
    ${d.receitas.length ? '<div class="escada-caixa vidro"><p class="palco-rot"><span>As camadas da cozinha</span><span class="ao-vivo">Ao vivo</span></p><div data-saida="camadas"></div></div>' : ''}
    ${arrasta}
    <div class="receitas">${d.receitas.map((r, i) => cartaoReceita(estado, r, i)).join('') || '<p class="vazio">Faz molho, massa ou tempero? Cada um vira uma receita da casa, com a ficha dele. Depois ele entra no produto como qualquer ingrediente.</p>'}</div>
    <button type="button" class="botao-linha" data-acao="mais-receita">+ receita da casa</button>
    ${fimDoPasso(PASSOS[1])}
  </section>`;
}

// ---------- 3. o cardápio ----------

function cartaoBase(estado, b, i) {
  const d = estado.dados;
  const p = `bases.${i}`;
  const usam = d.cardapio.filter((x) => x.base === b.id).length;
  const linhas = (g, dica) => (b[g] ?? []).map((l, j) => linhaUsa(d, `${p}.${g}.${j}`, l, { saida: `data-saida="linha-base" data-id="${esc(b.id)}" data-g="${g}" data-j="${j}"`, lista: `${p}.${g}`, j, dica })).join('');
  return `<article class="base vidro" id="base-${esc(b.id)}">
    <div class="base-cab">
      <div class="base-nome"><p class="chapeu">A base · vai em ${usam} ${usam === 1 ? 'sabor' : 'sabores'}</p>
        <input class="nome-grande" data-e="${p}.nome" value="${esc(b.nome)}" aria-label="O nome da base" autocomplete="off" spellcheck="false"></div>
      <div class="base-total" data-saida="base-total" data-id="${esc(b.id)}"></div>
    </div>
    <p class="ajuda">${temTamanhos(d) && b.tamanho ? `A receita é a da ${esc(nomeDoTamanho(d, b.tamanho).toLowerCase())}: os outros tamanhos levam pela área do disco. ` : 'O que vai em todo sabor deste tamanho. '}Mude o molho aqui e todas as pizzas mudam. No meio a meio, a base vai inteira.</p>
    <div class="base-colunas">
      <div><p class="linhas-rot">Ingredientes da base${temTamanhos(d) && b.tamanho ? ` (na ${esc(nomeDoTamanho(d, b.tamanho).toLowerCase())})` : ''}</p><div class="linhas">${linhas('itens', '1 un')}</div>
        <button type="button" class="botao-linha" data-acao="mais-linha" data-lista="${p}.itens">+ ingrediente</button></div>
      <div><p class="linhas-rot">A embalagem</p><div class="linhas">${linhas('embalagem', '1 un')}</div>
        <button type="button" class="botao-linha" data-acao="mais-linha" data-lista="${p}.embalagem">+ embalagem</button></div>
    </div>
    ${i === 0 ? tamanhosEditor(estado, b, i) : ''}
  </article>`;
}

// (camadas a fundo) OS TAMANHOS: o nome, o diâmetro e a caixa de cada um; a receita da base é escrita num deles
function tamanhosEditor(estado, b, i) {
  const d = estado.dados;
  if (!d.tamanhos.length) return '<button type="button" class="botao-linha" data-acao="mais-tamanhos">+ tamanhos (broto, média e grande)</button>';
  const opcoes = d.tamanhos.map((t) => `<option value="${esc(t.id)}"${t.id === b.tamanho ? ' selected' : ''}>${esc(t.nome || 'sem nome')}</option>`).join('');
  return `<details class="tam-editor vidro-leve" data-guarda="tamEditorAberto"${estado.tamEditorAberto ? ' open' : ''}>
    <summary><span>Os tamanhos${exTag(d.tamanhos_exemplo)}</span><small>o nome, o diâmetro e a caixa de cada um</small></summary>
    <div class="tam-editor-corpo">
      <label class="campo"><span class="campo-rot">A receita da base e das coberturas é a da</span><select data-e="bases.${i}.tamanho"><option value=""${b.tamanho ? '' : ' selected'}>Escolha o tamanho…</option>${opcoes}</select></label>
      <div class="tam-linhas">${d.tamanhos.map((t, j) => {
        const daReceita = t.id === b.tamanho;
        return `<div class="tam-linha">
        <div class="tam-linha-cab">${campo('O tamanho', `tamanhos.${j}.nome`, t.nome, { dica: 'Broto' })}${campo('Diâmetro (cm)', `tamanhos.${j}.diametro`, t.diametro, { dica: '25', modo: 'decimal' })}<button type="button" class="tirar" data-acao="tirar-tamanho" data-j="${j}" aria-label="Tirar o tamanho ${esc(t.nome || '')}">×</button></div>
        ${daReceita ? '<p class="ajuda">A caixa deste tamanho é a da base, aqui em cima.</p>' : `<p class="linhas-rot">A caixa ${t.nome ? `da ${esc(t.nome.toLowerCase())}` : 'deste tamanho'} (vazia: a da base)</p>
        <div class="linhas">${(t.embalagem ?? []).map((l, k) => linhaUsa(d, `tamanhos.${j}.embalagem.${k}`, l, { saida: `data-saida="linha-tam" data-t="${esc(t.id)}" data-k="${k}"`, lista: `tamanhos.${j}.embalagem`, j: k, dica: '1 un' })).join('')}</div>
        <button type="button" class="botao-linha" data-acao="mais-linha" data-lista="tamanhos.${j}.embalagem">+ embalagem</button>`}
      </div>`;
      }).join('')}</div>
      <button type="button" class="botao-linha" data-acao="mais-tamanho">+ tamanho</button>
    </div>
  </details>`;
}

/** Os botões do tamanho (a broto, a média, a grande), com o diâmetro. O tamanho sem diâmetro fica apagado. */
export function chipsDoTamanho(estado, { rotulo = 'O tamanho da pizza' } = {}) {
  const d = estado.dados;
  const atual = tamanhoAtual(estado);
  return `<div class="chips tam-chips" role="group" aria-label="${esc(rotulo)}" data-tam-chips>${d.tamanhos.map((t) => {
    const cm = diametroOu(t);
    return `<button type="button" class="chip tam-chip" data-acao="tamanho" data-id="${esc(t.id)}" aria-pressed="${t.id === atual}"${cm ? '' : ' disabled'}><b>${esc(t.nome || 'Sem nome')}</b><small>${cm ? cmTxt(cm) : 'falta o diâmetro'}</small></button>`;
  }).join('')}</div>`;
}

/** A caixa do tamanho no cardápio: o desenho da pizza (que cresce e diminui) e os botões. */
function tamanhosHtml(estado) {
  const d = estado.dados;
  if (!temTamanhos(d)) return '';
  return `<section class="tamanhos vidro" aria-labelledby="t-tamanhos">
    <div class="tam-disco" data-saida="tam-disco" aria-hidden="true"></div>
    <div class="tam-texto">
      <p class="palco-rot"><span id="t-tamanhos">O tamanho</span>${d.tamanhos_exemplo ? '<span class="selo-exemplo">exemplo</span>' : '<span class="ao-vivo">Toque e veja</span>'}</p>
      ${chipsDoTamanho(estado)}
      <p class="tam-nota" data-saida="tam-nota" aria-live="polite"></p>
    </div>
  </section>`;
}

/** O preço do produto no tamanho que está na tela: os campos do balcão e do app (no produto, com a faixa que se arrasta). */
export function precosDoTamanho(estado, { lista, i, faixa }) {
  const d = estado.dados;
  const p = d[lista]?.[Number(i)];
  if (!p) return '';
  const c = caminhoDoPreco(estado, lista, Number(i));
  const pr = precosDe(estado, lista, Number(i));
  const t = tamanhoAtual(estado);
  const naT = t && comTamanho(d, p) ? ` (na ${esc(nomeDoTamanho(d, t).toLowerCase())})` : '';
  // o preço de exemplo (o adicional novo, ou o preço da broto e da média) leva a marca
  const ex = exTag(p.preco_exemplo || (Boolean(t) && d.tamanhos_exemplo && t !== tamanhoDaReceitaDe(d, p) && Boolean(p.precos_tamanho)));
  if (lista === 'adicionais' && !faixa) return campo(`Você cobra${naT}${ex}`, `${c}.balcao`, dinheiro(pr.balcao), { modo: 'decimal', dica: '10,00' });
  const campos = `<div class="preco-campos">
      ${campo(`No balcão${naT}${ex}`, `${c}.balcao`, dinheiro(pr.balcao), { modo: 'decimal', dica: '45,00' })}
      ${lista === 'adicionais' ? '' : campo(`No app${naT}`, `${c}.app`, dinheiro(pr.app), { modo: 'decimal', dica: 'se vende' })}
    </div>`;
  if (!faixa) return campos;
  const x = fichaNaTela(estado, p.id);
  const insumos = x?.ficha?.totais.insumos_c ?? 0;
  const atual = (emCentavos(pr.balcao) ?? 0) / 100;
  const min = Math.max(1, Math.floor(insumos / 100));
  const max = Math.max(min + 10, Math.ceil(Math.max(atual * 2, (insumos / 100) * 4)));
  return `${campos}
    <input type="range" class="faixa" data-faixa="${c}.balcao" min="${min}" max="${max}" step="0.5" value="${Math.min(max, Math.max(min, atual || min))}" aria-label="O preço no balcão${naT.replace(/[()]/g, '')}, de ${min} a ${max} reais">
    <div class="faixa-rot" aria-hidden="true"><span>${min} reais</span><span>${max} reais</span></div>`;
}

function adicionaisHtml(estado) {
  const d = estado.dados;
  if (!d.adicionais.length && !d.bases.length) return '';
  const comT = temTamanhos(d);
  const cresce = (a, i) => (comT ? `<label class="campo campo-cresce"><span class="campo-rot">Nos tamanhos</span><select data-e="adicionais.${i}.cresce">${[['area', 'vai por cima: cresce pela área'], ['borda', 'vai na borda: cresce pelo contorno'], ['fixo', 'igual em todo tamanho']]
    .map(([v, n]) => `<option value="${v}"${(a.cresce || 'area') === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` : '');
  return `<section class="adicionais" aria-labelledby="t-adicionais">
    <h2 class="titulo-secao" id="t-adicionais">Os adicionais</h2>
    <p class="ajuda">O que se cobra à parte, como a borda recheada. Cada um tem a conta dele${comT ? ', em cada tamanho: a borda cresce pelo contorno da pizza, o que vai por cima cresce pela área' : ''}.</p>
    <div class="adicionais-lista">${d.adicionais.map((a, i) => `
      <article class="adicional vidro-leve" id="adicional-${esc(a.id)}">
        <div class="adicional-topo"><input class="nome-medio" data-e="adicionais.${i}.nome" value="${esc(a.nome)}" aria-label="O nome do adicional" autocomplete="off" spellcheck="false">
          <button type="button" class="tirar" data-acao="tirar-adicional" data-i="${i}" aria-label="Tirar ${esc(a.nome)}">×</button></div>
        <div class="linhas">${(a.itens ?? []).map((l, j) => linhaUsa(d, `adicionais.${i}.itens.${j}`, l, { saida: `data-saida="linha-adicional" data-id="${esc(a.id)}" data-j="${j}"`, lista: `adicionais.${i}.itens`, j, dica: '80 g' })).join('')}</div>
        <button type="button" class="botao-linha" data-acao="mais-linha" data-lista="adicionais.${i}.itens">+ ingrediente</button>
        ${cresce(a, i)}
        <div class="adicional-preco"><div data-precos-tamanho data-lista="adicionais" data-i="${i}">${precosDoTamanho(estado, { lista: 'adicionais', i })}</div>
          <div class="adicional-conta" data-saida="adicional" data-id="${esc(a.id)}"></div></div>
      </article>`).join('')}</div>
    <button type="button" class="botao-linha" data-acao="mais-adicional">+ adicional</button>
  </section>`;
}

// (camadas a fundo) AS CONTAS DA LOJA no cardápio: o cartão que leva à tela das contas, com o que a ficha usa hoje
const lojaCartao = () => '<a class="loja-cartao vidro-leve" href="#loja" data-saida="loja-cartao"></a>';

// ---------- (camadas a fundo) AS CONTAS DA LOJA (#loja) ----------
// As contas do mês em reais ÷ o que a loja vende = o pedaço de cada venda que vai pra elas (a calculadora faz a conta).
// Sem o que vende, a ficha fica com a média do ramo. A tela mostra o "de cada 100 reais" e o que muda em cada ficha.

/** As contas que toda loja de comida tem (a pessoa digita o valor; vazia não conta). */
export const CONTAS_DA_LOJA = ['Aluguel', 'Luz', 'Água', 'Gás', 'Salários', 'Contador', 'Internet', 'Sistema'];
export const FAT_MIN = 5000;
export const FAT_MAX = 150000;
export const REGIMES = [['mei', 'MEI'], ['simples', 'Simples Nacional'], ['presumido', 'Lucro Presumido'], ['nao_sei', 'Não sei']];

/** A linha de uma conta do mês: o nome, o valor (com o − e o + que vão de 10 em 10) e o quanto ela pesa em cada venda. */
function linhaConta(estado, c, j) {
  const nome = c.nome || `Conta ${j + 1}`;
  return `<div class="conta${c.exemplo ? ' de-exemplo' : ''}" data-conta="${j}">
      <label class="campo conta-nome"><span class="so-leitor">A conta</span><input data-e="loja.custos_fixos.${j}.nome" value="${esc(c.nome ?? '')}" placeholder="A conta" autocomplete="off" spellcheck="false"></label>
      <div class="campo conta-valor"><span class="so-leitor" id="rc-${j}">${esc(nome)}, por mês, em reais</span><div class="passo-num">
        <button type="button" class="pn" data-acao="conta-passo" data-j="${j}" data-v="-1" aria-label="${esc(nome)}: 10 reais a menos (segure pra ir mais rápido)">−</button>
        <input data-e="loja.custos_fixos.${j}.por_mes" value="${esc(dinheiro(c.por_mes))}" placeholder="0,00" inputmode="decimal" autocomplete="off" aria-labelledby="rc-${j}" aria-describedby="dica-contas">
        <button type="button" class="pn" data-acao="conta-passo" data-j="${j}" data-v="1" aria-label="${esc(nome)}: 10 reais a mais (segure pra ir mais rápido)">+</button>
      </div></div>
      <span class="conta-peso" data-saida="conta-peso" data-j="${j}"></span>
      <button type="button" class="tirar" data-acao="tirar-linha" data-lista="loja.custos_fixos" data-j="${j}" aria-label="Tirar a conta ${esc(nome)}">×</button>
    </div>`;
}

export function telaLoja(estado) {
  const d = estado.dados;
  const l = d.loja;
  const fat = (emCentavos(l.faturamento_mes) ?? 0) / 100;
  const temExemplo = Boolean(d.loja_exemplo);
  return `<section class="passo loja-tela" aria-labelledby="t-passo">
    <header class="passo-cab">
      <p class="chapeu">As contas da loja<span class="cab-cozinha"> · ${esc(d.negocio || 'Minha cozinha')}</span> ${selo(d)}</p>
      <h1 id="t-passo">As contas <em class="brilha">da loja</em></h1>
      <p class="sub">O aluguel, a luz, o salário: o que a loja gasta no mês pra ficar aberta. Dividido pelo que ela vende, vira o pedaço de cada venda que vai pras contas. É esse pedaço que entra em todas as fichas.</p>
      <div data-saida="simulando"></div>
    </header>
    <div class="loja-grade">
      <div class="loja-form">
        <div class="vidro loja-vende">
          <p class="palco-rot"><span>Quanto a loja vende no mês</span><span data-saida="loja-ex-fat"></span></p>
          ${campo('O que entra no mês, em reais (o balcão, o app e a entrega)', 'loja.faturamento_mes', dinheiro(l.faturamento_mes), { dica: 'Ex.: 30.000', modo: 'decimal', classe: 'loja-fat' })}
          <input type="range" class="faixa loja-fat-faixa" data-loja-fat min="${FAT_MIN}" max="${FAT_MAX}" step="500" value="${Math.min(FAT_MAX, Math.max(FAT_MIN, fat || FAT_MIN))}" aria-label="Quanto a loja vende no mês, de ${FAT_MIN} a ${FAT_MAX} reais" aria-valuetext="${fat ? `${F.reais(Math.round(fat * 100))} por mês` : 'ainda sem o valor'}">
          <div class="faixa-rot" aria-hidden="true"><span>5 mil</span><span>150 mil</span></div>
          <p class="loja-vende-nota" data-saida="loja-vende-nota" aria-live="polite"></p>
        </div>
        <div class="vidro-leve loja-contas">
          <div class="loja-contas-cab"><h2 class="loja-h2">As contas do mês</h2>
            <div class="loja-botoes">${temExemplo ? '<button type="button" class="botao-mini loja-exemplo" data-acao="loja-exemplo">Pôr as contas de exemplo</button>' : ''}<button type="button" class="botao-mini" data-acao="loja-limpar">Limpar</button></div></div>
          <p class="ajuda" id="dica-contas">Em reais, por mês. A que fica vazia não conta. No valor, as setas ↑ ↓ mudam de 10 em 10 (com Shift, de 100 em 100).</p>
          <div class="contas">${l.custos_fixos.map((c, j) => linhaConta(estado, c, j)).join('')}</div>
          <button type="button" class="botao-linha" data-acao="mais-conta">+ outra conta</button>
        </div>
        <div class="vidro-leve loja-maq">
          <h2 class="loja-h2">A maquininha, no balcão</h2>
          <div class="loja-maq-campos">
            ${campo('Ela cobra (a média do débito e do crédito)', 'loja.maquininha_taxa', textoAprov(l.maquininha_taxa), { dica: '2,9%', modo: 'decimal' })}
            ${campo('Passa nela (das vendas do balcão)', 'loja.maquininha_parte', textoAprov(l.maquininha_parte), { dica: '100%', modo: 'decimal', ajuda: 'o Pix e o dinheiro não pagam taxa' })}
          </div>
          <p class="loja-linha-saida" data-saida="loja-maquininha"></p>
        </div>
        <div class="vidro-leve loja-imp">
          <h2 class="loja-h2">O imposto</h2>
          <label class="campo"><span class="campo-rot">O regime da loja</span><select data-e="loja.regime">${REGIMES.map(([v, n]) => `<option value="${v}"${(l.regime || 'nao_sei') === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
          <p class="loja-linha-saida" data-saida="loja-imposto"></p>
        </div>
      </div>
      <div class="loja-lado">
        <div class="vidro loja-resultado" data-saida="loja-resultado" aria-live="polite"></div>
        <div class="vidro-leve loja-fichas">
          <p class="palco-rot"><span>O que muda nas fichas</span><span class="ao-vivo">Ao vivo</span></p>
          <div data-saida="loja-fichas"></div>
        </div>
      </div>
    </div>
    <nav class="passo-fim" aria-label="Os passos">
      <a class="botao claro" href="#cardapio"><span aria-hidden="true">←</span> O cardápio</a>
      <a class="botao" href="#cardapio">Ver as fichas com essas contas <span aria-hidden="true">→</span></a>
    </nav>
  </section>`;
}

export function telaCardapio(estado) {
  const d = estado.dados;
  return `<section class="passo" aria-labelledby="t-passo">
    ${cabecalho(estado, PASSOS[2])}
    ${lojaCartao()}
    ${tamanhosHtml(estado)}
    ${d.bases.map((b, i) => cartaoBase(estado, b, i)).join('')}
    <h2 class="titulo-secao">${d.bases.length ? 'Os sabores' : 'Os produtos'}</h2>
    <div class="sabores">${d.cardapio.length
    ? d.cardapio.map((p) => `<a class="sabor" href="#cardapio/${esc(p.id)}" id="sabor-${esc(p.id)}" data-saida="sabor" data-id="${esc(p.id)}"></a>`).join('')
    : '<p class="vazio">Ponha o primeiro produto que você vende.</p>'}</div>
    <div class="botoes-linha">
      <button type="button" class="botao-linha" data-acao="mais-produto">+ ${d.bases.length ? 'sabor' : 'produto'}</button>
      ${d.bases.length ? '' : '<button type="button" class="botao-linha" data-acao="mais-base">+ base de pizza (pra meio a meio)</button>'}
    </div>
    ${adicionaisHtml(estado)}
    ${fimDoPasso(PASSOS[2])}
  </section>`;
}

// ---------- a ficha de 1 produto (#cardapio/<id>) ----------

const numeroOu = (v, padrao) => { const n = Number(String(v ?? '').replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : padrao; };

/** Onde o produto mora nos dados: { lista: 'cardapio' | 'adicionais', i }. */
export function ondeMora(d, id) {
  const i = d.cardapio.findIndex((p) => p.id === id);
  if (i >= 0) return { lista: 'cardapio', i };
  const j = d.adicionais.findIndex((p) => p.id === id);
  return j >= 0 ? { lista: 'adicionais', i: j } : null;
}
const calcDo = (estado, id) => estado.calc.produtos.get(id) ?? estado.calc.adicionais.get(id);

export function telaProduto(estado, id) {
  const d = estado.dados;
  const mora = ondeMora(d, id);
  if (!mora) return null;
  const p = d[mora.lista][mora.i];
  const base = d.bases.find((b) => b.id === p.base);
  const c = `${mora.lista}.${mora.i}`;
  const linhas = (g, dica) => (p[g] ?? []).map((l, j) => linhaUsa(d, `${c}.${g}.${j}`, l, { saida: `data-saida="linha-produto" data-id="${esc(id)}" data-g="${g}" data-j="${j}"`, lista: `${c}.${g}`, j, dica })).join('');
  const oque = base ? 'A pizza por dentro' : 'O produto por dentro';
  // (camadas a fundo) o tamanho e os adicionais: monte a pizza (a broto com a borda) e veja a ficha dela
  const comT = temTamanhos(d) && comTamanho(d, p);
  const extras = base ? d.adicionais : [];
  const monta = comT || extras.length ? `<div class="monta">
      ${comT ? chipsDoTamanho(estado, { rotulo: `O tamanho ${base ? 'da pizza' : 'do adicional'}` }) : ''}
      ${extras.length ? `<div class="monta-extras" role="group" aria-label="Com adicional"><span class="monta-rot">Com</span>${extras.map((a) => `<button type="button" class="chip extra-chip" data-acao="extra" data-id="${esc(a.id)}" aria-pressed="${estado.adicionaisLigados.has(a.id)}"><span class="extra-mais" aria-hidden="true">+</span>${esc(a.nome)}<small data-saida="extra-preco" data-id="${esc(a.id)}"></small></button>`).join('')}</div>` : ''}
    </div>` : '';
  return `<section class="passo produto" aria-labelledby="t-produto">
    <a class="voltar" href="#cardapio"><span aria-hidden="true">←</span> O cardápio</a>
    <header class="produto-cab">
      <p class="chapeu">${base ? `${comT ? 'Pizza' : esc(base.nome)} · ` : mora.lista === 'adicionais' ? 'Adicional · ' : ''}${esc(d.negocio || 'Minha cozinha')} ${selo(d)}</p>
      <h1 id="t-produto" data-saida="titulo" data-id="${esc(id)}">${esc(p.nome || 'Sem nome')}</h1>
      ${monta}
      <div data-saida="simulando"></div>
    </header>
    <div class="produto-tela">
      <div class="produto-ficha">
        <div class="alterna" role="group" aria-label="Como a ficha sai">
          <button type="button" data-acao="completa" data-v="sim" aria-pressed="${estado.completa}">Pacote completo</button>
          <button type="button" data-acao="completa" data-v="nao" aria-pressed="${!estado.completa}">Grátis</button>
        </div>
        <div class="ficha-vista" data-saida="ficha" data-id="${esc(id)}"></div>
      </div>
      <div class="produto-lado">
        <div class="vidro preco-vivo">
          <p class="palco-rot"><span>O preço${comT ? ` <span class="tam-agora" data-saida="tam-agora"></span>` : ''}</span><span class="ao-vivo">Arraste e veja</span></p>
          <div data-precos-tamanho data-lista="${mora.lista}" data-i="${mora.i}" data-faixa="1">${precosDoTamanho(estado, { lista: mora.lista, i: mora.i, faixa: true })}</div>
          <div data-saida="preco-vivo" data-id="${esc(id)}" aria-live="polite"></div>
        </div>
        ${comT ? `<div class="vidro-leve tams-caixa"><p class="palco-rot"><span>Nos ${d.tamanhos.length} tamanhos</span>${d.tamanhos_exemplo ? '<span class="selo-exemplo">exemplo</span>' : ''}</p><div data-saida="tamanhos-tabela" data-id="${esc(id)}"></div></div>` : ''}
        <div class="vidro-leve arvore-caixa">
          <div class="arvore-cab"><h2>${oque}</h2></div>
          <p class="ajuda">Cada fatia é o quanto custa. Passe o mouse ou toque pra ver; toque numa receita da casa (o molho) pra abrir ela por dentro.</p>
          <div class="anel" data-saida="anel" data-id="${esc(id)}"></div>
          <div class="arvore-cab arvore-cab-lista"><h3 class="linhas-rot">As camadas em lista</h3><button type="button" class="botao-mini" data-acao="arvore-tudo">${estado.abrirTudo ? 'Fechar as de dentro' : 'Abrir tudo'}</button></div>
          <div data-saida="arvore" data-id="${esc(id)}"></div>
        </div>
        <details class="vidro-leve editor" data-guarda="editorAberto"${estado.editorAberto ? ' open' : ''}>
          <summary><span>Mudar a receita ${base ? 'deste sabor' : 'deste produto'}</span><small>o nome, os ingredientes e a embalagem</small></summary>
          <div class="editor-corpo">
            ${campo('O nome', `${c}.nome`, p.nome, { dica: 'Ex.: Calabresa' })}
            ${d.bases.length && mora.lista === 'cardapio' ? `<label class="campo"><span class="campo-rot">A base</span><select data-e="${c}.base"><option value="">Sem base (não é pizza)</option>${d.bases.map((b) => `<option value="${esc(b.id)}"${b.id === p.base ? ' selected' : ''}>${esc(b.nome)}</option>`).join('')}</select></label>` : ''}
            <p class="linhas-rot">${base ? (comT ? `A cobertura, na ${esc(nomeDoTamanho(d, base.tamanho).toLowerCase() || 'grande')} (os outros tamanhos levam pela área; no meio a meio, vai pela metade)` : 'A cobertura (no meio a meio, vai pela metade)') : comT ? `Os ingredientes, na ${esc(nomeDoTamanho(d, tamanhoDaReceitaDe(d, p)).toLowerCase())}` : 'Os ingredientes'}</p>
            <div class="linhas">${linhas('itens', '150 g')}</div>
            <button type="button" class="botao-linha" data-acao="mais-linha" data-lista="${c}.itens">+ ingrediente</button>
            ${base ? '' : campo('A receita rende quantas unidades?', `${c}.rende`, p.rende, { dica: '1', modo: 'decimal', ajuda: 'Bolo em fatias, massa de salgado… Lanche é 1.' })}
            <p class="linhas-rot">${base ? 'Embalagem só deste sabor (a da base já entra)' : 'A embalagem'}</p>
            <div class="linhas">${linhas('embalagem', '1 un')}</div>
            <button type="button" class="botao-linha" data-acao="mais-linha" data-lista="${c}.embalagem">+ embalagem</button>
            <label class="caixa"><input type="checkbox" data-e="${c}.vende_app"${p.vende_app !== false ? ' checked' : ''}> Vende no app (iFood e outros)</label>
            <button type="button" class="botao claro tirar-produto" data-acao="tirar-produto" data-id="${esc(id)}">Tirar ${esc(p.nome || 'este produto')} do cardápio</button>
          </div>
        </details>
      </div>
    </div>
  </section>`;
}

/** A árvore de custo em HTML (a lista em texto, para o leitor de tela e o teclado): cada receita da casa abre (details). */
export function arvoreHtml(estado, a, prefixo, { abreAte = 1 } = {}) {
  const total = a.custo_c || 1;
  const no = (n, caminho, nivel, grupo) => {
    const chave = `${prefixo}:${caminho}`;
    const g = n.tipo === 'grupo' ? n.grupo : grupo;
    const pct = Math.min(100, Math.round((n.custo_c / total) * 1000) / 10);
    const cab = `<span class="no-nome"><i class="no-cor" style="--cor:${D.COR_DO_GRUPO[g] ?? '#F9C748'}" aria-hidden="true"></i>${esc(n.nome)}${n.tipo === 'receita' ? '<i class="no-tipo">receita da casa</i>' : ''}</span>`
      + `<span class="no-qtd">${n.qtd ? esc(q(n.qtd.valor, n.qtd.unidade)) : ''}</span>`
      + `<span class="no-custo"${rola(`n-${caminho}`, n.custo_c)}>${centavo(n.custo_c, n.qtd?.valor ?? 1)}</span>`
      + `<span class="no-barra" aria-hidden="true"><i data-rola="b-${esc(caminho)}" data-rola-anima="width" style="width:${pct}%"></i></span>`;
    if (n.filhos?.length) {
      const padrao = estado.abrirTudo || nivel <= abreAte;
      const aberto = estado.alternados.has(chave) ? !padrao : padrao;
      return `<details class="no n${nivel} t-${n.tipo}" data-no="${esc(chave)}" data-padrao="${padrao}"${aberto ? ' open' : ''}><summary>${cab}</summary><div class="no-filhos">${n.filhos.map((f, k) => no(f, `${caminho}/${k}`, nivel + 1, g)).join('')}</div></details>`;
    }
    return `<div class="no n${nivel} folha t-${n.tipo}" data-no="${esc(chave)}">${cab}</div>`;
  };
  return `<div class="arvore">
    <div class="no-raiz"><span class="raiz-nome">${esc(a.nome)}</span><b${rola('raiz', a.custo_c)}>${R(a.custo_c)}</b><small>${a.rende > 1 ? 'o custo de cada unidade' : 'o custo de cada um'} · ${C.profundidade(a)} camadas</small></div>
    ${a.filhos.map((g, k) => no(g, String(k), 0, null)).join('')}
  </div>`;
}

// ---------- 4. o meio a meio ----------

/** A pizza do meio a meio (só o desenho; as cores, os nomes e os custos vêm da saída viva): traço fino, geométrica. */
export function pizzaSvg() {
  const fatias = [45, 90, 135].map((g) => `<line x1="140" y1="26" x2="140" y2="254" transform="rotate(${g} 140 140)"/>`).join('');
  const rotulo = (lado, x) => `<g class="pz-rot" data-rot="${lado}" data-xy="${x},140"><text class="pz-nome" x="${x}" y="136" text-anchor="middle"></text><text class="pz-custo" x="${x}" y="164" text-anchor="middle"></text></g>`;
  return `<svg class="pizza" viewBox="0 0 280 280" data-pizza>
    <defs><radialGradient id="pz-luz" cx="34%" cy="22%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".55" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></radialGradient></defs>
    <circle class="pz-tabua" cx="140" cy="140" r="137"/>
    <g class="pz-giro" data-pz-giro>
      <circle class="pz-borda" cx="140" cy="140" r="126"/>
      <path class="pz-metade" data-lado="0" role="button" tabindex="0" d="M140 24 A116 116 0 0 0 140 256 Z"/>
      <path class="pz-metade" data-lado="1" role="button" tabindex="0" d="M140 24 A116 116 0 0 1 140 256 Z"/>
      <circle class="pz-luz" cx="140" cy="140" r="116" fill="url(#pz-luz)"/>
      <g class="pz-fatias">${fatias}</g>
      <line class="pz-corte" x1="140" y1="12" x2="140" y2="268"/>
      ${rotulo(0, 72)}${rotulo(1, 208)}
    </g>
    <g class="pz-meio"><circle cx="140" cy="140" r="28"/><text class="pz-meio-rot" x="140" y="135" text-anchor="middle">custa</text><text class="pz-meio-n" x="140" y="150" text-anchor="middle" data-pz-total></text></g>
  </svg>`;
}

/** (camadas a fundo) O tamanho do desenho da pizza: o diâmetro do tamanho ÷ o do maior (a grande inteira = 1). */
export function escalaDaPizza(estado) {
  const d = estado.dados;
  const t = tamanhoAtual(estado);
  if (!t) return 1;
  return D.escalaDoDisco(diametroOu(d.tamanhos.find((x) => x.id === t)), d.tamanhos.map(diametroOu));
}

export function telaMeio(estado) {
  const d = estado.dados;
  const pizzas = d.cardapio.filter((p) => p.base);
  if (pizzas.length < 2) {
    return `<section class="passo" aria-labelledby="t-passo">${cabecalho(estado, PASSOS[3])}
      <p class="vazio">Pra fazer meio a meio, o cardápio precisa de 2 sabores com a mesma base (o mesmo tamanho de pizza). Ponha a base no cardápio e os sabores nela.</p>
      ${fimDoPasso(PASSOS[3])}</section>`;
  }
  const [a, b] = d.meio_a_meio.sabores;
  const regra = d.meio_a_meio.regra || 'mais_caro';
  const chips = (lado, atual) => pizzas.map((p) => `<button type="button" class="chip sabor-chip" data-acao="sabor" data-lado="${lado}" data-id="${esc(p.id)}" aria-pressed="${p.id === atual}" style="--cor:${corDo(d, p.id)}"><i aria-hidden="true"></i>${esc(p.nome)}</button>`).join('');
  return `<section class="passo" aria-labelledby="t-passo">
    ${cabecalho(estado, PASSOS[3])}
    <div class="meio-tela">
      <div class="vidro palco meio-palco">
        <p class="palco-rot"><span>A pizza</span><span class="ao-vivo">Toque numa metade ou gire</span></p>
        ${temTamanhos(d) ? `<div class="meio-tam">${chipsDoTamanho(estado)}${d.tamanhos_exemplo ? '<span class="selo-exemplo">exemplo</span>' : ''}</div>` : ''}
        <div class="meio-pizza" data-saida="pizza" style="--escala:${escalaDaPizza(estado).toFixed(4)}">${pizzaSvg()}</div>
        <p class="pizza-rot" data-saida="pizza-rot"></p>
        <div class="meio-escolha">
          <div><p class="escolha-rot"><i data-cor-lado="0" style="--cor:${corDo(d, a)}"></i>Metade 1</p><div class="chips" role="group" aria-label="O sabor da metade 1">${chips(0, a)}</div></div>
          <div><p class="escolha-rot"><i data-cor-lado="1" style="--cor:${corDo(d, b)}"></i>Metade 2</p><div class="chips" role="group" aria-label="O sabor da metade 2">${chips(1, b)}</div></div>
        </div>
      </div>
      <div class="meio-regras">
        <p class="palco-rot"><span>Como cobrar o meio a meio</span></p>
        <div class="regras" role="group" aria-label="A regra do preço">${Object.keys(C.REGRAS).map((id) => `<button type="button" class="regra" data-acao="regra" data-id="${id}" aria-pressed="${regra === id}" data-saida="regra" data-regra="${id}"></button>`).join('')}</div>
        <div class="meio-diferenca" data-saida="meio-diferenca"></div>
      </div>
    </div>
    <div class="meio-detalhe">
      <div class="ficha-vista" data-saida="meio-ficha"></div>
      <div class="vidro-leve arvore-caixa">
        <div class="arvore-cab"><h2>As camadas do meio a meio</h2><button type="button" class="botao-mini" data-acao="arvore-tudo">${estado.abrirTudo ? 'Fechar as de dentro' : 'Abrir tudo'}</button></div>
        <p class="ajuda">A base inteira, metade de cada cobertura e a caixa.</p>
        <div data-saida="meio-arvore"></div>
      </div>
    </div>
    ${fimDoPasso(PASSOS[3])}
  </section>`;
}

// ---------- 5. a lista de compras ----------

// (camadas a fundo) a linha do plano num tamanho: "Calabresa · broto"
const comTamanhoNoPlano = (d, e) => (e.tamanho ? ` · ${nomeDoTamanho(d, e.tamanho).toLowerCase() || e.tamanho}` : '');
const nomeDoPlano = (d, e) => `${e.meio ? `½ ${nomeDe(d, e.meio[0])} + ½ ${nomeDe(d, e.meio[1])}` : nomeDe(d, e.produto ?? e.adicional)}${comTamanhoNoPlano(d, e)}`;
const tipoDoPlano = (d, e) => {
  const ref = temTamanhos(d) ? ` ${nomeDoTamanho(d, tamanhoDaReceita(d)).toLowerCase()}` : ' inteira';
  if (e.meio) return e.tamanho ? 'meio a meio' : `meio a meio${temTamanhos(d) ? ref : ''}`;
  if (e.adicional) return e.tamanho ? 'adicional' : `adicional${temTamanhos(d) ? ` (na${ref})` : ''}`;
  return d.cardapio.find((p) => p.id === e.produto)?.base ? (e.tamanho ? 'pizza' : `pizza${ref}`) : 'produto';
};
export const quantidadeDo = (e) => Math.max(0, Number(String(e?.quantidade ?? 0).replace(',', '.')) || 0);
/** O fim da faixa do plano: o dobro do que está lá (pelo menos 40), de 10 em 10. */
export const fimDaFaixa = (n) => Math.max(40, Math.ceil((n * 2) / 10) * 10);

// (camadas a fundo) pôr no plano a pizza num outro tamanho (a broto de calabresa): a lista compra pela área e com a caixa dela
function planoTamanhoHtml(estado) {
  const d = estado.dados;
  if (!temTamanhos(d)) return '';
  const ref = tamanhoDaReceita(d);
  const pizzas = d.cardapio.filter((p) => p.base);
  const outros = d.tamanhos.filter((t) => t.id !== ref && diametroOu(t));
  if (!pizzas.length || !outros.length) return '';
  return `<div class="plano-tam" role="group" aria-label="Pôr outro tamanho no plano">
      <span class="plano-tam-rot">Pôr no plano:</span>
      <label class="so-leitor" for="plano-tam-sabor">O sabor</label><select id="plano-tam-sabor" data-plano-sabor>${pizzas.map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('')}</select>
      <label class="so-leitor" for="plano-tam-t">O tamanho</label><select id="plano-tam-t" data-plano-tam>${outros.map((t) => `<option value="${esc(t.id)}">${esc(t.nome)}</option>`).join('')}</select>
      <button type="button" class="botao-mini" data-acao="mais-tamanho-plano">+ pôr</button>
    </div>`;
}

export function telaCompras(estado) {
  const d = estado.dados;
  const [a, b] = d.meio_a_meio.sabores;
  const temMeio = a && b && a !== b && d.cardapio.find((p) => p.id === a)?.base && d.plano.every((e) => !(e.meio && e.meio[0] === a && e.meio[1] === b));
  // a mesma escala em todas as faixas: dá pra comparar o plano de olho, como num gráfico de barras
  const max = fimDaFaixa(Math.max(0, ...d.plano.map(quantidadeDo)));
  const linhas = d.plano.map((e, i) => {
    const nome = nomeDoPlano(d, e);
    const n = quantidadeDo(e);
    return `<div class="plano-q">
      <div class="plano-item"><b>${esc(nome)}</b><small>${tipoDoPlano(d, e)}</small></div>
      <div class="passo-num">
        <button type="button" class="pn" data-acao="qtd" data-i="${i}" data-v="-1" aria-label="${esc(nome)}: 1 a menos (segure pra ir mais rápido)">−</button>
        <input data-e="plano.${i}.quantidade" value="${esc(e.quantidade ?? 0)}" inputmode="numeric" autocomplete="off" aria-label="Quantas de ${esc(nome)} na semana" aria-describedby="dica-plano">
        <button type="button" class="pn" data-acao="qtd" data-i="${i}" data-v="1" aria-label="${esc(nome)}: 1 a mais (segure pra ir mais rápido)">+</button>
      </div>
      ${e.meio || e.tamanho ? `<button type="button" class="tirar" data-acao="tirar-plano" data-i="${i}" aria-label="Tirar ${esc(nome)} do plano">×</button>` : '<span class="tirar-vazio"></span>'}
      <input type="range" class="faixa plano-faixa" data-plano-faixa="${i}" min="0" max="${max}" step="1" value="${Math.min(max, n)}" style="--cheio:${((Math.min(max, n) / max) * 100).toFixed(1)}%" aria-label="Quantas de ${esc(nome)} na semana, de 0 a ${max}">
    </div>`;
  }).join('');
  return `<section class="passo" aria-labelledby="t-passo">
    ${cabecalho(estado, PASSOS[4])}
    <div class="compras-tela">
      <div class="vidro plano-caixa">
        <p class="palco-rot"><span>O plano da semana</span><span class="ao-vivo">Mexa aqui</span></p>
        <div class="plano-lista">${linhas || '<p class="vazio">O cardápio ainda está vazio.</p>'}</div>
        ${temMeio ? `<button type="button" class="botao-linha" data-acao="mais-meio">+ meio ${esc(nomeDe(d, a))} + meio ${esc(nomeDe(d, b))}</button>` : ''}
        ${planoTamanhoHtml(estado)}
        <p class="ajuda" id="dica-plano">Arraste a faixa, segure o + ou o −, ou digite (as setas ↑ ↓ também mudam).</p>
      </div>
      <div class="compras-lado">
        <div class="vidro total-caixa" data-saida="compras-total"></div>
        <div class="chips" role="group" aria-label="O que entra na lista">
          <button type="button" class="chip" data-acao="minimo" data-v="nao" aria-pressed="${!estado.garantirMinimo}">Só o que falta</button>
          <button type="button" class="chip" data-acao="minimo" data-v="sim" aria-pressed="${estado.garantirMinimo}">E ficar com o mínimo</button>
        </div>
        <div class="acao-copiar">
          <button type="button" class="botao" data-acao="copiar">Copiar a lista</button>
          <p class="aviso" data-aviso-lista aria-live="polite"></p>
          <textarea class="lista-texto" data-lista-texto readonly hidden rows="10" aria-label="A lista, pra copiar à mão"></textarea>
        </div>
      </div>
    </div>
    <div data-saida="preparo"></div>
    <section class="compras" aria-labelledby="t-compras">
      <h2 class="titulo-secao" id="t-compras">O que comprar ${selo(d)}</h2>
      <p class="ajuda">Marque o que já comprou: vai pro estoque da despensa.</p>
      <div data-saida="compras-erros"></div>
      <div class="compras-grupos" data-saida="compras-lista"></div>
      <div data-saida="ja-tem"></div>
    </section>
    <div data-saida="baixo"></div>
    ${fimDoPasso(PASSOS[4])}
  </section>`;
}

// ---------- a busca rápida: tudo o que dá para achar ----------

/** Os itens da busca (⌘K): os 5 passos, a despensa, as receitas da casa, as bases, o cardápio e os adicionais. */
export function itensDaBusca(estado) {
  const d = estado.dados;
  const c = estado.calc;
  const itens = PASSOS.map((p) => ({ tipo: 'passo', tipoNome: `Passo ${p.n}`, nome: p.nome, extra: String(p.n), rota: `#${p.id}`, detalhe: `tecla ${p.n}` }));
  for (const i of d.despensa) {
    const x = c.insumos.get(i.id);
    const limpo = x && !x.erro && x.aproveitamento < 1 ? ` · aproveita ${pctTxt(x.aproveitamento * 100)}` : '';
    itens.push({ tipo: 'insumo', tipoNome: 'Despensa', id: i.id, nome: i.nome || 'sem nome', extra: i.categoria, detalhe: x && !x.erro ? `${C.mostrarPrecoPor(x.por)}${limpo} · ${i.categoria || 'Outros'}` : i.categoria });
  }
  // (camadas a fundo) as contas da loja, cada conta do mês e os tamanhos
  const l = c.loja;
  itens.push({ tipo: 'loja', tipoNome: 'A loja', nome: 'As contas da loja', extra: 'contas faturamento maquininha imposto', rota: '#loja',
    detalhe: l?.usa === 'mes' ? `${pctTxt(l.pct * 100)} de cada venda` : 'a média do ramo (de 15% a 25%)' });
  (d.loja?.custos_fixos ?? []).forEach((cf, j) => {
    if (!String(cf.nome ?? '').trim()) return;
    const x = l?.linhas?.[j];
    itens.push({ tipo: 'conta', tipoNome: 'Conta da loja', nome: cf.nome, extra: 'conta', j, detalhe: x && x.por_mes_c > 0 ? `${R(x.por_mes_c)} por mês${x.pct ? ` · ${pctTxt(x.pct * 100)} de cada venda` : ''}` : 'ainda sem o valor' });
  });
  itens.push({ tipo: 'conta', tipoNome: 'Conta da loja', nome: 'Quanto a loja vende no mês', extra: 'faturamento', campo: 'faturamento', detalhe: l?.faturamento_c ? `${R(l.faturamento_c)} por mês` : 'ainda sem o valor' });
  itens.push({ tipo: 'conta', tipoNome: 'Conta da loja', nome: 'A maquininha', extra: 'taxa cartão débito crédito', campo: 'maquininha', detalhe: l?.maquininha?.taxa > 0 ? `${pctTxt(Math.round(l.maquininha.efetiva * 10000) / 100)} de cada venda no balcão` : 'ainda sem a taxa' });
  if (temTamanhos(d)) {
    for (const t of d.tamanhos.filter((z) => diametroOu(z))) {
      itens.push({ tipo: 'tamanho', tipoNome: 'Tamanho', id: t.id, nome: `${t.nome} (${cmTxt(diametroOu(t))})`, extra: 'tamanho pizza', detalhe: t.id === tamanhoDaReceita(d) ? 'o tamanho da receita' : 'veja o cardápio neste tamanho' });
    }
  }
  for (const r of d.receitas) {
    const x = c.receitas.get(r.id);
    itens.push({ tipo: 'receita', tipoNome: 'Receita da casa', id: r.id, nome: r.nome || 'sem nome', extra: 'receita', detalhe: x && !x.erro ? `sai por ${C.mostrarPrecoPor(x.por)}` : '' });
  }
  for (const b of d.bases) {
    const x = c.bases.get(b.id);
    itens.push({ tipo: 'base', tipoNome: 'Base', id: b.id, nome: b.nome || 'sem nome', extra: 'base', detalhe: x && !x.erro ? `custa ${R(x.total_c)}` : '' });
  }
  for (const [lista, tipo, tipoNome] of [[d.cardapio, 'produto', d.bases.length ? 'Sabor' : 'Produto'], [d.adicionais, 'adicional', 'Adicional']]) {
    for (const p of lista) {
      const x = calcDo(estado, p.id);
      const k = x?.cupons?.find((y) => y.canal === 'balcao');
      itens.push({ tipo, tipoNome, id: p.id, nome: p.nome || 'sem nome', extra: p.base ? 'pizza' : tipo, detalhe: x?.ficha && k ? `custa ${R(x.ficha.totais.insumos_c)} · sobra ${sobraTxt(k)}` : '' });
    }
  }
  return itens;
}

// ---------- as saídas: refeitas a cada tecla ----------

function barraCusto(estado, id) {
  let a;
  try { a = arvoreDe(estado, { produto: id }); } catch { return ''; }
  const total = a.custo_c || 1;
  const cor = { base: 'g1', sabor: 'g2', a: 'g2', b: 'g3', embalagem: 'g4' };
  const nome = (g) => (g.grupo === 'base' ? 'Base' : g.grupo === 'sabor' ? (g.nome === 'Cobertura' ? 'Cobertura' : 'Ingredientes') : g.nome);
  return `<span class="barra-custo" aria-hidden="true">${a.filhos.map((g) => `<i class="${cor[g.grupo]}" data-rola="seg-${g.grupo}" data-rola-anima="width" style="width:${((g.custo_c / total) * 100).toFixed(1)}%"></i>`).join('')}</span>
    <span class="barra-legenda">${a.filhos.map((g) => `<span><i class="${cor[g.grupo]}"></i>${esc(nome(g))} <span${rola(`leg-${g.grupo}`, g.custo_c)}>${R(g.custo_c)}</span></span>`).join('')}</span>`;
}

// ---------- (camadas a fundo) as contas da loja dentro da ficha ----------

/**
 * O cupom da ficha (o da V2, do comum/ficha.js). Com a maquininha no balcão, a linha "O app fica com" leva também a taxa
 * da maquininha: o nome da linha diz isso (o comum/ficha.js só fala do app; o pedido de mudar lá vai no relatório).
 */
export function cupomDaLoja(f, v) {
  const html = F.montarCupom(f, v);
  const p = f.percentuais;
  if (!(p.taxa_balcao > 0)) return html;
  const temApp = f.canais.some((c) => c.id !== 'balcao') && v.vendeApp !== false;
  const velho = `O app fica com<small>${F.pct(p.taxa_app)} do preço</small>`;
  const novo = temApp ? `O app ou a maquininha<small>app ${F.pct(p.taxa_app)} · maquininha ${F.pct(p.taxa_balcao)}</small>` : `A maquininha fica com<small>${F.pct(p.taxa_balcao)} do preço</small>`;
  return html.replace(velho, novo);
}

/** A linha das contas da loja embaixo da ficha: de onde vem o % (a média ou as contas), a maquininha e o caminho pra mudar. */
export function notaDaLoja(e, f) {
  const l = e.calc.loja;
  if (!l) return '';
  const p = f.percentuais;
  const fixos = p.fixos.origem === 'mes' ? `as contas da loja: ${F.pct(p.fixos.faixa[0])} de cada venda` : p.fixos.origem === 'padrao' ? `a média do ramo (${F.pct(p.fixos.faixa[0])} a ${F.pct(p.fixos.faixa[1])})` : `${F.pct(p.fixos.faixa[0])} digitado`;
  const maq = p.taxa_balcao > 0 ? ` · a maquininha no balcão: ${F.pct(p.taxa_balcao)}` : '';
  const aviso = l.aviso === 'falta-faturamento' ? ' <b>Falta quanto a loja vende no mês</b>: até lá, a ficha usa a média do ramo.' : '';
  const ex = e.dados.loja?.custos_fixos?.some((c) => c.exemplo) ? ' <span class="selo-exemplo">exemplo</span>' : '';
  return `<p class="ficha-loja">Contas da loja: ${fixos}${maq}.${aviso}${ex} <a href="#loja">${p.fixos.origem === 'mes' ? 'Mudar as contas' : 'Pôr as contas da sua loja'} <span aria-hidden="true">→</span></a></p>`;
}

const pacotesTxt = (n, texto) => `${n} ${n === 1 ? 'pacote' : 'pacotes'} de ${texto}`;

// "e se o preço mudar?": a conta do efeito, com o preço de hoje guardado na simulação. O "depois" é a conta que a tela já
// fez (e.calc); o "antes" (a cozinha com o preço de hoje) fica guardado enquanto a pessoa arrasta: o arrasto fica leve
let antesGuardado = { chave: '', calc: null };
function efeitoDe(e, id) {
  const d = e.dados;
  const ins = d.despensa.find((x) => x.id === id);
  if (!ins) return null;
  // (camadas a fundo) o "hoje" é o preço e o aproveitamento de antes de mexer nas faixas
  const s = e.simula.get(id);
  const sa = e.simulaAprov?.get(id);
  const hoje = { ...ins, ...(s ? { preco_pacote: s.hoje } : {}), ...(sa ? { aproveitamento: sa.hoje } : {}) };
  const base = s || sa ? { ...d, despensa: d.despensa.map((x) => (x.id === id ? hoje : x)) } : d;
  try {
    let antes = e.calc;
    if (s || sa) {
      const chave = `${e.completa}|${JSON.stringify(base)}`;
      if (antesGuardado.chave !== chave) antesGuardado = { chave, calc: C.calcularCozinha(base, e.tab, { completa: e.completa }) };
      antes = antesGuardado.calc;
    }
    return C.efeitoDaMudanca(base, id, { preco_pacote: ins.preco_pacote, aproveitamento: ins.aproveitamento }, e.tab, { completa: e.completa, antes, depois: e.calc });
  } catch (err) { return { erro: err.erros ?? [err.message] }; }
}

// (camadas a fundo) a cozinha com a média do ramo (sem as contas da loja nem a maquininha), pra mostrar o que as contas mudam
let mediaGuardada = { chave: '', calc: null };
function cozinhaNaMedia(e) {
  const d = e.dados;
  const loja = { regime: d.loja?.regime };
  const base = { ...d, loja };
  const chave = `${e.completa}|${JSON.stringify({ ...d, loja })}`;
  if (mediaGuardada.chave !== chave) {
    try { mediaGuardada = { chave, calc: C.calcularCozinha(base, e.tab, { completa: e.completa, plano: [] }) }; } catch { mediaGuardada = { chave, calc: null }; }
  }
  return mediaGuardada.calc;
}

/** A árvore de custo (do produto ou do meio a meio), feita 1 vez por conta: o anel, a lista e a pizza usam a mesma. */
function arvoreDe(e, alvo) {
  // (camadas a fundo) a árvore no tamanho da tela (a broto) e com os adicionais ligados (a borda)
  const d = e.dados;
  const p = alvo.produto ? d.cardapio.find((x) => x.id === alvo.produto) ?? d.adicionais.find((x) => x.id === alvo.produto) : d.cardapio.find((x) => x.id === alvo.meio?.[0]);
  const t = alvo.tamanho !== undefined ? alvo.tamanho : comTamanho(d, p) ? tamanhoAtual(e) : null;
  const extras = alvo.adicionais ?? [];
  const chave = `${alvo.produto ? `p:${alvo.produto}` : `m:${alvo.meio.join('+')}`}|${t ?? ''}|${extras.join(',')}`;
  e.calc.arvores = e.calc.arvores ?? new Map();
  if (!e.calc.arvores.has(chave)) {
    try { e.calc.arvores.set(chave, { a: C.arvoreDeCusto(d, { ...alvo, tamanho: t, adicionais: extras }, e.tab, { receitas: e.calc.receitas }) }); } catch (err) { e.calc.arvores.set(chave, { err }); }
  }
  const x = e.calc.arvores.get(chave);
  if (x.err) throw x.err;
  return x.a;
}

/** (camadas a fundo) O custo da base no tamanho da tela (a broto: a massa e o molho pela área, e a caixa dela). */
function baseNaTela(e, id) {
  const t = tamanhoAtual(e);
  if (!t) return e.calc.bases.get(id);
  e.calc.basesT = e.calc.basesT ?? new Map();
  const chave = `${id}|${t}`;
  if (!e.calc.basesT.has(chave)) {
    try { e.calc.basesT.set(chave, C.custoDaBase(e.dados, id, e.tab, { receitas: e.calc.receitas, tamanho: t })); } catch (err) { e.calc.basesT.set(chave, { erro: err.erros ?? [err.message] }); }
  }
  return e.calc.basesT.get(chave);
}

/** (camadas a fundo) O que se compra pra linha da ficha (a quantidade do tamanho, limpa): "compra 167 g". */
function compraDaFicha(e, x, k, l) {
  const ins = e.dados.despensa.find((i) => i.id === l?.usa);
  const linha = x?.entrada?.ingredientes?.[k];
  if (!ins || !linha) return '';
  let a = 1;
  try { a = C.aproveitamentoDe(ins); } catch { return ''; }
  if (!(a < 1)) return '';
  let m;
  try { m = C.medida(linha.vai, e.tab, ins.nome); } catch { return ''; }
  return compraBruta({ aproveitamento: a, bruto: { valor: m.valor / a, unidade: m.unidade } });
}

// (camadas a fundo) o que se compra pra ter a quantidade limpa da linha: "compra 2,78 kg"
const compraBruta = (l) => (l?.aproveitamento < 1 && l.bruto ? `<small class="compra-bruta">compra <span${rolaQ('cb', l.bruto.valor, l.bruto.unidade)}>${esc(q(l.bruto.valor, l.bruto.unidade))}</span></small>` : '');
// de onde vem o que vai fora: os insumos limpos direto na receita e as receitas de dentro que também perdem
function oQueSaiDa(e, r) {
  const nomes = [];
  for (const l of r.linhas ?? []) {
    if (l.tipo === 'insumo' && l.aproveitamento < 1) nomes.push(l.nome);
    if (l.tipo === 'receita' && e.calc.receitas.get(l.usa)?.limpeza_c > 0) nomes.push(l.nome);
  }
  const unicos = [...new Set(nomes)];
  return unicos.length > 1 ? `${unicos.slice(0, -1).join(', ')} e ${unicos.at(-1)}` : unicos[0] ?? '';
}

function difHtml(chave, c, { bomSeSobe = false } = {}) {
  const cls = c === 0 ? 'zero' : (c > 0) === bomSeSobe ? 'melhor' : 'pior';
  return `<i class="ce-dif ${cls}"${rola(`d-${chave}`, c)}>${c ? `${c > 0 ? '+' : '−'} ${R(Math.abs(c))}` : ''}</i>`;
}

function itemCusto(chave, nome, valor, delta, sub) {
  return `<div class="ce-item${delta ? ' mudou' : ''}"><span class="ce-nome">${esc(nome)}${sub ? `<small>${sub}</small>` : ''}</span><span class="ce-val">${valor}${difHtml(chave, delta)}</span></div>`;
}
const erroItem = (x) => `<div class="ce-item com-erro"><span class="ce-nome">${esc(x.nome)}</span>${erroHtml(x.erro)}</div>`;

function itemVendido(v) {
  if (v.erro) return erroItem(v);
  const k = v.canais.find((x) => x.canal === 'balcao') ?? v.canais[0];
  const chave = v.tipo === 'meio' ? 'meio' : `p-${v.id}`;
  const tipo = v.tipo === 'meio' ? 'meio a meio' : v.tipo === 'adicional' ? 'adicional' : '';
  return `<a class="ce-prod${v.custo.delta_c ? ' mudou' : ''}" href="${v.tipo === 'meio' ? '#meio' : `#cardapio/${esc(v.id)}`}">
    <span class="ce-nome">${esc(v.nome)}${tipo ? `<small>${tipo}</small>` : ''}</span>
    <span class="ce-linha"><small>custa</small><b${rola(`c-${chave}`, v.custo.depois_c)}>${R(v.custo.depois_c)}</b>${difHtml(`c-${chave}`, v.custo.delta_c)}</span>
    ${k ? `<span class="ce-linha"><small>sobra</small><b class="ce-sobra ${k.sinal.depois.cls}"${rola(`s-${chave}`, k.sobra.depois_c)}>${sobraDe(k.sobra.depois_c)}</b>${difHtml(`s-${chave}`, k.sobra.delta_c, { bomSeSobe: true })}</span>` : ''}
  </a>`;
}

function resumoEfeito(ef) {
  const x = ef.insumo;
  const vend = [...ef.produtos, ...(ef.meio ? [ef.meio] : []), ...ef.adicionais].filter((v) => !v.erro);
  if (!vend.length && !ef.receitas.length && !ef.bases.length) return '<p class="ce-resumo">Ainda não entra em nenhuma receita nem produto. Quando entrar, a conta desce até ele.</p>';
  if (!vend.length) return '<p class="ce-resumo">Entra numa receita da casa que ainda não chega no cardápio.</p>';
  if (!ef.mudou) {
    const passos = [x.nome, ...ef.receitas.map((r) => r.nome), ...ef.bases.map((b) => b.nome)];
    return `<p class="ce-resumo">Arraste e veja a conta descer: ${passos.map((p) => `<b>${esc(p)}</b>`).join(' <span aria-hidden="true">→</span> ')} <span aria-hidden="true">→</span> ${vend.length} ${vend.length === 1 ? 'item' : 'itens'} do cardápio.</p>`;
  }
  const ds = vend.map((v) => Math.abs(v.custo.delta_c));
  // o custo sobe com o preço mais alto ou com o aproveitamento mais baixo (o quilo limpo mais caro)
  const sobe = vend.reduce((t, v) => t + v.custo.delta_c, 0) > 0;
  const [min, max] = [Math.min(...ds), Math.max(...ds)];
  const faixa = min === max ? R(max) : `de ${R(min)} a ${R(max)}`;
  const s = ef.semana;
  const semana = s.unidades && s.sobra_delta_c
    ? ` <span class="ce-semana">No plano da semana (${s.unidades} ${s.unidades === 1 ? 'item' : 'itens'}): <b${rola('semana', s.sobra_delta_c)}>${s.sobra_delta_c < 0 ? '−' : '+'} ${R(Math.abs(s.sobra_delta_c))}</b> de sobra.</span>`
    : '';
  const ap = x.aproveitamento ?? { antes: 1, depois: 1 };
  const mudouPreco = x.delta_c !== 0;
  const mudouAprov = ap.antes !== ap.depois;
  const preco = mudouPreco ? `a <b${rola('rs-preco', x.por.depois.c)}>${C.mostrarPrecoPor(x.por.depois)}</b> (${x.delta_c > 0 ? '+' : '−'}${Math.round(Math.abs(x.pct) * 100)}%)` : '';
  const aprov = mudouAprov
    ? `aproveitando <b${rolaN('rs-aprov', ap.depois * 100, 1)}>${pctTxt(ap.depois * 100)}</b> (era ${pctTxt(ap.antes * 100)}), com o quilo limpo a <b${rola('rs-limpo', x.por_limpo.depois.c)}>${R(x.por_limpo.depois.c)}</b>`
    : '';
  const oQue = [preco, aprov].filter(Boolean).join(' e ');
  return `<p class="ce-resumo ${sobe ? 'pior' : 'melhor'}"><b>${esc(x.nome)}</b> ${oQue}: cada item do cardápio custa ${faixa} ${sobe ? 'a mais' : 'a menos'}, e a sobra ${sobe ? 'cai' : 'sobe'} o mesmo tanto.${semana}</p>`;
}

/** O resumo do "e se o preço mudar?" em texto (para o leitor de tela, quando a pessoa solta a faixa). */
export function textoDoEfeito(estado, id) {
  const ef = efeitoDe(estado, id);
  if (!ef || ef.erro) return '';
  const DE = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
  return resumoEfeito(ef).replace(/<[^>]+>/g, '').replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => DE[m]).replace(/\s+/g, ' ').trim();
}

export const SAIDAS = {
  // o menu
  'menu-despensa': (e) => `${e.dados.despensa.length} ${e.dados.despensa.length === 1 ? 'item' : 'itens'}${e.calc.baixo.length ? ` · ${e.calc.baixo.length} abaixo do mínimo` : ''}`,
  'menu-receitas': (e) => `${e.dados.receitas.length} ${e.dados.receitas.length === 1 ? 'receita' : 'receitas'}`,
  'menu-cardapio': (e) => `${e.dados.cardapio.length} ${e.dados.bases.length ? (e.dados.cardapio.length === 1 ? 'sabor' : 'sabores') : (e.dados.cardapio.length === 1 ? 'produto' : 'produtos')}`,
  'menu-meio': (e) => (e.calc.meio && !e.calc.meio.erro ? esc(e.calc.meio.nomes.join(' + ')) : 'escolha 2 sabores'),
  'menu-compras': (e) => (e.calc.compras.total_c ? `falta uns <span${rola('menu', e.calc.compras.total_c)}>${R(e.calc.compras.total_c)}</span>` : e.comprados.size ? 'tudo comprado' : 'ponha o plano'),
  'menu-loja': (e) => {
    const l = e.calc.loja;
    if (!l) return '';
    if (l.usa === 'mes') return `<span${rolaN('menu-loja', Math.round(l.pct * 1000) / 10, 1)}>${pctTxt(l.pct * 100)}</span> de cada venda`;
    return l.aviso ? 'falta o que vende' : 'a média do ramo';
  },

  // (camadas a fundo) as contas da loja
  'loja-cartao': (e) => {
    const l = e.calc.loja;
    if (!l) return '';
    const agora = l.usa === 'mes'
      ? `As fichas usam as contas da loja: <b${rolaN('lc-pct', Math.round(l.pct * 1000) / 10, 1)}>${pctTxt(l.pct * 100)}</b> de cada venda.`
      : `As fichas usam a média do ramo: de ${pctTxt(l.media[0] * 100)} a ${pctTxt(l.media[1] * 100)} de cada venda vai pras contas da loja.${l.aviso ? ' Falta quanto a loja vende no mês.' : ''}`;
    return `<span class="lc-icone" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg></span>
      <span class="lc-texto"><b>As contas da loja</b><span>${agora}</span></span><span class="lc-ir">${l.usa === 'mes' ? 'Mudar' : 'Pôr as suas'} <span aria-hidden="true">→</span></span>`;
  },
  'loja-ex-fat': (e) => (e.dados.loja?.faturamento_exemplo ? '<span class="selo-exemplo">exemplo</span>' : '<span class="ao-vivo">Arraste e veja</span>'),
  'loja-vende-nota': (e) => {
    const l = e.calc.loja;
    if (!l) return '';
    if (!(l.faturamento_c > 0)) return 'Ponha quanto a loja vende no mês (o que entra no caixa, somando o balcão, o app e a entrega). Sem ele, a ficha fica com a média do ramo.';
    if (!(l.total_c > 0)) return 'Agora ponha as contas do mês aqui embaixo.';
    return `Vendendo uns <b${rola('lv-fat', l.faturamento_c)}>${R(l.faturamento_c)}</b> no mês, de cada <b>${R(10000)}</b> que entram, <b${rola('lv-cem', Math.round(l.pct * 10000))}>${R(Math.round(l.pct * 10000))}</b> pagam as contas. Vendendo mais, esse pedaço fica menor.`;
  },
  'conta-peso': (e, { j }) => {
    const c = e.calc.loja?.linhas?.[Number(j)];
    if (!c) return '';
    if (c.erro) return `<span class="erro-linha">${esc(c.erro.replace(/^[^:]*: /, ''))}</span>`;
    if (c.vazia || !(c.por_mes_c > 0)) return '<span class="nada">—</span>';
    if (c.pct === null) return '<span class="nada">falta o que vende</span>';
    return `<b${rolaN('cp', Math.round(c.pct * 1000) / 10, 1)}>${pctTxt(c.pct * 100)}</b><small>de cada venda</small>${c.exemplo ? '<i class="ex">exemplo</i>' : ''}`;
  },
  'loja-maquininha': (e) => {
    const m = e.calc.loja?.maquininha;
    if (!m) return '';
    const erro = (e.calc.loja.erros ?? []).find((x) => /maquininha/i.test(x));
    if (erro) return erroHtml(erro);
    if (!(m.taxa > 0)) return 'Sem a taxa, a ficha conta o balcão sem a maquininha.';
    return `Dá <b${rolaN('lm', Math.round(m.efetiva * 10000) / 100, 2)}>${pctTxt(Math.round(m.efetiva * 10000) / 100)}</b> de cada venda no balcão${m.parte < 1 ? ` (${pctTxt(m.taxa * 100)} em ${pctTxt(m.parte * 100)} das vendas)` : ''}.${e.dados.loja?.maquininha_exemplo ? ' <span class="selo-exemplo">exemplo</span>' : ''}`;
  },
  'loja-imposto': (e) => {
    const im = e.calc.loja?.imposto;
    if (!im) return '';
    const faixa = im.faixa[0] === im.faixa[1] ? pctTxt(im.faixa[0] * 100) : `de ${pctTxt(im.faixa[0] * 100)} a ${pctTxt(im.faixa[1] * 100)}`;
    if (im.origem === 'das') return `MEI: o DAS de uns ${R(im.das_mes_c)} por mês ÷ o que a loja vende = <b${rolaN('li', Math.round(im.faixa[0] * 10000) / 100, 2)}>${pctTxt(Math.round(im.faixa[0] * 10000) / 100)}</b> de cada venda (estimado).`;
    return `${esc(im.regime)}${im.usa ? ' (sem o regime, a do Simples)' : ''}: <b>${faixa}</b> de cada venda (estimado).${im.regime_id === 'mei' ? ' Com quanto a loja vende, vira o DAS ÷ o que vende.' : ''}`;
  },
  'loja-resultado': (e) => {
    const l = e.calc.loja;
    if (!l) return '';
    const im = l.imposto?.faixa ?? [0, 0];
    const imMeio = (im[0] + im[1]) / 2;
    const maq = l.maquininha?.efetiva ?? 0;
    const real = l.usa === 'mes';
    const contas = real ? l.pct : (l.media[0] + l.media[1]) / 2;
    const resto = Math.max(0, 1 - contas - imMeio - maq);
    // de cada 100 reais: cada conta (ou a média), o imposto, a maquininha e o que fica pros ingredientes e a sobra
    const partes = real
      ? l.linhas.filter((c) => c.pct > 0).map((c, k) => ({ chave: `c${c.i}`, nome: c.nome || `Conta ${c.i + 1}`, v: c.pct, cls: `seg-conta t${k % 4}` }))
      : [{ chave: 'media', nome: 'As contas (a média do ramo)', v: contas, cls: 'seg-media' }];
    partes.push({ chave: 'imp', nome: 'O imposto', v: imMeio, cls: 'seg-imp' });
    if (maq > 0) partes.push({ chave: 'maq', nome: 'A maquininha', v: maq, cls: 'seg-maq' });
    const cem = (v) => Math.round(v * 10000);
    const big = real
      ? `<p class="lr-n"><b class="numero-grande"${rolaN('lr-pct', Math.round(contas * 1000) / 10, 1)}>${pctTxt(contas * 100)}</b><span>de cada venda vai pras contas da loja</span></p>
         <p class="lr-compara">${contas < l.media[0] ? 'Abaixo' : contas > l.media[1] ? 'Acima' : 'Dentro'} da média do ramo (de ${pctTxt(l.media[0] * 100)} a ${pctTxt(l.media[1] * 100)}).</p>`
      : `<p class="lr-n"><b class="numero-grande">${pctTxt(l.media[0] * 100)} a ${pctTxt(l.media[1] * 100)}</b><span>a média do ramo: é o que as fichas usam hoje</span></p>
         <p class="lr-compara">${l.aviso ? '<b>Falta quanto a loja vende no mês</b> pra virar o % de verdade.' : 'Ponha as contas e quanto a loja vende: a média vira o % da sua loja.'}</p>`;
    return `<p class="palco-rot"><span>A conta da loja</span>${l.linhas.some((c) => c.exemplo) ? '<span class="selo-exemplo">exemplo</span>' : ''}</p>${big}
      <p class="lr-rot">De cada ${R(10000)} que entram no balcão</p>
      <div class="lr-barra" aria-hidden="true">${partes.map((x) => `<i class="${x.cls}" data-rola="lb-${esc(x.chave)}" data-rola-anima="width" style="width:${(x.v * 100).toFixed(2)}%"></i>`).join('')}<i class="seg-resto" data-rola="lb-resto" data-rola-anima="width" style="width:${(resto * 100).toFixed(2)}%"></i></div>
      <ul class="lr-lista">${partes.map((x) => `<li><i class="${x.cls}" aria-hidden="true"></i><span>${esc(x.nome)}</span><b${rola(`ll-${x.chave}`, cem(x.v))}>${R(cem(x.v))}</b></li>`).join('')}
        <li class="lr-resto"><i class="seg-resto" aria-hidden="true"></i><span>Fica pros ingredientes e pra sobra</span><b${rola('ll-resto', cem(resto))}>${R(cem(resto))}</b></li></ul>
      <p class="ajuda">O imposto é estimado (o meio da faixa). ${real ? '' : 'Na média, as contas vão de 15 a 25 em cada 100.'}</p>`;
  },
  'loja-fichas': (e) => {
    const d = e.dados;
    const antes = cozinhaNaMedia(e);
    const itens = [...d.cardapio, ...d.adicionais].map((p) => {
      const depois = e.calc.produtos.get(p.id) ?? e.calc.adicionais.get(p.id);
      const a = antes?.produtos.get(p.id) ?? antes?.adicionais.get(p.id);
      const k = depois?.cupons?.find((c) => c.canal === 'balcao');
      const ka = a?.cupons?.find((c) => c.canal === 'balcao');
      if (!k) return `<li class="lf com-erro"><b>${esc(p.nome || 'Sem nome')}</b><span class="nada">falta arrumar a ficha</span></li>`;
      const dif = ka ? k.sobra - ka.sobra : 0;
      return `<li class="lf"><a href="#cardapio/${esc(p.id)}"><b>${esc(p.nome)}</b><small>${d.adicionais.includes(p) ? 'adicional' : p.base && temTamanhos(d) ? `pizza ${esc(nomeDoTamanho(d, tamanhoDaReceita(d)).toLowerCase())}` : 'no balcão'}</small></a>
        <span class="lf-sobra ${k.sinal.cls}"><span${rola(`lf-${p.id}`, k.sobra)}>${sobraTxt(k)}</span><small>de sobra</small></span>
        ${difHtml(`lf-${p.id}`, dif, { bomSeSobe: true })}</li>`;
    }).join('');
    return `<ul class="lf-lista">${itens}</ul><p class="ajuda">No balcão, em cada venda. ${e.calc.loja?.usa === 'mes' ? 'A diferença é contra a média do ramo.' : 'Com as contas da loja, cada ficha troca a média pelo % de verdade.'}</p>`;
  },

  // a simulação que está valendo (em todo passo)
  simulando: (e) => {
    // na despensa, o insumo aberto já mostra a simulação dele ali mesmo (e a faixa não empurra a tela no meio do arrasto)
    const aqui = e.rota?.vista === 'despensa' ? e.aberto : null;
    // (camadas a fundo) o preço e o aproveitamento que estão sendo simulados
    const ids = [...new Set([...e.simula.keys(), ...(e.simulaAprov?.keys() ?? [])])];
    const lista = ids.map((id) => ({ id, ins: e.dados.despensa.find((x) => x.id === id), s: e.simula.get(id), sa: e.simulaAprov?.get(id) }))
      .filter(({ id, ins, s, sa }) => ins && (s?.pct || sa) && id !== aqui);
    if (!lista.length) return '';
    const parte = ({ ins, s, sa }) => `<b>${esc(ins.nome)} ${[s?.pct ? textoPct(s.pct) : '', sa ? `aproveitando ${pctTxt(aprovPct(ins))}` : ''].filter(Boolean).join(' e ')}</b>`;
    const soPreco = lista.every((x) => !x.sa);
    return `<div class="simulando"><span class="simulando-luz" aria-hidden="true"></span><p>Simulando ${lista.map(parte).join(', ')}. A cozinha inteira já faz a conta com ${soPreco ? (lista.length === 1 ? 'esse preço' : 'esses preços') : 'isso'}.</p><button type="button" class="botao-mini" data-acao="precos-hoje">Voltar ao de hoje</button></div>`;
  },
  'aprov-conta': (e, { id }) => {
    const ins = e.dados.despensa.find((x) => x.id === id);
    const x = e.calc.insumos.get(id);
    if (!ins || !x) return '';
    if (x.erro) return erroHtml(x.erro);
    const sai = ins.sai && x.aproveitamento < 1 ? ` Sai ${esc(ins.sai)}.` : '';
    const limpo = `<b${rolaQ('ac-pac', x.pacote_limpo, x.unidade)}>${esc(q(x.pacote_limpo, x.unidade))}</b>`;
    const preco = `<b${rola('ac-limpo', x.por_limpo.c)}>${R(x.por_limpo.c)}</b>`;
    if (x.unidade === 'un') return `${limpo} boas em cada ${esc(q(x.pacote, x.unidade))} compradas: cada uma sai ${preco} (a comprada, ${R(x.por.c)}).${sai}`;
    const kg = x.unidade === 'ml' ? 'litro' : 'quilo';
    return `${limpo} ${x.unidade === 'ml' ? 'aproveitados' : 'limpos'} em cada ${esc(q(x.pacote, x.unidade))} comprado: o ${kg} ${x.unidade === 'ml' ? 'aproveitado' : 'limpo'} sai ${preco} (o comprado, ${R(x.por.c)}).${sai}`;
  },

  // 1. a despensa
  'placar-despensa': (e) => {
    const ok = [...e.calc.insumos.values()].filter((i) => !i.erro);
    const baixo = e.calc.baixo.length;
    const valor = ok.reduce((t, i) => t + i.valor_c, 0);
    return [
      ['Na despensa', `<b class="placa-n"${rolaN('n', e.dados.despensa.length)}>${e.dados.despensa.length}</b>`, e.dados.despensa.length === 1 ? 'insumo' : 'insumos', ''],
      ['Abaixo do mínimo', `<b class="placa-n"${rolaN('baixo', baixo)}>${baixo}</b>`, baixo ? 'pra repor' : 'tudo em dia', baixo ? ' alerta' : ''],
      ['Em estoque', `<b class="placa-n"${rola('valor', valor)}>uns ${R(valor)}</b>`, 'pelo preço do pacote', ''],
    ].map(([rot, n, sub, cls]) => `<div class="placa vidro${cls}"><span class="placa-rot">${rot}</span>${n}<small>${sub}</small></div>`).join('');
  },
  'nome-insumo': (e, { id }) => esc(e.dados.despensa.find((i) => i.id === id)?.nome || 'Insumo novo'),
  insumo: (e, { id }) => {
    const x = e.calc.insumos.get(id);
    if (!x) return '';
    if (x.erro) return erroHtml(x.erro);
    const teto = Math.max(x.minimo * 2, x.tem, 1);
    const [cls, txt] = x.zerado ? ['ruim', 'Acabou'] : x.abaixo ? ['atencao', 'Abaixo do mínimo'] : ['bom', 'Em dia'];
    // (camadas a fundo) o quilo limpo, além do comprado: "R$ 8,00 o kg · limpo R$ 8,89"
    // a marca "exemplo" só com o aproveitamento de exemplo (mexendo na faixa, já é a simulação da pessoa)
    const ex = e.dados.despensa.find((i) => i.id === id)?.aproveitamento_exemplo && !e.simulaAprov?.has(id) ? ' <i class="ex">exemplo</i>' : '';
    const limpo = x.aproveitamento < 1
      ? `<small class="por-limpo">limpo <b${rola('por-limpo', x.por_limpo.c)}>${R(x.por_limpo.c)}</b><span class="pl-pct"> · <span${rolaN('aprov', x.aproveitamento * 100, 1)}>${pctTxt(x.aproveitamento * 100)}</span></span>${ex}</small>`
      : '';
    return `<span class="por"><b${rola('por', x.por.c)}>${C.mostrarPrecoPor(x.por)}</b>${limpo}</span>
      <span class="nivel ${cls}" role="img" aria-label="Tem ${esc(q(x.tem, x.unidade))}${x.minimo ? `, o mínimo é ${esc(q(x.minimo, x.unidade))}` : ''}"><i data-rola="nivel" data-rola-anima="width" style="width:${Math.min(100, (x.tem / teto) * 100).toFixed(1)}%"></i>${x.minimo > 0 ? `<b style="left:${Math.min(100, (x.minimo / teto) * 100).toFixed(1)}%"></b>` : ''}</span>
      <span class="pill ${cls}"><i></i>${txt}</span>`;
  },
  efeito: (e, { id }) => {
    const ef = efeitoDe(e, id);
    if (!ef) return '';
    if (ef.erro) return erroHtml(ef.erro);
    const x = ef.insumo;
    const vendidos = [...ef.produtos, ...(ef.meio ? [ef.meio] : []), ...ef.adicionais];
    if (!ef.receitas.length && !ef.bases.length && !vendidos.length) return resumoEfeito(ef);
    // (camadas a fundo) com perda na limpeza, o que desce pelas camadas é o quilo limpo
    const ap = x.aproveitamento ?? { antes: 1, depois: 1 };
    const limpa = ap.depois < 1 || ap.antes < 1;
    const valor = limpa ? x.por_limpo : x.por;
    const subPacote = `o pacote de ${esc(x.pacote)} sai por <span${rola('pacote', x.depois_c)}>${R(x.depois_c)}</span>`;
    const camadas = [{
      rot: 'Na despensa',
      itens: [itemCusto(`i-${x.id}`, limpa ? `${x.nome} (limpo)` : x.nome, `<b${rola(`v-i-${x.id}`, valor.depois.c)}>${C.mostrarPrecoPor(valor.depois)}</b>`, valor.depois.c - valor.antes.c,
        limpa ? `${subPacote} · aproveita <span${rolaN('aprov', ap.depois * 100, 1)}>${pctTxt(ap.depois * 100)}</span>` : subPacote)],
    }];
    for (const c of [...new Set(ef.receitas.map((r) => r.camada ?? 0))]) {
      camadas.push({
        rot: `Receita da casa · camada ${c}`,
        itens: ef.receitas.filter((r) => (r.camada ?? 0) === c).map((r) => (r.erro ? erroItem(r)
          : itemCusto(`r-${r.id}`, r.nome, `<b${rola(`v-r-${r.id}`, r.por.depois.c)}>${C.mostrarPrecoPor(r.por.depois)}</b>`, r.por.depois.c - r.por.antes.c, `leva ${esc(r.via.map((v) => nomeDe(e.dados, v)).join(' e '))}`))),
      });
    }
    if (ef.bases.length) {
      camadas.push({
        rot: ef.bases.length === 1 ? 'A base da pizza' : 'As bases',
        itens: ef.bases.map((b) => (b.erro ? erroItem(b)
          : itemCusto(`b-${b.id}`, b.nome, `<b${rola(`v-b-${b.id}`, b.depois_c)}>${R(b.depois_c)}</b><small class="ce-cada">cada</small>`, b.delta_c, `leva ${esc(b.via.map((v) => nomeDe(e.dados, v)).join(' e '))}`))),
      });
    }
    const naRef = temTamanhos(e.dados) ? ` · na ${esc(nomeDoTamanho(e.dados, tamanhoDaReceita(e.dados)).toLowerCase())}` : '';
    camadas.push(vendidos.length
      ? { rot: `No cardápio · ${vendidos.length} ${vendidos.length === 1 ? 'item' : 'itens'}${naRef}`, itens: vendidos.map(itemVendido), classe: 'ce-vendidos' }
      : { rot: 'No cardápio', itens: ['<p class="ajuda">Ainda não chega em nenhum produto.</p>'] });
    return `${resumoEfeito(ef)}<ol class="ce-camadas">${camadas.map((c, n) => `<li class="ce-camada${c.classe ? ` ${c.classe}` : ''}" style="--n:${n}"><span class="ce-rot">${c.rot}</span><div class="ce-itens">${c.itens.join('')}</div></li>`).join('')}</ol>`;
  },

  // 2. as receitas da casa
  camadas: (e) => {
    const d = e.dados;
    const rs = d.receitas.map((r) => e.calc.receitas.get(r.id)).filter((r) => r && !r.erro);
    const max = Math.max(0, ...rs.map((r) => r.camada));
    const degraus = [`<li class="degrau chao"><span class="degrau-rot">A despensa</span><span class="chip-c">${d.despensa.length} insumos</span></li>`];
    for (let c = 1; c <= max; c++) {
      degraus.push(`<li class="degrau" style="--d:${c}"><span class="degrau-rot">Camada ${c}<small>${c === 1 ? 'só com a despensa' : `usa a camada ${c - 1}`}</small></span>${rs.filter((r) => r.camada === c).map((r) => `<button type="button" class="chip-c receita" data-acao="rolar" data-id="receita-${esc(r.id)}">${esc(r.nome)}<small${rola(`c-${r.id}`, r.por.c)}>${C.mostrarPrecoPor(r.por)}</small></button>`).join('')}</li>`);
    }
    degraus.push(`<li class="degrau topo" style="--d:${max + 1}"><span class="degrau-rot">O cardápio</span><span class="chip-c">${d.cardapio.length} ${d.bases.length ? 'sabores' : 'produtos'}</span></li>`);
    const erros = d.receitas.filter((r) => e.calc.receitas.get(r.id)?.erro).length;
    return `<ol class="escada">${degraus.reverse().join('')}</ol>${erros ? `<p class="erro-linha">${erros === 1 ? '1 receita tem' : `${erros} receitas têm`} problema: veja abaixo.</p>` : ''}`;
  },
  'receita-camada': (e, { id }) => {
    const r = e.calc.receitas.get(id);
    if (!r || r.erro) return '';
    return `<span class="camada-selo c${Math.min(r.camada, 4)}">Camada ${r.camada}</span>`;
  },
  'linha-receita': (e, { id, j }) => {
    const l = e.calc.receitas.get(id)?.linhas?.[Number(j)];
    if (!l) return '<span class="nada">—</span>';
    return `${l.tipo === 'receita' ? '<i class="camada-mini">receita</i>' : ''}<b${rola('l', l.custo_c)}>${centavo(l.custo_c)}</b>${compraBruta(l)}`;
  },
  // (camadas a fundo) o que entra, o que rende e a perda no preparo
  perda: (e, { id }) => {
    const r = e.calc.receitas.get(id);
    if (!r || r.erro) return '';
    const limpeza = r.limpeza_c > 0 ? `<p class="perda-limpeza">Na limpeza vão fora uns <b${rola('pf-limpeza', r.limpeza_c)}>${R(r.limpeza_c)}</b> por receita (${esc(oQueSaiDa(e, r))}).</p>` : '';
    if (r.perda === null || !r.entra) return limpeza;
    const rende = Math.max(0, Math.min(1.6, r.rende.valor / r.entra.valor));
    const barra = (cls, w, chave) => `<span class="pf-barra"><i class="${cls}" data-rola="${chave}" data-rola-anima="width" style="width:${(Math.min(1, w) * 100).toFixed(1)}%"></i></span>`;
    const perde = r.perda >= 0
      ? `Perde <b${rolaN('pf-pct', Math.round(r.perda * 1000) / 10, 1)}>${pctTxt(r.perda * 100)}</b> no preparo: o que reduz no fogo e o que fica na panela.`
      : `Rende <b${rolaN('pf-pct', Math.round(-r.perda * 1000) / 10, 1)}>${pctTxt(-r.perda * 100)}</b> a mais do que entra: a água do preparo.`;
    return `<div class="perda-funil" role="img" aria-label="${esc(textoDaPerda(r))}">
        <div class="pf-linha"><span class="pf-rot">Entra</span>${barra('pf-entra', rende > 1 ? 1 / rende : 1, 'pf-b-entra')}<b${rolaQ('pf-entra', r.entra.valor, r.entra.unidade)}>${esc(q(r.entra.valor, r.entra.unidade))}</b></div>
        <div class="pf-linha"><span class="pf-rot">Rende</span>${barra('pf-rende', rende > 1 ? 1 : rende, 'pf-b-rende')}<b${rolaQ('pf-rende', r.rende.valor, r.rende.unidade)}>${esc(q(r.rende.valor, r.rende.unidade))}</b></div>
      </div>
      <p class="perda-nota">${perde}</p>${limpeza}`;
  },
  receita: (e, { id }) => {
    const d = e.dados;
    const r = e.calc.receitas.get(id);
    if (!r) return '';
    if (r.erro) return erroHtml(r.erro);
    const usa = [...(r.usada_em?.receitas ?? []), ...(r.usada_em?.produtos ?? []), ...(r.usada_em?.adicionais ?? [])];
    return `<div class="receita-numeros">
        <div><span class="placa-rot">A receita inteira</span><b${rola('total', r.custo_c)}>${R(r.custo_c)}</b><small>rende ${esc(q(r.rende.valor, r.rende.unidade))}${r.pronto > 0 ? ` · tem ${esc(q(r.pronto, r.rende.unidade))} pronto` : ''}</small></div>
        <div class="destaque"><span class="placa-rot">Sai por</span><b${rola('por', r.por.c)}>${C.mostrarPrecoPor(r.por)}</b><small>${r.perda > 0 ? 'com a perda no preparo: é o custo que entra no produto' : 'é o custo que entra no produto'}</small></div>
      </div>
      ${r.erro_pronto ? erroHtml(r.erro_pronto) : ''}
      <p class="usada">${usa.length ? `Entra em ${usa.map((x) => `<span class="chip-c">${esc(nomeDe(d, x))}</span>`).join(' ')}` : 'Ainda não entra em nenhum produto.'}</p>`;
  },

  // 3. o cardápio
  'base-total': (e, { id }) => {
    const b = baseNaTela(e, id);
    if (!b) return '';
    if (b.erro) return erroHtml(b.erro);
    const t = tamanhoAtual(e);
    const ref = e.calc.bases.get(id);
    const daReceita = t && t !== tamanhoDaReceita(e.dados) && ref && !ref.erro ? ` · na ${esc(nomeDoTamanho(e.dados, tamanhoDaReceita(e.dados)).toLowerCase())}, ${R(ref.total_c)}` : '';
    return `<span class="placa-rot">Cada base ${t ? `da ${esc(nomeDoTamanho(e.dados, t).toLowerCase())} ` : ''}custa</span><b${rola('total', b.total_c)}>${R(b.total_c)}</b><small>ingredientes <span${rola('ing', b.ingredientes_c)}>${R(b.ingredientes_c)}</span> · embalagem <span${rola('emb', b.embalagem_c)}>${R(b.embalagem_c)}</span>${daReceita}</small>`;
  },
  'linha-base': (e, { id, g, j }) => {
    // a linha é a da receita (a da grande): o custo é o do tamanho da receita, e o "compra" é o bruto dela
    const b = e.calc.bases.get(id);
    const c = b?.[g]?.[Number(j)];
    const l = e.dados.bases.find((x) => x.id === id)?.[g]?.[Number(j)];
    const ins = e.dados.despensa.find((x) => x.id === l?.usa);
    let extra = '';
    if (ins && g === 'itens') {
      try { const a = C.aproveitamentoDe(ins); const m = C.medida(l.vai, e.tab, ins.nome); extra = compraBruta({ aproveitamento: a, bruto: { valor: m.valor / a, unidade: m.unidade } }); } catch { /* sem a conta */ }
    }
    return c === undefined ? '<span class="nada">—</span>' : `<b${rola('l', c)}>${centavo(c)}</b>${extra}`;
  },
  'linha-tam': (e, { t, k }) => {
    // a caixa do tamanho (a da broto): o custo de cada linha, pela calculadora
    const d = e.dados;
    const b = d.bases.find((x) => x.tamanho);
    if (!b) return '<span class="nada">—</span>';
    let c;
    try { c = C.custoDaBase(d, b.id, e.tab, { receitas: e.calc.receitas, tamanho: t }).embalagem[Number(k)]; } catch { c = undefined; }
    return c === undefined ? '<span class="nada">—</span>' : `<b${rola('l', c)}>${centavo(c)}</b>`;
  },
  // o tamanho: o desenho da pizza (cresce e diminui) e quanto cada tamanho leva da receita
  'tam-disco': (e) => {
    const d = e.dados;
    const atual = tamanhoAtual(e);
    const ts = d.tamanhos.map((t) => ({ t, cm: diametroOu(t) })).filter((x) => x.cm);
    if (!ts.length) return '';
    const escala = escalaDaPizza(e);
    const max = Math.max(...ts.map((x) => x.cm));
    const aros = ts.map((x) => `<circle class="tam-aro${x.t.id === atual ? ' atual' : ''}" cx="100" cy="100" r="${((x.cm / max) * 92).toFixed(1)}"/>`).join('');
    const sel = ts.find((x) => x.t.id === atual);
    return `<svg class="tam-aros" viewBox="0 0 200 200" focusable="false">${aros}</svg>
      <div class="tam-pizza" data-rola="tam-pizza" data-rola-anima="transform" style="transform:scale(${escala.toFixed(4)})">${D.discoSvg()}</div>
      <span class="tam-cm"${sel ? rolaN('tam-cm', sel.cm, Number.isInteger(sel.cm) ? 0 : 1) : ''}>${sel ? cmTxt(sel.cm) : ''}</span>`;
  },
  'tam-nota': (e) => {
    const d = e.dados;
    const atual = tamanhoAtual(e);
    const ref = tamanhoDaReceita(d);
    let ts;
    try { ts = C.tamanhosDaBase(d, d.bases.find((b) => b.tamanho)?.id); } catch (err) { return erroHtml(err.erros ?? err.message); }
    const t = ts.find((x) => x.id === atual);
    if (!t) return '';
    const nomeRef = nomeDoTamanho(d, ref).toLowerCase();
    if (t.daReceita) return `A receita é a da <b>${esc(t.nome.toLowerCase())}</b> (${cmTxt(t.diametro)}). Os outros tamanhos levam a massa, o molho e a cobertura pela área do disco, e a borda pelo contorno.`;
    return `A ${esc(t.nome.toLowerCase())} (${cmTxt(t.diametro)}) leva <b${rolaN('tn-area', Math.round(t.area * 100), 0)}>${Math.round(t.area * 100)}%</b> da massa, do molho e da cobertura da ${esc(nomeRef)} (a área do disco), e <b${rolaN('tn-borda', Math.round(t.contorno * 100), 0)}>${Math.round(t.contorno * 100)}%</b> da borda (o contorno).`;
  },
  'tam-agora': (e) => { const t = tamanhoAtual(e); return t ? `· ${esc(nomeDoTamanho(e.dados, t).toLowerCase())}` : ''; },
  sabor: (e, { id }) => {
    const d = e.dados;
    const p = d.cardapio.find((x) => x.id === id);
    if (!p) return '';
    const x = fichaNaTela(e, id);
    const base = d.bases.find((b) => b.id === p.base);
    const t = base ? tamanhoAtual(e) : null;
    if (!x || x.erro) {
      return `<span class="sabor-topo"><b>${esc(p.nome || 'Sem nome')}</b>${selo(d)}</span>${erroHtml(x?.erro)}<span class="sabor-abrir">Abrir e arrumar <span aria-hidden="true">→</span></span>`;
    }
    const f = x.ficha;
    // (camadas a fundo) o preço de cada tamanho, com o da tela aceso
    const tams = t ? `<span class="sabor-tams">${d.tamanhos.filter((z) => diametroOu(z)).map((z) => {
      const c = emCentavos((z.id === tamanhoDaReceitaDe(d, p) ? p.precos : p.precos_tamanho?.[z.id])?.balcao);
      return `<span class="${z.id === t ? 'atual' : ''}">${esc(z.nome)} <b>${c ? R(c) : '—'}</b></span>`;
    }).join('')}</span>` : '';
    return `<span class="sabor-topo"><b>${esc(p.nome)}</b>${F.seloExemplo(f)}</span>
      <span class="sabor-sub">${t ? `${esc(nomeDoTamanho(d, t))} · ` : base ? `${esc(base.nome)} · ` : ''}cada ${f.rende > 1 ? 'unidade' : 'um'} custa <span${rola('custo', f.totais.insumos_c)}>${R(f.totais.insumos_c)}</span></span>
      ${barraCusto(e, p.id)}
      <span class="fc-resumo">${F.montarResumo(f, { vendeApp: x.entrada.vende_app !== false })}</span>
      ${tams}
      <span class="sabor-abrir">A ficha e ${base ? 'a pizza' : 'o produto'} por dentro <span aria-hidden="true">→</span></span>`;
  },
  'linha-adicional': (e, { id, j }) => {
    // a linha como foi escrita (na grande): o custo dela e o que se compra pra ela
    const x = e.calc.adicionais.get(id);
    const l = x?.ficha?.ingredientes?.[Number(j)];
    const a = e.dados.adicionais.find((y) => y.id === id);
    return l ? `<b${rola('l', l.custo_c)}>${centavo(l.custo_c)}</b>${compraDaFicha(e, x, Number(j), a?.itens?.[Number(j)])}` : '<span class="nada">—</span>';
  },
  adicional: (e, { id }) => {
    const x = fichaNaTela(e, id);
    if (!x) return '';
    if (x.erro) return erroHtml(x.erro);
    const k = x.cupons.find((c) => c.canal === 'balcao');
    const t = tamanhoAtual(e);
    return `<span>${t ? `na ${esc(nomeDoTamanho(e.dados, t).toLowerCase())}, ` : ''}custa <b${rola('custo', x.ficha.totais.insumos_c)}>${R(x.ficha.totais.insumos_c)}</b></span><span class="pill ${k.sinal.cls}"><i></i>sobra <span${rola('sobra', k.sobra)}>${sobraTxt(k)}</span></span><a class="botao-mini" href="#cardapio/${esc(id)}">a ficha</a>`;
  },
  // (camadas a fundo) o preço do adicional no botão "+ borda" do produto (o do tamanho da tela)
  'extra-preco': (e, { id }) => {
    const x = fichaNaTela(e, id);
    const k = x?.cupons?.find((c) => c.canal === 'balcao');
    return k ? ` <span${rola('ep', k.preco)}>${R(k.preco)}</span>` : '';
  },

  // a ficha de 1 produto
  titulo: (e, { id }) => esc(nomeDe(e.dados, id)),
  ficha: (e, { id }) => {
    // (camadas a fundo) a ficha no tamanho da tela e com os adicionais ligados (a pizza com a borda)
    const x = fichaNaTela(e, id, { adicionais: extrasDe(e, id) });
    if (!x || x.erro) return `<div class="erros" role="alert"><b>Falta arrumar pra ficha sair:</b><ul>${(x?.erro ?? []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>`;
    const v = { vendeApp: x.entrada.vende_app !== false };
    return `${cupomDaLoja(x.ficha, v)}${F.montarAppSugerido(x.ficha, v)}${F.montarPrecoCerto(x.ficha)}${F.montarMaisPesa(x.ficha)}${F.montarNotas(x.ficha, v)}${notaDaLoja(e, x.ficha, id)}`;
  },
  'preco-vivo': (e, { id }) => {
    const extras = extrasDe(e, id);
    const x = fichaNaTela(e, id, { adicionais: extras });
    if (!x || x.erro) return '<p class="ajuda">Ponha o preço e os ingredientes pra ver a sobra.</p>';
    // com a borda: o preço é a soma (a pizza + a borda), e a sobra é a da venda inteira
    const combo = extras.length ? `<p class="vivo-combo">Com ${esc(extras.map((a) => nomeDe(e.dados, a).toLowerCase()).join(' e '))}: cobra <b${rola('vc-preco', x.cupons[0]?.preco ?? 0)}>${R(x.cupons[0]?.preco ?? 0)}</b> no balcão (a soma dos preços).</p>` : '';
    return `${combo}<div class="vivo-canais">${x.cupons.map((k) => `<div class="vivo ${k.sinal.cls}"><span class="vivo-rot"><span class="canal">${TITULO[k.canal]}</span><span class="pill ${k.sinal.cls}"><i></i>${k.sinal.txt}</span></span><b class="vivo-n"${rola(`vivo-${k.canal}`, k.sobra)}>${sobraTxt(k)}</b><small>de sobra em cada venda de <span${rola(`vivo-p-${k.canal}`, k.preco)}>${R(k.preco)}</span></small></div>`).join('')}</div>`;
  },
  'linha-produto': (e, { id, g, j }) => {
    // a linha como foi escrita (na grande): o custo dela pela calculadora e o que se compra pra ela
    const x = calcDo(e, id);
    const d = e.dados;
    const mora = ondeMora(d, id);
    if (!x?.ficha || !mora) return '<span class="nada">—</span>';
    const p = d[mora.lista][mora.i];
    const base = d.bases.find((b) => b.id === p.base);
    const antes = g === 'itens' ? (base?.itens?.length ?? 0) : (base?.embalagem?.length ?? 0);
    const l = (g === 'itens' ? x.ficha.ingredientes : x.ficha.embalagem)[antes + Number(j)];
    const compra = g === 'itens' ? compraDaFicha(e, x, antes + Number(j), p.itens?.[Number(j)]) : '';
    return l ? `<b${rola('l', l.custo_c)}>${centavo(l.custo_c)}</b>${compra}` : '<span class="nada">—</span>';
  },
  arvore: (e, { id }) => {
    try {
      return arvoreHtml(e, arvoreDe(e, { produto: id, adicionais: extrasDe(e, id) }), `p-${id}`, { abreAte: 0 });
    } catch (err) { return erroHtml(err.erros ?? err.message); }
  },
  // (camadas a fundo) os tamanhos lado a lado: quanto custa, quanto cobra e quanto sobra em cada um
  'tamanhos-tabela': (e, { id }) => {
    const d = e.dados;
    const atual = tamanhoAtual(e);
    const extras = extrasDe(e, id);
    const linhas = d.tamanhos.filter((t) => diametroOu(t)).map((t) => {
      const x = fichaNaTela(e, id, { tamanho: t.id, adicionais: extras });
      const k = x?.cupons?.find((c) => c.canal === 'balcao');
      const aqui = t.id === atual;
      if (!k) return `<tr${aqui ? ' class="atual"' : ''}><th scope="row">${esc(t.nome)}<small>${cmTxt(diametroOu(t))}</small></th><td colspan="3" class="nada">${esc((x?.erro ?? ['sem o preço'])[0].replace(/^[^:]*: /, ''))}</td></tr>`;
      return `<tr${aqui ? ' class="atual"' : ''}><th scope="row">${esc(t.nome)}<small>${cmTxt(diametroOu(t))}</small></th>
        <td${rola(`tt-c-${t.id}`, x.ficha.totais.insumos_c)}>${R(x.ficha.totais.insumos_c).replace('R$ ', 'R$\u00a0')}</td>
        <td${rola(`tt-p-${t.id}`, k.preco)}>${R(k.preco).replace('R$ ', 'R$\u00a0')}</td>
        <td class="tt-sobra ${k.sinal.cls}"><span${rola(`tt-s-${t.id}`, k.sobra)}>${sobraTxt(k).replace('R$ ', 'R$\u00a0')}</span></td></tr>`;
    }).join('');
    return `<table class="tams-tabela"><caption class="so-leitor">A ${esc(nomeDe(d, id))} em cada tamanho, no balcão</caption>
      <thead><tr><th scope="col">Tamanho</th><th scope="col">Custa</th><th scope="col">Cobra</th><th scope="col">Sobra</th></tr></thead><tbody>${linhas}</tbody></table>
      <p class="ajuda">No balcão${extras.length ? `, com ${esc(extras.map((a) => nomeDe(d, a).toLowerCase()).join(' e '))}` : ''}. A cobertura cresce pela área do disco; a caixa é a de cada tamanho.</p>`;
  },

  // 4. o meio a meio
  'pizza-rot': (e) => {
    const d = e.dados;
    const [a, b] = d.meio_a_meio.sabores;
    return `<span><i style="--cor:${corDo(d, a)}"></i>${esc(nomeDe(d, a))}</span><span><i style="--cor:${corDo(d, b)}"></i>${esc(nomeDe(d, b))}</span>`;
  },
  regra: (e, { regra }) => {
    const m = meioNaTela(e);
    const nome = `<span class="regra-nome">${C.REGRAS[regra]}${regra === 'mais_caro' ? '<small>o jeito mais comum</small>' : '<small>a soma dos 2 ÷ 2</small>'}</span>`;
    if (!m || m.erro) return nome;
    const r = m.regras[regra];
    const k = r.cupons.find((x) => x.canal === 'balcao');
    if (!k || r.preco_c === null) return `${nome}<span class="regra-preco">sem o preço do balcão</span>`;
    return `${nome}<span class="regra-preco">cobra <span${rola('preco', r.preco_c)}>${R(r.preco_c)}</span> no balcão</span><span class="regra-sobra ${k.sinal.cls}"${rola('sobra', k.sobra)}>${sobraTxt(k)}</span><span class="regra-de">de sobra em cada pizza</span><span class="pill ${k.sinal.cls}"><i></i>${k.sinal.txt}</span>`;
  },
  'meio-diferenca': (e) => {
    const m = meioNaTela(e);
    if (!m) return '';
    if (m.erro) return erroHtml(m.erro);
    const k = (r) => m.regras[r].cupons.find((x) => x.canal === 'balcao');
    if (!k('mais_caro') || !k('media')) return '';
    const dif = k('mais_caro').sobra - k('media').sobra;
    const t = tamanhoAtual(e);
    const naRef = !t || t === tamanhoDaReceita(e.dados);
    const plano = e.dados.plano.find((x) => x.meio && x.meio[0] === m.sabores[0] && x.meio[1] === m.sabores[1] && (naRef ? !x.tamanho : x.tamanho === t));
    const n = Number(plano?.quantidade) || 0;
    if (!(dif > 0)) return '<p>Os 2 sabores têm o mesmo preço: as 2 regras dão a mesma conta.</p>';
    return `<p>Cobrando pelo sabor mais caro, sobram <b${rola('dif', dif)}>uns ${R(dif)} a mais</b> em cada pizza${t ? ` ${esc(nomeDoTamanho(e.dados, t).toLowerCase())}` : ''}.${n ? ` Nas ${n} desse meio a meio da semana, <b${rola('semana', dif * n)}>uns ${R(dif * n)}</b>.` : ''}</p>`;
  },
  'meio-ficha': (e) => {
    const m = meioNaTela(e);
    if (!m || m.erro) return m?.erro ? `<div class="erros" role="alert"><b>Falta arrumar:</b><ul>${m.erro.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
    const r = m.regras[e.dados.meio_a_meio.regra || 'mais_caro'];
    const v = { vendeApp: r.entrada.vende_app !== false };
    return `${F.montarTitulo(r.ficha)}${cupomDaLoja(r.ficha, v)}${F.montarAppSugerido(r.ficha, v)}${F.montarNotas(r.ficha, v)}${notaDaLoja(e, r.ficha)}`;
  },
  'meio-arvore': (e) => {
    try {
      return arvoreHtml(e, arvoreDe(e, { meio: e.dados.meio_a_meio.sabores }), 'meio');
    } catch (err) { return erroHtml(err.erros ?? err.message); }
  },

  // 5. a lista de compras
  'compras-total': (e) => {
    const l = e.calc.compras;
    const comprar = l.itens.filter((i) => i.comprar);
    const comprados = [...e.comprados.values()];
    const ja = comprados.reduce((t, c) => t + c.custo_c, 0);
    const tudo = comprados.length > 0 && !comprar.length;
    const total = l.total_c + ja;
    const feito = total > 0 ? ja / total : 0;
    return `<p class="palco-rot"><span>A compra da semana</span>${selo(e.dados)}</p>
      <p class="total-rot">${tudo ? 'Tudo comprado' : comprados.length ? 'Falta comprar' : 'Pra comprar'}</p>
      <p class="numero-grande"${rola('falta', tudo ? ja : l.total_c)}>uns ${R(tudo ? ja : l.total_c)}</p>
      <p class="total-sub">${tudo ? `${comprados.length} ${comprados.length === 1 ? 'item foi' : 'itens foram'} pro estoque` : `<span${rolaN('n', comprar.length)}>${comprar.length}</span> ${comprar.length === 1 ? 'item' : 'itens'} na lista${comprados.length ? ` · já comprou <span${rola('ja', ja)}>uns ${R(ja)}</span>` : ''}`}</p>
      <div class="total-barra" aria-hidden="true"><i data-rola="barra" data-rola-anima="width" style="width:${(feito * 100).toFixed(1)}%"></i></div>
      ${l.limpeza_c > 0 ? `<p class="total-limpeza">Na limpeza vão fora uns <b${rola('limpeza', l.limpeza_c)}>${R(l.limpeza_c)}</b> do que o plano compra: a casca, o talo, o osso. A lista já compra a mais pra isso.</p>` : ''}
      <p class="total-nota">É estimativa: o preço muda a cada compra.</p>`;
  },
  preparo: (e) => {
    const p = e.calc.compras.preparo;
    if (!p.length) return '';
    return `<section class="preparo" aria-labelledby="t-preparo"><h2 class="titulo-secao" id="t-preparo">Antes, na cozinha</h2>
      <p class="ajuda">As receitas da casa que o plano pede, na ordem de fazer (o tempero antes do molho). O que já tem pronto já saiu da conta.</p>
      <ol class="preparo-lista">${p.map((x, i) => `<li class="vidro-leve"><span class="preparo-n">${i + 1}</span><b>${esc(x.nome)}</b><span class="preparo-vezes"${x.vezes > 1e-9 ? rolaN(`v-${x.id}`, Math.round(x.vezes * 100) / 100, 2) : ''}>${x.vezes > 1e-9 ? C.mostrarVezes(x.vezes) : 'o pronto já dá'}</span><small>precisa ${esc(q(x.precisa, x.unidade))}${x.pronto > 0 ? ` · tem ${esc(q(x.pronto, x.unidade))} pronto` : ''}${x.vezes > 1e-9 ? ` · fazer ${esc(q(x.fazer, x.unidade))}` : ''}</small></li>`).join('')}</ol></section>`;
  },
  'compras-erros': (e) => {
    const l = e.calc.compras;
    return l.erros.length ? `<div class="erros" role="alert"><b>Ficou de fora da conta:</b><ul>${l.erros.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : '';
  },
  'ja-tem': (e) => {
    const tem = e.calc.compras.itens.filter((x) => !x.comprar && !e.comprados.has(x.id));
    if (!tem.length) return '';
    return `<details class="ja-tem vidro-leve" data-guarda="jaTemAberto"${e.jaTemAberto ? ' open' : ''}><summary>Já tem o suficiente (${tem.length})</summary><ul>${tem.map((i) => `<li><b>${esc(i.nome)}</b><small>precisa ${esc(q(i.precisa, i.unidade))} · tem ${esc(q(i.tem, i.unidade))}</small></li>`).join('')}</ul></details>`;
  },
  baixo: (e) => {
    const b = e.calc.baixo;
    if (!b.length) return '';
    return `<section class="baixo vidro-leve" aria-labelledby="t-baixo"><h2 class="titulo-secao" id="t-baixo">Abaixo do mínimo agora</h2>
      <p class="ajuda">${e.garantirMinimo ? 'Já entram na lista acima (o "ficar com o mínimo" está ligado).' : 'Sem olhar o plano. Ligue "E ficar com o mínimo" pra eles entrarem na lista.'}</p>
      <ul>${b.map((i) => `<li><b>${esc(i.nome)}</b><span>tem ${esc(q(i.tem, i.unidade))} · mínimo ${esc(q(i.minimo, i.unidade))}</span></li>`).join('')}</ul></section>`;
  },
};

// ---------- as saídas vivas: mudam no lugar ----------

function linhaCompra(e, { ins, i, comprado }) {
  const l = e.calc.compras;
  const falta = i?.comprar ? i : null;
  const feito = Boolean(comprado) && !falta;
  const nome = esc(ins.nome);
  const pac = esc(i?.pacote?.texto ?? ins.pacote);
  // (camadas a fundo) o que precisa é o bruto (com a casca e o osso); entre parênteses, o que vai no prato
  const limpo = i && i.aproveitamento < 1 && i.precisa > 1e-9 ? ` (${esc(q(i.precisa_limpo, i.unidade))} limpo)` : '';
  const txt = feito
    ? `comprou ${pacotesTxt(comprado.pacotes, pac)} · já está no estoque`
    : `precisa ${esc(q(i.precisa, i.unidade))}${limpo} · tem ${esc(q(i.tem, i.unidade))}${l.garantirMinimo && i.minimo ? ` · mínimo ${esc(q(i.minimo, i.unidade))}` : ''}${comprado ? ` · já comprou ${comprado.pacotes}` : ''}`;
  const qtd = feito
    ? `<b>${pacotesTxt(comprado.pacotes, pac)}</b><small${rola('c', comprado.custo_c)}>uns ${R(comprado.custo_c)}</small>`
    : `<b>${comprado ? 'mais ' : ''}${pacotesTxt(i.pacotes, pac)}</b><small${rola('c', i.custo_c)}>uns ${R(i.custo_c)}</small>`;
  return {
    classe: `compra${feito ? ' feito' : ''}`,
    html: `<label class="compra-caixa"><input type="checkbox" data-acao="comprei" data-id="${esc(ins.id)}"${feito ? ' checked' : ''}><span class="so-leitor">${feito ? 'Comprado:' : 'Já comprei'} ${nome}</span></label>
      <span class="compra-txt"><b>${nome}</b><small>${txt}</small></span><span class="compra-qtd">${qtd}</span>`,
  };
}

export const VIVAS = {
  // a pizza por dentro: o anel do custo de 1 produto
  anel: (el, e, ctx) => {
    const id = el.dataset.id;
    let a;
    // (camadas a fundo) a mesma árvore da lista: no tamanho da tela e com os adicionais ligados
    try { a = arvoreDe(e, { produto: id, adicionais: extrasDe(e, id) }); } catch (err) {
      el.innerHTML = erroHtml(err.erros ?? err.message);
      return;
    }
    const p = e.dados.cardapio.find((x) => x.id === id);
    const t = p?.base ? tamanhoAtual(e) : null;
    const comExtra = extrasDe(e, id).length ? ' com o adicional' : '';
    const unidade = a.rende > 1 ? 'o custo de cada unidade' : p?.base ? `o custo de cada pizza${t ? ` ${nomeDoTamanho(e.dados, t).toLowerCase()}` : ''}${comExtra}` : 'o custo de cada um';
    anelVivo(el, { prefixo: `p-${id}`, foco: e.focoAnel.get(id) ?? null, aoFocar: (f) => ctx.guardarFoco(id, f), unidade }).atualizar(a, { unidade });
  },
  // a pizza do meio a meio: as cores, os nomes e o custo de cada metade
  pizza: (el, e, ctx) => {
    const d = e.dados;
    const [a, b] = d.meio_a_meio.sabores;
    let metades = [0, 0];
    let total = 0;
    try {
      const arv = arvoreDe(e, { meio: [a, b] });
      metades = ['a', 'b'].map((g) => arv.filhos.find((x) => x.grupo === g)?.custo_c ?? 0);
      total = arv.custo_c;
    } catch { /* o problema aparece na ficha do meio a meio, logo abaixo */ }
    pizzaViva(el, { giro: e.giroPizza, aoGirar: (g) => { e.giroPizza = g; }, aoTrocar: ctx.trocarMetade }).atualizar({
      lados: [a, b].map((id, i) => ({ cor: corDo(d, id), nome: nomeDe(d, id), custo_c: metades[i] })),
      total_c: total,
    });
  },
  // a lista de compras: o que falta e o que já comprou, por categoria
  'compras-lista': (el, e) => {
    const d = e.dados;
    const l = e.calc.compras;
    const porId = new Map(l.itens.map((i) => [i.id, i]));
    const grupos = new Map();
    for (const ins of d.despensa) {
      const i = porId.get(ins.id);
      const comprado = e.comprados.get(ins.id);
      if (!(i?.comprar || comprado)) continue;
      const cat = ins.categoria || 'Outros';
      if (!grupos.has(cat)) grupos.set(cat, []);
      grupos.get(cat).push({ id: ins.id, ins, i, comprado });
    }
    listaViva(el, [...grupos].map(([cat, itens]) => ({ id: cat, titulo: cat, itens })), {
      linha: (x) => linhaCompra(e, x),
      vazio: l.itens.some((i) => i.precisa > 1e-9) ? 'O estoque já cobre o plano: nada pra comprar.' : 'Ponha o plano da semana aqui em cima e a lista sai sozinha.',
    });
  },
};
