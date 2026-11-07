// AS CONTAS DA MESA DE EDIÇÃO (v3, 07/11/2026). Só conta e texto, nada de tela: o teste confere tudo no Node.
//   o plano do robô (cópia fiel de setores/cardapio/bot/src/videos.ts, só lido; o teste compara): 3 cortes, as trocas de
//   0,35 s, o nome no 1º corte, a frase no último, o selo e o final com a logo (no grátis)
//   o que aparece na tela em cada instante (a edição inteira, um corte sozinho em loop e as trocas 4x mais devagar)
//   os sons (o "whoosh" nas trocas e a batida no final) e o que a agulha cruza quando a pessoa arrasta
// Nada aqui finge a IA: é uma prévia do jeito da edição. O vídeo de verdade sai no Direct.

/* --------------------- o plano do robô (cópia fiel de videos.ts; o teste compara) --------------------- */

export const TRANSICAO = 0.35;
export const FIM_SEGUNDOS = 2.2;
export const FIM_TRANSICAO = 0.4;

const n2 = (x) => Math.round(x * 100) / 100;
const entre = (x, a, b) => Math.min(Math.max(x, a), Math.max(a, b));

/** O plano da edição, pelos 3 momentos escolhidos (em segundos). Igual ao planejar() do robô. */
export function planejar(segundos, momentos) {
  if (segundos < 4.5) {
    const dura = n2(Math.min(segundos, 6));
    return { cortes: [{ de: 0, dura, velocidade: 1, saida: dura, zoom: 'chegando' }], transicoes: [], offsets: [], clipe: dura };
  }
  const corte = (centro, antes, dura, velocidade, zoom) => {
    const d = Math.min(dura, segundos);
    return { de: n2(entre(centro - antes, 0, segundos - d)), dura: n2(d), velocidade, saida: n2(d / velocidade), zoom };
  };
  const cortes = [
    corte(momentos.destaque, 0.8, 3.2, 1, 'chegando'),
    corte(momentos.acao, 2.0, 3.96, 1.8, 'soco'),
    corte(momentos.detalhe, 0.9, 1.82, 0.7, 'lento'),
  ];
  const transicoes = ['hblur', 'slideup'];
  const offsets = [];
  let fim = cortes[0].saida;
  for (const c of cortes.slice(1)) { offsets.push(n2(fim - TRANSICAO)); fim = n2(fim - TRANSICAO + c.saida); }
  return { cortes, transicoes, offsets, clipe: fim };
}

/** Os momentos sem a IA: 30%, 60% e 85% do vídeo. */
export const momentosPadrao = (segundos) => ({ destaque: segundos * 0.3, acao: segundos * 0.6, detalhe: segundos * 0.85 });

/** O nome do produto que vai no vídeo: só letra, número e espaço, sem preço, até 26 letras (corta na palavra). */
export function nomeDoVideo(s) {
  const limpo = String(s ?? '').replace(/R\$\s*[\d.,]+/g, '').replace(/[^\p{L}\p{N} '&-]/gu, '').replace(/\s+/g, ' ').trim();
  if (limpo.length <= 26) return limpo;
  return limpo.slice(0, 27).replace(/\s+\S*$/, '').trim();
}

/** As frases do fim (a IA do robô só escolhe o estilo; quem escreve é o código). */
export const FRASES_DO_VIDEO = {
  brasa: 'Direto da brasa 🔥',
  chapa: 'Saindo da chapa 🔥',
  fritura: 'Sequinho e crocante',
  forno: 'Saindo do forno',
  doce: 'Feito pra adoçar o dia',
  bebida: 'Geladinho',
  montagem: 'Montado na hora',
  geral: 'Feito na hora',
};

/* --------------------- a prévia: o que aparece na tela em cada instante (puro) --------------------- */

/** O vídeo de exemplo (o desenho) faz de conta que tem 18 segundos. */
export const DEMO_SEGUNDOS = 18;
/** O nome que aparece enquanto a pessoa não escreve o dela. */
export const NOME_PADRAO = 'Seu produto';
/** A ordem das frases na lista (a de sempre primeiro, como no robô sem a IA). */
export const ESTILOS = ['geral', 'brasa', 'chapa', 'fritura', 'forno', 'doce', 'bebida', 'montagem'];
/** O nome de cada corte na linha do tempo. */
export const ROTULOS = {
  chegando: { nome: 'Destaque', faz: 'chega perto' },
  soco: { nome: 'Ação', faz: '1,8x e soco' },
  lento: { nome: 'Detalhe', faz: 'câmera lenta' },
};
/** Os 3 momentos que a IA escolhe (no robô) e a pessoa arrasta (aqui), na ordem dos cortes. */
export const MOMENTOS = [
  { chave: 'destaque', nome: 'o destaque' },
  { chave: 'acao', nome: 'a ação' },
  { chave: 'detalhe', nome: 'o detalhe' },
];

const cl = (x) => Math.min(1, Math.max(0, x));
const n3 = (x) => Math.round(x * 1000) / 1000;
const suave = (a, b, x) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };

/** Onde a frase entra (igual ao robô): no último corte; num corte só, só se não tiver o nome. -1 = não entra. */
export const ondeFrase = (k, temTitulo) => (k > 1 ? k - 1 : temTitulo ? -1 : 0);

/** O zoom de um corte no segundo `tl` dele (as mesmas contas do zoompan do robô, a 30 quadros por segundo). */
export function zoomDe(corte, tl) {
  const t = Math.max(0, tl);
  if (corte.zoom === 'soco') return t < 0.3 ? 1.14 - 0.14 * (t / 0.3) : 1;
  const p = corte.saida > 0 ? cl(t / corte.saida) : 0;
  return corte.zoom === 'lento' ? 1.04 + 0.10 * p : 1 + 0.10 * p;
}

/** O zoom do final com a logo (de 1,10 a 1 em 0,6 s, como no robô). */
export const zoomDoFim = (tf) => Math.max(1, 1.10 - 0.10 * Math.max(0, tf) / 0.6);

/** A linha do tempo da edição: onde cada corte começa e acaba, as trocas, o final e o total. */
export function linhaDoTempo(plano, { comMarca = true } = {}) {
  const inicios = [0, ...plano.offsets];
  const cortes = plano.cortes.map((c, i) => ({ ...c, inicio: inicios[i], fim: n2(inicios[i] + c.saida) }));
  const trocas = plano.offsets.map((de, j) => ({ de, ate: n2(de + TRANSICAO), tipo: plano.transicoes[j], sai: j, entra: j + 1 }));
  return {
    cortes, trocas, comMarca, clipe: plano.clipe,
    fimDe: comMarca ? n2(plano.clipe - FIM_TRANSICAO) : null,
    total: comMarca ? n2(plano.clipe - FIM_TRANSICAO + FIM_SEGUNDOS) : plano.clipe,
  };
}

/**
 * O flash branco antes do final. `pf` é o progresso do jeito do ffmpeg: 1 no começo da troca, 0 no fim.
 * Devolve quanto aparece do final (`fim`) e do branco por cima do vídeo (`branco`), de 0 a 1.
 */
export function fadeBranco(pf) {
  const s1 = suave(0.8, 1, pf);
  const s2 = suave(0.2, 1, pf);
  const video = s1 * pf;
  const fim = (1 - s2) * (1 - pf);
  // o branco fica atrás do final: quando o final já cobre tudo, ele some (e a conta não divide por quase zero)
  const branco = fim < 0.999 ? Math.min(1, Math.max(0, 1 - video - fim) / (1 - fim)) : 0;
  return { fim: n3(fim), branco: n3(branco) };
}

// o texto entra subindo (0,25 s, por 0,45 s) e some antes do corte (0,3 s), como no robô
function texto(i, tl, saida) {
  const entra = cl((tl - 0.25) / 0.45);
  const sai = cl((tl - Math.max(0.8, saida - 0.5)) / 0.3);
  return { corte: i, opacidade: n3(entra * (1 - sai)), sobe: n3(1 - entra) };
}

/** Tudo o que aparece na tela no segundo `t` da edição. Função pura: o teste confere sem navegador. */
export function quadroEm(linha, t, { titulo = false, frase = false } = {}) {
  const k = linha.cortes.length;
  const cortes = linha.cortes.map((c) => {
    const tl = t - c.inicio;
    const local = Math.min(Math.max(tl, 0), c.saida);
    return {
      visivel: tl >= 0 && tl < c.saida && t < linha.clipe,
      tl: n3(local), fonte: n3(c.de + local * c.velocidade), zoom: n3(zoomDe(c, local)),
      opacidade: 1, borrao: 0, desloca: 0, volume: 1,
    };
  });
  for (const tr of linha.trocas) {
    if (t < tr.de || t >= tr.ate) continue;
    const p = cl((t - tr.de) / TRANSICAO);
    const a = cortes[tr.sai];
    const b = cortes[tr.entra];
    if (tr.tipo === 'hblur') { const forca = n3(p <= 0.5 ? p * 2 : (1 - p) * 2); a.borrao = forca; b.borrao = forca; b.opacidade = n3(p); }
    else { a.desloca = n3(-p); b.desloca = n3(1 - p); }
    a.volume = n3(1 - p); // o som também troca devagar (acrossfade)
    b.volume = n3(p);
  }
  // o som do vídeo entra em 0,15 s e sai nos últimos 0,6 s dos cortes
  const geral = Math.min(cl(t / 0.15), cl((linha.clipe - t) / 0.6));
  for (const c of cortes) c.volume = n3(c.volume * geral);
  const c0 = linha.cortes[0];
  const iFrase = frase ? ondeFrase(k, titulo) : -1;
  const q = {
    t: n3(t), cortes, ativo: 0,
    titulo: titulo ? texto(0, t - c0.inicio, c0.saida) : null,
    frase: iFrase >= 0 ? texto(iFrase, t - linha.cortes[iFrase].inicio, linha.cortes[iFrase].saida) : null,
    selo: linha.comMarca ? 1 : 0, fim: 0, branco: 0, preto: 0, zoomFim: n3(zoomDoFim(0)),
  };
  for (let i = 0; i < k; i++) if (t >= linha.cortes[i].inicio) q.ativo = i;
  if (linha.comMarca && t >= linha.fimDe) {
    const f = fadeBranco(1 - cl((t - linha.fimDe) / FIM_TRANSICAO));
    q.fim = f.fim;
    q.branco = f.branco;
    q.zoomFim = n3(zoomDoFim(t - linha.fimDe));
    if (t >= linha.fimDe + FIM_TRANSICAO / 2) q.ativo = 'fim';
  } else if (!linha.comMarca) {
    q.preto = n3(cl((t - (linha.clipe - 0.4)) / 0.4)); // a versão sem a marca some no preto
  }
  return q;
}

/**
 * Um corte sozinho, no segundo `tl` dele (o laço do "tocar num corte"): só ele aparece, sem as trocas, com o zoom, a
 * velocidade e o texto dele (o nome no 1º, a frase no último). O som entra e sai rapidinho nas pontas do laço.
 */
export function quadroDoCorte(linha, i, tl, { titulo = false, frase = false } = {}) {
  const k = linha.cortes.length;
  const j = Math.min(Math.max(0, Math.round(i) || 0), k - 1);
  const c = linha.cortes[j];
  const local = Math.min(Math.max(tl, 0), c.saida);
  const volume = n3(Math.min(cl(local / 0.15), cl((c.saida - local) / 0.15)));
  const cortes = linha.cortes.map((x, n) => (n === j
    ? { visivel: true, tl: n3(local), fonte: n3(x.de + local * x.velocidade), zoom: n3(zoomDe(x, local)), opacidade: 1, borrao: 0, desloca: 0, volume }
    : { visivel: false, tl: 0, fonte: n3(x.de), zoom: 1, opacidade: 1, borrao: 0, desloca: 0, volume: 0 }));
  const iFrase = frase ? ondeFrase(k, titulo) : -1;
  return {
    t: n3(c.inicio + local), cortes, ativo: j, solo: j,
    titulo: titulo && j === 0 ? texto(0, local, c.saida) : null,
    frase: iFrase === j ? texto(j, local, c.saida) : null,
    selo: linha.comMarca ? 1 : 0, fim: 0, branco: 0, preto: 0, zoomFim: n3(zoomDoFim(0)),
  };
}

/** O que cada corte faz (o texto do "ver só esse corte"), com os números do zoom do robô. */
export const EFEITOS = {
  chegando: { nome: 'O destaque', diz: 'A câmera chega perto devagar: o zoom vai de 1,00x a 1,10x, na velocidade normal.' },
  soco: { nome: 'A ação', diz: 'Acelerada 1,8 vez. O zoom começa em 1,14x e volta pra 1,00x em 0,3 s: é o soco.' },
  lento: { nome: 'O detalhe', diz: 'Em câmera lenta, a 0,7 da velocidade, com o zoom indo de 1,04x a 1,14x.' },
};

/** "Ver devagar": as trocas tocam 4 vezes mais devagar. */
export const RITMO_DEVAGAR = 0.25;
export const TROCAS = {
  hblur: { nome: 'o borrão de velocidade', diz: 'O corte 1 borra pros lados e o 2 aparece por cima, já com o soco de zoom.' },
  slideup: { nome: 'o empurrão pra cima', diz: 'O corte 3 entra por baixo e empurra o 2 pra cima.' },
  fadewhite: { nome: 'o flash do final', diz: 'O vídeo clareia até o branco e a logo da Pineapple aparece.' },
};

/**
 * As trocas para ver devagar, na ordem: as 2 entre os cortes (0,35 s) e, no grátis, o flash do final (0,4 s). Cada
 * uma com um pedacinho antes e depois (o que a tela mostra) e quanto dura de verdade, 4x mais devagar.
 */
export function trocasDevagar(linha) {
  const lista = linha.trocas.map((tr) => ({ tipo: tr.tipo, de: tr.de, ate: tr.ate, dura: TRANSICAO }));
  if (linha.comMarca && linha.fimDe !== null) lista.push({ tipo: 'fadewhite', de: linha.fimDe, ate: n2(linha.fimDe + FIM_TRANSICAO), dura: FIM_TRANSICAO });
  return lista.map((x, i) => ({
    ...x, ...TROCAS[x.tipo], n: i + 1, quantas: lista.length,
    mostraDe: n2(Math.max(0, x.de - 0.2)), mostraAte: n2(Math.min(linha.total, x.ate + 0.25)), real: n2(x.dura / RITMO_DEVAGAR),
  }));
}

/** Quando o robô põe cada som: o "whoosh" começa 0,25 s antes de cada troca; no grátis, mais um e a batida no final. */
export function eventosDeSom(linha) {
  const ev = linha.trocas.map((tr) => ({ t: n2(Math.max(0, tr.de - 0.25)), tipo: 'whoosh' }));
  if (linha.comMarca) {
    ev.push({ t: n2(Math.max(0, linha.fimDe - 0.25)), tipo: 'whoosh' });
    ev.push({ t: n2(linha.fimDe + 0.05), tipo: 'batida' });
  }
  return ev.sort((a, b) => a.t - b.t);
}

/** Os sons que a agulha cruzou indo de `de` até `ate` (pros dois lados: arrastar pra trás também toca). */
export function cruzou(eventos, de, ate) {
  if (!(Math.abs(ate - de) > 1e-6)) return [];
  const [a, b] = de < ate ? [de, ate] : [ate, de];
  const lista = eventos.filter((e) => e.t > a && e.t <= b);
  return de < ate ? lista : lista.reverse();
}

/** O segundo do vídeo da pessoa no x da tela (a tira do vídeo, na caixa { left, width }). */
export function momentoDoX(x, caixa, segundos) {
  if (!caixa || !(caixa.width > 0)) return 0;
  return n2(cl((x - caixa.left) / caixa.width) * segundos);
}

/** Onde o momento cai dentro do corte (no tempo da edição): é o quadro que o monitor mostra enquanto a pessoa arrasta. */
export function tempoDoMomento(corte, momento) {
  return n3(Math.min(Math.max((momento - corte.de) / corte.velocidade, 0), Math.max(0, corte.saida - 0.001)));
}

/** Um passo da seta na agulha (ou num momento): 0,1 s (com o Shift, 1 s); Home e End vão pras pontas. */
export function passoDaAgulha(t, tecla, grande, total) {
  const p = grande ? 1 : 0.1;
  const novo = { ArrowRight: t + p, ArrowUp: t + p, ArrowLeft: t - p, ArrowDown: t - p, PageUp: t + 1, PageDown: t - 1, Home: 0, End: total }[tecla];
  return novo === undefined ? null : n2(Math.min(Math.max(novo, 0), total));
}

/** "2,4 s" (com vírgula). */
export const segundosEmTexto = (s) => `${(Math.round(Math.max(0, s) * 10) / 10).toFixed(1).replace('.', ',')} s`;
/** "0,18" (com 2 casas, para as trocas de 0,35 s). */
export const centesimos = (s) => (Math.round(Math.max(0, s) * 100) / 100).toFixed(2).replace('.', ',');
/** "1,8x" (a velocidade). */
export const velocidadeEmTexto = (v) => `${(Math.round(v * 10) / 10).toFixed(1).replace('.', ',')}x`;
/** "1,14x" (o zoom). */
export const zoomEmTexto = (z) => `${(Math.round(z * 100) / 100).toFixed(2).replace('.', ',')}x`;
