// Loop com timestep fixo e acumulador.
//
// O update roda sempre com o mesmo dt: a lógica de jogo nunca vê um frame
// irregular. O acumulador é clampado em 250 ms — quando o WebView engasga ou
// o app volta do background, descartamos o tempo excedente em vez de rodar
// centenas de passos de uma vez.

export const STEP = 1 / 60;
export const MAX_FRAME = 0.25;

/**
 * @param {object} o
 * @param {(dt: number) => void} o.update  passo fixo de STEP segundos
 * @param {(alpha: number, dt: number) => void} o.render
 *        alpha = sobra do acumulador (0..1), dt = tempo real do frame
 */
export function createLoop({ update, render }) {
  let raf = 0;
  let running = false;
  let last = 0;
  let acc = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);

    const dt = (now - last) / 1000;
    last = now;

    acc += Math.min(dt, MAX_FRAME);
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }

    render(acc / STEP, dt);
  }

  return {
    start() {
      if (running) return;
      running = true;
      // Zera a referência de tempo: sem isso o primeiro frame depois de uma
      // pausa chega com dt enorme e queima o orçamento inteiro do clamp.
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    },

    stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    },

    get running() { return running; },
  };
}
