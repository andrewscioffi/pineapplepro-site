// AS CONTAS DA LANDING DO PINE COST PRO (v3, 07/11/2026), sem tela: o pine-cost.js desenha, este arquivo decide.
// Testado no Node (testes/pine-cost.test.mjs). Nada aqui grava, manda ou busca coisa alguma.
//   o palco      os 4 exemplos oficiais (comum/exemplos.js), em que cartão o carrossel para, a régua do preço
//                e a faixa do preço certo. Toda conta de ficha sai da calculadora (comum/ficha.js → calculadora/contas.mjs)
//   as camadas   a despensa, as receitas da casa, a ficha, o meio a meio e a lista de compras da pizzaria de exemplo
//                (comum/exemplos-cozinha.js), pela cozinha da ferramenta (comum/cozinha.js)
//   o que recebe quantas fichas e fotos tem o grátis e o pacote, lido dos textos do valores.js
// Todo HTML daqui leva só texto escapado (esc) e números da conta.
import { calcular, sinal, reais, esc, montarCupom, montarAppSugerido, montarPrecoCerto, montarNotas } from '../comum/ficha.js';
import { EXEMPLOS } from '../comum/exemplos.js';
import * as C from '../comum/cozinha.js';
// a mesma pizzaria da ferramenta, a completa (com o aproveitamento de cada insumo): os números batem com o app/ (o Andrews, 07/11)
import { PIZZARIA_A_FUNDO as PIZZARIA } from '../comum/exemplos-cozinha.js';
import { produto } from '../valores.js';
import { limitar } from '../comum/interacao.js';

const copia = (x) => JSON.parse(JSON.stringify(x));
const r2 = (n) => Math.round(n * 100) / 100;
/** A marca do número que rola (comum/interacao.js → trocarConteudo): a chave e o valor do jeito que está na tela. */
const rola = (chave, valor) => ` data-rola="${esc(chave)}" data-rola-num="${Number(valor).toFixed(2)}"`;
const pill = (s) => `<span class="pill ${s.cls}"><i></i>${s.txt}</span>`;
const sobraTxt = (k) => (k.sobra >= 0 ? `uns ${reais(k.sobra)}` : `− ${reais(-k.sobra)}`);

// =====================================================================================================
// O PALCO: os 4 exemplos, a régua do preço e o cadeado do preço certo
// =====================================================================================================

/** Os 4 exemplos oficiais, na ordem do arquivo (o X-Bacon primeiro: é ele que está no cartão da vitrine). */
export const ORDEM = Object.keys(EXEMPLOS);

/** O que vai em cada cartão do carrossel: o número, o produto e o negócio (todos de exemplo). */
export const cartoes = () => ORDEM.map((id, i) => ({ id, n: i + 1, total: ORDEM.length, item: EXEMPLOS[id].item, negocio: EXEMPLOS[id].negocio }));

/** O HTML dos cartões (botões de aba: o painel é a conta). Só o ativo entra no Tab; as setas andam entre eles. */
export function htmlCartoes(ativo = 0) {
  return cartoes().map((c, i) => `<button type="button" class="pc-cartao" role="tab" id="pc-ex-${esc(c.id)}" data-i="${i}" aria-selected="${i === ativo}" aria-controls="pc-conta" tabindex="${i === ativo ? 0 : -1}">
    <span class="pc-cartao-n">${c.n} de ${c.total}</span><b class="pc-cartao-item">${esc(c.item)}</b><span class="pc-cartao-negocio">${esc(c.negocio)}</span></button>`).join('');
}

/** A posição do carrossel durante o arrasto (em cartões). Além das pontas, o elástico segura. */
export function posicaoNoArrasto(indice, dx, passo, total) {
  const p = indice - dx / Math.max(1, passo);
  const fim = total - 1;
  if (p < 0) return p * 0.35;
  if (p > fim) return fim + (p - fim) * 0.35;
  return p;
}

/**
 * Em que cartão o carrossel para ao soltar: o mais perto de onde o dedo largou, mais o empurrão (vx, em px por ms).
 * O arrasto curto e decidido (mais de 24 px) anda 1 cartão. Nunca passa das pontas.
 */
export function alvoDoCarrossel({ indice, dx = 0, vx = 0, passo, total }) {
  const p = indice - (dx + vx * 180) / Math.max(1, passo);
  let alvo = Math.round(p);
  if (alvo === indice && Math.abs(dx) > 24) alvo = indice - Math.sign(dx);
  return limitar(alvo, 0, total - 1);
}

/** Quanto cada cartão está longe do meio (−1 a 1, para o giro) e o quanto apaga (0 a 1). */
export function jeitoDoCartao(i, posicao) {
  const d = i - posicao;
  return { k: +Math.min(1, Math.abs(d)).toFixed(3), r: +limitar(d, -1, 1).toFixed(3) };
}

/**
 * Onde a fila de cartões fica (px, da esquerda do trilho). Na tela estreita, o cartão da vez fica no meio (e os outros giram);
 * quando os 4 cabem lado a lado (o computador), a fila inteira fica no meio e o arrasto só empurra um pouco.
 */
export function deslocamentoDaFila({ p, cartao, passo, largura, total, dx = 0 }) {
  const fila = total * passo - (passo - cartao);
  if (fila <= largura) return { x: +((largura - fila) / 2 + dx * 0.18).toFixed(1), cabem: true };
  return { x: +(largura / 2 - cartao / 2 - p * passo).toFixed(1), cabem: false };
}

/**
 * A faixa da régua do preço para um exemplo (em reais): de ~60% a ~160% do preço do exemplo, de 50 em 50 centavos.
 * Com `certo` (o preço sugerido da conta completa: { min_c, max_c }), a régua cresce até a média do ramo caber nela.
 */
export function faixaDoPreco(e, certo = null) {
  const base = Number(e.precos.balcao);
  const rotulo = base < 15 ? 1 : 5; // de quanto em quanto aparece o número na régua
  const baixo = Math.min(base * 0.6, certo?.min_c ? (certo.min_c / 100) * 0.95 : Infinity);
  const alto = Math.max(base * 1.6, certo?.max_c ? (certo.max_c / 100) * 1.05 : 0);
  const min = Math.max(rotulo, Math.floor(baixo / rotulo) * rotulo);
  const max = Math.ceil(alto / rotulo) * rotulo;
  return { min, max, passo: 0.5, rotulo, base };
}

/** A régua de um exemplo do palco: a faixa do preço dele e a média do ramo (pela conta completa da calculadora). */
export function faixaDoExemplo(id, tab) {
  const e = EXEMPLOS[id];
  const certo = fichaDoPalco(id, Number(e.precos.balcao), tab, { completa: true }).preco_sugerido;
  return faixaDoPreco(e, certo);
}

/** O preço no passo da régua (50 centavos), dentro da faixa. */
export function noPasso(v, f) {
  const n = Math.round((Number(v) - f.min) / f.passo);
  return r2(limitar(f.min + n * f.passo, f.min, f.max));
}

/** O preço durante o arrasto: puxar a fita para a esquerda sobe o preço (como uma régua de verdade). */
export function precoDoArrasto(inicio, dx, f, pxPorPasso) {
  return limitar(inicio - (dx / pxPorPasso) * f.passo, f.min, f.max);
}

/** Onde a fita para depois de soltar: o empurrão do dedo leva um pouco mais longe, e cai no passo. */
export function precoDaInercia(atual, vx, f, pxPorPasso, { forca = 150 } = {}) {
  return noPasso(atual - ((vx * forca) / pxPorPasso) * f.passo, f);
}

/** Quantos px da ponta esquerda da fita fica um preço. */
export const naFita = (v, f, pxPorPasso) => ((v - f.min) / f.passo) * pxPorPasso;

/** O preço em % da faixa (para o mapa de cima da régua). */
export const naFaixa = (v, f) => +((limitar((v - f.min) / (f.max - f.min), 0, 1)) * 100).toFixed(3);

/** Os riscos da régua: o de cada passo, o maior de cada real e o número a cada `rotulo` reais. */
export function marcasDaFita(f) {
  const marcas = [];
  const passos = Math.round((f.max - f.min) / f.passo);
  for (let k = 0; k <= passos; k++) {
    const v = r2(f.min + k * f.passo);
    const tipo = Math.abs(v / f.rotulo - Math.round(v / f.rotulo)) < 1e-9 ? 'rotulo' : Number.isInteger(v) ? 'real' : 'meio';
    marcas.push({ v, k, tipo });
  }
  return marcas;
}

/** O HTML da fita (os riscos e os números). Os números da régua são reais, sem centavos. */
export function htmlFita(f, pxPorPasso) {
  return marcasDaFita(f).map((m) => `<i class="pc-risco ${m.tipo}" style="left:${(m.k * pxPorPasso).toFixed(1)}px"></i>${m.tipo === 'rotulo' ? `<span class="pc-risco-n" style="left:${(m.k * pxPorPasso).toFixed(1)}px">${m.v}</span>` : ''}`).join('');
}

/** O exemplo com o preço da régua: o balcão muda; se o exemplo também vende no app, o app vai pelo mesmo preço (como no exemplo). */
export function comPreco(e, preco, { completa = false } = {}) {
  const precos = { ...e.precos, balcao: preco };
  if (e.precos.app !== undefined && e.precos.app !== null) precos.app = preco;
  return { ...e, precos, completa };
}

/** A ficha do palco, pela calculadora de verdade. */
export function fichaDoPalco(id, preco, tab, { completa = false } = {}) {
  const e = EXEMPLOS[id];
  if (!e) throw new Error(`não achei o exemplo "${id}"`);
  return calcular(comPreco(e, preco, { completa }), tab);
}

/** As cores do balcão em cada preço da régua (a mesma conta do cupom), juntando o que é igual: [{ de, ate, cls }]. */
export function zonasDoBalcao(id, f, tab) {
  const zonas = [];
  for (const { v } of marcasDaFita(f)) {
    const ficha = fichaDoPalco(id, v, tab);
    const cls = sinal(ficha.canais.find((c) => c.id === 'balcao')).cls;
    const ultima = zonas[zonas.length - 1];
    if (ultima && ultima.cls === cls) ultima.ate = v;
    else zonas.push({ de: v, ate: v, cls });
  }
  return zonas;
}

/** O mapa de cima da régua: as cores do balcão, a faixa do preço certo (só na conta completa) e o ponto do preço. */
export function htmlMapa(zonas, f, ficha) {
  const meio = f.passo / 2;
  const partes = zonas.map((z) => {
    const de = naFaixa(Math.max(f.min, z.de - meio), f);
    const ate = naFaixa(Math.min(f.max, z.ate + meio), f);
    return `<i class="pc-zona ${z.cls}" style="left:${de}%;width:${+(ate - de).toFixed(3)}%"></i>`;
  }).join('');
  const certa = faixaCerta(ficha, f);
  const meioDaFaixa = certa ? certa.de + certa.largura / 2 : 50;
  const ponta = meioDaFaixa < 22 ? ' na-ponta-esq' : meioDaFaixa > 78 ? ' na-ponta-dir' : ''; // o rótulo não sai da régua
  const faixa = certa ? `<span class="pc-certa${ponta}" style="left:${certa.de}%;width:${certa.largura}%"><span class="pc-certa-rot">média do ramo</span></span>` : '';
  return `<span class="pc-zonas">${partes}</span>${faixa}`;
}

/** A faixa do preço certo no mapa (em %), ou null (na grátis, ou quando a conta não fecha). */
export function faixaCerta(ficha, f) {
  const s = ficha?.preco_sugerido;
  if (!s?.min_c) return null;
  const de = naFaixa(s.min_c / 100, f);
  const ate = s.max_c ? naFaixa(s.max_c / 100, f) : 100;
  return { de, largura: +Math.max(1.2, ate - de).toFixed(3), min_c: s.min_c, max_c: s.max_c ?? null };
}

/** Onde o preço do balcão está, perto da média do ramo (só na conta completa): 'abaixo', 'dentro', 'acima' ou null. */
export function ondeEsta(ficha) {
  const s = ficha?.preco_sugerido;
  const b = ficha?.canais?.find((c) => c.id === 'balcao')?.preco_c;
  if (!s?.min_c || !b) return null;
  if (b < s.min_c) return 'abaixo';
  if (s.max_c && b > s.max_c) return 'acima';
  return 'dentro';
}

/** A frase curta embaixo da régua: na grátis, o convite; na completa, onde o preço está perto da média do ramo. */
export function notaDoPreco(ficha, { completa = false, mesmoNoApp = false } = {}) {
  const app = mesmoNoApp ? '<span class="pc-preco-app">No exemplo, o app cobra o mesmo preço do balcão.</span>' : '';
  if (!completa) return `Arraste a régua: a conta muda na hora.${app}`;
  const onde = ondeEsta(ficha);
  if (onde === 'abaixo') return `<b class="pc-onde atencao"><i></i>Abaixo da média do ramo</b>${app}`;
  if (onde === 'dentro') return `<b class="pc-onde bom"><i></i>Na média do ramo</b>${app}`;
  if (onde === 'acima') return `<b class="pc-onde bom"><i></i>Já deixa mais que a média do ramo</b>${app}`;
  return `<b class="pc-onde ruim"><i></i>Nem a média do ramo fecha</b>${app}`;
}

/** A conta inteira do palco: o cupom (com o app sugerido) e a nota. O preço certo vai no cartão do cadeado. */
export function htmlDaConta(ficha) {
  return { cupom: `${montarCupom(ficha, { vendeApp: true })}${montarAppSugerido(ficha, { vendeApp: true })}`, nota: montarNotas(ficha, { vendeApp: true }) };
}

/** O cartão do preço certo aberto: as frases da ficha V2 (comum/ficha.js), saídas da conta completa. */
export const htmlPrecoCerto = (ficha) => montarPrecoCerto(ficha);

// =====================================================================================================
// AS 5 CAMADAS: cada uma com um pedacinho funcionando e o caminho certo na ferramenta (app/)
// =====================================================================================================

export const CAMADAS = [
  { id: 'despensa', n: 1, nome: 'A despensa', rota: '../app/index.html#despensa' },
  { id: 'receitas', n: 2, nome: 'As receitas da casa', rota: '../app/index.html#receitas' },
  { id: 'ficha', n: 3, nome: 'A ficha de cada produto', rota: '../app/index.html#cardapio/frango-requeijao' },
  { id: 'meio', n: 4, nome: 'O meio a meio', rota: '../app/index.html#meio' },
  { id: 'compras', n: 5, nome: 'A lista de compras', rota: '../app/index.html#compras' },
];

/** A ponta de cada camada: o nome, o caminho na ferramenta e o "próxima". */
export function htmlCabecaDaCamada(id) {
  const i = CAMADAS.findIndex((c) => c.id === id);
  const c = CAMADAS[i];
  return `<div class="pc-camada-cab"><p class="pc-camada-nome"><span>${c.n}</span>${esc(c.nome)}</p><a class="pc-abrir" href="${esc(c.rota)}">Abrir na ferramenta <span aria-hidden="true">→</span></a></div>`;
}

// ---------- 1. a despensa: o estoque contra o mínimo, e o "+1 pacote" ----------

export const DESPENSA_MINI = ['tomate', 'queijo', 'farinha', 'caixa'];
const virgula = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');

/** A pizzaria com os pacotes que chegaram (extras: id → quantos pacotes a mais). */
export function despensaComCompra(extras = {}, tab) {
  const d = copia(PIZZARIA);
  for (const ins of d.despensa) {
    const n = Number(extras[ins.id] || 0);
    if (!n) continue;
    const pac = C.medida(ins.pacote, tab, ins.nome);
    const tem = C.quantidadeGuardada(ins.estoque, pac, tab, { nome: ins.nome, refTexto: ins.pacote });
    ins.estoque = `${virgula(tem + n * pac.valor)} ${pac.unidade}`;
  }
  return d;
}

/** Os insumos do pedacinho da despensa, pela cozinha da ferramenta (o mesmo cálculo da tela #despensa). */
export function despensaMini(tab, extras = {}) {
  const k = C.calcularCozinha(despensaComCompra(extras, tab), tab, { completa: false, plano: [] });
  return DESPENSA_MINI.map((id) => k.insumos.get(id)).filter((i) => i && !i.erro);
}

// o número de "tem 4 kg", "tem 500 g" ou "tem 30 un", do jeito que a cozinha escreve (de 1000 g pra cima, em kg)
const naTela = (ins, v) => (ins.unidade !== 'un' && Math.abs(v) >= 1000 ? v / 1000 : v);
// o aproveitamento escrito: 0,9 → "90%", 0,855 → "85,5%"
const pctAprov = (a) => `${String(Math.round(a * 1000) / 10).replace('.', ',')}%`;

export function htmlDespensa(insumos) {
  const linhas = insumos.map((ins) => {
    const escala = ins.minimo * 2; // o mínimo fica no meio da barra
    const cheio = +Math.min(100, (ins.tem / escala) * 100).toFixed(2);
    const s = ins.abaixo ? { cls: 'atencao', txt: 'abaixo do mínimo' } : { cls: 'bom', txt: 'em dia' };
    return `<li class="pc-ins${ins.abaixo ? ' abaixo' : ''}" data-ins="${esc(ins.id)}">
      <div class="pc-ins-topo"><b>${esc(ins.nome)}</b>${pill(s)}</div>
      <p class="pc-ins-preco">sai <b${rola(`${ins.id}-por`, ins.por.c / 100)}>${C.mostrarPrecoPor(ins.por)}</b>${ins.aproveitamento < 1 ? `<small> · limpo ${C.mostrarPrecoPor(ins.por_limpo)} (aproveita ${pctAprov(ins.aproveitamento)})</small>` : ''}</p>
      <div class="pc-ins-barra" aria-hidden="true"><i data-rola="${esc(ins.id)}-barra" data-rola-anima="width" style="width:${cheio}%"></i><span class="pc-ins-min" style="left:50%"></span></div>
      <div class="pc-ins-pe"><span><span${rola(`${ins.id}-tem`, naTela(ins, ins.tem))}>tem ${C.mostrarQuantidade(ins.tem, ins.unidade)}</span> · mínimo ${C.mostrarQuantidade(ins.minimo, ins.unidade)}</span>
        <button type="button" class="pc-mais" data-mais="${esc(ins.id)}" aria-label="Chegou 1 pacote de ${esc(ins.nome)}">+1 pacote</button></div>
    </li>`;
  }).join('');
  const emDia = insumos.every((i) => !i.abaixo);
  return `<ul class="pc-despensa">${linhas}</ul>
    <p class="pc-camada-nota">${emDia ? '<b>A despensa está em dia.</b> <button type="button" class="pc-link" data-recomecar="despensa">Recomeçar</button>' : 'Chegou a compra? Toque em <b>+1 pacote</b> e veja o estoque passar do mínimo.'}</p>`;
}

// ---------- 2. as receitas da casa: o tomate entra no molho, e o molho na pizza ----------

/** A conta das 3 camadas com o preço do tomate escolhido (reais o kg). */
export function cadeiaDoMolho(tab, precoTomate = 8) {
  const d = copia(PIZZARIA);
  d.despensa.find((i) => i.id === 'tomate').preco_pacote = precoTomate;
  const receitas = C.custoDasReceitas(d, tab);
  const molho = receitas.get('molho');
  const tempero = receitas.get('tempero');
  const { ficha, cupons } = C.fichaDoProduto(d, 'calabresa', tab, { completa: false, receitas });
  const balcao = cupons.find((k) => k.canal === 'balcao');
  const noMolho = molho.linhas.find((l) => l.usa === 'tomate');
  const temperoNoMolho = molho.linhas.find((l) => l.usa === 'tempero');
  const naPizza = ficha.ingredientes.find((l) => l.nome === molho.nome);
  const vai = d.bases.flatMap((b) => b.itens).find((l) => l.usa === 'molho')?.vai ?? '';
  return { precoTomate, molho, tempero, ficha, balcao, noMolho, temperoNoMolho, naPizza, vai };
}

export function htmlReceitas(m) {
  const kgTomate = Math.round(m.precoTomate * 100);
  return `<ol class="pc-cadeia">
    <li class="pc-elo e3"><span class="pc-elo-rot">3 · O cardápio</span><b>Pizza de calabresa</b>
      <span class="pc-elo-n">custa <span${rola('pizza-custo', m.ficha.totais.insumos_c / 100)}>${reais(m.ficha.totais.insumos_c)}</span></span>
      <span class="pc-elo-mais">no balcão, sobra <span${rola('pizza-sobra', m.balcao.sobra / 100)}>${sobraTxt(m.balcao)}</span> ${pill(m.balcao.sinal)}</span></li>
    <li class="pc-elo e2"><span class="pc-elo-rot">2 · A receita da casa</span><b>${esc(m.molho.nome)}</b>
      <span class="pc-elo-n"${rola('molho-kg', m.molho.por.c / 100)}>${C.mostrarPrecoPor(m.molho.por)}</span>
      <span class="pc-elo-mais">${esc(m.vai)} em cada pizza: <span${rola('molho-pizza', m.naPizza.custo_c / 100)}>${reais(m.naPizza.custo_c)}</span><span class="pc-elo-dentro">leva o ${esc(m.tempero.nome.toLowerCase())}, que tem a ficha dele</span></span></li>
    <li class="pc-elo e1"><span class="pc-elo-rot">1 · A despensa</span><b>Tomate</b>
      <span class="pc-elo-n"${rola('tomate-kg', kgTomate / 100)}>${reais(kgTomate)} o kg</span>
      <span class="pc-elo-mais">${C.mostrarQuantidade(m.noMolho.qtd.valor, m.noMolho.qtd.unidade)}${m.noMolho.bruto ? ` limpos (compra ${C.mostrarQuantidade(m.noMolho.bruto.valor, m.noMolho.bruto.unidade)})` : ''} em cada receita de molho: <span${rola('tomate-molho', m.noMolho.custo_c / 100)}>${reais(m.noMolho.custo_c)}</span></span></li>
  </ol>`;
}

// ---------- 3. a ficha de cada produto: a pizza por dentro, camada dentro de camada ----------

export const PRODUTO_DA_FICHA = 'frango-requeijao';

/** A árvore de custo da pizza de exemplo (o que vai dentro de quê) e o cupom do balcão. */
export function fichaMini(tab) {
  const arvore = C.arvoreDeCusto(PIZZARIA, { produto: PRODUTO_DA_FICHA }, tab);
  const { cupons } = C.fichaDoProduto(PIZZARIA, PRODUTO_DA_FICHA, tab, { completa: false });
  return { arvore, balcao: cupons.find((k) => k.canal === 'balcao'), camadas: C.profundidade(arvore) };
}

const TIPO_NO = { receita: 'receita da casa', insumo: 'da despensa' };

function htmlNo(no, total, caminho, abertos) {
  const chave = `${caminho}/${no.id ?? no.grupo ?? no.nome}`;
  const filhos = no.filhos ?? [];
  const parte = total > 0 ? +Math.max(0.6, (no.custo_c / total) * 100).toFixed(2) : 0;
  const compra = no.bruto ? ` (compra ${C.mostrarQuantidade(no.bruto.valor, no.bruto.unidade)})` : '';
  const qtd = no.qtd ? `${C.mostrarQuantidade(no.qtd.valor, no.qtd.unidade)}${compra} · ` : '';
  const sobre = no.tipo === 'grupo' ? '' : `<small>${qtd}${TIPO_NO[no.tipo] ?? ''}</small>`;
  const aberto = no.tipo === 'grupo' || abertos.has(chave);
  const id = `pc-no-${chave.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`;
  const cab = filhos.length && no.tipo !== 'grupo'
    ? `<button type="button" class="pc-no-abre" data-no="${esc(chave)}" aria-expanded="${aberto}" aria-controls="${id}"><span class="pc-no-seta" aria-hidden="true"></span><span class="pc-no-nome">${esc(no.nome)}${sobre}</span></button>`
    : `<span class="pc-no-nome${no.tipo === 'grupo' ? ' grupo' : ''}">${esc(no.nome)}${sobre}</span>`;
  const dentro = filhos.length
    ? `<div class="pc-no-filhos" id="${id}" data-aberto="${aberto}"${aberto ? '' : ' inert aria-hidden="true"'}><ul>${filhos.map((f) => htmlNo(f, total, chave, abertos)).join('')}</ul></div>`
    : '';
  return `<li class="pc-no ${esc(no.tipo)}"><div class="pc-no-linha">${cab}<b class="pc-no-custo">${reais(no.custo_c)}</b><i class="pc-no-parte" style="width:${parte}%"></i></div>${dentro}</li>`;
}

export function htmlFicha(m, abertos = new Set()) {
  return `<div class="pc-ficha-topo"><p><b>${esc(m.arvore.nome)}</b> <span class="selo-exemplo">exemplo</span></p>
      <p class="pc-ficha-conta">custa <b>${reais(m.arvore.custo_c)}</b> · no balcão, sobra <b>${sobraTxt(m.balcao)}</b> ${pill(m.balcao.sinal)}</p></div>
    <ul class="pc-arvore">${m.arvore.filhos.map((g) => htmlNo(g, m.arvore.custo_c, 'p', abertos)).join('')}</ul>
    <p class="pc-camada-nota">Toque no que é <b>receita da casa</b> e veja o que vai dentro: nesta pizza são ${m.camadas} camadas, da pizza até o que vem da despensa.</p>`;
}

// ---------- 4. o meio a meio: a base inteira e metade de cada cobertura ----------

export const PARES = [['calabresa', 'frango-requeijao'], ['mucarela', 'bacon'], ['marguerita', 'calabresa']];
export const CORES_SABOR = { mucarela: '#F9C748', calabresa: '#FF6B1A', marguerita: '#a6e02e', 'frango-requeijao': '#f7f4ec', bacon: '#d2852e' };
export const nomeDoSabor = (id) => PIZZARIA.cardapio.find((p) => p.id === id)?.nome ?? id;

export function meioMini(tab, par = 0) {
  const [a, b] = PARES[par] ?? PARES[0];
  const m = C.meioAMeio(PIZZARIA, [a, b], tab, { completa: false });
  const k = (r) => m.regras[r].cupons.find((x) => x.canal === 'balcao');
  return { a, b, m, k, dif: k('mais_caro').sobra - k('media').sobra };
}

export function htmlParesDoMeio(par = 0) {
  const sabor = (id) => `<span class="pc-par-sabor"><i style="--cor:${CORES_SABOR[id]}"></i>${esc(nomeDoSabor(id))}</span>`;
  return PARES.map(([a, b], i) => `<button type="button" class="chip" data-par="${i}" aria-pressed="${i === par}">${sabor(a)}<span aria-hidden="true">+</span>${sabor(b)}</button>`).join('');
}

export function pizzaSvg(a, b) {
  const fatias = [45, 90, 135].map((g) => `<line x1="110" y1="18" x2="110" y2="202" transform="rotate(${g} 110 110)"/>`).join('');
  return `<svg class="pc-pizza" viewBox="0 0 220 220" role="img" aria-label="Meio ${esc(nomeDoSabor(a))}, meio ${esc(nomeDoSabor(b))}">
    <defs><radialGradient id="pc-pz-luz" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></radialGradient></defs>
    <circle class="pz-borda" cx="110" cy="110" r="104"/>
    <path class="pz-metade" d="M110 16 A94 94 0 0 0 110 204 Z" style="fill:${CORES_SABOR[a]}"/>
    <path class="pz-metade" d="M110 16 A94 94 0 0 1 110 204 Z" style="fill:${CORES_SABOR[b]}"/>
    <circle class="pz-luz" cx="110" cy="110" r="94" fill="url(#pc-pz-luz)"/>
    <g class="pz-fatias">${fatias}</g>
    <line class="pz-corte" x1="110" y1="8" x2="110" y2="212"/>
  </svg>`;
}

export function htmlRegrasDoMeio(x) {
  return `${Object.keys(C.REGRAS).map((r) => `<div class="pc-regra${r === 'mais_caro' ? ' comum' : ''}">
      <span class="pc-regra-nome">${C.REGRAS[r]}${r === 'mais_caro' ? ' <small>o mais comum</small>' : ''}</span>
      <span class="pc-regra-preco">cobra <span${rola(`${r}-preco`, x.m.regras[r].preco_c / 100)}>${reais(x.m.regras[r].preco_c)}</span></span>
      <b class="pc-regra-sobra ${x.k(r).sinal.cls}"${rola(`${r}-sobra`, x.k(r).sobra / 100)}>${sobraTxt(x.k(r))}</b>
      <span class="pc-regra-de">de sobra no balcão ${pill(x.k(r).sinal)}</span>
    </div>`).join('')}
    <p class="pc-camada-nota">Custa <b>${reais(x.m.regras.media.ficha.totais.insumos_c)}</b>: a base inteira e metade de cada cobertura.${x.dif > 0 ? ` Cobrando o sabor mais caro, sobram uns <b>${reais(x.dif)} a mais</b> em cada pizza.` : ''}</p>`;
}

// ---------- 5. a lista de compras: o plano desce pelas camadas e tira o estoque ----------

export function comprasMini(tab, quantas = 40) {
  const l = C.listaDeCompras(PIZZARIA, [{ produto: 'calabresa', quantidade: quantas }], tab);
  return { quantas, l, comprar: l.itens.filter((i) => i.comprar), fazer: l.preparo.filter((p) => p.vezes > 1e-9) };
}

export function htmlCompras(x, comprados = new Set()) {
  const preparo = x.fazer.length
    ? `<b>Antes, na cozinha:</b> ${x.fazer.map((p) => `${esc(p.nome.toLowerCase())}, ${C.mostrarQuantidade(p.fazer, p.unidade)}`).join(' · ')}`
    : x.quantas ? '<b>Antes, na cozinha:</b> o que já tem pronto dá.' : 'Ponha quantas pizzas vai fazer.';
  const itens = x.comprar.length
    ? x.comprar.map((i) => {
      const feito = comprados.has(i.id);
      return `<li class="pc-compra${feito ? ' feito' : ''}"><button type="button" class="pc-caixa" data-comprei="${esc(i.id)}" aria-pressed="${feito}" aria-label="${esc(i.nome)}: ${feito ? 'comprado' : 'marcar como comprado'}"></button>
        <span class="pc-compra-nome">${esc(i.nome)}<small>precisa ${C.mostrarQuantidade(i.precisa, i.unidade)}${i.aproveitamento < 1 ? ` (${C.mostrarQuantidade(i.precisa_limpo, i.unidade)} limpo)` : ''} · tem ${C.mostrarQuantidade(i.tem, i.unidade)}</small></span>
        <span class="pc-compra-qtd">${i.pacotes} × ${esc(i.pacote.texto)}<small>uns ${reais(i.custo_c)}</small></span></li>`;
    }).join('')
    : `<li class="pc-compra vazio">${x.quantas ? 'O estoque já cobre: nada pra comprar.' : 'Nada pra comprar.'}</li>`;
  const todos = x.comprar.length > 0 && x.comprar.every((i) => comprados.has(i.id));
  return `<p class="pc-preparo">${preparo}</p><ul class="pc-lista">${itens}</ul>
    <p class="pc-total"${todos ? ' data-tudo="1"' : ''}>${todos ? '<b>Compra feita.</b>' : 'A compra:'} <b${rola('compra-total', x.l.total_c / 100)}>uns ${reais(x.l.total_c)}</b> <span>é estimativa</span></p>`;
}

// =====================================================================================================
// O QUE VOCÊ RECEBE: quantas fichas e fotos, lido do valores.js (o mesmo que o robô entrega: testes/frases-do-direct)
// =====================================================================================================

/** As quantidades do grátis e do pacote, tiradas dos textos do valores.js ("3 fichas técnicas", "8 fichas e 8 fotos"). */
export function quantidades(p = produto('pine-cost')) {
  const achar = (lista, rx) => {
    for (const t of lista ?? []) { const m = String(t).match(rx); if (m) return Number(m[1]); }
    return null;
  };
  const total = (p?.pacote_inclui ?? []).map((t) => String(t).match(/(\d+) fichas e (\d+) fotos/)).find(Boolean);
  return {
    gratis: { fichas: achar(p?.gratis_inclui, /^(\d+) fichas/), fotos: achar(p?.gratis_inclui, /^(\d+) fotos/) },
    pacote: { fichas: total ? Number(total[1]) : null, fotos: total ? Number(total[2]) : null },
  };
}

/** Os quadradinhos que contam: o total do pacote, com os do plano escolhido cheios (e a marca nas fotos do grátis). */
export function htmlMinis(tipo, plano, q = quantidades()) {
  const total = q.pacote[tipo] ?? 0;
  const cheios = q[plano]?.[tipo] ?? 0;
  return Array.from({ length: total }, (_, i) => `<i class="pc-mini ${tipo}${i < cheios ? ' cheio' : ''}${tipo === 'fotos' && plano === 'gratis' && i < cheios ? ' com-marca' : ''}" style="--n:${i}"></i>`).join('');
}
