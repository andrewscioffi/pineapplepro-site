// DO RABISCO AO VETOR (v3, 07/11/2026, o Andrews: "eu quero que a interface seja altamente interativa").
// As contas do controle que a pessoa arrasta, sem tocar na tela (testadas em testes/marca.test.mjs):
//   0   a foto do WhatsApp (os 65 × 80 quadradinhos)
//   ... o contorno sendo desenhado, contorno por contorno; cada ponto e as alças dele aparecem quando o traço chega neles
//   ... os pontos e as curvas inteiros (o raio-X do vetor)
//   1   a logo pronta, preenchida
// Só a logo da própria Pineapple (logo-vetor.js, traçada da logo de 2000 px).

/** As etapas do controle (de 0 a 1): onde cada uma começa e a frase dela. */
export const ETAPAS = [
  { id: 'foto', ate: 0.12, nome: 'Foto', frase: 'A foto que chega no WhatsApp: 65 × 80 quadradinhos.' },
  { id: 'contorno', ate: 0.62, nome: 'Contorno', frase: 'O contorno, ponto por ponto, em cima da foto.' },
  { id: 'pontos', ate: 0.82, nome: 'Pontos e curvas', frase: 'Pronto o desenho: são só pontos e curvas.' },
  { id: 'pronta', ate: 1, nome: 'Logo pronta', frase: 'A logo pronta, em vetor: nítida do ícone à fachada.' },
];
const INICIO_DO_TRACO = ETAPAS[0].ate;
const FIM_DO_TRACO = ETAPAS[1].ate;

const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rampa = (t, de, ate) => limitar((t - de) / (ate - de));

/** Os contornos do caminho (cada M ... Z) e as curvas de cada um: { de, c1, c2, para } em unidades do vetor. */
export function contornosDoCaminho(d) {
  return (String(d).match(/M[^M]*/g) ?? []).map((pedaco) => {
    const curvas = [];
    let atual = null;
    for (const cmd of pedaco.match(/[MCZ][^MCZ]*/gi) ?? []) {
      const n = (cmd.slice(1).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      const letra = cmd[0].toUpperCase();
      if (letra === 'M') atual = [n[0], n[1]];
      else if (letra === 'C' && atual) {
        for (let k = 0; k + 6 <= n.length; k += 6) {
          const curva = { de: atual, c1: [n[k], n[k + 1]], c2: [n[k + 2], n[k + 3]], para: [n[k + 4], n[k + 5]] };
          curvas.push(curva);
          atual = curva.para;
        }
      }
    }
    return { d: pedaco.trim(), inicio: curvas[0]?.de ?? atual, curvas };
  }).filter((c) => c.curvas.length);
}

/** O comprimento de uma curva (pela linha quebrada em `passos` pedaços: o erro fica bem abaixo de 1 por mil). */
export function comprimentoDaCurva({ de, c1, c2, para }, passos = 24) {
  const ponto = (t) => {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const e = t * t * t;
    return [a * de[0] + b * c1[0] + c * c2[0] + e * para[0], a * de[1] + b * c1[1] + c * c2[1] + e * para[1]];
  };
  let soma = 0;
  let antes = de;
  for (let i = 1; i <= passos; i++) {
    const p = ponto(i / passos);
    soma += Math.hypot(p[0] - antes[0], p[1] - antes[1]);
    antes = p;
  }
  return soma;
}

/**
 * A medida do desenho: cada contorno com o pedaço do traço dele (de 0 a 1, em ordem, pelo comprimento), e cada ponto
 * (nó) e alça com a fração do traço em que ele aparece. O nó do começo aparece com o contorno; os outros, no fim da curva.
 */
export function medirCaminho(d) {
  const contornos = contornosDoCaminho(d);
  const tamanhos = contornos.map((c) => c.curvas.map((k) => comprimentoDaCurva(k)));
  const total = tamanhos.flat().reduce((a, b) => a + b, 0) || 1;
  const nos = [];
  const alcas = [];
  let andou = 0;
  const saida = contornos.map((c, i) => {
    const ini = andou / total;
    nos.push({ x: c.inicio[0], y: c.inicio[1], f: ini });
    c.curvas.forEach((k, j) => {
      const comeca = andou / total;
      andou += tamanhos[i][j];
      const acaba = andou / total;
      alcas.push({ de: k.de, ate: k.c1, f: comeca }, { de: k.para, ate: k.c2, f: acaba });
      const fecha = j === c.curvas.length - 1 && k.para[0] === c.inicio[0] && k.para[1] === c.inicio[1];
      if (!fecha) nos.push({ x: k.para[0], y: k.para[1], f: acaba });
    });
    return { d: c.d, ini, fim: andou / total };
  });
  return { total, contornos: saida, nos, alcas };
}

/** A etapa do controle (t de 0 a 1). */
export const etapaDoRabisco = (t) => ETAPAS.find((e) => limitar(t) < e.ate) ?? ETAPAS[ETAPAS.length - 1];

/**
 * O que aparece em cada ponto do controle (t de 0 a 1):
 *   traco      quanto do contorno já foi desenhado (0 a 1)
 *   foto       a foto do WhatsApp (some no fim); grade, os quadradinhos dela; papel, o fundo limpo
 *   raiox      os pontos e as alças (somem quando a logo enche); cheia, o preenchimento da logo pronta
 */
export function estadoDoRabisco(t) {
  const x = limitar(Number(t) || 0);
  const traco = rampa(x, INICIO_DO_TRACO, FIM_DO_TRACO);
  return {
    t: x,
    etapa: etapaDoRabisco(x).id,
    traco,
    foto: 1 - rampa(x, 0.6, 0.86),
    grade: Math.min(rampa(x, 0.02, 0.12), 1 - rampa(x, 0.5, 0.7)) * 0.7,
    papel: rampa(x, 0.6, 0.86),
    raiox: x < FIM_DO_TRACO ? 1 : 1 - rampa(x, 0.8, 0.95),
    cheia: rampa(x, 0.78, 0.96),
    linha: 1 - rampa(x, 0.88, 1),
  };
}

/** Quanto de cada contorno já está desenhado, com o traço em `s` (0 a 1): o contorno de [ini, fim] vai de 0 a 1. */
export const pedacoDoContorno = (s, c) => (c.fim > c.ini ? limitar((s - c.ini) / (c.fim - c.ini)) : (s >= c.fim ? 1 : 0));

/** Quantos pontos (nós) já apareceram com o traço em `s`. */
export const pontosAte = (s, nos) => nos.filter((n) => n.f <= s + 1e-9).length;
