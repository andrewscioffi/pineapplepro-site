// Contas da ficha técnica do Cardápio que Lucra (25/10/2026, método do Andrews).
// Tudo é feito pelo CÓDIGO, nunca pela IA. O dinheiro anda em centavos (número inteiro)
// para não errar arredondamento: R$ 9,70 vira 970.
//
// A ficha é uma ESTIMATIVA: o preço dos ingredientes muda a cada compra e em cada lugar,
// e custo fixo e imposto variam. Por isso a margem de lucro sai sempre como faixa ("entre X% e Y%").
// Os valores padrão ficam em padroes.json (taxa do app, custos fixos...) e imposto.json (imposto estimado por regime).

const UNIDADES = { g: ['g', 'gr', 'grama'], kg: ['kg', 'quilo', 'kilo'], ml: ['ml'], l: ['l', 'lt', 'litro'], un: ['un', 'und', 'unidade', 'u'] };
const BASE = { g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], l: ['ml', 1000], un: ['un', 1] };

// ---------- números e textos ----------

// Arredonda sem cair na pegadinha do 0,1 + 0,2 do computador.
const inteiro = (x) => Math.round(Number(x.toFixed(6)));

// "3,6" → 3.6 · "1.500" → 1500 · "1/2" → 0.5
export function numero(texto) {
  if (typeof texto === 'number') return texto;
  let t = String(texto).trim().replace(/^r\$\s*/i, '');
  const fracao = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracao) return Number(fracao[1]) / Number(fracao[2]);
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t.replace(',', '.'));
  if (!Number.isFinite(n)) throw new Error(`"${texto}" não é um número`);
  return n;
}

export const centavos = (reais) => inteiro(numero(reais) * 100);

// 970 → "R$ 9,70" · 180000 → "R$ 1.800,00"
export function reais(c, { simbolo = true } = {}) {
  const sinal = c < 0 ? '−' : '';
  const abs = Math.abs(c);
  const texto = `${Math.floor(abs / 100).toLocaleString('pt-BR')},${String(abs % 100).padStart(2, '0')}`;
  return `${sinal}${simbolo ? 'R$ ' : ''}${texto}`;
}

// 0.185 → "18,5%" · 0.15 → "15%"
export function pct(fracao) {
  const v = Math.round(fracao * 1000) / 10;
  return `${String(v).replace('.', ',').replace('-', '−')}%`;
}

// 3.6 → "3,6"
export const fmt = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');

// Deixa o texto comparável: sem acento, sem plural ("fatias de queijo" = "fatia de queijo").
export function chave(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
    .map((p) => p.replace(/s$/, '').replace(/e$/, '')).join(' ');
}

const unidadePorChave = {};
for (const [u, nomes] of Object.entries(UNIDADES)) for (const n of nomes) unidadePorChave[chave(n)] = u;
const acharUnidade = (texto) => unidadePorChave[chave(texto)] || null;

// ---------- medidas ----------

// Lê "180 g", "3,6 kg", "2 fatias de queijo", "2 carnes de 90 g".
// Devolve { valor, unidade: 'g' | 'ml' | 'un', padrao: nome da porção padrão ou null }.
export function lerMedida(texto, porcoes = {}) {
  const original = String(texto ?? '').trim();
  const m = original.match(/^(\d+(?:[.,]\d+)*(?:\s*\/\s*\d+)?)\s*(.*)$/);
  if (!m) throw new Error(`não entendi a medida "${original}" (comece pelo número, ex.: "180 g" ou "2 fatias de queijo")`);
  const qtd = numero(m[1]);
  const resto = m[2].trim();
  if (!(qtd > 0)) throw new Error(`a medida "${original}" precisa ser maior que zero`);

  const u = resto ? acharUnidade(resto) : null;
  if (u) return { valor: qtd * BASE[u][1], unidade: BASE[u][0], padrao: null };

  // "2 carnes de 90 g" → 2 × 90 g
  const de = resto.match(/\bde\s+(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)\s*$/);
  if (de && acharUnidade(de[2])) {
    const u2 = acharUnidade(de[2]);
    return { valor: qtd * numero(de[1]) * BASE[u2][1], unidade: BASE[u2][0], padrao: null };
  }

  const alvo = chave(resto);
  for (const [nome, p] of Object.entries(porcoes)) {
    const nomes = [nome, ...(p.tambem || [])];
    if (nomes.some((n) => chave(n) === alvo)) {
      const up = acharUnidade(p.unidade);
      if (!up) throw new Error(`a porção padrão "${nome}" tem uma unidade que não conheço (${p.unidade})`);
      return { valor: qtd * p.quantidade * BASE[up][1], unidade: BASE[up][0], padrao: nome };
    }
  }
  if (!resto) throw new Error(`a medida "${original}" está sem unidade (use g, kg, ml, l ou un)`);
  throw new Error(`não entendi a medida "${original}". Use g, kg, ml, l, un ou uma porção de porcoes-padrao.json`);
}

// ---------- linhas da ficha ----------

// Uma linha de ingrediente ou de embalagem:
//   { "nome": "Cheddar", "vai": "1 fatia de queijo", "pacote": "1 kg", "preco_pacote": 50 }
//   ou { "nome": "Tempero pronto", "custo": 0.10 } quando o dono já sabe o custo por porção.
export function custoDaLinha(linha, porcoes = {}) {
  const nome = String(linha?.nome ?? '').trim();
  if (!nome) throw new Error('falta o "nome"');
  if (linha.custo !== undefined) return { nome, vai: null, pacote: null, custo_c: centavos(linha.custo), avisos: [] };

  for (const campo of ['vai', 'pacote', 'preco_pacote']) {
    if (linha[campo] === undefined || linha[campo] === '') throw new Error(`falta "${campo}"`);
  }
  const vai = lerMedida(linha.vai, porcoes);
  const pacote = lerMedida(linha.pacote, porcoes);
  const preco_pacote_c = centavos(linha.preco_pacote);
  const avisos = [];
  if (vai.unidade !== pacote.unidade) {
    const liquido = new Set([vai.unidade, pacote.unidade]);
    if (liquido.has('g') && liquido.has('ml')) {
      avisos.push(`${nome}: considerei 1 ml = 1 g`);
    } else {
      throw new Error(`a porção está em ${vai.unidade} e o pacote em ${pacote.unidade}. Use a mesma medida nos dois (ex.: o peso de 1 unidade)`);
    }
  }
  const custo_c = inteiro((vai.valor / pacote.valor) * preco_pacote_c);
  return {
    nome,
    vai: { texto: String(linha.vai), ...vai },
    pacote: { texto: String(linha.pacote), ...pacote, preco_c: preco_pacote_c },
    custo_c,
    avisos,
  };
}

// ---------- porcentagens ----------

// Toda porcentagem da entrada é escrita em % ("26.5" ou "26,5%" = 26,5%). Devolve a fração (0.265).
export function porcento(valor) {
  const n = numero(String(valor).replace('%', '').trim());
  if (!(n >= 0) || n >= 100) throw new Error(`"${valor}" não é uma porcentagem entre 0 e 100`);
  return n / 100;
}

// 15 → [0.15, 0.15] · [15, 25] → [0.15, 0.25]
export function faixa(valor) {
  const lista = Array.isArray(valor) ? valor : [valor, valor];
  if (lista.length !== 2) throw new Error('a faixa precisa de 2 números, ex.: [15, 25]');
  return lista.map(porcento).sort((a, b) => a - b);
}

// ---------- preço no app ----------

// 3356 (R$ 33,56) → 3390 (R$ 33,90): o próximo preço terminado em ,90.
export function arredondar90(c) {
  let p = Math.floor(c / 100) * 100 + 90;
  if (p < c) p += 100;
  return p;
}

// Regra do Andrews: no app, o mesmo item fica no máximo de 29% a 31% acima do balcão.
//   1. alvo = balcão × 1,30
//   2. vai para o ,90 mais perto, SÓ se ele ficar entre +29% e +31%
//   3. se não ficar, vai para os R$ 0,10 mais perto, dentro da faixa
//   Ex.: balcão R$ 25 → alvo R$ 32,50 → o ,90 mais perto (R$ 32,90) dá +31,6% → fica R$ 32,50 (+30%)
export function precoApp(balcao_c, acrescimo, regra = [0.29, 0.31]) {
  const alvo = inteiro(balcao_c * (1 + acrescimo));
  const min = balcao_c * (1 + regra[0]);
  const max = balcao_c * (1 + regra[1]);
  const dentro = (p) => p >= min - 1e-9 && p <= max + 1e-9;
  const de90 = Math.floor(alvo / 100) * 100 + 90;
  const noventa = [de90 - 100, de90, de90 + 100].sort((a, b) => Math.abs(a - alvo) - Math.abs(b - alvo))[0];
  if (dentro(noventa)) return noventa;
  let p = Math.round(alvo / 10) * 10;
  if (dentro(alvo)) {
    const piso = Math.ceil(min / 10 - 1e-9) * 10;
    const teto = Math.floor(max / 10 + 1e-9) * 10;
    if (piso <= teto) p = Math.min(Math.max(p, piso), teto);
  }
  return p;
}

// ---------- a estimativa de um preço ----------

// Para um preço de venda, quanto vai pra cada parte e a FAIXA do lucro.
//   insumos_c = ingredientes + embalagem de 1 unidade (varia ± variacao)
//   fixos e imposto = faixas em % do preço · taxa = % do app (ou da maquininha no balcão)
export function estimar(preco_c, insumos_c, { fixos, imposto, taxa = 0, variacao = 0 }) {
  const parte = (f) => inteiro(preco_c * f);
  const r = {
    preco_c,
    taxa,
    taxa_c: parte(taxa),
    insumos_c,
    insumos_min_c: inteiro(insumos_c * (1 - variacao)),
    insumos_max_c: inteiro(insumos_c * (1 + variacao)),
    fixos: [...fixos],
    fixos_min_c: parte(fixos[0]),
    fixos_max_c: parte(fixos[1]),
    imposto: [...imposto],
    imposto_min_c: parte(imposto[0]),
    imposto_max_c: parte(imposto[1]),
  };
  r.lucro_max_c = preco_c - r.insumos_min_c - r.taxa_c - r.fixos_min_c - r.imposto_min_c;
  r.lucro_min_c = preco_c - r.insumos_max_c - r.taxa_c - r.fixos_max_c - r.imposto_max_c;
  r.margem_min = r.lucro_min_c / preco_c;
  r.margem_max = r.lucro_max_c / preco_c;
  r.situacao = r.lucro_max_c < 0 ? 'prejuizo' : r.lucro_min_c < 0 ? 'risco' : 'lucro';
  return r;
}

// ---------- o preço sugerido (a ficha paga, 03/11/2026) ----------

// 03/11 (Andrews): "a média da alimentação de lucro final é de 10%-25%, depende do tipo de produto vendido". A ficha paga
// (completa) diz o preço de balcão que deixa esse lucro final, com a MESMA conta da margem (insumos, fixos, imposto e taxa):
//   preço = insumos ÷ (1 − fixos − imposto − taxa − lucro), com o meio da faixa dos fixos e do imposto,
//   arredondado para os R$ 0,10 de cima. Continua estimativa: não promete resultado, só mostra a média do ramo.
export function precoParaLucro(insumos_c, { fixos, imposto, taxa = 0, lucro }) {
  const meio = (f) => (f[0] + f[1]) / 2;
  const sobra = 1 - meio(fixos) - meio(imposto) - taxa - lucro;
  if (!(sobra > 0)) return null; // os custos em % já comem o preço inteiro: não tem preço que feche
  return Math.ceil(Number((insumos_c / sobra / 10).toFixed(6))) * 10;
}

// ---------- a ficha inteira ----------

// "MEI", "Simples Nacional", "lucro presumido", "não sei" → mei | simples | presumido | nao_sei
function acharRegime(texto) {
  const c = chave(texto ?? 'nao sei');
  if (c === 'mei') return 'mei';
  if (c.startsWith('simpl')) return 'simples';
  if (c.includes('presum')) return 'presumido';
  if (c.replace(/ /g, '') === 'naosei') return 'nao_sei';
  throw new Error(`não conheço o regime "${texto}" (use "mei", "simples", "presumido" ou "nao_sei")`);
}

// Imposto ESTIMADO (restaurantes e bares) pelo regime, com os valores de imposto.json.
//   MEI: DAS do mês ÷ faturamento do mês (sem o faturamento, a faixa de cerca de 1% a 2%)
//   Simples e Lucro Presumido: a faixa do regime · Não sabe: a faixa do Simples
export function impostoEstimado(regimeTexto, faturamento_c, tabela = {}) {
  let id = acharRegime(regimeTexto);
  const pedido = id;
  const cfg = () => {
    const r = tabela[id];
    if (!r) throw new Error(`falta o regime "${id}" em imposto.json`);
    return r;
  };
  if (cfg().usa) id = cfg().usa;
  const r = cfg();
  const nome = tabela[pedido]?.nome ?? r.nome;
  if (id === 'mei' && faturamento_c > 0) {
    const das_c = centavos(r.das_mes);
    return { origem: 'das', regime_id: pedido, regime: nome, faixa: [das_c / faturamento_c, das_c / faturamento_c], das_mes_c: das_c, faturamento_mes_c: faturamento_c };
  }
  return { origem: 'regime', regime_id: pedido, regime: nome, usa: id !== pedido ? id : null, faixa: faixa(id === 'mei' ? r.faixa_sem_faturamento : r.faixa) };
}

export function calcularFicha(entrada, porcoes = {}, padroes = {}, impostos = {}) {
  const e = entrada || {};
  const erros = [];
  const avisos = [];
  const tentar = (onde, fn) => {
    try { return fn(); } catch (err) { erros.push(`${onde}: ${err.message}`); return null; }
  };
  const existe = (v) => v !== undefined && v !== null && v !== '';

  const negocio = String(e.negocio ?? '').trim();
  const item = String(e.item ?? '').trim();
  if (!negocio) erros.push('falta "negocio" (o nome do negócio)');
  if (!item) erros.push('falta "item" (o nome do produto: lanche, prato, porção, doce, bolo, salgado, açaí, pizza, bebida...)');

  // Preço de venda: o do balcão é a base. O do app é opcional (o preço que ele cobra hoje lá).
  const precos = e.precos || {};
  const preco = {};
  for (const [canal, campo] of [['balcao', 'balcao'], ['app', existe(precos.app) ? 'app' : 'ifood']]) {
    if (existe(precos[campo])) {
      const c = tentar(`precos.${campo}`, () => centavos(precos[campo]));
      if (c !== null && !(c > 0)) erros.push(`precos.${campo}: o preço precisa ser maior que zero`);
      preco[canal] = c;
    }
  }
  if (!Object.keys(preco).length) erros.push('falta "precos" (pelo menos o preço do balcão)');

  // A receita pode render mais de uma unidade (bolo em fatias, massa de salgado, calda...).
  const rende = existe(e.rende) ? tentar('rende', () => numero(e.rende)) : 1;
  if (rende !== null && !(rende > 0)) erros.push('rende: precisa ser maior que zero (quantas unidades a receita rende)');

  const pc = (onde, valor, padrao) => tentar(onde, () => (existe(valor) ? porcento(valor) : porcento(padrao)));
  const taxaApp = pc('taxa_app', e.taxa_app, padroes.taxa_app ?? 26.5);
  const taxaBalcao = pc('taxa_balcao', e.taxa_balcao, padroes.taxa_balcao ?? 0);
  const acrescimo = pc('acrescimo_app', e.acrescimo_app, padroes.acrescimo_app ?? 30);
  const regra = tentar('acrescimo_app_regra', () => faixa(padroes.acrescimo_app_regra ?? [29, 31]));
  const variacao = pc('variacao_insumos', e.variacao_insumos, padroes.variacao_insumos ?? 10);

  // Faturamento do mês: divide os custos fixos e o DAS do MEI.
  const fat = existe(e.faturamento_mes) ? tentar('faturamento_mes', () => centavos(e.faturamento_mes)) : null;
  if (fat !== null && !(fat > 0)) erros.push('faturamento_mes: precisa ser maior que zero');

  // Custos fixos em % do preço: informado direto, calculado pelo mês (custos ÷ faturamento) ou a faixa padrão.
  let fixos = null;
  if (existe(e.custos_fixos_pct)) {
    fixos = { origem: 'informado', faixa: tentar('custos_fixos_pct', () => faixa(e.custos_fixos_pct)), linhas: [] };
  } else if (existe(e.custos_fixos)) {
    const lista = Array.isArray(e.custos_fixos) ? e.custos_fixos : [{ nome: 'Custos fixos', por_mes: e.custos_fixos }];
    const linhas = lista.map((l, i) => tentar(`custos_fixos[${i + 1}]${l?.nome ? ` (${l.nome})` : ''}`, () => {
      if (!String(l?.nome ?? '').trim()) throw new Error('falta o "nome"');
      if (!existe(l.por_mes)) throw new Error('falta "por_mes" (quanto custa no mês)');
      return { nome: String(l.nome).trim(), por_mes_c: centavos(l.por_mes) };
    })).filter(Boolean);
    if (!existe(e.faturamento_mes)) erros.push('custos_fixos: para virar %, preencha "faturamento_mes" (quanto o negócio vende no mês). Sem saber, apague "custos_fixos" e a ficha usa a faixa padrão');
    if (fat > 0) {
      const total = linhas.reduce((t, l) => t + l.por_mes_c, 0);
      fixos = { origem: 'mes', faixa: [total / fat, total / fat], linhas, total_mes_c: total, faturamento_mes_c: fat };
    }
  } else {
    fixos = { origem: 'padrao', faixa: tentar('custos_fixos_faixa (padroes.json)', () => faixa(padroes.custos_fixos_faixa ?? [15, 25])), linhas: [] };
  }

  // Imposto ESTIMADO em % do preço: informado pelo dono ou pelo regime (imposto.json).
  let imposto = null;
  if (existe(e.imposto_pct)) {
    imposto = { origem: 'informado', regime: 'informado pelo dono', faixa: tentar('imposto_pct', () => faixa(e.imposto_pct)) };
  } else {
    imposto = tentar('regime', () => impostoEstimado(e.regime, fat, impostos));
  }

  const linhas = (lista, onde) => {
    if (!Array.isArray(lista)) return [];
    return lista.map((l, i) => tentar(`${onde}[${i + 1}]${l?.nome ? ` (${l.nome})` : ''}`, () => custoDaLinha(l, porcoes))).filter(Boolean);
  };
  if (!Array.isArray(e.ingredientes) || !e.ingredientes.length) erros.push('falta "ingredientes" (a lista do que vai na receita)');
  const ingredientes = linhas(e.ingredientes, 'ingredientes');
  let embalagem = [];
  if (typeof e.embalagem === 'number' || typeof e.embalagem === 'string') {
    embalagem = [tentar('embalagem', () => custoDaLinha({ nome: 'Embalagem', custo: e.embalagem }))].filter(Boolean);
  } else embalagem = linhas(e.embalagem, 'embalagem');

  if (erros.length || !fixos?.faixa || !imposto?.faixa) {
    const err = new Error(`a ficha tem ${erros.length} problema(s):\n- ${erros.join('\n- ')}`);
    err.erros = erros;
    throw err;
  }
  for (const l of [...ingredientes, ...embalagem]) avisos.push(...l.avisos);

  const soma = (lista) => lista.reduce((t, l) => t + l.custo_c, 0);
  const totais = { receita_c: soma(ingredientes), embalagem_c: soma(embalagem) };
  totais.ingredientes_c = inteiro(totais.receita_c / rende); // por unidade
  totais.insumos_c = totais.ingredientes_c + totais.embalagem_c;

  const base = { fixos: fixos.faixa, imposto: imposto.faixa, variacao };
  const canais = [];
  if (preco.balcao) canais.push({ id: 'balcao', nome: 'Balcão', ...estimar(preco.balcao, totais.insumos_c, { ...base, taxa: taxaBalcao }) });
  if (preco.balcao) {
    const p = precoApp(preco.balcao, acrescimo, regra);
    const acr = p / preco.balcao - 1;
    canais.push({
      id: 'app', nome: 'App (preço sugerido)', acrescimo: acr,
      dentro_da_regra: acr >= regra[0] - 1e-9 && acr <= regra[1] + 1e-9,
      ...estimar(p, totais.insumos_c, { ...base, taxa: taxaApp }),
    });
  }
  if (preco.app) {
    canais.push({
      id: 'app_hoje', nome: 'App (preço de hoje)', acrescimo: preco.balcao ? preco.app / preco.balcao - 1 : null,
      ...estimar(preco.app, totais.insumos_c, { ...base, taxa: taxaApp }),
    });
  }

  // A FICHA PAGA (03/11, Andrews): com "completa", sai o preço sugerido de balcão para 10% a 25% de lucro final (lucro_final_ramo
  // em padroes.json). Sem ela, nada muda: a ficha grátis continua só com a margem em faixa.
  let completa = {};
  if (e.completa === true) {
    const lucro = tentar('lucro_final_ramo (padroes.json)', () => faixa(padroes.lucro_final_ramo ?? [10, 25]));
    const conta = (l) => precoParaLucro(totais.insumos_c, { fixos: fixos.faixa, imposto: imposto.faixa, taxa: taxaBalcao, lucro: l });
    const [min_c, max_c] = lucro ? [conta(lucro[0]), conta(lucro[1])] : [null, null];
    /* 03/11 (revisão): custos fixos altos demais. Sem a conta dos 25%, fica o preço dos 10% (max_c null); sem nem a dos 10%, o
     * aviso no lugar do preço. Nunca um número inventado. */
    const sugerido = { min_c, max_c, lucro, acima_da_media: Boolean(max_c && preco.balcao && preco.balcao > max_c) };
    if (!min_c) sugerido.aviso = 'os custos fixos estão altos demais pra esse preço';
    completa = { completa: true, preco_sugerido: lucro ? sugerido : null };
  }

  return {
    exemplo: Boolean(e.exemplo),
    negocio,
    item,
    data: e.data || new Date().toLocaleDateString('sv-SE'), // AAAA-MM-DD no horário do Mac (não em UTC)
    rende,
    ingredientes,
    embalagem,
    totais,
    percentuais: { fixos, imposto, taxa_app: taxaApp, taxa_balcao: taxaBalcao, acrescimo_app: acrescimo, regra_app: regra, variacao },
    canais,
    avisos,
    // 11/11 (o robô, rodada 2): o principal que ela disse que não usa ("sem ovo"); a página escreve "Montada sem ovo, como você disse"
    sem: Array.isArray(e.sem) ? e.sem.map((x) => String(x ?? '').trim()).filter(Boolean).slice(0, 5) : [],
    ...completa,
  };
}
