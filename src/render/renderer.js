// Composição do frame: blit do mostrador estático + ponteiros por cima.
import { BALANCE as B } from '../data/balance.js';
import { DEG } from '../util/math.js';
import { BREU, LATAO, OSSO, AMBAR, FERRUGEM, PATINA } from './palette.js';
import { createDial } from './dial.js';
import { drawFx } from './fx.js';
import { PIECES } from '../data/pieces.data.js';
import { stats } from '../game/pieces.js';
import { innerSlots, outerSlots } from '../game/board.js';

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

  // Glifos das peças, desenhados centrados na origem numa caixa de ~20 px.
  // Cada um tem silhueta distinta: o jogador tem de reconhecer a peça pelo
  // contorno, sem legenda.
  const GLYPHS = {
    hammer(g) {
      g.moveTo(-7, -6); g.lineTo(7, -6); g.lineTo(7, 0); g.lineTo(-7, 0); g.closePath();
      g.moveTo(0, 0); g.lineTo(0, 8);
    },
    bell(g) {
      g.moveTo(-7, 5); g.bezierCurveTo(-7, -6, -4, -8, 0, -8);
      g.bezierCurveTo(4, -8, 7, -6, 7, 5); g.closePath();
      g.moveTo(-9, 5); g.lineTo(9, 5);
    },
    spring(g) {
      g.moveTo(-7, -8); g.lineTo(7, -8);
      g.moveTo(-6, -4); g.lineTo(6, -1); g.lineTo(-6, 2); g.lineTo(6, 5);
      g.moveTo(-7, 8); g.lineTo(7, 8);
    },
    hourglass(g) {
      g.moveTo(-7, -8); g.lineTo(7, -8); g.lineTo(-7, 8); g.lineTo(7, 8); g.closePath();
    },
    chain(g) {
      g.moveTo(-2, -7); g.arc(-4, -3, 4, -Math.PI / 2, Math.PI * 1.5);
      g.moveTo(8, 3); g.arc(4, 3, 4, 0, Math.PI * 2);
    },
    counterweight(g) {
      g.moveTo(0, -9); g.lineTo(0, -5);
      g.moveTo(-5, -5); g.lineTo(5, -5); g.lineTo(8, 8); g.lineTo(-8, 8); g.closePath();
    },
  };

  function glyph(type, x, y, scale, color, alpha, width) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    GLYPHS[type](ctx);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width / scale;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  /** Corrente: mostra o segmento que ela liga, do aro interno ao externo. */
  function chainLink(p) {
    const st = stats(p);
    for (let d = -st.neighbours; d <= st.neighbours; d++) {
      const a = (p.angle + d * 30) * DEG;
      const sin = Math.sin(a);
      const cos = Math.cos(a);
      ctx.beginPath();
      ctx.moveTo(B.board.cx + B.board.inner * sin, B.board.cy - B.board.inner * cos);
      ctx.lineTo(B.board.cx + B.board.outer * sin, B.board.cy - B.board.outer * cos);
      ctx.strokeStyle = p.flash > 0 ? AMBAR : LATAO;
      ctx.globalAlpha = (d === 0 ? 0.5 : 0.28) + 0.5 * p.flash;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Contrapeso: anel de carga em volta da peça. Sem texto no canvas. */
  function chargeRing(p) {
    const st = stats(p);
    const t = Math.min(1, p.charges / st.maxCharges);
    if (t <= 0) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
    ctx.strokeStyle = t >= 1 ? AMBAR : PATINA;
    ctx.globalAlpha = 0.55 + 0.45 * t;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function piece(p) {
    if (p.type === 'chain') chainLink(p);

    // Zona da Ampulheta nível 3, enquanto está de pé.
    if (p.zoneTime > 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, PIECES.hourglass.range, 0, Math.PI * 2);
      ctx.fillStyle = PATINA;
      ctx.globalAlpha = 0.1;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#231D16';
    ctx.globalAlpha = 0.95;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.strokeStyle = p.flash > 0 ? AMBAR : LATAO;
    ctx.globalAlpha = 0.6 + 0.4 * p.flash;
    ctx.lineWidth = 1.2 + 1.6 * p.flash;
    ctx.stroke();

    glyph(p.type, p.x, p.y, 0.72, p.flash > 0 ? AMBAR : LATAO, 0.85 + 0.15 * p.flash, 1.6);

    // Nível: um traço por nível acima do primeiro, embaixo da peça.
    for (let i = 1; i < p.level; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x - 5 + (i - 1) * 10, p.y + 17);
      ctx.lineTo(p.x + 1 + (i - 1) * 10, p.y + 17);
      ctx.strokeStyle = OSSO;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (p.type === 'counterweight') chargeRing(p);
    ctx.globalAlpha = 1;
  }

  /** Durante o arrasto: slots que aceitam a peça, e o fantasma no dedo. */
  function dragFeedback(drag, canPlaceAt) {
    if (!drag.type) return;

    for (const s of [...innerSlots, ...outerSlots]) {
      if (!canPlaceAt(drag.type, s.ring, s.index)) continue;
      const escolhido = drag.slot === s;
      ctx.beginPath();
      ctx.arc(s.x, s.y, escolhido ? 21 : 17, 0, Math.PI * 2);
      ctx.strokeStyle = AMBAR;
      ctx.globalAlpha = escolhido ? 0.9 : 0.35;
      ctx.lineWidth = escolhido ? 2.5 : 1.5;
      ctx.stroke();
    }

    const bom = drag.valid;
    const x = bom ? drag.slot.x : drag.x;
    const y = bom ? drag.slot.y : drag.y;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#231D16';
    ctx.globalAlpha = 0.8;
    ctx.fill();
    glyph(drag.type, x, y, 0.72, bom ? AMBAR : FERRUGEM, 0.9, 1.6);
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

    frame(clock, pieces, enemies, drag, canPlaceAt) {
      ctx.fillStyle = BREU;
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, view.w, view.h);

      dial.draw(ctx);

      const es = enemies.items;
      for (let i = 0; i < es.length; i++) if (es[i].active) enemy(es[i]);

      for (const p of pieces) piece(p);
      dragFeedback(drag, canPlaceAt);

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
