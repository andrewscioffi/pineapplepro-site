// AS CONTAS DOS GESTOS DA POSTAGEM (v3, 07/11/2026, o Andrews: "eu quero que a interface seja altamente interativa").
// Só contas (funções puras, testadas em testes/postagem.test.mjs); quem desenha e anima é o postagem.js.
//   o voo da capa (FLIP)   mede onde a capa estava e onde ela vai ficar e devolve o transform de cada quadro
//   a capa na grade        a caixa da capa inteira em cima da célula 3:4 e o pedaço que o corte tira
//   o relógio da semana    o ponto do trilho vira o minuto; arrastar pra trás só estica (o tempo não volta)
//   a roda do 4-4-4        quanto a roda gira pra pôr o próximo tipo embaixo do ponteiro (pelo caminho mais curto)
import { FIM, MIN_DIA, corte34 } from './semana.js';

export const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 10000) / 10000;

// ---------- o voo da capa (FLIP) ----------

/** A caixa tem tamanho de verdade (não é um elemento escondido). */
export const vale = (c) => Boolean(c) && Number.isFinite(c.left) && Number.isFinite(c.top) && c.width > 0 && c.height > 0;

/** FLIP: quanto a cópia, já posta no lugar novo ("para"), anda e estica pra parecer que ainda está em "de".
 *  A origem do transform é o canto de cima à esquerda. */
export function deslocamento(de, para) {
  return {
    dx: r2(de.left - para.left),
    dy: r2(de.top - para.top),
    sx: para.width > 0 ? r4(de.width / para.width) : 1,
    sy: para.height > 0 ? r4(de.height / para.height) : 1,
  };
}

/**
 * Os quadros do voo, para o element.animate(): sai de "de", sobe num arco (o meio do caminho, um pouco maior e
 * inclinado, como quem joga a capa) e pousa em "para" (transform: none, o lugar de verdade).
 * `uniforme`: estica igual nos 2 lados (a capa inteira não deforma; o corte da grade vem depois, no clip).
 */
export function quadrosDoVoo(de, para, { arco = 40, giro = -4, uniforme = false } = {}) {
  const d = deslocamento(de, para);
  const sx = d.sx;
  const sy = uniforme ? d.sx : d.sy;
  const meio = (s) => r4(((s + 1) / 2) * 1.06);
  return [
    { transform: `translate(${d.dx}px, ${d.dy}px) scale(${sx}, ${sy})` },
    { transform: `translate(${r2(d.dx / 2)}px, ${r2(d.dy / 2 - arco)}px) scale(${meio(sx)}, ${meio(sy)}) rotate(${giro}deg)`, offset: 0.5 },
    { transform: 'none' },
  ];
}

/** A caixa com a forma de "para" (a mesma largura de "de"), no meio de "de": o voo que estica igual nos 2 lados. */
export function mesmaForma(de, para) {
  const altura = para.width > 0 ? (de.width * para.height) / para.width : de.height;
  return { left: de.left, top: r2(de.top + (de.height - altura) / 2), width: de.width, height: r2(altura) };
}

/** O deslize no mesmo lugar (a gaveta que fecha o buraco, a grade que empurra pro lado): do lugar velho ao novo. */
export function quadrosDoDeslize(de, para) {
  const d = deslocamento(de, para);
  return [{ translate: `${d.dx}px ${d.dy}px` }, { translate: '0px 0px' }];
}

/** Mudou de lugar na tela (mais de meio pixel)? */
export const mudouDeLugar = (a, b) => Math.abs(a.left - b.left) > 0.5 || Math.abs(a.top - b.top) > 0.5;

/** A caixa que começa muito longe (fora da tela) entra pela borda mais perto: o voo não atravessa a página inteira. */
export function entrarPelaBorda(c, alturaJanela, folga = 24) {
  const top = limitar(c.top, -c.height - folga, alturaJanela + folga);
  return { left: c.left, top, width: c.width, height: c.height };
}

/** A caixa aparece na tela (pelo menos um pedaço)? */
export const naTela = (c, alturaJanela, larguraJanela) => vale(c) && c.top + c.height > 0 && c.left + c.width > 0 && c.top < alturaJanela && c.left < larguraJanela;

/**
 * Quanto rolar a grade do celular pra célula onde a capa vai pousar aparecer (só o pedaço do celular que está na tela).
 * 0: ela já aparece. null: o celular quase não aparece na tela (não adianta rolar; a capa só acende no lugar).
 */
export function rolagemPraMostrar(cel, rolo, alturaJanela, folga = 4) {
  const topo = Math.max(rolo.top, 0);
  const fim = Math.min(rolo.top + rolo.height, alturaJanela);
  if (fim - topo < cel.height * 0.6) return null;
  if (cel.top >= topo - 1 && cel.top + cel.height <= fim + 1) return 0;
  return Math.round(cel.top - topo - folga);
}

/** A caixa presa dentro de outra (a capa que ficou fora da fila rolada sai da borda da fila). */
export function prenderNaCaixa(c, caixa) {
  const left = limitar(c.left, caixa.left - c.width / 2, caixa.left + caixa.width - c.width / 2);
  const top = limitar(c.top, caixa.top - c.height / 2, caixa.top + caixa.height - c.height / 2);
  return { left, top, width: c.width, height: c.height };
}

// ---------- a capa inteira em cima da célula da grade (o corte 3:4) ----------

/**
 * A capa inteira "cobrindo" a célula 3:4 (como o object-fit: cover): o tamanho, onde ela fica em relação à célula
 * e o corte (de 0 a 1, de cada lado) que deixa só o pedaço que a grade mostra. A capa 9:16 sobra em cima e embaixo;
 * a 4:5 sobra dos lados.
 */
export function caixaDaCapa(celula, largura, altura) {
  const k = altura / largura;
  const alta = k > celula.height / celula.width;
  const w = alta ? celula.width : celula.height / k;
  const h = alta ? celula.width * k : celula.height;
  return {
    largura: r2(w),
    altura: r2(h),
    esquerda: r2((celula.width - w) / 2),
    topo: r2((celula.height - h) / 2),
    corte: corte34(largura, altura),
  };
}

/** O clip-path do corte (o que a grade mostra), em %. */
export const clipDoCorte = (c) => `inset(${r2(c.cima * 100)}% ${r2(c.direita * 100)}% ${r2(c.baixo * 100)}% ${r2(c.esquerda * 100)}%)`;

// ---------- o relógio da semana ----------

/** O minuto da semana no ponto x do trilho (de 10 em 10 minutos, entre o começo e o fim da semana). */
export function minutoNoTrilho(x, caixa, passo = 10) {
  if (!(caixa?.width > 0)) return 0;
  const t = limitar((x - caixa.left) / caixa.width, 0, 1);
  return limitar(Math.round((t * FIM) / passo) * passo, 0, FIM);
}

/** Quantos minutos anda o relógio que a pessoa arrasta de lado: a largura do trilho inteira é a semana inteira. */
export const minutosDoArrasto = (dx, larguraDoTrilho) => (larguraDoTrilho > 0 ? (dx / larguraDoTrilho) * FIM : 0);

/**
 * Arrastar pra trás: o relógio não volta. A agulha só estica um pouco (cada vez mais duro) e volta quando solta.
 * `atras` = quantos px a pessoa puxou pra trás; devolve o deslocamento da agulha (negativo, no máximo `max`).
 */
export function resistencia(atras, max = 22) {
  if (!(atras > 0)) return 0;
  return r2(-max * (1 - Math.exp(-atras / 70)));
}

/** As teclas do relógio: pra frente anda; pra trás não volta. */
export function teclaDoRelogio(tecla, agora) {
  const frente = { ArrowRight: 30, ArrowUp: 30, PageUp: MIN_DIA }[tecla];
  if (frente) return { alvo: Math.min(FIM, agora + frente) };
  if (tecla === 'End') return { alvo: FIM };
  if (['ArrowLeft', 'ArrowDown', 'PageDown', 'Home'].includes(tecla)) return { volta: true };
  return null;
}

// ---------- a roda do 4-4-4 ----------

/**
 * O giro da roda (graus) pra pôr o tipo `indice` (0 a 3) embaixo do ponteiro, partindo do giro de antes pelo
 * caminho mais curto: pondo post na fila, ela gira pra frente (de 90 em 90); tirando, volta.
 */
export function giroDaRoda(anterior, indice) {
  const alvo = (((indice % 4) + 4) % 4) * 90;
  let delta = ((((alvo - anterior) % 360) + 540) % 360) - 180;
  if (delta === -180) delta = 180; // no empate, pra frente
  return anterior + delta;
}
