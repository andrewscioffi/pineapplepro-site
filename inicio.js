// A HOME (v3, 07/11/2026). O pedido do Andrews: "eu quero que a interface seja altamente interativa"
// e "o cliente tem que falar: que site foda, vou querer usar as ferramentas".
// As 4 interações da home. A conta é sempre a da calculadora de verdade (calculadora/contas.mjs, pelo comum/ficha.js):
//   1. a torre do preço: o X-Bacon de exemplo (o oficial, marcado "exemplo") desmontado em camadas de vidro, cada uma
//      com a altura do custo dela; em cima, as contas da loja, o app e o imposto; no topo, a sobra (ou o buraco).
//      Arrastar o preço, tirar e pôr ingrediente (cada vez um exemplo novo, passado para a calculadora) e trocar
//      balcão × app refazem a torre com mola. No computador ela gira com o mouse; no celular, com o dedo.
//   2. a vitrine viva: no celular, o cartão que entra na tela mostra o produto funcionando (no computador é o mouse,
//      só pelo CSS); o recibo do Pine Cost faz a conta quando aparece
//   3. o "como funciona" que se escreve: a conversa de exemplo do Direct anda junto com a rolagem (a foto é um exemplo
//      real: a pessoa manda a do celular e recebe a revitalizada, junto com a ficha)
//   4. o escritório vivo: as 22 mesinhas acendem junto com a contagem (nada de nome de cargo)
// Nada é gravado e nada sai daqui. Quem pediu menos movimento vê tudo pronto, parado e funcionando.
import { calcular, carregarTabelas, cupom, sinal, reais, montarResumo, esc } from './comum/ficha.js';
import { EXEMPLOS } from './comum/exemplos.js';
import { FRASES } from './valores.js';
import {
  animarNumero, pegar, estourarEm, vibrar, escrever, pedeMenosMovimento, temMouse, limitar, moldeDoNumero, noMolde,
} from './comum/interacao.js';

// =====================================================================================================
// AS CONTAS (funções puras, testadas em testes/vitrine.test.mjs)
// =====================================================================================================

/** O controle do preço da torre (o mesmo do simulador da v2): de 15 a 35 reais, de 50 em 50 centavos. */
export const FAIXA_PRECO = { min: 15, max: 35, passo: 0.5 };

/** O exemplo com o preço escolhido: o mesmo preço no balcão e no app (o erro mais comum, que a ficha mostra). */
export function comPreco(exemplo, preco) {
  return { ...exemplo, precos: { ...exemplo.precos, balcao: preco, app: preco } };
}

/**
 * A entrada da torre: o exemplo com o preço escolhido e sem o que a pessoa tirou (os nomes dos ingredientes e,
 * se quiser, a embalagem). É um exemplo novo (o oficial não muda), e quem faz a conta dele é a calculadora.
 */
export function entradaDaTorre(exemplo, { preco, tirados = [], semEmbalagem = false } = {}) {
  const fora = new Set(tirados);
  const e = preco === undefined ? { ...exemplo } : comPreco(exemplo, preco);
  e.ingredientes = (exemplo.ingredientes ?? []).filter((i) => !fora.has(i.nome));
  if (semEmbalagem) e.embalagem = [];
  return e;
}

/** O nome curto do ingrediente, para o botão: "Pão de hambúrguer" → "Pão". */
export const nomeCurto = (nome) => String(nome ?? '').trim().split(/\s+/)[0] ?? '';

/**
 * As camadas da torre, de baixo para cima, em centavos, saídas da ficha (f) que a calculadora devolveu:
 * cada ingrediente (o custo de 1 unidade), a embalagem, as contas da loja, o app (se o canal tiver), o imposto e,
 * no topo, a sobra; ou o buraco, quando os custos passam do preço (o pedaço que sobe acima dele).
 * Fecha sempre no centavo: ingredientes + embalagem + contas + app + imposto + sobra = o preço.
 */
export function camadasDaTorre(f, canalId = 'balcao') {
  const c = f.canais.find((k) => k.id === canalId) ?? f.canais[0];
  const k = cupom(c);
  const rende = f.rende > 1 ? f.rende : 1;
  const ings = f.ingredientes.map((i) => ({ id: `ing:${i.nome}`, tipo: 'ingrediente', nome: i.nome, valor: Math.round(i.custo_c / rende) }));
  // a receita que rende mais de uma unidade: o arredondamento fecha no ingrediente que mais pesa
  const dif = f.totais.ingredientes_c - ings.reduce((t, l) => t + l.valor, 0);
  if (dif && ings.length) ings.reduce((a, b) => (b.valor > a.valor ? b : a)).valor += dif;
  const camadas = [...ings];
  if (f.totais.embalagem_c > 0) camadas.push({ id: 'embalagem', tipo: 'embalagem', nome: 'Embalagem', valor: f.totais.embalagem_c });
  camadas.push({ id: 'fixos', tipo: 'fixos', nome: 'Contas da loja', valor: k.fixos });
  if (k.app > 0) camadas.push({ id: 'app', tipo: 'app', nome: 'O app', valor: k.app });
  camadas.push({ id: 'imposto', tipo: 'imposto', nome: 'Imposto', valor: k.imposto });
  let y = 0;
  for (const l of camadas) { l.de = y; y += l.valor; l.ate = y; }
  const custos = y;
  const topo = k.sobra >= 0
    ? { id: 'sobra', tipo: 'sobra', nome: 'Sobra', valor: k.sobra, de: custos, ate: custos + k.sobra }
    : { id: 'buraco', tipo: 'buraco', nome: 'Buraco', valor: -k.sobra, de: k.preco, ate: custos };
  return {
    canal: c.id, preco: k.preco, sobra: k.sobra, custos, insumos: k.insumos, faixa: k.faixa,
    altura: Math.max(k.preco, custos), camadas, topo, sinal: sinal(c),
  };
}

/** O texto da sobra, como no cupom da ficha: "uns R$ 8,42" ou "− R$ 1,79" (o R$ nunca quebra no meio). */
export function textoSobra(c) {
  const junto = (t) => t.replace(' ', ' ');
  return c >= 0 ? `uns ${junto(reais(c))}` : `− ${junto(reais(-c))}`;
}

/** A faixa da sobra, como no cupom: "de 5,93 a 10,92" (vazia quando as duas pontas são iguais). */
export function textoFaixa([a, b]) {
  if (a === b) return '';
  const v = (x) => `${x < 0 ? '−' : ''}${reais(Math.abs(x), { simbolo: false })}`;
  return `de ${v(a)} a ${v(b)}`;
}

/** Um passo da mola (k é a força, c o freio): devolve [posição, velocidade]. Passa um pouco do alvo e assenta. */
export function passoMola(x, v, alvo, dt, k = 230, c = 19) {
  const a = k * (alvo - x) - c * v;
  const v2 = v + a * dt;
  return [x + v2 * dt, v2];
}

const RAD = Math.PI / 180;

/**
 * Onde um ponto da torre aparece na cena (em px), com o mesmo giro e a mesma perspectiva do CSS
 * (transform: rotateX(giroX) rotateY(giroY), com a origem no meio da base, e o perspective do palco).
 * O ponto [x, alto, z] é medido do meio da base da torre: x para a direita, alto para cima, z para a frente.
 * g = { origem: [x, y] (o meio da base, na cena), giroX, giroY (graus), perspectiva (px), foco: [x, y] (o perspective-origin) }
 */
export function projetar([x, alto, z], g) {
  const ry = g.giroY * RAD;
  const rx = g.giroX * RAD;
  const x1 = x * Math.cos(ry) + z * Math.sin(ry);
  const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
  const y2 = -alto * Math.cos(rx) - z1 * Math.sin(rx);
  const z2 = -alto * Math.sin(rx) + z1 * Math.cos(rx);
  const sx = g.origem[0] + x1;
  const sy = g.origem[1] + y2;
  const k = g.perspectiva / (g.perspectiva - z2);
  return [g.foco[0] + (sx - g.foco[0]) * k, g.foco[1] + (sy - g.foco[1]) * k];
}

/**
 * Arruma os rótulos na vertical: cada um o mais perto do seu ponto, sem encostar (pelo menos `min` px entre eles)
 * e dentro de [topo, base]. Devolve as posições na mesma ordem da lista.
 */
export function afastarRotulos(ys, { min = 24, topo = -Infinity, base = Infinity } = {}) {
  const itens = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const inicio = (g) => {
    const n = g.membros.length;
    const ideal = g.soma / n - ((n - 1) * min) / 2;
    return Math.min(Math.max(ideal, topo), base - (n - 1) * min);
  };
  const grupos = itens.map((it) => ({ membros: [it], soma: it.y }));
  for (let k = 0; k < grupos.length - 1;) {
    const a = grupos[k];
    const b = grupos[k + 1];
    if (inicio(b) - (inicio(a) + (a.membros.length - 1) * min) < min - 1e-9) {
      grupos.splice(k, 2, { membros: [...a.membros, ...b.membros], soma: a.soma + b.soma });
      k = Math.max(0, k - 1); // o grupo novo pode encostar no de cima
    } else k++;
  }
  const saida = new Array(ys.length);
  for (const g of grupos) {
    const ini = inicio(g);
    g.membros.forEach((m, j) => { saida[m.i] = ini + j * min; });
  }
  return saida;
}

/** A legenda da resposta da Pineapple: o texto do 3º passo da página ("A ficha com a conta pronta."). */
export const LEGENDAS = { ficha: 'A ficha com a conta pronta' };

/**
 * A conversa de exemplo do "como funciona" (marcada "exemplo de conversa"). As falas saem dos 3 passos da página:
 * a frase do Direct (FRASES.fichas), o que vende (o produto, os ingredientes e o preço do exemplo oficial) e a resposta:
 * a ficha (o resumo da calculadora). Nada de texto do robô, nada de promessa. Sem foto desde 10/11: o Andrews pausou a foto.
 */
export function conversaDeExemplo(exemplo, f) {
  const balcao = f.canais.find((c) => c.id === 'balcao');
  const nomes = (exemplo.ingredientes ?? []).map((i) => nomeCurto(i.nome).toLowerCase());
  const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : (nomes[0] ?? '');
  return [
    { quem: 'eu', tipo: 'texto', passo: 1, linhas: [FRASES.fichas] },
    { quem: 'eu', tipo: 'texto', passo: 2, linhas: [f.item, lista, `${reais(balcao.preco_c)} no balcão`] },
    { quem: 'pine', tipo: 'ficha', passo: 3, legenda: LEGENDAS.ficha },
  ];
}

/** As mesinhas do escritório: `n` mesas em fileiras de `porFileira` (só o lugar de cada uma; nada de nome de cargo). */
export function mesas(n = 22, porFileira = 6) {
  return Array.from({ length: n }, (_, i) => ({ i, coluna: i % porFileira, fileira: Math.floor(i / porFileira) }));
}

// =====================================================================================================
// 1. A TORRE DO PREÇO
// =====================================================================================================

const ROTULO = { insumos: 'Ingredientes', embalagem: 'Embalagem', fixos: 'Contas da loja', app: 'O app', imposto: 'Imposto', sobra: 'Sobra', buraco: 'Buraco' };
const TITULO_CANAL = { balcao: 'no balcão', app_hoje: 'no app' };
const agoraMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** O tamanho da torre para a cena (a cena muda com a tela): a largura, a fundura, o chão e a escala. */
function geometria(L, A) {
  const estreita = L < 300; // o celular pequeno (320 px)
  const tw = Math.round(limitar(L * 0.29, estreita ? 70 : 80, 140));
  const td = Math.round(tw * 0.66);
  const lx = Math.round(L * (estreita ? 0.52 : L < 420 ? 0.56 : 0.58)); // onde começam os rótulos
  const regua = estreita ? 26 : 30; // a régua do preço, à esquerda
  const x = Math.round(limitar(regua + (lx - regua - tw - td * 0.6) / 2, regua + 4, 120)); // a torre entre a régua e os rótulos
  const chao = A - 22;
  const alto = chao - 26; // a altura da torre no preço mais alto
  return {
    L, A, tw, td, lx, x, chao, alto, regua,
    esc: alto / (FAIXA_PRECO.max * 100), // px por centavo
    perspectiva: 1100,
    foco: [x + tw / 2, A * 0.16],
    min: L < 420 ? 23 : 26,
  };
}

function ligarTorre(painel, tab) {
  const ex = EXEMPLOS['x-bacon'];
  const $ = (s) => painel.querySelector(s);
  const controle = $('[data-tp-controle]');
  const cena = $('[data-tp="cena"]');
  const torre = $('[data-tp="torre"]');
  const fios = $('[data-tp="fios"]');
  const rotulosEl = $('[data-tp="rotulos"]');
  const ingsEl = $('[data-tp="ings"]');
  const canaisEl = $('[data-tp="canais"]');
  const parado = pedeMenosMovimento();

  // o exemplo inteiro: o custo de 1 unidade de cada ingrediente (para os botões e para a camada que sai)
  const cheia = camadasDaTorre(calcular(entradaDaTorre(ex), tab), 'balcao');
  const insumosBase = cheia.camadas.filter((l) => l.tipo === 'ingrediente' || l.tipo === 'embalagem');
  const custoBase = new Map(insumosBase.map((l) => [l.id, l.valor]));
  const totalIngredientes = ex.ingredientes.length;

  const estado = {
    preco: Number(controle.value) || ex.precos.balcao,
    canal: 'balcao',
    tirados: new Set(),
    semEmbalagem: false,
    foco: null,
  };
  let t = null; // as camadas da conta de agora
  let f = null; // a ficha de agora (saída da calculadora)
  let geo = geometria(cena.clientWidth || 300, cena.clientHeight || 300);
  let visivel = false;
  let montada = parado;
  let interagiu = false;
  let ultimoSinal = null;
  let ultimoEstouro = 0;

  // ---------- as camadas de vidro ----------
  const ordem = [...insumosBase.map((l) => ({ id: l.id, tipo: l.tipo })), { id: 'fixos', tipo: 'fixos' }, { id: 'app', tipo: 'app' },
    { id: 'imposto', tipo: 'imposto' }, { id: 'sobra', tipo: 'sobra' }, { id: 'buraco', tipo: 'buraco' }, { id: 'tampa', tipo: 'tampa' }];
  const faces = '<i class="tp-f"></i><i class="tp-t"></i><i class="tp-d"></i><i class="tp-e"></i>';
  torre.innerHTML = '<div class="tp-chao"><i class="tp-t"></i></div>' + ordem.map((l, k) => (l.tipo === 'tampa'
    ? '<div class="tp-tampa" data-id="tampa"><i class="tp-t"></i></div>'
    : `<div class="tp-laje tp-${l.tipo}${l.tipo === 'ingrediente' && k % 2 ? ' tp-par' : ''}" data-id="${esc(l.id)}">${faces}</div>`)).join('');
  const lajes = new Map();
  for (const [k, l] of ordem.entries()) {
    const el = torre.querySelector(`[data-id="${CSS.escape(l.id)}"]`);
    lajes.set(l.id, { id: l.id, tipo: l.tipo, el, k, y: 0, vy: 0, h: 0, vh: 0, f: 0, vf: 0, o: 0, vo: 0, alvo: { y: 0, h: 0, f: 0, o: 0 }, solta: 0, escrito: '' });
  }

  // ---------- os rótulos e os fios ----------
  const ROTS = ['insumos', 'embalagem', 'fixos', 'app', 'imposto', 'sobra', 'buraco', 'foco'];
  rotulosEl.innerHTML = ROTS.map((id) => `<p class="tp-rot tp-rot-${id}" data-rot="${id}"><span class="tp-rot-nome">${ROTULO[id] ?? ''}</span><b class="tp-rot-valor"></b></p>`).join('');
  fios.innerHTML = ROTS.map((id) => `<path class="tp-fio" data-fio="${id}" d=""/>`).join('') + '<path class="tp-fio tp-chave" data-fio="chave" d=""/>'
    + ROTS.map((id) => `<circle class="tp-ponto" data-ponto="${id}" r="2" cx="-9" cy="-9"/>`).join('');
  const rot = Object.fromEntries(ROTS.map((id) => [id, {
    el: rotulosEl.querySelector(`[data-rot="${id}"]`),
    valor: rotulosEl.querySelector(`[data-rot="${id}"] .tp-rot-valor`),
    fio: fios.querySelector(`[data-fio="${id}"]`),
    ponto: fios.querySelector(`[data-ponto="${id}"]`),
    ligado: false,
  }]));
  const chave = fios.querySelector('[data-fio="chave"]');
  // a régua do preço: um traço a cada 5 reais, e o traço amarelo no preço de agora (ligado à tampa)
  const MARCAS = [];
  for (let c = 500; c <= FAIXA_PRECO.max * 100; c += 500) MARCAS.push(c);
  fios.insertAdjacentHTML('afterbegin', `<g class="tp-regua">${MARCAS.map((c) => `<path class="tp-marca" data-marca="${c}" d=""/><text class="tp-marca-num" data-marca-num="${c}" text-anchor="end" x="-20" y="-20">${c / 100}</text>`).join('')}<path class="tp-regua-eixo" d=""/><path class="tp-regua-preco" d=""/></g>`);
  const regua = {
    marcas: MARCAS.map((c) => ({ c, traco: fios.querySelector(`[data-marca="${c}"]`), num: fios.querySelector(`[data-marca-num="${c}"]`) })),
    eixo: fios.querySelector('.tp-regua-eixo'),
    preco: fios.querySelector('.tp-regua-preco'),
  };

  // ---------- os botões dos ingredientes ----------
  ingsEl.innerHTML = insumosBase.map((l) => `<button type="button" class="chip tp-ing" data-ing="${esc(l.id)}" aria-pressed="true" title="${esc(l.nome)}"><span>${esc(l.tipo === 'embalagem' ? 'Embalagem' : nomeCurto(l.nome))}</span> <b>${reais(l.valor, { simbolo: false })}</b></button>`).join('');

  // ---------- a conta ----------
  const incluido = (id) => (id === 'embalagem' ? !estado.semEmbalagem : !estado.tirados.has(id.slice(4)));
  const alvoDe = (l) => {
    const e = geo.esc;
    const presentes = new Map(t.camadas.map((c) => [c.id, c]));
    if (l.tipo === 'ingrediente' || l.tipo === 'embalagem') {
      const c = presentes.get(l.id);
      if (c) return { y: c.de * e, h: c.valor * e, f: 0, o: 1 };
      return { y: l.alvo.y, h: (custoBase.get(l.id) ?? 0) * e, f: -1, o: 0 }; // sai pela esquerda, de onde estava
    }
    if (l.id === 'fixos' || l.id === 'imposto') { const c = presentes.get(l.id); return { y: c.de * e, h: c.valor * e, f: 0, o: 1 }; }
    if (l.id === 'app') {
      const c = presentes.get('app');
      return c ? { y: c.de * e, h: c.valor * e, f: 0, o: 1 } : { y: presentes.get('fixos').ate * e, h: 0, f: 0.45, o: 0 };
    }
    if (l.id === 'sobra') return t.sobra > 0 ? { y: t.topo.de * e, h: t.sobra * e, f: 0, o: 1 } : { y: t.preco * e, h: 0, f: 0, o: 0 };
    if (l.id === 'buraco') return t.sobra < 0 ? { y: t.preco * e, h: (t.custos - t.preco) * e, f: 0, o: 1 } : { y: t.preco * e, h: 0, f: 0, o: 0 };
    return { y: t.preco * e + 1.5, h: 0, f: 0, o: 1 }; // a tampa: o preço
  };

  const precoEl = $('[data-tp="preco"]');
  const sobraEl = $('[data-tp="sobra"]');
  const pill = $('[data-tp="sinal"]');
  const faixaEl = $('[data-tp="faixa"]');
  const rotPreco = $('[data-tp="rot-preco"]');
  const dica = $('[data-tp="dica"]');
  const resumo = $('[data-tp="resumo"]');
  let tempoResumo = 0;

  function contar({ demo = false } = {}) {
    f = calcular(entradaDaTorre(ex, { preco: estado.preco, tirados: [...estado.tirados], semEmbalagem: estado.semEmbalagem }), tab);
    t = camadasDaTorre(f, estado.canal);
    for (const l of lajes.values()) {
      const a = alvoDe(l);
      l.alvo = a;
      l.el.classList.toggle('bom', l.tipo === 'sobra' && t.sinal.cls === 'bom');
      l.el.classList.toggle('atencao', l.tipo === 'sobra' && t.sinal.cls === 'atencao');
      l.el.classList.toggle('ruim', l.tipo === 'sobra' && t.sinal.cls === 'ruim');
    }
    // os números de cima
    const ms = parado ? 0 : 360;
    animarNumero(precoEl, t.preco, { formato: (c) => reais(Math.round(c)), ms: parado ? 0 : 240 });
    animarNumero(sobraEl, t.sobra, { formato: (c) => textoSobra(Math.round(c)), ms: parado ? 0 : 480 });
    for (const cls of ['bom', 'atencao', 'ruim']) sobraEl.classList.toggle(cls, t.sinal.cls === cls); // sem tirar o brilho do número que rola
    pill.className = `pill ${t.sinal.cls}`;
    pill.innerHTML = `<i></i>${esc(t.sinal.txt)}`;
    faixaEl.textContent = textoFaixa(t.faixa);
    rotPreco.innerHTML = `Você cobra<span class="tp-largo"> ${TITULO_CANAL[estado.canal]}</span>`;
    controle.setAttribute('aria-valuetext', `${reais(t.preco)} ${TITULO_CANAL[estado.canal]}`);
    // os rótulos da torre
    const da = (id) => t.camadas.find((c) => c.id === id)?.valor ?? 0;
    const valor = { insumos: t.camadas.filter((c) => c.tipo === 'ingrediente').reduce((s, c) => s + c.valor, 0), embalagem: da('embalagem'),
      fixos: da('fixos'), app: da('app'), imposto: da('imposto'), sobra: Math.max(0, t.sobra), buraco: Math.max(0, -t.sobra) };
    for (const cls of ['bom', 'atencao', 'ruim']) rot.sobra.el.classList.toggle(cls, t.sinal.cls === cls);
    for (const [id, v] of Object.entries(valor)) {
      animarNumero(rot[id].valor, id === 'buraco' ? -v : v, { formato: (c) => reais(Math.round(c), { simbolo: false }), ms });
    }
    // a dica: o outro lado da mesma conta (o app pelo mesmo preço, ou o preço que fecha no app)
    const app = f.canais.find((c) => c.id === 'app');
    const hoje = f.canais.find((c) => c.id === 'app_hoje');
    dica.innerHTML = estado.canal === 'balcao'
      ? `No app, pelo mesmo preço, sobra <b>${esc(textoSobra(cupom(hoje).sobra))}</b> em cada venda. Toque em “No app” e veja.`
      : `No app, o preço que fecha a conta é <b>${esc(reais(app.preco_c))}</b>: sobra <b>${esc(textoSobra(cupom(app).sobra))}</b> em cada venda.`;
    // o leitor de tela ouve o resumo quando a pessoa para de mexer
    clearTimeout(tempoResumo);
    tempoResumo = setTimeout(() => {
      const fora = insumosBase.filter((l) => !incluido(l.id)).map((l) => (l.tipo === 'embalagem' ? 'a embalagem' : nomeCurto(l.nome).toLowerCase()));
      resumo.textContent = `${reais(t.preco)} ${TITULO_CANAL[estado.canal]}: sobra ${textoSobra(t.sobra)} em cada venda (${t.sinal.txt}).${fora.length ? ` Sem ${fora.join(', ')}.` : ''}`;
    }, 700);
    // o "deu certo": a pessoa levou a conta para o verde
    if (!demo && montada && ultimoSinal && ultimoSinal !== 'bom' && t.sinal.cls === 'bom' && agoraMs() - ultimoEstouro > 2500) {
      ultimoEstouro = agoraMs();
      estourarEm(sobraEl);
      vibrar(12);
    }
    ultimoSinal = t.sinal.cls;
    for (const b of ingsEl.querySelectorAll('[data-ing]')) b.setAttribute('aria-pressed', String(incluido(b.dataset.ing)));
    mexer();
  }

  // ---------- o movimento: as molas, o giro e o desenho ----------
  const giro = { x: -12, y: -24, vx: 0, vy: 0, ax: -12, ay: -24 };
  const GIRO_BASE = { x: -12, y: -24 };
  let quadroPedido = 0;
  let antes = 0;
  const mexer = () => {
    if (parado || !visivel) { assentar(); desenhar(); return; }
    if (!quadroPedido) { antes = agoraMs(); quadroPedido = requestAnimationFrame(quadro); }
  };
  const assentar = () => {
    for (const l of lajes.values()) Object.assign(l, { y: l.alvo.y, h: l.alvo.h, f: l.alvo.f, o: l.alvo.o, vy: 0, vh: 0, vf: 0, vo: 0 });
    Object.assign(giro, { x: giro.ax, y: giro.ay, vx: 0, vy: 0 });
  };
  const PERTO = 0.05;
  function quadro(agora) {
    quadroPedido = 0;
    const dt = Math.min(1 / 30, Math.max(0.001, (agora - antes) / 1000));
    antes = agora;
    let mexendo = false;
    for (const l of lajes.values()) {
      if (agora < l.solta) { mexendo = true; continue; } // ainda esperando a vez de cair (a torre se montando)
      for (const [p, v] of [['y', 'vy'], ['h', 'vh'], ['f', 'vf'], ['o', 'vo']]) {
        const alvo = l.alvo[p];
        if (Math.abs(l[p] - alvo) < PERTO && Math.abs(l[v]) < PERTO) { l[p] = alvo; l[v] = 0; continue; }
        [l[p], l[v]] = p === 'o' ? passoMola(l[p], l[v], alvo, dt, 120, 22) : passoMola(l[p], l[v], alvo, dt);
        mexendo = true;
      }
    }
    for (const [p, v, a] of [['x', 'vx', 'ax'], ['y', 'vy', 'ay']]) {
      if (Math.abs(giro[p] - giro[a]) < 0.02 && Math.abs(giro[v]) < 0.02) { giro[p] = giro[a]; giro[v] = 0; continue; }
      [giro[p], giro[v]] = passoMola(giro[p], giro[v], giro[a], dt, 70, 15);
      mexendo = true;
    }
    desenhar();
    if (mexendo && visivel) quadroPedido = requestAnimationFrame(quadro);
  }

  function desenhar() {
    torre.style.transform = `rotateX(${giro.x.toFixed(2)}deg) rotateY(${giro.y.toFixed(2)}deg)`;
    const longe = geo.tw + 56;
    for (const l of lajes.values()) {
      const o = limitar(l.o, 0, 1);
      const h = Math.max(0, l.h);
      const escrito = `${(l.f * longe).toFixed(1)}|${l.y.toFixed(1)}|${h.toFixed(1)}|${o.toFixed(2)}`;
      if (escrito === l.escrito) continue; // nada mudou: não mexe no estilo
      l.escrito = escrito;
      l.el.style.transform = `translate3d(${(l.f * longe).toFixed(1)}px, ${(-l.y).toFixed(1)}px, 0)`;
      if (l.tipo !== 'tampa') l.el.style.height = `${h.toFixed(1)}px`;
      l.el.style.setProperty('--o', o.toFixed(2));
      l.el.style.visibility = o < 0.01 ? 'hidden' : '';
    }
    desenharRotulos();
  }

  /** O ponto mais à direita da torre numa altura (a quina que aparece), na cena. */
  function quina(alto) {
    const g = { origem: [geo.x + geo.tw / 2, geo.chao], giroX: giro.x, giroY: giro.y, perspectiva: geo.perspectiva, foco: geo.foco };
    const a = projetar([geo.tw / 2, alto, geo.td / 2], g);
    const b = projetar([geo.tw / 2, alto, -geo.td / 2], g);
    return a[0] >= b[0] ? a : b;
  }

  function desenharRotulos() {
    const L = lajes;
    const pedacos = [];
    const meio = (l) => l.y + Math.max(0, l.h) / 2;
    const fixos = L.get('fixos');
    const emb = L.get('embalagem');
    const temEmb = Boolean(emb) && incluido('embalagem');
    const topoIng = temEmb ? emb.y : fixos.y; // onde acaba o último ingrediente
    pedacos.push({ id: 'insumos', alto: topoIng / 2, de: 0, ate: topoIng });
    if (temEmb) pedacos.push({ id: 'embalagem', alto: meio(emb) });
    pedacos.push({ id: 'fixos', alto: meio(fixos) });
    if (estado.canal !== 'balcao') pedacos.push({ id: 'app', alto: meio(L.get('app')) });
    pedacos.push({ id: 'imposto', alto: meio(L.get('imposto')) });
    if (t.sobra >= 0) pedacos.push({ id: 'sobra', alto: meio(L.get('sobra')) });
    else pedacos.push({ id: 'buraco', alto: meio(L.get('buraco')) });
    if (estado.foco && L.get(estado.foco) && incluido(estado.foco)) pedacos.push({ id: 'foco', alto: meio(L.get(estado.foco)) });
    for (const p of pedacos) p.ponto = quina(p.alto);
    const ys = afastarRotulos(pedacos.map((p) => p.ponto[1]), { min: geo.min, topo: 10, base: geo.A - 10 });
    const ligados = new Set();
    pedacos.forEach((p, i) => {
      const r = rot[p.id];
      ligados.add(p.id);
      const [ax, ay] = p.ponto;
      const ly = ys[i];
      const fimX = geo.lx - 8;
      r.el.style.transform = `translate3d(${geo.lx}px, ${(ly - 8).toFixed(1)}px, 0)`;
      if (p.id === 'insumos') {
        const b = quina(p.de);
        const c = quina(p.ate);
        chave.setAttribute('d', `M${(b[0] + 5).toFixed(1)} ${b[1].toFixed(1)}h4L${(c[0] + 9).toFixed(1)} ${c[1].toFixed(1)}h-4`);
        r.fio.setAttribute('d', `M${(ax + 9).toFixed(1)} ${ay.toFixed(1)}L${(fimX - 10).toFixed(1)} ${ly.toFixed(1)}H${fimX}`);
        r.ponto.setAttribute('cx', (ax + 9).toFixed(1));
        r.ponto.setAttribute('cy', ay.toFixed(1));
      } else {
        r.fio.setAttribute('d', `M${ax.toFixed(1)} ${ay.toFixed(1)}h7L${(fimX - 10).toFixed(1)} ${ly.toFixed(1)}H${fimX}`);
        r.ponto.setAttribute('cx', ax.toFixed(1));
        r.ponto.setAttribute('cy', ay.toFixed(1));
      }
    });
    for (const id of ROTS) {
      const liga = ligados.has(id);
      if (liga === rot[id].ligado) continue;
      rot[id].ligado = liga;
      for (const el of [rot[id].el, rot[id].fio, rot[id].ponto]) el.classList.toggle('ligado', liga);
    }
    chave.classList.toggle('ligado', true);
    desenharRegua();
  }

  /** A régua: os traços na quina da esquerda da torre, de 5 em 5 reais, e o preço de agora em amarelo, até a tampa. */
  function desenharRegua() {
    const g = { origem: [geo.x + geo.tw / 2, geo.chao], giroX: giro.x, giroY: giro.y, perspectiva: geo.perspectiva, foco: geo.foco };
    const esquerda = (alto) => {
      const a = projetar([-geo.tw / 2, alto, geo.td / 2], g);
      const b = projetar([-geo.tw / 2, alto, -geo.td / 2], g);
      return a[0] <= b[0] ? a : b;
    };
    const rx = geo.regua - 4; // onde ficam os traços
    let ymin = Infinity;
    for (const m of regua.marcas) {
      const [, y] = esquerda(m.c * geo.esc);
      ymin = Math.min(ymin, y);
      m.traco.setAttribute('d', `M${rx - 5} ${y.toFixed(1)}h5`);
      m.num.setAttribute('x', rx - 8);
      m.num.setAttribute('y', (y + 3).toFixed(1));
    }
    const [, y0] = esquerda(0);
    regua.eixo.setAttribute('d', `M${rx} ${Math.min(ymin, y0).toFixed(1)}V${y0.toFixed(1)}`);
    const tampa = lajes.get('tampa');
    const [px, py] = esquerda(tampa.y);
    regua.preco.setAttribute("d", `M${rx + 1} ${py.toFixed(1)}H${(px - 14).toFixed(1)}`);
  }

  // ---------- o tamanho da cena ----------
  function medir() {
    const L = Math.round(cena.clientWidth);
    const A = Math.round(cena.clientHeight);
    if (!L || !A) return;
    geo = geometria(L, A);
    const s = cena.style;
    s.setProperty('--tw', `${geo.tw}px`);
    s.setProperty('--td', `${geo.td}px`);
    s.setProperty('--tx', `${geo.x}px`);
    s.setProperty('--chao', `${geo.chao}px`);
    s.setProperty('--talto', `${geo.alto}px`);
    s.setProperty('--fx', `${geo.foco[0]}px`);
    s.setProperty('--fy', `${geo.foco[1]}px`);
    s.setProperty('--persp', `${geo.perspectiva}px`);
    fios.setAttribute('viewBox', `0 0 ${L} ${A}`);
    // a tela mudou de tamanho: a torre anda até o tamanho novo (no meio da montagem, ela continua se montando)
    if (t) { for (const l of lajes.values()) { l.alvo = alvoDe(l); l.escrito = ''; } mexer(); }
  }

  // ---------- a torre se monta quando aparece ----------
  function montar() {
    if (montada) return;
    montada = true;
    const t0 = agoraMs() + 120;
    let k = 0;
    for (const l of lajes.values()) {
      if (l.alvo.o < 0.5) { Object.assign(l, { y: l.alvo.y, h: l.alvo.h, f: l.alvo.f, o: 0 }); continue; }
      l.solta = t0 + k * 75;
      l.y = l.alvo.y + 150 + k * 6;
      l.h = l.tipo === 'sobra' ? 0 : l.alvo.h;
      l.o = 0;
      k++;
    }
    giro.y = -52;
    giro.x = -20;
    animarNumero(sobraEl, t.sobra, { de: 0, formato: (c) => textoSobra(Math.round(c)), ms: 900 + k * 75 });
    mexer();
    setTimeout(demo, 700 + k * 75 + 250);
  }

  // a demonstração: uma vez só, se a pessoa ainda não mexeu, o preço desce e volta (a torre mostra que está viva)
  function demo() {
    if (interagiu || parado || !visivel) return;
    const de = estado.preco;
    const ate = 17;
    const t0 = agoraMs();
    const ida = 800;
    const pausa = 350;
    const curva = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    const passo = () => {
      if (interagiu) return;
      const dt = agoraMs() - t0;
      let v;
      if (dt < ida) v = de + (ate - de) * curva(dt / ida);
      else if (dt < ida + pausa) v = ate;
      else if (dt < ida * 2 + pausa) v = ate + (de - ate) * curva((dt - ida - pausa) / ida);
      else v = de;
      const p = Math.round(v / FAIXA_PRECO.passo) * FAIXA_PRECO.passo;
      if (p !== estado.preco) { estado.preco = p; controle.value = String(p); contar({ demo: true }); }
      if (dt < ida * 2 + pausa) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  // ---------- o que a pessoa faz ----------
  const mexeu = () => { interagiu = true; };
  painel.addEventListener('pointerdown', mexeu, { capture: true });
  painel.addEventListener('keydown', mexeu, { capture: true });
  controle.addEventListener('input', () => { mexeu(); estado.preco = Number(controle.value); contar(); });
  for (const b of canaisEl.querySelectorAll('[data-canal]')) {
    b.addEventListener('click', () => {
      mexeu();
      if (estado.canal === b.dataset.canal) return;
      estado.canal = b.dataset.canal;
      canaisEl.dataset.canal = estado.canal;
      for (const o of canaisEl.querySelectorAll('[data-canal]')) o.setAttribute('aria-pressed', String(o === b));
      contar();
      if (estado.canal !== 'balcao') { piscar('app'); vibrar(10); }
    });
  }
  const piscar = (id) => {
    const el = lajes.get(id)?.el;
    if (!el || parado) return;
    el.classList.remove('tp-pisca');
    void el.offsetWidth;
    el.classList.add('tp-pisca');
    setTimeout(() => el.classList.remove('tp-pisca'), 1000);
  };
  function alternar(id, botao) {
    mexeu();
    if (id === 'embalagem') estado.semEmbalagem = !estado.semEmbalagem;
    else {
      const nome = id.slice(4);
      if (estado.tirados.has(nome)) estado.tirados.delete(nome);
      else if (totalIngredientes - estado.tirados.size <= 1) { negar(botao); return; } // a conta precisa de 1 ingrediente
      else estado.tirados.add(nome);
    }
    contar();
    vibrar(8);
  }
  const negar = (botao) => {
    dica.textContent = 'Fica pelo menos 1 ingrediente na conta.';
    if (!botao || parado) return;
    botao.classList.remove('tp-nega');
    void botao.offsetWidth;
    botao.classList.add('tp-nega');
  };
  const focar = (id) => {
    estado.foco = id;
    for (const l of lajes.values()) l.el.classList.toggle('tp-acesa', l.id === id);
    if (id) rot.foco.el.querySelector('.tp-rot-nome').textContent = id === 'embalagem' ? 'Embalagem' : nomeCurto(id.slice(4));
    if (id) animarNumero(rot.foco.valor, custoBase.get(id) ?? 0, { formato: (c) => reais(Math.round(c), { simbolo: false }), ms: 0 });
    desenharRotulos();
  };
  for (const b of ingsEl.querySelectorAll('[data-ing]')) {
    b.addEventListener('click', () => alternar(b.dataset.ing, b));
    b.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') focar(b.dataset.ing); });
    b.addEventListener('pointerleave', () => focar(null));
    b.addEventListener('focus', () => focar(b.dataset.ing));
    b.addEventListener('blur', () => focar(null));
  }
  // tocar numa camada da torre também tira ou põe (o que está embaixo do dedo)
  const camadaEm = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.('.tp-laje');
    const id = el?.dataset.id;
    return id && (id === 'embalagem' || id.startsWith('ing:')) ? id : null;
  };
  if (temMouse()) {
    cena.addEventListener('click', (ev) => { const id = camadaEm(ev.clientX, ev.clientY); if (id) alternar(id, ingsEl.querySelector(`[data-ing="${CSS.escape(id)}"]`)); });
    cena.addEventListener('pointermove', (ev) => { const id = camadaEm(ev.clientX, ev.clientY); cena.classList.toggle('tp-aponta', Boolean(id)); });
    // a torre gira um pouco com o mouse (no painel inteiro)
    painel.addEventListener('pointermove', (ev) => {
      if (ev.pointerType !== 'mouse' || parado) return;
      const r = painel.getBoundingClientRect();
      const px = limitar((ev.clientX - r.left) / r.width, 0, 1);
      const py = limitar((ev.clientY - r.top) / r.height, 0, 1);
      giro.ay = GIRO_BASE.y + (px - 0.5) * 26;
      giro.ax = GIRO_BASE.x - (0.5 - py) * 9;
      mexer();
    });
    painel.addEventListener('pointerleave', () => { giro.ax = GIRO_BASE.x; giro.ay = GIRO_BASE.y; mexer(); });
  } else {
    // no celular: arrastar de lado gira a torre (a página continua rolando para baixo); um toque tira ou põe
    pegar(cena, {
      eixo: 'x',
      aoMover: ({ dx }) => { if (parado) return; giro.ay = limitar(GIRO_BASE.y + dx * 0.32, -62, 14); mexer(); },
      aoSoltar: ({ dx, dy, x, y }) => {
        giro.ay = GIRO_BASE.y;
        mexer();
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
          const id = camadaEm(x, y);
          if (id) alternar(id, ingsEl.querySelector(`[data-ing="${CSS.escape(id)}"]`));
        } else mexeu();
      },
    });
  }

  // ---------- liga ----------
  medir();
  contar();
  assentar();
  desenhar();
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => medir()).observe(cena);
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel && !montada && e.intersectionRatio >= 0.2) montar();
      else if (visivel) mexer();
    }, { threshold: [0, 0.2] }).observe(cena);
  } else { visivel = true; montada = true; }
  painel.setAttribute('aria-busy', 'false');
}

// =====================================================================================================
// 2. A VITRINE VIVA (no celular, o cartão que entra na tela; no computador o CSS faz pelo mouse)
// =====================================================================================================

function ligarVitrineViva(doc) {
  const lista = doc.querySelector('[data-vitrine]');
  if (!lista || typeof IntersectionObserver !== 'function' || pedeMenosMovimento()) return;
  // o cartão que entra na tela no celular (.vit-viva) é o site.js que liga, em toda página com vitrine
  // o recibo do Pine Cost faz a conta quando aparece (os números de verdade, rolando do zero)
  const recibo = lista.querySelector('.vit-recibo-conta');
  if (!recibo) return;
  const rolar = () => {
    for (const n of recibo.querySelectorAll('[data-rola-num]')) {
      const final = n.textContent;
      const molde = moldeDoNumero(final);
      const para = Number(n.dataset.rolaNum);
      if (!molde || !Number.isFinite(para)) continue;
      animarNumero(n, para, { de: 0, ms: 1100, formato: (v) => (v === para ? final : noMolde(molde, v)) });
    }
  };
  const quandoAparecer = () => {
    const olho = new IntersectionObserver(([e]) => { if (e.isIntersecting) { olho.disconnect(); rolar(); } }, { threshold: 0.6 });
    olho.observe(recibo);
  };
  if (recibo.getAttribute('aria-busy') === 'false') quandoAparecer();
  else {
    const mo = new MutationObserver(() => { if (recibo.getAttribute('aria-busy') === 'false') { mo.disconnect(); quandoAparecer(); } });
    mo.observe(recibo, { attributes: true, attributeFilter: ['aria-busy'] });
  }
}

// =====================================================================================================
// 3. O "COMO FUNCIONA" QUE SE ESCREVE (a conversa de exemplo anda junto com a rolagem)
// =====================================================================================================

function ligarConversa(palco, tab) {
  const falas = palco.querySelector('[data-cv="falas"]');
  const deNovo = palco.querySelector('[data-cv="de-novo"]');
  const passos = [...palco.querySelectorAll('[data-passo]')];
  if (!falas) return;
  const ex = EXEMPLOS['x-bacon'];
  const f = tab ? calcular(ex, tab) : null;
  const msgs = f ? conversaDeExemplo(ex, f) : [];
  if (!msgs.length) return; // sem a conta, fica a conversa do HTML
  const parado = pedeMenosMovimento();
  const n = msgs.length;
  let mostradas = 0;
  let alcance = 0;
  let ocupado = false;
  let vez = 0; // muda a cada "ver de novo": a sequência velha para
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

  const marcarPassos = (atual) => {
    passos.forEach((li, k) => {
      const p = k + 1;
      li.classList.toggle('como-feito', p < atual || atual > 3);
      li.classList.toggle('como-agora', p === atual);
      li.classList.toggle('como-espera', p > atual && atual <= 3);
    });
  };

  const balao = (m) => {
    const d = document.createElement('div');
    d.className = `cv-msg cv-${m.quem}`;
    if (m.tipo === 'texto') d.innerHTML = `<p class="cv-balao">${m.linhas.map(() => '<span class="cv-linha"></span>').join('')}</p>`;
    else d.innerHTML = `<div class="cv-balao cv-ficha"><p class="cv-ficha-rot">Ficha técnica</p><p class="resumo-item">${esc(f.item)} <span class="selo-exemplo">exemplo</span></p>${montarResumo(f)}</div><p class="cv-legenda">${esc(m.legenda)}</p>`;
    return d;
  };

  // quem rola rápido não espera: com a pessoa mais de uma fala à frente, a conversa se escreve mais depressa
  const pressa = () => (alcance * n - mostradas > 1.6 ? 0.35 : 1);

  async function mostrar(m, minhaVez, rapido) {
    marcarPassos(m.passo);
    if (m.quem === 'pine' && !rapido) {
      const digitando = document.createElement('div');
      digitando.className = 'cv-msg cv-pine cv-entra';
      digitando.innerHTML = '<p class="cv-balao cv-digitando" aria-hidden="true"><i></i><i></i><i></i></p>';
      falas.append(digitando);
      await espera((m.tipo === 'ficha' ? 900 : 650) * pressa());
      digitando.remove();
      if (minhaVez !== vez) return;
    }
    const d = balao(m);
    if (!rapido) d.classList.add('cv-entra');
    falas.append(d);
    if (m.tipo === 'texto') {
      const linhas = [...d.querySelectorAll('.cv-linha')];
      for (const [i, el] of linhas.entries()) {
        if (rapido) el.textContent = m.linhas[i];
        else await escrever(el, m.linhas[i], { ms: (m.linhas[i].length > 30 ? 16 : 24) * pressa() });
        if (minhaVez !== vez) return;
      }
    }
    if (m.tipo === 'ficha' && !rapido) {
      for (const num of d.querySelectorAll('[data-rola-num]')) {
        const final = num.textContent;
        const molde = moldeDoNumero(final);
        const para = Number(num.dataset.rolaNum);
        if (molde && Number.isFinite(para)) animarNumero(num, para, { de: 0, ms: 1000, formato: (v) => (v === para ? final : noMolde(molde, v)) });
      }
    }
    if (!rapido) await espera(260 * pressa());
  }

  async function seguir() {
    if (ocupado) return;
    ocupado = true;
    const minhaVez = vez;
    while (mostradas < n && alcance >= (mostradas + 0.6) / n) {
      await mostrar(msgs[mostradas], minhaVez, parado);
      if (minhaVez !== vez) { ocupado = false; return; }
      mostradas++;
    }
    if (mostradas >= n) fim(minhaVez);
    ocupado = false;
  }

  function fim(minhaVez) {
    marcarPassos(4);
    deNovo.hidden = false;
    if (!parado && minhaVez === vez) { const ultimo = falas.lastElementChild; if (ultimo) estourarEm(ultimo.querySelector('.cv-balao') ?? ultimo, { quantos: 12, raio: 56 }); }
  }

  const comecar = () => {
    vez++;
    falas.innerHTML = '';
    mostradas = 0;
    ocupado = false;
    marcarPassos(0);
  };

  // a rolagem: a conversa começa quando o celular entra na tela e termina quando ele está inteiro nela
  const cena = palco.querySelector('[data-cena]') ?? palco;
  const aoRolar = (p) => {
    const H = window.innerHeight;
    const h = cena.getBoundingClientRect().height;
    const ini = (0.22 * H) / (H + h);
    const fimP = Math.min(0.5, h / (H + h) + 0.04);
    const t = limitar((p - ini) / Math.max(0.05, fimP - ini), 0, 1);
    if (t > alcance) { alcance = t; seguir(); }
  };

  comecar();
  deNovo.hidden = true;
  if (parado) { alcance = 1; seguir(); return; }
  cena.addEventListener('cena', (ev) => aoRolar(ev.detail.p));
  if (cena.dataset.p) aoRolar(Number(cena.dataset.p));
  deNovo.addEventListener('click', async () => {
    comecar();
    deNovo.hidden = true;
    const minhaVez = vez;
    for (const m of msgs) {
      await mostrar(m, minhaVez, false);
      if (minhaVez !== vez) return;
      mostradas++;
      await espera(380);
    }
    alcance = 1;
    fim(minhaVez);
  });
}

// =====================================================================================================
// 4. O ESCRITÓRIO VIVO (as 22 mesinhas acendem junto com a contagem)
// =====================================================================================================

function ligarEscritorio(doc) {
  const planta = doc.querySelector('[data-esc="planta"]');
  const numero = doc.querySelector('[data-esc="numero"]');
  if (!planta || !numero) return;
  const n = Number(numero.dataset.contaAte) || Number(numero.textContent) || 0;
  const chao = planta.querySelector('.esc-chao') ?? planta;
  chao.innerHTML = mesas(n).map((m) => `<i class="esc-mesa" style="--i:${m.i}"><b></b></i>`).join('');
  if (pedeMenosMovimento() || typeof IntersectionObserver !== 'function') { planta.classList.add('acesa'); return; }
  const ms = Number(numero.dataset.contaMs || 1200);
  planta.style.setProperty('--passo', `${Math.round(ms / Math.max(1, n))}ms`);
  // o mesmo momento da contagem do kit (metade do número na tela)
  const olho = new IntersectionObserver(([e]) => { if (e.isIntersecting) { olho.disconnect(); planta.classList.add('acesa'); } }, { threshold: 0.5 });
  olho.observe(numero);
}

// =====================================================================================================
// LIGA TUDO
// =====================================================================================================

if (typeof document !== 'undefined') {
  ligarVitrineViva(document);
  ligarEscritorio(document);
  const painel = document.querySelector('[data-torre]');
  const palco = document.querySelector('[data-como]');
  carregarTabelas().then((tab) => {
    if (painel) {
      try { ligarTorre(painel, tab); } catch (e) {
        painel.querySelector('[data-tp="dica"]').textContent = `Não deu para montar a torre (${e.message}).`;
        painel.setAttribute('aria-busy', 'false');
      }
    }
    if (palco) ligarConversa(palco, tab);
  }).catch((e) => {
    if (painel) {
      painel.querySelector('[data-tp="dica"]').textContent = `Não deu para fazer a conta (${e.message}).`;
      painel.setAttribute('aria-busy', 'false');
    }
  });
}
