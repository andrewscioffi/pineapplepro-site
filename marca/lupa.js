// A LUPA DA VETORIZAÇÃO (07/11/2026): as contas da demonstração, sem tocar na tela (dá para testar).
//   - a foto pequena da logo (img/logo-whatsapp.jpg, 65 × 80 px) cresce do ícone do app até a fachada e vira quadradinho
//   - a lupa mostra a mesma logo em vetor (logo-vetor.js), no mesmo lugar e do mesmo tamanho: nítida em qualquer tamanho
//   - o raio-X mostra do que cada uma é feita: a foto, de quadradinhos; o vetor, de pontos e curvas
import { CAIXA } from './logo-vetor.js';

/** Os pixels da foto pequena (a mesma caixa do vetor, reduzida). */
export const FOTO = { largura: 65, altura: 80 };
/** A lupa mostra o vetor do mesmo tamanho da foto embaixo dela: a borda nítida continua a borda borrada, lado a lado.
 *  (Aumentando 2 vezes, na fachada a lupa só mostrava um pedaço liso de amarelo.) */
export const ZOOM_DA_LUPA = 1;

/** As 5 paradas do controle de tamanho: a altura da logo em relação à altura da mesa, e a frase de cada uma. */
export const PARADAS = [
  { id: 'icone', nome: 'Ícone do app', curto: 'Ícone', fator: 0.16, frase: 'Pequena, as duas parecem iguais.' },
  { id: 'perfil', nome: 'Foto de perfil', curto: 'Perfil', fator: 0.34, frase: 'Na foto de perfil, a borda da foto já fica tremida.' },
  { id: 'cardapio', nome: 'Cardápio', curto: 'Cardápio', fator: 0.6, frase: 'No cardápio impresso, a foto borra.' },
  { id: 'camiseta', nome: 'Camiseta', curto: 'Camiseta', fator: 0.92, frase: 'Na estampa da camiseta, aparece cada quadradinho.' },
  { id: 'fachada', nome: 'Fachada', curto: 'Fachada', fator: 2.6, frase: 'Na fachada, a foto vira mosaico. O vetor continua nítido.' },
];

/** O valor do controle (0 a 100) de cada parada: elas ficam espalhadas por igual. */
export const valorDaParada = (i) => Math.round((i / (PARADAS.length - 1)) * 100);

/** O controle (0 a 100) → o fator da altura (entre 2 paradas, cresce na mesma proporção) e a parada mais perto. */
export function fatorDoControle(v) {
  const n = PARADAS.length - 1;
  const pos = Math.min(n, Math.max(0, ((Number(v) || 0) / 100) * n));
  const i = Math.min(n - 1, Math.floor(pos));
  const a = PARADAS[i].fator;
  const b = PARADAS[i + 1].fator;
  return { fator: a * (b / a) ** (pos - i), parada: PARADAS[Math.round(pos)] };
}

/** Onde a logo fica na mesa: centrada, com a altura dada (a largura segue a proporção da caixa). */
export function caixaDaLogo(mesa, altura) {
  const largura = (altura * CAIXA.largura) / CAIXA.altura;
  return { x: (mesa.largura - largura) / 2, y: (mesa.altura - altura) / 2, largura, altura };
}

/** O pedaço do vetor que aparece na lupa (o viewBox), com a lupa centrada em (cx, cy) da mesa. */
export function janelaDaLupa(cx, cy, logo, diametro, zoom = ZOOM_DA_LUPA) {
  const porUnidade = (logo.largura / CAIXA.largura) * zoom; // px da tela por unidade do vetor
  const ux = ((cx - logo.x) / logo.largura) * CAIXA.largura;
  const uy = ((cy - logo.y) / logo.altura) * CAIXA.altura;
  const lado = diametro / porUnidade;
  return [ux - lado / 2, uy - lado / 2, lado, lado];
}

// ---------- (v3) a lupa com peso: a mola, o arremesso e o rastro nítido ----------

/** A mola de quando a lupa segue o mouse ou o teclado (um pouco de peso, passa um tiquinho e volta) e a de quando o
 *  dedo segura a lupa (firme embaixo do dedo). */
export const MOLA_SOLTA = { rigidez: 150, amortece: 19 };
export const MOLA_PRESA = { rigidez: 700, amortece: 52 };

/**
 * Um passo da mola, num eixo: a posição `p` (com a velocidade `v`) anda até o `alvo`. `dt` em segundos.
 * Passos pequenos (até 1/120 s) para não explodir quando o quadro demora. Devolve { p, v }.
 */
export function passoDaMola(p, v, alvo, dt, { rigidez = MOLA_SOLTA.rigidez, amortece = MOLA_SOLTA.amortece } = {}) {
  const n = Math.max(1, Math.ceil(Math.max(0, dt) / (1 / 120)));
  const h = Math.max(0, dt) / n;
  let pos = p;
  let vel = v;
  for (let i = 0; i < n; i++) {
    vel += (rigidez * (alvo - pos) - amortece * vel) * h;
    pos += vel * h;
  }
  return { p: pos, v: vel };
}

/** A mola já assentou (perto do alvo e quase parada)? */
export const molaParada = (p, v, alvo, folga = 0.0006) => Math.abs(alvo - p) < folga && Math.abs(v) < folga * 6;

/** O dedo soltou a lupa andando: ela continua na direção dele e para um pouco adiante (sem sair da mesa). */
export function alvoDoArremesso(p, v, { freada = 0.24, min = 0.03, max = 0.97 } = {}) {
  return Math.min(max, Math.max(min, p + v * freada));
}

/**
 * O pedaço do rastro entre 2 posições da lupa: a cápsula (meio círculo atrás, meio círculo na frente e as 2 retas) que
 * o canvas desenha com 2 arcos. Assim o vetor nítido não falha quando a lupa corre. Na primeira vez, o círculo inteiro.
 */
export function rastroEntre(de, para, raio) {
  if (!para) return [];
  if (!de || Math.hypot(para.x - de.x, para.y - de.y) < 0.5) return [{ x: para.x, y: para.y, r: raio, de: 0, ate: Math.PI * 2 }];
  const ang = Math.atan2(para.y - de.y, para.x - de.x);
  return [
    { x: de.x, y: de.y, r: raio, de: ang + Math.PI / 2, ate: ang + Math.PI * 1.5 }, // a parte de trás
    { x: para.x, y: para.y, r: raio, de: ang - Math.PI / 2, ate: ang + Math.PI / 2 }, // a parte da frente
  ];
}

/** O quanto o rastro apaga num quadro (de 0 a 1): some quase todo em uns 2,5 s. */
export const apagarRastro = (dt, meiaVida = 0.6) => 1 - Math.pow(0.5, Math.max(0, dt) / meiaVida);

/** O "zoom" da foto pequena na tela, em %: 100% é cada pixel da foto num pixel da tela. */
export const zoomDaFoto = (alturaNaTela) => Math.round((alturaNaTela / FOTO.altura) * 100);

/** Os quadradinhos da foto só aparecem no raio-X quando cada um tem pelo menos uns 3 px. */
export const mostraQuadradinhos = (alturaNaTela) => alturaNaTela / FOTO.altura >= 3;

/** Os nós (o fim de cada curva) e as alças (do nó até o ponto de controle) do caminho do vetor. */
export function nosDoCaminho(d) {
  const nos = [];
  const alcas = [];
  let atual = null;
  let inicio = null;
  for (const cmd of String(d).match(/[MCZ][^MCZ]*/gi) ?? []) {
    const n = (cmd.slice(1).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const letra = cmd[0].toUpperCase();
    if (letra === 'M') {
      atual = [n[0], n[1]];
      inicio = atual;
      nos.push(atual);
    } else if (letra === 'C' && atual) {
      for (let k = 0; k + 6 <= n.length; k += 6) {
        const fim = [n[k + 4], n[k + 5]];
        alcas.push([atual[0], atual[1], n[k], n[k + 1]], [fim[0], fim[1], n[k + 2], n[k + 3]]);
        if (fim[0] !== inicio[0] || fim[1] !== inicio[1]) nos.push(fim); // o laço fecha no ponto de partida
        atual = fim;
      }
    }
  }
  return { nos, alcas };
}

/** O desenho do raio-X do vetor, em 3 caminhos: as alças, as pontas das alças e os nós (cada ponto vira um traço de tamanho 0,
 *  que o navegador desenha como um quadradinho ou bolinha do mesmo tamanho em qualquer zoom). */
export function desenhoDoRaioX(d) {
  const { nos, alcas } = nosDoCaminho(d);
  const r = (x) => Math.round(x * 10) / 10;
  return {
    alcas: alcas.map(([a, b, c, e]) => `M${r(a)} ${r(b)}L${r(c)} ${r(e)}`).join(''),
    pontas: alcas.map(([, , c, e]) => `M${r(c)} ${r(e)}h0`).join(''),
    nos: nos.map(([x, y]) => `M${r(x)} ${r(y)}h0`).join(''),
    quantos: nos.length,
  };
}
