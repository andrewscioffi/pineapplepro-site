// O MOTOR DA COZINHA DO PINE COST PRO (07/11/2026). Módulo puro: roda no navegador (a tela) e no Node (os testes).
// Pedido do Andrews: "antes de criar a ficha técnica tem que ter a lista de produtos... se aquele produto é um subproduto,
// uma pizza que vai um molho de tomate, o molho precisa de uma ficha técnica só pra ele... e a pizza pode ser meio a meio".
//
// As camadas de uma cozinha:
//   1. a DESPENSA      o que se compra: o pacote ("1 kg", "12 un"), o preço do pacote, o estoque de agora e o mínimo
//   2. as RECEITAS DA CASA  o que se faz na cozinha (molho, massa, tempero): usam a despensa ou OUTRAS receitas da casa
//                      (camada dentro de camada) e rendem uma quantidade ("2 kg", "8 un")
//   3. o CARDÁPIO      o que se vende: insumos, receitas da casa e embalagem, com o preço no balcão e no app.
//                      A pizza tem uma BASE (massa, molho, caixa), igual em todos os sabores, e a cobertura do sabor
//   4. o MEIO A MEIO   a base inteira e cada cobertura pela metade; o preço pelo sabor mais caro ou pela média
//   5. a LISTA DE COMPRAS  o plano (quantas de cada) desce pelas camadas, tira o estoque e arredonda para o pacote
//   (v3) E SE O PREÇO MUDAR?  o preço novo de um insumo desce pelas camadas até o cardápio e a semana (efeitoDoPreco);
//                      o "comprei" da lista põe o que comprou no estoque (estoqueDepoisDaCompra)
//   (camadas a fundo, 07/11 à tarde: "a gente tem que ir mais a fundo em algumas camadas")
//     PERDA E RENDIMENTO  o insumo tem o APROVEITAMENTO (o que sobra depois de limpar: a casca, o talo, o osso). Na receita
//                      e na ficha, a quantidade é a limpa (a que vai no prato) e a conta compra o bruto: 100 g de cebola
//                      limpa com 90% = 111 g comprados. A receita da casa mostra o que entra e o que rende (a perda no fogo)
//     TAMANHOS E ADICIONAIS  a pizza em broto, média e grande: a base e a cobertura crescem pela área do disco (o raio ao
//                      quadrado), a borda pelo contorno; cada tamanho com o preço e a ficha dele; a pizza com a borda
//     AS CONTAS DA LOJA  as contas do mês em reais ÷ o que a loja vende = o % de verdade (contasDaLoja); sem o que vende,
//                      fica a média do ramo. A maquininha é a taxa do balcão
//     Sem nada disso (aproveitamento vazio = 100%, sem tamanho, sem contas), a conta é a de antes, igualzinha (um teste confere)
//
// A CONTA É SEMPRE A DA CALCULADORA DE VERDADE (../calculadora/contas.mjs, cópia exata da ferramenta do robô):
//   a receita da casa entra na ficha do produto como uma linha normal da calculadora:
//   { nome, vai: '150 g', pacote: <o que a receita rende>, preco_pacote: <o custo da receita inteira, em reais> }
// Nada aqui grava, manda ou busca coisa alguma: só faz conta com o que recebe.
import { custoDaLinha, lerMedida, calcularFicha, numero, centavos, reais, impostoEstimado } from '../calculadora/contas.mjs';
import { cupom, sinal, canaisDoCupom } from './ficha.js';

/** O erro da cozinha: uma ou mais frases em português, prontas para a tela. */
export class ErroDaCozinha extends Error {
  constructor(erros) {
    const lista = [].concat(erros);
    super(lista.join('\n'));
    this.name = 'ErroDaCozinha';
    this.erros = lista;
  }
}
const falha = (texto) => { throw new ErroDaCozinha([texto]); };
const mensagens = (e) => e?.erros ?? [e?.message ?? String(e)];
const existe = (v) => v !== undefined && v !== null && String(v).trim() !== '';
const limpo = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** As 2 regras de preço do meio a meio. */
export const REGRAS = { mais_caro: 'O sabor mais caro', media: 'A média dos 2 sabores' };
const TIPO = { g: 'peso', ml: 'volume', un: 'unidade' };
const GRANDE = { g: 'kg', ml: 'l', un: 'un' };

// ---------- os números da cozinha ----------

// 0.5 → "0,5" · 1500 → "1500" (sem ponto de milhar: "1.500" a calculadora leria como mil e quinhentos, e "1.125" também)
const num = (n) => String(Math.round(n * 1e6) / 1e6).replace('.', ',');
const br = (n, casas) => (Math.round(n * 10 ** casas) / 10 ** casas).toLocaleString('pt-BR', { maximumFractionDigits: casas });

/** A quantidade como se fala na cozinha: 1500 g → "1,5 kg", 187,5 g → "188 g", 0,5 un → "0,5 un". */
export function mostrarQuantidade(valor, unidade) {
  const v = Number(valor) || 0;
  if (unidade === 'g' || unidade === 'ml') {
    if (Math.abs(v) >= 1000) return `${br(v / 1000, 2)} ${GRANDE[unidade]}`;
    return `${br(v, Math.abs(v) < 10 ? 1 : 0)} ${unidade}`;
  }
  return `${br(v, Math.abs(v) < 10 ? 2 : 1)} un`;
}

/** Quantas vezes a receita: 1 → "1 receita", 2,5 → "2,5 receitas". */
export const mostrarVezes = (v) => `${br(v, 2)} ${Math.abs(v - 1) < 1e-9 ? 'receita' : 'receitas'}`;

/** O preço do kg, do litro ou da unidade (para o insumo e para a receita da casa). */
export function precoPor(custo_c, m) {
  if (!(m?.valor > 0)) return { c: 0, por: GRANDE[m?.unidade] ?? 'un' };
  if (m.unidade === 'g' || m.unidade === 'ml') return { c: Math.round((custo_c * 1000) / m.valor), por: GRANDE[m.unidade] };
  return { c: Math.round(custo_c / m.valor), por: 'un' };
}
/** "R$ 11,25 o kg" · "R$ 1,51 cada" · "R$ 8,50 o litro". */
export const mostrarPrecoPor = (p) => `${reais(p.c)} ${p.por === 'kg' ? 'o kg' : p.por === 'l' ? 'o litro' : 'cada'}`;

/** Reparte um total (centavos) entre partes, na proporção dos pesos, e a soma fecha no centavo (o resto vai para os maiores). */
export function repartir(total, pesos) {
  const soma = pesos.reduce((t, p) => t + p, 0);
  if (!pesos.length) return [];
  if (!(soma > 0)) return pesos.map((_, i) => (i === 0 ? total : 0));
  const brutos = pesos.map((p) => (total * p) / soma);
  const partes = brutos.map(Math.floor);
  let resto = total - partes.reduce((t, p) => t + p, 0);
  const ordem = brutos.map((b, i) => [b - partes[i], i]).sort((x, y) => y[0] - x[0]);
  for (let k = 0; resto > 0; k++, resto--) partes[ordem[k % ordem.length][1]] += 1;
  return partes;
}

// ---------- as medidas, com o erro em português ----------

const NUMERO = /^(\d+(?:[.,]\d+)*(?:\s*\/\s*\d+)?)\s*(.*)$/;
const amigavel = (m) => String(m).replace(/\. Use g, kg, ml, l, un ou uma porção de porcoes-padrao\.json$/, ' (use g, kg, ml, l, un ou uma medida de cozinha, como "2 fatias de queijo")');

/** Lê uma medida ("150 g", "1,5 kg", "2 fatias de queijo") pela calculadora; o erro diz onde está. */
export function medida(texto, tab, onde) {
  if (!existe(texto)) falha(`${onde}: falta a medida (ex.: 150 g, 1 kg ou 2 un)`);
  try {
    return lerMedida(String(texto), tab?.porcoes ?? {});
  } catch (e) {
    return falha(`${onde}: ${amigavel(e.message)}`);
  }
}

// como a calculadora: peso com volume vale (1 ml = 1 g); unidade com peso, não
const naoBate = (a, b) => a.unidade !== b.unidade && !(new Set([a.unidade, b.unidade]).has('g') && new Set([a.unidade, b.unidade]).has('ml'));

const PACOTES = /^(pacotes?|pcts?\.?|receitas?)$/i;

/**
 * O estoque, o mínimo ou o que já tem pronto, na medida da referência (o pacote do insumo ou o que a receita rende).
 * Vazio ou zero = 0. Vale "3 kg", "12 un", "2 pacotes" (2 × o pacote). Sem unidade, ou com a unidade errada, dá erro.
 */
export function quantidadeGuardada(texto, ref, tab, { nome, campo = 'o estoque', refTexto = '', refRotulo = 'o pacote' } = {}) {
  const t = String(texto ?? '').trim();
  if (!t) return 0;
  const m = t.match(NUMERO);
  if (!m) falha(`${nome}: ${campo} "${t}" não é uma quantidade (ex.: 3 kg, 12 un ou 2 pacotes)`);
  let n;
  try { n = numero(m[1]); } catch { falha(`${nome}: ${campo} "${t}" não é uma quantidade (ex.: 3 kg, 12 un ou 2 pacotes)`); }
  if (!(n > 0)) return 0;
  const resto = m[2].trim();
  if (PACOTES.test(resto)) return n * ref.valor;
  if (!resto) falha(`${nome}: ${campo} "${t}" está sem unidade (escreva ${t} ${GRANDE[ref.unidade]} ou ${t} pacotes)`);
  const q = medida(t, tab, `${nome}: ${campo}`);
  if (naoBate(q, ref)) falha(`${nome}: ${campo} "${t}" é ${TIPO[q.unidade]} e ${refRotulo} "${refTexto}" é ${TIPO[ref.unidade]}. Use a mesma medida`);
  return q.valor;
}

function precoEmCentavos(v, onde) {
  if (!existe(v)) falha(`${onde}: falta o preço`);
  let c;
  try { c = centavos(v); } catch { falha(`${onde}: "${v}" não é um número`); }
  if (!(c >= 0)) falha(`${onde}: o preço não pode ser negativo`);
  return c;
}

// ---------- (camadas a fundo) o aproveitamento: o que sobra do insumo depois de limpar ----------

// "90", "90%", 90, "90,5" → 90,5 (ou NaN)
const porcentoDoTexto = (v) => { try { return numero(String(v).replace('%', '').trim()); } catch { return NaN; } };

/**
 * O aproveitamento do insumo, em fração: o que sobra depois de limpar (a casca da cebola, o talo, o osso e a pele do frango).
 * 90, "90" ou "90%" → 0,9. Vazio = 1 (100%: não perde nada, e a conta é a de antes).
 */
export function aproveitamentoDe(ins) {
  const v = ins?.aproveitamento;
  if (!existe(v)) return 1;
  const n = porcentoDoTexto(v);
  const nome = ins?.nome || 'O insumo';
  if (!Number.isFinite(n)) falha(`${nome}: o aproveitamento "${v}" não é um número (ex.: 90%)`);
  if (!(n >= 1) || n > 100) falha(`${nome}: o aproveitamento "${v}" precisa ser de 1% a 100% (100% = não perde nada na limpeza)`);
  return n / 100;
}

/** O que se compra pra ter a quantidade limpa: 100 g de cebola limpa com 90% de aproveitamento → 111,1 g comprados. */
export const brutoDoLimpo = (limpo, aproveitamento) => limpo / aproveitamento;

// ---------- quem é quem ----------

/** Os itens da cozinha por id: os insumos da despensa, as receitas da casa, as bases, os produtos e os adicionais. */
export function indice(dados = {}) {
  const ind = { insumos: new Map(), receitas: new Map(), bases: new Map(), produtos: new Map(), adicionais: new Map() };
  for (const i of dados.despensa ?? []) if (i?.id) ind.insumos.set(i.id, i);
  for (const r of dados.receitas ?? []) if (r?.id && !ind.insumos.has(r.id)) ind.receitas.set(r.id, r);
  for (const b of dados.bases ?? []) if (b?.id) ind.bases.set(b.id, b);
  for (const p of dados.cardapio ?? []) if (p?.id) ind.produtos.set(p.id, p);
  for (const p of dados.adicionais ?? []) if (p?.id) ind.adicionais.set(p.id, p);
  return ind;
}

function resolver(ind, l, onde) {
  const id = l?.usa;
  if (ind.insumos.has(id)) return { tipo: 'insumo', item: ind.insumos.get(id) };
  if (ind.receitas.has(id)) return { tipo: 'receita', item: ind.receitas.get(id) };
  if (!existe(id)) falha(`${onde}: tem uma linha sem o ingrediente (escolha um da despensa ou das receitas da casa)`);
  return falha(`${onde}: usa "${l.nome ?? id}", que não está na despensa nem nas receitas da casa`);
}

function acharProduto(ind, id) {
  const p = ind.produtos.get(id) ?? ind.adicionais.get(id);
  if (!p) falha(`Não achei "${id}" no cardápio`);
  return p;
}

function baseDo(ind, p) {
  if (!existe(p.base)) return null;
  const b = ind.bases.get(p.base);
  if (!b) falha(`${p.nome}: a base "${p.base}" não existe`);
  return b;
}

// ---------- (camadas a fundo) os tamanhos: broto, média e grande ----------
//   dados.tamanhos = [{ id: 'broto', nome: 'Broto', diametro: 25, embalagem? }, ...]  os tamanhos que a pizzaria vende
//   base.tamanho = 'grande'   o tamanho em que a receita da base (e a cobertura dos sabores dela) foi escrita
//   adicional.cresce = 'area' (vai por cima, como o bacon) · 'borda' (o contorno, como a borda recheada) · 'fixo'
//   adicional.tamanho         o tamanho em que a quantidade do adicional foi escrita (sem ele, o da 1ª base)
//   produto.precos            o preço no tamanho da receita · produto.precos_tamanho = { broto: { balcao, app }, ... } os outros
//   tamanho.embalagem         a embalagem daquele tamanho (a caixa da broto); sem ela, a da base

/** O diâmetro do tamanho em cm: 35, "35" ou "35 cm" → 35. */
export function diametroDe(t) {
  let n = NaN;
  try { n = numero(String(t?.diametro ?? '').replace(/cm/i, '').trim()); } catch { /* fica NaN */ }
  if (!(n > 0)) falha(`${t?.nome || 'O tamanho'}: falta o diâmetro, em cm (ex.: 35)`);
  return n;
}

function acharTamanho(dados, id) {
  const t = (dados.tamanhos ?? []).find((x) => x?.id === id);
  if (!t) falha(`O tamanho "${id}" não existe (veja os tamanhos no cardápio)`);
  return t;
}

/** O tamanho em que a receita foi escrita: o da base (a pizza) ou o do adicional (sem ele, o da 1ª base que tem). */
function tamanhoDaReceita(dados, ind, p, base) {
  const id = base ? base.tamanho : (existe(p.tamanho) ? p.tamanho : [...ind.bases.values()].find((b) => existe(b.tamanho))?.tamanho);
  if (!existe(id)) falha(`${(base ?? p).nome}: diga em que tamanho a receita foi escrita (ex.: a grande)`);
  return acharTamanho(dados, id);
}

/**
 * Quanto um tamanho leva da receita escrita em outro: pela área do disco (a cobertura, a massa, o molho: o raio ao
 * quadrado), pelo contorno (a borda recheada: o diâmetro) ou igual ('fixo'). Ex.: a broto de 25 cm da receita da grande
 * de 35 cm leva (25 ÷ 35)² = 51% da cobertura e 25 ÷ 35 = 71% da borda.
 */
export function fatorDoTamanho(dados, tamanho, daReceita, cresce = 'area') {
  const k = diametroDe(acharTamanho(dados, tamanho)) / diametroDe(acharTamanho(dados, daReceita));
  return cresce === 'borda' ? k : cresce === 'fixo' ? 1 : k * k;
}

/** Os tamanhos da cozinha, com o quanto cada um leva da receita da base: [{ id, nome, diametro, area, contorno, daReceita }]. */
export function tamanhosDaBase(dados, baseId) {
  const ind = indice(dados);
  const base = ind.bases.get(baseId);
  if (!base) falha(`A base "${baseId}" não existe`);
  const ref = tamanhoDaReceita(dados, ind, null, base);
  return (dados.tamanhos ?? []).map((t) => ({
    id: t.id, nome: t.nome, diametro: diametroDe(t), daReceita: t.id === ref.id,
    area: fatorDoTamanho(dados, t.id, ref.id, 'area'), contorno: fatorDoTamanho(dados, t.id, ref.id, 'borda'),
  }));
}

/** Os preços do produto (ou do adicional) num tamanho: no tamanho da receita, os de sempre; nos outros, os de precos_tamanho. */
function precosNoTamanho(p, tamanhoId, refId) {
  if (!tamanhoId || tamanhoId === refId) return p.precos ?? {};
  return p.precos_tamanho?.[tamanhoId] ?? {};
}

/** O produto num tamanho: o fator da receita dele (a pizza pela área; o adicional pelo jeito que ele cresce), a embalagem e os preços. */
function noTamanho(dados, ind, p, base, tamanhoId) {
  if (!tamanhoId) return null;
  const t = acharTamanho(dados, tamanhoId);
  const ehAdicional = ind.adicionais.has(p.id);
  if (!base && !ehAdicional) falha(`${p.nome}: só a pizza (com base) e os adicionais dela têm tamanho`);
  const ref = tamanhoDaReceita(dados, ind, p, base);
  const cresce = base ? 'area' : (p.cresce || 'area');
  const embT = Array.isArray(t.embalagem) && t.embalagem.length ? t.embalagem : null;
  return { t, ref, fator: fatorDoTamanho(dados, t.id, ref.id, cresce), area: fatorDoTamanho(dados, t.id, ref.id, 'area'), embalagem: embT, precos: precosNoTamanho(p, t.id, ref.id) };
}

/** O quanto o adicional leva no tamanho (a borda pelo contorno, o bacon por cima pela área). Sem tamanho: 1. */
function fatorDoAdicional(dados, ind, a, tamanhoId) {
  if (!tamanhoId) return 1;
  const ref = tamanhoDaReceita(dados, ind, a, null);
  return fatorDoTamanho(dados, tamanhoId, ref.id, a.cresce || 'area');
}

/**
 * A ordem das receitas da casa: a que é usada vem antes da que usa (o tempero antes do molho).
 * A receita que usa ela mesma, direto ou por outra, dá erro com o caminho ("Massa → Recheio → Massa").
 */
export function ordemDasReceitas(dados, ind = indice(dados)) {
  const ordem = [];
  const marca = new Map(); // 1 = abrindo, 2 = pronta
  const nomeDe = (id) => ind.receitas.get(id)?.nome || id;
  const visitar = (id, caminho) => {
    if (marca.get(id) === 2) return;
    if (marca.get(id) === 1) {
      const ciclo = [...caminho.slice(caminho.indexOf(id)), id].map(nomeDe);
      falha(`A receita "${nomeDe(id)}" usa ela mesma: ${ciclo.join(' → ')}. Tire uma de dentro da outra`);
    }
    marca.set(id, 1);
    for (const l of ind.receitas.get(id).itens ?? []) if (ind.receitas.has(l?.usa)) visitar(l.usa, [...caminho, id]);
    marca.set(id, 2);
    ordem.push(id);
  };
  for (const id of ind.receitas.keys()) visitar(id, []);
  return ordem;
}

// ---------- a linha da calculadora ----------

// A linha da cozinha ({ usa, vai }) vira a linha da calculadora ({ nome, vai, pacote, preco_pacote }).
// fator 0,5 = a metade (o meio a meio). O vai já sai na medida certa ("300 g" → "150 g").
function paraCalculadora(ind, l, feitas, tab, onde, { fator = 1, sufixo = '' } = {}) {
  const alvo = resolver(ind, l, onde);
  const lugar = `${onde} → ${alvo.item.nome}`;
  const q = medida(l.vai, tab, lugar);
  const vai = fator === 1 ? String(l.vai) : `${num(q.valor * fator)} ${q.unidade}`;
  if (alvo.tipo === 'insumo') {
    const ins = alvo.item;
    if (!existe(ins.pacote)) falha(`${ins.nome}: falta o pacote que você compra (ex.: 1 kg ou 12 un)`);
    const pac = medida(ins.pacote, tab, `${ins.nome}: o pacote`);
    if (naoBate(q, pac)) falha(`${lugar}: a medida não bate: "${l.vai}" é ${TIPO[q.unidade]} e o pacote "${ins.pacote}" é ${TIPO[pac.unidade]}. Use a mesma medida nos dois (ex.: o peso de 1 unidade)`);
    precoEmCentavos(ins.preco_pacote, `${ins.nome}: o preço do pacote`);
    // (camadas a fundo) o vai é a quantidade limpa; o pacote que entra na conta é o que ele rende limpo (1 kg de cebola com
    // 90% = 900 g limpos, pelo mesmo preço). Com 100%, a linha é a de sempre, igualzinha
    const aproveitamento = aproveitamentoDe(ins);
    const pacote = aproveitamento < 1 ? `${num(pac.valor * aproveitamento)} ${pac.unidade}` : String(ins.pacote);
    return { alvo, q, fator, aproveitamento, linha: { nome: ins.nome + sufixo, vai, pacote, preco_pacote: ins.preco_pacote } };
  }
  const r = alvo.item;
  const feita = feitas.get(r.id);
  if (!feita || feita.erro) falha(`${lugar}: a receita da casa "${r.nome}" tem um problema (veja em Receitas da casa)`);
  if (naoBate(q, feita.rende)) falha(`${lugar}: a medida não bate: "${l.vai}" é ${TIPO[q.unidade]} e a receita rende "${r.rende}" (${TIPO[feita.rende.unidade]})`);
  return { alvo, q, fator, linha: { nome: r.nome + sufixo, vai, pacote: String(r.rende), preco_pacote: feita.custo_c / 100 } };
}

function custoDe(linha, tab, lugar) {
  try { return custoDaLinha(linha, tab.porcoes); } catch (e) { return falha(`${lugar}: ${amigavel(e.message)}`); }
}

// ---------- as receitas da casa ----------

function custoDaReceita(r, ind, feitas, tab) {
  if (!existe(r.nome)) falha('Tem uma receita da casa sem nome');
  const rende = medida(r.rende, tab, `${r.nome}: quanto rende`);
  const itens = r.itens ?? [];
  if (!itens.length) falha(`${r.nome}: falta pelo menos 1 ingrediente`);
  let camada = 1;
  const linhas = itens.map((l) => {
    const { alvo, q, linha, aproveitamento } = paraCalculadora(ind, l, feitas, tab, r.nome);
    const c = custoDe(linha, tab, `${r.nome} → ${alvo.item.nome}`);
    if (alvo.tipo === 'receita') camada = Math.max(camada, feitas.get(alvo.item.id).camada + 1);
    const limpa = alvo.tipo === 'insumo' ? { aproveitamento, bruto: { valor: brutoDoLimpo(q.valor, aproveitamento), unidade: q.unidade } } : {};
    return { usa: l.usa, tipo: alvo.tipo, nome: alvo.item.nome, vai: String(l.vai), qtd: { valor: q.valor, unidade: q.unidade }, custo_c: c.custo_c, linha, ...limpa };
  });
  const custo_c = linhas.reduce((t, l) => t + l.custo_c, 0);
  return {
    id: r.id, nome: r.nome, rende: { texto: String(r.rende), valor: rende.valor, unidade: rende.unidade }, custo_c, por: precoPor(custo_c, rende), camada, linhas,
    ...perdaNoPreparo(linhas, rende), limpeza_c: limpezaDasLinhas(linhas, feitas),
  };
}

/**
 * (camadas a fundo) A PERDA NO PREPARO da receita da casa: o que entra (as quantidades limpas, peso com volume vale
 * 1 ml = 1 g) e o que ela rende. O molho que reduz no fogo: entra 2,68 kg, rende 2 kg, perde 25%. Negativa = rendeu mais
 * do que entrou (a água do preparo). A receita que rende em unidade (8 discos), ou que leva ingrediente em unidade, não tem
 * perda em %: { entra: null, perda: null }.
 */
function perdaNoPreparo(linhas, rende) {
  const peso = (u) => u === 'g' || u === 'ml';
  if (!peso(rende.unidade) || !linhas.length || !linhas.every((l) => peso(l.qtd.unidade))) return { entra: null, perda: null };
  const valor = linhas.reduce((t, l) => t + l.qtd.valor, 0);
  return { entra: { valor, unidade: rende.unidade }, perda: valor > 0 ? 1 - rende.valor / valor : null };
}

// o que vai fora na limpeza (em centavos): a parte da casca e do osso que se paga e se joga fora, com a das receitas de dentro
function limpezaDasLinhas(linhas, feitas) {
  const fora = linhas.reduce((t, l) => {
    if (l.tipo === 'insumo') return t + l.custo_c * (1 - (l.aproveitamento ?? 1));
    const r = feitas.get(l.usa);
    return t + (r?.custo_c > 0 ? (l.custo_c * (r.limpeza_c ?? 0)) / r.custo_c : 0);
  }, 0);
  return Math.round(fora);
}

/**
 * O custo de cada receita da casa (Map id → { custo_c, rende, por, camada, linhas }), da de baixo para a de cima.
 * `parar: false` não para no primeiro problema: a receita com problema fica com { erro } e as outras seguem.
 * A receita que usa ela mesma sempre para (sem ordem, nenhuma fecha).
 */
export function custoDasReceitas(dados, tab, { parar = true } = {}) {
  const ind = indice(dados);
  const ordem = ordemDasReceitas(dados, ind);
  const feitas = new Map();
  for (const id of ordem) {
    try {
      feitas.set(id, custoDaReceita(ind.receitas.get(id), ind, feitas, tab));
    } catch (e) {
      if (parar) throw e;
      feitas.set(id, { id, nome: ind.receitas.get(id).nome, erro: mensagens(e) });
    }
  }
  return feitas;
}

// ---------- a ficha do produto (pela calculadora) ----------

// ---------- (camadas a fundo) as contas da loja em reais ----------
//   loja.custos_fixos = [{ nome: 'Aluguel', por_mes: 1900 }, ...]   as contas do mês, em reais
//   loja.faturamento_mes                                            quanto a loja vende no mês
//   loja.maquininha_taxa (%) e loja.maquininha_parte (% das vendas do balcão que passam nela; vazio = todas)
// A calculadora faz a conta: as contas ÷ o que vende = o % de cada venda (no lugar da média do ramo, de 15% a 25%); a
// maquininha é a taxa do balcão; no MEI, o DAS ÷ o que vende. Sem o que vende, a ficha fica com a média do ramo (e a tela
// avisa). Uma conta escrita errado ("mil") não derruba as fichas: fica de fora, e a tela das contas mostra onde está.

const dinheiroDoTexto = (v) => { try { return centavos(v); } catch { return NaN; } };

function lerLoja(dados) {
  const l = dados.loja ?? {};
  const erros = [];
  const linhas = (Array.isArray(l.custos_fixos) ? l.custos_fixos : []).map((c, i) => {
    const nome = String(c?.nome ?? '').trim();
    const x = { i, nome, por_mes_c: 0, vazia: !existe(c?.por_mes), exemplo: Boolean(c?.exemplo) };
    if (x.vazia) return x;
    const v = dinheiroDoTexto(c.por_mes);
    if (!(v >= 0)) {
      x.erro = `${nome || `A conta ${i + 1}`}: "${c.por_mes}" não é um valor em reais (ex.: 1.500,00)`;
      erros.push(x.erro);
      return x;
    }
    x.por_mes_c = v;
    return x;
  });
  let faturamento_c = null;
  if (existe(l.faturamento_mes)) {
    const v = dinheiroDoTexto(l.faturamento_mes);
    if (v > 0) faturamento_c = v;
    else erros.push(`Quanto a loja vende no mês: "${l.faturamento_mes}" precisa ser um valor maior que zero (ex.: 30.000)`);
  }
  const taxaTxt = l.maquininha_taxa;
  const parteTxt = l.maquininha_parte;
  let taxa = 0;
  let parte = 1;
  if (existe(taxaTxt)) {
    const n = porcentoDoTexto(taxaTxt);
    if (n >= 0 && n < 100) taxa = n / 100; else erros.push(`A maquininha: "${taxaTxt}" precisa ser um % de 0 a 99 (ex.: 2,9%)`);
  }
  if (existe(parteTxt)) {
    const n = porcentoDoTexto(parteTxt);
    if (n >= 0 && n <= 100) parte = n / 100; else erros.push(`O que passa na maquininha: "${parteTxt}" precisa ser um % de 0 a 100 (ex.: 55%)`);
  }
  const boas = linhas.filter((x) => !x.vazia && !x.erro);
  const total_c = boas.reduce((t, x) => t + x.por_mes_c, 0);
  return { l, linhas, boas, total_c, faturamento_c, maquininha: { taxa, parte, efetiva: taxa * parte }, erros };
}

function daLoja(dados) {
  const x = lerLoja(dados);
  const l = x.l;
  // as contas viram % só com o que a loja vende (sem ele, a média do ramo); a conta vazia ou escrita errado fica de fora
  const doMes = x.total_c > 0 && x.faturamento_c > 0;
  return limpo({
    regime: l.regime,
    faturamento_mes: x.faturamento_c ? x.faturamento_c / 100 : undefined,
    custos_fixos: doMes ? x.boas.filter((c) => c.por_mes_c > 0).map((c) => ({ nome: c.nome || `Conta ${c.i + 1}`, por_mes: c.por_mes_c / 100 })) : undefined,
    custos_fixos_pct: l.custos_fixos_pct,
    imposto_pct: l.imposto_pct,
    // em % e com vírgula: "1,595" (a calculadora lê "1.595" como mil quinhentos e noventa e cinco)
    taxa_balcao: x.maquininha.efetiva > 0 ? num(Math.round(x.maquininha.efetiva * 1e6) / 1e4) : undefined,
  });
}

/**
 * AS CONTAS DA LOJA, como a calculadora usa: cada conta do mês (e o quanto ela pesa em cada venda), o total, o que a loja
 * vende, o % de verdade (o total ÷ o que vende, igual à calculadora) ou a média do ramo, a maquininha (a taxa × o que passa
 * nela) e o imposto do regime. `usa`: 'mes' (as contas da loja), 'informado' (o % digitado) ou 'padrao' (a média do ramo).
 * `aviso`: 'falta-faturamento' quando tem conta mas falta quanto a loja vende.
 */
export function contasDaLoja(dados, tab) {
  const x = lerLoja(dados);
  const ent = daLoja(dados);
  const media = [0.15, 0.25];
  try { media.splice(0, 2, ...[].concat(tab?.padroes?.custos_fixos_faixa ?? [15, 25]).map((v) => Number(v) / 100).sort((a, b) => a - b)); } catch { /* fica 15% a 25% */ }
  const usa = ent.custos_fixos ? 'mes' : existe(ent.custos_fixos_pct) ? 'informado' : 'padrao';
  const pct = usa === 'mes' ? x.total_c / x.faturamento_c : null;
  let imposto = null;
  try {
    const informado = [].concat(ent.imposto_pct ?? []).map((v) => porcentoDoTexto(v) / 100);
    imposto = existe(ent.imposto_pct)
      ? { origem: 'informado', regime: 'informado pelo dono', faixa: informado.length === 2 ? informado.sort((a, b) => a - b) : [informado[0], informado[0]] }
      : impostoEstimado(ent.regime, x.faturamento_c ?? 0, tab?.impostos ?? {});
  } catch (e) { x.erros.push(e.message); }
  return {
    linhas: x.linhas.map((c) => ({ ...c, pct: x.faturamento_c > 0 && !c.erro ? c.por_mes_c / x.faturamento_c : null })),
    total_c: x.total_c, faturamento_c: x.faturamento_c, usa, pct, media,
    maquininha: x.maquininha, imposto,
    aviso: x.total_c > 0 && !(x.faturamento_c > 0) ? 'falta-faturamento' : null,
    entrada: ent, erros: x.erros,
  };
}

// as mensagens da calculadora, em palavras da tela
const TRADUZ = [
  [/^precos\.balcao: /, 'o preço do balcão: '],
  [/^precos\.app: /, 'o preço no app: '],
  [/^falta "precos" \(pelo menos o preço do balcão\)$/, 'falta o preço do balcão'],
  [/^falta "ingredientes" \([^)]*\)$/, 'falta pelo menos 1 ingrediente'],
  [/^falta "negocio" \(o nome do negócio\)$/, 'falta o nome do negócio'],
  [/^falta "item" \([^)]*\)$/, 'falta o nome do produto'],
  [/^rende: /, 'quanto rende: '],
  [/^faturamento_mes: /, 'quanto a loja vende no mês: '],
  [/^custos_fixos: para virar %[\s\S]*$/, 'as contas da loja precisam de quanto a loja vende no mês (ou tire as contas)'],
  [/^custos_fixos\[(\d+)\](?: \(([^)]*)\))?: /, 'a conta da loja $1: '],
  [/falta "por_mes" \(quanto custa no mês\)/, 'falta o valor do mês'],
  [/^(?:ingredientes|embalagem)\[\d+\] \(([^)]*)\): /, '$1: '],
];
const traduzir = (m) => TRADUZ.reduce((t, [rx, troca]) => t.replace(rx, troca), String(m));

function calcular(entrada, tab) {
  try {
    return calcularFicha(entrada, tab.porcoes, tab.padroes, tab.impostos);
  } catch (e) {
    throw new ErroDaCozinha(mensagens(e).map((m) => `${entrada.item || 'O produto'}: ${traduzir(m)}`));
  }
}

const cuponsDe = (f, vendeApp = true) => canaisDoCupom(f, vendeApp).map((c) => ({ canal: c.id, sinal: sinal(c), ...cupom(c) }));

// (camadas a fundo) a soma dos preços em reais, no centavo ("42" + "10" = 52); sem um deles, undefined
function somaDosPrecos(valores, onde) {
  if (!valores.length || valores.some((v) => !existe(v))) return undefined;
  return valores.reduce((t, v) => t + precoEmCentavos(v, onde), 0) / 100;
}

// A entrada da calculadora de um produto, e de onde veio cada linha (para a árvore).
// (camadas a fundo) `tamanho`: a pizza na broto ou na média (a base e a cobertura pela área do disco, a embalagem e o preço
// do tamanho); `adicionais`: a pizza com a borda e os extras (cada um com a quantidade do tamanho e o preço dele, somados).
function montarProduto(dados, id, tab, { completa = false, receitas, tamanho = null, adicionais = [] } = {}) {
  const ind = indice(dados);
  const p = acharProduto(ind, id);
  if (!existe(p.nome)) falha('Tem um produto sem nome no cardápio');
  const feitas = receitas ?? custoDasReceitas(dados, tab);
  const base = baseDo(ind, p);
  const nt = noTamanho(dados, ind, p, base, tamanho);
  const fb = nt?.area ?? 1; // a base: pela área do disco
  const fp = nt?.fator ?? 1; // o produto: a cobertura pela área; o adicional pelo jeito dele
  const ing = [];
  const emb = [];
  for (const l of base?.itens ?? []) ing.push({ grupo: 'base', ...paraCalculadora(ind, l, feitas, tab, base.nome, { fator: fb }) });
  for (const l of p.itens ?? []) ing.push({ grupo: 'sabor', ...paraCalculadora(ind, l, feitas, tab, p.nome, { fator: fp }) });
  // a embalagem da base (a caixa): a do tamanho, se ele tiver a dele (a caixa da broto); o adicional sozinho não leva caixa
  const caixaDoTamanho = Boolean(base && nt?.embalagem);
  for (const l of (caixaDoTamanho ? nt.embalagem : base?.embalagem) ?? []) emb.push({ grupo: 'embalagem', ...paraCalculadora(ind, l, feitas, tab, caixaDoTamanho ? `${base.nome} (${nt.t.nome})` : base.nome) });
  for (const l of p.embalagem ?? []) emb.push({ grupo: 'embalagem', ...paraCalculadora(ind, l, feitas, tab, p.nome) });
  const precos = nt ? nt.precos : p.precos;
  const extras = [];
  for (const aid of adicionais ?? []) {
    const a = ind.adicionais.get(aid);
    if (!a) falha(`O adicional "${aid}" não existe`);
    if (a.id === p.id) continue;
    const fa = fatorDoAdicional(dados, ind, a, nt?.t.id);
    const grupo = `ad:${a.id}`;
    for (const l of a.itens ?? []) ing.push({ grupo, ...paraCalculadora(ind, l, feitas, tab, a.nome, { fator: fa, sufixo: ` (${a.nome})` }) });
    for (const l of a.embalagem ?? []) emb.push({ grupo: 'embalagem', ...paraCalculadora(ind, l, feitas, tab, a.nome, { sufixo: ` (${a.nome})` }) });
    const ref = nt ? tamanhoDaReceita(dados, ind, a, null).id : null;
    extras.push({ a, precos: nt ? precosNoTamanho(a, nt.t.id, ref) : (a.precos ?? {}) });
  }
  const nomeT = nt ? ` (${nt.t.nome})` : base ? ` (${base.nome})` : '';
  const comExtras = extras.length ? ` com ${extras.map((x) => x.a.nome.charAt(0).toLowerCase() + x.a.nome.slice(1)).join(' e ')}` : '';
  const somar = (canal) => (extras.length
    ? somaDosPrecos([precos?.[canal], ...extras.map((x) => x.precos?.[canal])], `${p.nome}${comExtras}: o preço ${canal === 'app' ? 'no app' : 'do balcão'}`)
    : precos?.[canal]);
  const entrada = limpo({
    exemplo: Boolean(dados.exemplo),
    negocio: dados.negocio,
    item: `${p.nome}${nomeT}${comExtras}`,
    data: p.data,
    precos: limpo({ balcao: somar('balcao'), app: somar('app') }),
    rende: p.rende,
    vende_app: p.vende_app === false ? false : undefined,
    ...daLoja(dados),
    ingredientes: ing.map((x) => x.linha),
    embalagem: emb.length ? emb.map((x) => x.linha) : undefined,
    completa,
  });
  return { produto: p, base, entrada, ing, emb, tamanho: nt?.t ?? null, adicionais: extras.map((x) => x.a) };
}

/** A entrada da calculadora de um produto do cardápio (ou de um adicional): a base, a cobertura e a embalagem. */
export const entradaDoProduto = (dados, id, tab, opcoes) => montarProduto(dados, id, tab, opcoes).entrada;

/**
 * O custo da base (a massa, o molho, a caixa), linha por linha, pela calculadora: { itens: [c], embalagem: [c], total_c }.
 * (camadas a fundo) `tamanho`: a base na broto ou na média (a massa e o molho pela área do disco, a caixa do tamanho).
 */
export function custoDaBase(dados, id, tab, { receitas, tamanho = null } = {}) {
  const ind = indice(dados);
  const b = ind.bases.get(id);
  if (!b) falha(`A base "${id}" não existe`);
  const feitas = receitas ?? custoDasReceitas(dados, tab);
  let fator = 1;
  let caixa = null;
  if (tamanho) {
    const t = acharTamanho(dados, tamanho);
    fator = fatorDoTamanho(dados, t.id, tamanhoDaReceita(dados, ind, null, b).id, 'area');
    if (Array.isArray(t.embalagem) && t.embalagem.length) caixa = t.embalagem;
  }
  const custo = (opcoes) => (l) => {
    const { alvo, linha } = paraCalculadora(ind, l, feitas, tab, b.nome, opcoes);
    return custoDe(linha, tab, `${b.nome} → ${alvo.item.nome}`).custo_c;
  };
  const itens = (b.itens ?? []).map(custo({ fator }));
  const embalagem = (caixa ?? b.embalagem ?? []).map(custo({}));
  const soma = (xs) => xs.reduce((t, c) => t + c, 0);
  return { id, nome: b.nome, itens, embalagem, ingredientes_c: soma(itens), embalagem_c: soma(embalagem), total_c: soma(itens) + soma(embalagem), ...(tamanho ? { tamanho, fator } : {}) };
}

/**
 * A ficha de um produto pela calculadora: { entrada, ficha, cupons }. `cupons` = o cupom de cada canal
 * (o balcão e o app), igual ao de comum/ficha.js, com o sinal de cor. `completa` (padrão) traz o preço certo.
 * (camadas a fundo) `tamanho`: a ficha na broto ou na média; `adicionais`: a pizza com a borda e os extras (somados).
 */
export function fichaDoProduto(dados, id, tab, { completa = true, receitas, tamanho = null, adicionais = [] } = {}) {
  const { entrada } = montarProduto(dados, id, tab, { completa, receitas, tamanho, adicionais });
  const ficha = calcular(entrada, tab);
  return { entrada, ficha, cupons: cuponsDe(ficha, entrada.vende_app !== false) };
}

/**
 * (camadas a fundo) As fichas de um tamanho: cada sabor (com base) e cada adicional na broto, na média ou na grande.
 * Map id → { entrada, ficha, cupons } ou { erro }. Um com problema não derruba os outros.
 */
export function fichasNoTamanho(dados, tamanho, tab, { completa = true, receitas } = {}) {
  const feitas = receitas ?? custoDasReceitas(dados, tab, { parar: false });
  const mapa = new Map();
  for (const p of [...(dados.cardapio ?? []).filter((x) => existe(x.base)), ...(dados.adicionais ?? [])]) {
    try { mapa.set(p.id, fichaDoProduto(dados, p.id, tab, { completa, receitas: feitas, tamanho })); } catch (e) { mapa.set(p.id, { erro: mensagens(e) }); }
  }
  return mapa;
}

// ---------- o meio a meio ----------

function precoDaRegra(valores, regra, onde) {
  const cs = valores.filter(existe).map((v) => precoEmCentavos(v, onde));
  if (!cs.length) return undefined;
  const c = regra === 'media' && cs.length === 2 ? Math.round((cs[0] + cs[1]) / 2) : Math.max(...cs);
  return c / 100;
}

function montarMeio(dados, sabores, tab, { receitas, tamanho = null } = {}) {
  const ind = indice(dados);
  const [ia, ib] = sabores ?? [];
  if (!ia || !ib || ia === ib) falha('Escolha 2 sabores diferentes pro meio a meio');
  const a = acharProduto(ind, ia);
  const b = acharProduto(ind, ib);
  if (!existe(a.base) || a.base !== b.base) falha(`"${a.nome}" e "${b.nome}" precisam ter a mesma base (o mesmo tamanho de pizza) pra virar meio a meio`);
  const base = baseDo(ind, a);
  const feitas = receitas ?? custoDasReceitas(dados, tab);
  // (camadas a fundo) no tamanho: a base e as metades pela área do disco, a caixa do tamanho e os preços dele
  const nt = noTamanho(dados, ind, a, base, tamanho);
  const f = nt?.area ?? 1;
  const ing = [];
  const emb = [];
  for (const l of base.itens ?? []) ing.push({ grupo: 'base', ...paraCalculadora(ind, l, feitas, tab, base.nome, { fator: f }) });
  for (const [s, grupo] of [[a, 'a'], [b, 'b']]) {
    for (const l of s.itens ?? []) ing.push({ grupo, ...paraCalculadora(ind, l, feitas, tab, s.nome, { fator: 0.5 * f, sufixo: ` (½ ${s.nome})` }) });
  }
  for (const l of nt?.embalagem ?? base.embalagem ?? []) emb.push({ grupo: 'embalagem', ...paraCalculadora(ind, l, feitas, tab, nt?.embalagem ? `${base.nome} (${nt.t.nome})` : base.nome) });
  for (const s of [a, b]) for (const l of s.embalagem ?? []) emb.push({ grupo: 'embalagem', ...paraCalculadora(ind, l, feitas, tab, s.nome, { fator: 0.5, sufixo: ` (½ ${s.nome})` }) });
  const precosDe = (s) => (nt ? precosNoTamanho(s, nt.t.id, nt.ref.id) : s.precos);
  return { a, b, base, ing, emb, tamanho: nt?.t ?? null, precos: [precosDe(a), precosDe(b)] };
}

/**
 * A pizza meio a meio: a base vai inteira (massa, molho, caixa) e cada cobertura vai pela metade.
 * Devolve a ficha nas 2 regras de preço: { regras: { mais_caro, media } }, cada uma { preco_c, entrada, ficha, cupons }.
 * (camadas a fundo) `tamanho`: o meio a meio na broto ou na média, com os preços daquele tamanho.
 */
export function meioAMeio(dados, sabores, tab, { completa = true, receitas, tamanho = null } = {}) {
  const { a, b, base, ing, emb, tamanho: t, precos: [pa, pb] } = montarMeio(dados, sabores, tab, { receitas, tamanho });
  const regras = {};
  for (const regra of Object.keys(REGRAS)) {
    const precos = limpo({
      balcao: precoDaRegra([pa?.balcao, pb?.balcao], regra, 'Meio a meio: o preço do balcão'),
      app: precoDaRegra([pa?.app, pb?.app], regra, 'Meio a meio: o preço no app'),
    });
    const entrada = limpo({
      exemplo: Boolean(dados.exemplo),
      negocio: dados.negocio,
      item: `Meio ${a.nome} + meio ${b.nome} (${t ? t.nome : base.nome})`,
      precos,
      vende_app: a.vende_app === false && b.vende_app === false ? false : undefined,
      ...daLoja(dados),
      ingredientes: ing.map((x) => x.linha),
      embalagem: emb.length ? emb.map((x) => x.linha) : undefined,
      completa,
    });
    const ficha = calcular(entrada, tab);
    regras[regra] = { regra, nome: REGRAS[regra], preco_c: existe(precos.balcao) ? centavos(precos.balcao) : null, entrada, ficha, cupons: cuponsDe(ficha, entrada.vende_app !== false) };
  }
  return { sabores: [a.id, b.id], nomes: [a.nome, b.nome], base: base.id, regras, tamanho: t?.id ?? null };
}

// ---------- a árvore de custo ----------

// (camadas a fundo) o insumo na árvore leva o aproveitamento e o que se compra (o bruto) pra ter a quantidade limpa
function comLimpeza(no, aproveitamento) {
  if (no.tipo !== 'insumo') return no;
  const a = aproveitamento ?? 1;
  no.aproveitamento = a;
  if (a < 1) no.bruto = { valor: brutoDoLimpo(no.qtd.valor, a), unidade: no.qtd.unidade };
  return no;
}

function abrirReceita(id, vezes, custo_c, feitas) {
  const r = feitas.get(id);
  const partes = repartir(custo_c, r.linhas.map((l) => l.custo_c));
  return r.linhas.map((l, i) => {
    const valor = l.qtd.valor * vezes;
    const no = { tipo: l.tipo, id: l.usa, nome: l.nome, qtd: { valor, unidade: l.qtd.unidade }, custo_c: partes[i] };
    if (l.tipo === 'receita') no.filhos = abrirReceita(l.usa, valor / feitas.get(l.usa).rende.valor, partes[i], feitas);
    return comLimpeza(no, l.aproveitamento);
  });
}

/**
 * (camadas a fundo) O que vai fora na limpeza numa árvore de custo (em centavos): a parte de cada insumo que se paga e se
 * joga fora (a casca, o talo, o osso), descendo pelas receitas da casa. Com tudo a 100%: 0.
 */
export function limpezaDaArvore(no) {
  const soma = (n) => (n.filhos?.length ? n.filhos.reduce((t, f) => t + soma(f), 0) : n.tipo === 'insumo' ? n.custo_c * (1 - (n.aproveitamento ?? 1)) : 0);
  return Math.round(soma(no));
}

/**
 * A árvore de custo de 1 unidade do produto ({ produto: id }) ou do meio a meio ({ meio: [a, b] }):
 * o produto → os grupos (a base, a cobertura ou as metades, a embalagem) → cada linha → dentro da receita da casa, as linhas
 * dela, e assim por diante. Cada nível soma o de cima, no centavo (a conta do primeiro nível é a da calculadora).
 */
export function arvoreDeCusto(dados, alvo, tab, { receitas } = {}) {
  const feitas = receitas ?? custoDasReceitas(dados, tab);
  const meio = Array.isArray(alvo?.meio);
  // (camadas a fundo) alvo.tamanho: a pizza (ou o meio a meio) na broto ou na média; alvo.adicionais: com a borda e os extras
  const t = alvo?.tamanho ?? null;
  const m = meio ? montarMeio(dados, alvo.meio, tab, { receitas: feitas, tamanho: t })
    : montarProduto(dados, alvo?.produto, tab, { receitas: feitas, tamanho: t, adicionais: alvo?.adicionais ?? [] });
  const daqui = meio
    ? limpo({ negocio: dados.negocio, item: `Meio ${m.a.nome} + meio ${m.b.nome} (${m.tamanho ? m.tamanho.nome : m.base.nome})`, ...daLoja(dados),
      ingredientes: m.ing.map((x) => x.linha), embalagem: m.emb.length ? m.emb.map((x) => x.linha) : undefined })
    : m.entrada;
  // o custo não depende do preço: sem o preço ainda (produto novo), a árvore sai do mesmo jeito
  const entrada = { ...daqui, negocio: daqui.negocio || 'Minha cozinha', precos: existe(daqui.precos?.balcao) ? daqui.precos : { balcao: 1 }, completa: false };
  const ficha = calcular(entrada, tab);
  const rende = ficha.rende > 0 ? ficha.rende : 1;
  // os ingredientes de 1 unidade (a receita ÷ quanto rende), repartidos como a calculadora fez; a embalagem já é de 1 unidade
  const partesIng = repartir(ficha.totais.ingredientes_c, ficha.ingredientes.map((l) => l.custo_c));
  const no = (o, custo_c, porUnidade) => {
    const valor = o.q.valor * o.fator * porUnidade;
    const n = { tipo: o.alvo.tipo, id: o.alvo.item.id, nome: o.alvo.item.nome, qtd: { valor, unidade: o.q.unidade }, custo_c };
    if (o.alvo.tipo === 'receita') n.filhos = abrirReceita(o.alvo.item.id, valor / feitas.get(o.alvo.item.id).rende.valor, custo_c, feitas);
    return comLimpeza(n, o.aproveitamento);
  };
  const linhasIng = m.ing.map((o, i) => ({ grupo: o.grupo, n: no(o, partesIng[i], 1 / rende) }));
  const linhasEmb = m.emb.map((o, i) => ({ grupo: o.grupo, n: no(o, ficha.embalagem[i].custo_c, 1) }));
  const nomeBase = (b) => (m.tamanho ? `Base: pizza ${m.tamanho.nome.toLowerCase()}` : `Base: ${b.nome}`);
  const NOMES = meio
    ? [['base', nomeBase(m.base)], ['a', `Metade: ${m.a.nome}`], ['b', `Metade: ${m.b.nome}`]]
    : m.base ? [['base', nomeBase(m.base)], ['sabor', 'Cobertura']] : [['sabor', rende > 1 ? `Ingredientes (a receita ÷ ${num(rende)})` : 'Ingredientes']];
  // os adicionais: um grupo para cada um (a borda, o bacon extra), na cor dos adicionais
  for (const a of meio ? [] : m.adicionais ?? []) NOMES.push([`ad:${a.id}`, `Adicional: ${a.nome}`, 'adicional', a.id]);
  const grupos = NOMES.map(([g, nome, cor, id]) => ({ g, nome, cor: cor ?? g, id, filhos: linhasIng.filter((x) => x.grupo === g).map((x) => x.n) }));
  grupos.push({ g: 'embalagem', nome: 'Embalagem', cor: 'embalagem', filhos: linhasEmb.map((x) => x.n) });
  const filhos = grupos.filter((g) => g.filhos.length).map((g) => ({ tipo: 'grupo', grupo: g.cor, ...(g.id ? { id: g.id } : {}), nome: g.nome, custo_c: g.filhos.reduce((t, f) => t + f.custo_c, 0), filhos: g.filhos }));
  return { tipo: 'produto', nome: entrada.item, custo_c: ficha.totais.insumos_c, rende, filhos, ...(m.tamanho ? { tamanho: m.tamanho.id } : {}) };
}

/** Quantas camadas tem a árvore (o produto, a receita, a receita de dentro, o insumo); os grupos não contam. */
export function profundidade(no) {
  const filhos = (no.filhos ?? []).map(profundidade);
  return (no.tipo === 'grupo' ? 0 : 1) + (filhos.length ? Math.max(...filhos) : 0);
}

// ---------- a lista de compras ----------

function quantidadeDoPlano(e) {
  if (!existe(e?.quantidade)) return 0;
  let q;
  try { q = numero(e.quantidade); } catch { falha(`O plano: a quantidade "${e.quantidade}" não é um número`); }
  if (q < 0) falha(`O plano: a quantidade "${e.quantidade}" não pode ser negativa`);
  return q;
}

// as linhas de 1 unidade do que está no plano, com o fator de cada uma (a metade no meio a meio; ÷ rende na receita que rende mais)
// (camadas a fundo) e.tamanho: a pizza na broto ou na média (a base e a cobertura pela área do disco, a caixa do tamanho)
function linhasDoPlano(ind, e, dados = {}) {
  const com = (lista, fator, onde) => (lista ?? []).map((l) => ({ l, fator, onde }));
  if (Array.isArray(e.meio)) {
    const [ia, ib] = e.meio;
    if (!ia || !ib || ia === ib) falha('O plano: o meio a meio precisa de 2 sabores diferentes');
    const a = acharProduto(ind, ia);
    const b = acharProduto(ind, ib);
    if (!existe(a.base) || a.base !== b.base) falha(`"${a.nome}" e "${b.nome}" precisam ter a mesma base (o mesmo tamanho de pizza) pra virar meio a meio`);
    const base = baseDo(ind, a);
    const nt = noTamanho(dados, ind, a, base, e.tamanho);
    const f = nt?.area ?? 1;
    return [...com(base.itens, f, base.nome), ...com(a.itens, 0.5 * f, a.nome), ...com(b.itens, 0.5 * f, b.nome),
      ...com(nt?.embalagem ?? base.embalagem, 1, base.nome), ...com(a.embalagem, 0.5, a.nome), ...com(b.embalagem, 0.5, b.nome)];
  }
  const p = acharProduto(ind, e.produto ?? e.adicional);
  const base = baseDo(ind, p);
  let rende = 1;
  if (existe(p.rende)) {
    try { rende = numero(p.rende); } catch { falha(`${p.nome}: quanto rende "${p.rende}" não é um número`); }
    if (!(rende > 0)) falha(`${p.nome}: quanto rende precisa ser maior que zero`);
  }
  const nt = noTamanho(dados, ind, p, base, e.tamanho);
  const fb = nt?.area ?? 1;
  const fp = nt?.fator ?? 1;
  const caixa = base && nt?.embalagem ? nt.embalagem : base?.embalagem;
  return [...com(base?.itens, fb / rende, base?.nome), ...com(p.itens, fp / rende, p.nome), ...com(caixa, 1, base?.nome), ...com(p.embalagem, 1, p.nome)];
}

/**
 * A lista de compras do plano ([{ produto, quantidade }, { meio: [a, b], quantidade }, { adicional, quantidade }]).
 * Desce pelas camadas (a pizza → o molho → o tomate), soma quanto precisa de cada insumo, tira o que já tem pronto de
 * cada receita da casa e o estoque, e arredonda para o pacote. `garantirMinimo` compra também o que deixa o estoque no mínimo.
 * Devolve { itens, preparo (as receitas da casa para fazer, na ordem), total_c, erros }. `parar: true` para no 1º erro.
 */
export function listaDeCompras(dados, plano, tab, { garantirMinimo = false, parar = false } = {}) {
  const ind = indice(dados);
  const erros = [];
  const tentar = (fn) => {
    try { return fn(); } catch (e) {
      if (parar) throw e;
      for (const m of mensagens(e)) if (!erros.includes(m)) erros.push(m);
      return null;
    }
  };
  const demI = new Map();
  const demL = new Map(); // (camadas a fundo) o que vai no prato, limpo; o demI é o que se compra (o bruto)
  const demR = new Map();
  const somar = (mapa, id, v) => mapa.set(id, (mapa.get(id) ?? 0) + v);
  const descer = (l, fator, onde) => tentar(() => {
    const alvo = resolver(ind, l, onde);
    const lugar = `${onde} → ${alvo.item.nome}`;
    const q = medida(l.vai, tab, lugar);
    if (alvo.tipo === 'insumo') {
      if (!existe(alvo.item.pacote)) falha(`${alvo.item.nome}: falta o pacote que você compra (ex.: 1 kg ou 12 un)`);
      const pac = medida(alvo.item.pacote, tab, `${alvo.item.nome}: o pacote`);
      if (naoBate(q, pac)) falha(`${lugar}: a medida não bate: "${l.vai}" é ${TIPO[q.unidade]} e o pacote "${alvo.item.pacote}" é ${TIPO[pac.unidade]}. Use a mesma medida nos dois (ex.: o peso de 1 unidade)`);
      // a quantidade da receita é a limpa: compra o bruto (100 g de cebola limpa com 90% = 111 g comprados)
      somar(demI, alvo.item.id, brutoDoLimpo(q.valor * fator, aproveitamentoDe(alvo.item)));
      somar(demL, alvo.item.id, q.valor * fator);
    } else {
      const rende = medida(alvo.item.rende, tab, `${alvo.item.nome}: quanto rende`);
      if (naoBate(q, rende)) falha(`${lugar}: a medida não bate: "${l.vai}" é ${TIPO[q.unidade]} e a receita rende "${alvo.item.rende}" (${TIPO[rende.unidade]})`);
      somar(demR, alvo.item.id, q.valor * fator);
    }
  });
  for (const e of plano ?? []) {
    const qtd = tentar(() => quantidadeDoPlano(e));
    if (!qtd) continue;
    const linhas = tentar(() => linhasDoPlano(ind, e, dados)) ?? [];
    for (const { l, fator, onde } of linhas) descer(l, qtd * fator, onde);
  }
  // as receitas da casa, de cima para baixo: quem usa vem antes de quem é usado (o molho antes do tempero dele)
  const ordem = tentar(() => ordemDasReceitas(dados, ind)) ?? [];
  const preparo = [];
  for (const id of [...ordem].reverse()) {
    const precisa = demR.get(id) ?? 0;
    if (!(precisa > 1e-9)) continue;
    const r = ind.receitas.get(id);
    tentar(() => {
      const rende = medida(r.rende, tab, `${r.nome}: quanto rende`);
      const pronto = quantidadeGuardada(r.pronto, rende, tab, { nome: r.nome, campo: 'o que já tem pronto', refTexto: r.rende, refRotulo: 'a receita rende' });
      const fazer = Math.max(0, precisa - pronto);
      const vezes = fazer / rende.valor;
      preparo.push({ id, nome: r.nome, unidade: rende.unidade, rende: rende.valor, precisa, pronto, fazer, vezes });
      if (vezes > 1e-9) for (const l of r.itens ?? []) descer(l, vezes, r.nome);
    });
  }
  preparo.sort((x, y) => ordem.indexOf(x.id) - ordem.indexOf(y.id)); // na ordem de fazer: o tempero antes do molho
  // os insumos: o que precisa, menos o estoque, em pacotes
  const itens = [];
  for (const ins of dados.despensa ?? []) {
    const precisa = demI.get(ins.id) ?? 0;
    const item = tentar(() => {
      if (!(precisa > 1e-9) && !garantirMinimo) return null;
      if (!existe(ins.pacote)) falha(`${ins.nome}: falta o pacote que você compra (ex.: 1 kg ou 12 un)`);
      const pac = medida(ins.pacote, tab, `${ins.nome}: o pacote`);
      const tem = quantidadeGuardada(ins.estoque, pac, tab, { nome: ins.nome, campo: 'o estoque', refTexto: ins.pacote });
      const minimo = quantidadeGuardada(ins.minimo, pac, tab, { nome: ins.nome, campo: 'o mínimo', refTexto: ins.pacote });
      const alvo = precisa + (garantirMinimo ? minimo : 0);
      const falta = Math.max(0, alvo - tem);
      if (!(precisa > 1e-9) && !(falta > 1e-9)) return null;
      const pacotes = falta > 1e-9 ? Math.ceil(Number((falta / pac.valor).toFixed(6))) : 0;
      const preco_c = precoEmCentavos(ins.preco_pacote, `${ins.nome}: o preço do pacote`);
      // (camadas a fundo) o precisa é o bruto (o que se compra); o precisa_limpo é o que vai no prato. A diferença é o que
      // vai fora na limpeza: a casca, o talo, o osso (limpeza_c, pelo preço do pacote)
      const precisa_limpo = demL.get(ins.id) ?? 0;
      return {
        id: ins.id, nome: ins.nome, categoria: ins.categoria || 'Outros', unidade: pac.unidade,
        pacote: { texto: String(ins.pacote), valor: pac.valor }, preco_pacote_c: preco_c,
        precisa, tem, minimo, falta, pacotes, custo_c: pacotes * preco_c, comprar: pacotes > 0,
        fica: tem + pacotes * pac.valor - precisa, abaixo: minimo > 0 && tem < minimo,
        precisa_limpo, aproveitamento: aproveitamentoDe(ins), limpeza_c: Math.round(((precisa - precisa_limpo) / pac.valor) * preco_c),
      };
    });
    if (item) itens.push(item);
  }
  return { itens, preparo, total_c: itens.reduce((t, i) => t + i.custo_c, 0), garantirMinimo, erros, limpeza_c: itens.reduce((t, i) => t + (i.limpeza_c || 0), 0) };
}

// a quantidade escrita sem perder nada (o "comprei" soma no estoque e a conta precisa voltar igual): 17125 g → "17,125 kg"
function quantidadeExata(valor, unidade) {
  const bonito = mostrarQuantidade(valor, unidade);
  const [n, u] = bonito.split(' ');
  const fator = u === 'kg' || u === 'l' ? 1000 : 1;
  if (Math.abs(numero(n) * fator - valor) < 1e-6) return bonito;
  if ((unidade === 'g' || unidade === 'ml') && Math.abs(valor) >= 1000) return `${num(valor / 1000)} ${GRANDE[unidade]}`;
  return `${num(valor)} ${unidade}`;
}

/**
 * O "comprei" da lista de compras: o estoque do insumo depois de comprar `pacotes` pacotes, escrito como na despensa.
 * Ex.: tem "6 kg" de muçarela e comprou 3 pacotes de 4 kg → "18 kg". A conta volta igual (comprar o que a lista pede zera a lista).
 */
export function estoqueDepoisDaCompra(ins, pacotes, tab) {
  if (!existe(ins?.pacote)) falha(`${ins?.nome ?? 'O insumo'}: falta o pacote que você compra (ex.: 1 kg ou 12 un)`);
  const pac = medida(ins.pacote, tab, `${ins.nome}: o pacote`);
  const tem = quantidadeGuardada(ins.estoque, pac, tab, { nome: ins.nome, campo: 'o estoque', refTexto: ins.pacote });
  const n = Number(pacotes);
  if (!(n >= 0)) falha(`${ins.nome}: "${pacotes}" não é um número de pacotes`);
  return quantidadeExata(tem + n * pac.valor, pac.unidade);
}

/** O que já está abaixo do mínimo agora (sem olhar o plano), com quanto falta para chegar nele, em pacotes. */
export function estoqueBaixo(dados, tab) {
  const baixo = [];
  for (const ins of dados.despensa ?? []) {
    if (!existe(ins.minimo)) continue;
    if (!existe(ins.pacote)) falha(`${ins.nome}: falta o pacote que você compra (ex.: 1 kg ou 12 un)`);
    const pac = medida(ins.pacote, tab, `${ins.nome}: o pacote`);
    const tem = quantidadeGuardada(ins.estoque, pac, tab, { nome: ins.nome, campo: 'o estoque', refTexto: ins.pacote });
    const minimo = quantidadeGuardada(ins.minimo, pac, tab, { nome: ins.nome, campo: 'o mínimo', refTexto: ins.pacote });
    if (!(minimo > 0 && tem < minimo)) continue;
    const falta = minimo - tem;
    const pacotes = Math.ceil(Number((falta / pac.valor).toFixed(6)));
    const preco_c = precoEmCentavos(ins.preco_pacote, `${ins.nome}: o preço do pacote`);
    baixo.push({ id: ins.id, nome: ins.nome, categoria: ins.categoria || 'Outros', unidade: pac.unidade, pacote: { texto: String(ins.pacote), valor: pac.valor }, tem, minimo, falta, pacotes, custo_c: pacotes * preco_c });
  }
  return baixo;
}

/** A lista em texto, para copiar e colar (no WhatsApp, nas notas). ✓ = já comprei; ☐ = falta comprar. */
export function textoDaLista(lista, dados, { comprados = new Set() } = {}) {
  const linhas = [`Lista de compras · ${dados.negocio || 'minha cozinha'}${dados.exemplo ? ' (exemplo)' : ''}`];
  const fazer = lista.preparo.filter((p) => p.vezes > 1e-9);
  if (fazer.length) {
    linhas.push('', 'Pra fazer na cozinha');
    for (const p of fazer) linhas.push(`· ${p.nome}: ${mostrarVezes(p.vezes)} (${mostrarQuantidade(p.fazer, p.unidade)})`);
  }
  const grupos = new Map();
  for (const i of lista.itens.filter((x) => x.comprar)) {
    if (!grupos.has(i.categoria)) grupos.set(i.categoria, []);
    grupos.get(i.categoria).push(i);
  }
  for (const [categoria, itens] of grupos) {
    linhas.push('', categoria);
    for (const i of itens) {
      linhas.push(`${comprados.has(i.id) ? '✓' : '☐'} ${i.nome}: ${i.pacotes} ${i.pacotes === 1 ? 'pacote' : 'pacotes'} de ${i.pacote.texto} (uns ${reais(i.custo_c)})`);
    }
  }
  if (!grupos.size) linhas.push('', 'O estoque já cobre o plano: nada pra comprar.');
  linhas.push('', `Total estimado: uns ${reais(lista.total_c)}`, 'É estimativa: o preço muda a cada compra.');
  return linhas.join('\n');
}

// ---------- onde entra cada coisa ----------

/** Onde um insumo (ou uma receita da casa) entra: nas receitas (direto ou por outra), nas bases, nos produtos e adicionais. */
export function ondeEntra(dados, id) {
  const usaAlgum = (lista, alvos) => (lista ?? []).some((l) => alvos.has(l?.usa));
  const receitas = new Set();
  const fila = [id];
  while (fila.length) {
    const atual = new Set([fila.shift()]);
    for (const r of dados.receitas ?? []) {
      if (!receitas.has(r.id) && r.id !== id && usaAlgum(r.itens, atual)) { receitas.add(r.id); fila.push(r.id); }
    }
  }
  const alvos = new Set([id, ...receitas]);
  const bases = (dados.bases ?? []).filter((b) => usaAlgum(b.itens, alvos) || usaAlgum(b.embalagem, alvos)).map((b) => b.id);
  const usa = (p) => usaAlgum(p.itens, alvos) || usaAlgum(p.embalagem, alvos) || bases.includes(p.base);
  return {
    receitas: (dados.receitas ?? []).filter((r) => receitas.has(r.id)).map((r) => r.id),
    bases,
    produtos: (dados.cardapio ?? []).filter(usa).map((p) => p.id),
    adicionais: (dados.adicionais ?? []).filter(usa).map((p) => p.id),
  };
}

// ---------- e se o preço mudar? (v3) ----------

/** O preço do pacote com a mudança em % (de −50 a +100 na tela), em reais e no centavo: 150 e +40 → 210 · 8 e −50 → 4. */
export function precoSimulado(preco, pct) {
  const c = precoEmCentavos(preco, 'O preço do pacote');
  const p = Number(pct);
  if (!Number.isFinite(p)) falha(`A mudança "${pct}" não é um número`);
  return Math.max(0, Math.round(c * (1 + p / 100))) / 100;
}

/**
 * E SE O PREÇO MUDAR? O que um preço novo de um insumo muda, descendo pelas camadas: o insumo → as receitas da casa que
 * usam ele (direto ou por outra, da camada de baixo para a de cima) → as bases → os produtos, os adicionais e o meio a meio
 * escolhido. Cada um com o antes e o depois, pela calculadora (refazer a conta do zero dá igual: um teste confere).
 * O preço de venda não muda, então a sobra de cada venda cai exatamente o que o custo sobe.
 * `semana`: o plano da semana (quantas de cada) vezes a mudança no custo de cada uma.
 * Um item com problema fica com { erro } e não derruba os outros.
 * `antes` e `depois` (opcionais): a conta da cozinha inteira (calcularCozinha) com o preço de hoje e com o novo, se a tela
 * já tiver feito; aí nada é refeito (o arrasto fica leve). Sem eles, a conta sai do zero, e dá igual (um teste confere).
 */
export function efeitoDoPreco(dados, id, novoPreco, tab, opcoes = {}) {
  return efeitoDaMudanca(dados, id, { preco_pacote: novoPreco }, tab, opcoes);
}

/**
 * (camadas a fundo) E SE APROVEITAR MAIS (OU MENOS)? O aproveitamento novo de um insumo (90 = 90%) desce pelas camadas do
 * mesmo jeito que o preço: o quilo limpo muda, e as receitas, as bases, os produtos e a semana mudam junto.
 */
export function efeitoDoAproveitamento(dados, id, novoAproveitamento, tab, opcoes = {}) {
  return efeitoDaMudanca(dados, id, { aproveitamento: novoAproveitamento }, tab, opcoes);
}

/**
 * O que a mudança de um insumo (o preço do pacote, o aproveitamento, ou os 2) muda, descendo pelas camadas, com o antes e o
 * depois de cada um (a mesma conta do efeitoDoPreco, que é este com só o preço). `mudanca` = { preco_pacote?, aproveitamento? }.
 */
export function efeitoDaMudanca(dados, id, mudanca = {}, tab, { completa = true, antes = null, depois = null } = {}) {
  const ind = indice(dados);
  const ins = ind.insumos.get(id);
  if (!ins) falha(`Não achei "${id}" na despensa`);
  const pac = medida(ins.pacote, tab, `${ins.nome}: o pacote`);
  const antes_c = precoEmCentavos(ins.preco_pacote, `${ins.nome}: o preço do pacote`);
  const mudado = { ...ins, ...mudanca };
  const depois_c = precoEmCentavos(mudado.preco_pacote, `${ins.nome}: o preço novo`);
  const aA = aproveitamentoDe(ins);
  const aB = aproveitamentoDe(mudado);
  const novo = { ...dados, despensa: dados.despensa.map((i) => (i.id === id ? mudado : i)) };
  const o = ondeEntra(dados, id);
  const rA = antes?.receitas ?? custoDasReceitas(dados, tab, { parar: false });
  const rB = depois?.receitas ?? custoDasReceitas(novo, tab, { parar: false });
  const pronto = (x) => { if (x?.erro) throw new ErroDaCozinha(x.erro); return x; };
  const afetados = new Set([id, ...o.receitas]);
  const via = (...listas) => [...new Set(listas.flat().map((l) => l?.usa).filter((u) => afetados.has(u)))];
  const par = (a, b) => ({ antes_c: a, depois_c: b, delta_c: b - a });
  const tentar = (base, fn) => { try { return { ...base, ...fn() }; } catch (e) { return { ...base, erro: mensagens(e) }; } };
  const canais = (ka, kb) => ka.map((k, i) => ({ canal: k.canal, preco_c: k.preco, sobra: par(k.sobra, kb[i].sobra), sinal: { antes: k.sinal, depois: kb[i].sinal } }));

  const receitas = o.receitas.map((rid) => {
    const r = ind.receitas.get(rid);
    return tentar({ id: rid, nome: r.nome }, () => {
      const a = rA.get(rid);
      const b = rB.get(rid);
      if (a?.erro || !a) throw new ErroDaCozinha(a?.erro ?? [`${r.nome}: não deu pra fazer a conta`]);
      if (b?.erro || !b) throw new ErroDaCozinha(b?.erro ?? [`${r.nome}: não deu pra fazer a conta`]);
      return { camada: a.camada, via: via(r.itens), rende: a.rende, ...par(a.custo_c, b.custo_c), por: { antes: a.por, depois: b.por } };
    });
  }).sort((x, y) => (x.camada ?? 99) - (y.camada ?? 99));

  const bases = o.bases.map((bid) => {
    const b = ind.bases.get(bid);
    return tentar({ id: bid, nome: b.nome }, () => {
      const a = pronto(antes?.bases?.get(bid)) ?? custoDaBase(dados, bid, tab, { receitas: rA });
      const d = pronto(depois?.bases?.get(bid)) ?? custoDaBase(novo, bid, tab, { receitas: rB });
      return { via: via(b.itens, b.embalagem), ...par(a.total_c, d.total_c) };
    });
  });

  const nasBases = new Set(o.bases);
  const vendido = (pid, tipo) => {
    const p = ind.produtos.get(pid) ?? ind.adicionais.get(pid);
    return tentar({ id: pid, nome: p.nome, tipo }, () => {
      const ja = (c) => pronto(c?.produtos?.get(pid) ?? c?.adicionais?.get(pid));
      const a = ja(antes) ?? fichaDoProduto(dados, pid, tab, { completa, receitas: rA });
      const d = ja(depois) ?? fichaDoProduto(novo, pid, tab, { completa, receitas: rB });
      return {
        base: p.base ?? null,
        via: [...(nasBases.has(p.base) ? [p.base] : []), ...via(p.itens, p.embalagem)],
        custo: par(a.ficha.totais.insumos_c, d.ficha.totais.insumos_c),
        canais: canais(a.cupons, d.cupons),
      };
    });
  };
  const produtos = o.produtos.map((pid) => vendido(pid, 'produto'));
  const adicionais = o.adicionais.map((pid) => vendido(pid, 'adicional'));

  // o meio a meio: a mesma conta da tela (a regra escolhida); o custo não depende da regra
  const regra = REGRAS[dados.meio_a_meio?.regra] ? dados.meio_a_meio.regra : 'mais_caro';
  const afetaMeio = (s) => Array.isArray(s) && s.length === 2 && s.some((x) => o.produtos.includes(x));
  const meioDe = (sabores) => {
    const nomes = sabores.map((s) => ind.produtos.get(s)?.nome ?? s);
    return tentar({ sabores: [...sabores], nome: `½ ${nomes[0]} + ½ ${nomes[1]}`, tipo: 'meio' }, () => {
      const igual = (c) => c?.meio && (c.meio.erro || (c.meio.sabores?.[0] === sabores[0] && c.meio.sabores?.[1] === sabores[1]));
      const a = (igual(antes) ? pronto(antes.meio) : meioAMeio(dados, sabores, tab, { completa, receitas: rA })).regras[regra];
      const d = (igual(depois) ? pronto(depois.meio) : meioAMeio(novo, sabores, tab, { completa, receitas: rB })).regras[regra];
      return { regra, custo: par(a.ficha.totais.insumos_c, d.ficha.totais.insumos_c), canais: canais(a.cupons, d.cupons) };
    });
  };
  const escolhido = dados.meio_a_meio?.sabores;
  const meio = afetaMeio(escolhido) ? meioDe(escolhido) : null;

  // a semana: cada linha do plano vezes a mudança no custo dela
  const porId = new Map([...produtos, ...adicionais].map((x) => [x.id, x]));
  const meios = new Map();
  // (camadas a fundo) a linha do plano num tamanho (a broto, a média): o custo dela, antes e depois, naquele tamanho
  const noTam = new Map();
  const custoNoTamanho = (e) => {
    const chave = `${Array.isArray(e.meio) ? e.meio.join('+') : e.produto ?? e.adicional}@${e.tamanho}`;
    if (!noTam.has(chave)) {
      noTam.set(chave, tentar({}, () => {
        const custo = (d, r) => (Array.isArray(e.meio)
          ? meioAMeio(d, e.meio, tab, { completa, receitas: r, tamanho: e.tamanho }).regras[regra]
          : fichaDoProduto(d, e.produto ?? e.adicional, tab, { completa, receitas: r, tamanho: e.tamanho })).ficha.totais.insumos_c;
        return { custo: par(custo(dados, rA), custo(novo, rB)) };
      }));
    }
    return noTam.get(chave);
  };
  let semana = 0;
  let unidades = 0;
  for (const e of dados.plano ?? []) {
    let q = 0;
    try { q = quantidadeDoPlano(e); } catch { continue; }
    if (!(q > 0)) continue;
    let x = null;
    if (Array.isArray(e.meio)) {
      if (!afetaMeio(e.meio)) continue;
      if (existe(e.tamanho)) x = custoNoTamanho(e);
      else {
        const chave = e.meio.join('+');
        if (!meios.has(chave)) meios.set(chave, meio && escolhido.join('+') === chave ? meio : meioDe(e.meio));
        x = meios.get(chave);
      }
    } else if (existe(e.tamanho)) x = porId.has(e.produto ?? e.adicional) ? custoNoTamanho(e) : null;
    else x = porId.get(e.produto ?? e.adicional);
    if (!x || x.erro) continue;
    semana += q * x.custo.delta_c;
    unidades += q;
  }
  const semana_c = Math.round(semana);
  const limpoDe = (a) => ({ valor: pac.valor * a, unidade: pac.unidade });

  return {
    insumo: {
      id, nome: ins.nome, unidade: pac.unidade, pacote: String(ins.pacote), ...par(antes_c, depois_c),
      pct: antes_c > 0 ? (depois_c - antes_c) / antes_c : 0, por: { antes: precoPor(antes_c, pac), depois: precoPor(depois_c, pac) },
      aproveitamento: { antes: aA, depois: aB }, por_limpo: { antes: precoPor(antes_c, limpoDe(aA)), depois: precoPor(depois_c, limpoDe(aB)) },
    },
    receitas, bases, produtos, adicionais, meio,
    semana: { custo_delta_c: semana_c, sobra_delta_c: semana_c === 0 ? 0 : -semana_c, unidades },
    mudou: depois_c !== antes_c || aA !== aB,
  };
}

// ---------- a cozinha inteira (o que a tela usa) ----------

function estadoDoInsumo(ins, tab) {
  if (!existe(ins.nome)) falha('Tem um insumo sem nome na despensa');
  if (!existe(ins.pacote)) falha(`${ins.nome}: falta o pacote que você compra (ex.: 1 kg ou 12 un)`);
  const pac = medida(ins.pacote, tab, `${ins.nome}: o pacote`);
  const preco_c = precoEmCentavos(ins.preco_pacote, `${ins.nome}: o preço do pacote`);
  const tem = quantidadeGuardada(ins.estoque, pac, tab, { nome: ins.nome, campo: 'o estoque', refTexto: ins.pacote });
  const minimo = quantidadeGuardada(ins.minimo, pac, tab, { nome: ins.nome, campo: 'o mínimo', refTexto: ins.pacote });
  // (camadas a fundo) o quilo limpo: o preço do pacote ÷ o que ele rende depois de limpar (1 kg de cebola a 90% = 900 g)
  const aproveitamento = aproveitamentoDe(ins);
  return {
    id: ins.id, nome: ins.nome, unidade: pac.unidade, pacote: pac.valor, preco_c, por: precoPor(preco_c, pac),
    tem, minimo, abaixo: minimo > 0 && tem < minimo, zerado: !(tem > 0), valor_c: Math.round((tem / pac.valor) * preco_c),
    aproveitamento, pacote_limpo: pac.valor * aproveitamento, por_limpo: precoPor(preco_c, { valor: pac.valor * aproveitamento, unidade: pac.unidade }),
  };
}

/**
 * Tudo de uma vez, para a tela: cada insumo (o preço do kg, o estoque), cada receita da casa, a ficha de cada produto e
 * adicional, o meio a meio escolhido, a lista de compras do plano e o estoque baixo. Um item com problema não derruba os
 * outros: ele fica com { erro } e a frase vai para `erros` ([{ onde, id, texto }], sem repetir).
 */
export function calcularCozinha(dados, tab, { completa = true, garantirMinimo = false, plano = dados.plano } = {}) {
  const erros = [];
  const anotar = (onde, id, e) => {
    const lista = mensagens(e);
    for (const texto of lista) if (!erros.some((x) => x.texto === texto)) erros.push({ onde, id, texto });
    return lista;
  };
  const insumos = new Map();
  for (const ins of dados.despensa ?? []) {
    try { insumos.set(ins.id, estadoDoInsumo(ins, tab)); } catch (e) { insumos.set(ins.id, { id: ins.id, nome: ins.nome, erro: anotar('despensa', ins.id, e) }); }
  }
  let receitas = new Map();
  try {
    receitas = custoDasReceitas(dados, tab, { parar: false });
  } catch (e) {
    const lista = anotar('receitas', null, e);
    for (const r of dados.receitas ?? []) receitas.set(r.id, { id: r.id, nome: r.nome, erro: lista });
  }
  for (const r of dados.receitas ?? []) {
    const feita = receitas.get(r.id);
    if (!feita) continue;
    if (feita.erro) { anotar('receitas', r.id, new ErroDaCozinha(feita.erro)); continue; }
    try {
      feita.pronto = quantidadeGuardada(r.pronto, feita.rende, tab, { nome: r.nome, campo: 'o que já tem pronto', refTexto: r.rende, refRotulo: 'a receita rende' });
    } catch (e) { feita.erro_pronto = anotar('receitas', r.id, e); }
    const o = ondeEntra(dados, r.id);
    feita.usada_em = { receitas: o.receitas, produtos: o.produtos, adicionais: o.adicionais };
  }
  const bases = new Map();
  for (const b of dados.bases ?? []) {
    try { bases.set(b.id, custoDaBase(dados, b.id, tab, { receitas })); } catch (e) { bases.set(b.id, { id: b.id, nome: b.nome, erro: anotar('bases', b.id, e) }); }
  }
  const produtos = new Map();
  const adicionais = new Map();
  for (const [lista, mapa, onde] of [[dados.cardapio, produtos, 'cardapio'], [dados.adicionais, adicionais, 'adicionais']]) {
    for (const p of lista ?? []) {
      try { mapa.set(p.id, fichaDoProduto(dados, p.id, tab, { completa, receitas })); } catch (e) { mapa.set(p.id, { erro: anotar(onde, p.id, e) }); }
    }
  }
  let meio = null;
  if (dados.meio_a_meio?.sabores?.length === 2) {
    try { meio = meioAMeio(dados, dados.meio_a_meio.sabores, tab, { completa, receitas }); } catch (e) { meio = { erro: anotar('meio', null, e) }; }
  }
  const compras = listaDeCompras(dados, plano ?? [], tab, { garantirMinimo });
  for (const texto of compras.erros) anotar('compras', null, new ErroDaCozinha([texto]));
  const baixo = (dados.despensa ?? []).map((i) => insumos.get(i.id)).filter((i) => i && !i.erro && i.abaixo);
  // (camadas a fundo) as contas da loja em reais: o % de verdade (ou a média do ramo) que as fichas estão usando
  const loja = contasDaLoja(dados, tab);
  return { insumos, receitas, bases, produtos, adicionais, meio, compras, baixo, erros, loja };
}

// ---------- os exemplos oficiais da ferramenta, como cozinha ----------

const slug = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

/**
 * Uma ficha da calculadora (como os 4 exemplos oficiais) vira uma cozinha de 1 produto: cada ingrediente e cada embalagem
 * entra na despensa com o pacote e o preço dela. A ficha que sai daqui é a mesma da calculadora (um teste confere).
 */
export function cozinhaDaFicha(e, id = slug(e?.item)) {
  const usados = new Set([id]);
  const novoId = (nome) => {
    const b = slug(nome);
    let x = b;
    for (let n = 2; usados.has(x); n++) x = `${b}-${n}`;
    usados.add(x);
    return x;
  };
  const despensa = [];
  const linha = (l, categoria) => {
    const iid = novoId(l.nome);
    despensa.push({ id: iid, nome: l.nome, categoria, pacote: l.pacote, preco_pacote: l.preco_pacote, estoque: '', minimo: '' });
    return { usa: iid, vai: l.vai };
  };
  const produto = limpo({
    id, nome: e.item, data: e.data, precos: { ...(e.precos ?? {}) }, rende: e.rende, vende_app: e.vende_app,
    itens: (e.ingredientes ?? []).map((l) => linha(l, 'Ingredientes')),
    embalagem: (Array.isArray(e.embalagem) ? e.embalagem : []).map((l) => linha(l, 'Embalagens')),
  });
  return {
    exemplo: Boolean(e.exemplo),
    negocio: e.negocio,
    loja: limpo({
      regime: e.regime, faturamento_mes: e.faturamento_mes,
      custos_fixos: Array.isArray(e.custos_fixos) ? e.custos_fixos.map((c) => ({ ...c })) : undefined,
      custos_fixos_pct: e.custos_fixos_pct, imposto_pct: e.imposto_pct,
    }),
    despensa,
    receitas: [],
    bases: [],
    cardapio: [produto],
    adicionais: [],
    plano: [{ produto: id, quantidade: 0 }],
  };
}
