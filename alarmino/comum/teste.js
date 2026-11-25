// O TESTE DO LEMBRETE NA PÁGINA (25/11/2026). O Andrews: "tá faltando informação de como funciona, interação".
// A pessoa escreve o nome do remédio e a hora, e vê no celular desenhado o que vai chegar: o lembrete, os 2 botões,
// o "Anotado!", o 2º lembrete e o aviso para a família. É só uma demonstração na tela: nada é enviado nem guardado.
// Os textos das mensagens são os do desenho do produto (ainda sem a aprovação da Meta).

/** Soma minutos a uma hora "HH:MM" (dá a volta à meia-noite). */
export function somar(hora, minutos) {
  const [h, m] = hora.split(':').map(Number);
  const t = (((h * 60 + m + minutos) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
export const horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
export const nomeLimpo = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);

/** O roteiro de cada caminho: uma lista de passos { quem, texto, forte?, botoes?, espera }. Puro, para testar no node. */
export function roteiro(caminho, remedio, hora) {
  const lembrete = { quem: 'ele', texto: 'Hora de tomar:', forte: remedio, botoes: true, hora };
  if (caminho === 'chegar') return [{ quem: 'ele', texto: 'Bom dia! É o Alarmino 🐶', hora, espera: 300 }, { ...lembrete, espera: 900 }];
  if (caminho === 'tomei') return [
    { quem: 'eu', texto: 'Tomei', hora: somar(hora, 3), espera: 150 },
    { quem: 'ele', texto: 'Anotado! 🐶', hora: somar(hora, 3), espera: 800 },
    { quem: 'nota', texto: `Fica anotado: ${remedio}, tomado às ${somar(hora, 3)}.`, espera: 700 },
  ];
  if (caminho === 'depois') return [
    { quem: 'eu', texto: 'Me lembra em 15 min', hora: somar(hora, 1), espera: 150 },
    { quem: 'ele', texto: `Combinado. Volto às ${somar(hora, 16)}.`, hora: somar(hora, 1), espera: 800 },
    { quem: 'tempo', texto: '15 minutos depois', espera: 900 },
    { quem: 'ele', texto: 'Passando para lembrar:', forte: remedio, botoes: true, hora: somar(hora, 16), espera: 800 },
  ];
  if (caminho === 'silencio') return [
    { quem: 'tempo', texto: '30 minutos sem resposta', espera: 500 },
    { quem: 'ele', texto: 'Passando para lembrar:', forte: remedio, hora: somar(hora, 30), espera: 900 },
    { quem: 'tempo', texto: '1 hora sem resposta', espera: 1100 },
    { quem: 'familia', texto: `Ainda sem confirmação do remédio das ${hora}.`, hora: somar(hora, 60), espera: 900 },
    { quem: 'nota', texto: 'O aviso vai para quem você escolheu, e não leva o nome do remédio.', espera: 700 },
  ];
  return [];
}

export function ligarTeste(raiz) {
  if (!raiz) return;
  const $ = (s) => raiz.querySelector(s);
  const conversa = $('[data-conversa]');
  const campoNome = $('[data-teste-remedio]');
  const campoHora = $('[data-teste-hora]');
  const acoes = $('[data-teste-acoes]');
  const reduzido = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let vez = 0;

  const el = (tag, classe, texto) => { const e = document.createElement(tag); if (classe) e.className = classe; if (texto != null) e.textContent = texto; return e; };
  function desenhar(p) {
    if (p.quem === 'tempo') return el('p', 'passa', p.texto);
    if (p.quem === 'nota') return el('p', 'nota', p.texto);
    if (p.quem === 'familia') {
      const c = el('div', 'aviso-familia');
      c.append(el('small', '', `PARA A FAMÍLIA · ${p.hora}`), el('b', '', 'Alarmino'), el('span', '', p.texto));
      return c;
    }
    const b = el('p', `balao vivo ${p.quem === 'eu' ? 'meu' : ''}`.trim());
    b.append(document.createTextNode(p.texto));
    if (p.forte) b.append(el('b', '', p.forte));
    b.append(el('time', '', p.hora));
    if (!p.botoes) return b;
    const grupo = document.createDocumentFragment();
    const teclas = el('div', 'teclas vivo');
    const t1 = el('button', '', '✅ Tomei'); t1.type = 'button'; t1.dataset.caminho = 'tomei';
    const t2 = el('button', '', '⏰ Me lembra em 15 min'); t2.type = 'button'; t2.dataset.caminho = 'depois';
    teclas.append(t1, t2);
    grupo.append(b, teclas);
    return grupo;
  }
  async function tocar(caminho) {
    const minha = ++vez;
    const remedio = nomeLimpo(campoNome.value) || 'Vitamina D';
    const hora = horaValida(campoHora.value) ? campoHora.value : '08:00';
    conversa.querySelectorAll('.teclas button').forEach((b) => { b.disabled = true; });
    if (caminho === 'chegar') conversa.replaceChildren();
    acoes.hidden = true;
    for (const p of roteiro(caminho, remedio, hora)) {
      await new Promise((r) => setTimeout(r, reduzido ? 0 : p.espera));
      if (minha !== vez) return;
      conversa.append(desenhar(p));
      conversa.scrollTop = conversa.scrollHeight;
    }
    const fim = caminho === 'tomei' || caminho === 'silencio';
    $('[data-teste-fim]').hidden = !fim;
    acoes.hidden = fim;
  }
  conversa.addEventListener('click', (e) => { const c = e.target.closest('button')?.dataset.caminho; if (c) tocar(c); });
  $('[data-teste-silencio]').addEventListener('click', () => tocar('silencio'));
  $('[data-teste-form]').addEventListener('submit', (e) => { e.preventDefault(); $('[data-teste-fim]').hidden = true; tocar('chegar'); raiz.querySelector('.fone')?.scrollIntoView({ block: 'nearest', behavior: reduzido ? 'auto' : 'smooth' }); });
  $('[data-teste-denovo]').addEventListener('click', () => { $('[data-teste-fim]').hidden = true; tocar('chegar'); });
  // começa sozinho quando a seção aparece, para ninguém ver um celular vazio
  if ('IntersectionObserver' in globalThis) {
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); tocar('chegar'); } }, { threshold: 0.3 });
    io.observe(raiz);
  } else tocar('chegar');
}
