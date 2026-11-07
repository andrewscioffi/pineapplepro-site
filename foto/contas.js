// AS CONTAS DA PÁGINA DA FOTO (v3, 07/11/2026). Só conta e texto, nada de tela: o teste confere tudo no Node.
//   o antes e depois de verdade: os 4 exemplos reais (img/exemplo-real/), o texto de cada lado e o deslizar
//   as guias (o texto vem do pedido que o robô faz à IA: setores/cardapio/bot/src/fotos.ts, só lido)
//   o estudo de luz: a janela que a pessoa arrasta e o que ela faz na esfera, no brilho e na sombra
//   a medida da luz da foto da pessoa (feita no aparelho dela: é só uma medida, não é a IA)
//   os lugares onde a foto aparece (o robô entrega a foto quadrada, 1080 × 1080) e o corte da grade do Instagram (3:4)
//   a divisória entre a amostra grátis (com a marca no canto) e o pacote (sem a marca)
// Nada aqui finge a IA: nenhuma conta mexe na foto da pessoa. A revitalizada sai no Direct.

const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
const n3 = (x) => Math.round(x * 1000) / 1000;
const d1 = (x) => Math.round(x * 10) / 10;

/* ------------------------------------------- o antes e depois de verdade ------------------------------------------- */

/**
 * Os 4 exemplos reais (07/11, o Andrews: "eu acho que a gente podia pôr exemplo real nosso"). As fotos são de um negócio
 * que era dele e ele pediu conteúdo genérico: nenhum nome do lugar nem de quem é a comida (img/exemplo-real/ORIGEM.md).
 * O antes é a foto do celular (4:3); o depois, a foto revitalizada, quadrada. As medidas são as dos arquivos (o teste
 * confere): com elas no HTML, a página não pula enquanto a foto carrega. Os 2 lanches primeiro (as marmitas por último).
 */
export const EXEMPLOS_REAIS = [
  { id: 'lanche-queijo', nome: 'Lanche de queijo', um: 'um lanche de queijo', mesmo: 'o mesmo lanche', antes: [960, 718], depois: [800, 800] },
  { id: 'lanche-duplo', nome: 'Lanche duplo', um: 'um lanche duplo', mesmo: 'o mesmo lanche', antes: [960, 710], depois: [800, 800] },
  { id: 'marmita-frango', nome: 'Marmita de frango', um: 'uma marmita de frango', mesmo: 'a mesma marmita', antes: [960, 710], depois: [800, 800] },
  { id: 'marmita-carne', nome: 'Marmita de carne', um: 'uma marmita de carne', mesmo: 'a mesma marmita', antes: [960, 713], depois: [800, 800] },
];
export const PASTA_DOS_EXEMPLOS = 'img/exemplo-real/';
/** O caminho da foto (a partir da pasta foto/): qual é 'antes' ou 'depois'. */
export const fotoDoExemplo = (id, qual) => `${PASTA_DOS_EXEMPLOS}${id}-${qual}.jpg`;
/** O texto alternativo de cada foto (só o que se vê: nada do lugar nem de quem é). */
export function altDoExemplo(ex, qual) {
  return qual === 'antes' ? `Exemplo real, antes: ${ex.um}, na foto do celular` : `Exemplo real, depois: ${ex.mesmo}, na foto revitalizada`;
}
/** O que aparece em cada lado: o selo por cima da foto, o botão e o texto embaixo. */
export const ANTES_DEPOIS = {
  antes: { selo: 'Antes · foto do celular', diz: 'Antes: a foto do celular, do jeito que foi tirada.' },
  depois: { selo: 'Depois · foto revitalizada', diz: 'Depois: a foto revitalizada. A mesma comida, com a luz, o fundo e o enquadramento de cardápio.' },
};
/** O exemplo do lado (passo +1 ou −1), dando a volta: depois do último vem o primeiro. */
export function exemploAoLado(id, passo) {
  const n = EXEMPLOS_REAIS.length;
  const i = Math.max(0, EXEMPLOS_REAIS.findIndex((e) => e.id === id));
  return EXEMPLOS_REAIS[(((i + Math.sign(passo || 0)) % n) + n) % n].id;
}
/** O fim do deslizar: −1 (o anterior), +1 (o próximo) ou 0 (fica). Pra esquerda vem o próximo, como no celular. */
export function decidirArrasto(dx, vx = 0) {
  if (dx < -46 || vx < -0.45) return 1;
  if (dx > 46 || vx > 0.45) return -1;
  return 0;
}
/** Quanto a foto anda com o dedo (px): acompanha, com resistência, até 56 px. */
export const puxaoDoArrasto = (dx) => d1(Math.sign(dx) * Math.min(56, Math.abs(dx) * 0.35));

/* ------------------------------------------- as guias ------------------------------------------- */

/** O que cada guia diz (o texto vem do pedido que o robô faz à IA: setores/cardapio/bot/src/fotos.ts). */
export const GUIAS = {
  luz: 'Luz: suave, como de janela, vindo da esquerda, com sombra leve. É o que o robô pede pra IA.',
  fundo: 'Fundo: limpo e um pouco desfocado, numa bancada escura. Sai a sujeira, a migalha e o que sobra em volta.',
  angulo: 'Ângulo: a IA revitaliza a foto que você tirou, então o ângulo é o seu. De frente ou um pouco de cima (uns 45°) mostra bem o recheio.',
  prato: 'Prato cheio: o produto inteiro, no meio do quadro. A porção continua do tamanho de verdade.',
};
export const ORDEM_DAS_GUIAS = ['luz', 'fundo', 'angulo', 'prato'];
export const GUIA_NENHUMA = 'Ligue uma guia pra ver o que a gente olha na foto.';
export const GUIA_TODAS = 'Tudo junto: a luz da esquerda, o fundo limpo, o ângulo e o produto inteiro no meio. É o que a gente olha em toda foto.';

/* ------------------------------------------- o estudo de luz ------------------------------------------- */

// a esfera do desenho (o mesmo de img/estudo-de-luz.svg, num quadro de 1000 × 1000) e onde ela encosta no prato
export const ESFERA = { x: 488, y: 496, r: 182 };
const BASE = { x: 488, y: 678 };
// as cores da esfera com a luz de lado (o volume) e de frente (chapada, como no flash)
const CORES_DE_LADO = ['#fffdf7', '#efe7d8', '#b6a893', '#574a3c', '#372d24'];
const CORES_DE_FRENTE = ['#fffaf0', '#f4ede0', '#ded4c2', '#b9ac96', '#8f826e'];
export const PARADAS_DA_ESFERA = [0, 0.22, 0.55, 0.82, 1];

/** A cor no meio do caminho entre duas (t de 0 a 1), em "#rrggbb". */
export function misturar(a, b, t) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  const k = limitar(t, 0, 1);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

/** O que cada luz diz. A da esquerda é a que o robô pede (o texto da guia da luz). */
export const LUZES = {
  esquerda: GUIAS.luz,
  direita: 'Da direita, a luz até dá volume. Mas o robô pede da esquerda: assim todas as suas fotos saem com a luz do mesmo lado.',
  cima: 'De cima, como a lâmpada da cozinha: a sombra fica curta, embaixo do produto, e ele perde o volume.',
  baixo: 'De baixo, a sombra vai pra trás do produto e a luz fica com cara estranha.',
  frente: 'De frente, como o flash do celular: a luz bate chapada e o produto perde o volume.',
};
export const NOME_DA_LUZ = { esquerda: 'Luz da esquerda', direita: 'Luz da direita', cima: 'Luz de cima', baixo: 'Luz de baixo', frente: 'Luz de frente' };
export const LUZ_CERTA = 'É assim que a gente pede';
export const LUZ_DICA = 'Arraste a janela em volta da esfera: a luz, o brilho e a sombra vão junto.';

/** A janela não sai do quadro: de 7% a 93% (de 0 a 1). */
export const BORDA_DA_JANELA = 0.07;
/** Onde a janela começa (a luz da direita) e onde a apresentação deixa (a da esquerda, a que o robô pede). */
export const JANELA = { inicio: { x: 0.85, y: 0.35 }, certa: { x: 0.115, y: 0.382 } };

/** A apresentação: a janela dá a volta por cima da esfera, da direita até a esquerda (k de 0 a 1). */
export function caminhoDaIntro(k) {
  const g = ((22 + 141 * limitar(k, 0, 1)) * Math.PI) / 180;
  return { x: n3((ESFERA.x + 390 * Math.cos(g)) / 1000), y: n3((ESFERA.y - 390 * Math.sin(g)) / 1000) };
}

/** Um passo da seta do teclado: 3% (com o Shift, 10%), sem sair do quadro. */
export function passoDaSeta(pos, tecla, grande = false) {
  const p = grande ? 0.1 : 0.03;
  const mexe = { ArrowLeft: [-p, 0], ArrowRight: [p, 0], ArrowUp: [0, -p], ArrowDown: [0, p] }[tecla];
  if (!mexe) return null;
  return { x: n3(limitar(pos.x + mexe[0], BORDA_DA_JANELA, 1 - BORDA_DA_JANELA)), y: n3(limitar(pos.y + mexe[1], BORDA_DA_JANELA, 1 - BORDA_DA_JANELA)) };
}

/**
 * A janela em (x, y), de 0 a 1 no quadro, e o que ela faz no desenho (tudo em unidades do quadro de 1000 × 1000):
 *   zona: de onde vem a luz ('esquerda', 'direita', 'cima', 'baixo' ou 'frente', quando a janela fica em cima da esfera)
 *   certa: a luz que o robô pede (da esquerda, de lado)
 *   esfera: o degradê (o centro, o foco do brilho e as cores), brilho, sombra, rebate, janela (o clarão na mesa),
 *   facho (o raio de luz até a esfera) e aro (o lado do prato que acende)
 */
export function luzDaJanela(x, y) {
  const X = limitar(Number(x) || 0, 0, 1) * 1000;
  const Y = limitar(Number(y) || 0, 0, 1) * 1000;
  const dx = X - ESFERA.x;
  const dy = Y - ESFERA.y;
  const dist = Math.hypot(dx, dy);
  const ux = dist > 0.5 ? dx / dist : -1;
  const uy = dist > 0.5 ? dy / dist : 0;
  const R = ESFERA.r;
  // de frente: a janela em cima da esfera (como o flash do celular); de lado: longe dela
  const frente = limitar(1 - (dist - R * 0.4) / (R * 1.6), 0, 1);
  const lado = 1 - frente;
  // de onde vem a luz: 0 = da direita, 90 = de cima, 180 = da esquerda, 270 = de baixo
  const angulo = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360;
  const zona = frente >= 0.5 ? 'frente'
    : angulo >= 130 && angulo < 225 ? 'esquerda'
      : angulo >= 50 && angulo < 130 ? 'cima'
        : angulo >= 225 && angulo < 315 ? 'baixo' : 'direita';
  // a sombra cai do lado contrário, no prato (achatada pela perspectiva), mais comprida quanto mais de lado
  const comprimento = 40 + 150 * lado;
  const sx = -ux * comprimento;
  const sy = -uy * comprimento * 0.42;
  // o raio de luz: da janela (meia largura de 70) até a esfera
  const [nx, ny] = [-uy, ux];
  const pontos = [[X + nx * 70, Y + ny * 70], [X - nx * 70, Y - ny * 70], [ESFERA.x - nx * R, ESFERA.y - ny * R], [ESFERA.x + nx * R, ESFERA.y + ny * R]];
  return {
    x: n3(X / 1000), y: n3(Y / 1000), angulo: Math.round(angulo) % 360, frente: n3(frente), zona, certa: zona === 'esquerda',
    esfera: {
      cx: d1(ESFERA.x + ux * R * 0.22 * lado), cy: d1(ESFERA.y + uy * R * 0.22 * lado),
      fx: d1(ESFERA.x + ux * R * 0.56 * lado), fy: d1(ESFERA.y + uy * R * 0.56 * lado),
      r: d1(R * (1.02 + 0.22 * lado)),
      cores: CORES_DE_LADO.map((c, i) => misturar(c, CORES_DE_FRENTE[i], frente)),
    },
    brilho: { cx: d1(ESFERA.x + ux * R * 0.5 * lado), cy: d1(ESFERA.y + uy * R * 0.5 * lado), rx: d1(24 + 44 * lado), ry: d1(20 + 34 * lado), opacidade: n3(0.95 - 0.4 * lado) },
    sombra: { cx: d1(BASE.x + sx * 0.5 + 6), cy: d1(BASE.y + sy * 0.5 - 2), rx: d1(150 + Math.abs(sx) * 0.35), ry: d1(44 + Math.abs(sy) * 0.45), opacidade: n3(0.3 + 0.55 * lado) },
    rebate: { cx: d1(ESFERA.x - ux * R * 0.62), cy: d1(ESFERA.y - uy * R * 0.62 + R * 0.22), opacidade: n3(0.4 * lado) },
    janela: { cx: d1(X), cy: d1(Y), r: d1(560 + 260 * lado), opacidade: n3(0.22 + 0.24 * lado) },
    facho: { pontos: pontos.map(([a, b]) => `${d1(a)},${d1(b)}`).join(' '), x1: d1(X), y1: d1(Y), x2: ESFERA.x, y2: ESFERA.y, opacidade: n3(0.85 * lado) },
    aro: { x1: n3(0.5 + ux * 0.5), y1: n3(0.5 + uy * 0.5), x2: n3(0.5 - ux * 0.5), y2: n3(0.5 - uy * 0.5) },
  };
}

/** O que aparece no selo do quadro com a janela nessa luz. */
export const seloDaLuz = (luz) => (luz?.certa ? LUZ_CERTA : NOME_DA_LUZ[luz?.zona] ?? '');

/* ------------------------------------------- a medida da foto da pessoa ------------------------------------------- */

/** O quadrado do meio da foto (como o robô corta: scale=1080:1080 + crop no meio): de onde sai e o lado. */
export function corteNoMeio(largura, altura) {
  const lado = Math.max(0, Math.min(largura, altura));
  return { sx: Math.round((largura - lado) / 2), sy: Math.round((altura - lado) / 2), lado };
}

const r2 = (x) => Math.round(x * 100) / 100;

/**
 * A medida da luz de uma imagem (os pontos RGBA, como o getImageData devolve).
 * brilho: de 0 a 1 (a média da luminância). lado: o lado mais claro ('esquerda', 'direita', 'cima', 'baixo' ou
 * 'igual' quando a diferença é pequena). É uma medida simples, feita no aparelho: não é a IA.
 */
export function medirLuz(dados, largura, altura) {
  let soma = 0, esq = 0, dir = 0, cima = 0, baixo = 0, n = 0, nEsq = 0, nDir = 0, nCima = 0, nBaixo = 0;
  const meioX = largura / 2, meioY = altura / 2;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 4;
      const l = (0.2126 * dados[i] + 0.7152 * dados[i + 1] + 0.0722 * dados[i + 2]) / 255;
      soma += l; n++;
      if (x + 0.5 < meioX) { esq += l; nEsq++; } else if (x + 0.5 > meioX) { dir += l; nDir++; }
      if (y + 0.5 < meioY) { cima += l; nCima++; } else if (y + 0.5 > meioY) { baixo += l; nBaixo++; }
    }
  }
  if (!n) return { brilho: 0, lado: 'igual', dx: 0, dy: 0 };
  const media = (s, q) => (q ? s / q : 0);
  const dx = media(esq, nEsq) - media(dir, nDir);
  const dy = media(cima, nCima) - media(baixo, nBaixo);
  const forte = Math.max(Math.abs(dx), Math.abs(dy));
  let lado = 'igual';
  if (forte >= 0.04) lado = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'esquerda' : 'direita') : (dy > 0 ? 'cima' : 'baixo');
  return { brilho: r2(soma / n), lado, dx: r2(dx), dy: r2(dy) };
}

const LADO = { esquerda: 'o da esquerda', direita: 'o da direita', cima: 'o de cima', baixo: 'o de baixo' };

/** O texto da guia da luz com a medida da foto da pessoa (ou o texto de sempre, sem foto). */
export function textoDaLuz(medida) {
  if (!medida) return GUIAS.luz;
  const pct = Math.round(medida.brilho * 100);
  const partes = [LADO[medida.lado]
    ? `Na sua foto: brilho de ${pct}%, e o lado mais claro é ${LADO[medida.lado]}.`
    : `Na sua foto: brilho de ${pct}%, com a luz por igual.`];
  if (medida.brilho < 0.3) partes.push('Ela está escura: no cartão pequeno, foto escura some.');
  else if (medida.brilho > 0.78) partes.push('Ela está bem clara: a parte estourada perde o detalhe.');
  partes.push('No cardápio, a luz vem da esquerda, suave, como de janela.');
  return partes.join(' ');
}

/** O texto de uma guia (a da luz usa a medida, se tiver; "todas" é o resumo das 4). */
export function textoDaGuia(guia, medida = null) {
  if (guia === 'luz') return textoDaLuz(medida);
  if (guia === 'todas') return GUIA_TODAS;
  return GUIAS[guia] ?? GUIA_NENHUMA;
}

/** O que aparece no selo amarelo da medida, por cima da foto. */
export function seloDaMedida(medida) {
  if (!medida) return '';
  const pct = Math.round(medida.brilho * 100);
  return medida.lado === 'igual' ? `Brilho ${pct}% · luz por igual` : `Brilho ${pct}% · mais claro aqui`;
}

const DE_ONDE = { esquerda: 'da esquerda', direita: 'da direita', cima: 'de cima', baixo: 'de baixo', igual: 'por igual' };

/**
 * Os números do painel da medida (os mesmos limites do texto da luz): o brilho de 0 a 100, a faixa (escura, boa ou
 * bem clara), de onde vem a luz, a diferença entre os lados (em pontos de brilho, de 0 a 100) e o ângulo da bússola
 * (em graus, 0 = a luz vem da direita, girando no sentido do relógio na tela).
 */
export function numerosDaMedida(medida) {
  if (!medida) return null;
  const brilho = Math.round(limitar(medida.brilho, 0, 1) * 100);
  const faixa = medida.brilho < 0.3 ? 'escura' : medida.brilho > 0.78 ? 'bem clara' : 'boa';
  const diferenca = Math.round(Math.max(Math.abs(medida.dx ?? 0), Math.abs(medida.dy ?? 0)) * 100);
  // a bússola aponta para o lado mais claro: a esquerda mais clara (dx > 0) fica à esquerda; o alto (dy > 0), em cima
  const angulo = medida.lado === 'igual' ? null : Math.round(((Math.atan2(-(medida.dy ?? 0), -(medida.dx ?? 0)) * 180) / Math.PI + 360) % 360);
  return { brilho, faixa, de: DE_ONDE[medida.lado] ?? DE_ONDE.igual, diferenca, angulo };
}

/* ------------------------------------------- os lugares onde a foto aparece ------------------------------------------- */

/** A foto que o robô entrega: quadrada (fotos.ts: scale=1080:1080 + crop). */
export const FOTO_DO_ROBO = { largura: 1080, altura: 1080 };

/** Os 5 lugares, na ordem do passeio: o app de delivery (lista, cartão e aberta) e o Instagram (feed e grade). */
export const ORDEM_DAS_VISTAS = ['lista', 'cartao', 'aberta', 'feed', 'grade'];
/** A tela do celular de cada lugar (a loja do app tem a lista e o cartão). */
export const PAGINA_DA_VISTA = { lista: 'loja', cartao: 'loja', aberta: 'produto', feed: 'feed', grade: 'grade' };
export const ORDEM_DAS_PAGINAS = ['loja', 'produto', 'feed', 'grade'];
/** A forma da moldura em cada lugar (largura ÷ altura): tudo quadrado, menos a grade do perfil, que corta em 3:4. */
export const FORMATO_DA_VISTA = { lista: 1, cartao: 1, aberta: 1, feed: 1, grade: 3 / 4 };

/**
 * O que a moldura (largura ÷ altura) pega da foto quadrada do robô: a fração que aparece e quantos pixels dos 1080
 * ficam de fora em cada lado. Quadrada: aparece inteira.
 */
export function corteNaMoldura(formato, foto = FOTO_DO_ROBO) {
  const f = formato > 0 ? formato : 1;
  const aparece = f < 1 ? { x: f, y: 1 } : { x: 1, y: 1 / f };
  return {
    aparece: { x: n3(aparece.x), y: n3(aparece.y) },
    foraCadaLado: { x: Math.round((foto.largura * (1 - aparece.x)) / 2), y: Math.round((foto.altura * (1 - aparece.y)) / 2) },
    inteira: aparece.x >= 1 && aparece.y >= 1,
  };
}

const G = corteNaMoldura(FORMATO_DA_VISTA.grade);
/** O que cada lugar diz (a grade com a conta do corte de verdade). */
export const VISTAS = {
  lista: 'Na lista, a foto divide a tela com o nome e o preço. Pequena assim, a luz e o fundo limpo fazem a diferença.',
  cartao: 'Nos mais pedidos, ela aparece num cartão pequeno e quadrado, do lado dos outros produtos.',
  aberta: 'Quando o cliente toca, ela abre grande, no topo da tela. É aqui que o detalhe aparece.',
  feed: 'No feed do Instagram, a foto quadrada aparece inteira, da largura da tela.',
  grade: `Na grade do perfil, o Instagram corta em 3:4: saem ${G.foraCadaLado.x} pixels de cada lado dos ${FOTO_DO_ROBO.largura}. Arraste a foto pra ver o que fica de fora.`,
};
export const NOME_DA_VISTA = { lista: 'Na lista', cartao: 'No cartão', aberta: 'Aberta', feed: 'No feed', grade: 'Na grade' };

/** O lugar do lado (passo +1 ou −1). Com `volta`, depois do último vem o primeiro (o passeio); sem, para na ponta (o dedo). */
export function vistaAoLado(atual, passo, { volta = false } = {}) {
  const i = Math.max(0, ORDEM_DAS_VISTAS.indexOf(atual));
  const n = ORDEM_DAS_VISTAS.length;
  const j = volta ? (((i + passo) % n) + n) % n : limitar(i + passo, 0, n - 1);
  return ORDEM_DAS_VISTAS[j];
}

/**
 * Quanto a foto anda dentro da moldura (px) com o dedo andando `dx`: dentro da folga (o que o corte deixou de fora,
 * de cada lado), anda junto; além dela, estica com resistência (no máximo 28 px), como quem diz "acabou a foto".
 */
export function arrastoNaMoldura(dx, largura, altura) {
  const lado = Math.max(largura, altura);
  const folga = Math.max(0, (lado - largura) / 2);
  const a = Math.abs(dx);
  if (a <= folga) return d1(dx);
  return d1(Math.sign(dx) * (folga + Math.min(28, (a - folga) * 0.25)));
}

/* ------------------------------------------- a divisória da marca ------------------------------------------- */

/** Onde fica a linha (0 a 100) com o dedo no x da tela, na caixa { left, width }. */
export function posicaoDaDivisoria(x, caixa) {
  if (!caixa || !(caixa.width > 0)) return 50;
  return d1(limitar(((x - caixa.left) / caixa.width) * 100, 0, 100));
}

/** Um passo da seta na divisória: 2 (com o Shift, 10); Home e End vão pras pontas. */
export function passoDaDivisoria(d, tecla, grande = false) {
  const p = grande ? 10 : 2;
  const novo = { ArrowLeft: d - p, ArrowDown: d - p, ArrowRight: d + p, ArrowUp: d + p, Home: 0, End: 100, PageDown: d - 10, PageUp: d + 10 }[tecla];
  return novo === undefined ? null : d1(limitar(novo, 0, 100));
}

/** O que a divisória diz: a linha numa ponta mostra só um lado (o pacote fica à esquerda, a amostra à direita). */
export function textoDaDivisoria(d) {
  if (d >= 88) return 'Sem a marca: é assim que sai no pacote.';
  if (d <= 12) return 'Com a marca no canto: é assim que sai a amostra grátis.';
  return 'A mesma foto dos dois lados: à esquerda, no pacote; à direita, a amostra grátis.';
}

/** O quanto aparece o nome de cada lado (some quando o lado dele fica estreito). */
export function forcaDoRotulo(d, lado) {
  const largura = lado === 'esquerda' ? d : 100 - d;
  return n3(limitar((largura - 14) / 22, 0, 1));
}
