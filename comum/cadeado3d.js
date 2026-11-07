// O CADEADO 3D DE ABACAXI (07/11/2026, pedido do Andrews: "o cadeado em 3D e ele se mexendo quando o cliente coloca o mouse").
// Desenhado pelo próprio navegador (WebGL, sem biblioteca): o corpo dourado com a casca de abacaxi em losangos, a fechadura,
// a alça e a coroa de 3 folhas verdes em cima da alça.
//   - fica boiando devagar; vira na direção do cursor; passou o mouse, a alça sobe um pouco (quer abrir)
//   - tocou ou clicou: a alça sobe e gira, o cadeado abre (e, num link, a página abre depois da animação)
//   - um só "desenhista" WebGL para todos os cadeados da página (copia o quadro para o canvas de cada um)
//   - sem WebGL, ou pedindo menos movimento: fica o cadeado desenhado (o SVG de dentro), parado
// Uso: <span class="cadeado-3d" data-cadeado-3d>SVG de reserva</span>, dentro de um cartão com [data-cadeado-alvo].

const VERTICE = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENTO = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTempo;
uniform vec2 uGiro;   // virar (y) e inclinar (x), em radianos
uniform float uSobe;  // 0 a 1: a alça subindo (o mouse em cima)
uniform float uAbre;  // 0 a 1: a alça abrindo de vez

mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

float caixa(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r; }
float caixa2(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float vesica(vec2 p, float r, float d) { p = abs(p); float b = sqrt(r * r - d * d); return ((p.y - b) * d > p.x * b) ? length(p - vec2(0., b)) : length(p - vec2(-d, 0.)) - r; }

// o corpo: caixa arredondada com a casca de abacaxi (losangos rasos)
float corpo(vec3 p) {
  vec3 q = p - vec3(0., -0.36, 0.);
  float d = caixa(q, vec3(0.6, 0.47, 0.21), 0.17);
  float u = (q.x + q.y) * 4.3, v = (q.x - q.y) * 4.3;
  float sulco = min(abs(fract(u) - 0.5), abs(fract(v) - 0.5));
  return d + 0.008 * (1. - smoothstep(0.015, 0.075, sulco));
}
// a fechadura: um furo que atravessa só a frente do corpo
float fechadura(vec3 p) {
  vec3 q = p - vec3(0., -0.3, 0.);
  float furo = min(length(q.xy) - 0.085, caixa2(q.xy - vec2(0., -0.12), vec2(0.036, 0.12)));
  return max(furo, abs(q.z - 0.27) - 0.13);
}
// o ponto no jeito da alça (sobe com o mouse; abre girando em volta da perna esquerda)
vec3 naAlca(vec3 p) {
  float R = 0.36;
  vec3 q = p - vec3(0., 0.06 + uSobe * 0.09 + uAbre * 0.26, 0.);
  q.x += R; q = rotY(-uAbre * 2.5) * q; q.x -= R;
  return q;
}
float alca(vec3 q) {
  float R = 0.36, r = 0.083, L = 0.52;
  if (q.y > 0.) return length(vec2(length(q.xy) - R, q.z)) - r;
  vec3 w = vec3(abs(q.x) - R, q.y - clamp(q.y, -L, 0.), q.z);
  return length(w) - r;
}
// uma folha pontuda (como as da logo), nascendo na origem e subindo
float folha(vec3 q, float alto, float ang) {
  q.xy = rot2(ang) * q.xy;
  q.y -= alto * 0.5;
  float hb = alto * 0.5, hw = alto * 0.2;
  float soma = hb * hb / hw;
  float d2 = vesica(q.xy, (soma + hw) * 0.5, (soma - hw) * 0.5);
  float esp = 0.022 + 0.012 * (1. - clamp(q.y / hb, -1., 1.)) * 0.5;
  vec2 w = vec2(d2, abs(q.z) - esp);
  return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - 0.01;
}
float coroa(vec3 q) {
  q -= vec3(0., 0.36 + 0.05, 0.);
  float d = folha(q, 0.5, 0.);
  d = min(d, folha(q - vec3(0., -0.03, 0.02), 0.4, 0.8));
  d = min(d, folha(q - vec3(0., -0.03, -0.02), 0.4, -0.8));
  return d;
}

float gMat;
float mapa(vec3 p) {
  p.y -= sin(uTempo * 1.3) * 0.025;
  float dc = max(corpo(p), -fechadura(p));
  vec3 qa = naAlca(p);
  float da = alca(qa);
  float bk = length(qa - vec3(0., 0.62, 0.)) - 0.5; // a coroa só é calculada perto dela (economiza no celular)
  float dk = bk > 0.04 ? bk : coroa(qa);
  float d = dc; gMat = 1.;
  if (da < d) { d = da; gMat = 2.; }
  if (dk < d) { d = dk; gMat = 3.; }
  return d;
}
vec3 normal(vec3 p) {
  const vec2 k = vec2(1., -1.);
  float e = 0.0012;
  return normalize(k.xyy * mapa(p + k.xyy * e) + k.yyx * mapa(p + k.yyx * e) + k.yxy * mapa(p + k.yxy * e) + k.xxx * mapa(p + k.xxx * e));
}
float oclusao(vec3 p, vec3 n) {
  float o = 0., s = 1.;
  for (int i = 1; i <= 4; i++) { float h = 0.03 * float(i); o += (h - mapa(p + n * h)) * s; s *= 0.6; }
  return clamp(1. - 2.2 * o, 0., 1.);
}
// o estúdio que se reflete no metal: chão escuro, horizonte quente, a luz de cima e uma janela de lado
vec3 estudio(vec3 r) {
  vec3 c = mix(vec3(0.03, 0.025, 0.02), vec3(0.34, 0.27, 0.17), smoothstep(-0.55, 0.15, r.y));
  c = mix(c, vec3(1.0, 0.95, 0.86), smoothstep(0.4, 0.95, r.y));
  c += vec3(1.0, 0.93, 0.8) * 0.85 * smoothstep(0.1, 0.0, abs(r.x - 0.58)) * smoothstep(-0.25, 0.35, r.y);
  c += vec3(0.65, 0.9, 0.3) * 0.18 * smoothstep(0.12, 0.0, abs(r.x + 0.7)) * smoothstep(-0.1, 0.5, r.y);
  return c;
}

void main() {
  vec2 uv = vUv * vec2(uRes.x / uRes.y, 1.);
  float tg = 0.35;
  mat3 m = rotY(uGiro.x) * rotX(uGiro.y);
  vec3 ro = m * vec3(0., 0.08, 4.1);
  vec3 rd = m * normalize(vec3(uv * tg, -1.));
  // a esfera que cobre o cadeado: o raio que passa longe nem entra
  vec3 oc = ro - vec3(0., 0.05, 0.);
  float b = dot(oc, rd), c = dot(oc, oc) - 1.5 * 1.5, h = b * b - c;
  if (h < 0.) { gl_FragColor = vec4(0.); return; }
  h = sqrt(h);
  float t = max(-b - h, 0.), tFim = -b + h;
  float px = tg * 2.0 / uRes.y;
  float menor = 1e9, tMenor = t;
  bool bateu = false;
  for (int i = 0; i < 72; i++) {
    float d = mapa(ro + rd * t);
    float raz = d / t;
    if (raz < menor) { menor = raz; tMenor = t; }
    if (d < 0.0008 * t) { bateu = true; break; }
    t += d * 0.9;
    if (t > tFim) break;
  }
  float alfa = 1.;
  if (!bateu) {
    alfa = 1. - smoothstep(0., px * 1.2, menor); // a borda macia (sem serrilhado)
    if (alfa < 0.003) { gl_FragColor = vec4(0.); return; }
    t = tMenor;
  }
  vec3 p = ro + rd * t;
  float mat = gMat;
  mapa(p); mat = gMat;
  vec3 n = normal(p);
  vec3 v = -rd;
  vec3 l1 = m * normalize(vec3(-0.55, 0.75, 0.65));
  vec3 l2 = m * normalize(vec3(0.8, 0.15, 0.4));
  float ao = oclusao(p, n);
  vec3 rWorld = reflect(-v, n) * m;
  float fres = pow(1. - max(dot(n, v), 0.), 5.);
  vec3 cor;
  vec3 pb = p - vec3(0., sin(uTempo * 1.3) * 0.025, 0.);
  if (mat < 1.5 && fechadura(pb) > -0.004 && fechadura(pb) < 0.006 && pb.z > 0.05) mat = 4.;
  if (mat < 1.5) { // o corpo: ouro da marca
    vec3 base = vec3(1.0, 0.77, 0.24);
    vec3 F = base + (1. - base) * fres;
    float d1 = max(dot(n, l1), 0.), d2 = max(dot(n, l2), 0.);
    float sp = pow(max(dot(n, normalize(l1 + v)), 0.), 60.);
    cor = base * (0.24 + 0.78 * d1 + 0.22 * d2) * ao + F * estudio(rWorld) * 0.6 * ao + vec3(1., 0.95, 0.82) * sp * 1.3;
  } else if (mat < 2.5) { // a alça: metal champanhe, mais polido
    vec3 base = vec3(0.93, 0.88, 0.8);
    vec3 F = base + (1. - base) * fres;
    float d1 = max(dot(n, l1), 0.);
    float sp = pow(max(dot(n, normalize(l1 + v)), 0.), 120.);
    cor = base * (0.05 + 0.25 * d1) * ao + F * estudio(rWorld) * 0.85 * ao + vec3(1.) * sp * 1.4;
  } else if (mat < 3.5) { // as folhas da coroa: verde-limão
    vec3 base = vec3(0.64, 0.9, 0.2);
    float d1 = max(dot(n, l1), 0.), d2 = max(dot(n, l2), 0.);
    float sp = pow(max(dot(n, normalize(l1 + v)), 0.), 40.);
    float borda = pow(1. - max(dot(n, v), 0.), 2.);
    cor = base * (0.32 + 0.8 * d1 + 0.22 * d2) * ao + vec3(0.9, 1., 0.7) * sp * 0.4 + base * borda * 0.3;
  } else { // o fundo da fechadura
    cor = vec3(0.07, 0.05, 0.03) * (0.6 + 0.4 * ao);
  }
  cor = cor / (1. + cor * 0.42);
  cor = pow(cor, vec3(0.82));
  gl_FragColor = vec4(cor * alfa, alfa);
}`;

const pedeMenos = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** O desenhista: um só WebGL para a página toda. Devolve null se o aparelho não tiver WebGL. */
function criarDesenhista() {
  const tela = document.createElement('canvas');
  const gl = tela.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true, preserveDrawingBuffer: false })
    || tela.getContext('experimental-webgl');
  if (!gl) return null;
  const sombreador = (tipo, codigo) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, codigo);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'o sombreador não compilou');
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sombreador(gl.VERTEX_SHADER, VERTICE));
  gl.attachShader(prog, sombreador(gl.FRAGMENT_SHADER, FRAGMENTO));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'o programa não ligou');
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(['uRes', 'uTempo', 'uGiro', 'uSobe', 'uAbre'].map((n) => [n, gl.getUniformLocation(prog, n)]));
  gl.clearColor(0, 0, 0, 0);
  return {
    desenhar(destino, { tempo, giro, sobe, abre }) {
      const { width: w, height: h } = destino.canvas;
      if (tela.width !== w || tela.height !== h) { tela.width = w; tela.height = h; }
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.uRes, w, h);
      gl.uniform1f(u.uTempo, tempo);
      gl.uniform2f(u.uGiro, giro[0], giro[1]);
      gl.uniform1f(u.uSobe, sobe);
      gl.uniform1f(u.uAbre, abre);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      destino.clearRect(0, 0, w, h);
      destino.drawImage(tela, 0, 0);
    },
  };
}

/** A mola: chega no alvo sem tranco (função pura, testável). */
export function mola(atual, alvo, dt, rapidez = 9) {
  return atual + (alvo - atual) * (1 - Math.exp(-dt * rapidez));
}

/** O giro do cadeado para a posição do ponteiro no cartão (0 a 1), em radianos (função pura). */
export function giroDoCursor(x, y) {
  return [(x - 0.5) * 1.15, (y - 0.5) * 0.7];
}

let desenhista;
const cadeados = new Set();
const porElemento = new WeakMap(); // o cadeado de cada [data-cadeado-3d] (para o fecharCadeado3d)
let rodando = false;
let antes = 0;

function quadro(agora) {
  const dt = Math.min(0.05, (agora - antes) / 1000 || 0.016);
  antes = agora;
  const t = agora / 1000;
  let algum = false;
  for (const c of cadeados) {
    if (!c.visivel) continue;
    algum = true;
    const calmo = c.parado;
    const alvoGiro = calmo ? [0.35, -0.08] : [c.alvo[0] + Math.sin(t * 0.55 + c.fase) * 0.28, c.alvo[1] + Math.sin(t * 0.42 + c.fase) * 0.06];
    c.giro = [mola(c.giro[0], alvoGiro[0], dt, 6), mola(c.giro[1], alvoGiro[1], dt, 6)];
    c.sobe = mola(c.sobe, c.alvoSobe, dt, c.alvoSobe > c.sobe ? 14 : 7);
    c.abre = mola(c.abre, c.alvoAbre, dt, 7);
    desenhista.desenhar(c.ctx, { tempo: calmo ? 0 : t + c.fase, giro: c.giro, sobe: c.sobe, abre: c.abre });
  }
  if (algum) requestAnimationFrame(quadro); else rodando = false;
}
function acordar() {
  if (rodando) return;
  rodando = true;
  antes = performance.now();
  requestAnimationFrame(quadro);
}

function montar(el) {
  const alvoEl = el.closest('[data-cadeado-alvo]') || el;
  const canvas = document.createElement('canvas');
  canvas.className = 'cadeado-3d-tela';
  canvas.setAttribute('aria-hidden', 'true');
  el.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const c = { el, ctx, giro: [0.3, -0.05], alvo: [0, 0], sobe: 0, alvoSobe: 0, abre: 0, alvoAbre: 0, visivel: false, parado: pedeMenos(), fase: Math.random() * 6 };
  const medir = () => {
    const toque = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, toque ? 1.5 : 2); // no celular, um pouco menos de pixel (o 3D fica leve)
    const lado = Math.max(40, Math.min(300, Math.round(el.getBoundingClientRect().width * dpr)));
    if (canvas.width !== lado || canvas.height !== lado) { canvas.width = lado; canvas.height = lado; }
  };
  medir();
  el.classList.add('tem-3d');
  cadeados.add(c);
  const olhos = [];
  if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(() => { medir(); acordar(); }); ro.observe(el); olhos.push(ro); }
  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver(([e]) => { c.visivel = e.isIntersecting; if (c.visivel) acordar(); });
    io.observe(el); olhos.push(io);
  } else { c.visivel = true; acordar(); }
  c.desligar = () => { for (const o of olhos) o.disconnect(); c.visivel = false; cadeados.delete(c); };
  porElemento.set(el, c);

  if (c.parado) return; // pedindo menos movimento: o cadeado fica parado (mas em 3D)
  alvoEl.addEventListener('pointermove', (ev) => {
    const r = alvoEl.getBoundingClientRect();
    c.alvo = giroDoCursor((ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height);
    c.alvoSobe = 1;
    acordar();
  });
  alvoEl.addEventListener('pointerleave', () => { c.alvo = [0, 0]; c.alvoSobe = 0; if (c.alvoAbre < 1) c.alvoAbre = 0; });
  alvoEl.addEventListener('focus', () => { c.alvoSobe = 1; acordar(); });
  alvoEl.addEventListener('blur', () => { c.alvoSobe = 0; });
  // tocou ou clicou: o cadeado abre; num link, a página abre depois da animação
  alvoEl.addEventListener('click', (ev) => {
    if (c.alvoAbre >= 1) return; // já abriu: deixa o link seguir
    c.alvoAbre = 1; c.alvoSobe = 1;
    acordar();
    const link = alvoEl.closest('a[href]');
    if (link && !(ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1)) {
      ev.preventDefault();
      setTimeout(() => { window.location.href = link.href; }, 520);
    }
  });
}

/** Liga todos os [data-cadeado-3d] da página (chamar de novo depois de pôr cartão novo na tela). */
export function ligarCadeados3d(doc = document) {
  for (const c of cadeados) if (!c.el.isConnected) c.desligar(); // o cadeado que saiu da página para de ser olhado
  const novos = [...doc.querySelectorAll('[data-cadeado-3d]:not(.tem-3d)')];
  if (!novos.length) return;
  try {
    if (desenhista === undefined) desenhista = criarDesenhista();
  } catch (e) {
    desenhista = null;
    console.warn('cadeado 3D desligado:', e.message);
  }
  if (!desenhista) return; // sem WebGL: fica o SVG
  for (const el of novos) montar(el);
}

/** Fecha de novo o cadeado 3D de `el` (o próprio [data-cadeado-3d] ou quem tem um dentro): a alça desce, com a mola.
 *  Devolve false quando ali não tem 3D (sem WebGL, o cadeado desenhado já está fechado). */
export function fecharCadeado3d(el) {
  const alvo = el?.matches?.('[data-cadeado-3d]') ? el : el?.querySelector?.('[data-cadeado-3d]');
  const c = alvo ? porElemento.get(alvo) : undefined;
  if (!c) return false;
  c.alvoAbre = 0; c.alvoSobe = 0;
  acordar();
  return true;
}
