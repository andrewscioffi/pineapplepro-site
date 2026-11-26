// OS VALORES DO SITE, NUM LUGAR SÓ (07/11/2026)
// Aqui ficam os preços, as frases do Direct, quais produtos estão abertos e qual cadeado aparece.
// As 3 telas (a home, a landing e a tela do usuário) leem este arquivo. Nenhum HTML tem preço escrito.
//
// Como mudar:
//   - um preço: troque o texto entre aspas em "precos", ISCA, SERVICOS ou MENSAIS (o teste só aceita os aprovados no portfólio v2, 26/11)
//   - abrir um produto: troque "trancado: true" por "trancado: false" (precisa ter frase e preço)
//   - o cadeado: troque o CADEADO por 'coroa', 'folha' ou 'fruta' (as 3 opções estão em cadeados.html)
//   - o preço de tabela (11/11/2026, tabela 3.0): "tabela" é a linha pequena embaixo do preço; some sozinha depois de LANCAMENTO_ATE
// Depois de mudar, rode os testes: node --test empresas/pineapple-pro/site/testes/

export const LINK_DIRECT = 'https://ig.me/m/pineapplepro_';

// A TABELA 3.0 (11/11/2026, o Andrews: "Pode aplicar"): o preço de hoje é o de lançamento, até esta data (fim do dia, hora de Brasília).
// Depois dela a linha "tabela" de cada produto não aparece mais. O preço só muda aqui, com a decisão do Andrews.
export const LANCAMENTO_ATE = '2026-12-31';
export const lancamentoAberto = (agora = Date.now()) => agora <= Date.parse(`${LANCAMENTO_ATE}T23:59:59-03:00`);

// A compra pela Stripe (08/11/2026). Link vazio = o botão "Comprar" não aparece no site.
// 12/11, o Andrews: os produtos baratos, validados e de entrega facilitada vão no modo real sem pedir; os links são os de
// estrategia/upgrade-3.0/LINKS-STRIPE-3.0.md. O Pine Cost é autoatendimento: pagou, a ferramenta libera na hora (comum/acesso.js).
// "valor" (12/11): o número que o pixel da Meta leva no "começou a compra" (comum/pixel.js); o teste confere com o texto.
export const COMPRA_PINE_COST = {
  link: 'https://buy.stripe.com/00wbJ16C6esH2698SafUQ00',
  texto: 'Comprar por R$ 47',
  valor: 47,
};
// 26/11 (portfólio v2, o Andrews: "Aprovo, aplica tudo"): só a isca se compra direto (o que o cliente faz sozinho).
// Os serviços feitos pela gente (vetor, cardápio, marca) saíram daqui: viram cartões com "a partir de" e o Direct (SERVICOS).
// Os links deles continuam na Stripe; só não aparecem mais no site.
export const COMPRAS = {
  pineCost: COMPRA_PINE_COST,
  mais10: { link: 'https://buy.stripe.com/14A6oH1hMckzaCF1pIfUQ01', texto: 'Mais 10 fichas por R$ 97', valor: 97 },
  pacote2: { link: 'https://buy.stripe.com/cNi00j0dI3O3aCF2tMfUQ02', texto: 'Levar as 18 por R$ 127', valor: 127 },
};

// A ISCA (portfólio v2, seção 1): o que chama atenção, o cliente faz sozinho e libera na hora.
//   compra: a chave em COMPRAS (o botão da Stripe); frase: a do Direct (o grátis); extra: o 2º botão, pequeno
export const ISCA = [
  {
    id: 'gratis', nome: '3 fichas grátis', preco: 'Grátis', frase: 'fichas', botao: 'Pedir no Direct',
    inclui: ['3 fichas técnicas, pelo Direct', 'Quanto sobra no balcão e no app'],
  },
  {
    id: 'pine-cost', nome: 'Pine Cost', preco: 'R$ 47', tabela: 'na tabela, R$ 97', compra: 'pineCost', destaque: true,
    inclui: ['8 fichas técnicas, você monta no site', 'O preço certo pra cobrar', 'Libera na hora · garantia de 7 dias'],
  },
  {
    id: 'pacote-2', nome: 'Pacote dos 2', preco: 'R$ 127', compra: 'pacote2', extra: 'mais10',
    inclui: ['O Pine Cost e mais 10 fichas', '18 fichas técnicas de uma vez'],
  },
];

// OS SERVIÇOS FEITOS PELA GENTE (portfólio v2, seção 2): pagamento único, sem "comprar agora". O botão é o Direct (frase "marca").
export const SERVICOS = [
  { id: 'vetor', nome: 'Vetorização da logo', entrega: 'A logo que você já tem, limpa e em vetor', preco: 'a partir de R$ 197' },
  { id: 'cardapio', nome: 'Cardápio', entrega: 'Pronto pra gráfica e pro digital, com as suas fotos revitalizadas', preco: 'a partir de R$ 497' },
  { id: 'marca-essencial', nome: 'Marca Essencial', entrega: 'Logo do zero, cores, letras e o cardápio', preco: 'a partir de R$ 1.497' },
  { id: 'marca-completa', nome: 'Marca Completa', entrega: 'A identidade inteira: logo, manual, sacola, fachada, uniforme e redes', preco: 'a partir de R$ 2.997' },
];

// OS MENSAIS (portfólio v2, seção 3): o que entregam e "fale com a gente" (frase "agencia"). Nunca o preço de fundador.
export const MENSAIS = [
  {
    id: 'presenca', nome: 'Presença', preco: 'a partir de R$ 997 por mês',
    inclui: ['12 posts por mês, editados na identidade da loja', 'As legendas e a fila no horário certo', 'O Pine Club incluso'],
  },
  {
    id: 'gestao', nome: 'Gestão completa', preco: 'a partir de R$ 1.997 por mês', destaque: true,
    inclui: ['Tudo da Presença', 'Tráfego pago: montagem, acompanhamento e relatório', 'Ficha técnica e cardápio do mês', '1 reunião por mês'],
  },
];
export const NOTA_MENSAIS = 'Contrato de 3 meses. A verba do anúncio é à parte, paga direto à Meta.';

// As 4 frases aprovadas. Cada uma cai no assunto certo do robô (testes/frases-do-direct.test.ts).
export const FRASES = {
  fichas: 'Quero as 3 fichas técnicas grátis 🍍',
  pineClub: 'Quero ser fundador do Pine Club 🍍',
  marca: 'Vocês fazem logo e cardápio? 🍍',
  agencia: 'Vocês fazem Instagram e tráfego? 🍍',
};

// Qual dos 3 cadeados 2D aparece (no menu, no "em breve" e onde o 3D não roda). O da vitrine é o 3D (comum/cadeado3d.js).
export const CADEADO = 'coroa'; // igual ao 3D: a alça com a coroa em cima

// Os produtos, na ordem da vitrine. Cada um tem a página dele (pagina), com a demonstração.
//   trancado: true  = na vitrine, atrás do vidro com o cadeado 3D; a página abre como prévia ("em breve"), sem preço e sem botão
//   trancado: false = aberto: o preço e o botão do Direct aparecem na vitrine e na página
// "cor" é o destaque da página do produto (só as cores da marca): amarelo, verde, laranja ou creme.
export const PRODUTOS = [
  {
    id: 'pine-cost',
    nome: 'Pine Cost Pro',
    o_que_e: 'Ficha técnica e preço certo',
    chamada: 'Quanto sobra de cada coisa que você vende',
    cor: 'amarelo',
    trancado: false,
    frase: 'fichas',
    pagina: 'pine-cost/',
    precos: { gratis: 'Grátis', pacote: 'a partir de R$ 47', dos2: 'R$ 127' },
    tabela: 'na tabela, R$ 97 · lançamento até 31/12',
    gratis_inclui: [
      '3 fichas técnicas: quanto sobra em cada venda, no balcão e no app',
    ],
    pacote_inclui: [
      'A conta completa, com a embalagem e as contas da sua loja',
      'O preço certo pra cobrar no balcão',
      '8 fichas técnicas no total',
    ],
    // 26/11 (portfólio v2): o Pacote dos 2, o Pine Cost e mais 10 de uma vez
    dos2_inclui: [
      'O Pine Cost e mais 10 fichas, de uma vez',
      '18 fichas técnicas no total',
    ],
  },
  // o vídeo sai do robô quando a pessoa manda um (o grátis vai com a marca da Pineapple no canto)
  {
    id: 'video', nome: 'Vídeo editado', o_que_e: 'O vídeo do seu produto, editado pra vender',
    chamada: 'Do vídeo do celular ao vídeo que dá fome', cor: 'verde', trancado: false, frase: 'fichas', pagina: 'video/',
    precos: { gratis: 'Grátis' },
  },
  // 07/11 (~04h), o Andrews: "pode abrir" (foto, vídeo, Pine Club e logo e cardápio, que o robô já vende)
  {
    id: 'pine-club', nome: 'Pine Club', o_que_e: 'O clube de fidelidade da sua loja, sem sorteio',
    chamada: 'O cliente que volta', cor: 'amarelo', trancado: false, frase: 'pineClub', pagina: 'pine-club/',
    precos: { pacote: 'a partir de R$ 47' },
    tabela: 'uma vez só · depois das 10 vagas ou de 31/12, R$ 147 por mês',
  },
  {
    id: 'marca', nome: 'Logo e cardápio', o_que_e: 'A logo, o cardápio e a marca inteira, feitos pela gente',
    chamada: 'A marca nítida em qualquer tamanho', cor: 'creme', trancado: false, frase: 'marca', pagina: 'marca/',
    // 26/11 (portfólio v2): preço de mercado, sem linha de tabela; o orçamento é no Direct
    precos: { pacote: 'a partir de R$ 197' },
  },
  // 10/11, o Andrews: "vamos ficar sem as fotos por enquanto". Para reabrir: trancado: false, frase: 'fichas',
  // precos: { gratis: 'Grátis', pacote: 'a partir de R$ 47' }, e as fotos de volta no que o Pine Cost inclui, na home e na landing
  {
    id: 'foto', nome: 'Foto com cara de cardápio', o_que_e: 'A foto do seu produto, pronta pro cardápio',
    chamada: 'A mesma comida, com a luz certa', cor: 'laranja', trancado: true, pagina: 'foto/', precos: {},
  },
  {
    id: 'postagem', nome: 'Postagem automática', o_que_e: 'O Instagram postando no horário certo',
    chamada: 'Post aprovado sai sozinho, na hora dele', cor: 'verde', trancado: true, pagina: 'postagem/', precos: {},
  },
  {
    id: 'cardapio-digital', nome: 'Cardápio digital', o_que_e: 'O cardápio no celular do cliente',
    chamada: 'O preço certo direto no cardápio', cor: 'laranja', trancado: true, pagina: 'cardapio-digital/', precos: {},
  },
];

/** O produto pelo id (ou undefined). */
export const produto = (id) => PRODUTOS.find((p) => p.id === id);

// OS 3 CADEADOS DE ABACAXI (traço fino, a coroa com as folhas pontudas da marca). Desenho de 32 × 32, na cor do texto.
const CORPO = '<rect x="7" y="16" width="18" height="13" rx="3.5"/>';
const FECHADURA = '<circle cx="16" cy="21.6" r="1.7"/><path d="M16 23.3v2.2"/>';
const r2 = (n) => Math.round(n * 100) / 100;
// uma folha pontuda (como as da logo): nasce em (x, y), sobe "alto" e pode girar para o lado
const folha = (x, y, alto, giro = 0, largura = 0.36) => {
  const [l, a, b] = [r2(alto * largura), r2(alto * 0.28), r2(alto * 0.72)];
  return `<path d="M${x} ${y}c-${l} -${a} -${l} -${b} 0 -${alto}c${l} ${a} ${l} ${b} 0 ${alto}z"${giro ? ` transform="rotate(${giro} ${x} ${y})"` : ''}/>`;
};

export const CADEADOS = {
  // 1. o arco redondo de sempre, com a coroa de 3 folhas em cima
  coroa: `<path d="M11.5 16v-2.6a4.5 4.5 0 0 1 9 0V16"/>${folha(16, 8.4, 6.8)}${folha(16, 8.9, 5.4, -52)}${folha(16, 8.9, 5.4, 52)}${CORPO}${FECHADURA}`,
  // 2. o próprio arco vira a folha do meio (pontudo), com 2 folhas pequenas nos ombros
  folha: `<path d="M10.8 16v-2.6c0-3.6 2.1-7 5.2-9.6c3.1 2.6 5.2 6 5.2 9.6V16"/>${folha(10.4, 11.6, 4.4, -42)}${folha(21.6, 11.6, 4.4, 42)}${CORPO}${FECHADURA}`,
  // 3. sem arco: a coroa nasce direto do corpo do cadeado, como as 3 folhas de cima da logo (a fruta trancada)
  fruta: `<rect x="7" y="14.5" width="18" height="14.5" rx="4"/>${folha(16, 14, 10.4, 0, 0.4)}${folha(16, 14.2, 8.4, -50, 0.4)}${folha(16, 14.2, 8.4, 50, 0.4)}<circle cx="16" cy="20.8" r="1.7"/><path d="M16 22.5v2.4"/>`,
};

/** O SVG do cadeado (o escolhido em CADEADO, ou outro pelo nome). Enfeite: o nome do produto já diz tudo. */
export function cadeadoSvg(qual = CADEADO) {
  const desenho = CADEADOS[qual] ?? CADEADOS[CADEADO];
  return `<svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${desenho}</svg>`;
}
