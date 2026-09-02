// Corda e engrenagens. SPEC §8.
import { BALANCE as B } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.data.js';

export function createEconomy() {
  return {
    wind: B.wind.start,
    windMax: B.wind.start,
    gears: B.gears.start,
    kills: 0,
    elapsed: 0,
    hour: 1,
    alive: true,
    invincible: false, // atalho de debug
  };
}

/** Dreno por segundo na hora atual: 0,4 na primeira, 0,9 na sexta. */
export function drainRate(eco) {
  return B.wind.drain + B.wind.drainPerHour * (eco.hour - 1);
}

export function tick(eco, dt) {
  if (!eco.alive) return;

  eco.elapsed += dt;
  // A hora sai do tempo decorrido. A estrutura de partida com transição e
  // loja na virada é do M5; aqui só precisamos da hora para escalar o dreno.
  eco.hour = Math.min(B.run.hours, Math.floor(eco.elapsed / B.run.hourSeconds) + 1);

  if (!eco.invincible) spend(eco, drainRate(eco) * dt);
}

/** Tira da corda. O dreno e o dano de inimigo passam por aqui. */
export function spend(eco, amount) {
  if (!eco.alive || eco.invincible) return;
  eco.wind -= amount;
  if (eco.wind <= 0) {
    eco.wind = 0;
    eco.alive = false;
  }
}

export function creditKill(eco, type) {
  eco.kills++;
  eco.gears += B.gears[type] ?? 0;
  eco.wind = Math.min(eco.windMax, eco.wind + B.wind.perKill);
}

/** Tenta gastar engrenagens. Devolve false se não houver saldo. */
export function pay(eco, amount) {
  if (eco.gears < amount) return false;
  eco.gears -= amount;
  return true;
}

export function refund(eco, amount) {
  eco.gears += amount;
}
