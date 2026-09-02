// Os ponteiros e a Meia-Noite. SPEC §5.
import { BALANCE as B } from '../data/balance.js';
import { norm, angleDiff } from '../util/math.js';

export function createClock() {
  return {
    second: 0, minute: 0, hour: 0,
    // Posição no frame anterior: é o que o teste de cruzamento compara.
    prevSecond: 0, prevMinute: 0, prevHour: 0,
    // Meia-Noite: segundos e minutos a menos de midnightArc um do outro.
    midnight: false,
    midnightStarted: false, // virou true neste frame
    midnightAngle: 0,
    midnights: 0,
  };
}

/**
 * Avança os ponteiros. `dt` já vem clampado pelo loop, então uma volta do
 * background não faz o relógio saltar mais do que o passo fixo permite.
 */
/**
 * @param {number} speedMul   upgrade de mecanismo: escala segundos E minutos
 * @param {number} secondSlow  penalidade dos Cupins: só nos segundos
 *
 * O Cupim quebra de propósito a razão 5:1 que a carta de loja preserva. Não é
 * inconsistência: é o ataque dele. Com o ponteiro dos segundos fora de razão,
 * o alinhamento da Meia-Noite deixa de cair em cima de slot e o pico do jogo
 * some enquanto ele estiver vivo. Ver SPEC §5 e §7.
 */
export function advance(clock, dt, speedMul = 1, secondSlow = 0) {
  clock.prevSecond = clock.second;
  clock.prevMinute = clock.minute;
  clock.prevHour = clock.hour;

  // O ponteiro das horas nunca escala: ele mede a partida (SPEC §5, §9).
  clock.second = norm(clock.second + B.hands.second.speed * speedMul * (1 - secondSlow) * dt);
  clock.minute = norm(clock.minute + B.hands.minute.speed * speedMul * dt);
  clock.hour   = norm(clock.hour   + B.hands.hour.speed   * dt);

  const era = clock.midnight;
  clock.midnight = Math.abs(angleDiff(clock.second, clock.minute)) < B.fire.midnightArc;
  clock.midnightStarted = clock.midnight && !era;
  if (clock.midnightStarted) {
    // A janela abre ~3,75° ANTES do encontro, então gravar o ângulo atual
    // marcaria a coluna errada. Extrapola até onde os dois se cruzam: com a
    // razão 5:1 isso cai em 0°, 90°, 180° ou 270° — ver SPEC §5.
    const gap = norm(clock.minute - clock.second);
    const rel = B.hands.second.speed - B.hands.minute.speed;
    // gap > 180 é o caso degenerado do boot, com os dois ponteiros saindo
    // juntos de 0°: aí os segundos já passaram e o encontro é agora.
    clock.midnightAngle = gap > 180
      ? clock.second
      : norm(clock.second + B.hands.second.speed * (gap / rel));
    clock.midnights++;
  }
}

/** Segundos até o próximo alinhamento, para o overlay de debug. */
export function untilMidnight(clock) {
  const gap = norm(clock.minute - clock.second);
  return gap / (B.hands.second.speed - B.hands.minute.speed);
}
