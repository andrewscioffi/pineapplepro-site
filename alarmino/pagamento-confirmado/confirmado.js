// A PÁGINA "PAGAMENTO CONFIRMADO" DO ALARMINO (24/11/2026).
// A Stripe devolve a pessoa com o número da sessão no endereço (?cs=...). A página pergunta à função `alarmino` do Supabase,
// que confere o pagamento NA STRIPE e devolve um código de acesso. Com ele, a pessoa faz (e corrige) o cadastro.
// O código fica neste navegador (localStorage) e no pedaço do endereço que não vai para a internet (#a=...).
// O cadastro (com o nome do remédio, que é dado de saúde) NÃO fica guardado no navegador: só no Supabase.
// Para ver a tela sem pagamento, só no computador de quem constrói: http://localhost.../pagamento-confirmado/?demo=1
import { FUNCAO } from '../valores.js';
import { preencher } from '../site.js?v=2';
import { conferirCadastro, MAX_HORARIOS, MAX_FAMILIA } from '../comum/cadastro.js';

const RX_TOKEN = /^[0-9a-f]{64}$/;
const RX_SESSAO = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
const CHAVE = 'alarmino:acesso';
const $ = (s) => document.querySelector(s);

const guarda = {
  ler: () => { try { return localStorage.getItem(CHAVE); } catch { return null; } },
  por: (v) => { try { localStorage.setItem(CHAVE, v); } catch { /* aba anônima: fica só no endereço */ } },
};

const local = ['localhost', '127.0.0.1'].includes(location.hostname);
const demo = local && new URLSearchParams(location.search).get('demo') === '1';
let cadastroDemo = null;

async function pedir(corpo) {
  if (demo) { // a função de mentira, só para conferir a tela no computador de quem constrói
    if (corpo.acao === 'carregar') return { ok: true, dados: cadastroDemo };
    if (corpo.acao === 'salvar') { const c = conferirCadastro(corpo.dados); if (c.ok) cadastroDemo = c.dados; return c.ok ? { ok: true } : { ok: false, porque: 'dados', erros: c.erros }; }
  }
  try {
    const r = await fetch(FUNCAO, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    return await r.json();
  } catch { return { ok: false, porque: 'rede' }; }
}

function mostrar(qual) {
  for (const s of ['[data-carregando]', '[data-problema]', '[data-cadastro]', '[data-salvo]']) $(s).hidden = s !== qual;
  window.scrollTo(0, 0);
}
function problema(titulo, texto) {
  $('[data-problema-titulo]').textContent = titulo;
  $('[data-problema-texto]').textContent = texto;
  mostrar('[data-problema]');
}

// --- as linhas do formulário ---
const mascara = (v) => {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length < 3) return n;
  if (n.length < 8) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, n.length - 4)}-${n.slice(-4)}`;
};
function campo(atributos) {
  const i = document.createElement('input');
  Object.entries(atributos).forEach(([k, v]) => i.setAttribute(k, v));
  if (atributos.inputmode === 'tel') i.addEventListener('input', () => { i.value = mascara(i.value); });
  return i;
}
function linha(lista, classe, campos, podeTirar) {
  const d = document.createElement('div');
  d.className = `par ${classe}`;
  campos.forEach((c) => d.append(c));
  const x = document.createElement('button');
  x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Tirar esta linha');
  x.addEventListener('click', () => { if (podeTirar()) { d.remove(); contar(); } });
  d.append(x);
  lista.append(d);
  contar();
  return d;
}
const listaH = () => $('[data-horarios-lista]');
const listaF = () => $('[data-familia-lista]');
function maisHorario(h = {}) {
  linha(listaH(), 'horario', [
    campo({ type: 'time', 'aria-label': 'Hora do lembrete', 'data-hora': '', value: h.hora ?? '' }),
    campo({ type: 'text', maxlength: '40', placeholder: 'Vitamina D', 'aria-label': 'Nome do remédio', 'data-remedio': '', value: h.remedio ?? '' }),
  ], () => listaH().children.length > 1);
}
function maisFamilia(f = {}) {
  linha(listaF(), 'familia', [
    campo({ type: 'text', maxlength: '40', placeholder: 'Nome', 'aria-label': 'Nome de quem recebe o aviso', 'data-fnome': '', value: f.nome ?? '' }),
    campo({ type: 'text', inputmode: 'tel', maxlength: '20', placeholder: '(44) 99999-9999', 'aria-label': 'WhatsApp de quem recebe o aviso', 'data-fzap': '', value: f.whatsapp ? mascara(f.whatsapp) : '' }),
  ], () => true);
}
function contar() {
  $('[data-mais-horario]').hidden = listaH().children.length >= MAX_HORARIOS;
  $('[data-mais-familia]').hidden = listaF().children.length >= MAX_FAMILIA;
}

function ler(form) {
  return {
    para: form.elements.para.value,
    nome: form.elements.nome.value,
    whatsapp: form.elements.whatsapp.value,
    horarios: [...listaH().children].map((d) => ({ hora: d.querySelector('[data-hora]').value, remedio: d.querySelector('[data-remedio]').value })),
    familia: [...listaF().children].map((d) => ({ nome: d.querySelector('[data-fnome]').value, whatsapp: d.querySelector('[data-fzap]').value })),
    aceite_termos: form.elements.aceite_termos.checked,
    aceite_saude: form.elements.aceite_saude.checked,
  };
}
function escrever(form, d) {
  listaH().replaceChildren(); listaF().replaceChildren();
  if (d) {
    form.elements.para.value = d.para; form.elements.nome.value = d.nome; form.elements.whatsapp.value = mascara(d.whatsapp);
    d.horarios.forEach(maisHorario); d.familia.forEach(maisFamilia);
  }
  if (!listaH().children.length) maisHorario();
  if (!listaF().children.length) maisFamilia();
  paraQuem(form);
}
function paraQuem(form) {
  const outra = form.elements.para.value === 'outra';
  const mim = form.elements.para.value === 'mim';
  $('[data-rotulo-nome]').textContent = mim ? 'O seu primeiro nome' : 'Primeiro nome de quem vai receber';
  $('[data-rotulo-zap]').textContent = mim ? 'O seu WhatsApp (com DDD)' : 'WhatsApp de quem vai receber (com DDD)';
  $('[data-texto-familia]').textContent = outra
    ? 'Ponha o seu WhatsApp aqui. Se a resposta não vier em 1 hora, o Alarmino avisa você. O aviso não leva o nome do remédio.'
    : 'Opcional. Se a sua resposta não vier em 1 hora, o Alarmino avisa estas pessoas. O aviso não leva o nome do remédio.';
  $('[data-texto-outra]').hidden = !outra;
}

function resumo(d) {
  const zap = (n) => mascara(n);
  const itens = [
    `${d.para === 'mim' ? 'Para você' : 'Para'} ${d.para === 'mim' ? `(${d.nome})` : d.nome}, no WhatsApp ${zap(d.whatsapp)}`,
    ...d.horarios.map((h) => `${h.hora} · ${h.remedio}`),
    d.familia.length ? `Aviso para: ${d.familia.map((f) => f.nome).join(' e ')}` : 'Sem aviso para a família',
  ];
  $('[data-resumo]').replaceChildren(...itens.map((t) => { const li = document.createElement('li'); li.textContent = t; return li; }));
}

async function ligar() {
  preencher();
  const form = $('[data-cadastro]');
  const cs = new URLSearchParams(location.search).get('cs') ?? '';
  const doLink = new URLSearchParams(location.hash.replace(/^#/, '')).get('a') ?? '';
  let token = RX_TOKEN.test(doLink) ? doLink : guarda.ler();
  if (!RX_TOKEN.test(token ?? '')) token = null;
  if (demo) token = 'd'.repeat(64);

  if (!demo && RX_SESSAO.test(cs)) {
    const r = await pedir({ acao: 'ativar', cs });
    if (r.ok && r.token) token = r.token;
    else if (r.ok && r.ja_usada && !token) return problema('Esse pagamento já abriu o cadastro', 'Ele foi aberto em outro aparelho. Use o link de acesso que você guardou, ou escreva para a gente que eu confiro aqui.');
    else if (!r.ok && r.porque === 'devolvido') return problema('Esse pagamento foi devolvido', 'Por isso o cadastro não abre. Se foi engano, escreva para a gente.');
    else if (!r.ok && r.porque === 'rede') return problema('Sem conexão agora', 'O seu pagamento está seguro. Atualize esta página daqui a pouco.');
    else if (!r.ok) return problema('Não consegui conferir o seu pagamento', 'Se você já pagou, escreva para a gente que eu confiro aqui. O Pix pode levar alguns minutos: vale atualizar a página.');
  }
  if (!token) return problema('Não achei o seu pagamento', 'Se você já pagou, abra pelo link de acesso que você guardou ou escreva para a gente.');
  if (!demo) { guarda.por(token); history.replaceState(null, '', `${location.pathname}#a=${token}`); }

  const c = await pedir({ acao: 'carregar', token });
  if (!c.ok) return problema(c.porque === 'rede' ? 'Sem conexão agora' : 'Não achei o seu cadastro', c.porque === 'rede' ? 'Atualize esta página daqui a pouco.' : 'Confira o link de acesso ou escreva para a gente.');

  form.addEventListener('change', (e) => { if (e.target.name === 'para') paraQuem(form); });
  form.elements.whatsapp.addEventListener('input', () => { form.elements.whatsapp.value = mascara(form.elements.whatsapp.value); });
  $('[data-mais-horario]').addEventListener('click', () => maisHorario());
  $('[data-mais-familia]').addEventListener('click', () => maisFamilia());
  $('[data-corrigir]').addEventListener('click', () => mostrar('[data-cadastro]'));
  $('[data-copiar]').addEventListener('click', async (e) => {
    const link = `${location.origin}${location.pathname}#a=${token}`;
    try { await navigator.clipboard.writeText(link); e.target.textContent = 'Link copiado'; } catch { e.target.textContent = 'Copie o endereço desta página'; }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const erros = $('[data-erros]');
    const conf = conferirCadastro(ler(form));
    const listar = (l) => erros.replaceChildren(...l.map((t) => { const li = document.createElement('li'); li.textContent = t; return li; }));
    if (!conf.ok) { listar(conf.erros); erros.scrollIntoView({ block: 'center' }); return; }
    listar([]);
    const b = $('[data-salvar]');
    b.disabled = true; b.textContent = 'Salvando…';
    const r = await pedir({ acao: 'salvar', token, dados: conf.dados });
    b.disabled = false; b.textContent = 'Salvar o meu cadastro';
    if (!r.ok) { listar(r.erros?.length ? r.erros : [r.porque === 'rede' ? 'Sem conexão agora. Tente de novo em instantes.' : 'Não consegui salvar. Tente de novo ou escreva para a gente.']); return; }
    resumo(conf.dados);
    mostrar('[data-salvo]');
  });

  escrever(form, c.dados ?? null);
  if (c.dados) { form.elements.aceite_termos.checked = true; form.elements.aceite_saude.checked = true; resumo(c.dados); mostrar('[data-salvo]'); }
  else mostrar('[data-cadastro]');
}
ligar();
