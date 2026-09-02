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
};
