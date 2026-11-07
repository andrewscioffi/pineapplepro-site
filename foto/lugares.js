// OS LUGARES ONDE A FOTO APARECE (v3, 07/11/2026). A mesma foto, quadrada como o robô entrega (1080 × 1080), passa
// pela lista do app, pelo cartão, pela página aberta, pelo feed e pela grade do Instagram (que corta em 3:4).
//   a moldura voa de um lugar pro outro e muda de forma (transição de CSS: left, top, width, height e o canto)
//   deslizar o celular (o dedo ou o mouse) troca o lugar; as setas do teclado e os botões também
//   arrastar a foto dentro da moldura mostra o que o corte pega (na grade, o que fica de fora aparece apagado)
// O app e o Instagram são de mentira (formas, sem nome, sem número): só a foto é a da pessoa, do jeito que ela está.
import { pegar, pedeMenosMovimento, vibrar } from '../comum/interacao.js';
import {
  VISTAS, NOME_DA_VISTA, ORDEM_DAS_VISTAS, ORDEM_DAS_PAGINAS, PAGINA_DA_VISTA, vistaAoLado, arrastoNaMoldura,
} from './contas.js';

/** A posição do elemento dentro da tela do celular, pelo layout (sem as animações de translate das telas). */
function caixaNaTela(el, tela) {
  let x = 0;
  let y = 0;
  let n = el;
  while (n && n !== tela) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/**
 * Liga o celular de mentira (o [data-celular] dentro de `raiz`, com os chips [data-vista] e o [data-vista-diz]).
 * aoMexer() avisa a página que a pessoa mexeu (o passeio para). Devolve { ir(vista), vista(), moldura }.
 */
export function ligarLugares(raiz, { aoMexer = () => {} } = {}) {
  const celular = raiz?.querySelector('[data-celular]');
  const tela = celular?.querySelector('[data-cel-tela]');
  const moldura = tela?.querySelector('[data-moldura]');
  if (!celular || !tela || !moldura) return null;
  const chips = [...raiz.querySelectorAll('[data-vista]')];
  const diz = raiz.querySelector('[data-vista-diz]');
  const paginas = [...tela.querySelectorAll('[data-pag]')];
  let vista = celular.dataset.vista || 'lista';
  let pan = 0;
  let tempoCorte = 0;

  const lugar = (v) => tela.querySelector(`[data-lugar="${v}"]`);

  /** Põe a moldura em cima do lugar da vista (com animação, ou direto). */
  function encaixar({ animar = true } = {}) {
    const alvo = lugar(vista);
    if (!alvo) return;
    const c = caixaNaTela(alvo, tela);
    if (!animar || pedeMenosMovimento()) moldura.classList.add('sem-anima');
    moldura.style.setProperty('--mx', `${c.x}px`);
    moldura.style.setProperty('--my', `${c.y}px`);
    moldura.style.setProperty('--mw', `${c.w}px`);
    moldura.style.setProperty('--mh', `${c.h}px`);
    moldura.style.setProperty('--mr', getComputedStyle(alvo).borderTopLeftRadius || '10px');
    moldura.dataset.vista = vista;
    if (moldura.classList.contains('sem-anima')) {
      void moldura.offsetWidth; // o navegador põe no lugar antes de ligar a animação de novo
      moldura.classList.remove('sem-anima');
    }
  }

  function porPan(px, { solto = false } = {}) {
    pan = px;
    moldura.classList.toggle('puxando', !solto);
    moldura.style.setProperty('--pan', `${px.toFixed(1)}px`);
  }

  /** Mostra o que o corte deixou de fora (a foto inteira, apagada, por trás da moldura) por um tempo. */
  function mostrarCorte(ms = 1600) {
    clearTimeout(tempoCorte);
    moldura.classList.add('mostra-corte');
    tempoCorte = setTimeout(() => moldura.classList.remove('mostra-corte'), ms);
  }

  /** Vai para o lugar `v` (a moldura voa, a tela do app ou do Instagram desliza). */
  function ir(v, { animar = true, falar = true } = {}) {
    if (!ORDEM_DAS_VISTAS.includes(v)) return;
    vista = v;
    celular.dataset.vista = v;
    const atual = ORDEM_DAS_PAGINAS.indexOf(PAGINA_DA_VISTA[v]);
    for (const p of paginas) {
      const i = ORDEM_DAS_PAGINAS.indexOf(p.dataset.pag);
      p.dataset.lado = i === atual ? 'atual' : i < atual ? 'antes' : 'depois';
      p.inert = i !== atual;
    }
    for (const b of chips) b.setAttribute('aria-pressed', String(b.dataset.vista === v));
    if (diz && falar) diz.textContent = VISTAS[v] ?? '';
    porPan(0, { solto: true });
    encaixar({ animar });
    // na grade, mostra o que o Instagram corta assim que a moldura chega
    clearTimeout(tempoCorte);
    moldura.classList.remove('mostra-corte');
    if (v === 'grade') tempoCorte = setTimeout(() => mostrarCorte(1700), pedeMenosMovimento() || !animar ? 0 : 620);
  }

  for (const b of chips) b.addEventListener('click', () => { aoMexer(); ir(b.dataset.vista); });

  // os botões de dentro do celular, pelo teclado (o toque do dedo e do mouse vem pelo "pegar", lá embaixo)
  tela.addEventListener('click', (ev) => {
    if (ev.detail !== 0) return;
    if (ev.target.closest('[data-fechar]')) { aoMexer(); ir('lista'); return; }
    if (ev.target.closest('[data-abrir]')) { aoMexer(); ir('aberta'); }
  });
  // as setas trocam de lugar (com o foco dentro do celular)
  celular.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    aoMexer();
    ir(vistaAoLado(vista, ev.key === 'ArrowRight' ? 1 : -1));
  });

  // o dedo: arrastar a foto dentro da moldura, ou deslizar o celular pra trocar de lugar
  let ini = null;
  pegar(tela, {
    eixo: 'x',
    aoComecar: ({ ev }) => {
      aoMexer();
      const naFoto = Boolean(ev.target.closest?.('[data-moldura]'));
      ini = { modo: naFoto ? 'foto' : 'trocar', pan, moveu: false, w: moldura.offsetWidth, h: moldura.offsetHeight };
    },
    aoMover: ({ dx, dy }) => {
      if (!ini) return;
      if (!ini.moveu && Math.hypot(dx, dy) < 7) return;
      ini.moveu = true;
      if (ini.modo === 'foto') {
        porPan(arrastoNaMoldura(ini.pan + dx, ini.w, ini.h));
        clearTimeout(tempoCorte);
        moldura.classList.add('mostra-corte');
      } else {
        celular.classList.add('puxando');
        celular.style.setProperty('--puxa', `${Math.max(-60, Math.min(60, dx * 0.28)).toFixed(1)}px`);
      }
    },
    aoSoltar: ({ dx, vx, x, y, cancelou }) => {
      const i = ini;
      ini = null;
      celular.classList.remove('puxando');
      celular.style.setProperty('--puxa', '0px');
      if (!i) return;
      if (i.modo === 'foto' && i.moveu) {
        // a foto volta pro meio (a grade mostra o meio da foto) e o que fica de fora apaga devagar
        porPan(0, { solto: true });
        mostrarCorte(700);
        return;
      }
      if (cancelou) return;
      if (i.moveu) {
        if (dx < -46 || vx < -0.45) { ir(vistaAoLado(vista, 1)); vibrar(8); }
        else if (dx > 46 || vx > 0.45) { ir(vistaAoLado(vista, -1)); vibrar(8); }
        return;
      }
      // um toque: a foto (ou o "Seu produto") abre a página do produto; a seta volta pra lista
      const alvo = document.elementFromPoint(x, y);
      if (alvo?.closest?.('[data-fechar]')) { ir('lista'); return; }
      if ((vista === 'lista' || vista === 'cartao') && alvo?.closest?.('[data-moldura], [data-abrir]')) ir('aberta');
    },
  });

  // o tamanho mudou (a tela girou, a letra carregou): a moldura vai pro lugar certo, sem animação
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => encaixar({ animar: false })).observe(tela);
  ir(vista, { animar: false, falar: false });

  return { ir, vista: () => vista, moldura, nome: (v) => NOME_DA_VISTA[v] ?? '' };
}
