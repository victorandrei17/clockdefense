# O Último Relógio — Especificação de Design

> Fonte da verdade do design. A fila de trabalho está em `PROGRESS.md`.
> Números são valores iniciais para ajuste, não verdades absolutas. Todos vivem em `src/data/balance.js`.

---

## 1. Pitch

Tower defense circular onde o jogador **é** um relógio mecânico. Torres não atiram sozinhas: elas são peças encaixadas no mostrador e só disparam **no instante em que um ponteiro passa por cima delas**. O jogo vira um sequenciador — o que importa é *onde* e *em que ordem* as coisas acontecem, não DPS bruto.

Uma partida dura 6 horas de relógio (~8 min reais). Meia-noite é o chefe.

---

## 2. Restrições técnicas

- **HTML5 + Canvas 2D + JavaScript vanilla.** Sem framework, sem engine, sem dependência de runtime.
- Alvo: **Android via Capacitor** (WebView). Rodar também em navegador desktop para desenvolvimento.
- **Bundle único** gerado por esbuild. Escreva em ES Modules; empacote em um `bundle.js` IIFE.
- **Orientação retrato travada.** Resolução lógica **720×1280**, escalada por letterbox.
- Zero requisições de rede em runtime.
- 60 fps em Android de gama média (referência: Snapdragon 665, 4 GB RAM).

### Regras de performance para WebView

Não são opcionais — WebView é bem mais lento que Chrome desktop:

- **Nunca use `ctx.shadowBlur`.** Glow com gradientes radiais pré-renderizados.
- Mostrador estático pré-renderizado uma vez em `OffscreenCanvas`.
- Object pooling obrigatório para inimigos, projéteis e partículas.
- `devicePixelRatio` limitado a 2.
- HUD em camada DOM separada, atualizada só na mudança de valor.
- Loop com timestep fixo (`1/60`) e acumulador, clampado em 250 ms.
- `ctx.setTransform()` para escala global.

---

## 3. Estrutura de arquivos

```
/
├── index.html
├── capacitor.config.json
├── build.mjs
└── src/
    ├── main.js
    ├── core/       loop.js state.js input.js events.js
    ├── game/       clock.js board.js pieces.js enemies.js
    │               spawner.js boss.js economy.js run.js
    ├── data/       balance.js pieces.data.js enemies.data.js waves.data.js
    ├── render/     renderer.js dial.js fx.js debug.js ui/
    ├── audio/      audio.js
    ├── save/       storage.js schema.js migrations.js
    └── util/       math.js rng.js pool.js
```

---

## 4. Geometria do tabuleiro

Centro em `(360, 700)` na resolução lógica — deslocado para baixo, porque o topo é HUD e o polegar alcança melhor a metade inferior.

| Elemento | Raio |
|---|---|
| Cubo central | 44 |
| **Aro interno** — 6 slots | 150 |
| **Aro externo** — 12 slots | 260 |
| Borda do mostrador | 300 |
| Raio de spawn | 400 |

**Convenção de ângulo:** 0° = 12 horas, horário positivo, em graus.

- Slot interno `i` → ângulo `i * 60`
- Slot externo `j` → ângulo `j * 30`

**Coluna** = mesmo ângulo. O slot interno `i` alinha com o externo `2i`. Logo **só 6 das 12 colunas externas têm par interno** — os 6 slots externos ímpares são órfãos. Intencional: cria posições boas e ruins, e obriga a planejar.

---

## 5. Os ponteiros

| Ponteiro | Velocidade | Alcança | Multiplicador | Disponibilidade |
|---|---|---|---|---|
| **Segundos** | 60°/s (volta em 6 s) | ambos os aros | ×1 | sempre |
| **Minutos** | 15°/s (volta em 24 s) | só aro interno | ×4 | sempre |
| **Horas** | 1°/s | nenhum | — | sempre (só indicador) |
| **Cronógrafo** | arrasto do jogador | ambos os aros | ×2 | desbloqueável |

**Ponteiro das horas = barra de progresso diegética.** Uma hora = 60 s reais = 60° de arco. Seis horas fecham o círculo. Não dispara nada.

### Detecção de disparo

A cada frame, para cada ponteiro, teste se ele **cruzou** o ângulo de cada slot ocupado entre `anguloAnterior` e `anguloAtual`, tratando wraparound.

```js
// util/math.js
export function crossed(prev, curr, target, clockwise = true) {
  const d = clockwise ? norm(curr - prev) : norm(prev - curr);
  const t = clockwise ? norm(target - prev) : norm(prev - target);
  return t <= d && d < 180; // d<180 evita falso positivo em dt gigante
}
```

Se o ponteiro varrer mais de 180° num frame (app voltando do background), **não dispare nada** — só reposicione.

**Cooldown por peça: 0,35 s.** Impede que o jogador chacoalhe o Cronógrafo em cima de uma peça e gere dano infinito. É o único freio anti-abuso do sistema.

### Meia-Noite

Quando segundos e minutos ficam a **menos de 3°** um do outro, a coluna sob eles recebe **×3** adicional. Velocidade relativa 45°/s → alinhamento a cada **8 s**, sempre 45° adiante do anterior. Previsível, mas móvel. Marque com clarão âmbar e sino grave.

### Cronógrafo (desbloqueável)

Ponteiro extra controlado por arrasto em qualquer lugar do mostrador. Segue o ângulo do dedo com `lerp` (0,25/frame) — não teleporta. Ao soltar, fica parado onde estava. É a única ação ativa durante a onda.

---

## 6. As 6 peças

| Peça | Custo | Efeito | Alcance | Nível 2 | Nível 3 |
|---|---|---|---|---|---|
| **Martelo** | 10 | Dano único no inimigo mais próximo | 70 | dano ×1,8 | atinge 2 alvos |
| **Sino** | 25 | Dano em área ao redor do slot | 90 | raio +40% | aplica surdez (remove buffs) |
| **Mola** | 15 | Empurra 80 px para fora. Sem dano | 80 | empurrão 140 px | escolha na compra: fora ou dentro |
| **Ampulheta** | 20 | Lentidão −40% por 2,5 s | 100 | −60% | zona persiste 4 s |
| **Corrente** | 40 | Liga externo↔interno da coluna, dana tudo no segmento | coluna | dano ×2 | acerta colunas vizinhas |
| **Contrapeso** | 30 | +1 carga/s sem disparar (máx 8). Dano = base × cargas | 70 | máx 12 | em Meia-Noite não gasta cargas |

**Por que essas seis:**

- Martelo é a linha de base — precisa existir uma peça que sempre funciona.
- Mola e Ampulheta **não dão dano**. Força a pensar em posicionamento. Sem elas o jogo vira "compre mais martelos".
- Corrente **só existe se houver duas peças alinhadas**. Ensina o conceito de coluna sem tutorial escrito.
- Contrapeso premia colocar algo num slot ruim, pouco visitado. Inverte a intuição.

**Colocação:** arraste do painel inferior até um slot vago; slots válidos acendem durante o arrasto. Toque numa peça colocada abre popover com "Melhorar" e "Vender" (devolve 50%).

---

## 7. Os 5 inimigos

Todos surgem no raio 400 e vão ao centro. Ao alcançar o cubo, causam dano na corda e morrem.

**Poeira** — 30 px/s, 8 HP, dano 4, grupos de 6–10. Estrutura da onda e tutorial vivo.

**Traça** — 85 px/s, 5 HP, dano 3. Zigue-zague senoidal (amplitude 25 px, período 0,8 s). Atrapalha mira de alcance curto.

**Ferrugem** — 45 px/s, 20 HP, dano 0. Não vai ao centro: vai até a **peça mais próxima**, gruda e a **desativa até ser morta**. Não pode ser atingida pela peça que devora — um vizinho precisa resolver. Ensina a espalhar defesas.

**Contratempo** — órbita **anti-horária** num raio que decresce 12 px/s. 25 HP, dano 8. **Só se move quando nenhum ponteiro está a menos de 8° dele.** Fácil de travar, difícil de matar sem dano concentrado.

**Cupim** — ignora a corda. Voa até o **ponteiro dos segundos**, gruda no raio 190 e gira junto. Enquanto vivo: **−25% na velocidade do ponteiro dos segundos** (acumula, piso −60%). Como está sempre sob o ponteiro, passa por cima de todas as peças; qualquer peça com alcance ≥60 no aro externo ou ≥45 no interno o acerta. 30 HP.
É o inimigo mais importante do MVP: **ataca o motor, não a vida.** Cria uma segunda coisa para proteger e uma segunda forma de perder.

### O Cuco (chefe, 6ª hora)

400 HP. Ciclo de três fases:

1. **Emerge** de uma portinhola em ângulo aleatório da borda (0,8 s de antecipação com som de mola).
2. **Investe** em linha reta até o cubo a 120 px/s, 25 de dano se conectar. Vulnerável no trajeto todo.
3. **Recua** e some por 4 s, invulnerável, spawnando 4 Poeiras.

Cada ciclo completo aumenta a velocidade de investida em 20%. Morre em 3–4 ciclos com build decente.

---

## 8. Economia

### Corda (vida)
Começa em **100**, máximo 100. Drena **0,4/s**, +0,1/s a cada hora (hora 6 drena 0,9/s). Cada morte devolve **+0,3**. Dano de inimigo subtrai direto. Zero = fim da partida.

O dreno constante impede turtle: você **precisa** matar para não morrer.

### Engrenagens (moeda da partida)
Poeira 2 · Traça 3 · Ferrugem 6 · Contratempo 8 · Cupim 10 · Cuco 60.
Bônus de fim de hora: **10 + 3 × hora**.

### Rubis (moeda permanente)
**Não são farmáveis.** Só saem de marcos, uma vez cada:

| Marco | Rubis |
|---|---|
| Primeira partida concluída (mesmo perdendo) | 5 |
| Alcançar a 3ª hora | 10 |
| Alcançar a 6ª hora | 15 |
| Matar 3 Cupins numa mesma partida | 10 |
| Disparar 10 Meia-Noites numa mesma partida | 10 |
| Matar o Cuco | 25 |
| Segunda vitória | 10 |
| Vencer com uma coluna de Corrente completa | 15 |
| Vencer sem perder nenhuma peça | 20 |

Total: **120 rubis**. Custo dos desbloqueios: **110**. Folga de 10 — apertado de propósito, mas fechável sem grind.

Os marcos de Cupim e de Meia-Noite existem para ensinar mecânica: o jogador só os conquista se entender o motor do jogo.

---

## 9. Loja

Aparece na virada de cada hora, **com o jogo pausado**. Não há loja em tempo real — no celular isso é hostil.

- **4 cartas** sorteadas do pool.
- **Reroll** por 5 engrenagens, +3 a cada uso na mesma visita.
- Pool: peças disponíveis, upgrades de peças já colocadas, `+10 corda` (15), `+10% velocidade do ponteiro dos segundos` (35, máx 3 por partida).
- Botão grande **"Dar corda"** avança para a próxima hora. Nunca avance sozinho.

Carta de upgrade só aparece se a peça correspondente estiver no mostrador. Sem isso a loja enche de lixo.

---

## 10. Meta progressão

| Desbloqueio | Custo | Efeito |
|---|---|---|
| **Cronógrafo** | 50 | Libera o 4º ponteiro, controlado por arrasto |
| **Aro ampliado** | 20 | +2 slots no aro externo (12 → 14) |
| **Corda reforçada** | 15 | +20 de corda inicial e máxima |
| **Contrapeso** | 25 | Adiciona a peça ao pool da loja |

O Cronógrafo é caro de propósito: é o desbloqueio que muda o jogo de "assistir" para "jogar". Chegar nele deve custar 3–4 partidas.

> **Aro ampliado:** mantenha os 12 slots originais nos mesmos ângulos e adicione 2 em ângulos intermediários (15° e 195°), marcados visualmente como improvisados. **Não redistribua o aro** — isso destruiria os builds que o jogador aprendeu.

---

## 11. Save

### Camada de armazenamento

```js
// save/storage.js
const KEY     = 'ultimo-relogio:save';
const KEY_BAK = 'ultimo-relogio:save.bak';

const backend = (globalThis.Capacitor?.Plugins?.Preferences)
  ? {
      get: async k => (await Capacitor.Plugins.Preferences.get({ key: k })).value,
      set: async (k, v) => Capacitor.Plugins.Preferences.set({ key: k, value: v }),
      del: async k => Capacitor.Plugins.Preferences.remove({ key: k }),
    }
  : {
      get: async k => localStorage.getItem(k),
      set: async (k, v) => localStorage.setItem(k, v),
      del: async k => localStorage.removeItem(k),
    };
```

Use **Capacitor Preferences** no Android: o WebView pode limpar `localStorage` quando o sistema recupera espaço. Preferences usa `SharedPreferences` nativo e sobrevive.

**Escrita em dois passos:** antes de sobrescrever a chave principal, copie o conteúdo atual para `KEY_BAK`. Na leitura, se o parse da principal falhar, tente o backup; se ambos falharem, comece do zero.

**Quando gravar:** debounce de 500 ms após mutação; **imediatamente** em `visibilitychange` (`document.hidden`) e `pagehide`. Nunca confie em `beforeunload` no Android.

### Formato

```js
// save/schema.js
export const SAVE_VERSION = 1;

export const DEFAULT_SAVE = {
  version: SAVE_VERSION,
  createdAt: 0,
  updatedAt: 0,

  rubies: 0,

  unlocks: {
    chronograph: false,
    widerRing: false,
    reinforcedWind: false,
    counterweight: false,
  },

  milestones: {
    firstRun: false,
    reachHour3: false,
    reachHour6: false,
    threeTermites: false,
    tenMidnights: false,
    killCuckoo: false,
    secondWin: false,
    chainColumnWin: false,
    flawlessWin: false,
  },

  stats: { runs: 0, wins: 0, bestHour: 0, totalKills: 0, playtimeMs: 0 },

  settings: {
    sfx: true, music: true, haptics: true,
    reducedMotion: false,
    handedness: 'right',   // 'right' | 'left' — espelha painéis da UI
  },

  currentRun: null,
};
```

### Snapshot de partida

**Só serialize no início de cada hora, na loja.** Não tente salvar inimigos, partículas e projéteis no meio da onda — muita complexidade, ganho nulo. Se o app morrer durante a onda, o jogador volta ao começo daquela hora.

```js
currentRun = {
  seed: 1234567890,        // semente mulberry32
  rngCalls: 0,             // reavança o RNG na restauração → determinismo
  hour: 3,                 // hora prestes a começar (1..6)
  wind: 72.5,
  windMax: 100,
  gears: 48,
  handSpeedBonus: 0.1,
  pieces: [
    { ring: 'inner', slot: 2, type: 'hammer', level: 2 },
    { ring: 'outer', slot: 4, type: 'chain',  level: 1 },
  ],
  shopOffer: ['bell', 'upgrade:hammer', 'wind10', 'spring'],
  rerollsUsed: 1,
  runStats: { kills: 0, piecesLost: 0, termitesKilled: 0, midnightsFired: 0 },
};
```

Na restauração: recrie o RNG com `seed`, chame-o `rngCalls` vezes em vazio, reconstrua o mostrador, reabra a loja com `shopOffer`. Ponteiros voltam a 0°.

Ao fim da partida: avalie marcos, credite rubis, **zere `currentRun` para `null`** antes de gravar.

### Migrações

```js
const migrations = {
  // 2: (save) => { save.unlocks.tourbillon = false; return save; },
};

export function migrate(save) {
  let v = save.version ?? 1;
  while (v < SAVE_VERSION) { v++; save = migrations[v](save); save.version = v; }
  return save;
}
```

Sempre faça `deepMerge(DEFAULT_SAVE, saveCarregado)` depois de migrar. Isso preenche campos novos e torna a maioria das migrações desnecessária.

---

## 12. Controles e ergonomia

- **PointerEvents** apenas. Nada de `mousedown`/`touchstart` misturados.
- `touch-action: none` no canvas; `user-select: none`; viewport com `maximum-scale=1, user-scalable=no, viewport-fit=cover`.
- Respeite `env(safe-area-inset-*)`.
- Área tocável mínima **48×48 px** físicos.
- **Duas ações durante a onda:** arrastar (Cronógrafo, colocar peça) e tocar (popover de peça). Nada mais.
- **Haptics** de 10 ms em: colocar peça, Meia-Noite, perder peça, morte do chefe. Nada em cada acerto — vira ruído.
- Opção de canhoto espelha painel de peças e loja.
- Pausar em `visibilitychange`.

---

## 13. Direção de arte

O relógio é um objeto **usado**, não um render limpo. Latão envelhecido, não ouro.

```
--breu      #14110E   fundo, quase preto quente
--latao     #B08A4A   aros, ponteiros, marcações
--patina    #4E6B5C   verde-oxidado, peças de controle
--ambar     #E8A33D   luz, disparos, Meia-Noite
--ferrugem  #8C3B2A   inimigos, dano, alertas
--osso      #E4DCC8   texto, números do mostrador
```

**Tipografia:** uma serifada de aspecto industrial para os números do mostrador; uma sans neutra para HUD e loja. Duas famílias, papéis claramente distintos.

**Luz:** a única fonte é o centro. Peças mais afastadas ficam progressivamente mais escuras. Um disparo ilumina brevemente sua vizinhança — sprites de gradiente radial pré-renderizados, nunca `shadowBlur`.

**Movimento:** os ponteiros já são o movimento do jogo. Não anime mais nada sem motivo. Meia-Noite é o único efeito grande: um pulso âmbar do centro para a borda, uma vez, 400 ms. Com `reducedMotion`, troque por mudança de cor estática.

**Som:** WebAudio sintetizado, sem arquivos pesados. O tique-taque é a trilha. Cada peça tem timbre distinto (martelo = impacto seco, sino = ressonância, corrente = raspado metálico). O jogador deve conseguir jogar **de ouvido**.

---

## 14. Estados de tela

```
BOOT → MENU ⇄ META (desbloqueios)
         ↓
        RUN ⇄ SHOP        (6 ciclos)
         ↓
      GAMEOVER → MENU
```

- **MENU:** título, "Dar corda" (nova partida ou continuar), estatísticas, oficina, ajustes.
- **META:** os 4 desbloqueios, saldo de rubis, marcos pendentes listados como objetivos.
- **GAMEOVER:** hora alcançada, mortes, rubis ganhos com o marco destacado, jogar de novo. Sem tela melancólica — mostre o próximo objetivo.

---

## 15. `balance.js` inicial

```js
export const BALANCE = {
  board: { cx: 360, cy: 700, hub: 44, inner: 150, outer: 260, edge: 300, spawn: 400 },
  hands: { second: 60, minute: 15, hour: 1, chrono: { lerp: 0.25 } },
  fire:  { pieceCooldown: 0.35, midnightArc: 3, midnightMult: 3 },
  wind:  { start: 100, drain: 0.4, drainPerHour: 0.1, perKill: 0.3 },
  run:   { hours: 6, hourSeconds: 60 },
  shop:  { cards: 4, rerollBase: 5, rerollStep: 3 },
  gears: { dust: 2, moth: 3, rust: 6, counterbeat: 8, termite: 10, cuckoo: 60,
           hourBonus: h => 10 + 3 * h },
};
```

Exponha em `window.BALANCE` nos builds de dev. Esses números serão ajustados centenas de vezes.

---

## 16. Empacotamento Android

```bash
npm i -D esbuild @capacitor/cli
npm i @capacitor/core @capacitor/preferences @capacitor/haptics
npx cap init "O Último Relógio" com.seudominio.ultimorelogio
```

`capacitor.config.json`:
```json
{
  "appId": "com.seudominio.ultimorelogio",
  "appName": "O Último Relógio",
  "webDir": "dist",
  "android": { "backgroundColor": "#14110E" },
  "plugins": {
    "SplashScreen": { "launchAutoHide": false, "backgroundColor": "#14110E" }
  }
}
```

Trave a orientação no `AndroidManifest.xml` (`android:screenOrientation="portrait"`). Trate o **botão voltar**: em RUN pausa, em SHOP não faz nada, em MENU pergunta antes de sair.

---

## 17. Fora do MVP

Terceiro aro, ponteiro das horas disparando, evoluções de peça, relíquias, pactos, camada de ritmo, ciclo lunar, os outros três chefes, peças exóticas (Cuco, Carrilhão, Espelho, Diapasão, Âncora, Escapamento), e as Complicações restantes (Tourbillon, Fases da Lua, Repetidor de Minutos, Calendário Perpétuo).

Nada disso entra antes do M10 estar fechado e testado em aparelho real.
