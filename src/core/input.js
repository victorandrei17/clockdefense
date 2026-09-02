// PointerEvents apenas — nada de misturar mouse e touch. SPEC §12.
//
// A única coisa que este módulo faz é traduzir coordenadas de tela para a
// resolução lógica 720×1280, que é onde toda a geometria do jogo vive.

export function createInput(canvas, view) {
  return {
    toLogical(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * view.w,
        y: ((clientY - r.top) / r.height) * view.h,
      };
    },
  };
}
