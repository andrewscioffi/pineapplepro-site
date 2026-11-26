// O CADASTRO DO ALARMINO: A CONFERÊNCIA (24/11/2026).
// A mesma conta roda na página (antes de mandar) e na função do Supabase (antes de gravar): este arquivo é a origem,
// e supabase/funcoes/alarmino/index.ts traz uma cópia dele (o teste site/testes/cadastro.test.mjs confere se as 2 estão iguais).
// O que o cadastro guarda: para quem é, o primeiro nome e o WhatsApp de quem recebe, os horários com o nome do remédio,
// até 2 pessoas da família e os aceites. Nada de CPF, endereço, dose, receita ou doença.

// --- inicio da copia ---
const MAX_HORARIOS = 3;
const MAX_FAMILIA = 2;
const RX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const RX_ZAP = /^[1-9][1-9]9?\d{8}$/; // DDD + número, só algarismos (10 ou 11)

const limpo = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const soNumero = (v) => {
  let n = typeof v === 'string' ? v.replace(/\D/g, '') : '';
  if (n.length > 11 && n.startsWith('55')) n = n.slice(2);
  return n;
};

/** Confere e arruma o cadastro. Devolve { ok: true, dados } ou { ok: false, erros: [...] } (uma frase por erro). */
function conferirCadastro(bruto) {
  const erros = [];
  const b = bruto && typeof bruto === 'object' ? bruto : {};
  const para = b.para === 'outra' ? 'outra' : b.para === 'mim' ? 'mim' : '';
  if (!para) erros.push('Escolha para quem é o lembrete.');
  const nome = limpo(b.nome, 40);
  if (nome.length < 2) erros.push('Escreva o primeiro nome de quem vai receber o lembrete.');
  const whatsapp = soNumero(b.whatsapp);
  if (!RX_ZAP.test(whatsapp)) erros.push('Confira o WhatsApp de quem vai receber: DDD e número.');

  const horarios = [];
  const vistos = new Set();
  for (const h of Array.isArray(b.horarios) ? b.horarios.slice(0, MAX_HORARIOS + 1) : []) {
    const hora = limpo(h?.hora, 5);
    const remedio = limpo(h?.remedio, 40);
    if (!hora && !remedio) continue;
    if (!RX_HORA.test(hora)) { erros.push('Confira a hora de cada lembrete.'); continue; }
    if (remedio.length < 2) { erros.push(`Escreva o nome do remédio das ${hora}.`); continue; }
    const chave = `${hora}|${remedio.toLowerCase()}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    horarios.push({ hora, remedio });
  }
  if (!horarios.length) erros.push('Ponha pelo menos 1 horário com o nome do remédio.');
  if (horarios.length > MAX_HORARIOS) erros.push(`O plano tem até ${MAX_HORARIOS} horários por dia.`);
  horarios.sort((x, y) => x.hora.localeCompare(y.hora));

  const familia = [];
  for (const f of Array.isArray(b.familia) ? b.familia.slice(0, MAX_FAMILIA + 1) : []) {
    const fn = limpo(f?.nome, 40);
    const fz = soNumero(f?.whatsapp);
    if (!fn && !fz) continue;
    if (fn.length < 2 || !RX_ZAP.test(fz)) { erros.push('Confira o nome e o WhatsApp de quem recebe o aviso.'); continue; }
    if (fz === whatsapp) { erros.push('O aviso vai para outra pessoa: use um WhatsApp diferente do de quem recebe o lembrete.'); continue; }
    if (familia.some((x) => x.whatsapp === fz)) continue;
    familia.push({ nome: fn, whatsapp: fz });
  }
  if (familia.length > MAX_FAMILIA) erros.push(`O aviso vai para até ${MAX_FAMILIA} pessoas.`);
  if (para === 'outra' && !familia.length) erros.push('Ponha o seu WhatsApp para receber o aviso quando a resposta não vier.');

  if (b.aceite_termos !== true) erros.push('Falta aceitar os termos de uso.');
  if (b.aceite_saude !== true) erros.push('Falta o aceite sobre o nome do remédio.');

  if (erros.length) return { ok: false, erros: [...new Set(erros)] };
  return { ok: true, dados: { para, nome, whatsapp, horarios, familia, aceite_termos: true, aceite_saude: true } };
}
// --- fim da copia ---

export { conferirCadastro, MAX_HORARIOS, MAX_FAMILIA, soNumero };
