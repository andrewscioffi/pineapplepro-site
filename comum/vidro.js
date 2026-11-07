// AS INTERAÇÕES DO VIDRO (07/11/2026). Liga sozinho em toda página que carrega o site.js.
//   .vidro             o reflexo segue o cursor (--mx, --my)
//   .inclina           o cartão inclina em 3D na direção do cursor (--rx, --ry) e volta com mola ao sair
//   [data-profundidade] dentro de um .inclina: anda um pouco junto (efeito de camadas). Valor = quanto anda (ex.: "12")
//   .revela            aparece ao rolar (com --atraso opcional). Sem JavaScript, já está visível
// Quem pediu menos movimento (prefers-reduced-motion) e as telas de toque ficam sem inclinação.

const pedeMenos = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const temMouse = () => typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

/** A posição do ponteiro dentro do elemento, de 0 a 1 (função pura, testável). */
export function posicao(ev, caixa) {
  const x = (ev.clientX - caixa.left) / (caixa.width || 1);
  const y = (ev.clientY - caixa.top) / (caixa.height || 1);
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
}

/** O giro do cartão para essa posição (graus). `forca` = o giro máximo. */
export function giro({ x, y }, forca = 8) {
  return { rx: +((0.5 - y) * forca * 2).toFixed(2), ry: +((x - 0.5) * forca * 2).toFixed(2) };
}

function ligarReflexo(el) {
  el.addEventListener('pointermove', (ev) => {
    const p = posicao(ev, el.getBoundingClientRect());
    el.style.setProperty('--mx', `${(p.x * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(p.y * 100).toFixed(1)}%`);
  });
  el.addEventListener('pointerdown', () => el.classList.add('tocado'));
  el.addEventListener('pointerleave', () => el.classList.remove('tocado'));
}

function ligarInclinacao(el) {
  const forca = Number(el.dataset.forca || 7);
  const camadas = [...el.querySelectorAll('[data-profundidade]')];
  el.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const p = posicao(ev, el.getBoundingClientRect());
    const g = giro(p, forca);
    el.classList.add('movendo');
    el.style.setProperty('--rx', `${g.rx}deg`);
    el.style.setProperty('--ry', `${g.ry}deg`);
    for (const c of camadas) {
      const d = Number(c.dataset.profundidade || 10);
      c.style.translate = `${((p.x - 0.5) * d).toFixed(1)}px ${((p.y - 0.5) * d).toFixed(1)}px`;
    }
  });
  el.addEventListener('pointerleave', () => {
    el.classList.remove('movendo');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    for (const c of camadas) c.style.translate = '0px 0px';
  });
}

function ligarRevelar(doc) {
  const itens = [...doc.querySelectorAll('.revela:not(.visivel)')];
  if (!itens.length) return;
  if (typeof IntersectionObserver !== 'function') { for (const el of itens) el.classList.add('visivel'); return; }
  const olho = new IntersectionObserver((entradas) => {
    for (const e of entradas) if (e.isIntersecting) { e.target.classList.add('visivel'); olho.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  for (const el of itens) olho.observe(el);
}

/** Liga tudo o que ainda não foi ligado (pode chamar de novo depois de pôr HTML novo na tela). */
export function ligarVidro(doc = document) {
  doc.documentElement.classList.add('js');
  for (const el of doc.querySelectorAll('.vidro:not([data-vidro-ligado])')) { el.dataset.vidroLigado = '1'; ligarReflexo(el); }
  if (!pedeMenos() && temMouse()) {
    for (const el of doc.querySelectorAll('.inclina:not([data-inclina-ligado])')) { el.dataset.inclinaLigado = '1'; ligarInclinacao(el); }
  }
  if (pedeMenos()) for (const el of doc.querySelectorAll('.revela')) el.classList.add('visivel');
  else ligarRevelar(doc);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => ligarVidro(document));
  else ligarVidro(document);
}
