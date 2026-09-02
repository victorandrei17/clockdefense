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
  const over = document.getElementById('gameover');
  const l1 = document.getElementById('go-linha1');
  const l2 = document.getElementById('go-linha2');

  // Último valor escrito em cada nó. A corda é comparada arredondada porque
  // muda em fração de ponto todo frame e o jogador só lê o inteiro.
  let vWind = -1;
  let vPct = -1;
  let vBaixa = null;
  let vGears = -1;
  let vHour = '';
  let vOver = null;

  return {
    update(eco) {
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

      const h = `${eco.hour}/${B.run.hours}`;
      if (h !== vHour) {
        vHour = h;
        hour.textContent = h;
      }

      if (eco.alive !== vOver) {
        vOver = eco.alive;
        over.hidden = eco.alive;
        if (!eco.alive) {
          const min = Math.floor(eco.elapsed / 60);
          const seg = Math.floor(eco.elapsed % 60);
          l1.textContent = `Parou na hora ${eco.hour} de ${B.run.hours}, aos ${min}:${String(seg).padStart(2, '0')}`;
          l2.textContent = `${eco.kills} mortes · ${eco.gears} engrenagens`;
        }
      }
    },

    onRestart(fn) {
      document.getElementById('restart').addEventListener('click', fn);
    },
  };
}
