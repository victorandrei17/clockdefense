// Composição do frame: blit do mostrador estático + ponteiros por cima.
import { BALANCE as B } from '../data/balance.js';
import { DEG } from '../util/math.js';
import { BREU, LATAO, OSSO, AMBAR, FERRUGEM } from './palette.js';
import { createDial } from './dial.js';
import { drawFx } from './fx.js';

export function createRenderer(ctx, view) {
  const dial = createDial();

  /** Poeira: um grão irregular vindo da borda. Arte de verdade é do M9. */
  function enemy(e) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.drawRadius, 0, Math.PI * 2);
    ctx.fillStyle = e.hit > 0 ? OSSO : FERRUGEM;
    ctx.globalAlpha = 0.85;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(e.x - e.drawRadius * 0.3, e.y - e.drawRadius * 0.3, e.drawRadius * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = OSSO;
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /**
   * Peça no slot. A arte de verdade é do M4/M9; aqui só precisa ler como
   * "ocupado" e reagir ao disparo, que é o que o M2 tem de provar.
   */
  function piece(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = LATAO;
    ctx.globalAlpha = 0.55 + 0.45 * p.flash;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.strokeStyle = p.flash > 0 ? AMBAR : LATAO;
    ctx.globalAlpha = 0.7 + 0.3 * p.flash;
    ctx.lineWidth = 1.5 + 1.5 * p.flash;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /**
   * Desenha um ponteiro por rotação em vez de calcular a ponta: evita alocar
   * um ponto por frame e já deixa a cauda atrás do eixo.
   */
  function hand(deg, tail, len, width, color, alpha) {
    ctx.save();
    ctx.translate(B.board.cx, B.board.cy);
    ctx.rotate(deg * DEG);
    ctx.beginPath();
    ctx.moveTo(0, tail);
    ctx.lineTo(0, -len);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  return {
    resize(scale) {
      dial.resize(scale);
    },

    frame(clock, pieces, enemies) {
      ctx.fillStyle = BREU;
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, view.w, view.h);

      dial.draw(ctx);

      const es = enemies.items;
      for (let i = 0; i < es.length; i++) if (es[i].active) enemy(es[i]);

      for (const p of pieces) piece(p);

      // Comprimentos dizem o que cada ponteiro alcança: o das horas morre
      // antes do aro interno porque não dispara nada, o dos minutos passa do
      // aro interno, o dos segundos passa do externo.
      hand(clock.hour,   14, 118, 9, LATAO, 0.45);
      hand(clock.minute, 18, 168, 6, LATAO, 0.78);
      hand(clock.second, 26, 278, 3, OSSO,  0.95);

      ctx.beginPath();
      ctx.arc(B.board.cx, B.board.cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = LATAO;
      ctx.globalAlpha = 1;
      ctx.fill();

      drawFx(ctx);
    },

    get dialBuilds() { return dial.builds; },
  };
}
