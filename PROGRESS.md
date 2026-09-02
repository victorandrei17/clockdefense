# Marcos de desenvolvimento

Fila de trabalho. **Um marco por vez, na ordem.** Não adiante código de marcos futuros.

Cada marco tem um **critério de pronto** verificável. Se o critério não pode ser demonstrado rodando o jogo, o marco não está pronto — mesmo que todos os checkboxes estejam marcados.

Estado: `[ ]` pendente · `[~]` em andamento · `[x]` pronto

---

## M0 — Esqueleto e build

**Objetivo:** ter algo rodando no celular no primeiro dia.

- [x] `npm init`, esbuild, scripts `dev` / `build` / `android`
- [x] `npm run dev` serve na rede local (`--serve --servedir` com host acessível), não só em localhost
- [x] `index.html` com viewport correto, `touch-action: none`, `user-select: none`
- [x] Canvas 720×1280 lógico, letterbox, `devicePixelRatio` limitado a 2, `setTransform` global
- [x] Loop com timestep fixo 1/60 + acumulador clampado em 250 ms
- [x] Contador de FPS no canto

**Pronto quando:** o celular abre a tela pelo IP da máquina e mostra 60 fps estáveis num fundo `#14110E`. Girar o aparelho não quebra o layout.

**Notas:**

Arquivos: `package.json`, `build.mjs`, `index.html`, `src/main.js`, `src/core/loop.js`.

- **Build.** `build.mjs` usa a API JS do esbuild em vez do CLI, porque o mesmo
  arquivo serve dev e produção. O `index.html` entra como entry point com
  `loader: { '.html': 'copy' }` — assim o esbuild o copia para `dist/` e o
  mantém no watch junto com o código. Saída `format: 'iife'`, alvo
  `es2020` / `chrome80`.
- **Dev server.** `ctx.serve({ servedir: 'dist', host: '0.0.0.0', port: 8000 })`.
  O `0.0.0.0` é o que faz o esbuild aceitar conexão do celular e imprimir a
  URL de rede junto com a local.
- **`__DEV__`.** Define do esbuild (`true` no dev, `false` no build). O
  minificador elimina os blocos de dev da produção — conferido: `strokeRect`,
  `ups` e `window.__RELOGIO__` não aparecem no `dist/bundle.js` de release.
  É por aqui que o `window.BALANCE` do M1 vai ser exposto.
- **Escala.** `#stage` é um div com o retângulo do letterbox; canvas e camada
  de HUD dividem o mesmo rect. `scale = min(vw/720, vh/1280)`, backing store
  = css × `min(devicePixelRatio, 2)`, e `setTransform(backingW/720, 0, 0,
  backingH/1280, 0, 0)`. Todo o desenho usa as coordenadas lógicas. Trocar
  `canvas.width` reseta o contexto, então o `setTransform` vem depois.
- **HUD.** O contador de FPS é DOM (regra do CLAUDE.md) e só toca o
  `textContent` quando o texto muda. No dev mostra também `ups` — updates por
  segundo — que é o que prova que o timestep fixo está rodando a 60 Hz
  independente do que a tela entrega.
- **Contorno lógico.** Retângulo de 1 px em latão na borda dos 720×1280, só no
  dev. Serve para conferir no aparelho se o letterbox está mapeando a área
  certa. Sai da produção junto com o resto do `__DEV__`.
- **`orientationchange`.** No WebView do Android o `innerWidth`/`innerHeight`
  ainda são os antigos quando o evento dispara, então há um `resize` extra
  agendado 250 ms depois.
- **`visibilitychange`** só para e recomeça o loop; o `start()` rezera a
  referência de tempo. A pausa de estado de jogo é do M5, e o reposicionamento
  de ponteiros sem disparo é do M2.
- **`npm run android`** existe mas só funciona depois do M10 — o Capacitor
  ainda não está instalado.

**Verificação.** Chromium headless em viewport de celular (412×892 @ dpr
2,625), servido pelo dev server:

- 60 fps e 60 ups estáveis; nenhum erro de runtime.
- Pixel do fundo lido do canvas = `rgb(20,17,14)` = `#14110E`.
- `devicePixelRatio` real 2,625 → efetivo 2,000 no backing store.
- Aspecto do palco 0,5628 (720/1280 = 0,5625) em retrato e 0,5631 em paisagem;
  sem overflow depois de girar.
- Clamp: travando a thread principal por 2 s, o loop rodou **16** updates. Sem
  clamp seriam ~120; com o clamp de 250 ms, ~15.

Falta o teste que só o aparelho responde: abrir `npm run dev` pelo IP da
máquina num Android real e confirmar os 60 fps lá. No emulado passou tudo.

---

## M1 — Mostrador e ponteiros

**Objetivo:** o relógio existe e gira. Ainda não é jogo.
Referência: SPEC §4, §5.

- [ ] `util/math.js`: `norm()`, `angleDiff()`, `polar()`, graus em toda a lógica
- [ ] `game/board.js`: raios, 6 slots internos, 12 externos, mapa de colunas
- [ ] `render/dial.js`: mostrador estático pré-renderizado **uma vez** em OffscreenCanvas
- [ ] Ponteiros de segundos (60°/s), minutos (12°/s) e horas (1°/s) desenhados e girando
- [ ] Slots vazios visíveis, os órfãos externos marcados diferente

**Pronto quando:** o ponteiro dos segundos completa uma volta em 6 s, o dos minutos em 30 s, e o das horas anda 60° em 60 s — cronometrado. O profiler mostra que `dial.js` não redesenha por frame.

**Notas:**

---

## M2 — Disparo e overlay de debug

**Objetivo:** provar a mecânica central. Este é o marco mais importante do projeto.
Referência: SPEC §5.

- [ ] `crossed()` com wraparound, testado nos casos de borda (0°/360°, dt grande)
- [ ] Cooldown de 0,35 s por peça
- [ ] Guarda: varredura >180° num frame reposiciona sem disparar
- [ ] Um Martelo hardcoded no slot interno 0, com feedback visual claro no disparo
- [ ] Detecção de Meia-Noite (segundos e minutos a <3°) com clarão âmbar
- [ ] **Overlay de debug** (`F1` no desktop, 3 dedos no celular): ângulos dos ponteiros, hitboxes, alcance das peças, dt, fps, contagem de objetos vivos
- [ ] Atalhos de debug: pular hora, spawnar inimigo específico, +100 engrenagens, invencibilidade, pausar ponteiros

**Pronto quando:** o Martelo dispara exatamente uma vez por passagem do ponteiro, o cooldown impede disparo duplo em passagens rápidas, e a Meia-Noite acende a cada 7,5 s avançando 90°, fechando o ciclo nas colunas 0°, 90°, 180° e 270° a cada 30 s.

O overlay não é extra. Ele é mantido até o fim do projeto.

**Notas:**

---

## M3 — Primeiro inimigo e corda

**Objetivo:** dá pra perder.
Referência: SPEC §7 (Poeira), §8.

- [ ] `util/pool.js` e pool de inimigos — zero `new` dentro do loop
- [ ] Poeira: spawn no raio 400, movimento ao centro, HP, morte
- [ ] Dano ao cubo central e destruição no impacto
- [ ] Corda: 100 inicial, dreno 0,4/s, +0,3 por morte, game over em 0
- [ ] Engrenagens somando na morte
- [ ] HUD em DOM: corda, engrenagens, hora — atualizado só na mudança

**Pronto quando:** sem nenhuma peça a corda zera sozinha e o jogo termina. Com o Martelo do M2, você sobrevive visivelmente mais tempo.

**Notas:**

---

## M4 — Colocação e as 6 peças

**Objetivo:** o jogador constrói o mostrador.
Referência: SPEC §6.

- [ ] Painel de peças na base, arrasto até o slot, slots válidos acendendo
- [ ] Popover ao tocar peça colocada: Melhorar / Vender (50%)
- [ ] Martelo, Sino, Mola, Ampulheta, Corrente, Contrapeso — os 3 níveis de cada
- [ ] Corrente só funciona em coluna com par interno+externo; recusa visualmente a colocação inútil
- [ ] Contrapeso acumulando e gastando cargas, com indicador visível
- [ ] Multiplicadores aplicados: minutos ×5, Meia-Noite ×3

**Pronto quando:** dá pra montar um mostrador do zero só com engrenagens ganhas em jogo, e cada peça se comporta de forma perceptivelmente diferente das outras.

**Notas:**

---

## M5 — Estrutura de partida e loja · PORTÃO DE DIVERSÃO

**Objetivo:** uma partida completa, do início ao fim.
Referência: SPEC §9.

- [ ] `rng.js` mulberry32 com semente e contador de chamadas
- [ ] 6 horas de 60 s, transição, ponteiro das horas como progresso
- [ ] Dreno da corda escalando +0,1/s por hora
- [ ] Loja pausada na virada: 4 cartas, reroll 5+3, pool condicional
- [ ] Carta de velocidade escala segundos **e** minutos juntos, preservando a razão 5:1
- [ ] Upgrade só aparece se a peça estiver no mostrador
- [ ] Bônus de fim de hora `10 + 3×hora`
- [ ] Botão "Dar corda" — nunca avança sozinho
- [ ] Telas MENU e GAMEOVER básicas

**Pronto quando:** você joga 6 horas seguidas sem o chefe, com loja em cada virada.

> **Pare aqui e jogue umas 10 partidas antes do M6.** Se não for divertido agora, o problema é o design do núcleo, não a falta de conteúdo. Ajuste `balance.js` — principalmente dreno da corda, custo das peças e os 8 segundos da Meia-Noite — até o loop prender. Adicionar inimigo nenhum vai consertar um núcleo chato.

**Notas de balanceamento:**

---

## M6 — Bestiário completo

**Objetivo:** cada inimigo exige uma resposta diferente.
Referência: SPEC §7.

- [ ] Traça: zigue-zague senoidal
- [ ] Ferrugem: gruda na peça mais próxima, desativa, imune à peça que devora
- [ ] Contratempo: órbita anti-horária, raio decrescente, congela sob ponteiro (<8°)
- [ ] Cupim: gruda no ponteiro dos segundos no raio 190, gira junto, −25% de velocidade acumulável até −60%
- [ ] `waves.data.js`: composição das 6 horas, dificuldade crescente

**Pronto quando:** um build só de Martelos perde para o Cupim. Se não perder, o Cupim está fraco demais e o marco não está pronto.

**Notas:**

---

## M7 — O Cuco

**Objetivo:** dá pra vencer.
Referência: SPEC §7.

- [ ] Máquina de estados de 3 fases: emergir (0,8 s de antecipação), investir, recuar
- [ ] Invulnerabilidade enquanto escondido, 4 Poeiras por ciclo
- [ ] +20% de velocidade de investida por ciclo
- [ ] Tela de vitória

**Pronto quando:** um build competente mata o Cuco em 3–4 ciclos; um build fraco perde. Ambos os casos verificados.

**Notas:**

---

## M8 — Save, marcos e meta progressão

**Objetivo:** motivo para abrir o jogo de novo amanhã.
Referência: SPEC §8 (rubis), §10, §11.

- [ ] `storage.js` com detecção de Capacitor Preferences e fallback localStorage
- [ ] Escrita em dois passos com `.bak`, leitura com recuperação
- [ ] Debounce 500 ms + gravação imediata em `visibilitychange` e `pagehide`
- [ ] `schema.js` com `DEFAULT_SAVE`, `deepMerge`, `migrations.js` com esqueleto
- [ ] Snapshot de `currentRun` **só na loja**, com `seed` + `rngCalls`
- [ ] Retomar partida a partir do snapshot, restaurando RNG e mostrador
- [ ] Os 9 marcos de rubi avaliados no fim da partida, pagos uma vez cada
- [ ] Tela META: 4 desbloqueios, saldo, marcos pendentes como objetivos
- [ ] Cronógrafo funcionando: arrasto, lerp 0,25, ×2, sujeito ao cooldown
- [ ] Aro ampliado adicionando 2 slots em 15° e 195° sem redistribuir os 12 originais

**Pronto quando:** você mata o app pelo gerenciador de tarefas no meio da 4ª hora, reabre, e volta ao começo da 4ª hora com peças, corda e engrenagens corretos. Os rubis sobrevivem a desinstalar e reinstalar? Não — mas sobrevivem a limpar o cache.

**Notas:**

---

## M9 — Áudio, feedback e polimento

**Objetivo:** dá pra jogar de ouvido.
Referência: SPEC §12, §13.

- [ ] WebAudio sintetizado, sem arquivos pesados
- [ ] Timbre distinto por peça; tique-taque como trilha; sino grave na Meia-Noite
- [ ] Partículas pooled; glow por sprite radial pré-renderizado — zero `shadowBlur`
- [ ] Haptics 10 ms: colocar peça, Meia-Noite, perder peça, morte do chefe
- [ ] Ajustes: sfx, música, haptics, `reducedMotion`, canhoto
- [ ] `reducedMotion` troca o pulso da Meia-Noite por mudança de cor estática
- [ ] Passada de arte: paleta do SPEC §13, tipografia, luz vindo do centro

**Pronto quando:** com a tela virada de costas, você identifica pelo som que peça disparou e quando foi Meia-Noite.

**Notas:**

---

## M10 — Android

**Objetivo:** APK instalável.
Referência: SPEC §16.

- [ ] Capacitor init, `@capacitor/preferences`, `@capacitor/haptics`
- [ ] `capacitor.config.json`, orientação travada em retrato no manifest
- [ ] Botão voltar: RUN pausa · SHOP ignora · MENU confirma saída
- [ ] Safe-area aplicada (notch e barra de gestos)
- [ ] Ícone e splash em `#14110E`
- [ ] Build assinado
- [ ] Teste em aparelho real de gama média

**Pronto quando:** o APK instalado roda a 60 fps numa partida completa, o save sobrevive a fechar o app pelo gerenciador de tarefas, e nada da UI fica embaixo do notch ou da barra de gestos.

**Notas:**

---

## Registro de decisões

Anote aqui tudo que divergir do `SPEC.md`, com o motivo. Se a divergência for permanente, atualize o `SPEC.md` também.

| Data | Marco | Decisão | Motivo |
|---|---|---|---|
| 2026-09-02 | pré-M1 | Ponteiro dos minutos 15°/s → **12°/s**, multiplicador ×4 → **×5** | O SPEC dizia que a Meia-Noite avançava 45° por alinhamento, mas com 15°/s o avanço real é 120°: só 3 colunas recebiam o bônus a partida inteira. `avanço = 360/(S/M − 1)` depende só da razão, e 12°/s dá razão 5, avanço de 90° e as 4 colunas 0°/90°/180°/270° — duas pareadas e duas órfãs. É o único valor inteiro limpo que melhora a cobertura; cobrir as 12 exigiria 300/17 ≈ 17,65°/s e multiplicador 3,4. Ver SPEC §5. |
| 2026-09-02 | pré-M1 | Carta de loja passa a escalar o mecanismo inteiro, não só os segundos | Com +30% só nos segundos a razão vira 6,5, o avanço vira 65,45° e o alinhamento cai em 11 ângulos dos quais só 1 tem slot — comprar a carta desligava a Meia-Noite. Escalar segundos e minutos juntos preserva a razão e as 4 colunas, e só aperta a cadência (7,5 s → 5,77 s). Ver SPEC §9. |
| 2026-09-02 | M0 | `src/data/balance.js` ainda não criado | O M0 não tem número de gameplay — 720×1280, dpr 2 e o clamp de 250 ms são técnicos. Criar o arquivo já com os valores do SPEC §15 seria adiantar M1–M5. O define `__DEV__` já está no build para o `window.BALANCE` entrar no M1. |
