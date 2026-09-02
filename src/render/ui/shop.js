// Tela da loja. SPEC §9.
//
// O jogo fica pausado aqui. Nada avança sozinho: só o botão "Dar corda".

import { BALANCE as B } from '../../data/balance.js';
import { cardCost, cardLabel, rerollCost } from '../../game/shop.js';

export function createShopUi({ onBuy, onReroll, onContinue }) {
  const el = document.getElementById('shop');
  const hora = document.getElementById('shop-hora');
  const bonus = document.getElementById('shop-bonus');
  const grade = document.getElementById('shop-cartas');
  const bReroll = document.getElementById('shop-reroll');
  const bSeguir = document.getElementById('shop-seguir');

  bReroll.addEventListener('click', () => onReroll());
  bSeguir.addEventListener('click', () => onContinue());

  let mostrado = '';

  function pintar(shop, eco) {
    grade.textContent = '';
    for (const card of shop.offer) {
      const custo = cardCost(card);
      const { titulo, texto } = cardLabel(card);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'oferta';
      const comprada = shop.bought.has(card.id);
      b.classList.toggle('comprada', comprada);
      b.disabled = comprada || eco.gears < custo;
      b.innerHTML = '';
      const t = document.createElement('span'); t.className = 'ot'; t.textContent = titulo;
      const d = document.createElement('span'); d.className = 'od'; d.textContent = texto;
      const c = document.createElement('span'); c.className = 'oc'; c.textContent = comprada ? 'comprada' : String(custo);
      b.append(t, d, c);
      b.addEventListener('click', () => onBuy(card));
      grade.append(b);
    }
  }

  return {
    abrir(run, shop, eco, ganho) {
      el.hidden = false;
      hora.textContent = `Hora ${run.hour} fechada`;
      bonus.textContent = `+${ganho} engrenagens de fim de hora`;
      bSeguir.textContent = run.hour >= B.run.hours ? 'Encerrar' : 'Dar corda';
      mostrado = '';
    },

    fechar() { el.hidden = true; },

    update(run, shop, eco) {
      if (el.hidden) return;
      const chave = shop.offer.map((c) => `${c.id}:${shop.bought.has(c.id)}`).join('|')
        + `|${eco.gears}|${shop.rerolls}`;
      if (chave === mostrado) return;
      mostrado = chave;

      pintar(shop, eco);
      const custo = rerollCost(shop);
      bReroll.textContent = `Trocar as cartas · ${custo}`;
      bReroll.disabled = eco.gears < custo;
    },
  };
}
