// Peças no mostrador e a detecção de disparo. SPEC §5, §6.
import { BALANCE as B } from '../data/balance.js';
import { PIECES } from '../data/pieces.data.js';
import { crossed } from '../util/math.js';
import { innerSlots, outerSlots } from './board.js';

/**
 * Ponteiros que disparam, em ordem decrescente de multiplicador.
 *
 * A ordem importa: o cooldown é por peça, e durante a Meia-Noite os dois
 * ponteiros cruzam o mesmo slot interno com poucos milissegundos de
 * diferença. Testando o de maior multiplicador primeiro, o cooldown nunca
 * engole o disparo grande em favor do pequeno.
 */
const FIRING_HANDS = [
  { key: 'minute', angle: 'minute', prev: 'prevMinute', inner: true,  outer: false, mult: B.hands.minute.mult },
  { key: 'second', angle: 'second', prev: 'prevSecond', inner: true,  outer: true,  mult: B.hands.second.mult },
];

export function createPiece(type, ring, slotIndex) {
  const slot = (ring === 'inner' ? innerSlots : outerSlots)[slotIndex];
  const data = PIECES[type];
  return {
    type,
    ring,
    slot: slotIndex,
    angle: slot.angle,
    x: slot.x,
    y: slot.y,
    range: data.range,
    damage: data.damage,
    cooldown: 0,
    // 1 no instante do disparo, decai até 0. Só para o feedback visual.
    flash: 0,
    shots: 0,
    lastMult: 0,
    lastHand: '',
  };
}

/**
 * Testa cada peça contra cada ponteiro que alcança o aro dela.
 * `onFire(piece, mult, handKey)` é chamado no disparo.
 */
export function updatePieces(pieces, clock, dt, onFire) {
  for (const p of pieces) {
    if (p.flash > 0) p.flash = Math.max(0, p.flash - dt / 0.18);

    if (p.cooldown > 0) {
      p.cooldown -= dt;
      // Em cooldown nem testa: é isso que impede o abuso do Cronógrafo.
      if (p.cooldown > 0) continue;
      p.cooldown = 0;
    }

    for (const h of FIRING_HANDS) {
      if (p.ring === 'inner' ? !h.inner : !h.outer) continue;
      if (!crossed(clock[h.prev], clock[h.angle], p.angle)) continue;

      // A Meia-Noite vale para a coluna sob os ponteiros; como o disparo
      // acontece exatamente onde o ponteiro está, estar na janela já
      // significa estar sob eles.
      const mult = h.mult * (clock.midnight ? B.fire.midnightMult : 1);

      p.cooldown = B.fire.pieceCooldown;
      p.flash = 1;
      p.shots++;
      p.lastMult = mult;
      p.lastHand = h.key;
      onFire(p, mult, h.key);
      break; // uma peça dispara uma vez por frame
    }
  }
}
