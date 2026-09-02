// MENU e GAMEOVER. SPEC §14.
// Versões básicas: a oficina de rubis e a tela META são do M8.

import { BALANCE as B } from '../../data/balance.js';

export function createScreens({ onStart, onRestart }) {
  const menu = document.getElementById('menu');
  const over = document.getElementById('gameover');
  const h1 = document.getElementById('go-linha1');
  const h2 = document.getElementById('go-linha2');
  const titulo = over.querySelector('h1');

  document.getElementById('menu-jogar').addEventListener('click', onStart);
  document.getElementById('restart').addEventListener('click', onRestart);

  return {
    mostrarMenu(sim) { menu.hidden = !sim; },

    fim(run, eco) {
      over.hidden = false;
      const venceu = run.won;
      titulo.textContent = venceu ? 'Seis horas' : 'A corda parou';
      const min = Math.floor(eco.elapsed / 60);
      const seg = Math.floor(eco.elapsed % 60);
      h1.textContent = venceu
        ? `As ${B.run.hours} horas fecharam o círculo`
        : `Parou na hora ${run.hour} de ${B.run.hours}, aos ${min}:${String(seg).padStart(2, '0')}`;
      h2.textContent = `${eco.kills} mortes · ${eco.gears} engrenagens`;
    },

    esconderFim() { over.hidden = true; },
  };
}
