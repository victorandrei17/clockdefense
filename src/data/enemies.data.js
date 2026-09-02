// Estatísticas dos inimigos. SPEC §7.
// M3 traz só a Poeira; Traça, Ferrugem, Contratempo e Cupim entram no M6.

export const ENEMIES = {
  dust: {
    name: 'Poeira',
    speed: 30,   // px/s em direção ao centro
    hp: 8,
    damage: 4,   // tirado da corda ao alcançar o cubo
    gears: 2,
    radius: 9,   // raio de desenho e de acerto
  },
};
