// Estrutura da partida: 6 horas de 60 s, com loja na virada. SPEC §9, §14.
//
// `phase` também carrega as telas: menu → run ⇄ shop → gameover → menu. Um
// `core/state.js` separado só para isso seria uma indireção sem conteúdo.

import { BALANCE as B } from '../data/balance.js';
import { createRng, randomSeed } from '../util/rng.js';

/** Peça com que a partida começa. As outras saem da loja. */
const INICIAIS = ['hammer'];

export function createRun(seed = randomSeed()) {
  return {
    phase: 'menu', // 'menu' | 'run' | 'shop' | 'gameover'
    rng: createRng(seed),
    hour: 1,
    hourTime: 0,
    // Tipos de peça liberados nesta partida. A loja é o portão: sem passar
    // por ela, o painel só oferece o Martelo. Ver SPEC §9 e §10.
    unlocked: new Set(INICIAIS),
    // +10% por carta comprada, máximo 3. Escala segundos E minutos juntos,
    // porque a razão 5:1 é o que mantém a Meia-Noite em cima de slot (SPEC §5).
    speedBonus: 0,
    speedCards: 0,
    won: false,
  };
}

/** Multiplicador de velocidade dos ponteiros que disparam. */
export function handSpeed(run) {
  return 1 + run.speedBonus;
}

export function isLastHour(run) {
  return run.hour >= B.run.hours;
}

/**
 * Avança o relógio da hora. Devolve true quando a hora fecha — quem chama
 * decide se abre a loja ou termina a partida. Nunca avança sozinho daqui.
 */
export function tickHour(run, dt) {
  run.hourTime += dt;
  if (run.hourTime < B.run.hourSeconds) return false;
  run.hourTime = B.run.hourSeconds;
  return true;
}

/** Bônus de fim de hora: 10 + 3 × hora. SPEC §8. */
export function hourBonus(hour) {
  return 10 + 3 * hour;
}

export function nextHour(run) {
  run.hour++;
  run.hourTime = 0;
}
