// O FUNIL DO SITE (26/11/2026). O Andrews quer saber "o que as pessoas estão fazendo... se elas estão clicando no link da Stripe".
// Cada passo soma 1 numa contagem do Supabase (migracao-012-alarmino-funil.sql): sem cookie, sem identificar ninguém.
// Cada passo conta 1 vez por visita (a guarda da aba); a visita, 1 vez por aba aberta.
import { FUNCAO } from '../valores.js';

/** De onde a pessoa veio: o ?utm_source= manda; depois, o endereço anterior. */
export function origemDe(busca, anterior) {
  const utm = (new URLSearchParams(busca || '').get('utm_source') || '').toLowerCase();
  const fonte = utm || (() => { try { return new URL(anterior).hostname.toLowerCase(); } catch { return ''; } })();
  if (!fonte) return 'direto';
  if (/instagram|^ig$/.test(fonte)) return 'instagram';
  if (/facebook|^fb$|^m\.facebook|^l\.facebook/.test(fonte)) return 'facebook';
  if (/google/.test(fonte)) return 'google';
  if (/alarmino|pineapplepro|stripe/.test(fonte)) return 'direto';
  return 'outro';
}

const guarda = { ler: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, por: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* sem guarda */ } } };

export function origem() {
  let o = guarda.ler('alarmino:origem');
  if (!o) { o = origemDe(location.search, document.referrer); guarda.por('alarmino:origem', o); }
  return o;
}

const contados = new Set();
/** Soma 1 no passo (1 vez por página aberta; a visita, 1 vez por aba). Nunca atrapalha a página. */
export function contar(evento) {
  if (contados.has(evento)) return;
  contados.add(evento);
  if (evento === 'visita') { if (guarda.ler('alarmino:visita')) return; guarda.por('alarmino:visita', '1'); }
  if (['localhost', '127.0.0.1'].includes(location.hostname)) return; // o teste no computador não conta
  try {
    // text/plain: o navegador não precisa perguntar antes à função (fica mais leve), e keepalive manda mesmo saindo da página
    fetch(FUNCAO, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ acao: 'evento', evento, origem: origem() }) }).catch(() => {});
  } catch { /* sem contagem */ }
}
