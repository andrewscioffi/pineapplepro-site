// A COZINHA DE EXEMPLO DO PINE COST PRO (07/11/2026): uma pizzaria com despensa, receitas da casa (uma dentro da outra),
// a base da pizza, 5 sabores, meio a meio, adicionais e o plano da semana. E os 4 exemplos oficiais da ferramenta, como cozinha.
// TUDO AQUI É EXEMPLO (vai marcado "exemplo" na tela). Nenhum dado de cliente: nada das fichas feitas para clientes.
//
// O preço de cada insumo:
//   preco_de: 'x-bacon'  = o mesmo pacote e o mesmo preço do exemplo oficial (setores/cardapio/ferramentas/ficha-tecnica/exemplos/)
//   preco_exemplo: true  = preço de exemplo, só para a demonstração (os 9 conferidos pelo Andrews em 07/11: "estão bons")
// Um teste confere as duas coisas (testes/cozinha.test.mjs).
import { EXEMPLOS } from './exemplos.js';
import { cozinhaDaFicha } from './cozinha.js';

export const PIZZARIA = {
  exemplo: true,
  negocio: 'Pizzaria do Bairro',
  // as contas da loja: sem elas, a ficha usa a média do ramo (15% a 25% do preço), como no robô
  loja: { regime: 'simples', faturamento_mes: '', custos_fixos: [] },

  // 1. A DESPENSA: o que se compra
  despensa: [
    { id: 'farinha', nome: 'Farinha de trigo', categoria: 'Massa e secos', pacote: '1 kg', preco_pacote: 5, estoque: '8 kg', minimo: '10 kg', preco_de: 'frango-a-passarinho' },
    { id: 'fermento', nome: 'Fermento biológico seco', categoria: 'Massa e secos', pacote: '500 g', preco_pacote: 30, estoque: '300 g', minimo: '250 g', preco_exemplo: true },
    { id: 'sal', nome: 'Sal', categoria: 'Massa e secos', pacote: '1 kg', preco_pacote: 3, estoque: '2 kg', minimo: '1 kg', preco_exemplo: true },
    { id: 'acucar', nome: 'Açúcar', categoria: 'Massa e secos', pacote: '5 kg', preco_pacote: 22.5, estoque: '3 kg', minimo: '1 kg', preco_de: 'bolo-de-cenoura' },
    { id: 'oleo', nome: 'Óleo', categoria: 'Massa e secos', pacote: '900 ml', preco_pacote: 7.65, estoque: '2 pacotes', minimo: '2 pacotes', preco_de: 'bolo-de-cenoura' },
    { id: 'tomate', nome: 'Tomate', categoria: 'Hortifrúti', pacote: '1 kg', preco_pacote: 8, estoque: '4 kg', minimo: '5 kg', preco_de: 'x-bacon' },
    { id: 'cebola', nome: 'Cebola', categoria: 'Hortifrúti', pacote: '1 kg', preco_pacote: 8, estoque: '3 kg', minimo: '2 kg', preco_de: 'parmegiana' },
    { id: 'alho', nome: 'Alho', categoria: 'Hortifrúti', pacote: '1 kg', preco_pacote: 20, estoque: '500 g', minimo: '500 g', preco_de: 'frango-a-passarinho' },
    { id: 'manjericao', nome: 'Manjericão', categoria: 'Hortifrúti', pacote: '100 g', preco_pacote: 4, estoque: '50 g', minimo: '50 g', preco_exemplo: true },
    { id: 'oregano', nome: 'Orégano', categoria: 'Temperos', pacote: '200 g', preco_pacote: 12, estoque: '150 g', minimo: '200 g', preco_exemplo: true },
    { id: 'queijo', nome: 'Muçarela', categoria: 'Frios', pacote: '4 kg', preco_pacote: 150, estoque: '6 kg', minimo: '8 kg', preco_de: 'parmegiana' },
    { id: 'requeijao', nome: 'Requeijão cremoso', categoria: 'Frios', pacote: '1,5 kg', preco_pacote: 42, estoque: '1,5 kg', minimo: '1,5 kg', preco_exemplo: true },
    { id: 'azeitona', nome: 'Azeitona', categoria: 'Frios', pacote: '1 kg', preco_pacote: 28, estoque: '1 kg', minimo: '1 kg', preco_exemplo: true },
    { id: 'linguica', nome: 'Calabresa', categoria: 'Carnes', pacote: '2,5 kg', preco_pacote: 72.5, estoque: '5 kg', minimo: '2,5 kg', preco_exemplo: true },
    { id: 'bacon-fatiado', nome: 'Bacon fatiado', categoria: 'Carnes', pacote: '1 kg', preco_pacote: 40, estoque: '1 kg', minimo: '1 kg', preco_de: 'x-bacon' },
    { id: 'peito', nome: 'Peito de frango', categoria: 'Carnes', pacote: '1 kg', preco_pacote: 22, estoque: '2 kg', minimo: '2 kg', preco_exemplo: true },
    { id: 'caixa', nome: 'Caixa de pizza', categoria: 'Embalagens', pacote: '50 un', preco_pacote: 95, estoque: '30 un', minimo: '50 un', preco_exemplo: true },
    { id: 'guardanapo', nome: 'Guardanapo', categoria: 'Embalagens', pacote: '1000 un', preco_pacote: 20, estoque: '400 un', minimo: '500 un', preco_de: 'x-bacon' },
  ],

  // 2. AS RECEITAS DA CASA: cada uma é uma ficha própria e rende uma quantidade. O tempero entra no molho, e o molho no frango.
  receitas: [
    {
      id: 'tempero', nome: 'Tempero da casa', rende: '800 g', pronto: '200 g',
      itens: [{ usa: 'alho', vai: '200 g' }, { usa: 'cebola', vai: '500 g' }, { usa: 'oleo', vai: '100 ml' }, { usa: 'sal', vai: '50 g' }],
    },
    {
      id: 'molho', nome: 'Molho de tomate da casa', rende: '2 kg', pronto: '1 kg',
      itens: [{ usa: 'tomate', vai: '2,5 kg' }, { usa: 'tempero', vai: '100 g' }, { usa: 'oleo', vai: '50 ml' }, { usa: 'acucar', vai: '20 g' }, { usa: 'oregano', vai: '5 g' }],
    },
    {
      id: 'massa', nome: 'Massa de pizza', rende: '8 un', pronto: '',
      itens: [{ usa: 'farinha', vai: '2 kg' }, { usa: 'oleo', vai: '80 ml' }, { usa: 'sal', vai: '40 g' }, { usa: 'fermento', vai: '20 g' }, { usa: 'acucar', vai: '20 g' }],
    },
    {
      id: 'frango-desfiado', nome: 'Frango desfiado', rende: '1,5 kg', pronto: '',
      itens: [{ usa: 'peito', vai: '2 kg' }, { usa: 'tempero', vai: '150 g' }, { usa: 'molho', vai: '300 g' }, { usa: 'oleo', vai: '30 ml' }],
    },
  ],

  // A BASE: o que vai em todo sabor da pizza grande (no meio a meio, ela vai inteira)
  bases: [
    {
      id: 'grande', nome: 'Pizza grande',
      itens: [{ usa: 'massa', vai: '1 un' }, { usa: 'molho', vai: '150 g' }],
      embalagem: [{ usa: 'caixa', vai: '1 un' }, { usa: 'guardanapo', vai: '4 un' }],
    },
  ],

  // 3. O CARDÁPIO: a cobertura de cada sabor (a base vem da pizza grande). Os preços de venda são de exemplo.
  cardapio: [
    { id: 'mucarela', nome: 'Muçarela', base: 'grande', precos: { balcao: 42, app: 42 },
      itens: [{ usa: 'queijo', vai: '300 g' }, { usa: 'tomate', vai: '60 g' }, { usa: 'azeitona', vai: '30 g' }, { usa: 'oregano', vai: '2 g' }] },
    { id: 'calabresa', nome: 'Calabresa', base: 'grande', precos: { balcao: 45, app: 45 },
      itens: [{ usa: 'linguica', vai: '200 g' }, { usa: 'cebola', vai: '80 g' }, { usa: 'azeitona', vai: '30 g' }, { usa: 'oregano', vai: '2 g' }] },
    { id: 'marguerita', nome: 'Marguerita', base: 'grande', precos: { balcao: 48, app: 48 },
      itens: [{ usa: 'queijo', vai: '300 g' }, { usa: 'tomate', vai: '100 g' }, { usa: 'manjericao', vai: '5 g' }, { usa: 'oregano', vai: '2 g' }] },
    { id: 'frango-requeijao', nome: 'Frango com requeijão', base: 'grande', precos: { balcao: 52, app: 52 },
      itens: [{ usa: 'frango-desfiado', vai: '200 g' }, { usa: 'requeijao', vai: '100 g' }, { usa: 'queijo', vai: '150 g' }, { usa: 'oregano', vai: '2 g' }] },
    { id: 'bacon', nome: 'Bacon', base: 'grande', precos: { balcao: 50, app: 50 },
      itens: [{ usa: 'queijo', vai: '250 g' }, { usa: 'bacon-fatiado', vai: '100 g' }, { usa: 'cebola', vai: '50 g' }, { usa: 'oregano', vai: '2 g' }] },
  ],

  // os adicionais: o que se cobra à parte
  adicionais: [
    { id: 'borda', nome: 'Borda recheada de requeijão', precos: { balcao: 10 }, itens: [{ usa: 'requeijao', vai: '80 g' }] },
    { id: 'bacon-extra', nome: 'Bacon extra', precos: { balcao: 7 }, itens: [{ usa: 'bacon-fatiado', vai: '50 g' }] },
  ],

  // 4. O MEIO A MEIO escolhido na tela (a regra mais comum: o sabor mais caro)
  meio_a_meio: { sabores: ['calabresa', 'frango-requeijao'], regra: 'mais_caro' },

  // 5. O PLANO DA SEMANA: quanto vai produzir (a lista de compras sai daqui)
  plano: [
    { produto: 'calabresa', quantidade: 40 },
    { produto: 'mucarela', quantidade: 25 },
    { produto: 'marguerita', quantidade: 10 },
    { produto: 'frango-requeijao', quantidade: 20 },
    { produto: 'bacon', quantidade: 10 },
    { meio: ['calabresa', 'frango-requeijao'], quantidade: 15 },
    { adicional: 'borda', quantidade: 20 },
    { adicional: 'bacon-extra', quantidade: 10 },
  ],
};

// ---------- AS CAMADAS A FUNDO (07/11/2026, à tarde) ----------
// O Andrews viu a v3 e pediu pra "ir mais a fundo em algumas camadas": a perda e o rendimento, os tamanhos e os adicionais
// e as contas da loja em reais. A ferramenta (app/) usa a pizzaria abaixo: a MESMA de cima (os mesmos insumos, os 9 preços
// que o Andrews conferiu, as receitas, os sabores e o plano), só com os campos novos. A PIZZARIA de cima fica como estava:
// a landing usa ela, e os números de lá não mudam.
// TUDO o que entra aqui é EXEMPLO (vai marcado "exemplo" na tela) e vai no relatório para o Andrews conferir.

/** O aproveitamento de cada insumo (o que sobra depois de limpar) e o que sai na limpeza. EXEMPLO. Os outros: 100%. */
export const APROVEITAMENTOS_EXEMPLO = {
  tomate: [90, 'o cabinho e as partes machucadas'],
  cebola: [90, 'a casca e as pontas'],
  alho: [85, 'a casca'],
  manjericao: [60, 'o talo (fica só a folha)'],
  azeitona: [80, 'o caroço'],
  peito: [70, 'o osso, a pele e a gordura'],
};

/** O preço de cada sabor na broto e na média (o da grande é o de sempre). EXEMPLO: no app, o mesmo do balcão, como na grande. */
export const PRECOS_TAMANHO_EXEMPLO = {
  mucarela: { broto: 26, media: 35 },
  calabresa: { broto: 28, media: 37 },
  marguerita: { broto: 30, media: 40 },
  'frango-requeijao': { broto: 32, media: 43 },
  bacon: { broto: 31, media: 42 },
};

/** As contas do mês da Pizzaria do Bairro, em reais. EXEMPLO: entram na tela só quando a pessoa toca em "pôr o exemplo". */
export const CONTAS_EXEMPLO = {
  faturamento_mes: 30000,
  custos_fixos: [
    { nome: 'Aluguel', por_mes: 1900 },
    { nome: 'Luz', por_mes: 560 },
    { nome: 'Água', por_mes: 150 },
    { nome: 'Gás', por_mes: 640 },
    { nome: 'Salários', por_mes: 3100 },
    { nome: 'Contador', por_mes: 380 },
    { nome: 'Internet', por_mes: 110 },
    { nome: 'Sistema', por_mes: 120 },
  ],
  maquininha_taxa: 2.9, // a média do débito e do crédito
  maquininha_parte: 55, // das vendas do balcão, o que passa na maquininha (o resto é Pix e dinheiro)
};

const copia = (x) => JSON.parse(JSON.stringify(x));

/** A Pizzaria do Bairro com as camadas a fundo: o aproveitamento, os 3 tamanhos, mais 1 adicional e as contas de exemplo. */
export const PIZZARIA_A_FUNDO = (() => {
  const d = copia(PIZZARIA);
  // 1. PERDA E RENDIMENTO: o aproveitamento de cada insumo (a quantidade das receitas passa a ser a limpa)
  for (const ins of d.despensa) {
    const x = APROVEITAMENTOS_EXEMPLO[ins.id];
    if (x) Object.assign(ins, { aproveitamento: x[0], sai: x[1], aproveitamento_exemplo: true });
  }
  // 2. TAMANHOS: a broto e a média, cada uma com a caixa dela (as 2 caixas novas são EXEMPLO); a receita é a da grande
  d.despensa.push(
    { id: 'caixa-broto', nome: 'Caixa de pizza broto', categoria: 'Embalagens', pacote: '50 un', preco_pacote: 60, estoque: '50 un', minimo: '50 un', preco_exemplo: true },
    { id: 'caixa-media', nome: 'Caixa de pizza média', categoria: 'Embalagens', pacote: '50 un', preco_pacote: 78, estoque: '50 un', minimo: '50 un', preco_exemplo: true },
  );
  d.tamanhos = [
    { id: 'broto', nome: 'Broto', diametro: 25, embalagem: [{ usa: 'caixa-broto', vai: '1 un' }, { usa: 'guardanapo', vai: '2 un' }] },
    { id: 'media', nome: 'Média', diametro: 30, embalagem: [{ usa: 'caixa-media', vai: '1 un' }, { usa: 'guardanapo', vai: '3 un' }] },
    { id: 'grande', nome: 'Grande', diametro: 35 },
  ];
  d.tamanhos_exemplo = true;
  d.bases[0].tamanho = 'grande';
  for (const p of d.cardapio) {
    const t = PRECOS_TAMANHO_EXEMPLO[p.id];
    if (t) p.precos_tamanho = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { balcao: v, app: v }]));
  }
  // os adicionais: a borda cresce pelo contorno (o diâmetro); o que vai por cima, pela área. O catupiry é o adicional novo
  const borda = d.adicionais.find((a) => a.id === 'borda');
  Object.assign(borda, { cresce: 'borda', tamanho: 'grande', precos_tamanho: { broto: { balcao: 7 }, media: { balcao: 9 } } });
  const bacon = d.adicionais.find((a) => a.id === 'bacon-extra');
  Object.assign(bacon, { cresce: 'area', tamanho: 'grande', precos_tamanho: { broto: { balcao: 4 }, media: { balcao: 6 } } });
  d.adicionais.push({ id: 'catupiry-extra', nome: 'Catupiry extra', cresce: 'area', tamanho: 'grande', precos: { balcao: 8 },
    precos_tamanho: { broto: { balcao: 5 }, media: { balcao: 7 } }, itens: [{ usa: 'requeijao', vai: '60 g' }], preco_exemplo: true });
  // no plano da semana, a broto e a média também (EXEMPLO): a lista compra a cobertura pela área e a caixa de cada uma
  const antesDoMeio = d.plano.findIndex((e) => e.meio);
  d.plano.splice(antesDoMeio, 0, { produto: 'calabresa', tamanho: 'broto', quantidade: 12 }, { produto: 'mucarela', tamanho: 'media', quantidade: 8 });
  // 3. AS CONTAS DA LOJA: começa com a média do ramo (como antes); as contas de exemplo entram pelo botão da tela
  d.loja_exemplo = copia(CONTAS_EXEMPLO);
  return d;
})();

/** As cozinhas da prévia: a pizzaria (o exemplo completo) e os 4 exemplos oficiais, cada um como uma cozinha de 1 ficha. */
export const COZINHAS = [
  { id: 'pizzaria', nome: 'Pizzaria do Bairro', sobre: 'o exemplo completo: despensa, receitas da casa, tamanhos, meio a meio, compras e as contas da loja', dados: PIZZARIA_A_FUNDO },
  ...Object.entries(EXEMPLOS).map(([id, e]) => ({ id, nome: `${e.negocio}: ${e.item}`, sobre: 'um exemplo oficial da ficha', dados: cozinhaDaFicha(e, id) })),
];
