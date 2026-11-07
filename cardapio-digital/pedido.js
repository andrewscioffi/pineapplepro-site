// O CARDÁPIO DIGITAL: AS CONTAS (prévia, 07/11/2026). Sem tela: a página (cardapio-digital.js) e o teste usam este arquivo.
//   - o cardápio de exemplo: os 4 exemplos oficiais da ficha técnica (marcados "exemplo"), um em cada categoria
//   - o preço de cada item: o de hoje (o balcão do exemplo) e o da ficha (a conta completa da calculadora de verdade)
//   - a simulação do dono: "e se o que você compra subir?" (o preço de cada pacote sobe junto; a conta é da calculadora)
//     (v3) vai de hoje até o dobro, de 1 em 1%: o item que passa a dar prejuízo acende, com o preço que ele precisaria ter
//   - o pedido: pôr, tirar, o total e o pedido fechado, em centavos (número inteiro, como a calculadora)
// Nenhuma conta da ficha é feita aqui: só se escolhe qual dos números da calculadora vai para o cardápio.
import { calcular, sinal, cupom } from '../comum/ficha.js';
import { numero } from '../calculadora/contas.mjs';

// Um exemplo oficial em cada categoria (são 4 negócios de exemplo diferentes, juntos num cardápio de exemplo).
export const CATEGORIAS = [
  { id: 'lanches', nome: 'Lanches', exemplo: 'x-bacon' },
  { id: 'pratos', nome: 'Pratos', exemplo: 'parmegiana' },
  { id: 'porcoes', nome: 'Porções', exemplo: 'frango-a-passarinho' },
  { id: 'doces', nome: 'Doces', exemplo: 'bolo-de-cenoura' },
];

export const SUBIDA_MAX = 1; // a simulação vai até +100% (o dobro: o tomate e o queijo já dobraram de preço num ano)
export const QTD_MAX = 20; // o máximo de um mesmo item no pedido da demonstração

// ---------- a simulação do dono ----------

const centavo = (n) => Math.round(Number((n * 100).toFixed(6))) / 100;
const subirLinha = (linha, fator) => {
  const nova = { ...linha };
  if (nova.preco_pacote !== undefined && nova.preco_pacote !== '') nova.preco_pacote = centavo(numero(nova.preco_pacote) * fator);
  if (nova.custo !== undefined && nova.custo !== '') nova.custo = centavo(numero(nova.custo) * fator);
  return nova;
};

/** O quanto subiu, sempre entre 0 e SUBIDA_MAX (0,3 = +30%). */
export const subidaValida = (subiu) => Math.min(Math.max(Number(subiu) || 0, 0), SUBIDA_MAX);

/** O exemplo com tudo o que se compra mais caro: o preço de cada pacote (ingredientes e embalagem) × (1 + subiu).
 *  Devolve uma cópia: o exemplo oficial nunca muda. */
export function comAumento(entrada, subiu = 0) {
  const fator = 1 + subidaValida(subiu);
  const linhas = (lista) => (Array.isArray(lista) ? lista.map((l) => subirLinha(l, fator)) : lista);
  return { ...entrada, ingredientes: linhas(entrada.ingredientes), embalagem: linhas(entrada.embalagem) };
}

// ---------- o preço que vai para o cardápio ----------

const balcaoDe = (f) => f.canais.find((c) => c.id === 'balcao');

/** O preço que a ficha põe no cardápio (a regra desta prévia; quem decide a regra final é o Andrews):
 *   - a conta completa dá a faixa da média do ramo (preco_sugerido: o preço de balcão de 10% e o de 25% de lucro)
 *   - o seu preço abaixo do topo da faixa: o cardápio usa o topo (com ele, o sinal da ficha fica em "deixa sobra")
 *   - o seu preço no topo ou acima: fica o seu (a ficha nunca abaixa o seu preço)
 *   - sem a conta (custos fixos altos demais): fica o seu, com o aviso da ficha */
export function precoDaFicha(f) {
  const hoje = balcaoDe(f).preco_c;
  const s = f.preco_sugerido;
  if (!s || !s.min_c) return { preco_c: hoje, motivo: 'sem-conta', topo_c: null, aviso: s?.aviso ?? 'a ficha não fechou a conta' };
  const topo = s.max_c ?? s.min_c;
  if (hoje >= topo) return { preco_c: hoje, motivo: 'fica', topo_c: topo, acima: hoje > topo };
  return { preco_c: topo, motivo: 'sobe', topo_c: topo };
}

/** O resumo de um preço, todo da calculadora: o preço, o sinal de cor e a sobra (o meio da faixa, como no cupom). */
function resumoDoCanal(c) {
  const k = cupom(c);
  return { preco_c: c.preco_c, sinal: sinal(c), sobra_c: k.sobra, faixa_c: k.faixa };
}

/** "Pão de hambúrguer (estimativa)" → "Pão de hambúrguer" */
const semParenteses = (t) => String(t).replace(/\s*\([^)]*\)/g, '').trim();

/** Um item do cardápio, com a conta da calculadora: o preço de hoje e o da ficha, cada um com o sinal e a sobra. */
export function montarItem(id, entrada, tab, { subiu = 0, categoria = null } = {}) {
  const e = { ...comAumento(entrada, subiu), completa: true };
  const f = calcular(e, tab);
  const hoje = resumoDoCanal(balcaoDe(f));
  const p = precoDaFicha(f);
  // o preço da ficha passa de novo pela calculadora, para o sinal e a sobra dele também saírem de lá
  const naFicha = p.preco_c === hoje.preco_c
    ? hoje
    : resumoDoCanal(balcaoDe(calcular({ ...e, precos: { ...e.precos, balcao: p.preco_c / 100 } }, tab)));
  return {
    id,
    categoria,
    exemplo: f.exemplo,
    negocio: f.negocio,
    nome: f.item,
    inicial: f.item.trim().charAt(0).toUpperCase(),
    ingredientes: f.ingredientes.map((l) => semParenteses(l.nome)),
    embalagem: f.embalagem.map((l) => semParenteses(l.nome)),
    rende: f.rende,
    subiu: subidaValida(subiu),
    hoje,
    ficha: { ...naFicha, motivo: p.motivo, topo_c: p.topo_c, acima: Boolean(p.acima), aviso: p.aviso ?? null, faixa_ramo_c: f.preco_sugerido ? [f.preco_sugerido.min_c, f.preco_sugerido.max_c] : null },
  };
}

/** O cardápio de exemplo inteiro, na ordem das categorias. */
export function montarCardapio(exemplos, tab, { subiu = 0 } = {}) {
  return CATEGORIAS.filter((c) => exemplos[c.exemplo]).map((c) => montarItem(c.exemplo, exemplos[c.exemplo], tab, { subiu, categoria: c.id }));
}

/** O lado (o de hoje ou o da ficha) dá prejuízo? É o sinal da calculadora: "Dá prejuízo" ou "Pode dar prejuízo". */
export const daPrejuizo = (lado) => lado?.sinal?.cls === 'ruim';

/** Quanto o item precisaria custar pra deixar sobra (o preço da ficha), quando o de hoje fica abaixo dele; senão, null. */
export const precisaCustar = (item) => (item.ficha.motivo === 'sobe' ? item.ficha.preco_c : null);

/** O preço que o cliente vê: o de hoje, ou o da ficha com a chave ligada. */
export const precoNoCardapio = (item, usarFicha) => (usarFicha ? item.ficha.preco_c : item.hoje.preco_c);

/** A linha curta do cartão: os primeiros ingredientes da ficha ("Cenoura, ovos, óleo…"). */
export function descricao(item, quantos = 3) {
  const nomes = item.ingredientes.slice(0, quantos).map((n, i) => (i ? n.charAt(0).toLowerCase() + n.slice(1) : n));
  return `${nomes.join(', ')}${item.ingredientes.length > quantos ? '…' : ''}`;
}

// ---------- o pedido: { id: quantidade } (cada função devolve um pedido novo; o de antes não muda) ----------

const quantoValido = (n) => Number.isInteger(n) && n > 0;

/** Põe n unidades do item (até QTD_MAX). */
export function adicionar(pedido, id, n = 1) {
  if (!id || !quantoValido(n)) return { ...pedido };
  return { ...pedido, [id]: Math.min((pedido[id] ?? 0) + n, QTD_MAX) };
}

/** Tira n unidades do item; chegou a zero, o item sai do pedido. */
export function tirar(pedido, id, n = 1) {
  const novo = { ...pedido };
  if (!quantoValido(n) || !novo[id]) return novo;
  const qtd = novo[id] - n;
  if (qtd > 0) novo[id] = qtd;
  else delete novo[id];
  return novo;
}

/** Quantas unidades tem no pedido. */
export const quantidade = (pedido) => Object.values(pedido).reduce((t, q) => t + q, 0);

/** As linhas do pedido, com o preço que está no cardápio agora (o de hoje ou o da ficha). */
export function linhasDoPedido(pedido, itens, usarFicha) {
  return Object.entries(pedido).map(([id, qtd]) => {
    const item = itens.find((i) => i.id === id);
    if (!item) return null;
    const preco_c = precoNoCardapio(item, usarFicha);
    return { id, nome: item.nome, qtd, preco_c, subtotal_c: preco_c * qtd };
  }).filter(Boolean);
}

/** O total do pedido, em centavos. */
export const total = (pedido, itens, usarFicha) => linhasDoPedido(pedido, itens, usarFicha).reduce((t, l) => t + l.subtotal_c, 0);

/** O pedido fechado (o recibo da prévia): as linhas, quantas unidades e o total. Na prévia, ele não vai pra lugar nenhum. */
export function resumoDoPedido(pedido, itens, usarFicha) {
  const linhas = linhasDoPedido(pedido, itens, usarFicha);
  return { linhas, qtd: linhas.reduce((t, l) => t + l.qtd, 0), total_c: linhas.reduce((t, l) => t + l.subtotal_c, 0) };
}
