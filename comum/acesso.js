// O ACESSO DO PINE COST PRO (12/11/2026). O Andrews: "Pagou, recebe já o acesso... é ele que vai gerar todo o serviço."
// Quem compra a ficha técnica no site usa a ferramenta (app/) sozinho, sem passar pelo Direct.
//
// O caminho: a Stripe → pagamento-confirmado/?cs=... → a função `pinecost` do Supabase confere a sessão NA STRIPE e devolve
// um código de acesso → ele fica guardado neste navegador → a ferramenta abre com as fichas da pessoa, e a cozinha dela
// fica salva no Supabase (para não se perder) e neste navegador.
// O que fica no navegador (localStorage, liberado pelo Andrews em 12/11): o código de acesso, a cozinha e os guias já vistos.
// Nada de nome, telefone ou CPF. A função e as tabelas: supabase/funcoes/pinecost/ e supabase/migracao-007-pine-cost-no-site.sql.

export const FUNCAO = 'https://foijkkdofcdzgohrixqm.supabase.co/functions/v1/pinecost';
export const FICHAS_GRATIS = 3; // sem compra, a cozinha da pessoa tem até 3 fichas (a conta grátis, sem o preço certo)
const RX_TOKEN = /^[0-9a-f]{64}$/;
const CHAVES = { acesso: 'pinecost:acesso', cozinha: 'pinecost:minha-cozinha', guia: 'pinecost:guia:' };

/** O navegador pode bloquear o localStorage (aba anônima, Safari): tudo aqui funciona sem ele, só não lembra. */
export function guarda(janela = globalThis) {
  const ls = () => { try { return janela.localStorage ?? null; } catch { return null; } };
  return {
    ler: (k) => { try { return ls()?.getItem(k) ?? null; } catch { return null; } },
    por: (k, v) => { try { const l = ls(); if (!l) return false; l.setItem(k, v); return true; } catch { return false; } },
    tirar: (k) => { try { ls()?.removeItem(k); } catch { /* sem guarda */ } },
  };
}

export const tokenValido = (t) => typeof t === 'string' && RX_TOKEN.test(t);

/** O código de acesso: o do link (?acesso=..., que some da barra) ou o guardado. Guarda o do link. */
export function lerAcesso(janela = globalThis, g = guarda(janela)) {
  const loc = janela.location;
  const doLink = new URLSearchParams(loc?.search ?? '').get('acesso');
  if (tokenValido(doLink)) {
    g.por(CHAVES.acesso, doLink);
    try { janela.history?.replaceState(null, '', `${loc.pathname}${loc.hash ?? ''}`); } catch { /* fica na barra */ }
    return doLink;
  }
  const guardado = g.ler(CHAVES.acesso);
  return tokenValido(guardado) ? guardado : null;
}
export const guardarAcesso = (token, g = guarda()) => (tokenValido(token) ? g.por(CHAVES.acesso, token) : false);
export const esquecerAcesso = (g = guarda()) => g.tirar(CHAVES.acesso);

/** O link que abre a ferramenta em outro aparelho (a pessoa guarda). */
export const linkDeAcesso = (token, origem = globalThis.location?.origin ?? 'https://pineapplepro.com.br') => `${origem}/app/?acesso=${token}`;

/** Fala com a função. Devolve o JSON (com ok) ou { ok: false, porque: 'rede' }. */
export async function pedir(corpo, buscar = globalThis.fetch) {
  try {
    const r = await buscar(FUNCAO, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
    const j = await r.json().catch(() => ({}));
    return { ok: false, ...j, status: r.status };
  } catch {
    return { ok: false, porque: 'rede' };
  }
}
export const ativar = (cs, token, buscar) => pedir({ acao: 'ativar', cs, ...(tokenValido(token) ? { token } : {}) }, buscar);
export const carregar = (token, buscar) => pedir({ acao: 'carregar', token }, buscar);
export const salvarNaNuvem = (token, dados, versao, buscar) => pedir({ acao: 'salvar', token, dados, versao }, buscar);

/** A cozinha da pessoa guardada neste navegador ({ dados, versao, quando }) ou null. */
export function cozinhaLocal(g = guarda()) {
  try {
    const x = JSON.parse(g.ler(CHAVES.cozinha) ?? 'null');
    return x && typeof x === 'object' && x.dados && typeof x.dados === 'object' ? x : null;
  } catch { return null; }
}
export const guardarCozinhaLocal = (dados, versao, g = guarda()) => g.por(CHAVES.cozinha, JSON.stringify({ dados, versao: versao ?? 0, quando: Date.now() }));

/** As fichas que a cozinha usa: cada produto do cardápio é uma ficha. */
export const fichasUsadas = (dados) => (Array.isArray(dados?.cardapio) ? dados.cardapio.length : 0);
export const limiteDeFichas = (acesso) => (acesso && Number.isFinite(acesso.fichas) ? acesso.fichas : FICHAS_GRATIS);

/**
 * Grava sem travar a tela: espera a pessoa parar de digitar (ms) e manda a última versão.
 * `gravar(dados)` devolve uma promessa; `aoMudar(estado)` recebe 'salvando', 'salvo', 'so-aqui' ou 'erro'.
 */
export function criarSalvador({ gravar, aoMudar = () => {}, ms = 1500, relogio = globalThis }) {
  let tempo = null;
  let pendente = null;
  let rodando = false;
  async function rodar() {
    if (rodando || !pendente) return;
    rodando = true;
    const dados = pendente;
    pendente = null;
    aoMudar('salvando');
    try { aoMudar(await gravar(dados)); } catch { aoMudar('erro'); }
    rodando = false;
    if (pendente) rodar();
  }
  return {
    agendar(dados) {
      pendente = dados;
      relogio.clearTimeout(tempo);
      tempo = relogio.setTimeout(rodar, ms);
    },
    agora() { relogio.clearTimeout(tempo); return rodar(); },
  };
}

// O GUIA DA 1ª VEZ: em cada passo, um balão curto diz o que fazer ali. Some no "Entendi" ou quando a pessoa faz a 1ª coisa,
// e não volta mais neste navegador. "Pôr um de exemplo" já põe um item na cozinha dela (marcado "exemplo").
export const GUIAS = {
  despensa: { titulo: 'Comece pela despensa', texto: 'Aqui entra tudo o que você compra: o nome, o pacote (1 kg, 900 ml) e quanto você paga nele. É daqui que sai o custo de cada ficha.', botao: 'Pôr um ingrediente de exemplo', acao: 'mais-insumo' },
  receitas: { titulo: 'O que você prepara antes', texto: 'O molho, a massa, o tempero da casa. Diga quanto rende e o que vai nela; depois ela entra nos produtos como um ingrediente só.', botao: 'Criar uma receita', acao: 'mais-receita' },
  cardapio: { titulo: 'O que você vende', texto: 'Cada produto do cardápio vira uma ficha técnica: o que vai nele, a embalagem e o preço no balcão e no app.', botao: 'Criar o 1º produto', acao: 'mais-produto' },
  meio: { titulo: 'O meio a meio', texto: 'Para pizza: escolha 2 sabores e veja quanto sobra cobrando pelo mais caro ou pela média.', botao: null, acao: null },
  compras: { titulo: 'A lista de compras', texto: 'Diga quantos de cada produto você vai fazer na semana. A ferramenta tira o que já tem no estoque e diz o que comprar.', botao: null, acao: null },
  loja: { titulo: 'As contas da loja', texto: 'Aluguel, luz, gás, funcionários e quanto você vende por mês. Isso entra no preço certo de todas as fichas.', botao: 'Pôr uma conta', acao: 'mais-conta' },
};
export const guiaVisto = (passo, g = guarda()) => g.ler(CHAVES.guia + passo) === '1';
export const marcarGuia = (passo, g = guarda()) => g.por(CHAVES.guia + passo, '1');
