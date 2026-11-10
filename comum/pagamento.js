// A PÁGINA "PAGAMENTO CONFIRMADO" (08/11/2026). A Stripe devolve a pessoa com o número da sessão no endereço (?cs=...).
// Daqui sai um código de 8 letras, que o robô confere na própria Stripe: esta página não confirma nada sozinha.
// O número da sessão sai da barra de endereço logo depois da conta; fica só o código, no pedaço do link que não vai pra internet (#).
// A conta é igual à do robô (setores/cardapio/bot/src/stripe.ts; testes/pagamento.test.mjs confere).
import { LINK_DIRECT } from '../valores.js';

const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const RX_SESSAO = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
const RX_CODIGO = /^[2-9A-HJ-NP-Z]{8}$/;

export async function codigoDaSessao(id, subtle = globalThis.crypto.subtle) {
  const b = new Uint8Array(await subtle.digest('SHA-256', new TextEncoder().encode(id)));
  let n = 0;
  for (let i = 0; i < 5; i++) n = n * 256 + b[i];
  let codigo = '';
  for (let i = 0; i < 8; i++) { codigo = ALFABETO[n % 32] + codigo; n = Math.floor(n / 32); }
  return codigo;
}

export const fraseDoCodigo = (codigo) => `Paguei 🍍 código ${codigo}`;

/** O que veio no endereço: a sessão (chegou agora da Stripe), o código (recarregou a página) ou nada. */
export function lerEndereco(busca, hash) {
  const cs = new URLSearchParams(busca).get('cs') ?? '';
  if (RX_SESSAO.test(cs)) return { sessao: cs };
  const c = new URLSearchParams(String(hash).replace(/^#/, '')).get('c') ?? '';
  return RX_CODIGO.test(c) ? { codigo: c } : {};
}

/** Liga a página. Devolve o código (ou null), e os testes usam. `copiar` é o copiarFrase do site.js. */
export async function ligarConfirmacao(doc, janela, copiar) {
  const { sessao, codigo: guardado } = lerEndereco(janela.location.search, janela.location.hash);
  const codigo = sessao ? await codigoDaSessao(sessao, janela.crypto?.subtle) : guardado ?? null;
  doc.querySelector('[data-com-codigo]').hidden = !codigo;
  doc.querySelector('[data-sem-codigo]').hidden = !!codigo;
  if (!codigo) return null;
  if (sessao) janela.history.replaceState(null, '', `${janela.location.pathname}#c=${codigo}`);

  const frase = fraseDoCodigo(codigo);
  doc.querySelector('[data-codigo]').textContent = codigo;
  doc.querySelector('[data-frase-codigo]').textContent = `Ou mande: “${frase}”`;
  const botao = doc.querySelector('[data-receber]');
  const aviso = doc.querySelector('[data-aviso]');
  botao.href = LINK_DIRECT;
  botao.addEventListener('click', () => {
    const clip = janela.navigator?.clipboard;
    copiar(frase, { copiar: clip?.writeText ? (t) => clip.writeText(t) : undefined, mostrar: (m) => { aviso.textContent = m; } });
  });
  return codigo;
}
