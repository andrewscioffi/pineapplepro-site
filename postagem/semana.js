// A SEMANA DA POSTAGEM AUTOMÁTICA (07/11/2026): as regras do produto, em funções puras (testes/postagem.test.mjs).
// Do jeito que o publicador do painel faz de verdade (Exceções 5 e 8 do CLAUDE.md):
//   - só sai o que o dono aprovou, de 1 a 3 por dia, cada um no horário dele
//   - fora do horário, só com o "agora" do dono
//   - o rodízio 4-4-4: em cada 4 posts seguidos, um de cada tipo
//   - a grade do Instagram corta cada capa em 3:4
//   - nunca apaga nem edita post publicado (aqui: o tempo só anda pra frente e o que saiu não sai do lugar)
// Os posts são capas de verdade da @pineapplepro_ (a origem de cada uma está em ORIGEM-DAS-IMAGENS.md).
// A semana é um exemplo: nada é gravado e nada sai da página.

export const TIPOS = [
  { id: 'existe', n: 1, curto: 'Existe', nome: 'Pra saberem que existe' },
  { id: 'quem-e', n: 2, curto: 'Quem é', nome: 'Pra saberem quem é' },
  { id: 'o-que-faz', n: 3, curto: 'O que faz', nome: 'Pra saberem o que faz' },
  { id: 'vendendo', n: 4, curto: 'Vendendo', nome: 'Vendendo' },
];

export const FORMATOS = { reels: 'Reels', carrossel: 'Carrossel', foto: 'Foto' };

export const DIAS = [
  { id: 'seg', curto: 'Seg', nome: 'Segunda' },
  { id: 'ter', curto: 'Ter', nome: 'Terça' },
  { id: 'qua', curto: 'Qua', nome: 'Quarta' },
  { id: 'qui', curto: 'Qui', nome: 'Quinta' },
  { id: 'sex', curto: 'Sex', nome: 'Sexta' },
  { id: 'sab', curto: 'Sáb', nome: 'Sábado' },
  { id: 'dom', curto: 'Dom', nome: 'Domingo' },
];

// os 3 horários do dia (os da fila de verdade: 12h00 para foto e carrossel, 18h30 para Reels, 14h30 o do meio)
export const VAGAS = ['12:00', '14:30', '18:30'];
export const MAX_POR_DIA = 3;
export const MIN_DIA = 24 * 60;
export const FIM = 7 * MIN_DIA - 1; // domingo, 23:59
export const COMECO = 8 * 60; // segunda, 08:00

// Na ordem em que o rodízio escolhe. "tipo": das peças 45 a 48 é o da fila de verdade (tipo_444); das outras,
// é a leitura do conteúdo (ORIGEM-DAS-IMAGENS.md). "no_ar": já saiu no @pineapplepro_ (PUBLICADOS.json).
// "destaque: false": a capa 41 tem o rosto do Andrews e espera o ok dele pro site; ela fica como estava (não voa pra grade,
// não estoura e não ganha a etiqueta de "próximo").
export const POSTS = [
  { id: '36', titulo: 'A balinha na conta', formato: 'reels', tipo: 'existe', img: 'img/36-balinha-na-conta.jpg', largura: 480, altura: 853, no_ar: true },
  { id: '41', titulo: 'As 5 perguntas', formato: 'reels', tipo: 'quem-e', img: 'img/41-as-5-perguntas.jpg', largura: 480, altura: 853, no_ar: true, destaque: false },
  { id: '35', titulo: 'Quanto custa 1 pastel?', formato: 'carrossel', tipo: 'o-que-faz', img: 'img/35-quanto-custa-o-pastel.jpg', largura: 480, altura: 600, no_ar: true },
  { id: '34', titulo: 'Comeu, gostou e voltou', formato: 'reels', tipo: 'vendendo', img: 'img/34-pine-club-fundador.jpg', largura: 480, altura: 853, no_ar: true },
  { id: '45', titulo: 'O preço do pepino', formato: 'reels', tipo: 'existe', img: 'img/45-preco-do-pepino.jpg', largura: 480, altura: 853, no_ar: false },
  { id: '46', titulo: 'A câmara fria do evento', formato: 'reels', tipo: 'quem-e', img: 'img/46-estoque.jpg', largura: 480, altura: 853, no_ar: false },
  { id: '37', titulo: 'O cliente que volta', formato: 'foto', tipo: 'o-que-faz', img: 'img/37-o-cliente-que-volta.jpg', largura: 480, altura: 600, no_ar: true },
  { id: '39', titulo: 'Nunca mais voltou', formato: 'reels', tipo: 'vendendo', img: 'img/39-nunca-mais-voltou.jpg', largura: 480, altura: 853, no_ar: true },
  { id: '17', titulo: 'Qual espetinho dá mais lucro?', formato: 'carrossel', tipo: 'existe', img: 'img/17-qual-espetinho.jpg', largura: 480, altura: 600, no_ar: true },
  { id: '47', titulo: 'Até a salada eu peso', formato: 'reels', tipo: 'o-que-faz', img: 'img/47-ate-a-salada.jpg', largura: 480, altura: 853, no_ar: false },
  { id: '48', titulo: 'A compra de um evento', formato: 'reels', tipo: 'vendendo', img: 'img/48-a-compra-de-um-evento.jpg', largura: 480, altura: 853, no_ar: false },
].map((p) => ({ ...p, aprovado: true }));

// o que mostra a regra "só sai o que você aprovou": fica na gaveta e não entra na semana
export const RASCUNHO = { id: 'rascunho', titulo: 'Rascunho', aprovado: false };

const dois = (n) => String(n).padStart(2, '0');
const nao = (motivo) => ({ ok: false, motivo });

export const postPorId = (id) => POSTS.find((p) => p.id === id) ?? (id === RASCUNHO.id ? RASCUNHO : undefined);
export const tipoPorId = (id) => TIPOS.find((t) => t.id === id);

/** O minuto da semana (0 = segunda, 00:00) de um horário do dia. */
export function minutoDaVaga(dia, vaga) {
  const [h, m] = VAGAS[vaga].split(':').map(Number);
  return dia * MIN_DIA + h * 60 + m;
}
export const diaDoMinuto = (min) => Math.max(0, Math.min(6, Math.floor(min / MIN_DIA)));

/** "18:30" (relógio) ou "18h30" (texto). */
export function hora(min, jeito = 'relogio') {
  const t = ((Math.floor(min) % MIN_DIA) + MIN_DIA) % MIN_DIA;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return jeito === 'relogio' ? `${dois(h)}:${dois(m)}` : `${h}h${dois(m)}`;
}
/** "qua, 18h30" */
export const quando = (min) => `${DIAS[diaDoMinuto(min)].curto.toLowerCase()}, ${hora(min, 'texto')}`;

// ---------- o estado: agenda[id] = { dia, vaga } (o horário); saiu[id] = o minuto em que saiu ----------

export function estadoVazio(agora = COMECO) {
  return { agenda: {}, saiu: {}, agora };
}
export const saiu = (estado, id) => Object.hasOwn(estado.saiu, id);

export function minutoDo(estado, id) {
  if (saiu(estado, id)) return estado.saiu[id];
  const v = estado.agenda[id];
  return v ? minutoDaVaga(v.dia, v.vaga) : null;
}

export function quemEstaNaVaga(estado, dia, vaga) {
  return Object.keys(estado.agenda).find((id) => estado.agenda[id].dia === dia && estado.agenda[id].vaga === vaga) ?? null;
}

/** Os posts do dia (no horário ou soltos no "agora"), na ordem da hora. */
export function postsDoDia(estado, dia) {
  const ids = new Set(Object.keys(estado.agenda).filter((id) => estado.agenda[id].dia === dia));
  for (const [id, min] of Object.entries(estado.saiu)) if (!estado.agenda[id] && diaDoMinuto(min) === dia) ids.add(id);
  return [...ids].sort((a, b) => minutoDo(estado, a) - minutoDo(estado, b));
}

/** Os soltos no "agora" do dono (saíram fora do horário, sem vaga). */
export const soltosNoAgora = (estado, dia) => Object.keys(estado.saiu).filter((id) => !estado.agenda[id] && diaDoMinuto(estado.saiu[id]) === dia);

/** Os aprovados que ainda não estão na semana nem saíram. */
export const naGaveta = (estado) => POSTS.filter((p) => !estado.agenda[p.id] && !saiu(estado, p.id));

/** Pode pôr este post neste horário? (só aprovado, só horário que ainda não passou, no máximo 3 por dia) */
export function podePor(estado, id, dia, vaga) {
  const p = postPorId(id);
  if (!p) return nao('Esse post não existe.');
  if (!p.aprovado) return nao('Esse ainda não foi aprovado. Só sai o que você aprovou.');
  if (saiu(estado, id)) return nao('Esse já saiu. Post publicado não muda de lugar, não se apaga e não se edita.');
  if (!(dia >= 0 && dia < DIAS.length && vaga >= 0 && vaga < VAGAS.length)) return nao('Esse horário não existe.');
  if (minutoDaVaga(dia, vaga) <= estado.agora) return nao('Esse horário já passou.');
  const dono = quemEstaNaVaga(estado, dia, vaga);
  if (dono && dono !== id) return nao(saiu(estado, dono) ? 'Esse horário já foi usado.' : 'Esse horário já tem post.');
  if (postsDoDia(estado, dia).filter((x) => x !== id).length >= MAX_POR_DIA) return nao(`No máximo ${MAX_POR_DIA} por dia.`);
  return { ok: true };
}

/** Põe (ou muda de horário) um post. Devolve { ok, estado, motivo }. */
export function por(estado, id, dia, vaga) {
  const r = podePor(estado, id, dia, vaga);
  if (!r.ok) return { ...r, estado };
  return { ok: true, estado: { ...estado, agenda: { ...estado.agenda, [id]: { dia, vaga } } } };
}

/** Troca dois posts de horário (os dois ainda na fila). */
export function trocar(estado, a, b) {
  if (saiu(estado, a) || saiu(estado, b)) return { ...nao('Post que já saiu não muda de lugar.'), estado };
  const va = estado.agenda[a];
  const vb = estado.agenda[b];
  if (!va || !vb) return { ...nao('Os dois precisam estar na semana.'), estado };
  return { ok: true, estado: { ...estado, agenda: { ...estado.agenda, [a]: vb, [b]: va } } };
}

/** Tira da semana (volta pros aprovados). O que já saiu nunca sai do lugar. */
export function tirar(estado, id) {
  if (saiu(estado, id)) return { ...nao('Já saiu. A ferramenta nunca apaga nem edita post publicado.'), estado };
  if (!estado.agenda[id]) return { ...nao('Esse não está na semana.'), estado };
  const agenda = { ...estado.agenda };
  delete agenda[id];
  return { ok: true, estado: { ...estado, agenda } };
}

/** Tira da semana tudo o que ainda não saiu. O que saiu fica. */
export function limpar(estado) {
  const agenda = {};
  for (const [id, v] of Object.entries(estado.agenda)) if (saiu(estado, id)) agenda[id] = v;
  return { ...estado, agenda };
}

/** O tempo anda até "ate" e cada post que chegou na hora sai sozinho. O tempo não volta. */
export function andar(estado, ate) {
  const alvo = Math.min(FIM, Math.floor(ate));
  if (alvo < estado.agora) return { ...nao('O tempo não volta: o que saiu, fica.'), estado, sairam: [] };
  const sairam = Object.keys(estado.agenda)
    .filter((id) => !saiu(estado, id))
    .map((id) => [id, minutoDo(estado, id)])
    .filter(([, m]) => m > estado.agora && m <= alvo)
    .sort((x, y) => x[1] - y[1]);
  const novo = { ...estado, agora: alvo, saiu: { ...estado.saiu } };
  for (const [id, m] of sairam) novo.saiu[id] = m;
  return { ok: true, estado: novo, sairam: sairam.map(([id]) => id) };
}

/** O próximo minuto em que um post sai (ou null). */
export function proximaSaida(estado) {
  const ms = Object.keys(estado.agenda).filter((id) => !saiu(estado, id)).map((id) => minutoDo(estado, id)).filter((m) => m > estado.agora);
  return ms.length ? Math.min(...ms) : null;
}

/** O "agora" do dono: sai na hora, fora do horário. Continua valendo o máximo de 3 no dia. */
export function soltarAgora(estado, id) {
  const p = postPorId(id);
  if (!p) return { ...nao('Esse post não existe.'), estado };
  if (!p.aprovado) return { ...nao('Esse ainda não foi aprovado. Nem com o "agora" ele sai.'), estado };
  if (saiu(estado, id)) return { ...nao('Esse já saiu.'), estado };
  const dia = diaDoMinuto(estado.agora);
  if (postsDoDia(estado, dia).filter((x) => x !== id).length >= MAX_POR_DIA) return { ...nao(`Hoje já tem ${MAX_POR_DIA}: é o máximo do dia.`), estado };
  const agenda = { ...estado.agenda };
  delete agenda[id];
  return { ok: true, estado: { ...estado, agenda, saiu: { ...estado.saiu, [id]: estado.agora } } };
}

// ---------- a linha do tempo, a grade e o rodízio ----------

/** Todos os posts da semana (os que saíram e os da fila), do mais antigo para o mais novo. */
export function linhaDoTempo(estado) {
  const ids = [...new Set([...Object.keys(estado.saiu), ...Object.keys(estado.agenda)])];
  return ids
    .map((id, i) => ({ id, minuto: minutoDo(estado, id), noAr: saiu(estado, id), i }))
    .sort((a, b) => a.minuto - b.minuto || a.i - b.i)
    .map(({ id, minuto, noAr }) => ({ id, minuto, noAr }));
}

/** A grade do perfil: o mais novo primeiro, como no Instagram. soNoAr = como o seguidor vê. */
export function ordemDaGrade(estado, { soNoAr = false } = {}) {
  return linhaDoTempo(estado).filter((x) => !soNoAr || x.noAr).reverse();
}

/** Os blocos de 4 seguidos: cada um precisa ter os 4 tipos, sem repetir. */
export function blocos(tipos) {
  const saida = [];
  for (let i = 0; i < tipos.length; i += 4) {
    const parte = tipos.slice(i, i + 4);
    const vistos = new Set();
    const repetidos = new Set();
    for (const t of parte) {
      if (vistos.has(t)) repetidos.add(t);
      vistos.add(t);
    }
    saida.push({
      tipos: parte,
      completo: parte.length === 4 && repetidos.size === 0,
      repetidos: [...repetidos],
      faltam: TIPOS.map((t) => t.id).filter((t) => !vistos.has(t)),
    });
  }
  return saida;
}

/** Onde o rodízio emperrou: cada post do mesmo tipo do post de antes (a posição dele na linha do tempo, de 0 em diante). */
export function seguidos(tipos) {
  const saida = [];
  for (let i = 1; i < tipos.length; i++) if (tipos[i] === tipos[i - 1]) saida.push({ i, tipo: tipos[i] });
  return saida;
}

function blocoAberto(tipos) {
  const bs = blocos(tipos);
  const ultimo = bs[bs.length - 1];
  return new Set(ultimo && ultimo.tipos.length < 4 ? ultimo.tipos : []);
}

/**
 * O próximo tipo que a roda pede: o que falta no bloco de 4 aberto, girando a roda a partir do último post
 * (assim nunca saem dois do mesmo tipo seguidos, nem na virada de um bloco pro outro). Sem post: o tipo 1.
 */
export function proximoTipo(tipos) {
  const doBloco = blocoAberto(tipos);
  const ultimo = tipos[tipos.length - 1];
  const de = ultimo ? TIPOS.findIndex((t) => t.id === ultimo) + 1 : 0;
  for (let k = 0; k < TIPOS.length; k++) {
    const t = TIPOS[(de + k) % TIPOS.length].id;
    if (!doBloco.has(t)) return t;
  }
  return TIPOS[0].id;
}

/** O rodízio da semana: os blocos, o bloco aberto, o próximo tipo que ele pede e onde saíram dois iguais seguidos. */
export function rodizio(estado) {
  const linha = linhaDoTempo(estado);
  const tipos = linha.map((x) => postPorId(x.id).tipo);
  const bs = blocos(tipos);
  const ultimo = bs[bs.length - 1];
  const aberto = ultimo && ultimo.tipos.length < 4 ? ultimo : null;
  const proximo = proximoTipo(tipos);
  const temNaGaveta = naGaveta(estado).some((p) => p.tipo === proximo);
  const dobrados = seguidos(tipos).map(({ i, tipo }) => ({ i, tipo, ids: [linha[i - 1].id, linha[i].id] }));
  return { blocos: bs, aberto, proximo, temNaGaveta, seguidos: dobrados, completos: bs.filter((b) => b.completo).length };
}

/** Os posts que quebram o rodízio (pra semana acender cada um): os dois iguais seguidos e os do tipo repetido no bloco. */
export function idsQueRepetem(estado) {
  const linha = linhaDoTempo(estado);
  const tipos = linha.map((x) => postPorId(x.id).tipo);
  const ids = new Set();
  for (const { i } of seguidos(tipos)) { ids.add(linha[i - 1].id); ids.add(linha[i].id); }
  blocos(tipos).forEach((b, k) => {
    for (let j = 0; j < b.tipos.length; j++) if (b.repetidos.includes(b.tipos[j])) ids.add(linha[k * 4 + j].id);
  });
  return ids;
}

/** Quantos já saíram e quantos esperam na fila (os números do perfil). */
export function contagem(estado) {
  const linha = linhaDoTempo(estado);
  const noAr = linha.filter((x) => x.noAr).length;
  return { noAr, naFila: linha.length - noAr };
}

function escolherVagas(vagas, posts) {
  const n = posts.length;
  if (n >= vagas.length) return vagas.slice(0, n);
  if (n === 1) {
    const reels = posts[0].formato === 'reels';
    const quer = reels ? 2 : 0;
    if (vagas.includes(quer)) return [quer];
    return [reels ? vagas[vagas.length - 1] : vagas[0]];
  }
  if (vagas.includes(0) && vagas.includes(2)) return [0, 2];
  return vagas.slice(-n);
}

// quando sobra post para o mesmo dia, ele vai primeiro para a quarta, o sábado, a segunda...
const DIAS_COM_MAIS = [2, 5, 0, 3, 6, 1, 4];

/**
 * Enche a semana no rodízio 4-4-4: replaneja o que ainda não saiu, continua o rodízio do que já saiu e usa só os
 * horários que ainda não passaram, de 1 a 3 por dia. Para quando falta um tipo (e diz qual).
 */
export function encherSemana(estado) {
  const base = limpar(estado);
  const livres = POSTS.filter((p) => !saiu(estado, p.id));
  const tipos = linhaDoTempo(base).map((x) => postPorId(x.id).tipo);
  const fila = [];
  let faltou = null;
  for (;;) {
    const tipo = proximoTipo(tipos);
    const i = livres.findIndex((p) => p.tipo === tipo);
    if (i < 0) { faltou = tipo; break; }
    fila.push(livres.splice(i, 1)[0]);
    tipos.push(tipo);
  }
  const dias = [];
  for (let d = 0; d < DIAS.length; d++) {
    const ocupadas = new Set(Object.values(base.agenda).filter((v) => v.dia === d).map((v) => v.vaga));
    const vagas = VAGAS.map((_, v) => v).filter((v) => !ocupadas.has(v) && minutoDaVaga(d, v) > estado.agora);
    const cabe = Math.min(vagas.length, MAX_POR_DIA - postsDoDia(base, d).length);
    if (cabe > 0) dias.push({ dia: d, vagas, cabe, n: 0 });
  }
  const total = Math.min(fila.length, dias.reduce((s, d) => s + d.cabe, 0));
  if (total <= dias.length) {
    for (let j = 0; j < total; j++) dias[Math.floor((j * dias.length) / total)].n = 1;
  } else {
    for (const d of dias) d.n = 1;
    let resto = total - dias.length;
    while (resto > 0) {
      let deu = false;
      for (const qual of DIAS_COM_MAIS) {
        const d = dias.find((x) => x.dia === qual);
        if (d && resto > 0 && d.n < d.cabe) { d.n++; resto--; deu = true; }
      }
      if (!deu) break;
    }
  }
  const agenda = { ...base.agenda };
  let k = 0;
  for (const d of dias) {
    if (!d.n) continue;
    const doDia = fila.slice(k, k + d.n);
    const vagas = escolherVagas(d.vagas, doDia).sort((a, b) => a - b);
    doDia.forEach((p, j) => { agenda[p.id] = { dia: d.dia, vaga: vagas[j] }; });
    k += d.n;
  }
  const colocados = fila.slice(0, k).map((p) => p.id);
  return { estado: { ...base, agenda }, colocados, faltou: k < fila.length ? null : faltou, semVaga: k < fila.length };
}

/** A semana de exemplo com que a página abre (o próprio rodízio montou). */
export const semanaDeExemplo = () => encherSemana(estadoVazio()).estado;

// ---------- o corte 3:4 da grade e o dia de evento ----------

/** O pedaço de cada lado que a grade (3:4) corta da capa, de 0 a 1. Capa 9:16 perde 12,5% em cima e embaixo. */
export function corte34(largura, altura) {
  const r = largura / altura;
  const alvo = 3 / 4;
  const arred = (n) => Math.round(n * 1e6) / 1e6;
  if (r < alvo) { const c = arred((1 - r / alvo) / 2); return { cima: c, baixo: c, esquerda: 0, direita: 0 }; }
  const c = arred((1 - alvo / r) / 2);
  return { cima: 0, baixo: 0, esquerda: c, direita: c };
}

/** No dia de evento: 1 post por hora, alternando Reels e post, de "de" até "ate" (as duas pontas entram). */
export function diaDeEvento(de, ate) {
  const horas = [];
  for (let h = de; h <= ate; h++) horas.push({ hora: `${h}h00`, formato: (h - de) % 2 === 0 ? 'reels' : 'post' });
  return horas;
}

/** O dia normal: os horários da semana (no máximo 3). */
export const diaNormal = () => VAGAS.map((v) => ({ hora: v.replace(':', 'h'), formato: null }));
