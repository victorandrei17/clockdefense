// Pool de objetos. Tudo é alocado no boot; o loop só liga e desliga itens.
// Nada de `new` dentro do loop — ver CLAUDE.md.

/**
 * @param {number} size quantidade fixa de itens
 * @param {() => object} factory cria um item zerado
 */
export function createPool(size, factory) {
  const items = new Array(size);
  for (let i = 0; i < size; i++) {
    items[i] = factory();
    items[i].active = false;
  }

  // Cursor rotativo: sem ele, procurar um item livre varre o array inteiro
  // toda vez que os primeiros índices estão ocupados.
  let cursor = 0;

  return {
    items,
    size,

    /** Item livre, já marcado como ativo. `null` se o pool encheu. */
    take() {
      for (let i = 0; i < size; i++) {
        const idx = (cursor + i) % size;
        const item = items[idx];
        if (item.active) continue;
        cursor = (idx + 1) % size;
        item.active = true;
        return item;
      }
      return null;
    },

    release(item) {
      item.active = false;
    },

    alive() {
      let n = 0;
      for (let i = 0; i < size; i++) if (items[i].active) n++;
      return n;
    },

    clear() {
      for (let i = 0; i < size; i++) items[i].active = false;
      cursor = 0;
    },
  };
}
