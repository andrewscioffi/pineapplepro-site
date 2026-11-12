// A PÁGINA "PAGAMENTO CONFIRMADO" (08/11/2026). A Stripe devolve a pessoa com o número da sessão no endereço (?cs=...).
// Daqui sai um código de 8 letras, que o robô confere na própria Stripe: esta página não confirma nada sozinha.
// O número da sessão sai da barra de endereço logo depois da conta; fica só o código, no pedaço do link que não vai pra internet (#).
// A conta é igual à do robô (setores/cardapio/bot/src/stripe.ts; testes/pagamento.test.mjs confere).
// 12/11 (o Andrews: "Pagou, recebe já o acesso"): antes do código, a página pergunta à função `pinecost` (comum/acesso.js):
//   - o Pine Cost (a ferramenta): o acesso libera na hora, sem Direct ("Abrir a minha cozinha")
//   - o serviço (a logo, o cardápio, a marca, a agência): o código e o Direct, porque quem faz é um dos nossos
//   - sem resposta (sem internet, a função fora): o código e o Direct, como era
import { LINK_DIRECT } from '../valores.js';
import * as A from './acesso.js';

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

/** O que veio no endereço: a sessão (chegou agora da Stripe, ou guardada no # ao recarregar), o código ou nada. */
export function lerEndereco(busca, hash) {
  const cs = new URLSearchParams(busca).get('cs') ?? '';
  if (RX_SESSAO.test(cs)) return { sessao: cs };
  const h = new URLSearchParams(String(hash).replace(/^#/, ''));
  const c = h.get('c') ?? '';
  const s = h.get('s') ?? '';
  if (RX_CODIGO.test(c)) return RX_SESSAO.test(s) ? { codigo: c, sessao: s } : { codigo: c };
  return {};
}

/** Liga a página. Devolve o código (ou null), e os testes usam. `copiar` é o copiarFrase do site.js. */
export async function ligarConfirmacao(doc, janela, copiar, { buscar = janela.fetch?.bind(janela) } = {}) {
  const { sessao, codigo: guardado } = lerEndereco(janela.location.search, janela.location.hash);
  const codigo = sessao ? await codigoDaSessao(sessao, janela.crypto?.subtle) : guardado ?? null;
  // a sessão sai da barra (fica só no #, que não vai pra internet): recarregar a página ainda libera
  if (sessao) janela.history.replaceState(null, '', `${janela.location.pathname}#c=${codigo}&s=${sessao}`);
  const liberado = doc.querySelector('[data-liberado]');
  if (sessao && liberado) {
    const g = A.guarda(janela);
    const tinha = A.lerAcesso({ location: { search: '' } }, g);
    const r = await A.ativar(sessao, tinha, buscar);
    if (r.ok && r.tipo === 'ferramenta' && (r.token || (r.ja_usada && tinha))) {
      const token = r.token ?? tinha;
      A.guardarAcesso(token, g);
      mostrarLiberado(doc, janela, token, r.fichas);
      return codigo;
    }
    if (r.ok && r.tipo === 'ferramenta' && r.ja_usada) {
      doc.querySelector('[data-texto-codigo]').textContent = 'Esse pagamento já liberou o Pine Cost Pro em outro navegador. Abra pelo link que você guardou, ou me chama no Direct com o código que eu libero aqui.';
    } else if (r.ok && r.tipo === 'servico') {
      doc.querySelector('[data-texto-codigo]').textContent = `Agora é com a gente: ${r.nome} é feito por um dos nossos. Me chama no Direct com o código pra gente começar.`;
    }
  }
  doc.querySelector('[data-com-codigo]').hidden = !codigo;
  doc.querySelector('[data-sem-codigo]').hidden = !!codigo;
  if (!codigo) return null;

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

/** O Pine Cost liberado: o botão abre a ferramenta já com a cozinha da pessoa, e o link de acesso pode ser copiado. */
function mostrarLiberado(doc, janela, token, fichas) {
  const caixa = doc.querySelector('[data-liberado]');
  caixa.hidden = false;
  doc.querySelector('[data-com-codigo]').hidden = true;
  doc.querySelector('[data-sem-codigo]').hidden = true;
  const link = A.linkDeAcesso(token, janela.location.origin);
  doc.querySelector('[data-abrir-app]').href = link;
  const n = doc.querySelector('[data-fichas]');
  if (n && Number.isFinite(fichas)) n.textContent = String(fichas);
  const botao = doc.querySelector('[data-copiar-acesso]');
  botao?.addEventListener('click', async () => {
    try { await janela.navigator.clipboard.writeText(link); botao.textContent = 'Link copiado ✓'; } catch { janela.prompt?.('Copie o seu link de acesso:', link); }
  });
}
