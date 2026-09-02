// Spawner. SPEC §7.
//
// Provisório do M3: grupos de Poeira em intervalo fixo, ângulo aleatório.
// A composição das 6 horas vem de `waves.data.js` no M6, e o Math.random()
// daqui vira o mulberry32 semeado do M5 — a partida precisa ser determinística
// para o save conseguir retomar.

import { BALANCE as B } from '../data/balance.js';
import { spawn } from './enemies.js';

export function createSpawner() {
  return { next: B.spawn.firstDelay, groups: 0, pending: 0, drip: 0, angle: 0, step: 0 };
}

export function updateSpawner(sp, pool, dt) {
  // Solta o grupo pingado em vez de todo de uma vez. Nascendo juntos, os 6 a
  // 10 chegam juntos e tiram 24-40 de corda num instante só: a partida vira
  // sobreviver a picos, e matar dois ou três não muda nada porque o pico vem
  // igual. Pingado, cada morte tira dano de verdade da conta.
  if (sp.pending > 0) {
    sp.drip -= dt;
    if (sp.drip <= 0) {
      sp.drip += B.spawn.dripGap;
      sp.pending--;
      const jitter = (Math.random() - 0.5) * sp.step * 0.6;
      spawn(pool, 'dust', sp.angle + jitter);
      sp.angle += sp.step;
    }
  }

  sp.next -= dt;
  if (sp.next > 0) return;
  sp.next += B.spawn.interval;
  spawnGroup(sp, pool);
}

/** Engatilha um grupo. Os inimigos saem pingados por `updateSpawner`. */
export function spawnGroup(sp, pool) {
  const { groupMin, groupMax } = B.spawn;
  const n = groupMin + Math.floor(Math.random() * (groupMax - groupMin + 1));

  // Espalhado pela volta inteira. Concentrar o grupo num arco estreito faz a
  // utilidade de cada peça virar loteria: em metade das partidas nenhum
  // inimigo passa perto dela. Num tabuleiro circular a pressão vem de todo
  // lado — é isso que dá sentido a escolher ângulo.
  sp.pending = n;
  sp.drip = 0;
  sp.angle = Math.random() * 360;
  sp.step = 360 / n;
  sp.groups++;
  return n;
}
