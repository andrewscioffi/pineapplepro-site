// A DEMONSTRAÇÃO DA POSTAGEM AUTOMÁTICA (07/11/2026; v3 "altamente interativa" no mesmo dia): o estúdio da semana.
//   - os aprovados: capas de verdade da @pineapplepro_, e um rascunho que não entra sem o ok
//   - 1. a capa que voa: tocar (ou arrastar) um aprovado pra um horário faz a capa voar da fila até a semana; quando o
//        relógio chega na hora, ela voa do horário até a grade do celular, entra com o corte 3:4 e estoura
//   - 2. o relógio que a pessoa arrasta: o trilho da semana (e o relógio grande) andam com o dedo; cada post sai na hora
//        dele e os números rolam. Pra trás, o relógio só estica e volta: o que saiu fica (o publicador nunca apaga)
//   - 3. a roda do 4-4-4: gira conforme a fila, mostra o tipo que falta e acende quando saem dois iguais seguidos
//   - 4. o rascunho que não entra: arrastado pra semana, ele bate e volta (só sai o que o dono aprovou)
// No computador o mouse pega a capa na hora; no celular, segurando um instante (o dedo rápido continua rolando a página).
// Pelo teclado: Enter escolhe o post e Enter no horário põe; o relógio anda com as setas.
// As regras ficam em semana.js e as contas dos gestos em gestos.js (testadas). Nada é gravado e nada sai daqui.
// Quem pediu menos movimento vê tudo funcionando, só que sem voo, sem giro e sem estouro.
import * as S from './semana.js';
import * as G from './gestos.js';
import { cadeadoSvg } from '../valores.js';
import { ligarVidro } from '../comum/vidro.js';
import { animarNumero, estourarEm, vibrar, pegar, pedeMenosMovimento, temMouse } from '../comum/interacao.js';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svg = (d, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"${cls ? ` class="${cls}"` : ''}>${d}</svg>`;

const I = {
  check: svg('<path d="M5 12.5l4.2 4.2L19 7"/>'),
  mais: svg('<path d="M12 5.5v13M5.5 12h13"/>'),
  fechar: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  relogio: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  reels: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M3.5 8.5h17M8.6 3.6l2.6 4.8M13.9 3.6l2.6 4.8"/><path d="M10.2 11.6v5.2l4.5-2.6z" fill="currentColor" stroke="none"/>'),
  carrossel: svg('<rect x="7.5" y="7.5" width="13" height="13" rx="2.5"/><path d="M4 16.5V6.5A2.5 2.5 0 0 1 6.5 4h10"/>'),
  foto: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="9" cy="9" r="1.7"/><path d="M20.5 15.5l-4.8-4.8L5 20.5"/>'),
  tocar: svg('<path d="M8.6 5.8v12.4L18.4 12z"/>', 'cheio'),
  pausar: svg('<path d="M7.8 5.5h3v13h-3zM13.2 5.5h3v13h-3z"/>', 'cheio'),
  recomecar: svg('<path d="M5.2 12a6.8 6.8 0 1 0 2-4.8"/><path d="M5.2 4.6v3.6h3.6"/>'),
  raio: svg('<path d="M13.2 2.8L5.6 13.2h5.6l-.8 8 7.6-10.6h-5.6z"/>', 'cheio'),
  devolver: svg('<path d="M9 14l-4.5-4.5L9 5"/><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-2.5"/>'),
  brilho: svg('<path d="M12 3.5l1.9 5.2 5.3 1.9-5.3 1.9L12 17.7l-1.9-5.2-5.3-1.9 5.3-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
  grade: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>'),
  marcado: svg('<path d="M4.5 20V7a2.5 2.5 0 0 1 2.5-2.5h10A2.5 2.5 0 0 1 19.5 7v13"/><circle cx="12" cy="10.5" r="2.7"/><path d="M7.3 20a4.7 4.7 0 0 1 9.4 0"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  novo: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M12 8v8M8 12h8"/>'),
  desce: svg('<path d="M7.5 10l4.5 4.5 4.5-4.5"/>'),
  lupa: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/>'),
  arrasta: svg('<path d="M8 8.5L4.5 12 8 15.5M16 8.5l3.5 3.5-3.5 3.5M5 12h14"/>'),
};
const STATUS = '<svg viewBox="0 0 18 12" aria-hidden="true" focusable="false"><rect x="0" y="8" width="3" height="4" rx=".8"/><rect x="5" y="5.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3" width="3" height="9" rx=".8"/><rect x="15" y="0" width="3" height="12" rx=".8"/></svg>'
  + '<svg viewBox="0 0 16 12" aria-hidden="true" focusable="false"><path d="M8 11.6l2.3-2.8a3.6 3.6 0 0 0-4.6 0zM3.8 6.5a6.5 6.5 0 0 1 8.4 0l1.7-2a9.1 9.1 0 0 0-11.8 0zM.4 2.5a11.8 11.8 0 0 1 15.2 0L16 2A12.5 12.5 0 0 0 0 2z"/></svg>'
  + '<svg viewBox="0 0 27 12" aria-hidden="true" focusable="false"><rect x=".6" y=".6" width="22.8" height="10.8" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.1" opacity=".45"/><rect x="2.2" y="2.2" width="17.6" height="7.6" rx="1.9"/><path d="M25 4.2v3.6c.8-.3 1.4-1 1.4-1.8S25.8 4.5 25 4.2z" opacity=".45"/></svg>';

const VELOCIDADE = 0.6; // minutos da semana por milissegundo: a semana inteira em uns 17 s
const DEVAGAR = 150; // a uns 150 min de um post, o relógio diminui (dá pra ver a hora certinha)
const SEGURA = 700; // quando um post sai, o relógio para um instante
const BRILHA = 2400; // quanto tempo o "saiu" fica aceso
const SEGURAR = 260; // no toque: segurar a capa esse tanto pega ela (o dedo rápido continua rolando a página)
const VOO = 520; // a capa voando na mesa (da fila pra semana)
const VOO_GRADE = 820; // a capa voando do horário pra grade do celular
const MOLA = 'cubic-bezier(.3, 1.35, .5, 1)';
const JOGA = 'cubic-bezier(.3, .7, .3, 1)';

const nomeDoTipo = (id) => S.tipoPorId(id).curto.toLowerCase();
const pct = (n) => `${Math.round(n * 10000) / 100}%`;
const fmt = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const caixaDe = (r) => ({ left: r.left, top: r.top, width: r.width, height: r.height });
// o celular só vibra depois que a pessoa tocou na página (a amostra do começo não vibra, e o Chrome bloqueia antes do 1º toque)
const tremerCelular = (ms) => {
  if (typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  vibrar(ms);
};

function ligarEstudio(raiz) {
  const corpo = raiz.querySelector('[data-estudio-corpo]');
  if (!corpo) return;
  let estado = S.semanaDeExemplo();
  let fino = estado.agora; // o relógio contínuo (o estado só guarda minutos inteiros)
  let escolhido = null; // { id, de: 'gaveta' | 'semana' }
  let modo = 'seguidor'; // a grade como o seguidor vê: o post que sai entra no topo (o "Com a fila" mostra o que ainda vai sair)
  let rodando = null;
  let lupa = null;
  let mexeu = false;
  let tNotif = 0;
  let tBrilho = 0;
  let tRecado = 0;
  let giroRoda = 0;
  let completosAntes = null;
  let problemasAntes = null;
  let fimAvisado = false;
  const recentes = new Map();
  const contarPassadas = () => S.DIAS.reduce((s, _, d) => s + S.VAGAS.filter((__, v) => S.minutoDaVaga(d, v) <= estado.agora).length, 0);
  let vagasPassadas = contarPassadas();
  let diaAtual = S.diaDoMinuto(estado.agora);

  corpo.innerHTML = esqueleto();
  const $ = (sel) => corpo.querySelector(sel);
  const R = {
    dia: $('[data-r-dia]'), hora: $('[data-r-hora]'), relogio: $('[data-relogio]'), tocar: $('[data-acao="tocar"]'),
    linha: $('[data-linha]'), trilho: $('.pa-trilho'), feito: $('[data-feito]'), trava: $('[data-trava]'), marcas: $('[data-marcas]'),
    agulha: $('[data-agulha]'), pega: $('[data-pega]'),
    cartas: $('[data-gaveta]'), contaGaveta: $('[data-conta-gaveta]'), dica: $('[data-dica-gaveta]'),
    semana: $('[data-r-semana]'), celular: $('.pa-celular'), cHora: $('[data-c-hora]'), numeros: $('[data-c-numeros]'),
    cAr: $('[data-c-ar]'), cFila: $('[data-c-fila]'), rolo: $('.pa-ig-rolo'), grade: $('[data-grade]'),
    notif: $('[data-notif]'), lupa: $('[data-lupa]'), escolha: $('[data-r-escolha]'), recado: $('[data-recado]'),
    roda: $('[data-roda]'), rodaGira: $('[data-roda-gira]'), rodaBloco: $('[data-roda-bloco]'), rodaNum: $('[data-roda-num]'),
    rodaNome: $('[data-roda-nome]'), faixa: $('[data-faixa]'), frase: $('[data-rodizio-frase]'),
  };
  const arcos = S.TIPOS.map((t) => corpo.querySelector(`[data-arco="${t.id}"]`));
  const rotulos = S.TIPOS.map((t) => corpo.querySelector(`[data-arco-n="${t.id}"]`));

  // ---------- os voos (FLIP): a cópia da capa sai de onde estava e pousa onde ficou ----------

  const voosMesa = new Set(); // da fila pra semana (e de volta)
  const voosGrade = new Set(); // do horário pra grade do celular
  const chegando = new Set(); // "onde:id" de quem ainda está voando (o de verdade fica escondido até a cópia pousar)
  const seletor = { gaveta: (id) => `[data-carta="${id}"]`, semana: (id) => `[data-post="${id}"]`, grade: (id) => `[data-cel="${id}"]` };
  const elDe = (onde, id) => corpo.querySelector(seletor[onde](id));

  function fimDoVoo(voo, lista) {
    lista.delete(voo);
    voo.clone.remove();
    chegando.delete(voo.chave);
    const [onde, id] = voo.chave.split(':');
    elDe(onde, id)?.classList.remove('chegando');
  }
  function pararVoos(lista) {
    for (const v of [...lista]) { for (const a of v.anims) a.cancel(); fimDoVoo(v, lista); }
  }

  /** Onde está cada capa agora (na fila, na semana e na grade): `voo` é de onde a cópia sai (a capa da fila fica presa
   *  na borda da fila, se estiver rolada pra fora) e `el` é o próprio elemento (pro deslize no mesmo lugar). */
  function fotografar() {
    const mapa = new Map();
    const fila = caixaDe(R.cartas.getBoundingClientRect());
    for (const el of R.cartas.querySelectorAll('[data-carta]')) {
      const capa = el.querySelector('.pa-capa');
      if (capa) mapa.set(`gaveta:${el.dataset.carta}`, { voo: G.prenderNaCaixa(caixaDe(capa.getBoundingClientRect()), fila), el: caixaDe(el.getBoundingClientRect()) });
    }
    for (const el of R.semana.querySelectorAll('[data-post]')) { const r = caixaDe(el.getBoundingClientRect()); mapa.set(`semana:${el.dataset.post}`, { voo: r, el: r }); }
    for (const el of R.grade.querySelectorAll('[data-cel]')) { const r = caixaDe(el.getBoundingClientRect()); mapa.set(`grade:${el.dataset.cel}`, { voo: r, el: r }); }
    return mapa;
  }

  function deslizar(el, de) {
    if (!el || typeof el.animate !== 'function') return;
    const para = el.getBoundingClientRect();
    if (!G.vale(de) || !G.mudouDeLugar(de, para)) return;
    el.classList.add('deslizando');
    const a = el.animate(G.quadrosDoDeslize(de, para), { duration: 440, easing: MOLA });
    a.onfinish = a.oncancel = () => el.classList.remove('deslizando');
  }

  function pousar(el, { estoura = false } = {}) {
    if (!el) return;
    el.classList.remove('pousou');
    void el.offsetWidth; // recomeça o pulo
    el.classList.add('pousou');
    setTimeout(() => el.classList.remove('pousou'), 700);
    if (estoura) { estourarEm(el, { quantos: 12, raio: 48 }); tremerCelular(12); }
  }

  /** A cópia voa de "de" até o elemento novo (que fica escondido até ela pousar). */
  function voarCopia(onde, id, de, atraso = 0) {
    const el = elDe(onde, id);
    const alvo = onde === 'gaveta' ? el?.querySelector('.pa-capa') : el;
    const p = S.postPorId(id);
    if (!alvo || !p?.img) return;
    const para = caixaDe(alvo.getBoundingClientRect());
    if (!G.vale(de) || !G.vale(para)) return;
    const clone = document.createElement('div');
    clone.className = `pa-voo pa-t-${p.tipo}`;
    clone.setAttribute('aria-hidden', 'true');
    clone.style.cssText = `left:${para.left}px;top:${para.top}px;width:${para.width}px;height:${para.height}px`;
    clone.innerHTML = `<img src="${p.img}" alt="">`;
    document.body.append(clone);
    const chave = `${onde}:${id}`;
    chegando.add(chave);
    el.classList.add('chegando');
    const anim = clone.animate(G.quadrosDoVoo(de, para, { arco: 34 }), { duration: VOO, delay: atraso, easing: JOGA, fill: 'backwards' });
    const voo = { anims: [anim], clone, chave };
    voosMesa.add(voo);
    anim.onfinish = () => { fimDoVoo(voo, voosMesa); pousar(elDe(onde, id)); };
  }

  /** Depois de mudar a mesa: quem trocou de lugar (fila ↔ semana) voa; quem só andou (a fila fechando o buraco) desliza. */
  function voarNaMesa(antes, mao = null) {
    if (pedeMenosMovimento()) return;
    const depois = fotografar();
    let k = 0;
    for (const [chave, agora] of depois) {
      const [onde, id] = chave.split(':');
      if (onde === 'grade') continue;
      if (mao?.id === id) { voarCopia(onde, id, mao.rect); continue; }
      const mesmo = antes.get(chave);
      const outro = antes.get(`${onde === 'gaveta' ? 'semana' : 'gaveta'}:${id}`);
      if (!mesmo && outro) { voarCopia(onde, id, outro.voo, Math.min(k, 12) * 45); k++; continue; }
      if (mesmo && G.mudouDeLugar(mesmo.el, agora.el)) deslizar(elDe(onde, id), mesmo.el);
    }
  }

  /** Muda a mesa (pôr, trocar, tirar, encher) e faz as capas voarem. `fazer` devolve false quando não mudou nada. */
  function mudar(fazer, { mao = null, foco } = {}) {
    pararVoos(voosMesa);
    const antes = fotografar();
    if (fazer() === false) return false;
    desenhar(foco);
    voarNaMesa(antes, mao);
    return true;
  }

  /** O post saiu: a capa voa do horário (ou da fila, no "agora") até a grade do celular, com o corte 3:4. */
  function voarPraGrade(ids, antes) {
    // a capa sem destaque (a 41, que espera o ok do Andrews) só acende no lugar dela
    const alvos = ids.filter((id) => S.postPorId(id)?.destaque !== false).map((id) => ({ id, cel: elDe('grade', id) })).filter((x) => x.cel);
    if (pedeMenosMovimento() || !alvos.length) return;
    // o celular mostra onde a capa vai pousar (rola a grade dele, nunca a página)
    const rolar = G.rolagemPraMostrar(caixaDe(alvos[alvos.length - 1].cel.getBoundingClientRect()), caixaDe(R.rolo.getBoundingClientRect()), innerHeight);
    if (rolar) R.rolo.scrollTop += rolar;
    else if (rolar === 0 && modo === 'seguidor') {
      // o que já estava na grade anda pro lado: a capa nova entra no topo
      for (const el of R.grade.querySelectorAll('[data-cel]')) if (!ids.includes(el.dataset.cel)) deslizar(el, antes.get(`grade:${el.dataset.cel}`)?.el);
    }
    const H = innerHeight;
    const W = innerWidth;
    alvos.slice(-4).forEach(({ id }, k) => {
      const cel = elDe('grade', id);
      const p = S.postPorId(id);
      const para = caixaDe(cel.getBoundingClientRect());
      const de0 = (antes.get(`semana:${id}`) ?? antes.get(`gaveta:${id}`))?.voo;
      if (!de0 || !G.naTela(para, H, W)) return;
      const de = G.mesmaForma(G.entrarPelaBorda(de0, H), para);
      const caixa = G.caixaDaCapa(para, p.largura, p.altura);
      const clone = document.createElement('div');
      clone.className = `pa-voo pa-voo-grade pa-t-${p.tipo}`;
      clone.setAttribute('aria-hidden', 'true');
      clone.style.cssText = `left:${para.left}px;top:${para.top}px;width:${para.width}px;height:${para.height}px`;
      clone.innerHTML = `<span class="pa-voo-capa" style="left:${caixa.esquerda}px;top:${caixa.topo}px;width:${caixa.largura}px;height:${caixa.altura}px"><img src="${p.img}" alt=""></span>`;
      document.body.append(clone);
      const chave = `grade:${id}`;
      chegando.add(chave);
      cel.classList.add('chegando');
      const atraso = k * 140;
      const anim = clone.animate(G.quadrosDoVoo(de, para, { arco: 70, giro: 3 }), { duration: VOO_GRADE, delay: atraso, easing: 'cubic-bezier(.4, .08, .25, 1)', fill: 'backwards' });
      // a capa inteira (9:16) voa; perto de pousar, a grade corta em cima e embaixo (o 3:4)
      const corte = clone.firstElementChild.animate([
        { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', offset: 0.6 }, { clipPath: G.clipDoCorte(caixa.corte) },
      ], { duration: VOO_GRADE, delay: atraso, easing: 'ease-in-out', fill: 'both' });
      const voo = { anims: [anim, corte], clone, chave };
      voosGrade.add(voo);
      anim.onfinish = () => { fimDoVoo(voo, voosGrade); pousar(elDe('grade', id), { estoura: true }); };
    });
  }

  // ---------- desenhar ----------

  function carta(p, proximo) {
    const t = S.tipoPorId(p.tipo);
    const on = escolhido?.id === p.id;
    const sug = p.tipo === proximo && p.destaque !== false;
    return `<li><button type="button" class="pa-carta pa-t-${p.tipo}${on ? ' escolhido' : ''}${sug ? ' sugerido' : ''}${chegando.has(`gaveta:${p.id}`) ? ' chegando' : ''}" data-carta="${p.id}" data-arrasta="${p.id}" aria-pressed="${on}" aria-label="${esc(`${p.titulo}. ${S.FORMATOS[p.formato]}, tipo ${t.n}: ${t.curto}. Aprovado.${sug ? ' É o próximo do rodízio.' : ''}`)}">
      <span class="pa-capa"><img src="${p.img}" alt="" width="${p.largura}" height="${p.altura}" draggable="false" decoding="async">${sug ? '<span class="pa-sugerido" aria-hidden="true">próximo</span>' : ''}</span>
      <span class="pa-carta-ok" aria-hidden="true">${I.check}</span>
      <span class="pa-num" aria-hidden="true">${t.n}</span>
      <span class="pa-carta-nome" aria-hidden="true">${esc(p.titulo)}</span>
      <span class="pa-carta-formato" aria-hidden="true">${I[p.formato]}${S.FORMATOS[p.formato]}</span>
    </button></li>`;
  }

  function desenharGaveta(proximo) {
    const livres = S.naGaveta(estado);
    R.dica.textContent = temMouse() ? 'Arraste pra semana, ou clique e escolha o horário.' : 'Toque e depois num horário, ou segure e arraste.';
    R.cartas.innerHTML = `${livres.map((p) => carta(p, proximo)).join('')}
        <li><button type="button" class="pa-carta pa-rascunho" data-rascunho data-arrasta="${S.RASCUNHO.id}" aria-label="Rascunho, ainda sem o seu ok: não entra na fila.">
          <span class="pa-capa">${cadeadoSvg()}<small>espera o seu ok</small></span>
          <span class="pa-carta-nome" aria-hidden="true">Rascunho</span>
          <span class="pa-carta-formato" aria-hidden="true">sem aprovação</span>
        </button></li>`;
    animarNumero(R.contaGaveta, livres.length, { ms: 420 });
  }

  function vaga(d, v, repetem) {
    const id = S.quemEstaNaVaga(estado, d, v);
    const min = S.minutoDaVaga(d, v);
    const base = `pa-vaga d${d + 1} h${v + 1}`;
    const onde = `${S.DIAS[d].nome}, ${S.hora(min, 'texto')}`;
    if (!id) {
      if (min <= estado.agora) return `<div class="${base} passou" data-vaga="${d}-${v}"><span class="pa-passou" aria-hidden="true">passou</span></div>`;
      return `<div class="${base}" data-vaga="${d}-${v}"><button type="button" class="pa-livre" data-livre="${d}-${v}" aria-label="${esc(`${onde}: livre`)}">${I.mais}</button></div>`;
    }
    const p = S.postPorId(id);
    const t = S.tipoPorId(p.tipo);
    const foi = S.saiu(estado, id);
    const on = escolhido?.id === id;
    const rep = repetem.has(id);
    const marca = `${on ? ' escolhido' : ''}${recentes.has(id) ? ' acabou' : ''}${rep ? ' repete' : ''}${chegando.has(`semana:${id}`) ? ' chegando' : ''}`;
    return `<div class="${base} cheia${foi ? ' foi' : ''}" data-vaga="${d}-${v}">
      <button type="button" class="pa-post pa-t-${p.tipo}${marca}" data-post="${id}"${foi ? '' : ` data-arrasta="${id}" aria-pressed="${on}"`} aria-label="${esc(`${onde}: ${p.titulo}, ${foi ? 'já saiu' : 'na fila'}${rep ? '. Quebra o rodízio' : ''}`)}">
        <img src="${p.img}" alt="" draggable="false" decoding="async">
        <span class="pa-num" aria-hidden="true">${t.n}</span>
        ${foi ? `<span class="pa-post-saiu" aria-hidden="true">${I.check}saiu</span>` : ''}
      </button>
      ${foi ? '' : `<button type="button" class="pa-tirar" data-tirar="${id}" aria-label="${esc(`Tirar ${p.titulo} da semana`)}">${I.fechar}</button>`}
    </div>`;
  }

  function desenharSemana() {
    const hoje = S.diaDoMinuto(estado.agora);
    const repetem = S.idsQueRepetem(estado);
    let h = `<div class="pa-semana${escolhido ? ' escolhendo' : ''}">`;
    h += '<span class="pa-canto" aria-hidden="true"></span>';
    S.VAGAS.forEach((v, i) => { h += `<span class="pa-cab-hora h${i + 1}" aria-hidden="true">${v.replace(':', 'h')}</span>`; });
    S.DIAS.forEach((d, i) => {
      const n = S.postsDoDia(estado, i).length;
      const soltos = S.soltosNoAgora(estado, i).length;
      h += `<span class="pa-cab-dia d${i + 1}${i === hoje ? ' hoje' : ''}${n ? '' : ' vazio'}"><b>${d.curto}</b><small>${n ? `${n} de ${S.MAX_POR_DIA}` : 'sem post'}</small>${soltos ? `<em>+${soltos} no agora</em>` : ''}</span>`;
    });
    S.DIAS.forEach((_, d) => S.VAGAS.forEach((__, v) => { h += vaga(d, v, repetem); }));
    R.semana.innerHTML = `${h}</div>`;
  }

  /** A roda gira no lugar (o mesmo SVG), pra o giro andar com mola; o resto do rodízio se escreve de novo. */
  function desenharRodizio(r) {
    const tem = new Set(r.aberto ? r.aberto.tipos : []);
    const repetidos = new Set([...r.blocos.flatMap((b) => b.repetidos), ...r.seguidos.map((s) => s.tipo)]);
    const i = S.TIPOS.findIndex((t) => t.id === r.proximo);
    giroRoda = G.giroDaRoda(giroRoda, i);
    R.rodaGira.style.setProperty('--giro', `${giroRoda}deg`);
    S.TIPOS.forEach((t, k) => {
      arcos[k].classList.toggle('tem', tem.has(t.id));
      arcos[k].classList.toggle('repetiu', repetidos.has(t.id));
      arcos[k].classList.toggle('proximo', t.id === r.proximo);
      rotulos[k].classList.toggle('tem', tem.has(t.id) || t.id === r.proximo);
    });
    const n = r.aberto ? r.blocos.length : r.blocos.length + 1;
    const problema = r.seguidos[0] ?? null;
    const repBloco = r.blocos.findIndex((b) => b.repetidos.length);
    const tipoProx = S.tipoPorId(r.proximo);
    const quebrou = Boolean(problema) || repBloco >= 0;
    const tipoQuebrou = problema?.tipo ?? (repBloco >= 0 ? r.blocos[repBloco].repetidos[0] : null);
    R.rodaBloco.textContent = quebrou ? 'repetiu' : 'falta';
    R.rodaNum.textContent = quebrou ? '!' : String(tipoProx.n);
    R.rodaNome.textContent = (quebrou ? S.tipoPorId(tipoQuebrou) : tipoProx).curto.toLowerCase();
    R.roda.dataset.jeito = quebrou ? 'nao' : 'ok';
    R.roda.dataset.prox = r.proximo;
    let frase;
    let jeito = 'ok';
    if (problema) {
      frase = `Dois de “${esc(nomeDoTipo(problema.tipo))}” seguidos: troque um de horário.`;
      jeito = 'nao';
    } else if (repBloco >= 0) {
      frase = `Repetiu “${esc(nomeDoTipo(r.blocos[repBloco].repetidos[0]))}” no bloco ${repBloco + 1}: troque um de horário.`;
      jeito = 'nao';
    } else if (!r.blocos.length) {
      frase = 'Ponha 4 seguidos, um de cada tipo.';
    } else if (r.aberto) {
      const prox = esc(nomeDoTipo(r.proximo));
      frase = r.temNaGaveta ? `Próximo do rodízio: um post de <b>“${prox}”</b>.` : `Pra fechar o bloco ${n}, falta um post de <b>“${prox}”</b> aprovado.`;
      jeito = r.temNaGaveta ? 'ok' : 'aviso';
    } else {
      frase = `Bloco ${r.blocos.length} fechado: os 4 tipos, sem repetir.`;
    }
    R.faixa.innerHTML = r.blocos.map((b, k) => `<li class="pa-bloco${b.completo ? ' ok' : ''}${b.repetidos.length ? ' repetiu' : ''}">
      <span class="pa-bloco-rot">${b.completo ? I.check : ''}Bloco ${k + 1}</span>
      <span class="pa-bloco-tipos">${[0, 1, 2, 3].map((j) => (b.tipos[j]
        ? `<i class="pa-t-${b.tipos[j]}${b.repetidos.includes(b.tipos[j]) ? ' rep' : ''}">${S.tipoPorId(b.tipos[j]).n}</i>`
        : '<i class="falta"></i>')).join('')}</span></li>`).join('')
      || '<li class="pa-bloco"><span class="pa-bloco-tipos"><i class="falta"></i><i class="falta"></i><i class="falta"></i><i class="falta"></i></span></li>';
    if (R.frase.innerHTML !== frase) R.frase.innerHTML = frase;
    R.frase.dataset.jeito = jeito;
    // o "deu certo" do rodízio: fechou um bloco de 4 sem repetir. E o aviso: saiu um repetido novo
    const problemas = r.seguidos.length + r.blocos.filter((b) => b.repetidos.length).length;
    if (completosAntes !== null && r.completos > completosAntes && !problemas) { estourarEm(R.roda, { quantos: 18, raio: 74 }); tremerCelular(16); }
    if (problemasAntes !== null && problemas > problemasAntes) { tremer(R.roda); tremerCelular(30); }
    completosAntes = r.completos;
    problemasAntes = problemas;
  }

  function cel(x) {
    const p = S.postPorId(x.id);
    const rec = recentes.has(x.id);
    const icone = p.formato === 'reels' ? I.reels : p.formato === 'carrossel' ? I.carrossel : '';
    return `<button type="button" class="pa-cel ${x.noAr ? 'no-ar' : 'na-fila'}${rec ? ' acabou' : ''}${chegando.has(`grade:${x.id}`) ? ' chegando' : ''}" data-cel="${x.id}" aria-label="${esc(`${p.titulo}: ${x.noAr ? 'saiu' : 'sai'} ${S.quando(x.minuto)}. Ver o corte 3:4`)}">
      <img src="${p.img}" alt="" draggable="false" decoding="async">
      ${icone ? `<span class="pa-cel-formato" aria-hidden="true">${icone}</span>` : ''}
      ${x.noAr ? '' : `<span class="pa-cel-quando" aria-hidden="true">${I.relogio}${S.quando(x.minuto)}</span>`}
      ${rec ? `<span class="pa-cel-saiu" aria-hidden="true">saiu ${S.hora(x.minuto, 'texto')}</span>` : ''}
    </button>`;
  }

  function desenharGrade() {
    const c = S.contagem(estado);
    R.numeros.dataset.modo = modo;
    animarNumero(R.cAr, c.noAr, { ms: 520 });
    animarNumero(R.cFila, c.naFila, { ms: 520 });
    const itens = S.ordemDaGrade(estado, { soNoAr: modo === 'seguidor' });
    R.grade.dataset.modo = modo;
    R.grade.classList.toggle('vazia', !itens.length);
    R.grade.innerHTML = itens.length
      ? itens.map(cel).join('')
      : `${'<span class="pa-cel-vazia" aria-hidden="true"></span>'.repeat(6)}<p class="pa-grade-vazia">${modo === 'seguidor' ? 'Nada saiu ainda. Aperte o play, ou arraste o relógio, e veja a semana passar.' : 'A grade está vazia. Ponha um post na semana.'}</p>`;
    for (const b of corpo.querySelectorAll('[data-modo]')) b.setAttribute('aria-pressed', String(b.dataset.modo === modo));
  }

  function desenharMarcas() {
    R.marcas.innerHTML = S.linhaDoTempo(estado).map((x) => `<i class="pa-t-${S.postPorId(x.id).tipo}${x.noAr ? ' foi' : ''}" style="left: ${pct(x.minuto / S.FIM)}"></i>`).join('');
  }

  function desenharLupa() {
    if (!lupa) { R.lupa.hidden = true; R.lupa.innerHTML = ''; return; }
    const p = S.postPorId(lupa);
    const c = S.corte34(p.largura, p.altura);
    const texto = c.cima
      ? `A capa é 9:16. Na grade, some ${fmt(c.cima * 100)}% em cima e ${fmt(c.baixo * 100)}% embaixo: o título vai no meio.`
      : `Na grade, some só ${fmt(c.esquerda * 100)}% de cada lado.`;
    R.lupa.hidden = false;
    R.lupa.innerHTML = `<div class="pa-lupa-cab"><b>O corte da grade</b><button type="button" class="pa-lupa-fechar" data-acao="fechar-lupa" aria-label="Fechar o corte">${I.fechar}</button></div>
      <div class="pa-lupa-palco"><div class="pa-lupa-quadro" style="--w: ${p.largura}; --h: ${p.altura}; --cima: ${pct(c.cima)}; --baixo: ${pct(c.baixo)}; --esq: ${pct(c.esquerda)}; --dir: ${pct(c.direita)}">
        <img src="${p.img}" alt="${esc(`A capa inteira de “${p.titulo}”`)}" draggable="false">
        ${c.cima ? '<span class="pa-lupa-some cima">some na grade</span><span class="pa-lupa-some baixo">some na grade</span>' : ''}
        ${c.esquerda ? '<span class="pa-lupa-some esq"></span><span class="pa-lupa-some dir"></span>' : ''}
        <span class="pa-lupa-janela"><small>na grade (3:4)</small></span>
      </div></div>
      <p class="pa-lupa-texto">${esc(texto)}</p>`;
  }

  function desenharEscolha() {
    if (!escolhido) { R.escolha.hidden = true; R.escolha.innerHTML = ''; return; }
    const p = S.postPorId(escolhido.id);
    const daSemana = escolhido.de === 'semana';
    R.escolha.hidden = false;
    R.escolha.innerHTML = `<span class="pa-escolha-capa pa-t-${p.tipo}"><img src="${p.img}" alt="" draggable="false"></span>
      <span class="pa-escolha-texto"><b>${esc(p.titulo)}</b><small>${daSemana ? 'Toque noutro horário pra mudar.' : 'Toque num horário livre da semana.'}</small></span>
      <span class="pa-escolha-botoes">
        <button type="button" class="pa-botao agora" data-acao="agora">${I.raio}<span>Soltar agora</span></button>
        ${daSemana ? `<button type="button" class="pa-botao" data-acao="tirar-escolhido">${I.devolver}<span>Tirar</span></button>` : ''}
        <button type="button" class="pa-botao so-icone" data-acao="cancelar" aria-label="Cancelar a escolha">${I.fechar}</button>
      </span>`;
  }

  function desenharTocar() {
    const fim = estado.agora >= S.FIM;
    R.tocar.innerHTML = rodando ? `${I.pausar}<span>Pausar</span>`
      : fim ? `${I.recomecar}<span>Recomeçar o exemplo</span>`
        : `${I.tocar}<span>${estado.agora > S.COMECO ? 'Continuar a semana' : 'Ver a semana passar'}</span>`;
    R.tocar.classList.toggle('rodando', Boolean(rodando));
    R.relogio.classList.toggle('rodando', Boolean(rodando));
  }

  function desenharRelogio() {
    const m = Math.floor(fino);
    const dia = S.DIAS[S.diaDoMinuto(m)];
    R.dia.textContent = dia.curto;
    R.hora.textContent = S.hora(m);
    R.cHora.textContent = S.hora(m).replace(/^0/, '');
    R.agulha.style.left = pct(fino / S.FIM);
    R.feito.style.width = pct(fino / S.FIM);
    R.trava.style.width = pct(estado.agora / S.FIM);
    R.pega.setAttribute('aria-valuenow', String(m));
    R.pega.setAttribute('aria-valuetext', `${dia.nome}, ${S.hora(m)}`);
  }

  // redesenha tudo e devolve o foco do teclado para o mesmo lugar (ou para o lugar novo do post)
  const CHAVES = ['data-carta', 'data-livre', 'data-post', 'data-cel', 'data-tirar', 'data-acao', 'data-modo', 'data-rascunho'];
  function chaveDoFoco() {
    const el = document.activeElement;
    if (!el || !corpo.contains(el)) return null;
    for (const k of CHAVES) if (el.hasAttribute(k)) return `[${k}="${el.getAttribute(k)}"]`;
    return null;
  }
  let pendente = false;
  function desenhar(depois) {
    if (arrasto?.ativo) { pendente = true; return; } // no meio do arrasto, a mesa espera (a capa não some da mão)
    pendente = false;
    const foco = chaveDoFoco();
    const r = S.rodizio(estado);
    desenharGaveta(r.proximo);
    desenharSemana();
    desenharRodizio(r);
    desenharGrade();
    desenharMarcas();
    desenharEscolha();
    desenharLupa();
    desenharTocar();
    desenharRelogio();
    ligarArrastos();
    const alvo = (depois && corpo.querySelector(depois)) || (foco && corpo.querySelector(foco));
    if (foco || depois) alvo?.focus({ preventScroll: true });
  }

  // ---------- recados ----------

  // o recado aparece em baixo e some sozinho (não fica tapando a semana)
  function recado(texto, jeito = 'ok') {
    R.recado.textContent = texto;
    R.recado.dataset.jeito = jeito;
    R.recado.classList.remove('pisca', 'quieto');
    void R.recado.offsetWidth;
    R.recado.classList.add('pisca');
    clearTimeout(tRecado);
    tRecado = setTimeout(() => R.recado.classList.add('quieto'), jeito === 'ok' ? 4200 : 5600);
  }
  function notificar(texto) {
    R.notif.innerHTML = `<span class="pa-notif-icone"><img src="../img/marca.png" alt="" width="22" height="22"></span>
      <span class="pa-notif-texto"><b>Postagem automática</b><span>${esc(texto)}</span></span><small>agora</small>`;
    R.notif.classList.remove('aparece');
    void R.notif.offsetWidth;
    R.notif.classList.add('aparece');
    clearTimeout(tNotif);
    tNotif = setTimeout(() => R.notif.classList.remove('aparece'), 2300);
  }
  function tremer(el) {
    if (!el) return;
    el.classList.remove('treme');
    void el.offsetWidth;
    el.classList.add('treme');
    setTimeout(() => el.classList.remove('treme'), 500);
  }
  const titulo = (id) => S.postPorId(id)?.titulo ?? '';

  function acender(ids) {
    const ate = performance.now() + BRILHA;
    for (const id of ids) recentes.set(id, ate);
    clearTimeout(tBrilho);
    tBrilho = setTimeout(apagarBrilho, BRILHA + 60);
  }
  function apagarBrilho() {
    const t = performance.now();
    let mudou = false;
    for (const [id, ate] of recentes) if (ate <= t) { recentes.delete(id); mudou = true; }
    if (mudou) desenhar();
    if (recentes.size) tBrilho = setTimeout(apagarBrilho, 300);
  }

  function aoSair(ids) {
    const antes = fotografar();
    acender(ids);
    if (escolhido && ids.includes(escolhido.id)) escolhido = null;
    const ultimo = ids[ids.length - 1];
    const m = estado.saiu[ultimo];
    const dia = S.DIAS[S.diaDoMinuto(m)].nome.toLowerCase();
    notificar(ids.length > 1 ? `Saíram ${ids.length}. O último, às ${S.hora(m, 'texto')}: ${titulo(ultimo)}` : `Saiu às ${S.hora(m, 'texto')}: ${titulo(ultimo)}`);
    recado(ids.length > 1 ? `Saíram ${ids.length} posts, cada um na hora dele.` : `Saiu sozinho às ${S.hora(m, 'texto')} de ${dia}: ${titulo(ultimo)}.`);
    desenhar();
    voarPraGrade(ids, antes);
  }

  // ---------- o relógio ----------

  function verSeMudouAVista() {
    const n = contarPassadas();
    const d = S.diaDoMinuto(estado.agora);
    if (n !== vagasPassadas || d !== diaAtual) {
      vagasPassadas = n;
      diaAtual = d;
      desenhar();
    }
  }
  function fimDaSemana() {
    const n = S.contagem(estado).noAr;
    recado(`Fim da semana: ${n} ${n === 1 ? 'post saiu' : 'posts saíram'}, cada um na hora dele. Nada foi apagado.`);
  }
  function passo(ts) {
    if (!rodando) return;
    if (ts < rodando.segurarAte) { rodando.ultimo = ts; requestAnimationFrame(passo); return; }
    const dt = Math.min(50, ts - rodando.ultimo);
    rodando.ultimo = ts;
    const prox = S.proximaSaida(estado);
    const vel = prox !== null && prox - fino < DEVAGAR ? VELOCIDADE * 0.3 : VELOCIDADE;
    let alvo = fino + dt * vel;
    if (prox !== null && alvo >= prox) alvo = prox;
    fino = Math.min(S.FIM, alvo);
    const r = S.andar(estado, fino);
    estado = r.estado;
    desenharRelogio();
    if (r.sairam.length) {
      vagasPassadas = contarPassadas();
      diaAtual = S.diaDoMinuto(estado.agora);
      aoSair(r.sairam);
      if (rodando.ateOPrimeiro) { parar(); return; }
      rodando.segurarAte = ts + SEGURA;
    } else {
      verSeMudouAVista();
    }
    if (estado.agora >= S.FIM) {
      parar();
      fimDaSemana();
      fimAvisado = true;
      return;
    }
    requestAnimationFrame(passo);
  }
  function tocar(opcoes = {}) {
    rodando = { ultimo: performance.now(), segurarAte: 0, ...opcoes };
    desenharTocar();
    requestAnimationFrame(passo);
  }
  function parar() {
    rodando = null;
    desenharTocar();
  }
  function recomecar() {
    // só a demonstração volta: a semana fica como está e o que tinha saído volta pra fila (no produto, o tempo não volta)
    pararVoos(voosMesa);
    pararVoos(voosGrade);
    estado = { agenda: { ...estado.agenda }, saiu: {}, agora: S.COMECO };
    fino = S.COMECO;
    recentes.clear();
    escolhido = null;
    lupa = null;
    fimAvisado = false;
    vagasPassadas = contarPassadas();
    diaAtual = 0;
    desenhar();
    recado('O exemplo voltou pra segunda, 8h00. No produto de verdade, o tempo não volta.', 'aviso');
  }

  /** O relógio anda até "m" (só pra frente): cada post que chegou na hora sai sozinho, e os números rolam. */
  function avancar(m) {
    if (rodando) parar();
    const alvo = Math.min(S.FIM, Math.max(estado.agora, m));
    if (alvo === fino) return;
    fino = alvo;
    const r = S.andar(estado, alvo);
    estado = r.estado;
    desenharRelogio();
    if (r.sairam.length) {
      vagasPassadas = contarPassadas();
      diaAtual = S.diaDoMinuto(estado.agora);
      aoSair(r.sairam);
    } else verSeMudouAVista();
    desenharTocar();
    if (estado.agora >= S.FIM && !fimAvisado) { fimAvisado = true; fimDaSemana(); }
  }

  /** Pra trás, não: a agulha estica um pouco e volta (o que saiu fica onde está). */
  function naoVolta() {
    recado('O tempo não volta: o que saiu, fica. Arraste pra frente.', 'aviso');
    R.linha.classList.remove('nao-volta');
    void R.linha.offsetWidth;
    R.linha.classList.add('nao-volta');
    setTimeout(() => R.linha.classList.remove('nao-volta'), 700);
    tremerCelular(14);
  }

  function ligarRelogio() {
    let caixa = null;
    let base = 0;
    let avisou = false;
    const comecar = () => {
      mexeu = true;
      pararAmostra();
      if (rodando) parar();
      caixa = R.trilho.getBoundingClientRect();
      avisou = false;
      R.linha.classList.add('mexendo');
    };
    const esticar = (atras) => {
      R.agulha.style.translate = `${G.resistencia(atras)}px 0px`;
      if (atras > 6 && !avisou) { avisou = true; naoVolta(); }
    };
    const soltar = () => {
      R.linha.classList.remove('mexendo');
      R.agulha.style.translate = '';
    };
    const irPara = (alvo) => {
      if (alvo >= estado.agora) { R.agulha.style.translate = ''; avancar(alvo); return; }
      esticar(((estado.agora - alvo) / S.FIM) * caixa.width);
    };
    // o trilho: o ponto que o dedo (ou o mouse) toca e arrasta vira a hora
    pegar(R.linha, {
      eixo: 'x',
      aoComecar: ({ x }) => { comecar(); irPara(G.minutoNoTrilho(x, caixa)); },
      aoMover: ({ x }) => irPara(G.minutoNoTrilho(x, caixa)),
      aoSoltar: soltar,
    });
    // o relógio grande: arrastar pro lado gira a semana (a largura do trilho é a semana inteira)
    pegar(R.relogio, {
      eixo: 'x',
      aoComecar: () => { comecar(); base = fino; },
      aoMover: ({ dx }) => irPara(base + G.minutosDoArrasto(dx, caixa.width)),
      aoSoltar: soltar,
    });
    R.pega.addEventListener('keydown', (ev) => {
      const t = G.teclaDoRelogio(ev.key, estado.agora);
      if (!t) return;
      ev.preventDefault();
      mexeu = true;
      pararAmostra();
      if (t.volta) naoVolta(); else avancar(t.alvo);
    });
  }

  // ---------- as ações ----------

  function escolher(id, de) {
    mexeu = true;
    escolhido = escolhido?.id === id ? null : { id, de };
    if (escolhido) recado(de === 'semana' ? 'Escolhido. Toque noutro horário, ou solte agora.' : 'Agora toque num horário livre da semana.');
    desenhar();
  }

  function porNaVaga(id, d, v, { mao } = {}) {
    mexeu = true;
    const dono = S.quemEstaNaVaga(estado, d, v);
    const onde = S.quando(S.minutoDaVaga(d, v));
    let msg = '';
    const ok = mudar(() => {
      if (dono && dono !== id) {
        if (S.saiu(estado, dono)) { recado('Esse horário já foi usado: o post que saiu fica onde está.', 'nao'); return false; }
        if (estado.agenda[id]) {
          const r = S.trocar(estado, id, dono);
          if (!r.ok) { recado(r.motivo, 'nao'); return false; }
          estado = r.estado;
          msg = `Trocou de horário com “${titulo(dono)}”.`;
        } else {
          const r = S.por(S.tirar(estado, dono).estado, id, d, v);
          if (!r.ok) { recado(r.motivo, 'nao'); return false; }
          estado = r.estado;
          msg = `Entrou na fila: ${onde}. “${titulo(dono)}” voltou pros aprovados.`;
        }
      } else {
        const mudou = Boolean(estado.agenda[id]);
        const r = S.por(estado, id, d, v);
        if (!r.ok) { recado(r.motivo, 'nao'); tremer(corpo.querySelector(`[data-vaga="${d}-${v}"]`)); return false; }
        estado = r.estado;
        msg = mudou ? `Mudou pra ${onde}.` : `Entrou na fila: ${onde}. Sai sozinho nessa hora.`;
      }
      escolhido = null;
      return true;
    }, { mao, foco: `[data-post="${id}"]` });
    if (ok) { recado(msg); tremerCelular(8); }
    return ok;
  }

  function devolver(id, { mao } = {}) {
    let motivo = null;
    const ok = mudar(() => {
      const r = S.tirar(estado, id);
      if (!r.ok) { motivo = r.motivo; return false; }
      estado = r.estado;
      if (escolhido?.id === id) escolhido = null;
      return true;
    }, { mao, foco: `[data-carta="${id}"]` });
    recado(ok ? 'Voltou pros aprovados.' : motivo, ok ? 'ok' : 'nao');
    return ok;
  }

  /** O rascunho tenta entrar: bate na semana e volta (só sai o que o dono aprovou). */
  function recusarRascunho(el) {
    recado('Esse ainda não foi aprovado. Só sai o que você aprovou.', 'nao');
    tremerCelular(24);
    const semana = corpo.querySelector('.pa-semana');
    semana?.classList.remove('recusou');
    void semana?.offsetWidth;
    semana?.classList.add('recusou');
    setTimeout(() => semana?.classList.remove('recusou'), 700);
    if (!el || pedeMenosMovimento() || typeof el.animate !== 'function') { tremer(el); return; }
    el.animate([
      { translate: '0px 0px', scale: '1' },
      { translate: '0px 18px', scale: '0.95', offset: 0.32 },
      { translate: '0px -7px', scale: '1.03', offset: 0.58 },
      { translate: '0px 2px', scale: '1', offset: 0.8 },
      { translate: '0px 0px', scale: '1' },
    ], { duration: 560, easing: 'ease-out' });
  }

  function acao(qual, el) {
    mexeu = true;
    if (qual === 'tocar') {
      // no meio da amostra do começo, o play segue a semana inteira (não pausa)
      if (rodando?.ateOPrimeiro) { rodando.ateOPrimeiro = false; recado('A semana está passando. Cada post sai na hora dele.'); return; }
      if (rodando) { parar(); recado('Pausado. O que está na fila espera a hora dele.'); return; }
      if (estado.agora >= S.FIM) recomecar();
      fimAvisado = false;
      tocar();
    } else if (qual === 'encher') {
      parar();
      let r = null;
      mudar(() => { r = S.encherSemana(estado); estado = r.estado; escolhido = null; return true; });
      const falta = r.faltou ? nomeDoTipo(r.faltou) : null;
      if (!r.colocados.length) recado(r.semVaga || !falta ? 'Não sobrou horário livre na semana.' : `Não deu pra montar: falta um post de “${falta}” aprovado.`, 'aviso');
      else recado(`Semana montada no rodízio: ${r.colocados.length} na fila.${falta ? ` Pra seguir, falta um post de “${falta}” aprovado.` : r.semVaga ? ' O resto não coube nos horários.' : ''}`, falta ? 'aviso' : 'ok');
    } else if (qual === 'limpar') {
      mudar(() => { estado = S.limpar(estado); escolhido = null; return true; });
      recado('Os que não saíram voltaram pros aprovados. O que já saiu fica.');
    } else if (qual === 'agora') {
      if (!escolhido) return;
      const id = escolhido.id;
      const r = S.soltarAgora(estado, id);
      if (!r.ok) { recado(r.motivo, 'nao'); tremer(el); return; }
      pararVoos(voosMesa);
      const antes = fotografar();
      estado = r.estado;
      escolhido = null;
      acender([id]);
      notificar(`Saiu agora, às ${S.hora(estado.agora, 'texto')}: ${titulo(id)}`);
      recado(`Saiu agora, às ${S.hora(estado.agora, 'texto')}. Fora do horário, só com o seu “agora”.`);
      desenhar(`[data-cel="${id}"]`);
      voarPraGrade([id], antes);
    } else if (qual === 'tirar-escolhido') {
      if (escolhido) devolver(escolhido.id);
    } else if (qual === 'cancelar') {
      escolhido = null;
      desenhar();
    } else if (qual === 'fechar-lupa') {
      const era = lupa;
      lupa = null;
      desenharLupa();
      corpo.querySelector(`[data-cel="${era}"]`)?.focus({ preventScroll: true });
    }
  }

  // ---------- arrastar: o mouse pega na hora; o dedo pega segurando um instante ----------

  let arrasto = null;
  let ignorarClique = false;
  let rolar = 0;
  let rafRolar = 0;
  const semanaEl = () => corpo.querySelector('.pa-semana');

  /** Pode soltar este post neste horário? (o horário vazio que ainda vem, ou o de outro post que ainda não saiu) */
  function podeSoltar(id, d, v) {
    if (S.minutoDaVaga(d, v) <= estado.agora) return false;
    const dono = S.quemEstaNaVaga(estado, d, v);
    if (dono && dono !== id) return !S.saiu(estado, dono);
    return S.podePor(estado, id, d, v).ok;
  }

  function marcarAlvo(x, y) {
    const a = arrasto;
    const sob = document.elementFromPoint(x, y)?.closest('[data-vaga], [data-gaveta]') ?? null;
    const alvo = sob && corpo.contains(sob) ? sob : null;
    if (alvo === a.alvo) return;
    a.alvo?.classList.remove('alvo', 'alvo-nao');
    a.alvo = alvo;
    if (!alvo) return;
    if (a.id === S.RASCUNHO.id) { if (alvo.matches('[data-vaga]')) alvo.classList.add('alvo-nao'); return; }
    if (alvo.matches('[data-gaveta]')) { if (estado.agenda[a.id]) alvo.classList.add('alvo'); return; }
    const [d, v] = alvo.dataset.vaga.split('-').map(Number);
    alvo.classList.add(podeSoltar(a.id, d, v) ? 'alvo' : 'alvo-nao');
  }
  // perto da borda de cima ou de baixo da tela, a página rola sozinha (dá pra levar o post até o domingo)
  function rolarNaBorda() {
    if (!arrasto?.ativo || !rolar) { rafRolar = 0; return; }
    window.scrollBy(0, rolar);
    marcarAlvo(arrasto.x, arrasto.y);
    rafRolar = requestAnimationFrame(rolarNaBorda);
  }
  function moverFantasma() {
    const a = arrasto;
    a.fantasma.style.transform = `translate(${Math.round(a.x - a.ox)}px, ${Math.round(a.y - a.oy - (a.toque ? 30 : 0))}px) rotate(-4deg) scale(1.06)`;
  }

  function ativarArrasto() {
    const a = arrasto;
    if (!a || a.ativo) return;
    if (!a.fonte.isConnected) { arrasto = null; return; }
    a.ativo = true;
    if (rodando) parar();
    const rascunho = a.id === S.RASCUNHO.id;
    const p = S.postPorId(a.id);
    const r = (a.fonte.querySelector('.pa-capa') ?? a.fonte).getBoundingClientRect();
    a.origem = caixaDe(r);
    a.ox = a.x0 - r.left;
    a.oy = a.y0 - r.top;
    a.fantasma = document.createElement('div');
    a.fantasma.className = `pa-fantasma${rascunho ? ' rascunho' : ` pa-t-${p.tipo}`}`;
    a.fantasma.setAttribute('aria-hidden', 'true');
    a.fantasma.style.width = `${r.width}px`;
    a.fantasma.style.height = `${r.height}px`;
    a.fantasma.innerHTML = rascunho ? `<span class="pa-fantasma-tranca">${cadeadoSvg()}</span>` : `<img src="${p.img}" alt="">`;
    document.body.appendChild(a.fantasma);
    a.fonte.classList.add('arrastando');
    document.documentElement.classList.add('pa-arrastando');
    semanaEl()?.classList.add(rascunho ? 'com-rascunho' : 'escolhendo');
    tremerCelular(8);
    moverFantasma();
    marcarAlvo(a.x, a.y);
  }

  function comecarArrasto(el, { x, y, ev }) {
    pararAmostra(el);
    const toque = ev.pointerType !== 'mouse';
    arrasto = { id: el.dataset.arrasta, fonte: el, x0: x, y0: y, x, y, ativo: false, toque, alvo: null, fantasma: null, tempo: 0 };
    if (toque) {
      const meu = arrasto;
      meu.tempo = setTimeout(() => { if (arrasto === meu) ativarArrasto(); }, SEGURAR);
    }
  }

  function moverArrasto({ x, y, dx, dy }) {
    const a = arrasto;
    if (!a) return;
    a.x = x;
    a.y = y;
    if (!a.ativo) {
      const d = Math.hypot(dx, dy);
      if (a.toque) { if (d > 10) { clearTimeout(a.tempo); arrasto = null; } return; } // mexeu antes de segurar: é a página rolando
      if (d < 6) return;
      ativarArrasto();
      if (!arrasto) return;
    }
    moverFantasma();
    marcarAlvo(x, y);
    const embaixo = innerHeight - 80;
    const emcima = 140; // abaixo da barra do topo, que fica grudada
    rolar = y > embaixo ? Math.ceil((y - embaixo) / 5) : y < emcima ? -Math.ceil((emcima - y) / 5) : 0;
    if (rolar && !rafRolar) rafRolar = requestAnimationFrame(rolarNaBorda);
  }

  /** A capa da mão volta pro lugar dela (com mola). `bate`: antes de voltar, ela bate (o rascunho na semana). */
  function voltarPraMao(a, { bate = false } = {}) {
    const g = a.fantasma;
    const destino = a.fonte.isConnected ? caixaDe((a.fonte.querySelector('.pa-capa') ?? a.fonte).getBoundingClientRect()) : a.origem;
    // a mesa que ficou esperando o arrasto se redesenha só quando a cópia chega (a capa não aparece 2 vezes)
    const fim = () => { g.remove(); a.fonte.classList.remove('arrastando'); if (pendente) desenhar(); };
    if (pedeMenosMovimento() || typeof g.animate !== 'function') { fim(); return; }
    a.fonte.classList.add('arrastando'); // a capa de verdade só acende de novo quando a cópia chega
    const agora = g.style.transform;
    const volta = `translate(${Math.round(destino.left)}px, ${Math.round(destino.top)}px)`;
    const quadros = bate
      ? [{ transform: agora }, { transform: `${agora} scale(.86, 1.1) rotate(9deg)`, offset: 0.16 }, { transform: `${agora} scale(1.04) rotate(-5deg)`, offset: 0.3 }, { transform: volta }]
      : [{ transform: agora }, { transform: volta }];
    const anim = g.animate(quadros, { duration: bate ? 720 : 420, easing: bate ? 'ease-out' : MOLA });
    anim.onfinish = anim.oncancel = fim;
  }

  function soltarArrasto({ cancelou }) {
    const a = arrasto;
    arrasto = null;
    rolar = 0;
    if (!a) return;
    clearTimeout(a.tempo);
    if (!a.ativo) return; // foi só um toque: o clique cuida
    ignorarClique = true;
    setTimeout(() => { ignorarClique = false; }, 0);
    const daMao = caixaDe(a.fantasma.getBoundingClientRect());
    a.fonte.classList.remove('arrastando');
    document.documentElement.classList.remove('pa-arrastando');
    a.alvo?.classList.remove('alvo', 'alvo-nao');
    semanaEl()?.classList.remove('escolhendo', 'com-rascunho');
    escolhido = null;
    const sobre = cancelou ? null : a.alvo;
    if (a.id === S.RASCUNHO.id) {
      voltarPraMao(a, { bate: Boolean(sobre?.matches('[data-vaga]')) });
      recusarRascunho(null);
      return;
    }
    let ok = false;
    if (sobre?.matches('[data-vaga]')) {
      if (sobre.classList.contains('passou')) recado('Esse horário já passou.', 'nao');
      else {
        const [d, v] = sobre.dataset.vaga.split('-').map(Number);
        ok = porNaVaga(a.id, d, v, { mao: { id: a.id, rect: daMao } });
      }
    } else if (sobre?.matches('[data-gaveta]') && estado.agenda[a.id]) {
      ok = devolver(a.id, { mao: { id: a.id, rect: daMao } });
    }
    if (ok) a.fantasma.remove(); // a cópia do voo já saiu de onde a mão soltou
    else voltarPraMao(a);
  }

  function ligarArrastos() {
    for (const el of corpo.querySelectorAll('[data-arrasta]:not([data-pega-ligado])')) {
      el.dataset.pegaLigado = '1';
      pegar(el, { aoComecar: (inicio) => comecarArrasto(el, inicio), aoMover: moverArrasto, aoSoltar: soltarArrasto });
      el.style.touchAction = 'pan-x pan-y'; // o dedo continua rolando a fila e a página; segurando, ele pega a capa
    }
  }
  // com a capa na mão, o dedo não rola a página (o arrasto é dele)
  document.addEventListener('touchmove', (ev) => { if (arrasto?.ativo) ev.preventDefault(); }, { passive: false });
  corpo.addEventListener('contextmenu', (ev) => { if (ev.target.closest?.('[data-arrasta]')) ev.preventDefault(); });
  corpo.addEventListener('dragstart', (ev) => ev.preventDefault());

  // a amostra do começo (o relógio andando sozinho) para assim que a pessoa mexe em alguma coisa
  function pararAmostra(el) {
    mexeu = true;
    if (rodando?.ateOPrimeiro && !el?.closest?.('[data-acao="tocar"]')) parar();
  }

  // ---------- os cliques e toques ----------

  corpo.addEventListener('click', (ev) => {
    if (ignorarClique) { ignorarClique = false; return; }
    const el = ev.target.closest('button');
    if (!el || !corpo.contains(el)) return;
    pararAmostra(el);
    const d = el.dataset;
    if (d.acao) { acao(d.acao, el); return; }
    if (d.modo) { modo = d.modo; mexeu = true; desenharGrade(); return; }
    if ('rascunho' in d) { recusarRascunho(el); return; }
    if (d.carta) { escolher(d.carta, 'gaveta'); return; }
    if (d.livre) {
      const [dia, v] = d.livre.split('-').map(Number);
      if (!escolhido) {
        recado('Escolha um post aprovado primeiro (ou toque em “Encher a semana”).', 'aviso');
        tremer(R.cartas);
        return;
      }
      porNaVaga(escolhido.id, dia, v);
      return;
    }
    if (d.tirar) { devolver(d.tirar); return; }
    if (d.post) {
      const id = d.post;
      if (S.saiu(estado, id)) {
        tremer(el);
        recado(`Já saiu (${S.quando(estado.saiu[id])}). Post publicado não se apaga nem se edita.`, 'aviso');
        return;
      }
      if (escolhido && escolhido.id !== id) { const v = estado.agenda[id]; porNaVaga(escolhido.id, v.dia, v.vaga); return; }
      escolher(id, 'semana');
      return;
    }
    if (d.cel) {
      lupa = d.cel;
      desenharLupa();
      corpo.querySelector('.pa-lupa-fechar')?.focus({ preventScroll: true });
    }
  });

  corpo.addEventListener('keydown', (ev) => {
    if (['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) pararAmostra(ev.target);
    if (ev.key !== 'Escape') return;
    if (lupa) { acao('fechar-lupa'); return; }
    if (escolhido) { escolhido = null; desenhar(); }
  });

  ligarRelogio();
  desenhar();
  ligarVidro(document);

  // a primeira vez que o celular aparece, o relógio anda sozinho até o primeiro post sair (e a capa voa pra grade)
  if (!pedeMenosMovimento() && typeof IntersectionObserver === 'function') {
    const olho = new IntersectionObserver((entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return;
      olho.disconnect();
      setTimeout(() => {
        if (mexeu || rodando || S.proximaSaida(estado) === null) return;
        recado('Olha o relógio: o post sai sozinho, na hora dele.');
        tocar({ ateOPrimeiro: true });
      }, 700);
    }, { threshold: 0.3 });
    olho.observe(R.celular);
  }
}

function rodaSvg() {
  // os 4 tipos em volta da roda, no sentido contrário ao do relógio: a roda gira no sentido do relógio e o próximo para no ponteiro
  const arcos = S.TIPOS.map((t, i) => {
    const ang = (-i * 90 * Math.PI) / 180;
    const x = (60 + 46 * Math.sin(ang)).toFixed(1);
    const y = (60 - 46 * Math.cos(ang)).toFixed(1);
    return `<circle class="pa-arco pa-t-${t.id}" data-arco="${t.id}" cx="60" cy="60" r="46" pathLength="100" stroke-dasharray="22 78" stroke-dashoffset="${[11, 36, 61, 86][i]}" transform="rotate(-90 60 60)"/>
      <text class="pa-arco-n" data-arco-n="${t.id}" x="${x}" y="${y}">${t.n}</text>`;
  }).join('');
  return `<svg viewBox="0 0 120 120"><g class="pa-roda-gira" data-roda-gira>${arcos}</g>
    <path class="pa-roda-ponteiro" d="M60 13.5L54.5 3h11z"/>
    <circle class="pa-roda-miolo" cx="60" cy="60" r="30"/>
    <text class="pa-roda-sub" x="60" y="45" data-roda-bloco>falta</text>
    <text class="pa-roda-num" x="60" y="66" data-roda-num>1</text>
    <text class="pa-roda-nome" x="60" y="80" data-roda-nome></text></svg>`;
}

function esqueleto() {
  return `<div class="pa-topo">
    <div class="pa-relogio" data-relogio aria-hidden="true"><span class="pa-relogio-dia" data-r-dia></span><span class="pa-relogio-hora" data-r-hora></span><span class="pa-relogio-ponto"></span><span class="pa-relogio-dica">${I.arrasta}arraste</span></div>
    <button type="button" class="pa-tocar" data-acao="tocar"></button>
    <div class="pa-linha" data-linha>
      <div class="pa-trilho" aria-hidden="true">
        <span class="pa-trilho-dias">${S.DIAS.map(() => '<i></i>').join('')}</span>
        <span class="pa-trilho-feito" data-feito></span>
        <span class="pa-trilho-trava" data-trava></span>
        <span class="pa-trilho-marcas" data-marcas></span>
      </div>
      <span class="pa-agulha" data-agulha><span class="pa-pega" data-pega role="slider" tabindex="0" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="${S.FIM}" aria-label="O relógio da semana: pra frente, os posts vão saindo; pra trás, ele não volta"></span></span>
      <div class="pa-trilho-rotulos" aria-hidden="true">${S.DIAS.map((d) => `<span>${d.curto}</span>`).join('')}</div>
    </div>
  </div>
  <div class="pa-mesa">
    <div class="pa-esq">
      <section class="pa-gaveta" aria-label="Os posts aprovados">
        <div class="pa-secao-cab"><h3 class="pa-titulo">Aprovados <span class="pa-conta rola" data-conta-gaveta>0</span></h3><p class="pa-dica" data-dica-gaveta></p></div>
        <ul class="pa-cartas" data-gaveta></ul>
      </section>
      <section class="pa-agenda" aria-label="A semana">
        <div class="pa-secao-cab">
          <h3 class="pa-titulo">A semana <small>de 1 a 3 por dia</small></h3>
          <div class="pa-agenda-botoes">
            <button type="button" class="pa-botao" data-acao="encher">${I.brilho}<span>Encher a semana</span></button>
            <button type="button" class="pa-botao" data-acao="limpar">${I.devolver}<span>Tirar o que não saiu</span></button>
          </div>
        </div>
        <div data-r-semana></div>
      </section>
      <section class="pa-rodizio" aria-label="O rodízio 4-4-4">
        <div class="pa-roda" data-roda aria-hidden="true">${rodaSvg()}</div>
        <div class="pa-rodizio-lado">
          <h3 class="pa-titulo">Rodízio 4-4-4 <small>em cada 4 seguidos, um de cada</small></h3>
          <ol class="pa-faixa" data-faixa aria-label="Os blocos de 4, na ordem da semana"></ol>
          <p class="pa-rodizio-frase" data-rodizio-frase aria-live="polite"></p>
          <p class="pa-legenda">${S.TIPOS.map((t) => `<span class="pa-t-${t.id}"><i></i>${t.n} ${esc(t.curto)}</span>`).join('')}</p>
        </div>
      </section>
    </div>
    <div class="pa-dir">
      <div class="pa-modo" role="group" aria-label="Como ver a grade">
        <button type="button" data-modo="seguidor" aria-pressed="true">Como o seguidor vê</button>
        <button type="button" data-modo="fila" aria-pressed="false">Com a fila</button>
      </div>
      <div class="pa-celular inclina" data-forca="5">
        <div class="pa-tela">
          <div class="pa-status"><span class="pa-status-hora" data-c-hora></span><span class="pa-ilha" aria-hidden="true"></span><span class="pa-status-icones">${STATUS}</span></div>
          <div class="pa-notif" data-notif aria-hidden="true"></div>
          <div class="pa-ig-barra" aria-hidden="true"><b>pineapplepro_</b>${I.desce}<span class="pa-ig-acoes">${I.novo}${I.menu}</span></div>
          <div class="pa-ig-perfil">
            <span class="pa-avatar"><img src="../img/marca.png" alt="" width="34" height="34"></span>
            <span class="pa-ig-quem"><b>Pineapple Pro</b><span class="pa-numeros" data-c-numeros><span><b class="rola" data-c-ar>0</b> no ar</span><span class="pa-n-fila"> · <b class="rola" data-c-fila>0</b> na fila</span></span><small>prévia da grade · exemplo</small></span>
          </div>
          <div class="pa-ig-abas" aria-hidden="true"><span class="ativa">${I.grade}</span><span>${I.reels}</span><span>${I.marcado}</span></div>
          <div class="pa-ig-rolo"><div class="pa-grade" data-grade></div></div>
          <div class="pa-lupa" data-lupa hidden></div>
          <span class="pa-tela-brilho" aria-hidden="true" data-profundidade="14"></span>
        </div>
      </div>
      <p class="pa-dica-celular">${I.lupa}<span>Toque numa capa e veja o que o corte 3:4 tira. Em “Com a fila”, o apagadinho é o que ainda vai sair.</span></p>
    </div>
  </div>
  <div class="pa-barra">
    <div class="pa-escolha" data-r-escolha hidden></div>
    <p class="pa-recado" data-recado role="status" aria-live="polite"></p>
  </div>`;
}

// ---------- o dia normal × o dia de evento ----------

const REGUA = { de: 8, ate: 24 };
function ligarEvento(raiz) {
  const regua = raiz.querySelector('[data-regua]');
  const lista = raiz.querySelector('[data-horarios]');
  const texto = raiz.querySelector('[data-evento-texto]');
  if (!regua || !lista || !texto) return;
  const evento = S.diaDeEvento(14, 22);
  const normal = S.diaNormal();
  const lugar = (h) => pct((h - REGUA.de) / (REGUA.ate - REGUA.de));
  const horaNum = (t) => { const [h, m] = t.split('h').map(Number); return h + (m || 0) / 60; };
  const horas = [];
  for (let h = REGUA.de; h <= REGUA.ate; h += 2) horas.push(`<span class="pa-regua-hora" style="left: ${lugar(h)}">${h}h</span>`);
  // as mesmas bolinhas andam de um jeito pro outro (no dia normal, as que sobram somem)
  regua.innerHTML = `<span class="pa-regua-linha"></span>${horas.join('')}${evento.map(() => '<i class="pa-regua-marca"></i>').join('')}`;
  const marcas = [...regua.querySelectorAll('.pa-regua-marca')];
  const mostrar = (qual) => {
    const doDia = qual === 'evento' ? evento : normal;
    raiz.dataset.dia = qual;
    for (const b of raiz.querySelectorAll('[data-dia-tipo]')) b.setAttribute('aria-pressed', String(b.dataset.diaTipo === qual));
    marcas.forEach((m, i) => {
      const h = doDia[Math.min(i, doDia.length - 1)];
      m.style.left = lugar(horaNum(h.hora));
      m.className = `pa-regua-marca${i >= doDia.length ? ' some' : ''}${h.formato === 'post' ? ' post' : ''}`;
    });
    lista.innerHTML = doDia.map((h, i) => {
      const nome = h.formato === 'reels' ? 'Reels' : h.formato === 'post' ? 'Post' : '';
      const icone = h.formato === 'reels' ? I.reels : h.formato === 'post' ? I.foto : I.relogio;
      return `<li class="pa-h${h.formato ? ` pa-h-${h.formato}` : ''}" style="--i: ${i}">${icone}<b>${h.hora}</b>${nome ? `<small>${nome}</small>` : ''}</li>`;
    }).join('');
    texto.textContent = qual === 'evento' ? `${evento.length} posts: 1 por hora, alternando Reels e post. Só no dia do evento.` : `No máximo ${S.MAX_POR_DIA} por dia, cada um no horário dele.`;
  };
  raiz.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-dia-tipo]');
    if (b) mostrar(b.dataset.diaTipo);
  });
  mostrar('normal');
}

if (typeof document !== 'undefined') {
  const iniciar = () => {
    const estudio = document.querySelector('[data-estudio]');
    if (estudio) ligarEstudio(estudio);
    const evento = document.querySelector('[data-evento]');
    if (evento) ligarEvento(evento);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
}
