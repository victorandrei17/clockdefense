import { createLoop } from './core/loop.js';
import { BALANCE } from './data/balance.js';
import { createClock, advance } from './game/clock.js';
import { createRenderer } from './render/renderer.js';
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
const renderer = createRenderer(ctx, VIEW);

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

function sampleRate(now) {
  frames++;
  const span = now - sampleStart;
  if (span < 500) return;

  const fps = Math.round((frames * 1000) / span);
  const ups = Math.round(((ticks - ticksAtSample) * 1000) / span);
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
  advance(clock, dt);
}

function render() {
  renderer.frame(clock);

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
    VIEW, canvas, ctx, loop, clock, renderer,
    get scale() { return scale; },
    get ticks() { return ticks; },
  };
}
