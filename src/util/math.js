// Ângulos em graus, 0° = 12 horas, sentido horário positivo.
// Radianos só na chamada de desenho — ver CLAUDE.md.

export const DEG = Math.PI / 180;

/** Normaliza um ângulo para [0, 360). */
export function norm(a) {
  return ((a % 360) + 360) % 360;
}

/**
 * Menor diferença de `from` até `to`, com sinal: horário positivo,
 * anti-horário negativo. Resultado em (-180, 180].
 */
export function angleDiff(from, to) {
  const d = norm(to - from);
  return d > 180 ? d - 360 : d;
}

/**
 * Ponto a `r` do centro no ângulo `deg`. Como 0° aponta para cima e o y da
 * tela cresce para baixo, o seno vai no x e o cosseno sai negado no y.
 */
export function polar(cx, cy, r, deg) {
  const a = deg * DEG;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}
