import { createLoop } from './core/loop.js';
import { BALANCE } from './data/balance.js';
import { createClock, advance } from './game/clock.js';
import { createPiece, updatePieces, canPlace, pieceAt, upgrade, upgradeCost, sellValue } from './game/pieces.js';
import { createEnemies, updateEnemies, damage, termitePenalty } from './game/enemies.js';
import { createEconomy, tick as tickEconomy, spend, creditKill, pay, refund, gainWindMax } from './game/economy.js';
import { createSpawner, updateSpawner, spawnGroup, startHour } from './game/spawner.js';
import { createHud } from './render/ui/hud.js';
import { createPanel } from './render/ui/panel.js';
import { createPopover } from './render/ui/popover.js';
import { createInput } from './core/input.js';
import { PIECES } from './data/pieces.data.js';
import { BALANCE as B } from './data/balance.js';
import { createRun, tickHour, hourBonus, nextHour, isLastHour, handSpeed } from './game/run.js';
import * as rngMod from './util/rng.js';
import * as enemiesMod from './game/enemies.js';
import { createShop, open as openShop, roll, rerollCost, cardCost } from './game/shop.js';
import { createShopUi } from './render/ui/shop.js';
import { createScreens } from './render/ui/screens.js';
import { innerSlots, outerSlots } from './game/board.js';
import { createRenderer } from './render/renderer.js';
import { createDebug } from './render/debug.js';
import { spawnFlash, spawnMidnight, updateFx } from './render/fx.js';
import { LATAO } from './render/palette.js';

// Resolução lógica. Todo desenho usa estas coordenadas; a escala para a tela
// real é feita uma vez por resize, em setTransform.
export const VIEW = { w: 720, h: 1280 };

// WebView de gama média não aguenta 3x. Ver SPEC §2.
const MAX_DPR = 2;

const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const fpsEl = document.getElementById('fps');
const ctx = canvas.getContext('2d', { alpha: false });

const clock = createClock();
const enemies = createEnemies();
const eco = createEconomy();
const spawner = createSpawner();
const run = createRun();
const shop = createShop();

// O mostrador começa vazio: a partir do M4 quem monta é o jogador, com as
// engrenagens iniciais e as que ganhar matando.
const pieces = [];

const renderer = createRenderer(ctx, VIEW);
const hud = createHud();
const input = createInput(canvas, VIEW);
const debug = createDebug({ clock, pieces, enemies, eco, run });

/** Cabe a peça aqui, e dá para pagar? Usado pelo painel e pelo renderer. */
function canPlaceAt(type, ring, slotIndex) {
  return run.unlocked.has(type)
    && eco.gears >= PIECES[type].cost
    && canPlace(type, ring, slotIndex, pieces);
}

const panel = createPanel({
  input,
  canAfford: (custo) => eco.gears >= custo,
  canPlaceAt,
  onPlace(type, ring, slotIndex) {
    if (!canPlaceAt(type, ring, slotIndex)) return;
    if (!pay(eco, PIECES[type].cost)) return;
    pieces.push(createPiece(type, ring, slotIndex));
    popover.fechar();
  },
});

const popover = createPopover({
  onUpgrade(p) {
    const custo = upgradeCost(p);
    if (custo && pay(eco, custo)) upgrade(p);
  },
  onSell(p) {
    refund(eco, sellValue(p));
    const i = pieces.indexOf(p);
    if (i >= 0) pieces.splice(i, 1);
  },
});

// Escala palco -> tela. O HUD (DOM) e o mostrador pré-renderizado dependem dela.
let scale = 1;

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Letterbox: o menor dos dois fatores preserva o aspecto 720x1280.
  scale = Math.min(vw / VIEW.w, vh / VIEW.h);

  const cssW = Math.round(VIEW.w * scale);
  const cssH = Math.round(VIEW.h * scale);

  stage.style.width = `${cssW}px`;
  stage.style.height = `${cssH}px`;
  stage.style.setProperty('--ui', String(scale));

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  // Trocar canvas.width/height reseta todo o estado do contexto,
  // então o setTransform tem que vir depois.
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(canvas.width / VIEW.w, 0, 0, canvas.height / VIEW.h, 0, 0);

  // Px de backing por unidade lógica: é nessa densidade que o mostrador
  // precisa ser rasterizado para não sair borrado nem serrilhado.
  renderer.resize(canvas.width / VIEW.w);
}

let resizePending = false;
function scheduleResize() {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    resize();
  });
}

window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', () => {
  // No WebView do Android innerWidth/innerHeight ainda são os antigos quando
  // este evento dispara; medimos de novo depois que a rotação assenta.
  scheduleResize();
  setTimeout(scheduleResize, 250);
});

// --- Contador de FPS -------------------------------------------------------
// HUD é DOM e só é tocado quando o valor muda. Ver CLAUDE.md.

let frames = 0;
let sampleStart = 0;
let shown = '';

// Acumulado desde o boot: a taxa sai da diferença entre amostras. Manter o
// total também deixa conferir o clamp do acumulador de fora — um travamento
// longo não pode virar uma enxurrada de updates.
let ticks = 0;
let ticksAtSample = 0;
let lastFps = 0;
let lastUps = 0;

function sampleRate(now) {
  frames++;
  const span = now - sampleStart;
  if (span < 500) return;

  const fps = Math.round((frames * 1000) / span);
  const ups = Math.round(((ticks - ticksAtSample) * 1000) / span);
  lastFps = fps;
  lastUps = ups;
  frames = 0;
  ticksAtSample = ticks;
  sampleStart = now;

  // ups confirma que o timestep fixo está mesmo rodando a 60 Hz,
  // independente do que a tela esteja entregando.
  const text = __DEV__ ? `${fps} fps · ${ups} ups` : `${fps} fps`;
  if (text !== shown) {
    shown = text;
    fpsEl.textContent = text;
  }
}

// --- Loop ------------------------------------------------------------------

function update(dt) {
  ticks++;

  // Só a fase 'run' faz o mundo andar. Na loja o jogo fica parado de
  // verdade — nada de loja em tempo real, que no celular é hostil (SPEC §9).
  if (run.phase === 'run') {
    // Cupins vivos freiam so o ponteiro dos segundos — e e isso que quebra a
    // razao 5:1 e desliga a Meia-Noite enquanto eles estiverem la.
    if (!debug.handsPaused) advance(clock, dt, handSpeed(run), termitePenalty(enemies));

    tickEconomy(eco, dt, run.hour);
    updateSpawner(spawner, enemies, dt);
    updateEnemies(enemies, dt, mundoInimigo);
    updatePieces(pieces, clock, dt, world);
    if (clock.midnightStarted) spawnMidnight(clock.midnightAngle);

    if (!eco.alive) terminar();
    else if (tickHour(run, dt)) fecharHora();
  }

  updateFx(dt);
  hud.update(eco, run);
  panel.update(eco, run);
  popover.update(eco, scale);
  shopUi.update(run, shop, eco);
  mostrarHud(run.phase === 'run');
  debug.update(dt, lastFps, lastUps);
}

// O que as peças podem fazer com o mundo. Fica aqui para `pieces.js` não
// precisar conhecer economia nem efeitos visuais.
const world = {
  enemies,
  hit(e, dano) {
    if (damage(enemies, e, dano)) {
      creditKill(eco, e.type);
      spawnFlash(e.x, e.y, 24);
    }
  },
  flash(x, y, r) {
    spawnFlash(x, y, r);
  },
};

/** O que os inimigos precisam saber do mundo para se comportar. */
const mundoInimigo = {
  clock,
  pieces,
  /** Alcançou o cubo: tira da corda e morre no impacto. */
  onReach(e) {
    spend(eco, e.damage);
    spawnFlash(e.x, e.y, 30);
  },
};

// --- ciclo da partida ---------------------------------------------------

function comecar() {
  Object.assign(run, createRun());
  Object.assign(eco, createEconomy());
  Object.assign(spawner, createSpawner());
  Object.assign(clock, createClock());
  enemies.clear();
  pieces.length = 0;
  popover.fechar();
  shopUi.fechar();
  screens.esconderFim();
  screens.mostrarMenu(false);
  startHour(spawner, run.hour);
  run.phase = 'run';
}

/** A hora fechou: paga o bônus, encerra a onda e abre a loja. */
function fecharHora() {
  const ganho = hourBonus(run.hour);
  eco.gears += ganho;
  // A onda fecha com a hora. O SPEC §11 conta com isso: o snapshot é tirado
  // na loja justamente por não haver inimigo em voo para serializar.
  enemies.clear();
  popover.fechar();
  run.phase = 'shop';
  openShop(shop, run, pieces);
  shopUi.abrir(run, shop, eco, ganho);
}

/** Único jeito de sair da loja. Nunca avança sozinho. */
function seguir() {
  shopUi.fechar();
  if (isLastHour(run)) {
    run.won = true;
    terminar();
    return;
  }
  nextHour(run);
  startHour(spawner, run.hour);
  run.phase = 'run';
}

function terminar() {
  run.phase = 'gameover';
  screens.fim(run, eco);
}

function comprar(card) {
  if (shop.bought.has(card.id)) return;
  const custo = cardCost(card);
  if (!pay(eco, custo)) return;
  shop.bought.add(card.id);

  switch (card.kind) {
    // A loja é o portão dos tipos de peça: comprar libera o tipo para o
    // resto da partida, e o painel passa a aceitá-lo. Ver SPEC §9 e §10.
    case 'piece': run.unlocked.add(card.type); break;
    case 'upgrade': upgrade(card.piece); break;
    case 'wind': gainWindMax(eco, B.shop.windGain); break;
    case 'speed':
      run.speedCards++;
      // Escala segundos e minutos juntos: a razão 5:1 é o que mantém a
      // Meia-Noite caindo em cima de slot (SPEC §5, §9).
      run.speedBonus += B.shop.speedStep;
      break;
  }
}

function trocarCartas() {
  if (!pay(eco, rerollCost(shop))) return;
  shop.rerolls++;
  roll(shop, run, pieces);
}

// HUD e painel só existem durante a onda: na loja e nas telas eles poluiriam
// o cabeçalho por baixo do overlay.
const elTopbar = document.getElementById('topbar');
const elPanel = document.getElementById('panel');
let hudVisivel = null;
function mostrarHud(sim) {
  if (sim === hudVisivel) return;
  hudVisivel = sim;
  elTopbar.hidden = !sim;
  elPanel.hidden = !sim;
}

const shopUi = createShopUi({ onBuy: comprar, onReroll: trocarCartas, onContinue: seguir });
const screens = createScreens({ onStart: comecar, onRestart: comecar });

// Toque numa peça colocada abre o popover. Um toque é pointerdown e pointerup
// perto um do outro; qualquer arrasto maior é outra coisa.
let toqueEm = null;
canvas.addEventListener('pointerdown', (e) => {
  if (panel.drag.type) return;
  toqueEm = input.toLogical(e.clientX, e.clientY);
});
canvas.addEventListener('pointerup', (e) => {
  if (panel.drag.type || !toqueEm) return;
  const p = input.toLogical(e.clientX, e.clientY);
  const arrastou = Math.hypot(p.x - toqueEm.x, p.y - toqueEm.y) > 18;
  toqueEm = null;
  if (arrastou) return;

  const alvo = pieces.find((q) => Math.hypot(q.x - p.x, q.y - p.y) <= 24);
  if (alvo) popover.abrir(alvo);
  else popover.fechar();
});

function render() {
  renderer.frame(clock, pieces, enemies, panel.drag, canPlaceAt);
  debug.draw(ctx);

  if (__DEV__) {
    // Contorno da área lógica: prova, no aparelho, que o letterbox mapeia
    // 720x1280 exatamente sobre a região visível. Sai no build de produção.
    ctx.strokeStyle = LATAO;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, VIEW.w - 1, VIEW.h - 1);
    ctx.globalAlpha = 1;
  }

  sampleRate(performance.now());
}

const loop = createLoop({ update, render });

// Atalhos que o M2 deixou pendentes, agora que existe sistema para eles agir.
// O marco pede "spawnar inimigo específico": T cicla o tipo, E solta.
const TIPOS = ['dust', 'moth', 'rust', 'counterbeat', 'termite'];
let tipoDebug = 0;
debug.addShortcut('e', 'spawna inimigo', () => spawnGroup(spawner, enemies, TIPOS[tipoDebug]));
debug.addShortcut('t', 'troca o tipo', () => { tipoDebug = (tipoDebug + 1) % TIPOS.length; });
debug.addShortcut('g', '+100 engrenagens', () => { eco.gears += 100; });
debug.addShortcut('i', 'invencibilidade', () => { eco.invincible = !eco.invincible; });
debug.addShortcut('r', 'reinicia', comecar);
debug.addShortcut('h', 'pula hora', () => { if (run.phase === 'run') fecharHora(); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) loop.stop();
  else loop.start();
});

resize();
screens.mostrarMenu(true);
sampleStart = performance.now();
loop.start();

if (__DEV__) {
  window.BALANCE = BALANCE;
  window.__RELOGIO__ = {
    VIEW, canvas, ctx, loop, clock, renderer, pieces, debug,
    enemies, eco, spawner, panel, popover, canPlaceAt, run, shop,
    comecar, fecharHora, seguir, comprar, trocarCartas, rngMod, enemiesMod,
    // Coloca sem pagar nem checar. Só para teste e depuração.
    place: (type, ring, slot) => {
      const p = createPiece(type, ring, slot);
      pieces.push(p);
      return p;
    },
    slots: { inner: innerSlots, outer: outerSlots },
    get scale() { return scale; },
    get ticks() { return ticks; },
  };
}
