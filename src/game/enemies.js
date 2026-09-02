// Inimigos. SPEC §7.
import { BALANCE as B } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.data.js';
import { DEG, norm, angleDiff } from '../util/math.js';
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
    hit: 0,        // 1 no instante do dano, decai — só feedback visual
    slowFactor: 0, // 0 a 1, quanto a Ampulheta tira da velocidade
    slowTime: 0,
    // Traça: ângulo de origem e idade, para o ziguezague.
    homeAngle: 0,
    age: 0,
    // Ferrugem: peça que está devorando.
    host: null,
    // Contratempo: parado enquanto um ponteiro estiver em cima.
    frozen: false,
    // Cupim: já alcançou o ponteiro dos segundos?
    riding: false,
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
  e.slowFactor = 0;
  e.slowTime = 0;
  e.homeAngle = e.angle;
  e.age = 0;
  e.host = null;
  e.frozen = false;
  e.riding = false;
  place(e);
  return e;
}

function place(e) {
  const a = e.angle * DEG;
  // Sem `polar()` aqui: ele devolve um objeto, e isto roda por inimigo por frame.
  e.x = B.board.cx + e.radius * Math.sin(a);
  e.y = B.board.cy - e.radius * Math.cos(a);
}

// --- comportamentos, um por tipo. SPEC §7. ---------------------------------

function passo(e, dt) {
  return e.speed * (1 - e.slowFactor) * dt;
}

const BEHAVIOUR = {
  /** Poeira: linha reta ao centro. */
  dust(e, dt) {
    e.radius -= passo(e, dt);
  },

  /** Traça: mesma linha, com ziguezague senoidal por cima. */
  moth(e, dt) {
    const d = ENEMIES.moth;
    e.radius -= passo(e, dt);
    // Amplitude é em px; convertida para graus no raio atual, o desvio
    // aparente fica constante em vez de abrir perto da borda.
    const off = (d.wobbleAmp / Math.max(20, e.radius)) * (180 / Math.PI);
    e.angle = norm(e.homeAngle + off * Math.sin((e.age / d.wobblePeriod) * Math.PI * 2));
  },

  /**
   * Ferrugem: vai até a peça mais próxima, gruda e a desativa. Não vai ao
   * centro e não tira corda — o custo é perder a peça até matá-la.
   */
  rust(e, dt, ctx) {
    if (e.host) {
      // Se a peça sumiu (vendida), solta e procura outra.
      if (!ctx.pieces.includes(e.host)) { e.host = null; return; }
      return;
    }
    const alvo = maisPerto(ctx.pieces, e.x, e.y);
    if (!alvo) { e.radius -= passo(e, dt); return; }

    const dx = alvo.x - e.x;
    const dy = alvo.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= e.drawRadius + 4) {
      e.host = alvo;
      alvo.disabled = true;
      return;
    }
    const nx = e.x + (dx / dist) * passo(e, dt);
    const ny = e.y + (dy / dist) * passo(e, dt);
    e.radius = Math.hypot(nx - B.board.cx, B.board.cy - ny);
    e.angle = norm(Math.atan2(nx - B.board.cx, B.board.cy - ny) * (180 / Math.PI));
    e.homeAngle = e.angle;
  },

  /**
   * Contratempo: órbita anti-horária com raio encolhendo, e trava enquanto
   * qualquer ponteiro estiver a menos de 8° dele. Fácil de segurar, difícil
   * de matar sem dano concentrado.
   */
  counterbeat(e, dt, ctx) {
    const d = ENEMIES.counterbeat;
    const c = ctx.clock;
    // Só os ponteiros que alcançam algum aro congelam. O das horas anda a
    // 1°/s e é "só indicador" (SPEC §5): incluí-lo prendia o Contratempo por
    // ~16 s, porque congelado ele não consegue se afastar do que o congelou.
    e.frozen = [c.second, c.minute]
      .some((a) => Math.abs(angleDiff(a, e.angle)) < d.freezeArc);
    if (e.frozen) return;
    e.angle = norm(e.angle - d.orbit * dt); // anti-horário
    e.homeAngle = e.angle;
    e.radius -= d.shrink * (1 - e.slowFactor) * dt;
  },

  /**
   * Cupim: voa até o raio de carona e gruda no ponteiro dos segundos, girando
   * junto. Ignora a corda — o dano dele é no motor, não na vida.
   */
  termite(e, dt, ctx) {
    const d = ENEMIES.termite;
    if (!e.riding) {
      e.radius -= passo(e, dt);
      if (e.radius <= d.ride) { e.radius = d.ride; e.riding = true; }
    }
    if (e.riding) {
      e.radius = d.ride;
      e.angle = ctx.clock.second;
      e.homeAngle = e.angle;
    }
  },
};

function maisPerto(pieces, x, y) {
  let best = null;
  let bestD2 = Infinity;
  for (const p of pieces) {
    const dx = p.x - x;
    const dy = p.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = p; }
  }
  return best;
}

/**
 * Roda o comportamento de cada inimigo. Quem alcança o cubo chama
 * `ctx.onReach` e morre no impacto; a Ferrugem e o Cupim nunca chegam lá.
 */
export function updateEnemies(pool, dt, ctx) {
  const items = pool.items;
  for (let i = 0; i < items.length; i++) {
    const e = items[i];
    if (!e.active) continue;

    e.age += dt;
    if (e.hit > 0) e.hit = Math.max(0, e.hit - dt / 0.12);
    if (e.slowTime > 0) {
      e.slowTime -= dt;
      if (e.slowTime <= 0) e.slowFactor = 0;
    }

    BEHAVIOUR[e.type](e, dt, ctx);

    if (e.radius <= B.board.hub) {
      e.radius = B.board.hub;
      place(e);
      ctx.onReach(e);
      release(pool, e);
      continue;
    }
    place(e);
  }
}

/** Solta o inimigo, devolvendo a peça que ele estivesse devorando. */
function release(pool, e) {
  if (e.host) { e.host.disabled = false; e.host = null; }
  pool.release(e);
}

/** Aplica dano. Devolve true se matou. */
export function damage(pool, e, amount) {
  e.hp -= amount;
  e.hit = 1;
  if (e.hp > 0) return false;
  release(pool, e);
  return true;
}

/** Inimigo vivo mais próximo de (x, y) dentro de `range`, ignorando `exclude`. */
export function nearest(pool, x, y, range, exclude) {
  const items = pool.items;
  let best = null;
  let bestD2 = range * range;
  for (let i = 0; i < items.length; i++) {
    const e = items[i];
    if (!e.active || e === exclude) continue;
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

/** Ampulheta: lentidão. A mais forte vence; nunca encurta uma já aplicada. */
export function slow(e, factor, duration) {
  if (factor >= e.slowFactor) e.slowFactor = factor;
  e.slowTime = Math.max(e.slowTime, duration);
}

/** Mola: empurra ao longo do raio. Positivo é para fora. */
export function push(pool, e, distance) {
  e.radius += distance;
  if (e.radius > B.board.spawn) e.radius = B.board.spawn;
  if (e.radius <= B.board.hub) {
    // Empurrado para dentro do cubo: some sem causar dano, é o efeito
    // pretendido do nível 3 da Mola virado para dentro.
    release(pool, e);
    return true;
  }
  return false;
}

/**
 * Inimigos dentro de um círculo. Chama `fn(e)` em cada um — sem alocar array,
 * porque isto roda a cada disparo de Sino.
 */
export function eachInCircle(pool, x, y, radius, fn) {
  const items = pool.items;
  const r2 = radius * radius;
  for (let i = 0; i < items.length; i++) {
    const e = items[i];
    if (!e.active) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy <= r2) fn(e);
  }
}

/**
 * Inimigos no segmento radial de uma coluna: raio entre `r0` e `r1`, e a
 * menos de `width` da linha do ângulo. É o alcance da Corrente.
 */
export function eachInColumn(pool, angle, r0, r1, width, fn) {
  const items = pool.items;
  for (let i = 0; i < items.length; i++) {
    const e = items[i];
    if (!e.active) continue;
    if (e.radius < r0 || e.radius > r1) continue;
    // Distância perpendicular à linha radial.
    const off = Math.abs(e.radius * Math.sin(angleDiff(angle, e.angle) * DEG));
    if (off <= width) fn(e);
  }
}

/** Cupins vivos penalizam o ponteiro dos segundos. SPEC §7. */
export function termitePenalty(pool) {
  const d = ENEMIES.termite;
  let n = 0;
  const items = pool.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].active && items[i].type === 'termite' && items[i].riding) n++;
  }
  return Math.min(d.slowFloor, d.slowEach * n);
}
