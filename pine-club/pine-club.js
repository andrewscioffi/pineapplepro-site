// A DEMONSTRAÇÃO DO PINE CLUB NA TELA (07/11/2026; v3, o Andrews: "eu quero que a interface seja altamente interativa").
// As contas ficam em demo.js e gestos.js (testadas no Node); aqui só desenha e liga os toques.
//   1. os 2 lados ao mesmo tempo: o cartão do cliente no celular dele e o painel do dono
//      - (v3) o carimbo que a pessoa arrasta do balcão até o cartão: cai com uma batida; bateu a meta, estoura e o prêmio libera
//      - o "+1 selo" continua (o teclado e quem não quer arrastar): o carimbo voa do botão até o cartão
//      - (v3) o cartão vira com o dedo ou o mouse (e pelo botão): no verso, o código, o presente e o que o clube guarda
//      - o nome da loja que a pessoa escreve entra no cartão, no código e na mensagem (só na tela: nada é gravado nem enviado)
//      - (v3) o dono troca a meta ou o prêmio: a conta pela ficha rola até o número novo, e a barra do prêmio anda
//   2. o presente que cabe no mês: o cliente escolhe, o custo sai do limite (o número rola, a barra enche ou esvazia)
//   3. (v3) o mês do clube: a pessoa diz quantos entram e quantas vezes voltam; os cartões enchem e a conta sai das regras
//   4. o dado do cliente: com e sem o aceite, e o "pediu pra sair"
// Todo texto digitado entra só por textContent (nunca vira HTML). Quem pediu menos movimento vê tudo funcionando, parado.
import { EXEMPLOS } from '../comum/exemplos.js';
import { carregarTabelas, calcular, reais, pct, esc } from '../comum/ficha.js';
import { animarNumero, trocarConteudo, estourarEm, vibrar, pegar, pedeMenosMovimento } from '../comum/interacao.js';
import * as D from './demo.js';
import * as G from './gestos.js';

// os desenhos (fixos, sem nada digitado dentro)
const COROA = '<svg class="coroa" viewBox="5 6 22 22" aria-hidden="true" focusable="false"><path d="M16 22c-4.9-3.6-4.9-9.4 0-13c4.9 3.6 4.9 9.4 0 13z"/><path d="M16 22.4c-3.8-2.8-3.8-7.2 0-10c3.8 2.8 3.8 7.2 0 10z" transform="rotate(-50 16 22.4)"/><path d="M16 22.4c-3.8-2.8-3.8-7.2 0-10c3.8 2.8 3.8 7.2 0 10z" transform="rotate(50 16 22.4)"/><path d="M10.5 25.6h11"/></svg>';
const PRESENTE = '<svg class="pres" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 8.5h17v4h-17z"/><path d="M5 12.5h14v8H5z"/><path d="M12 8.5v12"/><path d="M12 8.5C10.6 5 7 4.3 7 6.6c0 1.6 2.6 1.9 5 1.9Z"/><path d="M12 8.5c1.4-3.5 5-4.2 5-1.9 0 1.6-2.6 1.9-5 1.9Z"/></svg>';
const GIROS = [-8, 5, -3, 9, -6, 3, -10, 6, -4, 8]; // cada carimbo cai um pouco torto, como na mão
const MOSTRAR = 24; // o mês: quantos cartões aparecem na parede (os outros são iguais)

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const menos = () => pedeMenosMovimento();
const rs = (c) => reais(c).replace(' ', '\u00a0'); // o "R$ 11,20" nunca quebra no meio (o espaço que não quebra)
const rsCurto = (c) => (c % 100 ? rs(c) : `R$ ${(c / 100).toLocaleString('pt-BR')}`); // "R$ 50" no botão do limite
const inteiro = (t) => String(t).replace(/-/g, '‑'); // o "X-Bacon" não quebra no hífen
const comExemplo = (m) => `${m.nome} (exemplo)`;
const num = (c) => (c / 100).toFixed(2); // o valor em reais para o número que rola (data-rola-num)
const quadro = (f) => requestAnimationFrame(f);

function el(tag, classe, texto) {
  const n = document.createElement(tag);
  if (classe) n.className = classe;
  if (texto !== undefined && texto !== null) n.textContent = texto;
  return n;
}
/** Recomeça a animação da classe. Com `tirar` (ms), a classe sai depois, para não brigar com a próxima animação. */
function reanimar(n, classe, tirar = 0) {
  n.classList.remove(classe);
  void n.offsetWidth; // recomeça a animação
  n.classList.add(classe);
  if (tirar) setTimeout(() => n.classList.remove(classe), tirar);
}
/** O cartão do cliente "bate" (o carimbo caiu) ou "vira" (outro membro, prêmio usado): uma animação de cada vez. */
function animarCartao(classe) {
  if (menos()) return;
  const cartao = $('[data-cartao]');
  cartao.classList.remove('bateu', 'recomecou');
  reanimar(cartao, classe, 900);
}
function naTela(n) {
  if (!n) return false;
  const r = n.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < (window.innerHeight || 0);
}

// ---------- o estado da demonstração (só na memória da aba) ----------
const estado = {
  loja: D.NOME_PADRAO,
  meta: D.META_PADRAO,
  premio: D.PREMIO_PADRAO,
  membros: D.membrosDeExemplo(),
  ativo: 'ana',
  volta: null, // de quem é a mensagem pronta aberta
  historico: [], // para o "Desfazer"
  chegando: new Set(), // as casas com um carimbo ainda voando
  versao: 0, // muda quando o cartão muda de cara (outro membro, outra meta): o carimbo que estava voando não anima
  presentes: null, // as fichas já calculadas, quando a calculadora terminar
  conta: '', // a meta e o prêmio da conta que está na tela (só refaz quando um dos 2 muda)
};
const limite = { limite_c: D.LIMITE_PADRAO, saiu_c: 0, escolhidos: 0 };
const giro = { angulo: 0 }; // o cartão do cliente: 0 = a frente (os selos), 180 = o verso
const mes = { clientes: D.CLIENTES.padrao, voltas: D.VOLTAS.padrao, meta: 0, antes: null, pedido: 0 };

const ativo = () => estado.membros.find((m) => m.id === estado.ativo) ?? estado.membros[0];
const trocar = (novo) => { estado.membros = estado.membros.map((m) => (m.id === novo.id ? novo : m)); };
const premio = () => D.fichaDemo(estado.premio);
function guardar() {
  estado.historico.push({ membros: estado.membros.map((m) => ({ ...m })), volta: estado.volta, ativo: estado.ativo });
  if (estado.historico.length > 40) estado.historico.shift();
}
function anunciar(texto) {
  const a = $('[data-anuncio]');
  if (!a) return;
  a.classList.remove('comeco'); // a dica do começo sai no primeiro toque
  a.textContent = inteiro(texto);
}

// ---------- o cartão do cliente ----------
function montarCartela(total) {
  const cartela = $('[data-cartela]');
  if (Number(cartela.dataset.total) === total) return;
  cartela.dataset.total = String(total);
  cartela.style.setProperty('--colunas', String(total <= 5 ? total : Math.ceil(total / 2)));
  cartela.replaceChildren(...Array.from({ length: total }, (_, i) => {
    const casa = el('span', i + 1 === total ? 'carimbo premio' : 'carimbo');
    casa.dataset.casa = String(i + 1);
    casa.style.setProperty('--giro', `${GIROS[i % GIROS.length]}deg`);
    return casa;
  }));
}

function pintarVerso(m) {
  const v = D.versoDoCartao(m, estado.loja);
  $('[data-verso-codigo]').textContent = v.codigo;
  $('[data-verso-presente]').textContent = inteiro(v.presente);
  $('[data-verso-guarda]').replaceChildren(...v.guarda.map((g) => {
    const linha = el('div');
    linha.append(el('dt', '', g.rotulo), el('dd', '', g.valor));
    return linha;
  }));
}

function pintarCartao({ carimbou = 0 } = {}) {
  const m = ativo();
  const c = D.cartao(m.selos, estado.meta);
  // o que o cliente vê agora: o carimbo que ainda está voando só conta quando bate no cartão
  const voando = [...estado.chegando].filter((n) => n <= c.cheios).length;
  const visto = D.cartao(m.selos - voando, estado.meta);
  montarCartela(c.total);
  $('[data-membro-nome]').textContent = m.nome;
  $('[data-membro-codigo]').textContent = D.codigo(estado.loja, m.numero);
  const cartela = $('[data-cartela]');
  cartela.setAttribute('aria-label', `Cartão de ${comExemplo(m)}: ${visto.cheios} de ${visto.total} selos`);
  for (const casa of cartela.children) {
    const n = Number(casa.dataset.casa);
    const cheio = n <= c.cheios;
    const conteudo = n === c.total ? 'premio' : cheio ? 'coroa' : 'numero';
    casa.classList.toggle('cheio', cheio);
    casa.classList.toggle('chegando', cheio && estado.chegando.has(n));
    if (!cheio) casa.classList.remove('acabou');
    if (casa.dataset.conteudo !== conteudo) {
      casa.dataset.conteudo = conteudo;
      if (conteudo === 'numero') casa.textContent = String(n);
      else casa.innerHTML = conteudo === 'premio' ? PRESENTE : COROA;
    }
  }
  if (carimbou && !menos()) {
    const casa = cartela.querySelector(`[data-casa="${carimbou}"]`);
    if (casa) reanimar(casa, 'acabou');
  }
  const faltam = $('[data-faltam]');
  faltam.textContent = D.textoDoCartao(visto.cheios + visto.sobra, estado.meta);
  faltam.hidden = visto.completo;
  $('[data-completo]').hidden = !visto.completo;
  const sobra = $('[data-sobra]');
  sobra.hidden = !visto.sobra;
  sobra.textContent = visto.sobra === 1 ? 'E já tem 1 selo pro próximo cartão.' : `E já tem ${visto.sobra} selos pro próximo cartão.`;
  $('[data-cartao]').classList.toggle('completo', visto.completo);
  for (const n of $$('[data-premio-nome]')) n.textContent = inteiro(premio().premio);
  pintarVerso(m);
}

// ---------- o cartão que vira (v3): o dedo, o mouse ou o botão ----------
const ladoAtual = () => G.ladoDoGiro(giro.angulo);

function aplicarGiro(angulo) {
  giro.angulo = angulo;
  $('[data-giro]').style.transform = `rotateY(${angulo.toFixed(2)}deg)`;
}

/** Depois do giro: só o lado que aparece fica para o leitor de tela e para o teclado. */
function assentarLado() {
  const lado = ladoAtual();
  for (const f of $$('[data-face]')) {
    const aparece = f.dataset.face === lado;
    f.toggleAttribute('inert', !aparece);
    f.setAttribute('aria-hidden', String(!aparece));
  }
  const b = $('[data-virar]');
  b.setAttribute('aria-pressed', String(lado === 'verso'));
  b.setAttribute('aria-label', lado === 'verso' ? 'Virar o cartão: ver os selos' : 'Virar o cartão: ver o verso');
  $('[data-cartao]').dataset.lado = lado;
}

function virarPara(lado, { ja = false } = {}) {
  if (ladoAtual() === lado) return;
  const rodar = $('[data-giro]');
  if (ja) rodar.classList.add('girando'); // sem a transição: o carimbo precisa achar a casa no lugar certo
  aplicarGiro(giro.angulo + 180);
  assentarLado();
  if (ja) { void rodar.offsetWidth; rodar.classList.remove('girando'); }
}

function ligarVirar() {
  const cartao = $('[data-cartao]');
  const rodar = $('[data-giro]');
  const botao = $('[data-virar]');
  if (!cartao || !rodar || !botao) return;
  let ini = null;
  // o botão tem o clique dele (sem o "pegar" do cartão prender o dedo)
  botao.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  botao.addEventListener('click', () => { virarPara(ladoAtual() === 'frente' ? 'verso' : 'frente'); vibrar(6); });
  pegar(cartao, {
    eixo: 'x', // o dedo que sobe e desce ainda rola a página
    aoComecar: () => { ini = { base: giro.angulo, moveu: false }; },
    aoMover: ({ dx }) => {
      if (!ini) return;
      if (!ini.moveu) {
        if (Math.abs(dx) < 8) return;
        ini.moveu = true;
        rodar.classList.add('girando');
        cartao.classList.add('virando');
      }
      aplicarGiro(G.giroDoArrasto(ini.base, dx, cartao.offsetWidth));
    },
    aoSoltar: ({ vx, dx, cancelou }) => {
      const i = ini;
      ini = null;
      if (!i) return;
      rodar.classList.remove('girando');
      cartao.classList.remove('virando');
      if (!i.moveu) { // um toque no cartão também vira
        if (!cancelou && Math.abs(dx) < 6) { virarPara(ladoAtual() === 'frente' ? 'verso' : 'frente'); vibrar(6); }
        return;
      }
      aplicarGiro(cancelou ? i.base : G.giroAoSoltar(giro.angulo, { vx, base: i.base }));
      assentarLado();
      vibrar(6);
    },
  });
  assentarLado();
}

// ---------- o painel do dono ----------
function pintarBalcao() {
  const m = ativo();
  const c = D.cartao(m.selos, estado.meta);
  $('[data-ativo-nome]').textContent = comExemplo(m);
  $('[data-ativo-codigo]').textContent = D.codigo(estado.loja, m.numero);
  const usar = $('[data-acao="premio"]');
  usar.disabled = !c.completo;
  usar.classList.toggle('pronto', c.completo);
  $('[data-acao="desfazer"]').disabled = !estado.historico.length;
}

function pintarNumeros() {
  const n = D.numeros(estado.membros);
  for (const chave of ['membros', 'voltaram', 'sumiram']) {
    const dd = $(`[data-num="${chave}"]`);
    const novo = n[chave];
    if (dd.textContent === String(novo)) continue;
    animarNumero(dd, novo, { de: Number(dd.textContent) || 0, ms: 420, marcar: true });
    if (!menos()) { reanimar(dd, 'mudou'); setTimeout(() => dd.classList.remove('mudou'), 1400); }
  }
}

function montarMembros() {
  $('[data-membros]').replaceChildren(...estado.membros.map((m) => {
    const li = el('li');
    li.dataset.membro = m.id;
    const botao = el('button', 'membro');
    botao.type = 'button';
    botao.dataset.acao = 'escolher';
    botao.dataset.membro = m.id;
    const inicial = el('span', 'm-inicial', m.nome.charAt(0));
    inicial.setAttribute('aria-hidden', 'true');
    const linha = el('span', 'm-linha');
    linha.append(el('span', 'm-selos'), el('span', 'etq'));
    botao.append(inicial, el('span', 'm-nome', comExemplo(m)), linha);
    const chamar = el('button', 'chamar', 'Chamar no WhatsApp');
    chamar.type = 'button';
    chamar.dataset.acao = 'chamar';
    chamar.dataset.membro = m.id;
    chamar.setAttribute('aria-label', `Chamar ${comExemplo(m)} no WhatsApp, com a mensagem pronta`);
    li.append(botao, chamar);
    return li;
  }));
}

function pintarMembros() {
  for (const m of estado.membros) {
    const li = $(`[data-membros] li[data-membro="${m.id}"]`);
    if (!li) continue;
    const c = D.cartao(m.selos, estado.meta);
    const s = D.situacaoDoMembro(m, estado.meta);
    li.querySelector('.membro').setAttribute('aria-pressed', String(m.id === estado.ativo));
    li.querySelector('.m-selos').textContent = `${c.cheios} de ${c.total} selos`;
    const etq = li.querySelector('.etq');
    etq.className = `etq ${s.id}`;
    etq.textContent = s.texto;
    li.querySelector('.chamar').hidden = !D.naLista(m);
  }
}

function pintarVolta() {
  const m = estado.membros.find((x) => x.id === estado.volta);
  $('[data-volta]').hidden = !m;
  if (m) $('[data-volta-msg]').textContent = D.mensagemDeVolta(m.nome, estado.loja);
}

function pintarAjustes() {
  // os chips da meta e do prêmio do painel e os do mês do clube (é o mesmo clube)
  for (const b of $$('[data-meta]')) b.setAttribute('aria-pressed', String(Number(b.dataset.meta) === estado.meta));
  for (const b of $$('[data-premio]')) b.setAttribute('aria-pressed', String(b.dataset.premio === estado.premio));
}

/** A conta do prêmio pela ficha (só números da calculadora e textos fixos: nada digitado entra aqui). */
export function htmlDaConta(p, meta, presentes) {
  const pedido = D.porPedido(p.custo_c, meta);
  const barra = (D.tamanhoDoPremio(p.custo_c, presentes) * 100).toFixed(1);
  return `<div class="conta-linha"><span>Pro cliente, vale</span><b data-rola="balcao" data-rola-num="${num(p.balcao_c)}">${rs(p.balcao_c)}</b><small>o preço do balcão</small></div>`
    + `<div class="conta-linha custa"><span>Pra você, custa</span><b data-rola="custo" data-rola-num="${num(p.custo_c)}">uns ${rs(p.custo_c)}</b><small>ingredientes ${rs(p.ingredientes_c)} + embalagem ${rs(p.embalagem_c)}</small></div>`
    + `<div class="conta-linha"><span>Dividido pelos <span data-rola="meta" data-rola-num="${meta}">${meta}</span> pedidos do cartão</span><b data-rola="pedido" data-rola-num="${num(pedido)}">uns ${rs(pedido)}</b><small>por pedido</small></div>`
    + `<div class="conta-fatias"><p class="conta-fatias-rot">O prêmio dividido pelos pedidos do cartão</p><span class="conta-trilho" aria-hidden="true"><i data-rola="fatias" data-rola-anima="width" style="width: ${barra}%; --n: ${meta}"></i></span></div>`
    + `<p class="conta-nota">Ficha de exemplo da ferramenta (${esc(inteiro(p.nome))}). A conta sai da mesma calculadora das fichas de verdade.</p>`;
}

function pintarConta() {
  const conta = $('[data-conta]');
  if (!estado.presentes) return;
  const p = estado.presentes.find((x) => x.id === estado.premio);
  if (!p) return;
  const meta = D.cartao(0, estado.meta).total;
  const chave = `${p.id}|${meta}`;
  if (estado.conta === chave) return; // nada mudou na conta (o leitor de tela não lê de novo)
  const primeira = !estado.conta;
  estado.conta = chave;
  trocarConteudo(conta, htmlDaConta(p, meta, estado.presentes), { ms: 650 });
  conta.setAttribute('aria-busy', 'false');
  if (!primeira && !menos()) reanimar(conta, 'mexeu', 700);
}

function pintarTudo() {
  pintarCartao();
  pintarBalcao();
  pintarNumeros();
  pintarMembros();
  pintarVolta();
  pintarAjustes();
  pintarConta();
}

// ---------- o voo do carimbo, o carimbo arrastado e o estouro ----------
function novoCarimbo() {
  const voo = el('span', 'carimbo-voando');
  voo.setAttribute('aria-hidden', 'true');
  voo.innerHTML = COROA;
  document.body.append(voo);
  return voo;
}

/** O carimbo sai do botão do balcão e cai no cartão do cliente. Resolve um pouco antes do fim, quando ele "bate". */
function voar(de, para) {
  const a = de.getBoundingClientRect();
  const b = para.getBoundingClientRect();
  const [x0, y0] = [a.left + a.width / 2, a.top + a.height / 2];
  const [x1, y1] = [b.left + b.width / 2, b.top + b.height / 2];
  const escala = Math.max(0.5, Math.min(1.3, b.width / 52));
  const voo = novoCarimbo();
  const [mx, my] = [(x0 + x1) / 2, Math.min(y0, y1) - 90];
  const duracao = 700;
  voo.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(.6) rotate(-40deg)`, opacity: 0 },
    { transform: `translate(${mx}px, ${my}px) scale(1.5) rotate(-14deg)`, opacity: 1, offset: 0.45 },
    { transform: `translate(${x1}px, ${y1}px) scale(${(escala * 1.5).toFixed(2)}) rotate(6deg)`, opacity: 1, offset: 0.84 },
    { transform: `translate(${x1}px, ${y1}px) scale(${escala.toFixed(2)}) rotate(0deg)`, opacity: 0 },
  ], { duration: duracao, easing: 'cubic-bezier(.45, 0, .2, 1)' });
  setTimeout(() => voo.remove(), duracao + 60);
  return new Promise((r) => setTimeout(r, Math.round(duracao * 0.84)));
}

/** O carimbo arrastado cai na casa: sobe um pouco (a mão levanta) e bate. Resolve na batida. */
function cair(fantasma, para) {
  const b = para.getBoundingClientRect();
  const [x1, y1] = [b.left + b.width / 2, b.top + b.height / 2];
  const escala = Math.max(0.5, Math.min(1.3, b.width / 52));
  const duracao = 360;
  fantasma.classList.remove('arrastado');
  fantasma.animate([
    { transform: fantasma.style.transform || 'none', opacity: 1 },
    { transform: `translate(${x1}px, ${y1 - 18}px) scale(${(escala * 1.7).toFixed(2)}) rotate(-10deg)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${x1}px, ${y1}px) scale(${(escala * 0.9).toFixed(2)}) rotate(3deg)`, opacity: 1, offset: 0.86 },
    { transform: `translate(${x1}px, ${y1}px) scale(${escala.toFixed(2)}) rotate(0deg)`, opacity: 0 },
  ], { duration: duracao, easing: 'cubic-bezier(.5, 0, .3, 1)', fill: 'forwards' });
  setTimeout(() => fantasma.remove(), duracao + 60);
  return new Promise((r) => setTimeout(r, Math.round(duracao * 0.86)));
}

/** Soltou fora do cartão: o carimbo volta para o lugar dele no balcão, com mola. */
function voltarAoNinho(fantasma, pega) {
  const fim = () => { fantasma.remove(); pega.classList.remove('saiu'); };
  if (menos()) { fim(); return; }
  const b = pega.getBoundingClientRect();
  fantasma.classList.remove('arrastado');
  const a = fantasma.animate([
    { transform: fantasma.style.transform || 'none' },
    { transform: `translate(${b.left + b.width / 2}px, ${b.top + b.height / 2}px) scale(1) rotate(-8deg)` },
  ], { duration: 460, easing: 'cubic-bezier(.3, 1.4, .45, 1)', fill: 'forwards' });
  a.onfinish = fim;
  setTimeout(fim, 700);
}

function comemorar() {
  const cartao = $('[data-cartao]');
  if (!menos()) reanimar(cartao, 'brilhou', 1400);
  if (naTela(cartao)) estourarEm(cartao, { quantos: 30, raio: 130 });
  vibrar(28);
}

// ---------- os toques no painel do dono ----------
/** +1 selo: do botão (`de`, o carimbo voa) ou do carimbo arrastado (`fantasma`, ele cai onde a pessoa soltou). */
function darSelo({ de = null, fantasma = null } = {}) {
  virarPara('frente', { ja: true }); // o selo cai na frente do cartão
  const antes = ativo();
  const cAntes = D.cartao(antes.selos, estado.meta);
  guardar();
  const depois = D.darSelo(antes);
  trocar(depois);
  if (estado.volta === depois.id) estado.volta = null;
  const c = D.cartao(depois.selos, estado.meta);
  const casa = c.cheios > cAntes.cheios ? c.cheios : 0;
  if (D.sumiu(antes)) anunciar(`${depois.nome} voltou! +1 selo: ${c.cheios} de ${c.total}.`);
  else if (c.completo && !cAntes.completo) anunciar(`Cartão completo: ${depois.nome} ganhou ${premio().premio}.`);
  else anunciar(`+1 selo para ${depois.nome}: ${c.cheios} de ${c.total}.`);

  const alvo = casa ? $(`[data-cartela] [data-casa="${casa}"]`) : $('[data-membro-codigo]');
  const anima = !menos() && naTela(alvo) && (fantasma ? true : naTela(de));
  if (anima && casa) estado.chegando.add(casa);
  pintarTudo();
  const versao = estado.versao;
  const pousar = () => {
    if (casa) estado.chegando.delete(casa);
    if (versao !== estado.versao || ativo().id !== depois.id) { pintarCartao(); return; }
    pintarCartao({ carimbou: casa });
    animarCartao('bateu');
    vibrar(fantasma ? 14 : 8);
    if (casa && casa === c.total && D.cartao(ativo().selos, estado.meta).completo) comemorar();
  };
  if (fantasma) {
    $('[data-carimbo]')?.classList.remove('saiu'); // um carimbo novo aparece no balcão
    if (anima) cair(fantasma, alvo).then(pousar);
    else { fantasma.remove(); pousar(); }
  } else if (anima && de) voar(de, alvo).then(pousar);
  else pousar();
}

/** O carimbo do balcão: arrasta com o dedo ou o mouse até o celular do cliente. Um toque nele vale o "+1 selo". */
function ligarCarimbo() {
  const pega = $('[data-carimbo]');
  if (!pega) return;
  let fantasma = null;
  let ponto = null;
  let rolando = 0;
  const zona = () => $('.cel-tela'); // a tela do celular do cliente inteira vale (o dedo não precisa acertar a casa)
  const sobre = (p) => G.caiuEm(p, zona().getBoundingClientRect(), 14);
  const marcar = (sim) => $('[data-cartao]').classList.toggle('alvo', sim);
  const mover = () => { if (fantasma && ponto) fantasma.style.transform = `translate(${ponto.x}px, ${ponto.y}px) scale(1.15) rotate(-12deg)`; };
  // perto da borda da tela, a página rola sozinha (no celular, o cartão fica em cima do balcão)
  const rolar = () => {
    rolando = 0;
    if (!fantasma || !ponto) return;
    const d = G.rolagemNaBorda(ponto.y, window.innerHeight);
    if (d) { window.scrollBy(0, d); marcar(sobre(ponto)); }
    rolando = quadro(rolar);
  };
  const largar = () => {
    cancelAnimationFrame(rolando);
    rolando = 0;
    marcar(false);
    document.documentElement.classList.remove('carimbando');
  };
  pegar(pega, {
    eixo: 'livre',
    aoComecar: ({ x, y }) => { ponto = { x, y }; },
    aoMover: ({ x, y, dx, dy }) => {
      ponto = { x, y };
      if (!fantasma) {
        if (Math.hypot(dx, dy) < 6) return;
        fantasma = novoCarimbo();
        fantasma.classList.add('arrastado');
        pega.classList.add('saiu');
        document.documentElement.classList.add('carimbando');
        virarPara('frente');
        rolando = quadro(rolar);
      }
      mover();
      marcar(sobre(ponto));
    },
    aoSoltar: ({ x, y, cancelou }) => {
      const f = fantasma;
      fantasma = null;
      ponto = null;
      largar();
      if (!f) { if (!cancelou) darSelo({ de: pega }); return; } // foi um toque: o mesmo que o "+1 selo"
      if (!cancelou && sobre({ x, y })) darSelo({ fantasma: f });
      else voltarAoNinho(f, pega);
    },
  });
}

function usarPremio() {
  const m = ativo();
  const novo = D.usarPremio(m, estado.meta);
  if (!novo) return;
  guardar();
  trocar(novo);
  estado.versao++;
  estado.chegando.clear();
  anunciar(`Prêmio entregue para ${m.nome}: ${premio().premio}. O cartão recomeça.`);
  pintarTudo();
  animarCartao('recomecou');
  estourarEm($('[data-acao="premio"]'), { quantos: 16, raio: 70 });
  vibrar(16);
  $('[data-acao="selo"]').focus();
}

function desfazer() {
  const ultimo = estado.historico.pop();
  if (!ultimo) return;
  estado.membros = ultimo.membros;
  estado.volta = ultimo.volta;
  estado.ativo = ultimo.ativo;
  estado.versao++;
  estado.chegando.clear();
  anunciar('Desfeito.');
  pintarTudo();
  if (!estado.historico.length) $('[data-acao="selo"]').focus();
}

function escolherMembro(id) {
  if (id === estado.ativo) return;
  estado.ativo = id;
  estado.versao++;
  estado.chegando.clear();
  const m = ativo();
  const c = D.cartao(m.selos, estado.meta);
  anunciar(`Cartão de ${m.nome}: ${c.cheios} de ${c.total} selos.`);
  pintarTudo();
  animarCartao('recomecou');
}

function chamar(id) {
  const m = estado.membros.find((x) => x.id === id);
  if (!m || !D.naLista(m)) return;
  guardar();
  trocar({ ...m, chamada: true });
  estado.volta = id;
  anunciar(`Mensagem pronta para ${m.nome}.`);
  pintarTudo();
  const caixa = $('[data-volta]');
  caixa.tabIndex = -1;
  caixa.focus({ preventScroll: true });
}

function fecharVolta() {
  const id = estado.volta;
  estado.volta = null;
  pintarVolta();
  $(`[data-membros] .membro[data-membro="${id}"]`)?.focus();
}

function mudarMeta(n) {
  if (n === estado.meta) return;
  estado.meta = n;
  estado.versao++;
  estado.chegando.clear();
  anunciar(`Agora são ${n} selos para o prêmio.`);
  pintarTudo();
  pedirMes();
}

function mudarPremio(id) {
  if (id === estado.premio) return;
  estado.premio = id;
  anunciar(`O prêmio agora é ${premio().premio}.`);
  pintarTudo();
  pedirMes();
}

function recomecar() {
  Object.assign(estado, { meta: D.META_PADRAO, premio: D.PREMIO_PADRAO, membros: D.membrosDeExemplo(), ativo: 'ana', volta: null, historico: [] });
  estado.versao++;
  estado.chegando.clear();
  virarPara('frente');
  anunciar('A demonstração recomeçou.');
  pintarTudo();
  animarCartao('recomecou');
  pedirMes();
}

function mudarLoja(texto) {
  estado.loja = D.nomeDaLoja(texto);
  for (const n of $$('[data-nome-loja]')) n.textContent = estado.loja;
  for (const n of $$('[data-inicial-loja]')) n.textContent = D.inicial(estado.loja);
  pintarCartao();
  pintarBalcao();
  pintarVolta();
}

// ---------- o presente que cabe no mês ----------
const presentesDeEntrada = () => (estado.presentes ?? []).filter((p) => D.PRESENTES_DE_ENTRADA.includes(p.id))
  .sort((a, b) => D.PRESENTES_DE_ENTRADA.indexOf(a.id) - D.PRESENTES_DE_ENTRADA.indexOf(b.id));
const cabeAgora = (id) => D.oferecidos(presentesDeEntrada(), limite.saiu_c, limite.limite_c).some((p) => p.id === id);

function chipsDoLimite() {
  return D.LIMITES.map((v) => {
    const b = el('button', 'chip', rsCurto(v));
    b.type = 'button';
    b.dataset.limite = String(v);
    return b;
  });
}

function montarLimite() {
  $('[data-limites]').replaceChildren(...chipsDoLimite());
  $('[data-mes-limites]')?.replaceChildren(...chipsDoLimite());
  $('[data-presentes]').replaceChildren(...presentesDeEntrada().map((p) => {
    const b = el('button', 'presente-op');
    b.type = 'button';
    b.dataset.presente = p.id;
    b.setAttribute('aria-label', `Escolher ${p.curto}`);
    const icone = el('span', 'p-icone');
    icone.innerHTML = PRESENTE;
    const toque = el('span', 'p-toque', '+');
    toque.setAttribute('aria-hidden', 'true');
    b.append(icone, el('span', 'p-nome', inteiro(p.curto)), toque);
    return b;
  }));
  $('[data-limite-lista]').replaceChildren(...presentesDeEntrada().map((p) => {
    const li = el('li');
    li.dataset.presente = p.id;
    li.append(el('span', 'l-nome', inteiro(p.curto)), el('span', 'l-custo', `custo pela ficha: ${rs(p.custo_c)}`), el('span', 'l-cabe'));
    return li;
  }));
}

function pintarLimite({ animar = true } = {}) {
  const lista = presentesDeEntrada();
  const mexe = animar && !menos();
  for (const b of $$('[data-presentes] .presente-op')) {
    const dentro = cabeAgora(b.dataset.presente);
    if (dentro && (b.hidden || b.classList.contains('saindo'))) {
      b.hidden = false;
      b.classList.remove('saindo');
      if (mexe) reanimar(b, 'voltando', 500);
    } else if (!dentro && !b.hidden && !b.classList.contains('saindo')) {
      if (!mexe) { b.hidden = true; continue; }
      b.classList.remove('voltando');
      b.classList.add('saindo');
      setTimeout(() => {
        if (!b.classList.contains('saindo')) return;
        b.classList.remove('saindo');
        if (!cabeAgora(b.dataset.presente)) b.hidden = true;
      }, 430);
    }
  }
  $('[data-esgotou]').hidden = !D.esgotado(lista, limite.saiu_c, limite.limite_c);
  const uso = D.usoDoLimite(limite.saiu_c, limite.limite_c);
  const medidor = $('[data-medidor]');
  const cheio = $('[data-medidor-cheio]');
  const antes = Number(cheio.dataset.uso ?? 0);
  cheio.dataset.uso = String(uso);
  cheio.style.width = `${(uso * 100).toFixed(1)}%`;
  medidor.classList.toggle('quase', uso >= 0.8);
  if (mexe && Math.abs(uso - antes) > 0.001) reanimar(medidor, uso > antes ? 'encheu' : 'esvaziou', 700);
  // o texto rola do valor velho ao novo (o que já saiu e o limite)
  trocarConteudo($('[data-medidor-texto]'), `Presentes do mês: <b data-rola="saiu" data-rola-num="${num(limite.saiu_c)}">${rs(limite.saiu_c)}</b> de <b data-rola="limite" data-rola-num="${num(limite.limite_c)}">${rs(limite.limite_c)}</b>`, { ms: 520 });
  for (const p of lista) {
    const li = $(`[data-limite-lista] li[data-presente="${p.id}"]`);
    const n = D.cabem(p.custo_c, limite.saiu_c, limite.limite_c);
    li.classList.toggle('fora', n === 0);
    li.querySelector('.l-cabe').textContent = n === 0 ? 'saiu da escolha' : n === 1 ? 'cabe mais 1' : `cabem mais ${n}`;
  }
  for (const b of $$('[data-limite]')) b.setAttribute('aria-pressed', String(Number(b.dataset.limite) === limite.limite_c));
  const n = limite.escolhidos;
  $('[data-entraram]').textContent = n ? `${n} ${n === 1 ? 'pessoa entrou' : 'pessoas entraram'} com presente este mês (exemplo)` : '';
}

function escolherPresente(botao) {
  const lista = presentesDeEntrada();
  const p = lista.find((x) => x.id === botao.dataset.presente);
  const novo = D.escolher(limite, botao.dataset.presente, lista);
  if (!p || novo === limite) return;
  Object.assign(limite, novo);
  if (!menos()) reanimar(botao, 'pulou', 500);
  vibrar(8);
  pintarLimite();
  // se o presente tocado saiu da escolha, o foco vai para o próximo que ainda cabe (ou para o aviso de esgotado)
  if (!cabeAgora(p.id)) {
    const proximo = $$('[data-presentes] .presente-op').find((b) => cabeAgora(b.dataset.presente));
    const esgotou = $('[data-esgotou]');
    if (proximo) proximo.focus();
    else { esgotou.tabIndex = -1; esgotou.focus({ preventScroll: true }); }
  }
}

function mudarLimite(v) {
  if (v === limite.limite_c) return;
  limite.limite_c = v;
  pintarLimite();
  pedirMes();
}

// ---------- o mês do clube (v3): a conta da hipótese da pessoa ----------
/** A parede dos cartões: cada cartão é 1 cliente, com as casas da meta (montada de novo só quando a meta muda). */
function montarParede(meta) {
  const parede = $('[data-mes-cartoes]');
  parede.style.setProperty('--colunas', String(meta <= 5 ? meta : Math.ceil(meta / 2)));
  parede.replaceChildren(...Array.from({ length: MOSTRAR }, (_, i) => {
    const c = el('span', 'mes-cartao vazio');
    c.style.setProperty('--i', String(i));
    const selos = el('span', 'mes-selos');
    selos.append(...Array.from({ length: meta }, (_, k) => {
      const s = el('i');
      s.style.setProperty('--k', String(k));
      return s;
    }));
    c.append(el('i', 'mes-pres'), selos, el('b', 'mes-premios'));
    return c;
  }));
}

/** Os números do mês (só números da conta e textos fixos: nada digitado entra aqui). */
export function htmlDoMes(r, pr, limite_c) {
  const n = (chave, v) => `<span data-rola="${chave}" data-rola-num="${v}">${v.toLocaleString('pt-BR')}</span>`; // 1.100, como o número que rola
  const r$ = (chave, c, antes = '') => `<b data-rola="${chave}" data-rola-num="${num(c)}">${antes}${rs(c)}</b>`;
  let presentes;
  if (!r.clientes) presentes = 'Ninguém entrou: nenhum presente saiu.';
  else if (r.esgotou) presentes = `Os presentes acabaram no ${r.com_presente + 1}º cliente. ${r.sem_presente === 1 ? 'O último entra' : `Os outros ${r.sem_presente} entram`} sem presente e ${r.sem_presente === 1 ? 'junta' : 'juntam'} selo do mesmo jeito.`;
  else presentes = r.clientes === 1 ? 'Ele ganhou o presente e ainda sobra limite.' : `Os ${r.clientes} ganharam presente e ainda sobra limite.`;
  const premios = r.premios
    ? `${r.premios} ${r.premios === 1 ? 'prêmio' : 'prêmios'} × ${rs(pr.custo_c)}, pela ficha`
    : `ninguém completou os ${r.meta} selos no mês`;
  return `<dl class="mes-numeros">`
      + `<div><dt>pedidos no mês</dt><dd>${n('pedidos', r.pedidos)}</dd></div>`
      + `<div><dt>prêmios entregues</dt><dd>${n('premios', r.premios)}</dd></div>`
      + `<div><dt>ganharam presente</dt><dd>${n('com', r.com_presente)}<small> de ${n('n', r.clientes)}</small></dd></div>`
    + `</dl>`
    + `<div class="mes-limite${r.uso_limite >= 0.8 ? ' quase' : ''}">`
      + `<p class="mes-limite-rot">Presentes de boas-vindas: ${r$('presentes', r.custo_presentes_c)} de ${r$('limite', limite_c)}</p>`
      + `<span class="medidor-barra" aria-hidden="true"><i data-rola="barra" data-rola-anima="width" style="width: ${(r.uso_limite * 100).toFixed(1)}%"></i></span>`
      + `<p class="mes-limite-nota">${presentes}</p>`
    + `</div>`
    + `<div class="mes-linhas">`
      + `<div class="conta-linha"><span>Os prêmios do cartão</span>${r$('premios-c', r.custo_premios_c)}<small>${premios}</small></div>`
      + `<div class="conta-linha"><span>Os presentes de boas-vindas</span>${r$('presentes-c', r.custo_presentes_c)}<small>nunca passam do limite</small></div>`
      + `<div class="conta-linha custa"><span>O clube custa no mês</span>${r$('total', r.total_c, 'uns ')}<small>uns <span data-rola="pedido" data-rola-num="${num(r.por_pedido_c)}">${rs(r.por_pedido_c)}</span> por pedido</small></div>`
    + `</div>`;
}

function pintarMes() {
  mes.pedido = 0;
  const palco = $('[data-demo-mes]');
  if (!palco || !estado.presentes) return;
  const pr = estado.presentes.find((x) => x.id === estado.premio) ?? estado.presentes[0];
  const r = D.mesDoClube({
    clientes: mes.clientes, voltas: mes.voltas, meta: estado.meta,
    premio_c: pr.custo_c, presentes: presentesDeEntrada(), limite_c: limite.limite_c,
  });
  if (mes.meta !== r.meta) { montarParede(r.meta); mes.meta = r.meta; }
  $$('[data-mes-cartoes] .mes-cartao').forEach((c, i) => {
    const existe = i < r.clientes;
    c.classList.toggle('vazio', !existe);
    c.classList.toggle('com-presente', existe && i < r.com_presente);
    c.classList.toggle('ganhou', existe && r.premios_cada > 0);
    [...c.querySelector('.mes-selos').children].forEach((s, k) => s.classList.toggle('cheio', existe && k < r.no_cartao));
    c.querySelector('.mes-premios').textContent = existe && r.premios_cada ? `×${r.premios_cada}` : '';
  });
  // quantos cartões aparecem (no celular estreito, 16: o CSS esconde o resto)
  const vistos = $$('[data-mes-cartoes] .mes-cartao').filter((c) => c.offsetParent !== null).length || MOSTRAR;
  $('[data-mes-legenda]').textContent = r.clientes > vistos
    ? `Os cartões no fim do mês: ${vistos} dos ${r.clientes} clientes (os outros são iguais)`
    : 'Os cartões no fim do mês: cada um é 1 cliente';
  for (const chave of ['clientes', 'voltas']) {
    const v = r[chave];
    $(`[data-mes-valor="${chave}"]`).textContent = String(v);
    const faixa = $(`[data-mes="${chave}"]`);
    faixa.style.setProperty('--p', `${(((v - Number(faixa.min)) / (Number(faixa.max) - Number(faixa.min))) * 100).toFixed(1)}%`);
    faixa.setAttribute('aria-valuetext', chave === 'clientes' ? `${v} ${v === 1 ? 'cliente' : 'clientes'}` : `${v} ${v === 1 ? 'vez' : 'vezes'}`);
  }
  trocarConteudo($('[data-mes-conta]'), htmlDoMes(r, pr, limite.limite_c), { ms: 480 });
  // o "deu certo": o primeiro prêmio do mês (alguém completou o cartão)
  if (mes.antes && r.premios > 0 && mes.antes.premios === 0) {
    estourarEm($('[data-mes-conta] [data-rola="premios"]'), { quantos: 18, raio: 80 });
    vibrar(14);
  }
  if (mes.antes && r.esgotou && !mes.antes.esgotou && !menos()) reanimar($('[data-mes-conta] .mes-limite'), 'esgotou', 900);
  mes.antes = r;
}
const pedirMes = () => { if (!mes.pedido) mes.pedido = quadro(pintarMes); };

function ligarMes() {
  const palco = $('[data-demo-mes]');
  if (!palco) return;
  palco.addEventListener('input', (ev) => {
    const chave = ev.target.dataset?.mes;
    if (!chave) return;
    mes[chave] = Number(ev.target.value);
    pedirMes();
  });
  palco.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('button');
    if (!alvo || alvo.disabled || !estado.presentes) return;
    if (alvo.dataset.meta) mudarMeta(Number(alvo.dataset.meta));
    else if (alvo.dataset.premio) mudarPremio(alvo.dataset.premio);
    else if (alvo.dataset.limite) mudarLimite(Number(alvo.dataset.limite));
  });
  // o valor que o navegador guardou no controle (voltar a página) vale
  for (const faixa of $$('[data-mes]', palco)) mes[faixa.dataset.mes] = Number(faixa.value);
}

// ---------- o dado do cliente (o aceite e o "pediu pra sair") ----------
function pintarAceite() {
  const marcado = $('[data-aceite]').checked;
  const efeito = $('[data-aceite-efeito]');
  efeito.textContent = marcado
    ? 'Com o aceite: se ela sumir, entra na lista e pode receber a mensagem da loja.'
    : 'Sem o aceite: ela entra, ganha selo e presente, mas não recebe mensagem da loja.';
  efeito.classList.toggle('sem', !marcado);
}

function sairDoClube(botao) {
  const campos = $('[data-lgpd-campos]');
  const apagado = $('[data-lgpd-apagado]');
  if (botao.dataset.acao === 'sair') {
    botao.dataset.acao = 'voltar-lgpd';
    botao.textContent = 'Ver de novo';
    const fim = () => { campos.hidden = true; campos.classList.remove('saindo'); apagado.hidden = false; };
    if (menos()) fim();
    else { campos.classList.add('saindo'); setTimeout(fim, 480); }
  } else {
    botao.dataset.acao = 'sair';
    botao.textContent = 'O cliente pediu pra sair';
    apagado.hidden = true;
    campos.hidden = false;
  }
}

// ---------- ligar tudo ----------
function ligar() {
  const demo = $('[data-demo-clube]');
  if (!demo) return;
  montarMembros();
  pintarTudo();
  ligarVirar();
  ligarCarimbo();
  ligarMes();

  const entrada = $('[data-nome-entrada]');
  entrada.addEventListener('input', () => mudarLoja(entrada.value));

  demo.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('button');
    if (!alvo || !demo.contains(alvo) || alvo.disabled) return;
    if (alvo.dataset.meta) return mudarMeta(Number(alvo.dataset.meta));
    if (alvo.dataset.premio) return mudarPremio(alvo.dataset.premio);
    const acao = alvo.dataset.acao;
    if (acao === 'selo') return darSelo({ de: alvo });
    if (acao === 'premio') return usarPremio();
    if (acao === 'desfazer') return desfazer();
    if (acao === 'escolher') return escolherMembro(alvo.dataset.membro);
    if (acao === 'chamar') return chamar(alvo.dataset.membro);
    if (acao === 'fechar-volta') return fecharVolta();
    if (acao === 'recomecar') return recomecar();
    return undefined;
  });

  const palcoLimite = $('[data-demo-limite]');
  palcoLimite?.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('button');
    if (!alvo || alvo.disabled || !estado.presentes) return;
    if (alvo.dataset.limite) { mudarLimite(Number(alvo.dataset.limite)); return; }
    if (alvo.dataset.presente) { escolherPresente(alvo); return; }
    if (alvo.dataset.acao === 'virar-mes') { Object.assign(limite, { saiu_c: 0, escolhidos: 0 }); pintarLimite(); }
  });

  const lgpd = $('[data-demo-lgpd]');
  if (lgpd) {
    $('[data-aceite]').addEventListener('change', pintarAceite);
    lgpd.addEventListener('click', (ev) => {
      const alvo = ev.target.closest('button[data-acao]');
      if (alvo) sairDoClube(alvo);
    });
    pintarAceite();
  }

  // a conta do prêmio e dos presentes sai da calculadora de verdade (os 4 exemplos oficiais)
  carregarTabelas().then((tab) => {
    const fichas = {};
    for (const f of D.FICHAS) fichas[f.id] = calcular(EXEMPLOS[f.id], tab);
    estado.presentes = D.presentesDasFichas(fichas);
    for (const n of $$('[data-taxa-app]')) n.textContent = pct(tab.padroes.taxa_app / 100);
    pintarConta();
    montarLimite();
    pintarLimite({ animar: false });
    pintarMes();
  }).catch((e) => {
    const conta = $('[data-conta]');
    conta.replaceChildren(el('p', 'conta-carregando', `Não deu para fazer a conta agora (${e.message}).`));
    conta.setAttribute('aria-busy', 'false');
    $('[data-medidor-texto]').textContent = 'Não deu para fazer a conta agora.';
    const contaMes = $('[data-mes-conta]');
    if (contaMes) contaMes.replaceChildren(el('p', 'conta-carregando', 'Não deu para fazer a conta agora.'));
  });
}

if (typeof document !== 'undefined') ligar();
