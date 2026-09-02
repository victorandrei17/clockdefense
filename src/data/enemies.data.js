// Estatísticas dos inimigos. SPEC §7.

export const ENEMIES = {
  dust: {
    name: 'Poeira', speed: 30, hp: 8, damage: 4, gears: 2, radius: 9,
  },

  moth: {
    // Zigue-zague senoidal: atrapalha mira de alcance curto.
    name: 'Traça', speed: 85, hp: 5, damage: 3, gears: 3, radius: 7,
    wobbleAmp: 25, wobblePeriod: 0.8,
  },

  rust: {
    // Não vai ao centro: come a peça mais próxima e a desativa.
    name: 'Ferrugem', speed: 45, hp: 20, damage: 0, gears: 6, radius: 11,
  },

  counterbeat: {
    // Órbita anti-horária encolhendo. Congela sob ponteiro.
    name: 'Contratempo', speed: 0, hp: 25, damage: 8, gears: 8, radius: 10,
    shrink: 12, orbit: 40, freezeArc: 8,
  },

  termite: {
    // Ignora a corda: ataca o motor. Gruda no ponteiro dos segundos.
    name: 'Cupim', speed: 70, hp: 30, damage: 0, gears: 10, radius: 8,
    ride: 190, slowEach: 0.25, slowFloor: 0.6,
  },
};
