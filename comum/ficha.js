// O CUPOM DA FICHA NO SITE (07/11/2026). Só desenha: a conta sai da calculadora de verdade (calculadora/contas.mjs,
// cópia exata da ferramenta). O jeito de desenhar é o da ficha V2 aprovada em 05/11 (ferramentas/ficha-tecnica/pagina-v2.mjs):
//   você cobra − ingredientes − app − contas da loja − imposto = sobra pra você
//   balcão e app lado a lado, com o sinal de cor; a sobra é "uns R$ X" (o meio da faixa) e a faixa inteira embaixo
// O sinal e o cupom são iguais aos da V2 (um teste confere). Aqui o desenho é para tela de celular, não a imagem de 1080 px.
// (v3) Cada número vem marcado (data-rola + data-rola-num, em reais): com o trocarConteudo do comum/interacao.js,
// o que mudou rola do valor velho ao novo. O texto da tela é o mesmo de sempre.
import { calcularFicha, reais, pct } from '../calculadora/contas.mjs';
import { cadeadoSvg } from '../valores.js';

export { reais, pct };

export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const v = (c) => reais(c, { simbolo: false });
/** A marca do número que rola: a chave e o valor em reais (centavos ÷ 100). */
const rola = (chave, c) => ` data-rola="${esc(chave)}" data-rola-num="${(c / 100).toFixed(2)}"`;
const meio = (a, b) => Math.round((a + b) / 2);
const faixaPct = ([a, b]) => (a === b ? pct(a) : `${pct(a)} a ${pct(b)}`);
export const dataBR = (iso) => { const [a, m, d] = String(iso).split('-'); return d ? `${d}/${m}/${a}` : esc(iso); };

/** A conta da ficha, pela calculadora. `tab` = { porcoes, padroes, impostos } (os 3 JSON da calculadora). */
export function calcular(entrada, tab) {
  return calcularFicha(entrada, tab.porcoes, tab.padroes, tab.impostos);
}

/** Os 3 JSON da calculadora (no navegador). */
export async function carregarTabelas(base = new URL('../calculadora/', import.meta.url)) {
  const ler = async (nome) => {
    const r = await fetch(new URL(nome, base));
    if (!r.ok) throw new Error(`não achei calculadora/${nome}`);
    return r.json();
  };
  const [porcoes, padroes, impostos] = await Promise.all([ler('porcoes-padrao.json'), ler('padroes.json'), ler('imposto.json')]);
  return { porcoes: porcoes.porcoes, padroes, impostos };
}

/* O SINAL DE CADA CANAL (igual à V2). 10% é a ponta de baixo da média do ramo. */
export function sinal(c) {
  if (c.situacao === 'prejuizo') return { cls: 'ruim', txt: 'Dá prejuízo' };
  if (c.situacao === 'risco') return { cls: 'ruim', txt: 'Pode dar prejuízo' };
  if (c.margem_min < 0.10) return { cls: 'atencao', txt: 'Sobra pouco' };
  return { cls: 'bom', txt: 'Deixa sobra' };
}

/** O cupom de um canal, com o meio de cada faixa (igual à V2). A soma fecha sempre no centavo. */
export function cupom(c) {
  const fixos = meio(c.fixos_min_c, c.fixos_max_c);
  const imposto = meio(c.imposto_min_c, c.imposto_max_c);
  const sobra = c.preco_c - c.insumos_c - c.taxa_c - fixos - imposto;
  return { preco: c.preco_c, insumos: c.insumos_c, app: c.taxa_c, fixos, imposto, sobra, faixa: [c.lucro_min_c, c.lucro_max_c] };
}

/** Os canais que vão no cupom (como a V2): o balcão e, se vende no app, o app de hoje ou o sugerido. */
export function canaisDoCupom(f, vendeApp = true) {
  const balcao = f.canais.find((c) => c.id === 'balcao');
  const app = f.canais.find((c) => c.id === 'app');
  const hoje = f.canais.find((c) => c.id === 'app_hoje');
  return balcao ? [balcao, ...(vendeApp ? [hoje ?? app] : [])].filter(Boolean) : [hoje].filter(Boolean);
}

const TITULO = { balcao: 'No balcão', app: 'No app (sugerido)', app_hoje: 'No app, hoje' };
/** O nome da linha da taxa: a do app, a da maquininha do balcão (quando a loja preencheu) ou as duas. */
function rotuloDaTaxa(p, canais) {
  const maquininha = (p.taxa_balcao ?? 0) > 0;
  const comApp = canais.some((c) => c.id !== 'balcao');
  if (maquininha && comApp) return ['O app ou a maquininha', `app ${pct(p.taxa_app)} · maquininha ${pct(p.taxa_balcao)}`];
  if (maquininha) return ['A maquininha fica com', `${pct(p.taxa_balcao)} do preço`];
  return ['O app fica com', `${pct(p.taxa_app)} do preço`];
}
// o "R$ 8,42" nunca quebra no meio (espaço que não quebra); o "uns" pode ir para cima na tela estreita
const junto = (t) => t.replace(' ', '\u00a0');
const sobraTexto = (k) => (k.sobra >= 0 ? `uns ${junto(reais(k.sobra))}` : `− ${junto(reais(-k.sobra))}`);
const faixaTexto = ([a, b]) => (a === b ? '' : `de ${a < 0 ? '−' : ''}${v(Math.abs(a))} a ${b < 0 ? '−' : ''}${v(Math.abs(b))}`);

/** O selo "exemplo" (só na ficha de exemplo). */
export const seloExemplo = (f) => (f.exemplo ? '<span class="selo-exemplo">exemplo</span>' : '');

/** O título da ficha: o negócio e o produto (o selo "exemplo" vai no cupom). */
export function montarTitulo(f) {
  return `<div class="ficha-titulo"><p class="ficha-negocio">${esc(f.negocio)}</p><h2 class="ficha-item">${esc(f.item)}</h2></div>`;
}

/** O cupom inteiro (a tabela da V2). */
export function montarCupom(f, { vendeApp = true } = {}) {
  const canais = canaisDoCupom(f, vendeApp);
  const p = f.percentuais;
  const t = f.totais;
  const ks = canais.map(cupom);
  const temApp = canais.length > 1 || canais[0].taxa_c > 0;
  const subInsumos = f.rende > 1 ? `receita ${reais(t.receita_c)} ÷ ${f.rende}` : t.embalagem_c > 0 ? 'com a embalagem' : '';
  const cel = (fn, chave, cls = '') => ks.map((k, i) => {
    const marca = chave && Number.isFinite(k[chave]) && !(chave === 'app' && !(k.app > 0)) ? rola(`${canais[i].id}-${chave}`, k[chave]) : '';
    return `<td class="${cls}"${marca}>${fn(k, canais[i])}</td>`;
  }).join('');
  const linha = (op, rotulo, sub, fn, cls = '', chave = '') =>
    `<tr class="${cls}"><th scope="row"><span class="op">${op}</span>${rotulo}${sub ? `<small>${sub}</small>` : ''}</th>${cel(fn, chave, 'num')}</tr>`;
  const cab = canais.map((c) => {
    const s = sinal(c);
    return `<th scope="col"><span class="canal">${TITULO[c.id] ?? esc(c.nome)}</span><span class="pill ${s.cls}"><i></i>${s.txt}</span></th>`;
  }).join('');
  const sobra = canais.map((c, i) => {
    const s = sinal(c);
    return `<td class="sobra ${s.cls}"><b${rola(`${c.id}-sobra`, ks[i].sobra)}>${sobraTexto(ks[i])}</b><small>${faixaTexto(ks[i].faixa)}</small></td>`;
  }).join('');
  return `<div class="cupom${canais.length > 1 ? ' dois' : ''}">
  ${seloExemplo(f)}
  <table>
    <caption class="so-leitor">A conta de cada venda de ${esc(f.item)}</caption>
    <thead><tr><th scope="col" class="cab-rot">Em cada venda</th>${cab}</tr></thead>
    <tbody>
      ${linha('', 'Você cobra', '', (k) => reais(k.preco), 'cobra', 'preco')}
      ${linha('−', 'Ingredientes', subInsumos, (k) => v(k.insumos), '', 'insumos')}
      ${temApp ? linha('−', ...rotuloDaTaxa(p, canais), (k) => (k.app > 0 ? v(k.app) : '<span class="nada">—</span>'), '', 'app') : ''}
      ${linha('−', 'Contas da loja', 'aluguel, luz, gás, salário', (k) => v(k.fixos), '', 'fixos')}
      ${linha('−', 'Imposto', '', (k) => v(k.imposto), '', 'imposto')}
    </tbody>
    <tfoot><tr class="total"><th scope="row"><span class="op">=</span>Sobra pra você</th>${sobra}</tr></tfoot>
  </table>
</div>`;
}

/** Quem já vende no app: o preço sugerido do app, com a sobra dele (a dica da V2). */
export function montarAppSugerido(f, { vendeApp = true } = {}) {
  const app = f.canais.find((c) => c.id === 'app');
  const hoje = f.canais.find((c) => c.id === 'app_hoje');
  if (!(hoje && app && vendeApp)) return '';
  const k = cupom(app);
  return `<section class="dica"><span class="dica-rot">No app, o preço sugerido</span><p><b${rola('dica-app-preco', app.preco_c)}>${reais(app.preco_c)}</b> (${pct(app.acrescimo)} sobre o balcão): sobra uns <b${rola('dica-app-sobra', k.sobra)}>${reais(k.sobra)}</b> em cada venda.</p></section>`;
}

/** O preço certo: na conta completa, as frases da V2; na grátis, o cartão trancado (com o cadeado de abacaxi). */
export function montarPrecoCerto(f) {
  if (!f.completa) {
    return `<section class="certo trancado"><span class="dica-rot">${cadeadoSvg()} O preço certo</span><p>Sai na conta completa, com a embalagem e as contas da sua loja.</p></section>`;
  }
  const s = f.preco_sugerido;
  if (!s) return '';
  const [a, b] = s.lucro.map((x) => `${Math.round(x * 100)}%`);
  let corpo;
  if (s.acima_da_media) corpo = `Seu preço de balcão <b>já deixa mais</b> que a média do ramo (${a} a ${b} de lucro).`;
  else if (!s.min_c) corpo = `<b>Atenção:</b> ${esc(s.aviso)}. Nem ${a} de lucro fecha.`;
  else if (!s.max_c) corpo = `Pra ter ${a} de lucro, cobre <b>${reais(s.min_c)}</b> no balcão.`;
  else corpo = `Pra ficar na média do ramo (${a} a ${b} de lucro), cobre de <b>${reais(s.min_c)} a ${v(s.max_c)}</b> no balcão.`;
  const faixa = s.min_c ? `<p class="certo-faixa">Na média do ramo: de ${reais(s.min_c)}${s.max_c ? ` a ${v(s.max_c)}` : ''} no balcão.</p>` : '';
  return `<section class="certo"><span class="dica-rot">O preço certo</span><p>${corpo}</p>${s.acima_da_media ? faixa : ''}</section>`;
}

/** O que mais pesa no custo de cada unidade (só se pesar 25% ou mais), como na V2. */
export function montarMaisPesa(f) {
  const t = f.totais;
  const top = [...f.ingredientes].sort((x, y) => y.custo_c - x.custo_c)[0];
  if (!top || !t.insumos_c) return '';
  const porUnidade = Math.round(top.custo_c / (f.rende > 1 ? f.rende : 1));
  const parte = porUnidade / t.insumos_c;
  if (parte < 0.25) return '';
  const nome = top.nome.replace(/\s*\(estimativa\)$/i, '');
  return `<section class="dica"><span class="dica-rot">O que mais pesa</span><p><b>${esc(nome)}</b>: ${reais(porUnidade)} em cada um (${Math.round(parte * 100)}% do custo). Se ele subir de preço, a sobra cai.</p></section>`;
}

/** A nota do rodapé: é estimativa, e de onde saiu cada porcentagem. */
export function montarNotas(f, { vendeApp = true } = {}) {
  const p = f.percentuais;
  const canais = canaisDoCupom(f, vendeApp);
  const temApp = canais.length > 1 || canais[0].taxa_c > 0;
  const notas = [
    `Contas da loja: ${faixaPct(p.fixos.faixa)} do preço${p.fixos.origem === 'padrao' ? ' (média do ramo)' : ''}`,
    `imposto: ${faixaPct(p.imposto.faixa)}`,
    ...(temApp ? [`app: ${pct(p.taxa_app)}`] : []),
  ].join(' · ');
  const semEmbalagem = !(f.totais.embalagem_c > 0);
  return `<p class="ficha-nota"><b>É uma estimativa</b> com os preços digitados. ${notas}.${semEmbalagem ? ' <b>Ainda não entrou:</b> a embalagem.' : ''}</p>`;
}

/** A ficha inteira (o título, o cupom, as dicas e a nota). */
export function montarFicha(f, { vendeApp = true } = {}) {
  return `${montarTitulo(f)}${montarCupom(f, { vendeApp })}${montarAppSugerido(f, { vendeApp })}${montarPrecoCerto(f)}${montarMaisPesa(f)}${montarNotas(f, { vendeApp })}`;
}

/** O resumo pequeno (o cartão da home e a lista "minhas fichas"): cada canal com o preço, o sinal e a sobra. */
export function montarResumo(f, { vendeApp = true } = {}) {
  return canaisDoCupom(f, vendeApp).map((c) => {
    const k = cupom(c);
    const s = sinal(c);
    return `<div class="resumo-canal"><span class="canal">${TITULO[c.id] ?? esc(c.nome)}</span><span class="resumo-preco"${rola(`r-${c.id}-preco`, k.preco)}>${reais(k.preco)}</span><span class="pill ${s.cls}"><i></i>${s.txt}</span><span class="resumo-sobra"${rola(`r-${c.id}-sobra`, k.sobra)}>sobra ${sobraTexto(k)}</span></div>`;
  }).join('');
}
