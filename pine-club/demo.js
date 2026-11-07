// AS CONTAS DA DEMONSTRAÇÃO DO PINE CLUB (07/11/2026). Sem tela: o teste roda no Node (testes/pine-club.test.mjs).
// Tudo segue o clube de verdade (setores/pine-club/app/supabase/, só lido):
//   - só a loja dá selo; cada selo soma 1; usar o prêmio gasta os selos da meta e o que sobra fica (dar_selo, usar_premio)
//   - "voltaram" = quem já ganhou 2 selos ou mais; "sumiu" = mais de 30 dias sem pedido (calc_numeros)
//   - a lista de quem sumiu só tem quem deu o aceite e não foi chamado nos últimos 30 dias (reativacao)
//   - a mensagem de volta é a padrão do clube, com o {loja} trocado antes do {nome} (reativacao)
//   - o presente de boas-vindas só aparece se ainda cabe no limite do mês: o que já saiu + o custo dele ≤ limite (pagina)
//   - o código do cliente: 2 letras da loja, um traço e 4 números (ex. do piloto: ZE-4821)
//   - (v3) o mês do clube: a conta da hipótese da pessoa (quantos entram, quantas vezes voltam), com as mesmas regras
// O custo de cada presente é o da ficha técnica (ingredientes + embalagem), pela calculadora de verdade (calculadora/contas.mjs).
// Todo dado daqui é de exemplo e aparece marcado "exemplo" na tela.

export const NOME_PADRAO = 'Sua loja';
export const PREFIXO_PADRAO = 'SL';
export const METAS = [5, 8, 10]; // o clube aceita de 2 a 30; o padrão dele é 8
export const META_PADRAO = 8;
export const DIAS_SUMIU = 30;
export const LIMITES = [3000, 5000, 10000]; // o limite do mês para presentes, em centavos (exemplo: o dono escolhe)
export const LIMITE_PADRAO = 5000;
export const MENSAGEM_PADRAO = 'Oi, {nome}! Sentimos sua falta aqui na {loja}. Seu cartão do clube continua valendo. Bora pedir hoje?';

/** O texto do aceite, igual ao do clube (a pessoa marca se quiser). */
export const textoDoAceite = (loja) => `Aceito receber ofertas da ${nomeDaLoja(loja)} pelo WhatsApp. Posso sair quando quiser.`;

// As fichas de exemplo (os 4 exemplos oficiais da ficha técnica, comum/exemplos.js): o nome curto do botão e o do prêmio.
export const FICHAS = [
  { id: 'x-bacon', curto: 'X-Bacon duplo', premio: '1 X-Bacon duplo' },
  { id: 'bolo-de-cenoura', curto: 'Fatia de bolo', premio: '1 fatia de bolo de cenoura' },
  { id: 'frango-a-passarinho', curto: 'Frango a passarinho', premio: '1 porção de frango a passarinho' },
  { id: 'parmegiana', curto: 'Parmegiana', premio: '1 parmegiana' },
];
/** A ficha da demonstração pelo id (ou a primeira). */
export const fichaDemo = (id) => FICHAS.find((f) => f.id === id) ?? FICHAS[0];
export const PREMIO_PADRAO = 'x-bacon';
// os 3 presentes de boas-vindas da demonstração (o cliente escolhe 1 de 3)
export const PRESENTES_DE_ENTRADA = ['bolo-de-cenoura', 'x-bacon', 'frango-a-passarinho'];

// ---------- a loja ----------

/** O nome da loja digitado: sem espaço sobrando e com até 40 letras. Vazio vira "Sua loja". */
export function nomeDaLoja(texto) {
  const t = String(texto ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
  return t || NOME_PADRAO;
}

const PEQUENAS = new Set(['A', 'O', 'E', 'DA', 'DE', 'DO', 'DAS', 'DOS', 'DI', 'DU', 'THE', 'N']);
const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** As 2 letras do código: as iniciais das 2 primeiras palavras (sem "da", "do"...) ou as 2 primeiras letras da palavra. */
export function prefixo(nome) {
  const palavras = semAcento(nomeDaLoja(nome)).toUpperCase().split(/[^A-Z0-9]+/).filter((p) => /^[A-Z]/.test(p));
  const fortes = palavras.filter((p) => !PEQUENAS.has(p));
  const usar = fortes.length ? fortes : palavras;
  const letras = usar.length >= 2 ? usar[0][0] + usar[1][0] : (usar[0] ?? '').replace(/[^A-Z]/g, '').slice(0, 2);
  return /^[A-Z]{2}$/.test(letras) ? letras : PREFIXO_PADRAO;
}

/** O código do cliente no balcão: "SL-4821". */
export const codigo = (nome, numero) => `${prefixo(nome)}-${numero}`;

/** A primeira letra da loja (a "logo" de quem ainda não mandou a logo). */
export const inicial = (nome) => nomeDaLoja(nome).charAt(0).toUpperCase();

// ---------- o cartão de selos ----------

/** O cartão: quantos selos aparecem, quantos faltam, se completou e quantos já ficam pro próximo cartão. */
export function cartao(selos, meta) {
  const total = Math.max(2, Math.min(30, Math.round(Number(meta) || META_PADRAO)));
  const tem = Math.max(0, Math.floor(Number(selos) || 0));
  return {
    total,
    cheios: Math.min(tem, total),
    faltam: Math.max(0, total - tem),
    completo: tem >= total,
    sobra: Math.max(0, tem - total),
  };
}

/** "Faltam 2 selos para o prêmio." · "Falta 1 selo para o prêmio." · "Cartão completo!" */
export function textoDoCartao(selos, meta) {
  const c = cartao(selos, meta);
  if (c.completo) return 'Cartão completo!';
  return c.faltam === 1 ? 'Falta 1 selo para o prêmio.' : `Faltam ${c.faltam} selos para o prêmio.`;
}

// ---------- os membros (de exemplo) ----------

/** Os membros de exemplo da demonstração. dias = dias desde o último pedido; ganhou = selos ganhos desde que entrou;
 *  presente = o presente de boas-vindas que escolheu ao entrar (null: entrou quando os do mês já tinham acabado). */
export function membrosDeExemplo() {
  return [
    { id: 'ana', nome: 'Ana', numero: '4821', selos: 6, ganhou: 6, dias: 2, aceite: true, chamada: false, presente: 'bolo-de-cenoura', presente_usado: true },
    { id: 'bruno', nome: 'Bruno', numero: '3157', selos: 3, ganhou: 3, dias: 9, aceite: true, chamada: false, presente: 'x-bacon', presente_usado: true },
    { id: 'carla', nome: 'Carla', numero: '6902', selos: 1, ganhou: 1, dias: 34, aceite: true, chamada: false, presente: 'frango-a-passarinho', presente_usado: true },
    { id: 'davi', nome: 'Davi', numero: '1186', selos: 1, ganhou: 1, dias: 41, aceite: false, chamada: false, presente: null, presente_usado: false },
  ];
}

/** O presente de boas-vindas no verso do cartão: o que ele escolheu ao entrar e se já usou. */
export function textoDoPresente(m) {
  if (!m?.presente) return 'Entrou sem presente: os do mês já tinham acabado.';
  const nome = fichaDemo(m.presente).curto;
  return m.presente_usado ? `${nome} · já usou` : `${nome} · usa no próximo pedido`;
}

/** O verso do cartão: o código e o que o clube guarda dele (só o nome, o WhatsApp e o aceite). */
export function versoDoCartao(m, loja) {
  return {
    codigo: codigo(loja, m.numero),
    presente: textoDoPresente(m),
    guarda: [
      { rotulo: 'Nome', valor: m.nome },
      { rotulo: 'WhatsApp', valor: '(44) 9 •••• ••••' }, // de exemplo, mascarado
      { rotulo: 'Aceite', valor: m.aceite ? 'sim, recebe ofertas da loja' : 'não: não recebe mensagem' },
    ],
  };
}

/** +1 selo (só a loja dá): soma 1 no cartão e no que ele já ganhou; o último pedido vira hoje. */
export const darSelo = (m) => ({ ...m, selos: m.selos + 1, ganhou: m.ganhou + 1, dias: 0, chamada: false });

/** Usar o prêmio: só com o cartão completo. Gasta os selos da meta; o que passou dela fica pro próximo cartão. */
export function usarPremio(m, meta) {
  const c = cartao(m.selos, meta);
  if (!c.completo) return null;
  return { ...m, selos: m.selos - c.total, dias: 0 };
}

export const voltou = (m) => m.ganhou >= 2;
export const sumiu = (m) => m.dias > DIAS_SUMIU;
/** Entra na lista de quem sumiu: sumiu há mais de 30 dias, deu o aceite e não foi chamado agora. */
export const naLista = (m) => sumiu(m) && m.aceite && !m.chamada;

/** Os números do painel do dono. */
export function numeros(membros) {
  return {
    membros: membros.length,
    voltaram: membros.filter(voltou).length,
    sumiram: membros.filter(sumiu).length,
    na_lista: membros.filter(naLista).length,
  };
}

/** A situação de cada membro na lista do dono, na ordem do que importa primeiro. */
export function situacaoDoMembro(m, meta) {
  if (cartao(m.selos, meta).completo) return { id: 'premio', texto: 'prêmio liberado' };
  if (sumiu(m)) {
    if (!m.aceite) return { id: 'sem-aceite', texto: `sumiu há ${m.dias} dias · sem aceite` };
    if (m.chamada) return { id: 'chamada', texto: 'chamada hoje' };
    return { id: 'sumiu', texto: `sumiu há ${m.dias} dias` };
  }
  if (voltou(m)) return { id: 'voltou', texto: 'voltou' };
  return { id: 'primeiro', texto: '1º pedido' };
}

/** A mensagem pronta para quem sumiu (como o banco: troca o {loja} e depois o {nome}). */
export function mensagemDeVolta(nome, loja, modelo = MENSAGEM_PADRAO) {
  return modelo.split('{loja}').join(nomeDaLoja(loja)).split('{nome}').join(String(nome ?? ''));
}

// ---------- o presente pela ficha ----------

/** O custo do presente pela ficha: o que custa pra fazer (ingredientes + embalagem), não o preço de venda. */
export const custoPelaFicha = (ficha) => ficha.totais.insumos_c;

/** O preço de balcão da ficha (o que o cliente pagaria). */
export const precoDeBalcao = (ficha) => ficha.canais.find((c) => c.id === 'balcao')?.preco_c ?? null;

/** O custo do prêmio dividido pelos pedidos do cartão (em centavos, arredondado). */
export const porPedido = (custo_c, meta) => Math.round(custo_c / cartao(0, meta).total);

/** Os presentes da demonstração, a partir das fichas já calculadas ({ id: ficha }). */
export function presentesDasFichas(fichas, ids = FICHAS.map((f) => f.id)) {
  return ids.filter((id) => fichas[id]).map((id) => ({
    id,
    nome: fichas[id].item,
    curto: FICHAS.find((f) => f.id === id)?.curto ?? fichas[id].item,
    premio: FICHAS.find((f) => f.id === id)?.premio ?? `1 ${fichas[id].item}`,
    custo_c: custoPelaFicha(fichas[id]),
    balcao_c: precoDeBalcao(fichas[id]),
    ingredientes_c: fichas[id].totais.ingredientes_c,
    embalagem_c: fichas[id].totais.embalagem_c,
  }));
}

/** Os presentes que o cliente vê agora: só os que ainda cabem no limite (o que já saiu + o custo dele ≤ limite). */
export const oferecidos = (presentes, saiu_c, limite_c) => presentes.filter((p) => saiu_c + p.custo_c <= limite_c);

/** Esgotado: a loja tem presente, mas nenhum cabe mais neste mês (o clube segue dando selo). */
export const esgotado = (presentes, saiu_c, limite_c) => presentes.length > 0 && oferecidos(presentes, saiu_c, limite_c).length === 0;

/** Quantos ainda cabem no mês. */
export const cabem = (custo_c, saiu_c, limite_c) => (custo_c > 0 ? Math.max(0, Math.floor((limite_c - saiu_c) / custo_c)) : 0);

/** Alguém entrou e escolheu o presente: o custo dele sai do limite do mês. Presente que não cabe não é escolhido. */
export function escolher(estado, id, presentes) {
  const p = oferecidos(presentes, estado.saiu_c, estado.limite_c).find((x) => x.id === id);
  if (!p) return estado;
  return { ...estado, saiu_c: estado.saiu_c + p.custo_c, escolhidos: (estado.escolhidos ?? 0) + 1 };
}

/** Quanto do limite já saiu, de 0 a 1 (a barra do painel). */
export const usoDoLimite = (saiu_c, limite_c) => (limite_c > 0 ? Math.min(1, Math.max(0, saiu_c / limite_c)) : 1);

/** A barra do prêmio no painel do dono: o custo do prêmio em relação ao mais caro dos prêmios (de 0 a 1). */
export const tamanhoDoPremio = (custo_c, presentes) => {
  const maior = Math.max(0, ...presentes.map((p) => p.custo_c));
  return maior > 0 ? Math.min(1, Math.max(0, custo_c / maior)) : 0;
};

// ---------- o mês do clube (v3): a conta da hipótese da pessoa ----------

/** Os 2 controles do mês: quantos clientes entram e quantas vezes cada um volta. */
export const CLIENTES = { min: 1, max: 100, padrao: 20 };
export const VOLTAS = { min: 1, max: 12, padrao: 4 };
const inteiroEntre = (v, min, max) => Math.max(min, Math.min(max, Math.round(Number(v) || 0)));

/** O presente mais caro entre os que ainda cabem no limite (null: nenhum cabe). */
export function maisCaroQueCabe(presentes, saiu_c, limite_c) {
  return oferecidos(presentes, saiu_c, limite_c).reduce((a, p) => (!a || p.custo_c > a.custo_c ? p : a), null);
}

/**
 * O mês do clube pela hipótese da pessoa. Não é resultado: é a conta do que ela disse, pelas regras do clube de verdade.
 *   clientes  quantos entram no clube no mês
 *   voltas    quantas vezes cada um volta no mês (cada volta = 1 pedido = 1 selo; só a loja dá o selo)
 *   meta      os selos do cartão; premio_c, o custo do prêmio pela ficha
 *   presentes os presentes de boas-vindas (com o custo pela ficha); limite_c, o limite do mês para eles
 * As regras: o cartão completo vira 1 prêmio e gasta os selos da meta (o que sobra fica no cartão); o presente de
 * boas-vindas só sai se cabe no limite; na conta, cada um pega o mais caro que ainda cabe (o pior caso para o dono);
 * quando nenhum cabe, o cliente entra sem presente e junta selo do mesmo jeito.
 */
export function mesDoClube({ clientes, voltas, meta, premio_c = 0, presentes = [], limite_c = 0 }) {
  const n = inteiroEntre(clientes, 0, CLIENTES.max);
  const v = inteiroEntre(voltas, 0, VOLTAS.max);
  const total = cartao(0, meta).total;
  const premiosCada = Math.floor(v / total);
  let mes = { limite_c, saiu_c: 0, escolhidos: 0 };
  const escolhas = [];
  for (let i = 0; i < n; i++) {
    const p = maisCaroQueCabe(presentes, mes.saiu_c, limite_c);
    if (!p) break;
    mes = escolher(mes, p.id, presentes);
    escolhas.push(p.id);
  }
  const pedidos = n * v;
  const premios = n * premiosCada;
  const custo_premios_c = premios * Math.max(0, Math.round(premio_c));
  const total_c = mes.saiu_c + custo_premios_c;
  return {
    clientes: n,
    voltas: v,
    meta: total,
    pedidos,
    premios,
    premios_cada: premiosCada,
    no_cartao: v - premiosCada * total, // os selos que ficam no cartão de cada um no fim do mês
    com_presente: escolhas.length,
    sem_presente: n - escolhas.length,
    escolhas,
    custo_presentes_c: mes.saiu_c,
    custo_premios_c,
    total_c,
    por_pedido_c: pedidos ? Math.round(total_c / pedidos) : 0,
    uso_limite: usoDoLimite(mes.saiu_c, limite_c),
    esgotou: presentes.length > 0 && escolhas.length < n,
  };
}
