// Composição do frame: blit do mostrador estático + ponteiros por cima.
import { BALANCE as B } from '../data/balance.js';
import { DEG } from '../util/math.js';
import { BREU, LATAO, OSSO } from './palette.js';
import { createDial } from './dial.js';

export function createRenderer(ctx, view) {
  const dial = createDial();

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

    frame(clock) {
      ctx.fillStyle = BREU;
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, view.w, view.h);

      dial.draw(ctx);

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
    },

    get dialBuilds() { return dial.builds; },
  };
}
