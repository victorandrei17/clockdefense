// Painel de peças na base e o arrasto até o slot. SPEC §6, §12.
//
// O painel é DOM; o retorno visual do arrasto — slots válidos acendendo e o
// fantasma da peça — é desenhado no canvas, porque acontece sobre o mostrador.

import { PIECES } from '../../data/pieces.data.js';
import { nearestSlot } from '../../game/board.js';

/** A que distância do slot o arrasto ainda gruda. */
const SNAP = 46;

export function createPanel({ input, canAfford, canPlaceAt, onPlace }) {
  const el = document.getElementById('panel');
  const cartas = [...el.querySelectorAll('.carta')];

  for (const c of cartas) {
    const d = PIECES[c.dataset.type];
    c.querySelector('.nome').textContent = d.name;
    c.querySelector('.custo').textContent = String(d.cost);
  }

  // Estado do arrasto, lido pelo renderer a cada frame.
  const drag = { type: null, x: 0, y: 0, slot: null, valid: false };
  let carta = null;
  let pointerId = -1;

  function mover(clientX, clientY) {
    const p = input.toLogical(clientX, clientY);
    drag.x = p.x;
    drag.y = p.y;
    const s = nearestSlot(p.x, p.y, SNAP);
    drag.slot = s;
    drag.valid = !!s && canPlaceAt(drag.type, s.ring, s.index);
  }

  function terminar(ok) {
    if (ok && drag.valid && drag.slot) {
      onPlace(drag.type, drag.slot.ring, drag.slot.index);
    }
    drag.type = null;
    drag.slot = null;
    drag.valid = false;
    carta?.classList.remove('arrastando');
    carta = null;
    pointerId = -1;
  }

  for (const c of cartas) {
    c.addEventListener('pointerdown', (e) => {
      if (c.disabled || drag.type) return;
      e.preventDefault();
      carta = c;
      pointerId = e.pointerId;
      drag.type = c.dataset.type;
      c.classList.add('arrastando');
      mover(e.clientX, e.clientY);
    });
  }

  window.addEventListener('pointermove', (e) => {
    if (!drag.type || e.pointerId !== pointerId) return;
    mover(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', (e) => {
    if (!drag.type || e.pointerId !== pointerId) return;
    terminar(true);
  });
  window.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== pointerId) return;
    terminar(false);
  });

  let anterior = '';

  return {
    drag,

    /**
     * Acende ou apaga as cartas conforme saldo e tipos liberados. Peça ainda
     * não liberada fica apagada e sem preço — a loja é o portão dos tipos.
     */
    update(eco, run) {
      const chave = `${eco.gears}|${[...run.unlocked].sort().join(',')}`;
      if (chave === anterior) return;
      anterior = chave;
      for (const c of cartas) {
        const tipo = c.dataset.type;
        const liberada = run.unlocked.has(tipo);
        c.disabled = !liberada || !canAfford(PIECES[tipo].cost);
        c.classList.toggle('travada', !liberada);
        c.querySelector('.custo').textContent = liberada ? String(PIECES[tipo].cost) : '—';
      }
    },
  };
}
