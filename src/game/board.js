// Geometria do mostrador. SPEC §4.
import { BALANCE as B } from '../data/balance.js';
import { polar } from '../util/math.js';

export const INNER_COUNT = 6;
export const OUTER_COUNT = 12;

/** Passo angular do aro externo, e portanto de uma coluna. */
export const COLUMN_STEP = 360 / OUTER_COUNT; // 30°

function makeSlots(ring, count, radius) {
  const step = 360 / count;
  const out = [];
  for (let i = 0; i < count; i++) {
    const angle = i * step;
    const { x, y } = polar(B.board.cx, B.board.cy, radius, angle);
    out.push({
      ring,
      index: i,
      angle,
      x,
      y,
      // O slot interno i alinha com o externo 2i, então os externos de índice
      // ímpar não têm par. Intencional: cria posições boas e ruins.
      orphan: ring === 'outer' && i % 2 === 1,
    });
  }
  return out;
}

export const innerSlots = makeSlots('inner', INNER_COUNT, B.board.inner);
export const outerSlots = makeSlots('outer', OUTER_COUNT, B.board.outer);

/**
 * Coluna = mesmo ângulo. Doze colunas, uma por slot externo; só as de índice
 * par têm slot interno. `inner` é null nas seis órfãs.
 */
export const columns = outerSlots.map((o) => ({
  index: o.index,
  angle: o.angle,
  outer: o.index,
  inner: o.index % 2 === 0 ? o.index / 2 : null,
}));
