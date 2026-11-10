// O QUE AS 3 TELAS FAZEM SOZINHAS (07/11/2026)
//   1. o botão do Direct copia a frase (quem abre o Direct é o próprio link, até com o JavaScript desligado)
//   2. os preços entram na tela a partir do valores.js (nenhum HTML tem preço escrito)
//   3. os produtos trancados viram cartões borrados, só com o nome e o cadeado de abacaxi
//   4. a ficha de exemplo sai da calculadora de verdade, na hora
//   5. (v2) o vidro: o reflexo, a inclinação e o aparecer ao rolar (comum/vidro.js) e o cadeado 3D (comum/cadeado3d.js)
//   6. (v2) [data-so-aberto="id"] só aparece com o produto aberto; [data-so-trancado="id"] só com ele trancado
//   7. (v3) a interação (comum/interacao.js): o botão que vem atrás do mouse, a onda, o estouro quando a frase copia,
//      os números que rolam, as cenas da rolagem, a luz do cursor e a troca de página com o cartão virando o palco
import { PRODUTOS, FRASES, cadeadoSvg, COMPRA_PINE_COST } from './valores.js';
import { ligarVidro } from './comum/vidro.js';
import { ligarInteracao, estourarEm, vibrar, temMouse, pedeMenosMovimento } from './comum/interacao.js';

const AVISO_COPIOU = 'Frase copiada: é só colar no Direct';

/** Copia a frase. Se o navegador não deixar (o do Instagram, iPhone antigo, sem https), mostra a frase para copiar à mão. */
export async function copiarFrase(frase, { copiar, mostrar }) {
  const aMao = () => { mostrar(`Copie e cole no Direct: “${frase}”`); return 'mostrou'; };
  if (typeof copiar !== 'function') return aMao();
  let copiando;
  try { copiando = copiar(frase); } catch { return aMao(); } // começa ainda dentro do clique
  try {
    await copiando;
    mostrar(AVISO_COPIOU);
    return 'copiou';
  } catch {
    return aMao();
  }
}

/** Liga cada botão do Direct (a[data-frase]): o clique copia a frase e escreve o aviso logo depois do botão. */
export function ligarBotoes(doc, janela) {
  for (const a of doc.querySelectorAll('a[data-frase]')) {
    if (a.dataset.ligado) continue;
    a.dataset.ligado = '1';
    const frase = FRASES[a.dataset.frase];
    if (!frase) continue;
    a.addEventListener('click', () => {
      const aviso = a.closest('.acao')?.querySelector('[data-aviso]');
      const clip = janela.navigator?.clipboard;
      copiarFrase(frase, {
        copiar: clip?.writeText ? (t) => clip.writeText(t) : undefined,
        mostrar: (m) => { if (aviso) aviso.textContent = m; },
      }).then((r) => { if (r === 'copiou') { estourarEm(a); vibrar(12); } });
    });
  }
}

/** O texto do preço de um produto, ou null se ele estiver trancado (trancado nunca mostra preço). */
export function etiqueta(produto, qual) {
  if (!produto || produto.trancado) return null;
  return produto.precos?.[qual] ?? null;
}

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Os cartões dos trancados: borrados, só com o nome e o cadeado (sem preço, sem texto e sem botão do Direct).
 * Com `base` (o caminho até a raiz do site, ex.: "../"), o cartão inteiro abre a prévia do produto (v2, 07/11).
 */
export function cartoesTrancados(produtos = PRODUTOS, { jeito = 'cartao', base } = {}) {
  return produtos.filter((p) => p.trancado).map((p) => {
    const link = base !== undefined && p.pagina
      ? `<a class="tranca-link" href="${esc(base + p.pagina)}"><span class="so-leitor">${esc(p.nome)}: em breve, ver a prévia</span></a>`
      : '';
    return `<li class="trancado ${jeito} arte-${esc(p.id)}"><span class="arte" aria-hidden="true"><i></i><i></i><i></i></span><span class="tranca">${cadeadoSvg()}<b>${esc(p.nome)}</b><span class="so-leitor"> (trancado, em breve)</span></span>${link}</li>`;
  }).join('');
}

/** Os cartões dos que forem abertos depois (o Pine Cost tem o cartão dele no HTML): o nome, o preço e o botão. */
export function cartoesAbertos(produtos = PRODUTOS) {
  return produtos.filter((p) => !p.trancado && p.id !== 'pine-cost' && p.frase && FRASES[p.frase]).map((p) => {
    const preco = etiqueta(p, 'pacote') ?? etiqueta(p, 'gratis');
    return `<li class="aberto cartao"><h3>${esc(p.nome)}</h3>${p.o_que_e ? `<p>${esc(p.o_que_e)}</p>` : ''}${preco ? `<span class="etiqueta">${esc(preco)}</span>` : ''}
<div class="acao"><a class="botao" href="https://ig.me/m/pineapplepro_" target="_blank" rel="noopener" data-frase="${esc(p.frase)}">Chamar no Direct</a><p class="ou-mande">Ou mande: “${esc(FRASES[p.frase])}”</p><p class="aviso" data-aviso aria-live="polite"></p></div></li>`;
  }).join('');
}

/**
 * A VITRINE DE VIDRO (v2, a home): todos os produtos, cada um atrás do vidro.
 *   aberto: a arte nítida, o "aberto agora" e o preço; o cartão leva à página dele
 *   trancado: a arte fosca atrás do vidro, o cadeado 3D na frente e "em breve · ver a prévia" (sem preço, sem botão do Direct)
 * (v3, a vitrine viva) cada arte é o produto funcionando: a foto do celular vira a revitalizada, o vídeo corre a linha do
 * tempo, o Pine Club carimba, a logo se desenha, a postagem encaixa na semana e o cardápio digital enche o carrinho. Quem
 * anima é o estilo.css (com o mouse em cima, o foco do teclado ou, no celular, o cartão entrando na tela, pelo site.js).
 * Nada de comida desenhada: só luz, quadros, linhas e formas geométricas em SVG. A única foto é a da foto (07/11, o Andrews:
 * "a gente podia pôr exemplo real nosso"): um exemplo real, o antes e o depois (foto/img/exemplo-real/, sem o nome do lugar).
 */
export function vitrine(produtos = PRODUTOS, { base = '' } = {}) {
  const n = (v) => +v.toFixed(1);
  const coroa = (x, y) => `M${n(x - 4.5)} ${n(y + 3)}V${n(y - 2)}L${n(x - 2.2)} ${n(y + 0.4)}L${x} ${n(y - 4)}L${n(x + 2.2)} ${n(y + 0.4)}L${n(x + 4.5)} ${n(y - 2)}V${n(y + 3)}Z`;
  // a foto: um exemplo real. A foto do celular (o antes) vira a revitalizada (o depois), com a luz passando e o enquadramento
  // de cardápio; as cópias de 480 px (o cartão é pequeno) e só quando o cartão chega perto da tela (loading="lazy")
  const fotoReal = () => {
    const f = (lado) => esc(`${base}foto/img/exemplo-real/lanche-queijo-${lado}-p.jpg`);
    return '<span class="vit-f-quadro">'
      + `<img class="vit-f-antes" src="${f('antes')}" width="480" height="360" alt="Exemplo real, antes: um lanche de queijo, na foto do celular" loading="lazy" decoding="async" draggable="false">`
      + `<img class="vit-f-depois" src="${f('depois')}" width="480" height="480" alt="Exemplo real, depois: o mesmo lanche, na foto revitalizada" loading="lazy" decoding="async" draggable="false">`
      + '<i class="vit-f-luz"></i><i class="vit-f-cantos"></i>'
      + '<span class="vit-f-rot"><span class="vit-f-rot-antes">Antes</span><span class="vit-f-rot-depois">Depois</span></span></span>';
  };
  const ARTES = {
    // o vídeo: o quadro em pé troca de corte quando a agulha passa na linha do tempo (o zoom e o texto por cima)
    video: () => '<defs><clipPath id="vg-video-c"><rect x="58" y="6" width="44" height="78" rx="7"/></clipPath>'
      + '<linearGradient id="vg-video-1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#53391a"/><stop offset="1" stop-color="#1e160b"/></linearGradient>'
      + '<linearGradient id="vg-video-2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34431a"/><stop offset="1" stop-color="#121707"/></linearGradient>'
      + '<linearGradient id="vg-video-3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a2a12"/><stop offset="1" stop-color="#1e0f06"/></linearGradient></defs>'
      + '<g clip-path="url(#vg-video-c)"><g class="vit-v-c1"><rect x="58" y="6" width="44" height="78" fill="url(#vg-video-1)"/><circle cx="80" cy="50" r="11" fill="#f2d89c"/></g>'
      + '<g class="vit-v-c2"><rect x="58" y="6" width="44" height="78" fill="url(#vg-video-2)"/><circle class="vit-v-zoom" cx="80" cy="46" r="13" fill="#d6ec98"/></g>'
      + '<g class="vit-v-c3"><rect x="58" y="6" width="44" height="78" fill="url(#vg-video-3)"/><circle cx="80" cy="40" r="10" fill="#ffc39a"/><rect class="vit-v-texto" x="63" y="62" width="34" height="9" rx="3" fill="#f7f4ec"/></g></g>'
      + '<rect x="58.5" y="6.5" width="43" height="77" rx="6.5" fill="none" stroke="#a6e02e" stroke-opacity=".6"/>'
      + '<rect x="20" y="96" width="120" height="8" rx="4" fill="#f7f4ec" fill-opacity=".07"/><rect x="20" y="96" width="38" height="8" rx="3" fill="#F9C748"/>'
      + '<rect x="61" y="96" width="38" height="8" rx="3" fill="#a6e02e"/><rect x="102" y="96" width="38" height="8" rx="3" fill="#FF6B1A"/>'
      + '<g class="vit-v-cabeca"><path d="M20 89v22" stroke="#f7f4ec" stroke-width="1.6"/><circle cx="20" cy="89" r="3" fill="#f7f4ec"/></g>',
    // o Pine Club: o cartão do cliente ganha os selos, um de cada vez, até o presente
    'pine-club': () => {
      const vagas = [[34, 58], [64, 58], [94, 58], [124, 58], [34, 86], [64, 86], [94, 86]];
      return '<defs><linearGradient id="vg-club-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffdf7c"/><stop offset=".55" stop-color="#F9C748"/><stop offset="1" stop-color="#e0a628"/></linearGradient></defs>'
        + '<rect x="12" y="12" width="136" height="94" rx="13" fill="url(#vg-club-g)"/><rect x="12.5" y="12.5" width="135" height="93" rx="12.5" fill="none" stroke="#fff" stroke-opacity=".5"/>'
        + '<circle cx="29" cy="29" r="6.5" fill="#0b0906" fill-opacity=".85"/><rect x="41" y="24.5" width="44" height="4" rx="2" fill="#0b0906" fill-opacity=".6"/><rect x="41" y="31.5" width="28" height="3" rx="1.5" fill="#0b0906" fill-opacity=".3"/>'
        + `<g fill="none" stroke="#0b0906" stroke-opacity=".35" stroke-dasharray="2.4 2.6">${vagas.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10"/>`).join('')}<circle cx="124" cy="86" r="10"/></g>`
        + vagas.map(([x, y], k) => `<g class="vit-c-selo${k > 2 ? ' vit-c-novo' : ''}"${k > 2 ? ` style="--n:${k - 3}"` : ''}><circle cx="${x}" cy="${y}" r="9.5" fill="#0b0906"/><path d="${coroa(x, y)}" fill="#F9C748"/></g>`).join('')
        + '<g class="vit-c-presente"><rect x="114" y="76" width="20" height="20" rx="5" fill="#FF6B1A"/><path d="M124 76v20M114 84.5h20" stroke="#0b0906" stroke-width="2"/></g>';
    },
    // a logo e o cardápio: o traço da logo se desenha em vetor (com os pontos), e as linhas do cardápio entram
    marca: () => '<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="vit-m-traco" d="M80 16a28 28 0 1 1 0 56a28 28 0 1 1 0-56" stroke="#F9C748" stroke-width="3.5" pathLength="100"/>'
      + '<path class="vit-m-traco" d="M80 60C72.5 50 72.5 36 80 25C87.5 36 87.5 50 80 60Z" stroke="#f7f4ec" stroke-width="2.2" pathLength="100"/>'
      + '<path class="vit-m-traco" d="M80 60C70 57 62.5 49 61 38C70.5 41 77.5 49 80 60Z" stroke="#f7f4ec" stroke-width="2.2" pathLength="100"/>'
      + '<path class="vit-m-traco" d="M80 60C90 57 97.5 49 99 38C89.5 41 82.5 49 80 60Z" stroke="#f7f4ec" stroke-width="2.2" pathLength="100"/></g>'
      + '<g class="vit-m-nos" fill="#0b0906" stroke="#f7f4ec" stroke-width="1"><path d="M70 25H90" stroke-opacity=".55"/><circle cx="70" cy="25" r="1.8"/><circle cx="90" cy="25" r="1.8"/>'
      + '<rect x="78" y="23" width="4" height="4"/><rect x="78" y="58" width="4" height="4"/><rect x="59" y="36" width="4" height="4"/><rect x="97" y="36" width="4" height="4"/></g>'
      + `<g class="vit-m-cardapio">${[[88, 34], [98, 28], [108, 38]].map(([y, w], k) => `<g class="vit-m-linha" style="--n:${k}"><rect x="34" y="${y}" width="${w}" height="4" rx="2" fill="#f7f4ec"/><path d="M${34 + w + 4} ${y + 2.5}H114" stroke="#f7f4ec" stroke-opacity=".4" stroke-dasharray="1 3"/><rect x="118" y="${y - 0.5}" width="9" height="5" rx="2" fill="#F9C748"/></g>`).join('')}</g>`,
    // a postagem: o post aprovado cai no dia dele da semana, e o relógio anda
    postagem: () => {
      const cor = ['#d2852e', '#efe6d2', '', '#F9C748', '', '#a6e02e', '', '', '#5b4320', '#d2852e', '', '#efe6d2', '', '#F9C748', '#a6e02e', '', '#F9C748', '', '', '#d2852e', '#efe6d2'];
      const cel = cor.map((c, k) => {
        const x = n(11 + (k % 7) * 20.4);
        const y = 26 + Math.floor(k / 7) * 20;
        return c ? `<rect x="${x}" y="${y}" width="16" height="16" rx="4" fill="${c}"/>` : `<rect x="${x}" y="${y}" width="16" height="16" rx="4" fill="none" stroke="#f7f4ec" stroke-opacity=".28" stroke-dasharray="2 2"/>`;
      }).join('');
      return `<g fill="#f7f4ec" fill-opacity=".45">${Array.from({ length: 7 }, (_, k) => `<rect x="${n(16 + k * 20.4)}" y="16" width="6" height="3" rx="1.5"/>`).join('')}</g>${cel}`
        + '<g class="vit-p-novo"><rect x="72.2" y="46" width="16" height="16" rx="4" fill="#F9C748"/><path d="M76 54.5l3 3 6-6.5" fill="none" stroke="#0b0906" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>'
        + '<g fill="none" stroke-linecap="round"><circle cx="134" cy="98" r="11" stroke="#f7f4ec" stroke-opacity=".7" stroke-width="2"/><path class="vit-p-ponteiro" d="M134 98v-7" stroke="#F9C748" stroke-width="2"/></g>';
    },
    // o cardápio digital: o cliente toca no "+" e os itens pulam para o carrinho, que enche
    'cardapio-digital': () => {
      const linhas = [['#d2852e', 18], ['#efe6d2', 40], ['#a6e02e', 62]];
      return '<rect x="50" y="4" width="60" height="112" rx="12" fill="#17120b" stroke="#efe6d2" stroke-width="2.4"/><rect x="70" y="9" width="20" height="3" rx="1.5" fill="#efe6d2" fill-opacity=".4"/>'
        + linhas.map(([c, y]) => `<rect x="57" y="${y}" width="14" height="14" rx="3" fill="${c}"/><rect x="75" y="${y + 2}" width="16" height="3" rx="1.5" fill="#efe6d2" fill-opacity=".75"/><rect x="75" y="${y + 8}" width="10" height="3" rx="1.5" fill="#efe6d2" fill-opacity=".35"/><circle cx="100" cy="${y + 7}" r="5" fill="#FF6B1A"/><path d="M100 ${n(y + 4.6)}v4.8M97.6 ${y + 7}h4.8" stroke="#0b0906" stroke-width="1.4" stroke-linecap="round"/>`).join('')
        + '<rect x="56" y="92" width="48" height="16" rx="8" fill="#FF6B1A" fill-opacity=".22"/><rect class="vit-d-enche" x="56" y="92" width="48" height="16" rx="8" fill="#FF6B1A"/>'
        + linhas.map(([, y], k) => `<circle class="vit-d-item" style="--n:${k};--dy:${100 - (y + 7)}px" cx="100" cy="${y + 7}" r="3.2" fill="#F9C748"/>`).join('')
        + '<circle class="vit-d-conta" cx="104" cy="92" r="6.5" fill="#F9C748"/>';
    },
  };
  const arte = (id) => (id === 'foto' ? fotoReal()
    : ARTES[id] ? `<svg class="vit-svg" viewBox="0 0 160 120" aria-hidden="true" focusable="false">${ARTES[id]()}</svg>` : '<i></i><i></i><i></i>');
  return produtos.map((p, i) => {
    const preco = [etiqueta(p, 'gratis'), etiqueta(p, 'pacote')].filter(Boolean);
    const rotulo = p.trancado ? `${p.nome}: em breve, ver a prévia` : `${p.nome}: ${p.o_que_e ?? ''}`;
    return `<li class="vit ${p.trancado ? 'vit-trancado' : 'vit-aberto'}${p.id === 'pine-cost' ? ' vit-destaque' : ''}" data-cor="${esc(p.cor ?? 'amarelo')}">
  <a class="vit-cartao vidro inclina revela" style="--atraso: ${(i * 0.06).toFixed(2)}s; view-transition-name: vt-${esc(p.id)}" href="${esc(p.pagina ? base + p.pagina : '#')}" data-cadeado-alvo data-forca="${p.id === 'pine-cost' ? 5 : 9}" aria-label="${esc(rotulo)}">
    ${p.id === 'pine-cost'
    ? '<span class="vit-recibo" data-profundidade="18"><span class="mini-rot">Como sai a conta</span><span class="vit-recibo-conta" data-exemplo="x-bacon" data-jeito="resumo" aria-busy="true"></span></span>'
    : `<span class="vit-arte arte-${esc(p.id)}" aria-hidden="true" data-profundidade="16">${arte(p.id)}</span>`}
    <span class="vit-geada" aria-hidden="true"></span>
    ${p.trancado
    ? `<span class="cadeado-3d vit-cadeado" data-cadeado-3d data-profundidade="30">${cadeadoSvg()}</span>`
    : '<span class="selo-aberto vit-selo"><i></i>Aberto agora</span>'}
    <span class="vit-texto" data-profundidade="6">
      <b class="vit-nome">${esc(p.nome)}</b>
      <span class="vit-oque">${esc(p.o_que_e ?? '')}</span>
      ${p.trancado
    ? '<span class="vit-breve">Em breve · ver a prévia <span aria-hidden="true">→</span></span>'
    : `<span class="vit-precos">${preco.map((t, k) => `<span class="etiqueta ${k === 0 && t === 'Grátis' ? 'gratis' : 'pacote'}">${esc(t)}</span>`).join('<span class="vit-ponto" aria-hidden="true">·</span>')}</span><span class="vit-abrir">Abrir <span aria-hidden="true">→</span></span>`}
    </span>
  </a>
</li>`;
  }).join('');
}

/**
 * O menu das outras ferramentas (a tela do Pine Cost): cada produto, menos o da própria tela (`sem`).
 * O aberto é um link com o que ele é; o trancado fica borrado com o cadeado (e abre a prévia).
 */
export function menuDeFerramentas(produtos = PRODUTOS, { base = '', sem = 'pine-cost' } = {}) {
  return produtos.filter((p) => p.id !== sem).map((p) => (p.trancado
    ? cartoesTrancados([p], { jeito: 'menu', base })
    : `<li class="ferramenta-menu"><a href="${esc(base + (p.pagina ?? ''))}"><b>${esc(p.nome)}</b><small>${esc(p.o_que_e ?? '')}</small></a></li>`)).join('');
}

/** Põe na tela os preços ([data-valor="produto.qual"]), as listas ([data-lista]) e os cartões ([data-trancados], [data-abertos], [data-vitrine], [data-ferramentas]). */
export function preencherValores(doc, produtos = PRODUTOS, compra = COMPRA_PINE_COST) {
  // o botão de comprar pela Stripe: sem link, fica escondido
  for (const el of doc.querySelectorAll('[data-comprar]')) {
    el.hidden = !compra.link;
    if (compra.link) { el.href = compra.link; el.textContent = compra.texto; }
  }
  const achar = (id) => produtos.find((p) => p.id === id);
  for (const el of doc.querySelectorAll('[data-valor]')) {
    const [id, qual] = el.dataset.valor.split('.');
    const texto = etiqueta(achar(id), qual);
    el.textContent = texto ?? '';
    el.hidden = !texto;
  }
  for (const el of doc.querySelectorAll('[data-lista]')) {
    const [id, qual] = el.dataset.lista.split('.');
    const p = achar(id);
    const itens = p && !p.trancado ? p[qual] ?? [] : [];
    el.innerHTML = itens.map((t) => `<li>${esc(t)}</li>`).join('');
  }
  for (const el of doc.querySelectorAll('[data-trancados]')) el.innerHTML = cartoesTrancados(produtos, { jeito: el.dataset.trancados || 'cartao', base: el.dataset.base });
  for (const el of doc.querySelectorAll('[data-abertos]')) el.innerHTML = cartoesAbertos(produtos);
  for (const el of doc.querySelectorAll('[data-vitrine]')) {
    const sem = el.dataset.sem;
    el.innerHTML = vitrine(sem ? produtos.filter((p) => p.id !== sem) : produtos, { base: el.dataset.base ?? '' });
  }
  for (const el of doc.querySelectorAll('[data-ferramentas]')) el.innerHTML = menuDeFerramentas(produtos, { base: el.dataset.base ?? '', sem: el.dataset.sem || 'pine-cost' });
  for (const el of doc.querySelectorAll('[data-cadeado]')) el.innerHTML = cadeadoSvg(el.dataset.cadeado || undefined);
  // o que só vale com o produto aberto (o preço, o botão do Direct) ou só com ele trancado (o "em breve")
  for (const el of doc.querySelectorAll('[data-so-aberto]')) el.hidden = Boolean(achar(el.dataset.soAberto)?.trancado ?? true);
  for (const el of doc.querySelectorAll('[data-so-trancado]')) el.hidden = !(achar(el.dataset.soTrancado)?.trancado ?? false);
}

/** A ficha de exemplo ([data-exemplo="x-bacon"]): a conta da calculadora de verdade, desenhada como o cupom da V2. */
export async function preencherExemplos(doc) {
  const lugares = [...doc.querySelectorAll('[data-exemplo]')];
  if (!lugares.length) return;
  const ficha = await import('./comum/ficha.js');
  const { EXEMPLOS } = await import('./comum/exemplos.js');
  const tab = await ficha.carregarTabelas();
  for (const el of lugares) {
    const entrada = EXEMPLOS[el.dataset.exemplo];
    if (!entrada) continue;
    const f = ficha.calcular({ ...entrada, completa: el.dataset.completa === 'sim' }, tab);
    el.innerHTML = el.dataset.jeito === 'resumo'
      ? `<p class="resumo-item">${ficha.esc(f.item)} ${ficha.seloExemplo(f)}</p>${ficha.montarResumo(f)}`
      : ficha.montarFicha(f);
    el.setAttribute('aria-busy', 'false');
  }
}

/** A vitrine viva no celular: sem mouse, o cartão que entra na tela funciona sozinho (.vit-viva).
 *  No computador quem faz é o CSS, pelo mouse em cima e pelo foco do teclado. */
export function ligarVitrineViva(doc) {
  if (typeof IntersectionObserver !== 'function' || pedeMenosMovimento() || temMouse()) return;
  const cartoes = doc.querySelectorAll('[data-vitrine] .vit');
  if (!cartoes.length) return;
  const olho = new IntersectionObserver((es) => {
    for (const e of es) e.target.classList.toggle('vit-viva', e.isIntersecting && e.intersectionRatio >= 0.55);
  }, { threshold: [0, 0.55, 1] });
  for (const li of cartoes) olho.observe(li);
}

/** O cadeado 3D ([data-cadeado-3d]): só carrega o código dele quando a página tem um. */
export async function ligarCadeados(doc) {
  if (!doc.querySelector('[data-cadeado-3d]')) return;
  const { ligarCadeados3d } = await import('./comum/cadeado3d.js');
  ligarCadeados3d(doc);
}

if (typeof document !== 'undefined') {
  preencherValores(document);
  ligarBotoes(document, window);
  ligarVidro(document);
  ligarInteracao(document);
  ligarVitrineViva(document);
  ligarCadeados(document).catch(() => {}); // sem WebGL, fica o cadeado desenhado (o SVG de dentro)
  preencherExemplos(document).catch((e) => {
    for (const el of document.querySelectorAll('[data-exemplo]')) el.textContent = `Não deu para montar o exemplo (${e.message}).`;
  });
}
