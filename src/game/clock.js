// Os ponteiros. SPEC §5.
import { BALANCE as B } from '../data/balance.js';
import { norm } from '../util/math.js';

export function createClock() {
  return { second: 0, minute: 0, hour: 0 };
}

/**
 * Avança os ponteiros. `dt` já vem clampado pelo loop, então uma volta ao
 * background não faz o relógio saltar mais que o passo fixo permite.
 */
export function advance(clock, dt) {
  clock.second = norm(clock.second + B.hands.second.speed * dt);
  clock.minute = norm(clock.minute + B.hands.minute.speed * dt);
  clock.hour   = norm(clock.hour   + B.hands.hour.speed   * dt);
}
