// mulberry32 com semente e contador de chamadas. SPEC §11.
//
// O contador existe para o save: na restauração recriamos o gerador com a
// mesma semente e o chamamos `calls` vezes em vazio, e a partida volta
// determinística sem precisar serializar o estado interno.

export function createRng(seed) {
  let a = seed >>> 0;
  let calls = 0;

  function next() {
    calls++;
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    seed,
    next,
    get calls() { return calls; },

    /** Inteiro em [min, max], inclusivo. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },

    pick(list) {
      return list[Math.floor(next() * list.length)];
    },

    /** Reavança o gerador `n` vezes em vazio. Usado ao restaurar o save. */
    replay(n) {
      for (let i = 0; i < n; i++) next();
    },
  };
}

export function randomSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}
