// O CARDÁPIO AO VIVO (07/11/2026): o que a página da Marca faz com os itens que a pessoa escreve, sem tocar na tela (dá para testar).
//   - a pessoa escreve o nome da loja, os itens e os preços; o "R$" quem escreve é este arquivo, nunca o HTML
//   - o exemplo vem das 4 fichas de exemplo oficiais (comum/exemplos.js): cada linha fica marcada "exemplo" até a pessoa mexer nela
//   - 3 jeitos de letra (Bistrô, Balcão e Lousa) e 2 formatos (o story e a folha A4)
//   - a folha vai até 15 itens e o frente e verso até 30, como no robô da Marca
//   - nada do que a pessoa escreve é guardado nem sai da página
import { EXEMPLOS } from '../comum/exemplos.js';

export const LIMITE_FOLHA = 15;
export const LIMITE_ITENS = 30;
export const LIMITE_CATEGORIAS = 8;

/** Os 3 jeitos de letra (todas do Google Fonts). */
export const ESTILOS = [
  { id: 'bistro', nome: 'Bistrô', letra: 'Fraunces', jeito: 'serifada, no papel' },
  { id: 'balcao', nome: 'Balcão', letra: 'Big Shoulders', jeito: 'alta e forte, de placa' },
  { id: 'lousa', nome: 'Lousa', letra: 'Josefin Sans', jeito: 'fina, de giz' },
];
/** Os 2 formatos: o story (9 × 16) e a folha A4 (21 × 29,7 cm). */
export const FORMATOS = [
  { id: 'story', nome: 'Story' },
  { id: 'folha', nome: 'Folha A4' },
];

export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** O preço que a pessoa digitou, em número ("25", "25,90", "R$ 32", "1.250,00"). Vazio, zero ou estranho = null (fica sem preço). */
export function lerPreco(texto) {
  const t = String(texto ?? '').replace(/r\$|reais|real/gi, '').replace(/\s+/g, '');
  if (!t || !/^\d[\d.,]*$/.test(t)) return null;
  let n;
  if (t.includes(',')) {
    const [inteiro, ...resto] = t.split(',');
    if (resto.length > 1 || resto[0].length > 2) return null; // a vírgula separa os centavos (até 2)
    n = Number(`${inteiro.replace(/\./g, '')}.${resto[0] || '0'}`);
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    n = Number(t.replace(/\./g, '')); // 1.250 = mil duzentos e cinquenta
  } else {
    n = Number(t); // 25 ou 25.9
  }
  if (!Number.isFinite(n) || n <= 0 || n > 99999) return null;
  return Math.round(n * 100) / 100;
}

/** O preço digitado não virou número (para avisar na caixa)? Vazio não é erro. */
export const precoEstranho = (texto) => String(texto ?? '').trim() !== '' && lerPreco(texto) == null;

/** O inteiro com o ponto de milhar: 1250 → "1.250". */
export const comMilhar = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** (v3) O preço em 2 números (o inteiro e os centavos), para o preço que rola enquanto a pessoa digita. */
export function numerosDoPreco(valor) {
  const c = Math.round((Number(valor) || 0) * 100);
  return { inteiro: Math.floor(c / 100), centavos: c % 100 };
}

/** As partes do preço para o desenho: "R$", o inteiro com ponto de milhar e os centavos. */
export function partesDoPreco(valor) {
  if (valor == null || !Number.isFinite(valor)) return null;
  const [inteiro, centavos] = valor.toFixed(2).split('.');
  return { moeda: 'R$', inteiro: comMilhar(inteiro), centavos };
}

/** O preço escrito por inteiro: "R$ 25,00" (com espaço que não quebra). */
export function escreverPreco(valor) {
  const p = partesDoPreco(valor);
  return p ? `${p.moeda} ${p.inteiro},${p.centavos}` : '';
}

// cada linha do editor tem um número só dela (para a tela não perder o lugar de quem está digitando)
let proximoId = 1;
const linha = (tipo, campos = {}) => ({ id: proximoId++, tipo, nome: '', preco: '', exemplo: false, ...campos });
/** O preço do exemplo do jeito que a pessoa digitaria ("25", "9", "12,5"). */
const digitado = (v) => String(v).replace('.', ',');

/** O cardápio de exemplo: a loja e os 4 itens das fichas de exemplo oficiais, com o preço do balcão. Tudo marcado "exemplo". */
export function cardapioDeExemplo() {
  const fichas = ['x-bacon', 'parmegiana', 'frango-a-passarinho', 'bolo-de-cenoura'].map((id) => EXEMPLOS[id]).filter(Boolean);
  return {
    loja: { texto: EXEMPLOS['x-bacon']?.negocio ?? '', exemplo: true },
    rodape: { texto: '', exemplo: false },
    linhas: [
      linha('secao', { nome: 'Mais pedidos', exemplo: true }),
      ...fichas.map((f) => linha('item', { nome: f.item, preco: digitado(f.precos.balcao), exemplo: true })),
    ],
  };
}

/** O cardápio em branco (o "começar do zero"): sem loja e com 1 item vazio. */
export function cardapioVazio() {
  return { loja: { texto: '', exemplo: false }, rodape: { texto: '', exemplo: false }, linhas: [linha('item')] };
}

/** Muda o nome ou o preço de uma linha. A linha vira da pessoa: sai o "exemplo". */
export function mudarLinha(c, id, campo, valor) {
  if (campo !== 'nome' && campo !== 'preco') return c;
  return { ...c, linhas: c.linhas.map((l) => (l.id === id ? { ...l, [campo]: String(valor ?? ''), exemplo: false } : l)) };
}

/** Muda o nome da loja ou o rodapé (vira da pessoa). */
export function mudarCampo(c, campo, valor) {
  if (campo !== 'loja' && campo !== 'rodape') return c;
  return { ...c, [campo]: { texto: String(valor ?? ''), exemplo: false } };
}

/** Tira uma linha. */
export const tirarLinha = (c, id) => ({ ...c, linhas: c.linhas.filter((l) => l.id !== id) });

const quantas = (c, tipo) => c.linhas.filter((l) => l.tipo === tipo).length;
/** Ainda cabe mais uma linha desse tipo? Até 30 itens (o frente e verso) e até 8 categorias. */
export const podeAcrescentar = (c, tipo) => (tipo === 'secao' ? quantas(c, 'secao') < LIMITE_CATEGORIAS : quantas(c, 'item') < LIMITE_ITENS);

/** Acrescenta um item ou uma categoria no fim. Devolve o cardápio novo e o número da linha (ou null, se passou do limite). */
export function acrescentar(c, tipo) {
  if (tipo !== 'item' && tipo !== 'secao') return null;
  if (!podeAcrescentar(c, tipo)) return null;
  const nova = linha(tipo);
  return { cardapio: { ...c, linhas: [...c.linhas, nova] }, id: nova.id };
}

/** (v3) Quanto a página rola sozinha (px por quadro) com o dedo perto da borda, enquanto a pessoa arrasta uma linha. */
export function rolagemNaBorda(y, alturaJanela, { cima = 96, baixo = 72, maximo = 14 } = {}) {
  if (!(alturaJanela > 0)) return 0;
  if (y < cima) return -Math.round(maximo * Math.min(1, (cima - y) / cima));
  if (y > alturaJanela - baixo) return Math.round(maximo * Math.min(1, (y - (alturaJanela - baixo)) / baixo));
  return 0;
}

/** (v3) Muda a linha de lugar: ela sai de onde está e entra na posição `para` (0 = a primeira). A ordem decide a categoria. */
export function moverLinha(c, id, para) {
  const de = c.linhas.findIndex((l) => l.id === id);
  if (de < 0) return c;
  const resto = c.linhas.filter((l) => l.id !== id);
  const onde = Math.max(0, Math.min(resto.length, Math.round(Number(para) || 0)));
  if (onde === de) return c;
  return { ...c, linhas: [...resto.slice(0, onde), c.linhas[de], ...resto.slice(onde)] };
}

/**
 * (v3) Arrastando a linha `i` por `dy` px: em que posição ela entra. `caixas` = [{ top, altura }] das linhas, em ordem.
 * Conta quantas das outras linhas têm o meio acima do meio da que está sendo arrastada.
 */
export function indiceNoArrasto(caixas, i, dy) {
  const eu = caixas[i];
  if (!eu) return i;
  const meio = eu.top + eu.altura / 2 + dy;
  return caixas.reduce((n, c, k) => (k !== i && c.top + c.altura / 2 < meio ? n + 1 : n), 0);
}

/** O cardápio pronto para desenhar: as categorias com os itens (item sem nome não entra) e se ainda tem exemplo.
 *  (v3) Cada item e cada categoria levam o número da linha (id): a prévia anima o que entrou e o que mudou de lugar. */
export function montarCardapio(c) {
  const secoes = [];
  let atual = { id: null, titulo: '', exemplo: false, itens: [] };
  const fecha = () => { if (atual.titulo || atual.itens.length) secoes.push(atual); };
  for (const l of c.linhas) {
    if (l.tipo === 'secao') {
      fecha();
      atual = { id: l.id, titulo: l.nome.trim(), exemplo: l.exemplo, itens: [] };
      continue;
    }
    const nome = l.nome.trim();
    if (!nome) continue;
    atual.itens.push({ id: l.id, nome, preco: lerPreco(l.preco), exemplo: l.exemplo });
  }
  fecha();
  const itens = secoes.reduce((n, s) => n + s.itens.length, 0);
  const temExemplo = c.loja.exemplo || c.rodape.exemplo || secoes.some((s) => s.exemplo || s.itens.some((i) => i.exemplo));
  return { loja: c.loja.texto.trim(), rodape: c.rodape.texto.trim(), secoes, itens, temExemplo };
}

const linhaDe = (id) => (Number.isFinite(id) ? ` data-linha="${id}"` : '');

function itemHtml(i) {
  const p = partesDoPreco(i.preco);
  const preco = p ? `<span class="cv-preco" data-preco="${i.preco}"><span class="cv-rs">${p.moeda}</span> <span class="cv-int">${p.inteiro}</span><span class="cv-cent">,${p.centavos}</span></span>` : '';
  const ex = i.exemplo ? '<small class="cv-ex">exemplo</small>' : '';
  return `<li class="cv-item"${linhaDe(i.id)}><span class="cv-nome">${esc(i.nome)}${ex}</span><span class="cv-pontos" aria-hidden="true"></span>${preco}</li>`;
}

function secaoHtml(s) {
  const titulo = s.titulo ? `<p class="cv-secao-nome"${linhaDe(s.id)}><span>${esc(s.titulo)}</span></p>` : '';
  const itens = s.itens.length ? `<ul class="cv-itens">${s.itens.map(itemHtml).join('')}</ul>` : '';
  return `<div class="cv-secao">${titulo}${itens}</div>`;
}

/** O cardápio desenhado (o HTML da prévia), no jeito de letra e no formato escolhidos. Todo texto da pessoa sai escapado. */
export function desenharCardapio(m, { estilo = 'bistro', formato = 'folha' } = {}) {
  const e = ESTILOS.some((x) => x.id === estilo) ? estilo : 'bistro';
  const f = FORMATOS.some((x) => x.id === formato) ? formato : 'folha';
  const loja = m.loja ? esc(m.loja) : '<span class="cv-vazio">O nome da sua loja</span>';
  const cab = `<div class="cv-cab"><p class="cv-sobre">Cardápio</p><p class="cv-loja">${loja}</p><span class="cv-orna" aria-hidden="true"></span></div>`;
  const corpo = m.secoes.length ? m.secoes.map(secaoHtml).join('') : '<p class="cv-vazio cv-sem-itens">Os seus itens aparecem aqui</p>';
  const rodape = m.rodape ? `<p class="cv-rodape">${esc(m.rodape)}</p>` : '';
  const inicial = esc((m.loja.match(/[\p{L}\p{N}]/u) ?? [''])[0].toUpperCase());
  const ui = f === 'story'
    ? `<div class="cv-story-ui" aria-hidden="true"><span class="cv-barras"><i></i><i></i><i></i></span><span class="cv-perfil"><b>${inicial}</b>${m.loja ? esc(m.loja) : 'sua loja'}</span></div>`
    : '';
  const selo = m.temExemplo ? '<span class="cv-selo">exemplo</span>' : '';
  return `<div class="cv cv-${e} cv-${f}"><div class="cv-papel">${ui}<div class="cv-miolo">${cab}<div class="cv-corpo">${corpo}</div></div>${rodape}</div>${selo}</div>`;
}
