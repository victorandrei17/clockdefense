// Estatísticas das peças. SPEC §6.
// M2 usa só o Martelo nível 1; as outras cinco e os níveis 2 e 3 entram no M4.

export const PIECES = {
  hammer: {
    name: 'Martelo',
    cost: 10,
    range: 70,
    // Provisório: não há inimigo para receber dano até o M3. Serve para
    // conferir os multiplicadores no overlay de debug.
    damage: 10,
  },
};
