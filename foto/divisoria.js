// A MARCA DA AMOSTRA (v3, 07/11/2026): a mesma foto dos dois lados de uma linha que a pessoa arrasta (o dedo, o mouse
// ou as setas). À direita, a amostra grátis, com a marca da Pineapple no canto (como o robô manda: a pílula no canto
// direito de cima); à esquerda, o pacote, sem a marca. Os nomes e os preços vêm do valores.js (data-valor).
import { pegar, pedeMenosMovimento } from '../comum/interacao.js';
import { posicaoDaDivisoria, passoDaDivisoria, textoDaDivisoria, forcaDoRotulo } from './contas.js';

/** Liga a divisória ([data-divisoria] dentro de `raiz`). Devolve { por(d), d() }. */
export function ligarDivisoria(raiz, { aoMexer = () => {} } = {}) {
  const caixa = raiz?.querySelector('[data-divisoria]');
  const linha = caixa?.querySelector('[data-div-linha]');
  if (!caixa || !linha) return null;
  const diz = raiz.querySelector('[data-div-diz]');
  const rotulos = { esquerda: caixa.querySelector('[data-div-rot="esquerda"]'), direita: caixa.querySelector('[data-div-rot="direita"]') };
  let d = 50;
  let texto = '';
  let tocou = false;

  function por(v, { solto = true } = {}) {
    d = Math.min(100, Math.max(0, v));
    caixa.classList.toggle('puxando', !solto);
    caixa.style.setProperty('--d', `${d}%`);
    linha.setAttribute('aria-valuenow', String(Math.round(d)));
    const t = textoDaDivisoria(d);
    linha.setAttribute('aria-valuetext', t);
    if (diz && t !== texto) { texto = t; diz.textContent = t; }
    for (const [lado, el] of Object.entries(rotulos)) if (el) el.style.opacity = String(forcaDoRotulo(d, lado));
  }

  pegar(caixa, {
    eixo: 'x',
    aoComecar: ({ x }) => { tocou = true; aoMexer(); por(posicaoDaDivisoria(x, caixa.getBoundingClientRect()), { solto: true }); },
    aoMover: ({ x }) => por(posicaoDaDivisoria(x, caixa.getBoundingClientRect()), { solto: false }),
    aoSoltar: () => caixa.classList.remove('puxando'),
  });
  linha.addEventListener('keydown', (ev) => {
    const novo = passoDaDivisoria(d, ev.key, ev.shiftKey);
    if (novo === null) return;
    ev.preventDefault();
    tocou = true;
    aoMexer();
    por(novo);
  });

  // o convite: quando ela aparece na tela pela 1ª vez, a linha dá uma passadinha por cima da marca e volta
  if (!pedeMenosMovimento() && typeof IntersectionObserver === 'function') {
    const olho = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      olho.disconnect();
      const passos = [[650, 74], [1250, 40], [1800, 50]];
      for (const [ms, v] of passos) setTimeout(() => { if (!tocou) por(v); }, ms);
    }, { threshold: 0.6 });
    olho.observe(caixa);
  }

  por(d);
  return { por, d: () => d };
}
