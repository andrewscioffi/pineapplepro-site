// AS CONTAS DOS GESTOS DO CARDÁPIO DIGITAL (v3, 07/11/2026, o Andrews: "eu quero que a interface seja altamente interativa").
// Só contas (funções puras, testadas em testes/cardapio-digital.test.mjs); quem desenha e anima é o cardapio-digital.js.
// Nenhuma conta de ficha aqui: os preços chegam prontos da calculadora (pedido.js).
//   o item que voa pro pedido  mede onde o item estava e onde fica a sacola e devolve o transform de cada quadro
//   as categorias com o dedo   qual categoria está na tela, pra onde o arrasto de lado leva, e a marca que acompanha
//   o item aberto              a folha cresce do cartão; arrastar pra baixo fecha (ou volta, se foi pouco)

export const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 10000) / 10000;

// ---------- o voo (FLIP) ----------

/** A caixa tem tamanho de verdade. */
export const vale = (c) => Boolean(c) && Number.isFinite(c.left) && Number.isFinite(c.top) && c.width > 0 && c.height > 0;

/** Quanto a cópia, já posta no lugar novo ("para"), anda e estica pra parecer que está em "de" (origem no canto de cima). */
export function deslocamento(de, para) {
  return {
    dx: r2(de.left - para.left),
    dy: r2(de.top - para.top),
    sx: para.width > 0 ? r4(de.width / para.width) : 1,
    sy: para.height > 0 ? r4(de.height / para.height) : 1,
  };
}

/** Os quadros do item que voa pra sacola: sai do item, sobe num arco e entra na sacola, sumindo um pouco no fim. */
export function quadrosDoVoo(de, para, { arco = 60 } = {}) {
  const d = deslocamento(de, para);
  return [
    { transform: `translate(${d.dx}px, ${d.dy}px) scale(${d.sx}, ${d.sy})`, opacity: 1 },
    { transform: `translate(${r2(d.dx / 2)}px, ${r2(d.dy / 2 - arco)}px) scale(${r4((d.sx + 1) / 2 * 1.08)}, ${r4((d.sy + 1) / 2 * 1.08)}) rotate(-8deg)`, opacity: 1, offset: 0.45 },
    { transform: 'scale(.6)', opacity: 0.25 },
  ];
}

// ---------- as categorias ----------

/** A categoria que está na tela: a última que já chegou no topo da lista (com uma folga). */
export function categoriaNaTela(topos, rolagem, folga = 48) {
  let i = 0;
  topos.forEach((t, k) => { if (t <= rolagem + folga) i = k; });
  return i;
}

/** Pra onde o arrasto de lado leva: o dedo pra esquerda passa pra próxima; pra direita, volta. Pouco e devagar: fica. */
export function destinoDoArrasto({ atual, dx, vx = 0, total, minimo = 56, rapido = 0.45 }) {
  const longe = Math.abs(dx) >= minimo;
  const ligeiro = Math.abs(vx) >= rapido && Math.sign(vx) === Math.sign(dx) && Math.abs(dx) >= 12;
  if (!longe && !ligeiro) return atual;
  return limitar(atual + (dx < 0 ? 1 : -1), 0, total - 1);
}

/** O quanto a lista anda junto com o dedo: um pouco; na primeira e na última, ela resiste (não tem pra onde ir). */
export function puxarDeLado(dx, { atual, total }) {
  const ponta = (dx > 0 && atual === 0) || (dx < 0 && atual === total - 1);
  if (ponta) return r2(Math.sign(dx) * 18 * (1 - Math.exp(-Math.abs(dx) / 90)));
  return r2(limitar(dx * 0.35, -60, 60));
}

/** A marca da categoria (a pílula escura) entre duas abas: t = 0 na de agora, t = 1 na outra. */
export function marcaEntre(a, b, t) {
  const k = limitar(t, 0, 1);
  return { x: r2(a.x + (b.x - a.x) * k), w: r2(a.w + (b.w - a.w) * k) };
}

/** O espaço no fim da lista pra última categoria também conseguir chegar no topo. */
export const sobraNoFim = (alturaLista, alturaUltima, minimo = 84) => Math.max(minimo, Math.round(alturaLista - alturaUltima));

// ---------- a folha do item (abre grande e fecha arrastando pra baixo) ----------

/** A folha acompanha o dedo pra baixo; pra cima, só estica um pouco. */
export function puxarFolha(dy) {
  if (dy >= 0) return r2(dy);
  return r2(-14 * (1 - Math.exp(dy / 60)));
}

/** Soltou: fecha se desceu um bom pedaço, ou se desceu rápido. */
export const fechaAoSoltar = ({ dy, vy = 0, altura }) => dy > Math.max(80, altura * 0.28) || (vy > 0.55 && dy > 24);

/**
 * O prato grande da folha começa no lugar do prato pequeno do cartão: encolhido por igual (o círculo não amassa) e com
 * um recorte quadrado no meio, que abre pros lados enquanto a folha cresce. `dy` = o quanto a folha começa deslocada.
 */
export function pratoDoCartao(pequeno, grande, dy = 0) {
  const s = grande.height > 0 ? pequeno.height / grande.height : 1;
  const lado = Math.max(0, (grande.width - grande.height) / 2); // o quadrado do meio, no tamanho de verdade
  return {
    transform: `translate(${r2(pequeno.left - grande.left - lado * s)}px, ${r2(pequeno.top - grande.top - dy)}px) scale(${r4(s)})`,
    recorte: `inset(0px ${r2(lado)}px 0px ${r2(lado)}px round ${r2(16 / (s || 1))}px)`,
  };
}

/**
 * A folha que cresce do cartão do item (o começo da animação): ela começa do tamanho e no lugar do cartão (o recorte e o
 * deslocamento) e termina inteira. `cartao` e `folha` em px da tela.
 */
export function folhaDoCartao(cartao, folha) {
  const dy = r2(cartao.top - folha.top);
  return {
    dy,
    recorte: `inset(0px ${r2(Math.max(0, folha.left + folha.width - (cartao.left + cartao.width)))}px ${r2(Math.max(0, folha.height - cartao.height))}px ${r2(Math.max(0, cartao.left - folha.left))}px round 20px)`,
  };
}
