// Mostrador estático: aros, marcações, números e slots vazios.
//
// Rasterizado UMA VEZ num OffscreenCanvas e depois só blitado. Rebuild só
// acontece quando a escala da tela muda (resize/rotação). Se este arquivo
// estiver desenhando por frame, é bug — ver CLAUDE.md.

import { BALANCE as B } from '../data/balance.js';
import { DEG } from '../util/math.js';
import { innerSlots, outerSlots, columns } from '../game/board.js';
import { LATAO, OSSO } from './palette.js';

const MARGIN = 12;

/** Retângulo que o mostrador ocupa, em coordenadas lógicas. */
export const box = {
  x: B.board.cx - B.board.edge - MARGIN,
  y: B.board.cy - B.board.edge - MARGIN,
  w: 2 * (B.board.edge + MARGIN),
  h: 2 * (B.board.edge + MARGIN),
};

const OUTER_SLOT_R = 18;
const INNER_SLOT_R = 16;

/**
 * A única fonte de luz é o centro (SPEC §13): tudo escurece com o raio.
 * Devolve o fator a multiplicar no alpha.
 */
function light(r) {
  return 1 - 0.55 * Math.min(1, r / B.board.edge);
}

function makeSurface(w, h) {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// --- primitivas, todas com a origem já no centro do mostrador --------------

function ring(g, r, width, color, alpha) {
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.strokeStyle = color;
  g.globalAlpha = alpha * light(r);
  g.lineWidth = width;
  g.stroke();
}

/** Marcações da borda: 60 traços, os 12 das horas mais longos. */
function ticks(g) {
  const { edge } = B.board;
  for (let i = 0; i < 60; i++) {
    const hora = i % 5 === 0;
    const len = hora ? 13 : 6;
    g.save();
    g.rotate(i * 6 * DEG);
    g.beginPath();
    g.moveTo(0, -edge);
    g.lineTo(0, -edge + len);
    g.strokeStyle = LATAO;
    g.globalAlpha = (hora ? 0.7 : 0.3) * light(edge);
    g.lineWidth = hora ? 2.5 : 1;
    g.stroke();
    g.restore();
  }
}

/**
 * Raio ligando o slot interno ao externo nas 6 colunas pareadas. É o que
 * mostra, sem texto, quais colunas a Corrente vai conseguir usar.
 */
function spokes(g) {
  const from = B.board.inner + INNER_SLOT_R + 4;
  const to = B.board.outer - OUTER_SLOT_R - 4;
  for (const c of columns) {
    if (c.inner === null) continue;
    g.save();
    g.rotate(c.angle * DEG);
    g.beginPath();
    g.moveTo(0, -from);
    g.lineTo(0, -to);
    g.strokeStyle = LATAO;
    g.globalAlpha = 0.22 * light((from + to) / 2);
    g.lineWidth = 1.5;
    g.stroke();
    g.restore();
  }
}

function slotRing(g, s, r) {
  const dist = s.ring === 'outer' ? B.board.outer : B.board.inner;
  g.save();
  g.translate(s.x - B.board.cx, s.y - B.board.cy);

  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.strokeStyle = LATAO;
  g.lineWidth = 1.5;
  // Órfão marcado diferente: contorno tracejado e mais apagado.
  if (s.orphan) {
    g.setLineDash([4, 4]);
    g.globalAlpha = 0.35 * light(dist);
  } else {
    g.globalAlpha = 0.7 * light(dist);
  }
  g.stroke();
  g.setLineDash([]);
  g.restore();
}

/**
 * Número da hora dentro do slot externo. Serve de rótulo: dá para dizer
 * "martelo no 3" sem contar slot.
 */
function slotNumber(g, s) {
  const n = s.index === 0 ? 12 : s.index;
  g.save();
  g.translate(s.x - B.board.cx, s.y - B.board.cy);
  g.font = '600 19px Georgia, "Times New Roman", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = OSSO;
  g.globalAlpha = (s.orphan ? 0.4 : 0.7) * light(B.board.outer);
  g.fillText(String(n), 0, 1);
  g.restore();
}

/** Cubo central, com o quadrado de dar corda no meio. */
function hub(g) {
  const r = B.board.hub;

  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fillStyle = '#1D1913';
  g.globalAlpha = 1;
  g.fill();

  ring(g, r, 2, LATAO, 0.8);
  ring(g, r - 7, 1, LATAO, 0.35);

  const q = 9;
  g.save();
  g.rotate(45 * DEG);
  g.beginPath();
  g.rect(-q / 2, -q / 2, q, q);
  g.strokeStyle = LATAO;
  g.globalAlpha = 0.85;
  g.lineWidth = 2;
  g.stroke();
  g.restore();
}

function paint(g) {
  const { inner, outer, edge } = B.board;

  // Aro de capítulo: fecha a base das marcações de hora, como num mostrador
  // de verdade. Fica acima dos slots externos, que terminam em 278.
  ring(g, edge, 3, LATAO, 0.6);
  ring(g, edge - 13, 1, LATAO, 0.25);
  ticks(g);

  ring(g, outer, 1, LATAO, 0.3);
  ring(g, inner, 1, LATAO, 0.4);

  spokes(g);

  for (const s of outerSlots) {
    slotRing(g, s, OUTER_SLOT_R);
    slotNumber(g, s);
  }
  for (const s of innerSlots) slotRing(g, s, INNER_SLOT_R);

  hub(g);
  g.globalAlpha = 1;
}

// --- API -------------------------------------------------------------------

export function createDial() {
  let surface = null;
  let pxW = 0;
  let pxH = 0;
  let builds = 0;

  return {
    /**
     * Rasteriza na escala pedida (px de backing por unidade lógica).
     * Chamado no boot e a cada resize. Nunca por frame.
     */
    resize(scale) {
      const w = Math.max(1, Math.round(box.w * scale));
      const h = Math.max(1, Math.round(box.h * scale));
      if (w === pxW && h === pxH) return;

      surface = makeSurface(w, h);
      const g = surface.getContext('2d');
      g.setTransform(w / box.w, 0, 0, h / box.h, 0, 0);
      g.translate(B.board.cx - box.x, B.board.cy - box.y);
      paint(g);

      pxW = w;
      pxH = h;
      builds++;
    },

    draw(ctx) {
      if (surface) ctx.drawImage(surface, box.x, box.y, box.w, box.h);
    },

    /** Quantas vezes foi rasterizado. Em regime deve ficar parado. */
    get builds() { return builds; },
  };
}
