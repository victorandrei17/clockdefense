import { createLoop } from './core/loop.js';
import { BALANCE } from './data/balance.js';
import { createClock, advance } from './game/clock.js';
import { createPiece, updatePieces } from './game/pieces.js';
import { createEnemies, updateEnemies, damage, nearest, spawn } from './game/enemies.js';
import { createEconomy, tick as tickEconomy, spend, creditKill } from './game/economy.js';
import { createSpawner, updateSpawner, spawnGroup } from './game/spawner.js';
import { createHud } from './render/ui/hud.js';
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

// Martelos fixos nos slots internos 0, 2 e 4 — 120° um do outro. Três porque
// uma peça só cobre 15,5% das direções e não muda a partida de forma
// perceptível; ver a tabela no M3 do PROGRESS.md. A colocação pelo jogador
// é do M4.
const pieces = [0, 2, 4].map((slot) => createPiece('hammer', 'inner', slot));

const renderer = createRenderer(ctx, VIEW);
const hud = createHud();
const debug = createDebug({ clock, pieces, enemies, eco });

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

  if (eco.alive) {
    if (!debug.handsPaused) advance(clock, dt);

    tickEconomy(eco, dt);
    updateSpawner(spawner, enemies, dt);
    updateEnemies(enemies, dt, onReach);
    updatePieces(pieces, clock, dt, onFire);
    if (clock.midnightStarted) spawnMidnight(clock.midnightAngle);
  }

  updateFx(dt);
  hud.update(eco);
  debug.update(dt, lastFps, lastUps);
}

function onFire(piece, mult) {
  // Clarão maior quando o multiplicador é maior: dá para ver de longe que
  // aquele disparo valeu mais.
  spawnFlash(piece.x, piece.y, 34 + 6 * Math.min(mult, 15));

  // Martelo: dano único no inimigo mais próximo dentro do alcance (SPEC §6).
  const alvo = nearest(enemies, piece.x, piece.y, piece.range);
  if (!alvo) return;
  if (damage(enemies, alvo, piece.damage * mult)) {
    creditKill(eco, alvo.type);
    spawnFlash(alvo.x, alvo.y, 24);
  }
}

/** Inimigo alcançou o cubo: tira da corda e morre no impacto. */
function onReach(e) {
  spend(eco, e.damage);
  spawnFlash(e.x, e.y, 30);
}

function restart() {
  Object.assign(eco, createEconomy());
  Object.assign(spawner, createSpawner());
  Object.assign(clock, createClock());
  enemies.clear();
  for (const p of pieces) { p.cooldown = 0; p.flash = 0; p.shots = 0; p.lastMult = 0; p.lastHand = ''; }
}

function render() {
  renderer.frame(clock, pieces, enemies);
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

hud.onRestart(restart);

// Atalhos que o M2 deixou pendentes, agora que existe sistema para eles agir.
debug.addShortcut('e', 'spawna Poeira', () => spawnGroup(spawner, enemies));
debug.addShortcut('g', '+100 engrenagens', () => { eco.gears += 100; });
debug.addShortcut('i', 'invencibilidade', () => { eco.invincible = !eco.invincible; });
debug.addShortcut('r', 'reinicia', restart);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) loop.stop();
  else loop.start();
});

resize();
sampleStart = performance.now();
loop.start();

if (__DEV__) {
  window.BALANCE = BALANCE;
  window.__RELOGIO__ = {
    VIEW, canvas, ctx, loop, clock, renderer, pieces, debug,
    enemies, eco, spawner, restart,
    get scale() { return scale; },
    get ticks() { return ticks; },
  };
}
