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

/**
 * O ponteiro cruzou `target` ao ir de `prev` para `curr`?
 *
 * O intervalo é aberto em `prev` e fechado em `curr`. Sem isso um ponteiro
 * que para exatamente em cima do alvo dispara duas vezes: uma ao chegar e
 * outra ao sair no frame seguinte.
 *
 * Varredura de 180° ou mais devolve false: é o app voltando do background ou
 * um dt gigante, e aí o ponteiro só reposiciona, sem disparar (SPEC §5).
 */
export function crossed(prev, curr, target, clockwise = true) {
  const d = clockwise ? norm(curr - prev) : norm(prev - curr);
  if (d === 0 || d >= 180) return false;
  const t = clockwise ? norm(target - prev) : norm(prev - target);
  return t > 0 && t <= d;
}
