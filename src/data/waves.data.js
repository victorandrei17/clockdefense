// Composição das 6 horas. SPEC §7.
//
// A Poeira estrutura a onda. Cada hora nova apresenta um inimigo, sozinho o
// bastante para o jogador entender o que ele faz antes de virar mistura.

export const WAVES = [
  { dust: 18 },                                                   // 1 — tutorial vivo
  { dust: 22, moth: 6 },                                          // 2 — a Traça atrapalha a mira
  { dust: 26, moth: 8, rust: 3 },                                 // 3 — a Ferrugem come peças
  { dust: 30, moth: 10, rust: 4, counterbeat: 3 },                 // 4 — o Contratempo orbita
  { dust: 34, moth: 12, rust: 5, counterbeat: 4, termite: 2 },     // 5 — o Cupim ataca o motor
  { dust: 40, moth: 14, rust: 6, counterbeat: 6, termite: 3 },     // 6
];

export function waveOf(hour) {
  return WAVES[Math.min(hour, WAVES.length) - 1];
}

/** Lista achatada de tipos da hora, para o spawner sortear sem repetir conta. */
export function rosterOf(hour) {
  const w = waveOf(hour);
  const out = [];
  for (const [type, n] of Object.entries(w)) {
    for (let i = 0; i < n; i++) out.push(type);
  }
  return out;
}
