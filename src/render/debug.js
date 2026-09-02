// Overlay de debug: F1 no desktop, toque de 3 dedos no celular.
//
// Não é extra. Entra aqui no M2 e é mantido até o fim do projeto (CLAUDE.md).
// Os números vão para uma camada DOM; no canvas só desenhamos geometria —
// alcances, hitboxes e as colunas da Meia-Noite.

import { BALANCE as B } from '../data/balance.js';
import { norm, angleDiff, polar } from '../util/math.js';
import { untilMidnight } from '../game/clock.js';
import { drainRate } from '../game/economy.js';
import { innerSlots, outerSlots } from '../game/board.js';
import { fxAlive } from './fx.js';
import { AMBAR, PATINA, OSSO } from './palette.js';

/**
 * Colunas que a Meia-Noite visita, derivadas da razão entre os ponteiros em
 * vez de escritas na mão: se as velocidades mudarem, o overlay acompanha.
 * Ver SPEC §5.
 */
function midnightColumns() {
  const s = B.hands.second.speed;
  const m = B.hands.minute.speed;
  const adv = (360 * m) / (s - m);
  const cols = [0];
  let a = 0;
  for (let i = 0; i < 360; i++) {
    a = norm(a + adv);
    if (Math.abs(angleDiff(a, 0)) < 1e-6) break;
    cols.push(a);
  }
  return cols;
}

const PANEL_HZ = 10; // o painel é diagnóstico, não precisa de 60 fps

export function createDebug({ clock, pieces, enemies, eco, run }) {
  const el = document.getElementById('debug');
  const columns = midnightColumns();
  const shortcuts = [];

  let on = false;
  let handsPaused = false;
  let sincePanel = 0;
  let shown = '';
  const pointers = new Set();

  function toggle() {
    on = !on;
    el.hidden = !on;
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
      e.preventDefault();
      toggle();
      return;
    }
    if (!on) return;
    const k = e.key.toLowerCase();
    const s = shortcuts.find((x) => x.key === k);
    if (s) {
      e.preventDefault();
      s.run();
    }
  });

  // Três dedos ao mesmo tempo: é o gesto que não colide com nada do jogo,
  // que usa no máximo um arrasto por vez.
  window.addEventListener('pointerdown', (e) => {
    pointers.add(e.pointerId);
    if (pointers.size === 3) toggle();
  });
  const drop = (e) => pointers.delete(e.pointerId);
  window.addEventListener('pointerup', drop);
  window.addEventListener('pointercancel', drop);

  const api = {
    get on() { return on; },
    get handsPaused() { return handsPaused; },

    /** Marcos futuros registram os próprios atalhos aqui. */
    addShortcut(key, label, run) {
      shortcuts.push({ key: key.toLowerCase(), label, run });
    },

    update(dt, fps, ups) {
      if (!on) return;
      sincePanel += dt;
      if (sincePanel < 1 / PANEL_HZ) return;
      sincePanel = 0;

      const p = pieces[0];
      const lines = [
        `fps ${fps}  ups ${ups}  dt ${(dt * 1000).toFixed(1)}ms`,
        `seg ${clock.second.toFixed(1).padStart(5)}°  ` +
        `min ${clock.minute.toFixed(1).padStart(5)}°  ` +
        `hor ${clock.hour.toFixed(1).padStart(5)}°`,
        `separação ${Math.abs(angleDiff(clock.second, clock.minute)).toFixed(1).padStart(5)}°  ` +
        (clock.midnight ? 'MEIA-NOITE' : `próxima em ${untilMidnight(clock).toFixed(1)}s`),
        `meia-noites ${clock.midnights}  colunas ${columns.map((c) => `${c}°`).join(' ')}`,
        `peças ${pieces.length}  inimigos ${enemies.alive()}/${enemies.size}  efeitos ${fxAlive()}`,
        `corda ${eco.wind.toFixed(1)}/${eco.windMax}  dreno ${drainRate(run.hour).toFixed(2)}/s  ` +
        `engr ${eco.gears}  mortes ${eco.kills}${eco.invincible ? '  INVENCÍVEL' : ''}`,
        `fase ${run.phase}  hora ${run.hour} (${run.hourTime.toFixed(1)}s)  ` +
        `ponteiros ×${(1 + run.speedBonus).toFixed(2)}  liberadas ${[...run.unlocked].join(',')}`,
      ];
      if (p) {
        lines.push(
          `martelo ${p.ring}/${p.slot} @${p.angle}°  disparos ${p.shots}`,
          `  último ×${p.lastMult} (${p.lastHand || '—'})  ` +
          `cooldown ${p.cooldown.toFixed(2)}s`,
        );
      }
      lines.push(
        '',
        `F1 alterna${shortcuts.length ? '  ·  ' + shortcuts.map((s) => `${s.key.toUpperCase()} ${s.label}`).join('  ·  ') : ''}`,
      );

      const text = lines.join('\n');
      if (text !== shown) {
        shown = text;
        el.textContent = text;
      }
    },

    draw(ctx) {
      if (!on) return;
      const { cx, cy, hub, edge } = B.board;

      // Colunas da Meia-Noite.
      ctx.strokeStyle = AMBAR;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      for (const a of columns) {
        const p0 = polar(cx, cy, hub, a);
        const p1 = polar(cx, cy, edge, a);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // Hitbox de cada slot.
      ctx.strokeStyle = PATINA;
      ctx.globalAlpha = 0.5;
      for (const s of [...innerSlots, ...outerSlots]) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Raio de spawn e do cubo central.
      ctx.strokeStyle = PATINA;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, B.board.spawn, 0, Math.PI * 2);
      ctx.stroke();

      // Alcance das peças.
      ctx.strokeStyle = OSSO;
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([5, 5]);
      for (const p of pieces) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.range, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    },
  };

  // Único atalho com sistema para agir no M2. Os outros que o marco pede
  // — pular hora, spawnar inimigo, +100 engrenagens, invencibilidade —
  // entram com os marcos que criam essas coisas.
  api.addShortcut('p', 'pausa ponteiros', () => { handsPaused = !handsPaused; });

  return api;
}
