// Peças no mostrador: colocação, disparo e efeitos. SPEC §5, §6.
import { BALANCE as B } from '../data/balance.js';
import { PIECES } from '../data/pieces.data.js';
import { crossed, norm } from '../util/math.js';
import { slotsOf, isPairedSlot, COLUMN_STEP } from './board.js';
import { damage, nearest, slow, push, eachInCircle, eachInColumn } from './enemies.js';

/**
 * Ponteiros que disparam, em ordem decrescente de multiplicador.
 *
 * A ordem importa: o cooldown é por peça, e durante a Meia-Noite os dois
 * ponteiros cruzam o mesmo slot interno com poucos milissegundos de
 * diferença. Testando o de maior multiplicador primeiro, o cooldown nunca
 * engole o disparo grande em favor do pequeno. Ver SPEC §5.
 */
const FIRING_HANDS = [
  { key: 'minute', angle: 'minute', prev: 'prevMinute', inner: true, outer: false, mult: B.hands.minute.mult },
  { key: 'second', angle: 'second', prev: 'prevSecond', inner: true, outer: true,  mult: B.hands.second.mult },
];

/** Largura da faixa da Corrente, em px de cada lado da linha da coluna. */
const CHAIN_WIDTH = 16;

export function createPiece(type, ring, slotIndex, level = 1) {
  const slot = slotsOf(ring)[slotIndex];
  const data = PIECES[type];
  return {
    type,
    ring,
    slot: slotIndex,
    angle: slot.angle,
    x: slot.x,
    y: slot.y,
    level,
    // Total gasto na peça. A venda devolve metade disto.
    invested: data.cost,
    cooldown: 0,
    flash: 0,
    // Ferrugem grudada desativa a peça até ser morta.
    disabled: false,
    shots: 0,
    lastMult: 0,
    lastHand: '',
    // Contrapeso.
    charges: 0,
    // Ampulheta nível 3: enquanto > 0, a zona de lentidão fica de pé.
    zoneTime: 0,
    // Mola nível 3: 1 empurra para fora, -1 para dentro.
    pushDir: 1,
  };
}

export function stats(p) {
  return PIECES[p.type].levels[p.level - 1];
}

export function maxLevel(p) {
  return p.level >= PIECES[p.type].levels.length;
}

export function upgradeCost(p) {
  return maxLevel(p) ? 0 : PIECES[p.type].upgrade[p.level - 1];
}

export function sellValue(p) {
  return Math.floor(p.invested * B.pieces.sellRatio);
}

export function upgrade(p) {
  if (maxLevel(p)) return false;
  p.invested += upgradeCost(p);
  p.level++;
  return true;
}

export function pieceAt(pieces, ring, slotIndex) {
  return pieces.find((p) => p.ring === ring && p.slot === slotIndex) ?? null;
}

/**
 * Dá para colocar `type` neste slot? Slot ocupado nunca serve; a Corrente
 * ainda exige coluna com par interno+externo, senão não teria o que ligar.
 */
export function canPlace(type, ring, slotIndex, pieces) {
  if (pieceAt(pieces, ring, slotIndex)) return false;
  if (PIECES[type].columnOnly && !isPairedSlot(ring, slotIndex)) return false;
  return true;
}

// --- efeitos ---------------------------------------------------------------
//
// `mult` vem do ponteiro (×5 nos minutos) e da Meia-Noite (×3). Multiplica
// dano, e só dano: Mola e Ampulheta não ganham nada de passar um ponteiro
// mais lento em cima, porque não causam dano nenhum.

const EFFECTS = {
  hammer(p, st, mult, w) {
    let anterior = null;
    for (let i = 0; i < st.targets; i++) {
      const alvo = nearest(w.enemies, p.x, p.y, PIECES.hammer.range, anterior);
      if (!alvo) return;
      anterior = alvo;
      w.hit(alvo, st.damage * mult);
    }
  },

  bell(p, st, mult, w) {
    eachInCircle(w.enemies, p.x, p.y, st.radius, (e) => w.hit(e, st.damage * mult));
    w.flash(p.x, p.y, st.radius * 0.9);
  },

  spring(p, st, mult, w) {
    eachInCircle(w.enemies, p.x, p.y, PIECES.spring.range, (e) => {
      push(w.enemies, e, st.push * p.pushDir);
    });
  },

  hourglass(p, st, mult, w) {
    eachInCircle(w.enemies, p.x, p.y, PIECES.hourglass.range, (e) => {
      slow(e, st.slow, st.duration);
    });
    if (st.zone) p.zoneTime = st.zone;
  },

  chain(p, st, mult, w) {
    const r0 = B.board.inner;
    const r1 = B.board.outer;
    for (let d = -st.neighbours; d <= st.neighbours; d++) {
      const ang = norm(p.angle + d * COLUMN_STEP);
      eachInColumn(w.enemies, ang, r0, r1, CHAIN_WIDTH, (e) => w.hit(e, st.damage * mult));
    }
  },

  counterweight(p, st, mult, w) {
    const alvo = nearest(w.enemies, p.x, p.y, PIECES.counterweight.range);
    // Sem alvo, guarda a carga. É o que faz a peça valer num slot por onde
    // passa pouco inimigo: o ponteiro dos segundos cruza toda peça a cada
    // 6 s, então gastar no vazio impediria de sair de 6 cargas — o teto de 8
    // do SPEC seria inalcançável e a peça perderia o propósito.
    if (!alvo) return;
    w.hit(alvo, st.damage * p.charges * mult);
    // Nível 3 guarda as cargas na Meia-Noite: é o pagamento por ter
    // colocado a peça num slot ruim e esperado.
    if (!(st.keepOnMidnight && w.midnight)) p.charges = 0;
  },
};

/** Uma peça sem alvo nenhum ainda gasta o disparo. É assim de propósito. */
export function updatePieces(pieces, clock, dt, world) {
  // `hits` conta acertos deste frame, para saber se o disparo encontrou algo.
  const w = { ...world, midnight: clock.midnight, hits: 0 };
  const hitOriginal = world.hit;
  w.hit = (e, d) => { w.hits++; hitOriginal(e, d); };

  for (const p of pieces) {
    const st = stats(p);

    // Peça devorada por uma Ferrugem não faz nada até um vizinho resolver.
    if (p.disabled) { p.flash = 0; continue; }

    if (p.flash > 0) p.flash = Math.max(0, p.flash - dt / 0.18);

    // Contrapeso: acumula carga enquanto não dispara.
    if (p.type === 'counterweight') {
      p.charges = Math.min(st.maxCharges, p.charges + B.pieces.chargePerSecond * dt);
    }

    // Ampulheta nível 3: a zona segue segurando quem entrar.
    if (p.zoneTime > 0) {
      p.zoneTime -= dt;
      eachInCircle(w.enemies, p.x, p.y, PIECES.hourglass.range, (e) => {
        slow(e, st.slow, 0.2);
      });
    }

    if (p.cooldown > 0) {
      p.cooldown -= dt;
      // Em cooldown nem testa: é isso que impede o abuso do Cronógrafo.
      if (p.cooldown > 0) continue;
      p.cooldown = 0;
    }

    for (const h of FIRING_HANDS) {
      if (p.ring === 'inner' ? !h.inner : !h.outer) continue;
      if (!crossed(clock[h.prev], clock[h.angle], p.angle)) continue;

      // A Meia-Noite vale para a coluna sob os ponteiros; como o disparo
      // acontece exatamente onde o ponteiro está, estar na janela já
      // significa estar sob eles.
      const mult = h.mult * (clock.midnight ? B.fire.midnightMult : 1);

      p.cooldown = B.fire.pieceCooldown;
      p.shots++;
      p.lastMult = mult;
      p.lastHand = h.key;

      // Passagem em falso tem de parecer passagem em falso. Antes toda
      // passagem acendia igual, e como ~5 de 6 não encontram alvo, o jogo
      // parecia disparar sem matar. Agora o clarão cheio é só de quem acerta.
      const antes = w.hits;
      EFFECTS[p.type](p, st, mult, w);
      const acertou = w.hits > antes;
      p.flash = acertou ? 1 : 0.25;
      if (acertou) w.flash(p.x, p.y, 34 + 6 * Math.min(mult, 15));
      break; // uma peça dispara uma vez por frame
    }
  }
}
