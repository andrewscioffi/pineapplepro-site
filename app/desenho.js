// AS CONTAS DOS DESENHOS DA FERRAMENTA (v3, 07/11/2026). Só conta, nada de tela (os testes rodam no Node):
//   o anel da "pizza por dentro" (cada fatia do tamanho do custo), o arco em SVG e o zoom numa fatia,
//   o giro da pizza do meio a meio, o + e o − que aceleram quando a pessoa segura, e a busca rápida.
// A conta da ficha não mora aqui: ela sai da calculadora, pelo comum/cozinha.js.

export const VOLTA = Math.PI * 2;
const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
const entre = (a, b, t) => a + (b - a) * t;

// ---------- o anel da pizza por dentro ----------

/**
 * As fatias do anel: cada nó da árvore de custo (comum/cozinha.js, arvoreDeCusto) vira uma fatia [a0, a1] (em radianos,
 * 0 no alto e girando no sentido do relógio) do tamanho do custo, dentro da fatia de quem a leva. O nível 0 são os grupos
 * (a base, a cobertura, a embalagem); o 1 é o que vai direto; o 2 em diante, o que vai dentro de uma receita da casa.
 * O `caminho` é o mesmo da lista em texto (o "0/1/2" do data-no), para um acender o outro.
 */
export function fatiasDoAnel(arvore) {
  const fatias = [];
  const total = arvore?.custo_c > 0 ? arvore.custo_c : 1;
  const andar = (nos, a0, a1, nivel, acima, grupo) => {
    const soma = nos.reduce((t, n) => t + Math.max(0, n.custo_c || 0), 0);
    let a = a0;
    nos.forEach((n, k) => {
      const parte = soma > 0 ? (Math.max(0, n.custo_c || 0) / soma) * (a1 - a0) : 0;
      const caminho = acima === null ? String(k) : `${acima}/${k}`;
      const g = n.tipo === 'grupo' ? n.grupo : grupo;
      fatias.push({
        caminho, acima, k, nivel, grupo: g, tipo: n.tipo, id: n.id ?? null, nome: n.nome, qtd: n.qtd ?? null,
        custo_c: n.custo_c || 0, pct: (n.custo_c || 0) / total, a0: a, a1: a + parte, abre: Boolean(n.filhos?.length),
      });
      if (n.filhos?.length) andar(n.filhos, a, a + parte, nivel + 1, caminho, g);
      a += parte;
    });
  };
  andar(arvore?.filhos ?? [], 0, VOLTA, 0, null, null);
  return fatias;
}

/** Os anéis: [raio de dentro, raio de fora]. O −1 some no meio e o último some por fora (no meio do zoom). */
export const ANEIS = [[57, 57], [60, 66], [69, 116], [119, 138], [141, 150], [153, 159], [160, 160]];

/** O raio de dentro e o de fora do anel n (o n pode ser quebrado, no meio do zoom). */
export function raiosDoAnel(n) {
  const x = limitar(n + 1, 0, ANEIS.length - 1); // o ANEIS[0] é o anel −1
  const i = Math.min(Math.floor(x), ANEIS.length - 2);
  const t = x - i;
  return [entre(ANEIS[i][0], ANEIS[i + 1][0], t), entre(ANEIS[i][1], ANEIS[i + 1][1], t)];
}

/** A janela do zoom: o pedaço da volta [w0, w1] que vira a volta inteira e o nível que vira o anel 0. Sem foco, tudo. */
export function janela(fatias, foco) {
  const f = foco ? fatias.find((x) => x.caminho === foco) : null;
  return f ? { w0: f.a0, w1: f.a1, n: f.nivel } : { w0: 0, w1: VOLTA, n: 0 };
}

/** A janela no meio do caminho entre duas (t de 0 a 1). */
export const entreJanelas = (a, b, t) => ({ w0: entre(a.w0, b.w0, t), w1: entre(a.w1, b.w1, t), n: entre(a.n, b.n, t) });

/** Onde a fatia fica com a janela: os ângulos (de 0 a uma volta) e o anel. Fora da janela, a fatia fica com 0 de largura. */
export function naJanela(f, j) {
  const larg = j.w1 - j.w0 > 1e-9 ? j.w1 - j.w0 : VOLTA;
  return {
    a0: limitar(((f.a0 - j.w0) / larg) * VOLTA, 0, VOLTA),
    a1: limitar(((f.a1 - j.w0) / larg) * VOLTA, 0, VOLTA),
    anel: f.nivel - j.n,
  };
}

const ponto = (cx, cy, r, a) => `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`;

/** O pedaço de anel em SVG (o "d" do path), com o 0 no alto e girando no sentido do relógio. Sem largura: ''. */
export function arco(cx, cy, r0, r1, a0, a1) {
  const d = a1 - a0;
  if (!(d > 1e-4) || !(r1 - r0 > 0.05)) return '';
  if (d >= VOLTA - 1e-6) {
    // a volta inteira: o SVG não fecha um arco no mesmo ponto, então vão 2 meias voltas (por fora no relógio, por dentro ao contrário)
    const fora = `M${ponto(cx, cy, r1, 0)}A${r1.toFixed(2)} ${r1.toFixed(2)} 0 1 1 ${ponto(cx, cy, r1, Math.PI)}A${r1.toFixed(2)} ${r1.toFixed(2)} 0 1 1 ${ponto(cx, cy, r1, 0)}Z`;
    if (!(r0 > 0)) return fora;
    return `${fora}M${ponto(cx, cy, r0, 0)}A${r0.toFixed(2)} ${r0.toFixed(2)} 0 1 0 ${ponto(cx, cy, r0, Math.PI)}A${r0.toFixed(2)} ${r0.toFixed(2)} 0 1 0 ${ponto(cx, cy, r0, 0)}Z`;
  }
  const g = d > Math.PI ? 1 : 0;
  if (!(r0 > 0)) return `M${cx} ${cy}L${ponto(cx, cy, r1, a0)}A${r1.toFixed(2)} ${r1.toFixed(2)} 0 ${g} 1 ${ponto(cx, cy, r1, a1)}Z`;
  return `M${ponto(cx, cy, r1, a0)}A${r1.toFixed(2)} ${r1.toFixed(2)} 0 ${g} 1 ${ponto(cx, cy, r1, a1)}L${ponto(cx, cy, r0, a1)}A${r0.toFixed(2)} ${r0.toFixed(2)} 0 ${g} 0 ${ponto(cx, cy, r0, a0)}Z`;
}

/** O meio da fatia (para o "+" de abrir e para a fatia acesa sair um pouco para fora): o ponto e a direção. */
export function meioDaFatia(cx, cy, r0, r1, a0, a1) {
  const m = (a0 + a1) / 2;
  const r = (r0 + r1) / 2;
  return { x: cx + r * Math.sin(m), y: cy - r * Math.cos(m), dx: Math.sin(m), dy: -Math.cos(m) };
}

/** As cores dos grupos (só as da marca e os tons delas). O verde é o dos adicionais (a borda, o bacon extra). */
export const COR_DO_GRUPO = { base: '#d2852e', sabor: '#F9C748', a: '#F9C748', b: '#ffb37d', adicional: '#a6e02e', embalagem: '#8a7d66' };
/** Os tons de cada grupo, para as fatias vizinhas não se confundirem (o 1º é a cor do grupo). */
export const TONS = {
  base: ['#d2852e', '#e9ab62', '#b8711f', '#f2c48b'],
  sabor: ['#F9C748', '#ffe08a', '#dca52a', '#fff0bf'],
  a: ['#F9C748', '#ffe08a', '#dca52a', '#fff0bf'],
  b: ['#ffb37d', '#ffd3b3', '#f2955a', '#ffe6d4'],
  adicional: ['#a6e02e', '#c6ef6e', '#86b81f', '#dcf5a8'],
  embalagem: ['#8a7d66', '#ab9f87', '#6f6450', '#c9bea8'],
};

// ---------- (camadas a fundo) o tamanho da pizza no desenho ----------

/**
 * O tamanho do desenho da pizza: o diâmetro dela ÷ o do maior tamanho (a grande inteira = 1). Fica entre 0,3 e 1 (a pizza
 * pequena ainda aparece). Sem diâmetro: 1.
 */
export function escalaDoDisco(diametro, todos = []) {
  const validos = todos.map(Number).filter((n) => n > 0);
  const max = Math.max(Number(diametro) || 0, ...validos);
  if (!(diametro > 0) || !(max > 0)) return 1;
  return +limitar(diametro / max, 0.3, 1).toFixed(4);
}

/** A pizza do tamanho, em traço fino (o disco, a borda e as 8 fatias): o mesmo desenho geométrico da pizza do meio a meio. */
export function discoSvg() {
  const cortes = [0, 45, 90, 135].map((g) => `<line x1="100" y1="16" x2="100" y2="184" transform="rotate(${g} 100 100)"/>`).join('');
  return `<svg class="disco" viewBox="0 0 200 200" focusable="false" aria-hidden="true">
    <circle class="disco-borda" cx="100" cy="100" r="92"/>
    <circle class="disco-cobertura" cx="100" cy="100" r="78"/>
    <g class="disco-cortes">${cortes}</g>
  </svg>`;
}
/** A cor da fatia: o tom do grupo dela, pela posição entre as vizinhas. */
export const corDaFatia = (grupo, k = 0) => { const t = TONS[grupo] ?? TONS.sabor; return t[k % t.length]; };

/** A força da cor da fatia: o anel de dentro é mais forte, o de fora vai clareando no escuro. */
export function forcaDaFatia(anel) {
  return +(anel < 1 ? 0.9 : limitar(1 - 0.17 * (anel - 1), 0.42, 1)).toFixed(3);
}

// ---------- a pizza do meio a meio ----------

/** O ângulo do ponto em volta do centro, em graus (0 no alto, crescendo no sentido do relógio, de −180 a 180). */
export const anguloDoPonto = (x, y, cx, cy) => (Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI;

/** Quanto girou de um ângulo para o outro, pelo caminho mais curto (graus, de −180 a 180). */
export function giroEntre(a, b) {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** A velocidade do giro no fim do arrasto (graus por ms): só a parte da velocidade que anda em volta do centro. */
export function velocidadeDoGiro(x, y, cx, cy, vx, vy) {
  const dx = x - cx;
  const dy = y - cy;
  const r2 = dx * dx + dy * dy;
  if (r2 < 1) return 0;
  return (((dx * vy - dy * vx) / r2) * 180) / Math.PI;
}

/** De que metade é o ponto, com a pizza girada `giro` graus: 0 = a da esquerda (a 1ª), 1 = a da direita (a 2ª). */
export function metadeDoPonto(x, y, cx, cy, giro = 0) {
  const a = (((anguloDoPonto(x, y, cx, cy) - giro) % 360) + 360) % 360;
  return a < 180 ? 1 : 0;
}

/** O nome em até 2 linhas curtas (para caber na metade da pizza): "Frango com requeijão" → ["Frango com", "requeijão"]. */
export function quebrarNome(nome, max = 11) {
  const palavras = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  const linhas = [];
  for (const p of palavras) {
    const ult = linhas.at(-1);
    if (ult !== undefined && (`${ult} ${p}`).length <= max) linhas[linhas.length - 1] = `${ult} ${p}`;
    else linhas.push(p);
  }
  if (linhas.length <= 2) return linhas;
  const segunda = linhas.slice(1).join(' ');
  return [linhas[0], segunda.length > max + 1 ? `${segunda.slice(0, max).trimEnd()}…` : segunda];
}

// ---------- o + e o − que aceleram ----------

/**
 * Segurando o + ou o −: o 1º passo sai no toque; depois espera um pouco e vai cada vez mais rápido, e o passo cresce
 * (de 1 em 1, depois de 5 em 5, depois de 10 em 10). `n` = quantos passos já foram repetidos.
 */
export function passoQueAcelera(n) {
  const espera = n === 0 ? 380 : Math.max(45, Math.round(170 * Math.pow(0.86, n - 1)));
  const tamanho = n < 12 ? 1 : n < 28 ? 5 : 10;
  return { espera, tamanho };
}

// ---------- a busca rápida ----------

/** O texto sem acento, sem maiúscula e sem espaço sobrando: "Muçarela  " → "mucarela". */
export const normalizar = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

/** A nota do nome na busca: começa igual (3), uma palavra começa igual (2), tem no meio (1), as letras na ordem (0,5), nada (0). */
export function notaDaBusca(nome, busca) {
  const n = normalizar(nome);
  const b = normalizar(busca);
  if (!b || !n) return 0;
  if (n.startsWith(b)) return 3;
  if (n.split(' ').some((p) => p.startsWith(b))) return 2;
  if (n.includes(b)) return 1;
  let i = 0;
  for (const c of n) if (c === b[i]) i++;
  return i === b.length && b.length >= 3 ? 0.5 : 0;
}

/** A busca: os itens que combinam, do melhor para o pior (no empate, a ordem de antes). Sem texto, os primeiros. */
export function buscar(itens, busca, max = 8) {
  if (!normalizar(busca)) return itens.slice(0, max);
  return itens
    .map((x, i) => ({ x, i, nota: Math.max(notaDaBusca(x.nome, busca), x.extra ? notaDaBusca(x.extra, busca) * 0.5 : 0) }))
    .filter((r) => r.nota > 0)
    .sort((a, b) => b.nota - a.nota || a.i - b.i)
    .slice(0, max)
    .map((r) => r.x);
}
