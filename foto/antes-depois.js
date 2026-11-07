// O ANTES E DEPOIS DE VERDADE (07/11/2026). O Andrews: "as fotos revitalizadas têm uma bola no centro. Eu acho que a
// gente podia pôr exemplo real nosso". São 4 exemplos reais (contas.js → EXEMPLOS_REAIS): o antes é a foto do celular e
// o depois, a foto revitalizada. O enquadramento do antes (4:3) e o do depois (quadrado) não casam embaixo de uma linha
// de arrastar: por isso a troca é com fade, no mesmo quadro (o depois entra por cima do antes).
//   tocar na foto, ou os botões Antes e Depois (e as setas do teclado em cima deles), troca um pelo outro
//   deslizar a foto pro lado (o dedo ou o mouse) passa pro próximo exemplo; os chips também
//   o quadro aparece na tela pela 1ª vez: a foto do celular vira a revitalizada sozinha, com a luz passando (uma vez)
//   trocou de exemplo: aparece o antes dele, e logo o depois (quem pediu menos movimento fica no lado em que estava)
// As fotos novas carregam antes de entrar (nada fica vazio no meio da troca). Conteúdo genérico: nada do lugar nem de
// quem é a comida. Nada aqui mexe na foto: cada lado é o arquivo do jeito que ele é.
import { pegar, pedeMenosMovimento, vibrar, animarNumero } from '../comum/interacao.js';
import { EXEMPLOS_REAIS, ANTES_DEPOIS, fotoDoExemplo, altDoExemplo, exemploAoLado, decidirArrasto, puxaoDoArrasto } from './contas.js';

const LADOS = ['antes', 'depois'];
const exemplo = (id) => EXEMPLOS_REAIS.find((e) => e.id === id);

/**
 * Liga o antes e depois ([data-ad], com o [data-ad-quadro], os botões [data-ad-ver] e os chips [data-ad-exemplo]).
 * aoTrocarExemplo(ex) avisa a página (a foto dos lugares e da marca vai junto). Devolve { ver, ir, atual, lado }.
 */
export function ligarAntesDepois(raiz, { aoTrocarExemplo = () => {} } = {}) {
  const quadro = raiz?.querySelector('[data-ad-quadro]');
  const fotos = Object.fromEntries(LADOS.map((l) => [l, quadro?.querySelector(`[data-ad-foto="${l}"]`)]));
  if (!quadro || !fotos.antes || !fotos.depois) return null;
  const pilha = quadro.querySelector('[data-ad-pilha]') ?? quadro;
  const selo = raiz.querySelector('[data-ad-selo]');
  const diz = raiz.querySelector('[data-ad-diz]');
  const nome = raiz.querySelector('[data-ad-nome]');
  const conta = raiz.querySelector('[data-ad-conta]');
  const botoes = [...raiz.querySelectorAll('[data-ad-ver]')];
  const chips = [...raiz.querySelectorAll('[data-ad-exemplo]')];
  const parado = () => pedeMenosMovimento();
  let lado = raiz.dataset.ver === 'depois' ? 'depois' : 'antes';
  let atual = chips.find((c) => c.getAttribute('aria-pressed') === 'true')?.dataset.adExemplo ?? EXEMPLOS_REAIS[0].id;
  let mexeu = false; // a pessoa já mexeu: a foto não vira mais sozinha na 1ª vez que aparece
  let vez = 0; // a troca de exemplo mais nova (a foto velha que termina de carregar depois não entra por cima)
  let relogio = 0; // a virada sozinha que está marcada

  /** Mostra um lado. Com `varrer`, a luz passa por cima quando o depois entra. */
  function ver(qual, { falar = true, varrer = false } = {}) {
    if (!LADOS.includes(qual)) return;
    clearTimeout(relogio);
    lado = qual;
    raiz.dataset.ver = qual;
    if (selo) selo.textContent = ANTES_DEPOIS[qual].selo;
    for (const b of botoes) b.setAttribute('aria-pressed', String(b.dataset.adVer === qual));
    if (diz && falar) diz.textContent = ANTES_DEPOIS[qual].diz;
    quadro.classList.remove('revitaliza');
    if (varrer && qual === 'depois' && !parado()) {
      void quadro.offsetWidth; // recomeça a luz que passa
      quadro.classList.add('revitaliza');
    }
  }

  /** A foto vira sozinha (do antes pro depois) daqui a `ms`, se ninguém mexer antes. */
  function virarSozinha(ms) {
    clearTimeout(relogio);
    if (parado()) return;
    relogio = setTimeout(() => ver('depois', { varrer: true }), ms);
  }

  // as 2 fotos de cada exemplo, pedidas uma vez só (quem já viu, o navegador já guardou)
  const pedidas = new Map();
  function carregar(ex) {
    if (!ex) return Promise.resolve([]);
    if (!pedidas.has(ex.id)) {
      pedidas.set(ex.id, Promise.all(LADOS.map((l) => new Promise((pronto) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => (typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve()).then(() => pronto(true));
        img.onerror = () => pronto(false);
        img.src = fotoDoExemplo(ex.id, l);
      }))));
    }
    return pedidas.get(ex.id);
  }

  const marcarChips = () => { for (const c of chips) c.setAttribute('aria-pressed', String(c.dataset.adExemplo === atual)); };

  /** Troca de exemplo. `direcao`: de que lado o novo entra (+1 vem da direita, −1 da esquerda). */
  async function ir(id, { direcao = 0 } = {}) {
    const ex = exemplo(id);
    if (!ex || id === atual) return;
    const minha = ++vez;
    atual = id;
    marcarChips();
    clearTimeout(relogio);
    const demora = setTimeout(() => quadro.classList.add('carregando'), 220); // demorou: o quadro avisa que está vindo
    quadro.classList.add('saindo');
    await Promise.all([carregar(ex), new Promise((r) => setTimeout(r, parado() ? 0 : 150))]);
    clearTimeout(demora);
    if (minha !== vez) return;
    quadro.classList.remove('carregando', 'saindo');
    for (const l of LADOS) {
      const img = fotos[l];
      img.src = fotoDoExemplo(ex.id, l);
      [img.width, img.height] = ex[l];
      img.alt = altDoExemplo(ex, l);
    }
    if (nome) nome.textContent = ex.nome;
    if (conta) animarNumero(conta, EXEMPLOS_REAIS.indexOf(ex) + 1, { formato: (v) => `${Math.round(v)} de ${EXEMPLOS_REAIS.length}`, ms: 380 });
    if (!parado()) {
      // o exemplo novo entra pelo lado do dedo, mostra o antes dele e logo vira o depois
      quadro.dataset.entra = direcao > 0 ? 'direita' : direcao < 0 ? 'esquerda' : 'meio';
      quadro.classList.remove('entrou');
      void quadro.offsetWidth;
      quadro.classList.add('entrou');
      ver('antes', { falar: false });
      virarSozinha(800);
    }
    aoTrocarExemplo(ex);
    carregar(exemplo(exemploAoLado(id, direcao < 0 ? -1 : 1))); // o próximo já vem vindo (quem desliza uma vez, desliza de novo)
  }

  // o dedo e o mouse: um toque troca o lado; deslizar pro lado troca o exemplo (a página continua rolando na vertical)
  let ini = null;
  pegar(quadro, {
    eixo: 'x',
    aoComecar: () => { ini = { moveu: false }; },
    aoMover: ({ dx, dy }) => {
      if (!ini) return;
      if (!ini.moveu && Math.hypot(dx, dy) < 8) return;
      ini.moveu = true;
      quadro.classList.add('puxando');
      pilha.style.setProperty('--puxa', `${puxaoDoArrasto(dx)}px`);
    },
    aoSoltar: ({ dx, vx, cancelou }) => {
      const i = ini;
      ini = null;
      quadro.classList.remove('puxando');
      pilha.style.setProperty('--puxa', '0px');
      if (!i || cancelou) return;
      mexeu = true;
      if (!i.moveu) {
        ver(lado === 'antes' ? 'depois' : 'antes', { varrer: true });
        vibrar(8);
        carregar(exemplo(exemploAoLado(atual, 1)));
        return;
      }
      const passo = decidirArrasto(dx, vx);
      if (passo) { ir(exemploAoLado(atual, passo), { direcao: passo }); vibrar(10); }
    },
  });

  // os botões Antes e Depois (as setas do teclado também: a esquerda é o antes, a direita é o depois)
  for (const b of botoes) {
    b.addEventListener('click', () => { mexeu = true; ver(b.dataset.adVer, { varrer: true }); });
    b.addEventListener('keydown', (ev) => {
      const qual = { ArrowLeft: 'antes', ArrowUp: 'antes', Home: 'antes', ArrowRight: 'depois', ArrowDown: 'depois', End: 'depois' }[ev.key];
      if (!qual) return;
      ev.preventDefault();
      mexeu = true;
      ver(qual, { varrer: true });
      botoes.find((x) => x.dataset.adVer === qual)?.focus();
    });
  }
  // os chips: o exemplo escolhido (e a foto já começa a vir quando o mouse ou o foco chega nele)
  const indice = (id) => EXEMPLOS_REAIS.findIndex((e) => e.id === id);
  for (const c of chips) {
    c.addEventListener('click', () => {
      mexeu = true;
      const id = c.dataset.adExemplo;
      ir(id, { direcao: indice(id) >= indice(atual) ? 1 : -1 });
    });
    for (const n of ['pointerenter', 'focus']) c.addEventListener(n, () => carregar(exemplo(c.dataset.adExemplo)), { passive: true });
  }

  // a 1ª vez que o quadro aparece: a foto do celular vira a revitalizada sozinha (sem a pessoa mexer)
  raiz.classList.add('ad-ligado');
  if (parado() || typeof IntersectionObserver !== 'function') ver('depois', { falar: false });
  else {
    ver('antes', { falar: false });
    const olho = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      olho.disconnect();
      if (!mexeu) virarSozinha(900);
    }, { threshold: 0.6 });
    olho.observe(quadro);
  }

  return { ver, ir, atual: () => atual, lado: () => lado };
}
