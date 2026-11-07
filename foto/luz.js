// O ESTUDO DE LUZ VIVO (v3, 07/11/2026, o Andrews: "eu quero que a interface seja altamente interativa").
// A pessoa arrasta a janela em volta da esfera (o dedo, o mouse ou as setas do teclado) e a luz, o brilho e a sombra
// seguem na hora. Quando a luz chega de onde o robô pede (de janela, da esquerda), acende "é assim que a gente pede".
// As contas são as de contas.js (luzDaJanela); aqui só se desenha. É um desenho geométrico: a foto da pessoa nunca
// passa por aqui (a luz dela, quem arruma é a IA, no Direct).
import { pegar, pedeMenosMovimento, suavizar, limitar } from '../comum/interacao.js';
import { luzDaJanela, JANELA, BORDA_DA_JANELA, caminhoDaIntro, passoDaSeta } from './contas.js';

const quadroDeAnimacao = (f) => requestAnimationFrame(f);
const agora = () => performance.now();

/**
 * Liga o estudo no quadro (o [data-quadro-img] com o <svg data-estudo> e o botão [data-janela]).
 * aoMudar(luz, { quem }) quando a luz troca de zona (quem: 'pessoa', 'teclado', 'intro' ou 'comeco').
 * Devolve { irPara(pos), intro(), luz() }.
 */
export function ligarEstudo(quadro, { aoMudar = () => {}, aoComecar = () => {}, aoSoltar = () => {} } = {}) {
  const svg = quadro?.querySelector('[data-estudo]');
  const janela = quadro?.querySelector('[data-janela]');
  if (!svg || !janela) return null;
  const pedaco = (n) => svg.querySelector(`[data-el="${n}"]`);
  const el = {
    janela: pedaco('janela'), janelaParadas: [...pedaco('janela').querySelectorAll('stop')],
    facho: pedaco('facho'), fachoCor: pedaco('facho-cor'), aro: pedaco('aro'), sombra: pedaco('sombra'),
    esfera: pedaco('esfera'), esferaParadas: [...pedaco('esfera').querySelectorAll('stop')],
    rebate: pedaco('rebate'), brilho: pedaco('brilho'),
  };
  const borda = BORDA_DA_JANELA;
  let pos = pedeMenosMovimento() ? { ...JANELA.certa } : { ...JANELA.inicio };
  let zona = null;
  let ultima = null;
  let anda = 0;
  let mexeu = false;

  const por = (n, attrs) => { if (n) for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); };
  function desenhar(quem) {
    const L = luzDaJanela(pos.x, pos.y);
    ultima = L;
    por(el.janela, { cx: L.janela.cx, cy: L.janela.cy, r: L.janela.r });
    // o clarão da janela: o centro forte, perdendo força até sumir
    el.janelaParadas[0]?.setAttribute('stop-opacity', String(L.janela.opacidade));
    el.janelaParadas[1]?.setAttribute('stop-opacity', String(+(L.janela.opacidade * 0.3).toFixed(3)));
    por(el.facho, { points: L.facho.pontos, opacity: L.facho.opacidade });
    por(el.fachoCor, { x1: L.facho.x1, y1: L.facho.y1, x2: L.facho.x2, y2: L.facho.y2 });
    por(el.aro, { x1: L.aro.x1, y1: L.aro.y1, x2: L.aro.x2, y2: L.aro.y2 });
    por(el.sombra, { cx: L.sombra.cx, cy: L.sombra.cy, rx: L.sombra.rx, ry: L.sombra.ry, opacity: L.sombra.opacidade });
    por(el.esfera, { cx: L.esfera.cx, cy: L.esfera.cy, fx: L.esfera.fx, fy: L.esfera.fy, r: L.esfera.r });
    el.esferaParadas.forEach((s, i) => s.setAttribute('stop-color', L.esfera.cores[i]));
    por(el.rebate, { cx: L.rebate.cx, cy: L.rebate.cy, opacity: L.rebate.opacidade });
    por(el.brilho, { cx: L.brilho.cx, cy: L.brilho.cy, rx: L.brilho.rx, ry: L.brilho.ry, opacity: L.brilho.opacidade });
    janela.style.left = `${(pos.x * 100).toFixed(2)}%`;
    janela.style.top = `${(pos.y * 100).toFixed(2)}%`;
    quadro.dataset.luz = L.zona;
    // o selo de onde vem a luz sai do caminho quando a janela chega no canto dele (o de cima, à esquerda)
    quadro.classList.toggle('janela-no-canto', pos.x < 0.46 && pos.y < 0.26);
    quadro.classList.toggle('luz-certa', L.certa);
    if (L.zona !== zona) { zona = L.zona; aoMudar(L, { quem }); }
    return L;
  }

  const parar = () => { if (anda) cancelAnimationFrame(anda); anda = 0; };
  /** Leva a janela até `alvo` (animado em ms; sem animação para quem pediu menos movimento). */
  function irPara(alvo, { ms = 320, quem = 'pessoa' } = {}) {
    parar();
    const fim = { x: limitar(alvo.x, borda, 1 - borda), y: limitar(alvo.y, borda, 1 - borda) };
    if (pedeMenosMovimento() || ms <= 0) { pos = fim; desenhar(quem); return; }
    const de = { ...pos };
    const t0 = agora();
    const passo = (t) => {
      const k = suavizar(Math.min(1, (t - t0) / ms));
      pos = { x: de.x + (fim.x - de.x) * k, y: de.y + (fim.y - de.y) * k };
      desenhar(quem);
      anda = k < 1 ? quadroDeAnimacao(passo) : 0;
    };
    anda = quadroDeAnimacao(passo);
  }

  /** A apresentação: a janela dá a volta por cima, da direita até a esquerda (uma vez, até a pessoa mexer). */
  function intro() {
    if (mexeu || pedeMenosMovimento()) return;
    parar();
    const t0 = agora();
    const ms = 2600;
    const passo = (t) => {
      if (mexeu) { anda = 0; return; }
      const k = Math.min(1, (t - t0) / ms);
      pos = caminhoDaIntro(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
      desenhar('intro');
      anda = k < 1 ? quadroDeAnimacao(passo) : 0;
    };
    anda = quadroDeAnimacao(passo);
  }

  // arrastar a janela (o dedo e o mouse): a luz segue na hora
  let ini = null;
  pegar(janela, {
    eixo: 'livre',
    aoComecar: () => {
      parar();
      mexeu = true;
      const caixa = quadro.getBoundingClientRect();
      ini = { pos: { ...pos }, caixa };
      quadro.classList.add('arrastando-luz');
      aoComecar();
    },
    aoMover: ({ dx, dy }) => {
      if (!ini) return;
      const { caixa } = ini;
      pos = {
        x: limitar(ini.pos.x + dx / (caixa.width || 1), borda, 1 - borda),
        y: limitar(ini.pos.y + dy / (caixa.height || 1), borda, 1 - borda),
      };
      desenhar('pessoa');
    },
    aoSoltar: () => {
      ini = null;
      quadro.classList.remove('arrastando-luz');
      aoSoltar(ultima);
    },
  });

  // tocar no quadro (fora da janela) leva a luz até ali
  quadro.addEventListener('click', (ev) => {
    if (ev.target.closest?.('[data-janela], button, a, label, input')) return;
    if (!quadro.classList.contains('com-estudo')) return;
    const caixa = quadro.getBoundingClientRect();
    mexeu = true;
    aoComecar();
    irPara({ x: (ev.clientX - caixa.left) / (caixa.width || 1), y: (ev.clientY - caixa.top) / (caixa.height || 1) }, { ms: 380, quem: 'pessoa' });
  });

  // as setas do teclado também movem a luz (com o Shift, mais longe)
  janela.addEventListener('keydown', (ev) => {
    const novo = passoDaSeta(pos, ev.key, ev.shiftKey);
    if (!novo) return;
    ev.preventDefault();
    mexeu = true;
    aoComecar();
    parar();
    pos = novo;
    desenhar('teclado');
  });

  desenhar('comeco');
  return {
    irPara,
    intro,
    luz: () => ultima,
    mexeu: () => mexeu,
    redesenhar: () => desenhar('comeco'),
  };
}
