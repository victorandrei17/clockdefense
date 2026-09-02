// Popover de peça colocada: Melhorar e Vender. SPEC §6.
import { PIECES } from '../../data/pieces.data.js';
import { stats, maxLevel, upgradeCost, sellValue } from '../../game/pieces.js';

export function createPopover({ onUpgrade, onSell }) {
  const el = document.getElementById('popover');
  const titulo = document.getElementById('pop-titulo');
  const bMelhorar = document.getElementById('pop-melhorar');
  const bVender = document.getElementById('pop-vender');

  let alvo = null;
  let mostrado = '';

  bMelhorar.addEventListener('click', () => { if (alvo) onUpgrade(alvo); });
  bVender.addEventListener('click', () => { if (alvo) { onSell(alvo); fechar(); } });

  function fechar() {
    alvo = null;
    el.hidden = true;
    mostrado = '';
  }

  return {
    get piece() { return alvo; },

    abrir(p) {
      alvo = p;
      el.hidden = false;
    },

    fechar,

    /** Reposiciona e reescreve. `scale` converte lógico -> px do palco. */
    update(eco, scale) {
      if (!alvo) return;

      el.style.left = `${alvo.x * scale}px`;
      el.style.top = `${(alvo.y - 26) * scale}px`;

      const d = PIECES[alvo.type];
      const topo = maxLevel(alvo);
      const custo = upgradeCost(alvo);
      const venda = sellValue(alvo);
      const chave = `${d.name}|${alvo.level}|${topo}|${custo}|${venda}|${eco.gears >= custo}`;
      if (chave === mostrado) return;
      mostrado = chave;

      titulo.textContent = `${d.name} · nível ${alvo.level}`;
      bMelhorar.textContent = topo ? 'No máximo' : `Melhorar ${custo}`;
      bMelhorar.disabled = topo || eco.gears < custo;
      bVender.textContent = `Vender +${venda}`;
    },
  };
}
