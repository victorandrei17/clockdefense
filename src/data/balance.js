// Todos os números de jogo vivem aqui. Nenhum literal de gameplay espalhado
// pelo código. Cada seção entra com o marco que a usa — ver SPEC §15.

export const BALANCE = {
  // SPEC §4. Centro deslocado para baixo: o topo é HUD e o polegar alcança
  // melhor a metade inferior da tela.
  board: { cx: 360, cy: 700, hub: 44, inner: 150, outer: 260, edge: 300, spawn: 400 },

  // SPEC §5. Velocidades em graus por segundo.
  hands: {
    // mult = second.speed / minute.speed. A razão 5:1 é o que mantém a
    // Meia-Noite caindo em cima de slot; mexer só numa das duas a desliga.
    second: { speed: 60, mult: 1 },
    minute: { speed: 12, mult: 5 },
    hour:   { speed: 1 },
    chrono: { lerp: 0.25, mult: 2 },
  },

  // SPEC §5.
  fire: {
    // Único freio anti-abuso do sistema: impede chacoalhar o Cronógrafo em
    // cima de uma peça. Não remover.
    pieceCooldown: 0.35,
    // Separação máxima entre segundos e minutos para valer Meia-Noite.
    midnightArc: 3,
    midnightMult: 3,
  },

  // SPEC §8. A corda drena sozinha: um jogador puramente defensivo perde.
  wind: { start: 100, drain: 0.4, drainPerHour: 0.1, perKill: 0.3 },

  // SPEC §2. Seis horas de 60 s fecham a volta do ponteiro das horas.
  run: { hours: 6, hourSeconds: 60 },

  // SPEC §8. Engrenagens por morte. Os outros inimigos entram no M6.
  gears: { dust: 2 },

  // Provisório do M3: um grupo a cada `interval` segundos. A composição de
  // verdade das 6 horas vem de `waves.data.js` no M6.
  spawn: { groupMin: 6, groupMax: 10, interval: 15, firstDelay: 3, dripGap: 0.5 },
};
