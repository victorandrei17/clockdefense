// HUD do jogo: corda, engrenagens e hora.
//
// Camada DOM por cima do canvas, tocada só quando o valor muda — nada de
// desenhar texto no canvas por frame. Ver CLAUDE.md.

import { BALANCE as B } from '../../data/balance.js';

export function createHud() {
  const fill = document.getElementById('wind-fill');
  const num = document.getElementById('wind-num');
  const gears = document.getElementById('gears');
  const hour = document.getElementById('hour');
  // Último valor escrito em cada nó. A corda é comparada arredondada porque
  // muda em fração de ponto todo frame e o jogador só lê o inteiro.
  let vWind = -1;
  let vPct = -1;
  let vBaixa = null;
  let vGears = -1;
  let vHour = '';

  return {
    update(eco, run) {
      const wind = Math.ceil(eco.wind);
      if (wind !== vWind) {
        vWind = wind;
        num.textContent = String(wind);
      }

      const pct = Math.round((eco.wind / eco.windMax) * 100);
      if (pct !== vPct) {
        vPct = pct;
        fill.style.width = `${pct}%`;
      }

      const baixa = eco.wind <= eco.windMax * 0.25;
      if (baixa !== vBaixa) {
        vBaixa = baixa;
        fill.classList.toggle('baixa', baixa);
      }

      if (eco.gears !== vGears) {
        vGears = eco.gears;
        gears.textContent = String(eco.gears);
      }

      const h = `${run.hour}/${B.run.hours}`;
      if (h !== vHour) {
        vHour = h;
        hour.textContent = h;
      }

    },
  };
}
