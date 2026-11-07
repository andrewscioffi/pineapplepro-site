// AS PEÇAS VIVAS DA FERRAMENTA (v3, 07/11/2026, o Andrews: "eu quero que a interface seja altamente interativa").
// Elas mudam no lugar (sem desenhar a tela de novo), para a fatia, o giro e o item da lista andarem:
//   anelVivo     a pizza por dentro: o anel do custo, com o zoom na receita da casa e o "voltar"
//   pizzaViva    a pizza do meio a meio: tocar numa metade troca o sabor; arrastar gira (com inércia)
//   listaViva    a lista de compras: o item entra e sai com animação, e o número rola
//   ligarSegurar o + e o − que aceleram quando a pessoa segura
//   ligarBusca   a busca rápida (⌘K, Ctrl+K ou /)
//   ligarArrastos  arrastar da despensa para uma receita (no computador)
// Tudo usa o kit da v3 (../comum/interacao.js). Quem pediu menos movimento vê tudo funcionando, só que parado.
// Nada aqui faz conta de ficha: os números chegam prontos (comum/cozinha.js e a calculadora).
import { animarNumero, trocarConteudo, pedeMenosMovimento, pegar, suavizar, entre } from '../comum/interacao.js';
import { reais, pct, esc } from '../comum/ficha.js';
import * as D from './desenho.js';

const NS = 'http://www.w3.org/2000/svg';
const quadro = (f) => requestAnimationFrame(f);
const agora = () => performance.now();
const curto = (nome) => String(nome ?? '').replace(/\s*\([^)]*\)\s*$/, '');

// ---------- a pizza por dentro (o anel do custo) ----------

const aneis = new WeakMap();

/** O anel que já está ligado nessa caixa (ou null). */
export const anelExistente = (el) => {
  const c = aneis.get(el);
  return c && el.contains(c.raiz) ? c : null;
};

/** O anel da caixa `el` (cria na 1ª vez). `aoFocar(caminho)` guarda o zoom (para voltar igual depois de desenhar a tela). */
export function anelVivo(el, opcoes) {
  let c = aneis.get(el);
  if (!c || !el.contains(c.raiz)) {
    c = criarAnel(el, opcoes);
    aneis.set(el, c);
  }
  return c;
}

function criarAnel(el, { prefixo, foco: focoGuardado = null, aoFocar = () => {}, unidade: unidadeDeInicio = 'cada um' }) {
  let unidade = unidadeDeInicio; // (camadas a fundo) muda com o tamanho e a borda: "o custo de cada pizza broto"
  el.innerHTML = `<div class="anel-palco">
      <nav class="anel-trilha" aria-label="Onde você está"></nav>
      <div class="anel-quadro">
        <svg class="anel-svg" viewBox="0 0 320 320" aria-hidden="true" focusable="false"><g class="anel-fatias"></g><g class="anel-abre"></g></svg>
        <button type="button" class="anel-centro" tabindex="-1" aria-hidden="true"><span class="ac-nome"></span><b class="ac-valor"></b><small class="ac-pct"></small></button>
      </div>
      <p class="so-leitor" aria-live="polite" data-anel-fala></p>
    </div>`;
  const raiz = el.firstElementChild;
  const svg = raiz.querySelector('svg');
  const gFatias = svg.querySelector('.anel-fatias');
  const gAbre = svg.querySelector('.anel-abre');
  const trilha = raiz.querySelector('.anel-trilha');
  const centro = raiz.querySelector('.anel-centro');
  const [cNome, cValor, cPct] = centro.children;
  const fala = raiz.querySelector('[data-anel-fala]');
  const paths = new Map();
  let arvore = null;
  let fatias = [];
  let porCaminho = new Map();
  let foco = focoGuardado;
  let atual = { w0: 0, w1: D.VOLTA, n: 0 };
  let andando = 0;
  let aceso = null;
  let preso = null; // no toque: a fatia que a pessoa tocou fica acesa até tocar de novo
  let trilhaHtml = '';

  const visivel = (f) => {
    if (!f) return false;
    if (!foco) return true;
    return f.caminho === foco || f.caminho.startsWith(`${foco}/`);
  };

  function desenharFatias() {
    const vistos = new Set();
    for (const f of fatias) {
      vistos.add(f.caminho);
      const v = D.naJanela(f, atual);
      const [r0, r1] = D.raiosDoAnel(v.anel);
      const d = visivel(f) || andando ? D.arco(160, 160, r0, r1, v.a0, v.a1) : '';
      let p = paths.get(f.caminho);
      if (!p) {
        p = document.createElementNS(NS, 'path');
        p.dataset.c = f.caminho;
        gFatias.append(p);
        paths.set(f.caminho, p);
      }
      if (!d) { p.setAttribute('d', ''); p.style.display = 'none'; continue; }
      p.style.display = '';
      p.setAttribute('d', d);
      p.setAttribute('fill', f.nivel === 0 ? (D.COR_DO_GRUPO[f.grupo] ?? '#F9C748') : D.corDaFatia(f.grupo, f.k));
      p.setAttribute('fill-opacity', String(D.forcaDaFatia(v.anel)));
      p.setAttribute('class', `fatia${f.abre && f.caminho !== foco ? ' abre' : ''}${f.caminho === aceso ? ' acesa' : ''}${f.caminho === foco ? ' foco' : ''}`);
      if (f.caminho === aceso) {
        const m = D.meioDaFatia(0, 0, r0, r1, v.a0, v.a1);
        const sai = v.a1 - v.a0 >= D.VOLTA - 1e-6 ? 0 : 4;
        p.style.transform = `translate(${(m.dx * sai).toFixed(2)}px, ${(m.dy * sai).toFixed(2)}px)`;
      } else p.style.transform = '';
    }
    for (const [c, p] of paths) if (!vistos.has(c)) { p.remove(); paths.delete(c); }
    // o "+" das receitas que abrem (só parado, só onde cabe)
    gAbre.innerHTML = andando ? '' : fatias.filter((f) => f.abre && f.caminho !== foco && visivel(f)).map((f) => {
      const v = D.naJanela(f, atual);
      const [r0, r1] = D.raiosDoAnel(v.anel);
      if (v.anel < 1 || v.anel > 2.01 || v.a1 - v.a0 < 0.34 || r1 - r0 < 18) return '';
      const m = D.meioDaFatia(160, 160, r0, r1, v.a0, v.a1);
      return `<g class="anel-mais" transform="translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})"><circle r="8"/><path d="M-3.5 0h7M0 -3.5v7"/></g>`;
    }).join('');
    svg.classList.toggle('com-acesa', Boolean(aceso));
  }

  function mostrarCentro() {
    const f = aceso ? porCaminho.get(aceso) : foco ? porCaminho.get(foco) : null;
    const dono = foco ? porCaminho.get(foco) : null;
    let nome;
    let valor;
    let sub;
    if (!arvore) return;
    if (!f) {
      nome = curto(arvore.nome);
      valor = arvore.custo_c;
      sub = unidade;
    } else if (f === dono) {
      nome = f.nome;
      valor = f.custo_c;
      sub = `${pct(f.pct)} do custo · toque aqui pra voltar`;
    } else {
      nome = f.nome;
      valor = f.custo_c;
      const parte = dono && dono.custo_c > 0 ? `${pct(f.custo_c / dono.custo_c)} de ${curto(dono.nome).replace(/^Base: /, 'a base ')} · ` : '';
      sub = `${parte}${pct(f.pct)} do custo${f.abre ? ' · toque pra abrir' : ''}`;
    }
    cNome.textContent = nome;
    cPct.textContent = sub;
    animarNumero(cValor, valor / 100, { formato: (v) => reais(Math.round(v * 100)), ms: 260 });
    centro.classList.toggle('pode-voltar', Boolean(foco) && !aceso);
  }

  function desenharTrilha() {
    const passos = [];
    if (foco) {
      const partes = foco.split('/');
      for (let i = 1; i <= partes.length; i++) passos.push(partes.slice(0, i).join('/'));
    }
    const botao = (c, nome, atualAqui) => `<button type="button" class="anel-passo" data-anel-ir="${esc(c)}"${atualAqui ? ' aria-current="true"' : ''}>${esc(nome)}</button>`;
    const novo = (foco ? `<button type="button" class="botao-mini anel-voltar" data-anel-voltar><span aria-hidden="true">←</span> voltar</button>` : '')
      + `<span class="anel-caminho">${botao('', curto(arvore?.nome ?? ''), !foco)}${passos.map((c, i) => `<span class="anel-seta" aria-hidden="true">›</span>${botao(c, curto(porCaminho.get(c)?.nome ?? ''), i === passos.length - 1)}`).join('')}</span>`;
    if (trilhaHtml === novo) return;
    const tinhaFoco = trilha.contains(document.activeElement);
    trilhaHtml = novo;
    trilha.innerHTML = novo;
    // quem usa o teclado continua na trilha: no "voltar" (se ainda tem para onde voltar) ou no lugar de agora
    if (tinhaFoco) (trilha.querySelector('[data-anel-voltar]') ?? trilha.querySelector('[aria-current="true"]'))?.focus({ preventScroll: true });
  }

  function irPara(alvo) {
    cancelAnimationFrame(andando);
    const de = { ...atual };
    if (pedeMenosMovimento()) { atual = alvo; andando = 0; desenharFatias(); return; }
    const t0 = agora();
    const ms = 560;
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      atual = D.entreJanelas(de, alvo, suavizar(k));
      andando = k < 1 ? quadro(passo) : 0;
      desenharFatias();
    };
    andando = quadro(passo);
    setTimeout(() => { if (andando) { cancelAnimationFrame(andando); andando = 0; atual = alvo; desenharFatias(); } }, ms + 400);
  }

  function focar(c) {
    const novo = c && porCaminho.get(c)?.abre ? c : null;
    if (novo === foco) return;
    foco = novo;
    aceso = null;
    preso = null;
    irPara(D.janela(fatias, foco));
    desenharTrilha();
    mostrarCentro();
    aoFocar(foco);
    const f = foco ? porCaminho.get(foco) : null;
    fala.textContent = f ? `Abriu ${f.nome}: ${reais(f.custo_c)}, ${pct(f.pct)} do custo.` : `Voltou para ${curto(arvore?.nome ?? '')} inteira.`;
  }
  const subir = () => { if (foco) focar(porCaminho.get(foco)?.acima ?? null); };

  function acender(c) {
    const novo = c && visivel(porCaminho.get(c)) ? c : null;
    if (novo === aceso) return;
    aceso = novo;
    desenharFatias();
    mostrarCentro();
    for (const r of document.querySelectorAll('.no-aceso')) r.classList.remove('no-aceso');
    if (aceso) document.querySelector(`[data-no="${CSS.escape(`${prefixo}:${aceso}`)}"]`)?.classList.add('no-aceso');
  }

  const caminhoDo = (ev) => ev.target?.closest?.('[data-c]')?.dataset.c ?? null;
  svg.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse') acender(caminhoDo(ev)); });
  svg.addEventListener('pointerleave', () => acender(preso));
  svg.addEventListener('click', (ev) => {
    const c = caminhoDo(ev);
    if (!c) return;
    const f = porCaminho.get(c);
    if (c === foco) { subir(); return; }
    if (f?.abre) { focar(c); return; }
    preso = preso === c ? null : c; // a folha: no toque, fica acesa (o nome, o valor e a % no meio)
    acender(preso ?? c);
  });
  centro.addEventListener('click', () => { if (foco) subir(); else { preso = null; acender(null); } });
  trilha.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-anel-voltar]')) { subir(); return; }
    const b = ev.target.closest('[data-anel-ir]');
    if (b) focar(b.dataset.anelIr || null);
  });

  return {
    raiz,
    /** Troca a árvore (a conta mudou): as fatias vão para o tamanho novo, e o zoom continua onde estava. */
    atualizar(nova, { unidade: u } = {}) {
      if (u) unidade = u;
      arvore = nova;
      fatias = D.fatiasDoAnel(nova);
      porCaminho = new Map(fatias.map((f) => [f.caminho, f]));
      if (foco && !porCaminho.get(foco)?.abre) foco = null;
      if (aceso && !porCaminho.has(aceso)) aceso = null;
      if (!andando) atual = D.janela(fatias, foco);
      desenharFatias();
      desenharTrilha();
      mostrarCentro();
    },
    /** A lista em texto acende a fatia (o mouse ou o foco do teclado na linha). */
    acenderDeFora(c) { if (!preso) acender(c); },
    focar,
  };
}

// ---------- a pizza do meio a meio ----------

const pizzas = new WeakMap();

/** A pizza da caixa `el` (o SVG já vem do editor: telas.js, pizzaSvg). Liga o toque, o arrasto e o teclado na 1ª vez. */
export function pizzaViva(el, opcoes) {
  const svg = el.querySelector('[data-pizza]');
  if (!svg) return { atualizar() {}, pulsar() {} };
  let c = pizzas.get(svg);
  if (!c) { c = criarPizza(svg, opcoes); pizzas.set(svg, c); }
  return c;
}

function criarPizza(svg, { giro: giroGuardado = 0, aoGirar = () => {}, aoTrocar = () => {} }) {
  const gGiro = svg.querySelector('[data-pz-giro]');
  const rotulos = [...svg.querySelectorAll('[data-rot]')];
  const metades = [...svg.querySelectorAll('[data-lado]')];
  const total = svg.querySelector('[data-pz-total]');
  let giro = giroGuardado;
  let solto = 0;
  let ini = null;
  const nomes = ['', ''];

  const aplicar = () => {
    gGiro.setAttribute('transform', `rotate(${giro.toFixed(2)} 140 140)`);
    for (const r of rotulos) {
      const [x, y] = r.dataset.xy.split(',');
      r.setAttribute('transform', `rotate(${(-giro).toFixed(2)} ${x} ${y})`);
    }
    aoGirar(giro);
  };
  aplicar();

  const caixa = () => {
    const r = svg.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, k: r.width / 280 };
  };
  const inercia = (w0) => {
    cancelAnimationFrame(solto);
    let w = Math.max(-1.6, Math.min(1.6, w0)); // graus por ms
    if (pedeMenosMovimento() || Math.abs(w) < 0.03) return;
    let t0 = agora();
    const passo = (t) => {
      const dt = Math.min(40, t - t0);
      t0 = t;
      giro += w * dt;
      w *= Math.pow(0.9962, dt);
      aplicar();
      solto = Math.abs(w) > 0.008 ? quadro(passo) : 0;
    };
    solto = quadro(passo);
  };
  const girarAte = (alvo) => {
    cancelAnimationFrame(solto);
    if (pedeMenosMovimento()) { giro = alvo; aplicar(); return; }
    const de = giro;
    const t0 = agora();
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / 320);
      giro = entre(de, alvo, suavizar(k));
      aplicar();
      solto = k < 1 ? quadro(passo) : 0;
    };
    solto = quadro(passo);
  };

  pegar(svg, {
    eixo: 'x', // o dedo que sobe e desce ainda rola a página; o que anda de lado (ou em volta) gira a pizza
    aoComecar: ({ x, y }) => {
      cancelAnimationFrame(solto);
      const c = caixa();
      ini = { ...c, a: D.anguloDoPonto(x, y, c.cx, c.cy), giro, moveu: false };
    },
    aoMover: ({ x, y, dx, dy }) => {
      if (!ini) return;
      if (!ini.moveu && Math.hypot(dx, dy) < 7) return;
      ini.moveu = true;
      svg.classList.add('girando');
      giro = ini.giro + D.giroEntre(ini.a, D.anguloDoPonto(x, y, ini.cx, ini.cy));
      aplicar();
    },
    aoSoltar: ({ x, y, vx, vy, cancelou }) => {
      const i = ini;
      ini = null;
      svg.classList.remove('girando');
      if (!i || cancelou) return;
      if (!i.moveu) {
        if (Math.hypot(x - i.cx, y - i.cy) <= 118 * i.k) aoTrocar(D.metadeDoPonto(x, y, i.cx, i.cy, giro));
        return;
      }
      inercia(D.velocidadeDoGiro(x, y, i.cx, i.cy, vx, vy));
    },
  });
  svg.addEventListener('keydown', (ev) => {
    const lado = ev.target.closest?.('[data-lado]')?.dataset.lado;
    if (lado === undefined) return;
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); aoTrocar(Number(lado)); }
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { ev.preventDefault(); girarAte(giro + (ev.key === 'ArrowRight' ? 15 : -15)); }
  });

  const escreverNome = (txt, lado, nome) => {
    if (nomes[lado] === nome) return;
    nomes[lado] = nome;
    const linhas = D.quebrarNome(nome, 10);
    const x = txt.getAttribute('x');
    const y0 = linhas.length > 1 ? 128 : 136;
    txt.innerHTML = linhas.map((l, i) => `<tspan x="${x}" y="${y0 + i * 14}">${esc(l)}</tspan>`).join('');
  };

  return {
    /** Os 2 lados: { cor, nome, custo_c } e o custo da pizza inteira. */
    atualizar({ lados, total_c }) {
      lados.forEach((l, i) => {
        const p = metades[i];
        p.style.fill = l.cor;
        p.setAttribute('aria-label', `Metade ${i + 1}: ${l.nome}, ${reais(l.custo_c)} de cobertura. Toque pra trocar o sabor.`);
        const r = rotulos[i];
        escreverNome(r.querySelector('.pz-nome'), i, l.nome);
        animarNumero(r.querySelector('.pz-custo'), l.custo_c / 100, { formato: (v) => `½ ${reais(Math.round(v * 100))}`, ms: 420 });
      });
      animarNumero(total, total_c / 100, { formato: (v) => reais(Math.round(v * 100)), ms: 420 });
    },
    /** A metade que trocou dá um pulinho. */
    pulsar(lado) {
      const p = metades[lado];
      if (!p || pedeMenosMovimento()) return;
      p.classList.remove('trocou');
      void p.getBoundingClientRect();
      p.classList.add('trocou');
      setTimeout(() => p.classList.remove('trocou'), 600);
    },
  };
}

// ---------- a lista de compras viva ----------

const html = new WeakMap();

function sair(el) {
  if (pedeMenosMovimento()) { el.remove(); return; }
  el.style.height = `${el.offsetHeight}px`;
  el.classList.add('sai');
  void el.offsetHeight;
  el.style.height = '0px';
  setTimeout(() => el.remove(), 420);
}

/**
 * A lista que se refaz no lugar: cada grupo (a categoria) e cada item têm a chave dele. O item novo entra (.entra), o que
 * saiu do plano sai encolhendo (.sai), o que ficou só troca os números (rolando). `linha(item)` → { classe, html }.
 */
export function listaViva(el, grupos, { linha, vazio = '' }) {
  const primeira = !el.dataset.viva;
  el.dataset.viva = '1';
  const anima = !primeira && !pedeMenosMovimento();
  const nada = el.querySelector(':scope > .vazio');
  if (!grupos.length) {
    if (!nada) el.insertAdjacentHTML('beforeend', `<p class="vazio">${esc(vazio)}</p>`);
    else nada.textContent = vazio;
  } else nada?.remove();
  const velhos = new Map([...el.querySelectorAll(':scope > [data-grupo]:not(.sai)')].map((s) => [s.dataset.grupo, s]));
  let antes = null;
  for (const g of grupos) {
    let sec = velhos.get(g.id);
    if (!sec) {
      sec = document.createElement('section');
      sec.className = `compras-grupo${anima ? ' entra' : ''}`;
      sec.dataset.grupo = g.id;
      sec.innerHTML = '<h3></h3><ul></ul>';
      if (anima) { const nova = sec; setTimeout(() => nova.classList.remove('entra'), 700); }
    }
    velhos.delete(g.id);
    sec.querySelector('h3').textContent = g.titulo;
    const lugar = antes ? antes.nextElementSibling : el.querySelector(':scope > [data-grupo]');
    if (sec !== lugar) el.insertBefore(sec, lugar);
    antes = sec;
    const ul = sec.querySelector('ul');
    const lis = new Map([...ul.children].filter((li) => !li.classList.contains('sai')).map((li) => [li.dataset.chave, li]));
    let prev = null;
    for (const it of g.itens) {
      const { classe, html: h } = linha(it);
      let li = lis.get(it.id);
      if (!li) {
        li = document.createElement('li');
        li.dataset.chave = it.id;
        li.innerHTML = h;
        li.className = `${classe}${anima ? ' entra' : ''}`;
        html.set(li, h);
        if (anima) { const novo = li; setTimeout(() => novo.classList.remove('entra'), 700); }
      } else {
        lis.delete(it.id);
        if (html.get(li) !== h) {
          const tinhaFoco = li.contains(document.activeElement);
          trocarConteudo(li, h);
          html.set(li, h);
          if (tinhaFoco) li.querySelector('input')?.focus({ preventScroll: true });
        }
        li.className = `${classe}${li.classList.contains('entra') ? ' entra' : ''}`;
      }
      const lugarLi = prev ? prev.nextElementSibling : ul.firstElementChild;
      if (li !== lugarLi) ul.insertBefore(li, lugarLi);
      prev = li;
    }
    for (const li of lis.values()) sair(li);
  }
  for (const sec of velhos.values()) sair(sec);
}

// ---------- o + e o − que aceleram ----------

/**
 * Segurar o + ou o − (button.pn[data-acao]) repete o passo cada vez mais rápido. O 1º passo é o clique de sempre; o
 * clique que vem depois de segurar não conta de novo. `aoPasso(botao, tamanho)` faz o passo.
 */
export function ligarSegurar(doc, { aoPasso }) {
  let tempo = 0;
  let alvo = null;
  let repetiu = false;
  const parar = () => { clearTimeout(tempo); tempo = 0; alvo?.classList.remove('segurando'); alvo = null; };
  doc.addEventListener('pointerdown', (ev) => {
    const b = ev.target.closest?.('button.pn[data-acao]');
    if (!b || (ev.button !== undefined && ev.button !== 0)) return;
    parar();
    alvo = b;
    repetiu = false;
    let n = 0;
    b.classList.add('segurando');
    const rodar = () => {
      const { espera, tamanho } = D.passoQueAcelera(n);
      tempo = setTimeout(() => {
        if (!alvo || !alvo.isConnected) { parar(); return; }
        n++;
        repetiu = true;
        aoPasso(alvo, tamanho);
        rodar();
      }, espera);
    };
    rodar();
  });
  for (const t of ['pointerup', 'pointercancel']) doc.addEventListener(t, parar);
  doc.addEventListener('pointerout', (ev) => { if (alvo && ev.target === alvo && !alvo.contains(ev.relatedTarget)) parar(); });
  doc.addEventListener('click', (ev) => {
    if (repetiu && ev.target.closest?.('button.pn')) { ev.stopImmediatePropagation(); ev.preventDefault(); }
    repetiu = false;
  }, true);
  window.addEventListener('blur', parar);
}

// ---------- a busca rápida ----------

/**
 * A busca (o <dialog> do index.html): digita, as setas escolhem, o Enter vai. `itens()` = a lista do que dá para achar
 * ({ nome, extra, tipoNome, detalhe }); `aoEscolher(item)` leva até ele.
 */
export function ligarBusca(dialogo, { itens, aoEscolher }) {
  const campo = dialogo.querySelector('[data-busca]');
  const lista = dialogo.querySelector('[data-busca-lista]');
  let achados = [];
  let sel = 0;
  const marcar = () => {
    for (const li of lista.querySelectorAll('[data-i]')) li.setAttribute('aria-selected', String(Number(li.dataset.i) === sel));
    if (achados.length) campo.setAttribute('aria-activedescendant', `busca-${sel}`); else campo.removeAttribute('aria-activedescendant');
    lista.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  };
  const desenhar = () => {
    achados = D.buscar(itens(), campo.value, 9);
    sel = Math.min(sel, Math.max(0, achados.length - 1));
    lista.innerHTML = achados.map((x, i) => `<li role="option" id="busca-${i}" data-i="${i}" aria-selected="false"><span class="bo-tipo t-${esc(x.tipo)}">${esc(x.tipoNome)}</span><b>${esc(x.nome)}</b>${x.detalhe ? `<small>${esc(x.detalhe)}</small>` : ''}</li>`).join('')
      || '<li class="busca-nada" role="presentation">Nada com esse nome na cozinha.</li>';
    marcar();
  };
  const escolher = (i) => {
    const x = achados[i];
    if (!x) return;
    dialogo.close();
    aoEscolher(x);
  };
  campo.addEventListener('input', () => { sel = 0; desenhar(); });
  campo.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (!achados.length) return;
      sel = (sel + (ev.key === 'ArrowDown' ? 1 : -1) + achados.length) % achados.length;
      marcar();
    } else if (ev.key === 'Enter') { ev.preventDefault(); escolher(sel); }
  });
  lista.addEventListener('pointermove', (ev) => {
    const li = ev.target.closest?.('[data-i]');
    if (li && Number(li.dataset.i) !== sel) { sel = Number(li.dataset.i); marcar(); }
  });
  lista.addEventListener('click', (ev) => { const li = ev.target.closest?.('[data-i]'); if (li) escolher(Number(li.dataset.i)); });
  dialogo.addEventListener('click', (ev) => { if (ev.target === dialogo) dialogo.close(); });
  return {
    abrir() {
      if (dialogo.open) { campo.select(); return; }
      campo.value = '';
      sel = 0;
      desenhar();
      dialogo.showModal();
      campo.focus();
    },
  };
}

// ---------- arrastar da despensa para uma receita ----------

/**
 * Cada [data-arrasta="id"] (a fileira da despensa nas receitas, só com mouse) vai arrastado até um [data-solta="caminho"]
 * (o cartão da receita). Ao soltar em cima: aoSoltar(id, caminho, alvo). Quem não usa mouse tem o "+ adicionar".
 */
export function ligarArrastos(raiz, { aoSoltar }) {
  for (const chip of raiz.querySelectorAll('[data-arrasta]:not([data-arrasta-ligado])')) {
    chip.dataset.arrastaLigado = '1';
    let fantasma = null;
    let alvo = null;
    const largar = () => {
      alvo?.classList.remove('alvo');
      alvo = null;
      fantasma?.remove();
      fantasma = null;
      chip.classList.remove('saiu');
      document.documentElement.classList.remove('arrastando');
    };
    pegar(chip, {
      aoMover: ({ x, y, dx, dy }) => {
        if (!fantasma) {
          if (Math.hypot(dx, dy) < 6) return;
          fantasma = chip.cloneNode(true);
          fantasma.removeAttribute('data-arrasta');
          fantasma.classList.add('fantasma');
          document.body.append(fantasma);
          chip.classList.add('saiu');
          document.documentElement.classList.add('arrastando');
        }
        fantasma.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        const sob = document.elementFromPoint(x, y)?.closest?.('[data-solta]') ?? null;
        if (sob !== alvo) { alvo?.classList.remove('alvo'); alvo = sob; alvo?.classList.add('alvo'); }
      },
      aoSoltar: ({ cancelou }) => {
        const a = alvo;
        const arrastou = Boolean(fantasma);
        largar();
        if (a && arrastou && !cancelou) aoSoltar(chip.dataset.arrasta, a.dataset.solta, a);
      },
    });
  }
}
