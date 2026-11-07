// OS GESTOS DO PINE CLUB (v3, 07/11/2026, o Andrews: "eu quero que a interface seja altamente interativa").
// As contas do arrastar e do virar, sem tela (testadas em testes/pine-club.test.mjs). Quem mexe na tela é o pine-club.js.
//   o carimbo arrastado: caiu em cima do cartão? E a página rola sozinha quando o dedo chega na borda da tela
//   o cartão que vira: o giro acompanha o dedo; ao soltar, para no lado mais perto (ou no próximo, se o dedo foi rápido)

/** O ponto caiu em cima da caixa (com uma folga em volta, para o dedo)? A caixa é a de getBoundingClientRect. */
export function caiuEm(p, caixa, folga = 0) {
  if (!p || !caixa) return false;
  return p.x >= caixa.left - folga && p.x <= caixa.left + caixa.width + folga
    && p.y >= caixa.top - folga && p.y <= caixa.top + caixa.height + folga;
}

/** Quanto a página rola sozinha (px por quadro) com o dedo perto da borda de cima ou de baixo. Longe da borda: 0. */
export function rolagemNaBorda(y, alturaJanela, { cima = 96, baixo = 72, maximo = 16 } = {}) {
  if (!(alturaJanela > 0)) return 0;
  if (y < cima) return -Math.round(maximo * Math.min(1, (cima - y) / cima));
  if (y > alturaJanela - baixo) return Math.round(maximo * Math.min(1, (y - (alturaJanela - baixo)) / baixo));
  return 0;
}

/** O giro do cartão enquanto o dedo arrasta: meia volta (180°) por largura do cartão. */
export const giroDoArrasto = (base, dx, largura) => base + (dx / Math.max(1, largura)) * 180;

/** Onde o cartão para ao soltar: no lado mais perto (um múltiplo de 180°); com o dedo rápido (mais de 0,25 px/ms),
 *  no próximo lado, na direção do dedo, mesmo sem ter passado da metade. */
export function giroAoSoltar(giro, { vx = 0, base = 0 } = {}) {
  const perto = Math.round(giro / 180) * 180;
  if (Math.abs(vx) < 0.25 || perto !== base) return perto;
  return base + Math.sign(vx) * 180;
}

/** O lado que aparece com esse giro: 'frente' (os selos) ou 'verso' (o código e o que o clube guarda). */
export const ladoDoGiro = (giro) => (Math.abs(Math.round(giro / 180)) % 2 === 1 ? 'verso' : 'frente');
