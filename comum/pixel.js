// O PIXEL DA META NO SITE (12/11/2026, o Andrews: "Sim, pode pôr").
// Para quê: a Meta aprender quem visita e quem compra, e o tráfego separar o público frio, o morno e o comprador
// (estrategia/estudos/2026-11-12-escala-saas-b2b/ANALISE.md, prioridade 1).
// Como, sem código de fora no site: em vez do script da Meta, cada sinal é uma imagem de 1 ponto pedida a
// www.facebook.com/tr (o mesmo pedido que o script dela faria). Assim a gente escolhe exatamente o que vai:
//   - só a página, sem o ? e sem o # (o link de acesso e o código da compra nunca saem)
//   - o evento e, na compra, o valor; nada de nome, e-mail ou telefone
//   - o fbp (um número da visita, guardado no navegador) e o fbc (o fbclid de quem chegou por anúncio)
// Só depois do "Pode medir" no aviso. "Agora não" vale até a pessoa limpar o navegador.
// O pixel é o "pinecost" da conta de anúncios da Pineapple (o id do pixel é público: aparece em qualquer site que usa).
import { guarda } from './acesso.js';
import { COMPRAS } from '../valores.js';

export const PIXEL_ID = '2082680985877720';
const TR = 'https://www.facebook.com/tr/';
const K_ESCOLHA = 'pine:pixel';
const K_FBP = 'pine:fbp';
const K_FBC = 'pine:fbc';
const K_COMPRAS = 'pine:compras-medidas';
const RX_FBCLID = /^[A-Za-z0-9_-]{1,500}$/;
const RX_CODIGO = /^[2-9A-HJ-NP-Z]{8}$/;

/** O fbc do anúncio (fb.1.<hora>.<fbclid>), se a pessoa chegou por um clique no anúncio. */
export function fbcDoEndereco(busca, agora = Date.now()) {
  const id = new URLSearchParams(busca ?? '').get('fbclid');
  return id && RX_FBCLID.test(id) ? `fb.1.${agora}.${id}` : null;
}

const novoFbp = (agora, sorte = Math.random) => `fb.1.${agora}.${String(Math.floor(sorte() * 9e9) + 1e9)}`;

/** O endereço do sinal: a página sem ? e sem #, o evento, os números, o eid (para não contar 2 vezes) e o fbp/fbc. */
export function enderecoDoSinal(evento, { pagina, dados = {}, eid, fbp, fbc, agora = Date.now() }) {
  const p = new URLSearchParams({ id: PIXEL_ID, ev: evento, dl: `${pagina.origin}${pagina.pathname}`, ts: String(agora) });
  for (const [k, v] of Object.entries(dados)) p.set(`cd[${k}]`, String(v));
  if (eid) p.set('eid', eid);
  if (fbp) p.set('fbp', fbp);
  if (fbc) p.set('fbc', fbc);
  return `${TR}?${p}`;
}

/**
 * O pixel de uma página. `enviar(url)` manda o sinal (no navegador: uma imagem); `g` é o armazenamento do acesso.js.
 * Sem armazenamento (aba anônima, bloqueado), não manda nada: sem lembrar a escolha, não dá para saber se pode.
 */
export function criarPixel({ g, pagina, enviar, agora = Date.now }) {
  const escolha = () => { const e = g.ler(K_ESCOLHA); return e === 'sim' || e === 'nao' ? e : null; };
  const pode = () => escolha() === 'sim';
  function ids() {
    let fbp = g.ler(K_FBP);
    if (!fbp) { fbp = novoFbp(agora()); if (!g.por(K_FBP, fbp)) return null; }
    // o fbc guarda a hora em que a pessoa chegou do anúncio; o mesmo fbclid na barra mais tarde não muda essa hora
    const guardado = g.ler(K_FBC);
    const doLink = fbcDoEndereco(pagina.search, agora());
    const mesmo = doLink && guardado && guardado.split('.').slice(3).join('.') === doLink.split('.').slice(3).join('.');
    if (doLink && !mesmo) { g.por(K_FBC, doLink); return { fbp, fbc: doLink }; }
    return { fbp, fbc: guardado };
  }
  function sinal(evento, dados, eid) {
    if (!pode()) return false;
    const i = ids();
    if (!i) return false;
    enviar(enderecoDoSinal(evento, { pagina, dados, eid, ...i, agora: agora() }));
    return true;
  }
  function compra(codigo, centavos) {
    if (!RX_CODIGO.test(codigo ?? '') || !Number.isInteger(centavos) || centavos <= 0 || !pode()) return false;
    const feitas = (g.ler(K_COMPRAS) ?? '').split(',').filter(Boolean);
    if (feitas.includes(codigo)) return false;
    if (!sinal('Purchase', { value: centavos / 100, currency: 'BRL' }, `compra-${codigo}`)) return false;
    g.por(K_COMPRAS, [...feitas, codigo].slice(-20).join(','));
    return true;
  }
  return { escolha, escolher: (e) => g.por(K_ESCOLHA, e === 'sim' ? 'sim' : 'nao'), sinal, compra };
}

/** O aviso do rodapé. `base` é o caminho até a raiz do site (ex.: "../"). */
export function avisoHtml(base = '') {
  return `<div class="aviso-pixel" role="dialog" aria-live="polite" aria-label="Medição dos anúncios">
  <p>Posso medir esta visita para a Meta (Facebook e Instagram)? Assim a gente sabe quais anúncios ajudam de verdade. Vai só a página e a compra, sem nome e sem e-mail. <a href="${base}privacidade.html">Saiba mais</a></p>
  <div class="aviso-pixel-botoes"><button type="button" class="botao" data-pixel="sim">Pode medir</button><button type="button" class="botao claro" data-pixel="nao">Agora não</button></div>
</div>`;
}

/** O caminho da página até a raiz do site ("" na raiz, "../" numa pasta). */
const baseDa = (caminho) => '../'.repeat(Math.max(0, caminho.split('/').filter(Boolean).filter((s) => !s.endsWith('.html')).length));

let atual = null;
let compraPendente = null; // a compra que chegou antes do "Pode medir" (a pessoa responde o aviso depois)

/** Liga o pixel na página: o aviso (se ainda não escolheu), a visita e os botões de comprar e do Direct. */
export function ligarPixel(doc, janela) {
  const pagina = janela.location;
  const g = guarda(janela);
  const px = criarPixel({ g, pagina, enviar: (u) => { const img = new janela.Image(1, 1); img.referrerPolicy = 'no-referrer'; img.src = u; } });
  atual = px;
  const visita = () => px.sinal('PageView');
  doc.addEventListener('click', (e) => {
    const alvo = e.target?.closest?.('[data-comprar], a[data-frase], a[data-receber]');
    if (!alvo) return;
    if (alvo.matches('[data-comprar]')) {
      const c = alvo.dataset.comprar ? COMPRAS[alvo.dataset.comprar] : COMPRAS.pineCost;
      if (c?.valor) px.sinal('InitiateCheckout', { value: c.valor, currency: 'BRL' });
    } else {
      px.sinal('Contact');
    }
  });
  if (px.escolha()) { visita(); return px; }
  if (!g.por('pine:teste', '1')) return px; // sem armazenamento: nem pergunta
  g.tirar('pine:teste');
  const caixa = doc.createElement('div');
  caixa.innerHTML = avisoHtml(baseDa(pagina.pathname));
  const aviso = caixa.firstElementChild;
  aviso.addEventListener('click', (e) => {
    const b = e.target?.closest?.('[data-pixel]');
    if (!b) return;
    px.escolher(b.dataset.pixel);
    aviso.remove();
    visita();
    if (compraPendente) { px.compra(...compraPendente); compraPendente = null; }
  });
  doc.body.append(aviso);
  return px;
}

/** A compra (página pagamento-confirmado): conta uma vez só, se a pessoa deixou medir. */
export function medirCompra(codigo, centavos) {
  if (!atual) return false;
  if (atual.escolha() === null) { compraPendente = [codigo, centavos]; return false; }
  return atual.compra(codigo, centavos);
}
