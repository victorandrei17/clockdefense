// Loja da virada de hora. SPEC §9.
//
// Quatro cartas sorteadas de um pool condicional, reroll por 5 engrenagens
// subindo 3 a cada uso na mesma visita, e um botão grande de "Dar corda" que
// é a única forma de avançar.

import { BALANCE as B } from '../data/balance.js';
import { PIECES, PIECE_ORDER } from '../data/pieces.data.js';
import { maxLevel, upgradeCost } from './pieces.js';

export const CARD_WIND = 'wind10';
export const CARD_SPEED = 'speed10';

/**
 * Cartas possíveis agora. Sortear de um pool condicional é o que impede a
 * loja de encher de lixo: upgrade só entra se a peça estiver no mostrador,
 * peça só entra se ainda não foi liberada.
 */
export function pool(run, pieces) {
  const out = [];

  for (const type of PIECE_ORDER) {
    if (!run.unlocked.has(type)) out.push({ id: type, kind: 'piece', type });
  }

  // Um upgrade por tipo presente no mostrador que ainda possa subir.
  const vistos = new Set();
  for (const p of pieces) {
    if (vistos.has(p.type) || maxLevel(p)) continue;
    vistos.add(p.type);
    out.push({ id: `upgrade:${p.type}`, kind: 'upgrade', type: p.type, piece: p });
  }

  out.push({ id: CARD_WIND, kind: 'wind' });
  if (run.speedCards < B.shop.speedMax) out.push({ id: CARD_SPEED, kind: 'speed' });

  return out;
}

export function cardCost(card) {
  switch (card.kind) {
    case 'piece': return PIECES[card.type].cost;
    case 'upgrade': return upgradeCost(card.piece);
    case 'wind': return B.shop.windCost;
    case 'speed': return B.shop.speedCost;
    default: return 0;
  }
}

export function cardLabel(card) {
  switch (card.kind) {
    case 'piece': return { titulo: PIECES[card.type].name, texto: 'Libera a peça' };
    case 'upgrade': return { titulo: PIECES[card.type].name, texto: `Nível ${card.piece.level} → ${card.piece.level + 1}` };
    case 'wind': return { titulo: 'Corda', texto: `+${B.shop.windGain} agora e no máximo` };
    case 'speed': return { titulo: 'Mecanismo', texto: '+10% nos ponteiros' };
    default: return { titulo: '?', texto: '' };
  }
}

export function createShop() {
  return { offer: [], rerolls: 0, bought: new Set() };
}

export function rerollCost(shop) {
  return B.shop.rerollBase + B.shop.rerollStep * shop.rerolls;
}

/** Sorteia `cards` cartas distintas do pool, com o RNG semeado da partida. */
export function roll(shop, run, pieces) {
  const disponivel = pool(run, pieces).filter((c) => !shop.bought.has(c.id));
  const escolhidas = [];
  const resto = [...disponivel];
  while (escolhidas.length < B.shop.cards && resto.length) {
    const i = Math.floor(run.rng.next() * resto.length);
    escolhidas.push(resto.splice(i, 1)[0]);
  }
  shop.offer = escolhidas;
}

export function open(shop, run, pieces) {
  shop.rerolls = 0;
  shop.bought.clear();
  roll(shop, run, pieces);
}
