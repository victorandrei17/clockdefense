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
  // Ajustado no portão do M5, medindo. O dreno caiu pela metade e cada morte
  // devolve 5× mais: com os valores do SPEC original a partida era
  // aritmeticamente invencível — 234 de dreno contra 174 disponíveis mesmo
  // matando 100%. Ver as notas do M5 no PROGRESS.md.
  wind: { start: 100, drain: 0.2, drainPerHour: 0.05, perKill: 1.5 },

  // SPEC §2. Seis horas de 60 s fecham a volta do ponteiro das horas.
  run: { hours: 6, hourSeconds: 60 },

  // SPEC §8. Engrenagens por morte. Os outros inimigos entram no M6.
  // `start` é provisório: sem engrenagens iniciais não dá para colocar a
  // primeira peça, e sem peça não se mata nada para ganhar engrenagens.
  gears: { start: 40, dust: 2, moth: 3, rust: 6, counterbeat: 8, termite: 10, cuckoo: 60 },

  // SPEC §9.
  shop: {
    cards: 4,
    rerollBase: 5,
    rerollStep: 3,
    windCost: 15,
    windGain: 10,
    speedCost: 35,
    speedMax: 3,
    speedStep: 0.1,
  },

  // SPEC §6. Cargas do Contrapeso e devolução da venda.
  pieces: { chargePerSecond: 1, sellRatio: 0.5 },

  // O orçamento de cada hora está em `waves.data.js`. Aqui só a cadência.
  // `tailSeconds` é a folga no fim da hora: sem ela o último inimigo nasceria
  // faltando menos tempo do que leva para chegar ao centro.
  spawn: { firstDelay: 2, tailSeconds: 14 },
};
