// Efeitos visuais. Nada de `ctx.shadowBlur`: o glow é um sprite de gradiente
// radial pré-renderizado, blitado com `lighter`. Ver CLAUDE.md.
//
// Os flashes vêm de um array pré-alocado — nenhum `new` dentro do loop.
// O pool genérico de `util/pool.js` entra no M3, com os inimigos.

import { BALANCE as B } from '../data/balance.js';
import { polar } from '../util/math.js';
import { AMBAR } from './palette.js';

const MAX_FLASHES = 32;
const FLASH_TTL = 0.28;
const PULSE_TTL = 0.4; // SPEC §13: pulso da Meia-Noite dura 400 ms
const GLOW_PX = 128;

function surface(w, h) {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function rgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Sprite de glow, construído uma vez na primeira utilização. */
let glow = null;
function getGlow() {
  if (glow) return glow;
  glow = surface(GLOW_PX, GLOW_PX);
  const g = glow.getContext('2d');
  const r = GLOW_PX / 2;
  const [cr, cg, cb] = rgb(AMBAR);
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0.0, `rgba(${cr},${cg},${cb},0.85)`);
  grad.addColorStop(0.35, `rgba(${cr},${cg},${cb},0.30)`);
  grad.addColorStop(1.0, `rgba(${cr},${cg},${cb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, GLOW_PX, GLOW_PX);
  return glow;
}

const flashes = [];
for (let i = 0; i < MAX_FLASHES; i++) flashes.push({ active: false, x: 0, y: 0, r: 0, life: 0 });

const pulse = { active: false, life: 0, angle: 0 };

export function spawnFlash(x, y, r) {
  for (const f of flashes) {
    if (f.active) continue;
    f.active = true;
    f.x = x;
    f.y = y;
    f.r = r;
    f.life = FLASH_TTL;
    return;
  }
  // Pool cheio: descarta. Perder um clarão vale mais que alocar no loop.
}

export function spawnMidnight(angle) {
  pulse.active = true;
  pulse.life = PULSE_TTL;
  pulse.angle = angle;
}

export function updateFx(dt) {
  for (const f of flashes) {
    if (!f.active) continue;
    f.life -= dt;
    if (f.life <= 0) f.active = false;
  }
  if (pulse.active) {
    pulse.life -= dt;
    if (pulse.life <= 0) pulse.active = false;
  }
}

export function drawFx(ctx) {
  const sprite = getGlow();
  ctx.globalCompositeOperation = 'lighter';

  for (const f of flashes) {
    if (!f.active) continue;
    const t = f.life / FLASH_TTL;
    ctx.globalAlpha = t;
    const d = f.r * 2 * (1.35 - 0.35 * t); // abre um pouco enquanto apaga
    ctx.drawImage(sprite, f.x - d / 2, f.y - d / 2, d, d);
  }

  if (pulse.active) {
    const t = 1 - pulse.life / PULSE_TTL; // 0 -> 1
    const { cx, cy, hub, edge } = B.board;
    const r = hub + (edge - hub) * t;

    // Anel expandindo do centro para a borda, uma vez só.
    ctx.globalAlpha = (1 - t) * 0.55;
    ctx.strokeStyle = AMBAR;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Clarão na coluna que recebeu o bônus.
    const p = polar(cx, cy, B.board.outer, pulse.angle);
    ctx.globalAlpha = 1 - t;
    const d = 190;
    ctx.drawImage(sprite, p.x - d / 2, p.y - d / 2, d, d);
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/** Quantos efeitos estão vivos. Para o overlay de debug. */
export function fxAlive() {
  let n = pulse.active ? 1 : 0;
  for (const f of flashes) if (f.active) n++;
  return n;
}
