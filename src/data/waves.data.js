// Composição das ondas por hora. SPEC §7.
//
// M5 (ajuste do portão de diversão): só Poeira, em orçamento crescente por
// hora. Intervalo fixo fazia a última leva chegar ou não dentro da hora,
// criando um degrau de dificuldade que não tinha nada a ver com o jogo.
// Traça, Ferrugem, Contratempo e Cupim entram aqui no M6.

export const WAVES = [
  { dust: 18 }, // hora 1 — o que 40 engrenagens de Martelo dão conta
  { dust: 26 },
  { dust: 34 },
  { dust: 44 },
  { dust: 56 },
  { dust: 70 }, // hora 6
];

export function waveOf(hour) {
  return WAVES[Math.min(hour, WAVES.length) - 1];
}
