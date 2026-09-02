// Spawner. SPEC §7.
//
// A hora tem um orçamento de inimigos (`waves.data.js`) espalhado por ela,
// não um intervalo fixo. Com intervalo fixo, o que decidia a dificuldade era
// se a última leva chegava antes de a hora fechar — um degrau que não tinha
// relação com o jogo.
//
// O Math.random() daqui vira o mulberry32 semeado quando o save precisar
// retomar uma partida (M8).

import { BALANCE as B } from '../data/balance.js';
import { waveOf } from '../data/waves.data.js';
import { spawn } from './enemies.js';

export function createSpawner() {
  return { restam: 0, gap: 0, prox: 0, angulo: 0, passo: 0 };
}

/** Começa a hora: distribui o orçamento pelo tempo dela. */
export function startHour(sp, hour) {
  const n = waveOf(hour).dust;
  sp.restam = n;
  // Deixa uma folga no fim para o último inimigo ainda chegar ao centro.
  const janela = B.run.hourSeconds - B.spawn.tailSeconds;
  sp.gap = janela / n;
  sp.prox = B.spawn.firstDelay;
  // Espalhado pela volta inteira: num tabuleiro circular a pressão vem de
  // todo lado, senão escolher ângulo não significa nada.
  sp.angulo = Math.random() * 360;
  // Passo irracional em relação a 360 para os ângulos não se repetirem cedo.
  sp.passo = 360 * 0.61803398875;
}

export function updateSpawner(sp, pool, dt) {
  if (sp.restam <= 0) return;
  sp.prox -= dt;
  if (sp.prox > 0) return;
  sp.prox += sp.gap;
  sp.restam--;
  const jitter = (Math.random() - 0.5) * 40;
  spawn(pool, 'dust', sp.angulo + jitter);
  sp.angulo += sp.passo;
}

/** Solta um punhado agora. Só para o atalho de debug. */
export function spawnGroup(sp, pool, n = 8) {
  for (let i = 0; i < n; i++) {
    spawn(pool, 'dust', Math.random() * 360);
  }
  return n;
}
