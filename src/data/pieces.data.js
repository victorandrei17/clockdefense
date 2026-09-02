// Estatísticas das peças. SPEC §6.
//
// Números de dano e de custo de melhoria são provisórios: o SPEC fixa custo
// base, alcance e o que cada nível muda, mas não o dano. O portão do M5 manda
// jogar e ajustar isto antes do M6.
//
// `upgrade[0]` custa a subida para o nível 2, `upgrade[1]` para o nível 3.

export const PIECES = {
  hammer: {
    name: 'Martelo',
    cost: 10,
    upgrade: [15, 25],
    range: 70,
    levels: [
      { damage: 10, targets: 1 },
      { damage: 18, targets: 1 }, // dano ×1,8
      { damage: 18, targets: 2 }, // atinge 2 alvos
    ],
  },

  bell: {
    name: 'Sino',
    cost: 25,
    upgrade: [35, 60],
    range: 90,
    levels: [
      { damage: 8, radius: 90 },
      { damage: 8, radius: 126 },                 // raio +40%
      { damage: 8, radius: 126, deafen: true },   // surdez
    ],
  },

  spring: {
    name: 'Mola',
    cost: 15,
    upgrade: [20, 35],
    range: 80,
    // Sem dano nenhum. É intencional — ver CLAUDE.md.
    levels: [
      { push: 80 },
      { push: 140 },
      { push: 140, choosable: true }, // fora ou dentro, escolhido na compra
    ],
  },

  hourglass: {
    name: 'Ampulheta',
    cost: 20,
    upgrade: [30, 50],
    range: 100,
    // Sem dano nenhum. Também intencional.
    levels: [
      { slow: 0.4, duration: 2.5 },
      { slow: 0.6, duration: 2.5 },
      { slow: 0.6, duration: 2.5, zone: 4 }, // a zona fica 4 s no lugar
    ],
  },

  chain: {
    name: 'Corrente',
    cost: 40,
    upgrade: [55, 90],
    // Alcance é a coluna inteira, do aro interno ao externo.
    range: 0,
    columnOnly: true,
    levels: [
      { damage: 12, neighbours: 0 },
      { damage: 24, neighbours: 0 }, // dano ×2
      { damage: 24, neighbours: 1 }, // acerta colunas vizinhas
    ],
  },

  counterweight: {
    name: 'Contrapeso',
    cost: 30,
    upgrade: [40, 70],
    range: 70,
    levels: [
      { damage: 4, maxCharges: 8 },
      { damage: 4, maxCharges: 12 },
      { damage: 4, maxCharges: 12, keepOnMidnight: true },
    ],
  },
};

export const PIECE_ORDER = ['hammer', 'bell', 'spring', 'hourglass', 'chain', 'counterweight'];
