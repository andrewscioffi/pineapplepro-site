// O VÍDEO EDITADO (v3, 07/11/2026, o Andrews: "eu quero que a interface seja altamente interativa"). A mesa de edição:
//   1. a agulha: a pessoa arrasta (o dedo, o mouse ou as setas) e a prévia mostra o quadro daquele instante. Os cortes
//      acendem quando a agulha passa por eles, o nome sobe no 1º, a frase entra no último e a velocidade rola (1x, 1,8x, 0,7x)
//   2. tocar num corte mostra só o efeito dele, em loop: o destaque chegando perto, a ação 1,8x com o soco de zoom, ou o
//      detalhe em câmera lenta 0,7x
//   3. "trocas devagar": as trocas de 0,35 s (o borrão e o empurrão) e o flash do final tocam 4x mais devagar, com o tempo rolando
//   4. o vídeo da pessoa: abre aqui mesmo, no navegador (um endereço do próprio aparelho, blob:), e nunca sai dele. Os 3
//      momentos (30%, 60% e 85%, como o robô faz quando a IA não responde) entram marcados na tira, e ela arrasta cada um:
//      o plano se refaz pelo planejar(), o mesmo do robô
//   5. o som (só se a pessoa ligar): o do vídeo dela, o "whoosh" nas trocas (que acompanha a agulha quando ela arrasta) e a
//      batida no final, feitos aqui mesmo
// O plano e as contas ficam em plano.js (o teste compara com o robô: setores/cardapio/bot/src/videos.ts, só lido).
// Nada aqui finge a IA: é uma prévia do jeito da edição. O vídeo de verdade sai no Direct.
export * from './plano.js';
import {
  planejar, momentosPadrao, nomeDoVideo, FRASES_DO_VIDEO, DEMO_SEGUNDOS, NOME_PADRAO, ESTILOS, ROTULOS, MOMENTOS,
  FIM_TRANSICAO, ondeFrase, linhaDoTempo, quadroEm, quadroDoCorte, EFEITOS, RITMO_DEVAGAR, trocasDevagar,
  eventosDeSom, cruzou, momentoDoX, tempoDoMomento, passoDaAgulha, segundosEmTexto, centesimos, velocidadeEmTexto, zoomEmTexto,
} from './plano.js';
import { pegar, animarNumero, estourarEm, vibrar, pedeMenosMovimento } from '../comum/interacao.js';

const n2 = (x) => Math.round(x * 100) / 100;
const limitar = (v, a, b) => Math.min(b, Math.max(a, v));

/* ------------------------------------------- a tela ------------------------------------------- */

const ARTE = [
  // 1. o destaque: a esfera de gesso no prato, com a luz de janela
  '<div class="arte arte-destaque" aria-hidden="true"><i class="mesa"></i><i class="janela"></i><i class="prato"></i><i class="sombra"></i><i class="esfera"></i></div>',
  // 2. a ação: as faíscas subindo, os riscos de luz passando e a esfera pulando
  `<div class="arte arte-acao" aria-hidden="true"><i class="mesa"></i><i class="janela"></i><i class="prato"></i><i class="sombra"></i><i class="esfera"></i>${'<i class="faisca"></i>'.repeat(9)}${'<i class="risco"></i>'.repeat(3)}</div>`,
  // 3. o detalhe: a superfície da esfera de perto, com as bolhas de luz
  `<div class="arte arte-detalhe" aria-hidden="true"><i class="mesa"></i><i class="superficie"></i>${'<i class="bolha"></i>'.repeat(6)}</div>`,
];

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pedeMenos = () => pedeMenosMovimento();
const umaVez = (el, evento, ms) => new Promise((ok, falha) => {
  const t = setTimeout(() => falha(new Error('demorou')), ms);
  el.addEventListener(evento, () => { clearTimeout(t); ok(); }, { once: true });
  el.addEventListener('error', () => { clearTimeout(t); falha(new Error('erro')); }, { once: true });
});

// o ruído rosa do "whoosh" (como o anoisesrc do robô: 0,5 s, filtrado entre 350 e 5.500 Hz)
function ruidoRosa(ctx) {
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.5), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.16;
  }
  return buf;
}
// o whoosh: no ritmo 1, igual ao do robô (sobe em 0,3 s e some em 0,2 s); devagar, ele também fica 4x mais comprido
function tocarWhoosh(ctx, buf, ritmo = 1) {
  const t0 = ctx.currentTime;
  const dura = 0.5 / ritmo;
  const fonte = ctx.createBufferSource(); fonte.buffer = buf; fonte.playbackRate.value = ritmo;
  const alto = ctx.createBiquadFilter(); alto.type = 'highpass'; alto.frequency.value = 350;
  const baixo = ctx.createBiquadFilter(); baixo.type = 'lowpass'; baixo.frequency.value = 5500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.3 / ritmo);
  g.gain.linearRampToValueAtTime(0.0001, t0 + dura);
  fonte.connect(alto).connect(baixo).connect(g).connect(ctx.destination);
  fonte.start(t0); fonte.stop(t0 + dura);
}
function tocarBatida(ctx) {
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 62;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.9, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  o.connect(g).connect(ctx.destination);
  o.start(t0); o.stop(t0 + 0.5);
}

// os textos do painel de cada jeito de ver
const VER_TUDO = { titulo: 'A edição inteira', diz: 'Os 3 cortes, as trocas e o final, do jeito que o robô monta. Arraste a agulha pra ver quadro a quadro.' };
const ROTULO_DO_TEMPO = { tudo: 'Na edição', corte: 'No corte', devagar: 'Na troca' };

function ligarMesa(doc) {
  const raiz = doc.querySelector('[data-mesa]');
  const tela = raiz?.querySelector('[data-tela]');
  if (!tela) return;
  const linhaEl = raiz.querySelector('[data-linha]');
  const botaoTocar = raiz.querySelector('[data-tocar]');
  const botaoSom = raiz.querySelector('[data-som]');
  const agoraEl = raiz.querySelector('[data-agora]');
  const ritmoEl = raiz.querySelector('[data-ritmo]');
  const entradaNome = raiz.querySelector('[data-nome]');
  const escolhaEstilo = raiz.querySelector('[data-estilo]');
  const chipsVersao = [...raiz.querySelectorAll('[data-versao]')];
  const chipsVer = [...raiz.querySelectorAll('button[data-ver]')];
  const modo = raiz.querySelector('[data-modo]');
  const modoTitulo = modo?.querySelector('[data-modo-titulo]');
  const modoDiz = modo?.querySelector('[data-modo-diz]');
  const numVel = raiz.querySelector('[data-num-vel]'); // a velocidade fica na barra do monitor (à vista enquanto a agulha anda)
  const numZoom = modo?.querySelector('[data-num-zoom]');
  const numTempo = modo?.querySelector('[data-num-tempo]');
  const numTempoRot = modo?.querySelector('[data-num-tempo-rot]');
  const modoBarra = modo?.querySelector('[data-modo-barra]');
  const entrada = raiz.querySelector('[data-arquivo]');
  const soltar = raiz.querySelector('[data-soltar]');
  const voltar = raiz.querySelector('[data-voltar]');
  const aviso = raiz.querySelector('[data-aviso-video]');
  const tituloSoltar = raiz.querySelector('[data-soltar-titulo]');
  const desfoque = doc.querySelector('[data-desfoque]');
  const solte = doc.querySelector('[data-solte]');
  const TITULO_SOLTAR = tituloSoltar?.textContent ?? '';

  const estado = {
    modo: 'exemplo', segundos: DEMO_SEGUNDOS, url: null, tira: null,
    comMarca: true, estilo: 'geral', nome: '',
    t: 0, tl: 0, ver: 'tudo', dv: { i: 0, espera: 0 },
    tocando: false, pessoaPausou: false, visivel: true, som: false,
    momentos: momentosPadrao(DEMO_SEGUNDOS), plano: null, linha: null, trocas: [],
  };
  let camadas = [], zooms = [], videos = [], fundos = [], nomeEl = null, fraseEl = null, seloEl = null, fimEl = null, fimZoom = null, brancoEl = null, pretoEl = null;
  let blocos = [], juntas = [], janelas = [], pinos = [], agulha = null, agulhaTempo = null, cabecaFonte = null, tempoEl = null, edicaoEl = null, trilhoEdicao = null, fonteTrilho = null;
  let raf = 0, ultimo = null, audio = null, ruido = null, ativoAntes = null, ultimoSom = 0;
  const textos = { titulo: '', diz: '', tempo: '', zoom: '', agulha: '', rotulo: '' };

  const avisar = (texto, erro = false) => { if (aviso) { aviso.textContent = texto; aviso.classList.toggle('erro', erro); } };
  const frase = () => FRASES_DO_VIDEO[estado.estilo] ?? FRASES_DO_VIDEO.geral;
  const nome = () => nomeDoVideo(estado.nome) || NOME_PADRAO;
  const solo = () => typeof estado.ver === 'number';
  const trocaAtual = () => (estado.ver === 'devagar' ? estado.trocas[estado.dv.i] ?? null : null);

  // as frases do fim, na lista
  if (escolhaEstilo) {
    escolhaEstilo.innerHTML = ESTILOS.map((e) => `<option value="${e}">${esc(FRASES_DO_VIDEO[e])}</option>`).join('');
    escolhaEstilo.value = estado.estilo;
  }

  function montarTela() {
    const k = estado.plano.cortes.length;
    const iFrase = ondeFrase(k, true);
    let html = '';
    for (let i = 0; i < k; i++) {
      const dentro = estado.modo === 'video'
        ? '<canvas class="fundo-borrado" width="54" height="96"></canvas><video class="video-corte" muted playsinline preload="auto"></video>'
        : ARTE[i] ?? ARTE[0];
      const textoNome = i === 0 ? `<div class="texto-nome" data-texto-nome><span class="nome"><i></i><span data-nome-tela>${esc(nome())}</span></span></div>` : '';
      const textoFrase = i === iFrase ? `<div class="texto-frase" data-texto-frase>${esc(frase())}</div>` : '';
      html += `<div class="corte" style="z-index:${i + 1}"><div class="corte-zoom">${dentro}</div>${textoNome}${textoFrase}</div>`;
    }
    html += `<span class="selo-amostra" aria-hidden="true"><img src="../img/marca.png" alt="" aria-hidden="true" width="40" height="40"><span><b>Pineapple Pro</b><small>amostra grátis</small></span></span>
<div class="branco"></div>
<div class="fim"><div class="fim-zoom"><img src="../img/marca.png" alt="" aria-hidden="true" width="120" height="120"><b>Pineapple Pro</b><span>soluções para negócios da alimentação</span></div></div>
<div class="preto"></div>`;
    tela.innerHTML = html;
    tela.classList.toggle('com-video', estado.modo === 'video');
    camadas = [...tela.querySelectorAll('.corte')];
    zooms = camadas.map((c) => c.querySelector('.corte-zoom'));
    videos = camadas.map((c) => c.querySelector('video')).filter(Boolean);
    fundos = camadas.map((c) => c.querySelector('canvas')).filter(Boolean);
    nomeEl = tela.querySelector('[data-texto-nome]');
    fraseEl = tela.querySelector('[data-texto-frase]');
    seloEl = tela.querySelector('.selo-amostra');
    fimEl = tela.querySelector('.fim');
    fimZoom = tela.querySelector('.fim-zoom');
    brancoEl = tela.querySelector('.branco');
    pretoEl = tela.querySelector('.preto');
    for (const v of videos) { v.src = estado.url; v.muted = true; v.defaultMuted = true; v.playsInline = true; }
    ultimoValor.delete(tela);
  }

  // ---- a linha do tempo: a edição (com a agulha) e o vídeo da pessoa (com os 3 momentos) ----
  function montarLinha({ entrar = false } = {}) {
    if (!linhaEl) return;
    const L = estado.linha;
    const dur = estado.segundos;
    const comVideo = estado.modo === 'video';
    const muitos = L.cortes.length > 1;
    const passo = L.total > 12 ? 2 : 1;
    const regua = [];
    for (let s = 0; s <= Math.floor(L.total); s += passo) regua.push(`<span style="--x:${s}">${s}</span>`);
    const blocosHtml = L.cortes.map((c, i) => {
      const r = ROTULOS[c.zoom] ?? ROTULOS.chegando;
      return `<button class="bloco b${i}" type="button" data-ir="${i}" style="--de:${c.inicio};--ate:${c.fim}" aria-label="Ver só o corte ${i + 1}, ${r.nome} (${r.faz}), em loop"><b>${r.nome}</b><small>${r.faz}</small></button>`;
    }).join('');
    const juntasHtml = L.trocas.map((tr) => `<i class="junta" style="--de:${tr.de};--ate:${tr.ate}" aria-hidden="true"></i>`).join('');
    const fim = L.comMarca
      ? `<button class="bloco bfim" type="button" data-ir="fim" style="--de:${L.fimDe};--ate:${L.total}" aria-label="Ver o final com a logo"><b>Final</b><small>a logo</small></button><i class="junta branca" style="--de:${L.fimDe};--ate:${n2(L.fimDe + FIM_TRANSICAO)}" aria-hidden="true"></i>`
      : '';
    const janelasHtml = L.cortes.map((c, i) => `<button class="janela j${i}" type="button" data-ir="${i}" style="--de:${c.de};--ate:${n2(c.de + c.dura)}" aria-label="Ver só o corte ${i + 1}, que sai daqui do vídeo"></button>`).join('');
    const pinosHtml = muitos ? MOMENTOS.map((m, k) => {
      const t = n2(estado.momentos[m.chave]);
      return comVideo
        ? `<button class="momento m${k}" type="button" data-momento="${k}" role="slider" aria-label="${esc(m.rotulo)}: o momento ${k + 1} do seu vídeo. Arraste, ou use as setas." aria-valuemin="0" aria-valuemax="${n2(dur)}" aria-valuenow="${t}" aria-valuetext="${segundosEmTexto(t)}" style="--m:${t};--k:${k}"><b>${k + 1}</b><span class="momento-tempo" data-momento-tempo>${segundosEmTexto(t)}</span></button>`
        : `<span class="momento m${k} parado" style="--m:${t};--k:${k}" aria-hidden="true"><b>${k + 1}</b></span>`;
    }).join('') : '';
    const pcts = muitos ? [30, 60, 85].map((p) => `<span style="--x:${p}">${p}%</span>`).join('') : '';
    const nota = !muitos ? 'Vídeo de menos de 4,5 segundos vira um corte só, com o zoom e o texto.'
      : comVideo ? 'Os 3 momentos começam em 30%, 60% e 85% do vídeo, como o robô faz sem a IA (no robô, a IA escolhe). Arraste cada um: o plano se refaz na hora.'
        : 'No robô, a IA olha o vídeo e escolhe os 3 momentos. Aqui eles ficam em 30%, 60% e 85%, como o robô faz sem a IA. Com o seu vídeo, você arrasta cada um.';
    linhaEl.innerHTML = `
<div class="linha-cab"><b>A edição</b><output data-tempo-edicao>${segundosEmTexto(estado.t)} de ${segundosEmTexto(L.total)}</output></div>
<div class="edicao" data-edicao style="--total:${L.total}">
  <div class="trilho trilho-edicao">${blocosHtml}${fim}${juntasHtml}</div>
  <div class="regua" aria-hidden="true">${regua.join('')}</div>
  <div class="agulha" data-agulha role="slider" tabindex="0" aria-label="A agulha da edição. Arraste, ou use as setas pra andar." aria-valuemin="0" aria-valuemax="${L.total}" aria-valuenow="${n2(estado.t)}" aria-valuetext="${segundosEmTexto(estado.t)}" style="--x:${n2(estado.t)}"><span class="agulha-cabo" aria-hidden="true"><span class="agulha-tempo" data-agulha-tempo>${segundosEmTexto(estado.t)}</span></span></div>
</div>
<div class="linha-cab fonte-cab"><b>O seu vídeo</b><span>${comVideo ? segundosEmTexto(dur) : `exemplo · ${segundosEmTexto(dur)}`}</span></div>
<div class="fonte${comVideo ? ' com-video' : ''}${entrar ? ' entra' : ''}" data-fonte style="--dur:${dur}">
  <div class="momentos" data-momentos>${pinosHtml}</div>
  <div class="trilho trilho-fonte" data-fonte-trilho><span class="tira${comVideo ? '' : ' tira-exemplo'}" data-tira></span>${janelasHtml}<i class="cabeca-fonte" data-cabeca-fonte aria-hidden="true"></i></div>
</div>
<div class="pcts" aria-hidden="true">${pcts}</div>
<p class="linha-nota">${nota}</p>`;
    edicaoEl = linhaEl.querySelector('[data-edicao]');
    trilhoEdicao = linhaEl.querySelector('.trilho-edicao');
    fonteTrilho = linhaEl.querySelector('[data-fonte-trilho]');
    blocos = [...linhaEl.querySelectorAll('.trilho-edicao .bloco')];
    juntas = [...linhaEl.querySelectorAll('.trilho-edicao .junta')];
    janelas = [...linhaEl.querySelectorAll('.janela')];
    pinos = [...linhaEl.querySelectorAll('button[data-momento]')];
    agulha = linhaEl.querySelector('[data-agulha]');
    agulhaTempo = linhaEl.querySelector('[data-agulha-tempo]');
    cabecaFonte = linhaEl.querySelector('[data-cabeca-fonte]');
    tempoEl = linhaEl.querySelector('[data-tempo-edicao]');
    if (estado.modo === 'video' && estado.tira) linhaEl.querySelector('[data-tira]')?.append(estado.tira);
    textos.agulha = '';
    ativoAntes = null;
    ligarAgulha();
    ligarMomentos();
    if (entrar) setTimeout(() => linhaEl.querySelector('[data-fonte]')?.classList.remove('entra'), 1500);
  }

  function replanejar({ remontarTela = true, entrar = false } = {}) {
    estado.plano = planejar(estado.segundos, estado.momentos);
    estado.linha = linhaDoTempo(estado.plano, { comMarca: estado.comMarca });
    estado.trocas = trocasDevagar(estado.linha);
    if (estado.t > estado.linha.total) estado.t = 0;
    if (solo() && estado.ver >= estado.linha.cortes.length) estado.ver = 'tudo';
    if (estado.ver === 'devagar' && !estado.trocas.length) estado.ver = 'tudo';
    estado.dv.i = Math.min(estado.dv.i, Math.max(0, estado.trocas.length - 1));
    if (remontarTela) montarTela();
    montarLinha({ entrar });
    marcarVer();
    prepararVideos();
    desenhar();
  }

  // ---- desenhar um quadro ----
  const ultimoValor = new WeakMap();
  const por = (el, prop, valor) => {
    if (!el) return;
    const m = ultimoValor.get(el) ?? {};
    if (m[prop] === valor) return;
    m[prop] = valor;
    ultimoValor.set(el, m);
    if (prop.startsWith('--')) el.style.setProperty(prop, valor); else el.style[prop] = valor;
  };
  const escrever = (el, chave, texto) => { if (el && textos[chave] !== texto) { textos[chave] = texto; el.textContent = texto; } };
  function quadroAgora() {
    const L = estado.linha;
    return solo() ? quadroDoCorte(L, estado.ver, estado.tl, { titulo: true, frase: true }) : quadroEm(L, estado.t, { titulo: true, frase: true });
  }
  function desenhar() {
    const L = estado.linha;
    const q = quadroAgora();
    let forca = 0;
    q.cortes.forEach((c, i) => {
      const el = camadas[i];
      if (!el) return;
      por(el, 'visibility', c.visivel ? 'visible' : 'hidden');
      if (!c.visivel) return;
      por(el, 'opacity', String(c.opacidade));
      por(el, 'transform', c.desloca ? `translate3d(0, ${(c.desloca * 100).toFixed(2)}%, 0)` : 'none');
      por(el, 'filter', c.borrao > 0.002 ? 'url(#borrao-video)' : 'none');
      por(zooms[i], 'transform', `scale(${c.zoom})`);
      por(el, '--tf', (c.tl * L.cortes[i].velocidade).toFixed(3));
      forca = Math.max(forca, c.borrao);
    });
    if (desfoque && forca > 0.002) desfoque.setAttribute('stdDeviation', `${(0.144 * tela.clientWidth * forca).toFixed(1)} 0`);
    if (nomeEl) { por(nomeEl, 'opacity', String(q.titulo?.opacidade ?? 0)); por(nomeEl, '--sobe', String(q.titulo?.sobe ?? 1)); }
    if (fraseEl) { por(fraseEl, 'opacity', String(q.frase?.opacidade ?? 0)); por(fraseEl, '--sobe', String(q.frase?.sobe ?? 1)); }
    por(seloEl, 'opacity', String(q.selo));
    por(fimEl, 'opacity', String(q.fim));
    por(fimZoom, 'transform', `scale(${q.zoomFim})`);
    por(brancoEl, 'opacity', String(q.branco));
    por(pretoEl, 'opacity', String(q.preto));
    if (estado.modo === 'video') sincronizar(q);

    // a agulha e o tempo
    const t = q.t;
    if (agulha) por(agulha, '--x', String(n2(t)));
    const txt = segundosEmTexto(t);
    if (textos.agulha !== txt) {
      textos.agulha = txt;
      if (agulhaTempo) agulhaTempo.textContent = txt;
      if (tempoEl) tempoEl.textContent = `${txt} de ${segundosEmTexto(L.total)}`;
      if (agulha) { agulha.setAttribute('aria-valuenow', String(n2(t))); agulha.setAttribute('aria-valuetext', txt); }
    }
    // os cortes acendem quando a agulha passa por eles, e a velocidade rola até a do corte
    const ativo = q.ativo;
    if (ativo !== ativoAntes) {
      const primeiro = ativoAntes === null;
      for (const b of blocos) {
        const sim = String(ativo) === b.dataset.ir;
        b.classList.toggle('agora', sim);
        if (sim && !primeiro && !pedeMenos()) { b.classList.remove('acendeu'); void b.offsetWidth; b.classList.add('acendeu'); }
      }
      janelas.forEach((j, i) => j.classList.toggle('agora', ativo === i));
      // o final com a logo anda na velocidade normal (1x)
      animarNumero(numVel, typeof ativo === 'number' ? L.cortes[ativo].velocidade : 1, { formato: velocidadeEmTexto, ms: primeiro ? 0 : 450 });
      const c = typeof ativo === 'number' ? L.cortes[ativo] : null;
      const r = c ? ROTULOS[c.zoom] : null;
      const rot = ativo === 'fim' ? 'Final com a logo' : r ? `${ativo + 1} · ${r.nome}` : '';
      if (agoraEl && agoraEl.textContent !== rot) agoraEl.textContent = rot;
      ativoAntes = ativo;
    }
    const z = typeof ativo === 'number' ? q.cortes[ativo].zoom : q.zoomFim;
    escrever(numZoom, 'zoom', zoomEmTexto(z));
    // o tempo do painel: na edição, no corte (em loop) ou na troca (devagar)
    const troca = trocaAtual();
    let tempo, progresso;
    if (troca) {
      const dentro = limitar(estado.t - troca.de, 0, troca.dura);
      tempo = `${centesimos(dentro)} de ${centesimos(troca.dura)} s`;
      progresso = dentro / troca.dura;
    } else if (solo()) {
      const c = L.cortes[estado.ver];
      tempo = `${segundosEmTexto(Math.min(estado.tl, c.saida)).replace(' s', '')} de ${segundosEmTexto(c.saida)}`;
      progresso = Math.min(estado.tl, c.saida) / c.saida;
    } else {
      tempo = `${segundosEmTexto(t).replace(' s', '')} de ${segundosEmTexto(L.total)}`;
      progresso = t / L.total;
    }
    escrever(numTempo, 'tempo', tempo);
    if (modoBarra) por(modoBarra, '--p', `${(limitar(progresso, 0, 1) * 100).toFixed(1)}%`);
    juntas.forEach((j, i) => j.classList.toggle('lenta', Boolean(troca) && troca.n - 1 === i));
    // a tira do vídeo da pessoa: de onde sai o quadro de agora
    const atual = typeof ativo === 'number' ? q.cortes[ativo] : null;
    if (cabecaFonte) {
      cabecaFonte.hidden = !atual || !atual.visivel;
      if (atual) por(cabecaFonte, 'left', `${((atual.fonte / estado.segundos) * 100).toFixed(2)}%`);
    }
  }

  // ---- o painel: o que a pessoa está vendo (a edição, um corte em loop, as trocas devagar) ----
  function marcarVer() {
    const v = estado.ver;
    for (const b of chipsVer) b.setAttribute('aria-pressed', String(b.dataset.ver === String(v)));
    for (const b of chipsVer) {
      const n = Number(b.dataset.ver);
      if (Number.isInteger(n)) b.hidden = n >= (estado.linha?.cortes.length ?? 3);
      if (b.dataset.ver === 'devagar') b.hidden = !estado.trocas.length;
    }
    if (modo) modo.dataset.jeito = solo() ? 'corte' : v;
    raiz.classList.toggle('vendo-devagar', v === 'devagar');
    if (ritmoEl) ritmoEl.hidden = v !== 'devagar';
    blocos.forEach((b) => b.classList.toggle('solo', String(v) === b.dataset.ir));
    janelas.forEach((j, i) => j.classList.toggle('solo', v === i));
    let titulo;
    let diz;
    if (solo()) {
      const c = estado.linha.cortes[v];
      const e = EFEITOS[c.zoom];
      titulo = `${v + 1} · ${e.nome}, em loop`;
      diz = e.diz;
    } else if (v === 'devagar') {
      const tr = trocaAtual();
      titulo = tr ? `Troca ${tr.n} de ${tr.quantas}: ${tr.nome}` : 'As trocas devagar';
      diz = tr ? `${tr.diz} Aqui, 4x mais devagar: ${centesimos(tr.dura)} s viram ${centesimos(tr.real)} s.` : '';
    } else ({ titulo, diz } = VER_TUDO);
    escrever(modoTitulo, 'titulo', titulo);
    escrever(modoDiz, 'diz', diz);
    escrever(numTempoRot, 'rotulo', ROTULO_DO_TEMPO[solo() ? 'corte' : v] ?? ROTULO_DO_TEMPO.tudo);
  }

  /** Muda o jeito de ver: 'tudo' (a edição inteira), o número de um corte (sozinho, em loop) ou 'devagar'. */
  function mudarVer(v, { tocarJa = true } = {}) {
    if (solo() && v !== estado.ver) estado.t = quadroAgora().t; // a agulha continua de onde o corte estava
    if (v === 'devagar') {
      if (!estado.trocas.length) return;
      estado.ver = 'devagar';
      estado.dv = { i: 0, espera: 0 };
      estado.t = estado.trocas[0].mostraDe;
    } else if (typeof v === 'number' && estado.linha.cortes[v]) {
      estado.ver = v;
      estado.tl = 0;
    } else estado.ver = 'tudo';
    marcarVer();
    prepararVideos();
    if (tocarJa) { estado.pessoaPausou = false; tocar(); } else desenhar();
  }
  for (const b of chipsVer) b.addEventListener('click', () => mudarVer(b.dataset.ver === 'tudo' || b.dataset.ver === 'devagar' ? b.dataset.ver : Number(b.dataset.ver)));
  // os cartões dos 3 cortes, lá embaixo: "ver na mesa" põe o corte sozinho no monitor
  for (const b of doc.querySelectorAll('[data-ver-corte]')) {
    b.addEventListener('click', () => {
      mudarVer(Number(b.dataset.verCorte));
      const caixa = tela.getBoundingClientRect();
      if (caixa.top < 0 || caixa.bottom > innerHeight) tela.scrollIntoView({ behavior: pedeMenos() ? 'auto' : 'smooth', block: 'center' });
    });
  }

  // ---- o vídeo da pessoa: cada corte toca o pedaço dele, na velocidade dele ----
  function prepararVideos() {
    if (estado.modo !== 'video') return;
    const q = quadroAgora();
    estado.linha.cortes.forEach((c, i) => {
      const v = videos[i];
      if (!v) return;
      const alvo = q.cortes[i].visivel ? q.cortes[i].fonte : c.de;
      try { v.pause(); v.currentTime = alvo; } catch { /* o vídeo ainda não abriu */ }
    });
  }
  function desenharFundo(v, canvas) {
    if (!canvas || !v.videoWidth || v.readyState < 2) return;
    const deitado = v.videoWidth / v.videoHeight > 0.6;
    canvas.hidden = !deitado;
    if (!deitado) return;
    const ctx = canvas.getContext('2d');
    const escala = Math.max(canvas.width / v.videoWidth, canvas.height / v.videoHeight);
    const w = canvas.width / escala, h = canvas.height / escala;
    try { ctx.drawImage(v, (v.videoWidth - w) / 2, (v.videoHeight - h) / 2, w, h, 0, 0, canvas.width, canvas.height); } catch { /* quadro ainda não chegou */ }
  }
  function sincronizar(q) {
    // tocando no ritmo normal, o vídeo anda sozinho; devagar, parado ou com a agulha, ele vai quadro a quadro
    const anda = estado.tocando && estado.ver !== 'devagar';
    estado.linha.cortes.forEach((c, i) => {
      const v = videos[i];
      const s = q.cortes[i];
      if (!v) return;
      if (s.visivel && anda) {
        if (v.playbackRate !== c.velocidade) v.playbackRate = c.velocidade;
        if (!v.seeking && Math.abs(v.currentTime - s.fonte) > 0.25) v.currentTime = s.fonte;
        const mudo = !estado.som;
        if (v.muted !== mudo) v.muted = mudo;
        if (!mudo) { try { v.volume = limitar(s.volume, 0, 1); } catch { /* sem volume no iPhone */ } }
        if (v.paused) v.play().catch(() => {});
      } else {
        if (!v.paused) v.pause();
        if (!v.muted) v.muted = true;
        const alvo = s.visivel ? s.fonte : c.de;
        if (!v.seeking && Math.abs(v.currentTime - alvo) > (anda ? 0.3 : 0.04)) v.currentTime = alvo;
      }
      if (s.visivel) desenharFundo(v, fundos[i]);
    });
  }

  // ---- tocar, pausar e o laço ----
  function avancarDevagar(dt) {
    const lista = estado.trocas;
    if (!lista.length) { mudarVer('tudo'); return; }
    const tr = lista[estado.dv.i] ?? lista[0];
    if (estado.dv.espera > 0) {
      estado.dv.espera -= dt;
      if (estado.dv.espera <= 0) {
        estado.dv.i = (estado.dv.i + 1) % lista.length;
        estado.t = lista[estado.dv.i].mostraDe;
        marcarVer();
        prepararVideos();
      }
      return;
    }
    const antes = estado.t;
    estado.t = Math.min(tr.mostraAte, estado.t + dt * RITMO_DEVAGAR);
    tocarSons(antes, estado.t, RITMO_DEVAGAR);
    if (estado.t >= tr.mostraAte) estado.dv.espera = 0.8; // uma pausinha antes da próxima troca
  }
  function laco(agora) {
    raf = 0;
    if (!estado.tocando) return;
    if (ultimo === null) ultimo = agora;
    const dt = Math.min(0.1, (agora - ultimo) / 1000);
    ultimo = agora;
    if (solo()) {
      const c = estado.linha.cortes[estado.ver];
      estado.tl += dt;
      if (estado.tl >= c.saida + 0.35) { estado.tl = 0; prepararVideos(); } // o laço recomeça (com uma pausinha no fim)
    } else if (estado.ver === 'devagar') {
      avancarDevagar(dt);
    } else {
      const antes = estado.t;
      estado.t += dt;
      const fimDoLaco = estado.linha.total + (estado.linha.comMarca ? 0.9 : 0.5);
      if (estado.t >= fimDoLaco) { estado.t = 0; prepararVideos(); } else tocarSons(antes, estado.t, 1);
    }
    desenhar();
    raf = requestAnimationFrame(laco);
  }
  function mostrarBotao() {
    if (!botaoTocar) return;
    botaoTocar.setAttribute('aria-label', estado.tocando ? 'Pausar a prévia' : 'Tocar a prévia');
    botaoTocar.classList.toggle('tocando', estado.tocando);
  }
  function tocar() {
    if (estado.tocando) return;
    estado.tocando = true;
    ultimo = null;
    if (estado.ver === 'tudo' && estado.t >= estado.linha.total) { estado.t = 0; prepararVideos(); }
    raf = requestAnimationFrame(laco);
    mostrarBotao();
  }
  function pausar() {
    estado.tocando = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    for (const v of videos) { v.pause(); v.muted = true; }
    mostrarBotao();
    desenhar();
  }
  botaoTocar?.addEventListener('click', () => { if (estado.tocando) { estado.pessoaPausou = true; pausar(); } else { estado.pessoaPausou = false; tocar(); } });
  tela.addEventListener('click', () => botaoTocar?.click());

  // ---- 1. a agulha: arrastar (o dedo ou o mouse), tocar na linha, ou as setas ----
  /** A prévia para no quadro do instante `t` (quem mexe na agulha manda: ela só volta a tocar no botão). */
  function fixar(t, { som = true } = {}) {
    if (estado.ver !== 'tudo') mudarVer('tudo', { tocarJa: false });
    estado.pessoaPausou = true;
    if (estado.tocando) pausar();
    const antes = estado.t;
    estado.t = limitar(t, 0, estado.linha.total);
    if (som) somDaAgulha(antes, estado.t);
    prepararVideos();
    desenhar();
  }
  const tempoDoX = (x) => {
    const caixa = (trilhoEdicao ?? edicaoEl)?.getBoundingClientRect();
    return caixa ? ((x - caixa.left) / (caixa.width || 1)) * estado.linha.total : 0;
  };
  function irPeloBloco(ir) {
    if (ir === 'fim') { mudarVer('tudo', { tocarJa: false }); estado.t = Math.max(0, estado.linha.fimDe - 0.3); prepararVideos(); estado.pessoaPausou = false; tocar(); return; }
    mudarVer(Number(ir));
  }
  function ligarAgulha() {
    if (!edicaoEl) return;
    let ini = null;
    pegar(edicaoEl, {
      eixo: 'x', // o dedo que sobe e desce ainda rola a página; o que anda de lado move a agulha
      aoComecar: ({ ev }) => { ini = { alvo: ev.target.closest?.('[data-ir]') ?? null, moveu: false }; },
      aoMover: ({ x, dx }) => {
        if (!ini) return;
        if (!ini.moveu && Math.abs(dx) < 6) return;
        ini.moveu = true;
        edicaoEl.classList.add('arrastando');
        fixar(tempoDoX(x));
      },
      aoSoltar: ({ x, cancelou }) => {
        const i = ini;
        ini = null;
        edicaoEl.classList.remove('arrastando');
        if (!i || i.moveu || cancelou) return;
        // um toque: no corte, ele toca sozinho em loop; na régua ou no vazio, a agulha vai até ali
        if (i.alvo) irPeloBloco(i.alvo.dataset.ir); else fixar(tempoDoX(x));
      },
    });
  }
  linhaEl?.addEventListener('keydown', (ev) => {
    const alvoAgulha = ev.target.closest?.('[data-agulha]');
    const pino = ev.target.closest?.('button[data-momento]');
    if (alvoAgulha) {
      const novo = passoDaAgulha(quadroAgora().t, ev.key, ev.shiftKey, estado.linha.total);
      if (novo === null) return;
      ev.preventDefault();
      fixar(novo);
    } else if (pino) {
      const k = Number(pino.dataset.momento);
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); mudarVer(k); return; }
      const novo = passoDaAgulha(estado.momentos[MOMENTOS[k].chave], ev.key, ev.shiftKey, estado.segundos);
      if (novo === null) return;
      ev.preventDefault();
      moverMomento(k, novo);
    }
  });
  // os cortes e as janelas da tira: pelo teclado (Enter) e, na tira, pelo toque; o toque na linha da edição vem pelo "pegar"
  linhaEl?.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('[data-ir]');
    if (!alvo) return;
    if (alvo.closest('[data-edicao]') && ev.detail !== 0) return;
    irPeloBloco(alvo.dataset.ir);
  });

  // ---- 4. os 3 momentos do vídeo da pessoa: ela arrasta, e o plano se refaz pelo planejar() do robô ----
  function atualizarFonte() {
    const L = estado.linha;
    janelas.forEach((j, i) => {
      const c = L.cortes[i];
      if (!c) return;
      j.style.setProperty('--de', String(c.de));
      j.style.setProperty('--ate', String(n2(c.de + c.dura)));
    });
    pinos.forEach((p) => {
      const k = Number(p.dataset.momento);
      const t = n2(estado.momentos[MOMENTOS[k].chave]);
      p.style.setProperty('--m', String(t));
      p.setAttribute('aria-valuenow', String(t));
      p.setAttribute('aria-valuetext', segundosEmTexto(t));
      const rot = p.querySelector('[data-momento-tempo]');
      if (rot) rot.textContent = `${segundosEmTexto(t)} · ${Math.round((t / estado.segundos) * 100)}%`;
    });
  }
  function moverMomento(k, t) {
    estado.momentos = { ...estado.momentos, [MOMENTOS[k].chave]: limitar(t, 0, estado.segundos) };
    estado.plano = planejar(estado.segundos, estado.momentos);
    estado.linha = linhaDoTempo(estado.plano, { comMarca: estado.comMarca });
    estado.trocas = trocasDevagar(estado.linha);
    atualizarFonte();
    // o monitor mostra o quadro do momento, parado no corte dele
    estado.ver = k;
    estado.tl = tempoDoMomento(estado.linha.cortes[k], estado.momentos[MOMENTOS[k].chave]);
    marcarVer();
    estado.pessoaPausou = true;
    if (estado.tocando) pausar();
    prepararVideos();
    desenhar();
  }
  function ligarMomentos() {
    for (const p of pinos) {
      const k = Number(p.dataset.momento);
      pegar(p, {
        eixo: 'x',
        aoComecar: () => { p.classList.add('mexendo'); fonteTrilho?.closest('[data-fonte]')?.classList.add('mexendo'); },
        aoMover: ({ x, dx }) => { if (Math.abs(dx) >= 2) moverMomento(k, momentoDoX(x, fonteTrilho.getBoundingClientRect(), estado.segundos)); },
        aoSoltar: () => {
          p.classList.remove('mexendo');
          fonteTrilho?.closest('[data-fonte]')?.classList.remove('mexendo');
          mudarVer(k); // o corte novo toca sozinho, em loop
        },
      });
    }
  }

  // ---- 5. o som (só se a pessoa ligar) ----
  function tocarSom(tipo, ritmo = 1) {
    if (!estado.som || !audio) return;
    if (tipo === 'whoosh') tocarWhoosh(audio, ruido, ritmo); else tocarBatida(audio);
  }
  function tocarSons(de, ate, ritmo) {
    if (!estado.som || !audio) return;
    for (const e of cruzou(eventosDeSom(estado.linha), de, ate)) if (de < ate) tocarSom(e.tipo, ritmo);
  }
  // a agulha arrastada por uma troca: o whoosh vai junto (pros dois lados), sem empilhar som
  function somDaAgulha(de, ate) {
    if (!estado.som || !audio) return;
    const agora = performance.now();
    if (agora - ultimoSom < 90) return;
    const lista = cruzou(eventosDeSom(estado.linha), de, ate);
    if (!lista.length) return;
    ultimoSom = agora;
    tocarSom(lista[0].tipo);
  }
  botaoSom?.addEventListener('click', () => {
    estado.som = !estado.som;
    botaoSom.setAttribute('aria-pressed', String(estado.som));
    botaoSom.setAttribute('aria-label', estado.som ? 'Desligar o som' : 'Ligar o som');
    if (estado.som) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!audio && Ctx) { audio = new Ctx(); ruido = ruidoRosa(audio); }
        audio?.resume?.();
      } catch { audio = null; }
      estado.pessoaPausou = false;
      tocar();
    }
    desenhar();
  });

  // ---- os ajustes: a versão, o nome e a frase ----
  for (const b of chipsVersao) {
    b.addEventListener('click', () => {
      for (const x of chipsVersao) x.setAttribute('aria-pressed', String(x === b));
      estado.comMarca = b.dataset.versao === 'marca';
      if (solo()) estado.t = quadroAgora().t;
      estado.ver = 'tudo';
      replanejar({ remontarTela: false });
      // com a marca, a prévia vai até o final com a logo; sem, até o fim do vídeo
      estado.t = Math.max(0, (estado.comMarca ? estado.linha.fimDe : estado.linha.clipe) - 1.2);
      prepararVideos();
      estado.pessoaPausou = false;
      tocar();
    });
  }
  entradaNome?.addEventListener('input', () => {
    estado.nome = entradaNome.value;
    const alvo = tela.querySelector('[data-nome-tela]');
    if (alvo) alvo.textContent = nome();
    // mostra o nome na hora: o 1º corte em loop, com o nome subindo
    if (estado.ver !== 0 || estado.tl > 2.4) mudarVer(0);
  });
  escolhaEstilo?.addEventListener('change', () => {
    estado.estilo = escolhaEstilo.value;
    if (fraseEl) fraseEl.textContent = frase();
    // a frase entra no último corte: ele toca sozinho, em loop
    const i = ondeFrase(estado.linha.cortes.length, true);
    if (i >= 0) mudarVer(i);
  });

  // ---- o vídeo da pessoa: abre aqui, nunca sai do aparelho ----
  async function fazerTira(url, dur) {
    const n = 10;
    const tira = document.createElement('canvas');
    tira.width = n * 48;
    tira.height = 64;
    tira.className = 'tira-quadros';
    estado.tira = tira;
    linhaEl?.querySelector('[data-tira]')?.append(tira);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    try { await umaVez(v, 'loadeddata', 8000); } catch { return; }
    const ctx = tira.getContext('2d');
    for (let k = 0; k < n; k++) {
      if (estado.url !== url) return;
      try { v.currentTime = Math.min(dur - 0.05, ((k + 0.5) * dur) / n); await umaVez(v, 'seeked', 3000); } catch { continue; }
      const escala = Math.max(48 / v.videoWidth, 64 / v.videoHeight);
      const w = 48 / escala, h = 64 / escala;
      try { ctx.drawImage(v, (v.videoWidth - w) / 2, (v.videoHeight - h) / 2, w, h, k * 48, 0, 48, 64); } catch { /* quadro ainda não chegou */ }
    }
    v.removeAttribute('src');
    v.load();
  }
  async function abrirVideo(arquivo) {
    if (!arquivo) return;
    if (arquivo.type && !arquivo.type.startsWith('video/')) { avisar('Esse arquivo não é um vídeo. Escolha um vídeo do produto (MP4 ou MOV).', true); return; }
    const url = URL.createObjectURL(arquivo);
    const sonda = document.createElement('video');
    sonda.muted = true; sonda.preload = 'metadata'; sonda.src = url;
    avisar('Abrindo o seu vídeo aqui no aparelho…');
    try { await umaVez(sonda, 'loadedmetadata', 10000); } catch {
      URL.revokeObjectURL(url);
      avisar('Esse vídeo não abriu aqui. Tente outro, em MP4 ou MOV.', true);
      return;
    }
    const dur = sonda.duration;
    if (!Number.isFinite(dur) || dur < 1.5) {
      URL.revokeObjectURL(url);
      avisar(Number.isFinite(dur) ? 'Esse vídeo é curto demais: o robô precisa de pelo menos 1,5 segundo.' : 'Não deu pra ler o tempo desse vídeo. Tente outro, em MP4 ou MOV.', true);
      return;
    }
    pausar();
    if (estado.url) URL.revokeObjectURL(estado.url);
    estado.url = url;
    estado.modo = 'video';
    estado.segundos = dur;
    estado.momentos = momentosPadrao(dur); // os 3 momentos começam onde o robô põe sem a IA
    estado.tira = null;
    estado.t = 0;
    estado.ver = 'tudo';
    replanejar({ entrar: true });
    raiz.classList.add('tem-video');
    if (tituloSoltar) tituloSoltar.textContent = 'Trocar o vídeo';
    if (voltar) voltar.hidden = false;
    avisar(`Pronto: o seu vídeo (${segundosEmTexto(dur)}) abriu aqui, só no seu aparelho. Arraste os 3 momentos na tira.`);
    // escolheu lá embaixo: a mesa volta pra tela
    const caixa = tela.getBoundingClientRect();
    if (caixa.bottom < 0 || caixa.top > innerHeight) tela.scrollIntoView({ behavior: pedeMenos() ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => { estourarEm(linhaEl?.querySelector('[data-momentos]') ?? tela, { quantos: 14, raio: 70 }); vibrar(14); }, pedeMenos() ? 0 : 700);
    // cada corte espera o vídeo abrir e ir pro pedaço dele (só espera o "seeked" quem está mesmo procurando)
    await Promise.allSettled(videos.map((v) => (v.readyState >= 2 ? Promise.resolve() : umaVez(v, 'loadeddata', 6000))));
    if (estado.url !== url) return; // trocou de vídeo no meio
    prepararVideos();
    await Promise.allSettled(videos.map((v) => (v.seeking ? umaVez(v, 'seeked', 3000) : Promise.resolve())));
    if (estado.url !== url) return;
    estado.pessoaPausou = false;
    tocar();
    fazerTira(url, dur);
  }
  function voltarProExemplo() {
    pausar();
    if (estado.url) URL.revokeObjectURL(estado.url);
    estado.url = null;
    estado.modo = 'exemplo';
    estado.segundos = DEMO_SEGUNDOS;
    estado.momentos = momentosPadrao(DEMO_SEGUNDOS);
    estado.tira = null;
    estado.t = 0;
    estado.ver = 'tudo';
    raiz.classList.remove('tem-video');
    if (tituloSoltar) tituloSoltar.textContent = TITULO_SOLTAR;
    if (voltar) voltar.hidden = true;
    if (entrada) entrada.value = '';
    avisar('');
    replanejar();
    tocar();
  }
  entrada?.addEventListener('change', () => abrirVideo(entrada.files?.[0]));
  for (const b of doc.querySelectorAll('[data-escolher]')) b.addEventListener('click', () => entrada?.click());
  voltar?.addEventListener('click', voltarProExemplo);
  // solte o vídeo em qualquer lugar da página (no computador)
  const temArquivo = (ev) => Array.from(ev.dataTransfer?.types ?? []).includes('Files');
  let dentro = 0;
  const mostrarSolte = (sim) => { if (solte) solte.hidden = !sim; soltar?.classList.toggle('arrastando', sim); };
  doc.addEventListener('dragenter', (ev) => { if (!temArquivo(ev)) return; ev.preventDefault(); dentro++; mostrarSolte(true); });
  doc.addEventListener('dragover', (ev) => { if (!temArquivo(ev)) return; ev.preventDefault(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy'; });
  doc.addEventListener('dragleave', (ev) => { if (!temArquivo(ev)) return; dentro = Math.max(0, dentro - 1); if (!dentro) mostrarSolte(false); });
  doc.addEventListener('drop', (ev) => {
    if (!temArquivo(ev)) return;
    ev.preventDefault();
    dentro = 0;
    mostrarSolte(false);
    abrirVideo(ev.dataTransfer?.files?.[0]);
  });
  addEventListener('pagehide', () => { if (estado.url) URL.revokeObjectURL(estado.url); });

  // ---- começa: o exemplo tocando quando a mesa aparece (parado para quem pediu menos movimento) ----
  replanejar();
  if (pedeMenos()) { estado.t = 1.3; desenhar(); mostrarBotao(); return; }
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        estado.visivel = e.isIntersecting;
        if (e.isIntersecting && !estado.pessoaPausou) tocar();
        else if (!e.isIntersecting && estado.tocando) pausar();
      }
    }, { threshold: 0.2 }).observe(tela);
  } else tocar();
  mostrarBotao();
}

if (typeof document !== 'undefined') ligarMesa(document);
