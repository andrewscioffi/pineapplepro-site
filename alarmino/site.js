// O SITE DO ALARMINO (24/11/2026): preenche os valores (valores.js), liga os botões de compra e mostra as vagas que restam.
// Sem pixel e sem cookie: o conjunto de dados da Meta do Alarmino ainda não existe (e nunca será o "pinecost").
import { LINK_PAGAMENTO, FUNCAO, OFERTA, EMPRESA } from './valores.js';
import { ligarTeste } from './comum/teste.js';
import { contar } from './comum/funil.js?v=4';

export function preencher(doc = document) {
  const por = (seletor, texto) => doc.querySelectorAll(seletor).forEach((el) => { el.textContent = texto; });
  por('[data-preco]', OFERTA.preco); por('[data-por-mes]', OFERTA.por_mes); por('[data-preco-normal]', OFERTA.preco_normal);
  por('[data-inicio]', OFERTA.inicio_ate); por('[data-horarios]', String(OFERTA.horarios)); por('[data-familia]', String(OFERTA.familia));
  por('[data-garantia]', String(OFERTA.garantia_dias)); por('[data-horario-extra]', OFERTA.horario_extra); por('[data-nome-plano]', OFERTA.nome);
  por('[data-cnpj]', EMPRESA.cnpj); por('[data-cidade]', EMPRESA.cidade); por('[data-email-texto]', EMPRESA.email);
  por('[data-empresa]', `CNPJ ${EMPRESA.cnpj} · ${EMPRESA.cidade}`);
  doc.querySelectorAll('a[data-email]').forEach((a) => { a.href = `mailto:${EMPRESA.email}?subject=Alarmino`; });
}

/** A frase das vagas: só com o número real da função; sem resposta, não diz número nenhum. */
export function fraseDasVagas(r) {
  if (!r || r.ok !== true || !Number.isInteger(r.restam)) return '';
  if (r.restam <= 0) return 'As vagas de fundador acabaram.';
  return r.restam === 1 ? 'Resta 1 vaga de fundador.' : `Restam ${r.restam} das ${r.total} vagas de fundador.`;
}

async function ligar() {
  preencher();
  contar('visita');
  // 26/11: os passos do funil (só contagem): clicou em qualquer botão de compra, viu a oferta, usou o teste
  document.querySelectorAll('a[data-pagar]').forEach((b) => b.addEventListener('click', () => contar('clicou_comprar')));
  const ofertaSec = document.querySelector('#oferta');
  if (ofertaSec && 'IntersectionObserver' in window) {
    const io3 = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { contar('viu_oferta'); io3.disconnect(); } }, { threshold: 0.35 });
    io3.observe(ofertaSec);
  }
  document.querySelector('[data-teste-form]')?.addEventListener('submit', () => contar('usou_teste'));
  document.querySelector('[data-conversa]')?.addEventListener('click', (e) => { if (e.target.closest('button')) contar('usou_teste'); });
  const pagar = document.querySelectorAll('a[data-pagar]');
  pagar.forEach((a) => {
    if (LINK_PAGAMENTO) a.href = LINK_PAGAMENTO;
    else { a.setAttribute('aria-disabled', 'true'); a.textContent = 'Abre em breve'; }
  });
  // a barra de compra do celular aparece depois da abertura e some em cima da oferta
  const barra = document.querySelector('[data-barra]');
  const abre = document.querySelector('.abre');
  const oferta = document.querySelector('#oferta');
  if (barra && abre && oferta && 'IntersectionObserver' in window) {
    const vistos = new Map();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => vistos.set(e.target, e.isIntersecting));
      barra.classList.toggle('visivel', !vistos.get(abre) && !vistos.get(oferta));
    }, { threshold: 0.12 });
    io.observe(abre); io.observe(oferta);
  }
  ligarTeste(document.querySelector('[data-teste]'));
  // "para mim" ou "para quem eu cuido"
  document.querySelectorAll('[data-quem]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-quem]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('[data-lista-quem]').forEach((l) => { l.hidden = l.dataset.listaQuem !== b.dataset.quem; });
  }));
  // as seções entram quando aparecem (sem isso, tudo fica visível do mesmo jeito)
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io2 = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io2.unobserve(e.target); } }), { threshold: 0.08 });
    document.querySelectorAll('main section:not(.abre) .envolve').forEach((el) => { el.classList.add('entra'); io2.observe(el); });
  }
  const ondeVagas = document.querySelector('[data-vagas]');
  if (!ondeVagas) return;
  try {
    const r = await (await fetch(FUNCAO, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'vagas' }) })).json();
    const frase = fraseDasVagas(r);
    ondeVagas.textContent = frase;
    const barra2 = document.querySelector('[data-barra-vagas]');
    if (barra2 && frase && r.total > 0) { barra2.hidden = false; requestAnimationFrame(() => { barra2.firstElementChild.style.width = `${Math.max(3, Math.round(100 * (r.total - r.restam) / r.total))}%`; }); }
    if (frase && r.restam > 0) document.querySelectorAll('[data-vagas-curto]').forEach((el) => { el.textContent = `restam ${r.restam} vagas de fundador`; });
    if (r.ok && r.restam <= 0) pagar.forEach((a) => { a.setAttribute('aria-disabled', 'true'); a.textContent = 'Vagas esgotadas'; });
  } catch { /* sem a função, a página segue sem o número */ }
}
if (typeof document !== 'undefined') ligar();
