// Inimigos. SPEC §7.
import { BALANCE as B } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.data.js';
import { DEG, norm } from '../util/math.js';
import { createPool } from '../util/pool.js';

// Com um grupo de até 10 a cada 20 s e ~12 s de trajeto, raramente passa de
// 20 vivos. 96 dá folga de sobra para as ondas do M6.
const MAX_ENEMIES = 96;

export function createEnemies() {
  return createPool(MAX_ENEMIES, () => ({
    active: false,
    type: 'dust',
    angle: 0,
    radius: 0,
    x: 0,
    y: 0,
    hp: 0,
    speed: 0,
    damage: 0,
    drawRadius: 0,
    hit: 0, // 1 no instante do dano, decai — só feedback visual
  }));
}

export function spawn(pool, type, angle) {
  const e = pool.take();
  if (!e) return null; // pool cheio: melhor perder um spawn que alocar no loop
  const d = ENEMIES[type];
  e.type = type;
  e.angle = norm(angle);
  e.radius = B.board.spawn;
  e.hp = d.hp;
  e.speed = d.speed;
  e.damage = d.damage;
  e.drawRadius = d.radius;
  e.hit = 0;
  place(e);
  return e;
}

function place(e) {
  const a = e.angle * DEG;
  // Sem `polar()` aqui: ele devolve um objeto, e isto roda por inimigo por frame.
  e.x = B.board.cx + e.radius * Math.sin(a);
  e.y = B.board.cy - e.radius * Math.cos(a);
}

/**
 * Move todo mundo em direção ao centro. Quem alcança o cubo causa dano e
 * morre no impacto — `onReach(enemy)` é chamado nesse caso.
 */
export function updateEnemies(pool, dt, onReach) {
  const items = pool.items;
  for (let i = 0; i < items.length; i++) {
    const e = items[i];
    if (!e.active) continue;

    if (e.hit > 0) e.hit = Math.max(0, e.hit - dt / 0.12);

    e.radius -= e.speed * dt;
    if (e.radius <= B.board.hub) {
      e.radius = B.board.hub;
      place(e);
      onReach(e);
      pool.release(e);
      continue;
    }
    place(e);
  }
}

/** Aplica dano. Devolve true se matou. */
export function damage(pool, e, amount) {
  e.hp -= amount;
  e.hit = 1;
  if (e.hp > 0) return false;
  pool.release(e);
  return true;
}

/** Inimigo vivo mais próximo de (x, y) dentro de `range`. Null se não houver. */
export function nearest(pool, x, y, range) {
  const items = pool.items;
  let best = null;
  let bestD2 = range * range;
  for (let i = 0; i < items.length; i++) {
    const e = items[i];
    if (!e.active) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) {
      bestD2 = d2;
      best = e;
    }
  }
  return best;
}
