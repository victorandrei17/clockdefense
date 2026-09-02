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

- [x] `util/math.js`: `norm()`, `angleDiff()`, `polar()`, graus em toda a lógica
- [x] `game/board.js`: raios, 6 slots internos, 12 externos, mapa de colunas
- [x] `render/dial.js`: mostrador estático pré-renderizado **uma vez** em OffscreenCanvas
- [x] Ponteiros de segundos (60°/s), minutos (12°/s) e horas (1°/s) desenhados e girando
- [x] Slots vazios visíveis, os órfãos externos marcados diferente

**Pronto quando:** o ponteiro dos segundos completa uma volta em 6 s, o dos minutos em 30 s, e o das horas anda 60° em 60 s — cronometrado. O profiler mostra que `dial.js` não redesenha por frame.

**Notas:**

Arquivos novos: `src/data/balance.js`, `src/util/math.js`, `src/game/board.js`,
`src/game/clock.js`, `src/render/palette.js`, `src/render/dial.js`,
`src/render/renderer.js`. `src/main.js` virou só o bootstrap.

- **`balance.js` entrou** com as seções `board` e `hands` completas, como no
  SPEC §15. As outras (`fire`, `wind`, `run`, `shop`, `gears`) entram com o
  marco que as usa — a regra segue a mesma do M0. Exposto em `window.BALANCE`
  no build de dev.
- **Convenção de ângulo.** `polar()` põe o seno no x e o cosseno negado no y,
  porque 0° aponta para cima e o y da tela cresce para baixo. Os ponteiros não
  usam `polar()`: são desenhados por `translate` + `rotate`, o que evita alocar
  um ponto por frame e já resolve a cauda atrás do eixo.
- **Órfãos marcados por ausência, não por enfeite.** As 6 colunas pareadas
  ganham um raio ligando slot interno e externo; as 6 órfãs não têm raio e o
  contorno do slot é tracejado e mais apagado. Quem olha o mostrador vê onde a
  Corrente vai caber, sem tutorial.
- **Números dentro dos slots externos.** Além de decorar, viram rótulo: dá para
  dizer "martelo no 3". O slot 0 é o "12".
- **Luz do centro** (SPEC §13) virou a função `light(r)`, que multiplica o alpha
  de tudo: 1,0 no eixo caindo para 0,45 na borda. Não há `shadowBlur` em lugar
  nenhum.
- **Cubo central** ganhou o quadrado de dar corda no meio — o verbo do jogo.
- **Rebuild do mostrador.** `dial.resize(escala)` compara o tamanho em pixels
  já arredondado e só rerrasteriza se mudou, então resize repetido no mesmo
  tamanho não custa nada. Fallback para `<canvas>` comum se não houver
  `OffscreenCanvas`.
- **Aro de capítulo em 287.** Primeira versão punha o aro secundário em 280 e
  ele encostava nos slots externos, que terminam em 278. Em 287 ele fecha a
  base das marcações de hora, como num mostrador de verdade.

**Verificação.** Chromium headless, medindo os ponteiros por 13 s reais com
desempacotamento de wraparound:

- segundos 60,25°/s → volta em **5,99 s** (alvo 6)
- minutos 12,05°/s → volta em **29,93 s** (alvo 30)
- horas 1,00°/s → **60,1° em 60 s** (alvo 60)
- `dial.js` rasterizado **1 vez** em 784 updates: não redesenha por frame.
- Girar o aparelho rerrasteriza **exatamente uma vez**, e nada depois disso.
- Sem erros de runtime; build de produção sem `BALANCE`, `__RELOGIO__` nem o
  contorno de debug.

O desvio de ~0,4% acima do alvo é artefato da janela de amostragem, não do
relógio: o acumulador roda um passo a mais que o tempo de parede dentro do
intervalo medido.

---

## M2 — Disparo e overlay de debug

**Objetivo:** provar a mecânica central. Este é o marco mais importante do projeto.
Referência: SPEC §5.

- [x] `crossed()` com wraparound, testado nos casos de borda (0°/360°, dt grande)
- [x] Cooldown de 0,35 s por peça
- [x] Guarda: varredura >180° num frame reposiciona sem disparar
- [x] Um Martelo hardcoded no slot interno 0, com feedback visual claro no disparo
- [x] Detecção de Meia-Noite (segundos e minutos a <3°) com clarão âmbar
- [x] **Overlay de debug** (`F1` no desktop, 3 dedos no celular): ângulos dos ponteiros, hitboxes, alcance das peças, dt, fps, contagem de objetos vivos
- [~] Atalhos de debug: pular hora, spawnar inimigo específico, +100 engrenagens, invencibilidade, pausar ponteiros

**Pronto quando:** o Martelo dispara exatamente uma vez por passagem do ponteiro, o cooldown impede disparo duplo em passagens rápidas, e a Meia-Noite acende a cada 7,5 s avançando 90°, fechando o ciclo nas colunas 0°, 90°, 180° e 270° a cada 30 s.

O overlay não é extra. Ele é mantido até o fim do projeto.

**Notas:**

Arquivos novos: `src/data/pieces.data.js`, `src/game/pieces.js`, `src/render/fx.js`,
`src/render/debug.js`. `crossed()` entrou em `util/math.js`, a Meia-Noite em
`game/clock.js`, e a seção `fire` no `balance.js`.

- **`crossed()` diverge do snippet do SPEC, e o snippet estava errado.** Com
  `t <= d` puro, um ponteiro que termina o frame exatamente em cima do alvo
  dispara duas vezes: uma ao chegar (`t = d`) e outra ao sair (`t = 0`). O
  intervalo tem que ser aberto em `prev` e fechado em `curr`. E com `d = 0`
  — ponteiro pausado — o teste dispararia todo frame. SPEC §5 corrigido.
- **Ordem dos ponteiros importa.** O cooldown é por peça, e na Meia-Noite os
  dois ponteiros cruzam o mesmo slot interno quase juntos. Testando em ordem
  decrescente de multiplicador, o ×15 do ponteiro dos minutos vence; testando
  na ordem oposta, o ×3 dos segundos chegaria primeiro e o pico do jogo
  sumiria. Regra escrita no SPEC §5.
- **`midnightAngle` extrapola até o encontro.** A janela de <3° abre ~3,75°
  antes do alinhamento, então gravar o ângulo do momento marcava a coluna
  errada por 3°. Agora projeta onde os dois se cruzam: `second + S·gap/(S−M)`.
  Com isso as colunas saem em 90,00°, 180,00°, 270,00° e 0,00° cravados.
- **Glow sem `shadowBlur`.** Sprite de gradiente radial em âmbar, construído
  uma vez, blitado com `globalCompositeOperation = 'lighter'`. Flashes vêm de
  um array pré-alocado de 32; pool cheio descarta em vez de alocar. O pool
  genérico de `util/pool.js` entra no M3 com os inimigos.
- **Overlay em duas camadas.** Números em DOM (atualizado a 10 Hz, e só quando
  o texto muda); no canvas só geometria — as 4 colunas da Meia-Noite, hitboxes
  dos slots e alcance das peças. As colunas são derivadas da razão entre os
  ponteiros, não escritas na mão: se as velocidades mudarem, o overlay segue.
- **Os listeners do overlay moram em `debug.js`**, não em `core/input.js`. O
  overlay é dono do próprio gesto de abrir; `input.js` entra no M4, quando
  houver input de jogo de verdade (arrasto para colocar peça).
- **Atalhos de debug ficaram em `[~]`.** Só "pausar ponteiros" tem sistema
  para agir no M2. Pular hora (M5), spawnar inimigo (M3/M6), +100 engrenagens
  e invencibilidade (M3) entram com os marcos que criam essas coisas —
  `debug.addShortcut()` já está pronto para recebê-los.
  **Atualização (M3):** `E` (spawna Poeira), `G` (+100 engrenagens),
  `I` (invencibilidade) e `R` (reinicia) já entraram. Falta só "pular hora",
  que depende da estrutura de partida do M5.

**Verificação.** Chromium headless, com o relógio zerado para o tempo medido
bater com o tempo de jogo:

- `crossed()`: 25 casos unitários — wraparound em 0°/360°, ponteiro parado,
  varredura de 179°/180°/200°/350°, sentido anti-horário, e três voltas
  completas com passo regular e irregular dando exatamente 3 disparos.
- Meia-Noite em 32 s: **t=7,44 → 90,00°**, **t=14,94 → 180,00°**,
  **t=22,44 → 270,00°**, **t=29,94 → 0,00°**. Intervalos de 7,50 s cravados,
  ciclo fechando em 30 s.
- Martelo: 5 disparos em t = 5,99 / 11,99 / 17,99 / 23,99 / 29,99 s. As quatro
  primeiras passagens são do ponteiro dos segundos em ×1; em t=30 os dois
  ponteiros cruzam juntos e sai **um** disparo de **×15** (minutos ×5 ×
  Meia-Noite ×3). Nenhum par de disparos dentro do cooldown.
- Overlay: F1 e 3 dedos abrem e fecham; um dedo não abre; `P` congela e
  solta os ponteiros; o painel mostra todos os campos que o marco pede.
- Custo do pulso da Meia-Noite: **zero**. Com o pulso ativo sem parar,
  59,1 fps contra 59,1 fps parado; mediana 16,70 ms, p95 16,90 ms.

Os 32 fps que aparecem no screenshot da Meia-Noite são artefato do próprio
screenshot, não do efeito — a medição acima foi feita depois, por isso.

`reducedMotion` trocando o pulso por mudança de cor estática é do M9.

---

## M3 — Primeiro inimigo e corda

**Objetivo:** dá pra perder.
Referência: SPEC §7 (Poeira), §8.

- [x] `util/pool.js` e pool de inimigos — zero `new` dentro do loop
- [x] Poeira: spawn no raio 400, movimento ao centro, HP, morte
- [x] Dano ao cubo central e destruição no impacto
- [x] Corda: 100 inicial, dreno 0,4/s, +0,3 por morte, game over em 0
- [x] Engrenagens somando na morte
- [x] HUD em DOM: corda, engrenagens, hora — atualizado só na mudança

**Pronto quando:** sem nenhuma peça a corda zera sozinha e o jogo termina. Com o Martelo do M2, você sobrevive visivelmente mais tempo.

> **A primeira metade do critério passa; a segunda não, e não é ajuste de
> número — é geometria.** Ver "O critério e um Martelo só", abaixo.

**Notas:**

Arquivos novos: `src/util/pool.js`, `src/data/enemies.data.js`,
`src/game/enemies.js`, `src/game/economy.js`, `src/game/spawner.js`,
`src/render/ui/hud.js`. `balance.js` ganhou `wind`, `run`, `gears` e `spawn`.

- **Pool com cursor rotativo.** Tudo alocado no boot; `take()` procura a partir
  do último índice devolvido em vez de varrer do zero toda vez. Pool cheio
  descarta o spawn — perder um inimigo vale mais que alocar dentro do loop.
- **Inimigos em polar.** Guardam `angle` e `radius` e derivam `x`/`y` por
  frame com `sin`/`cos` direto, sem passar por `polar()`, que devolveria um
  objeto novo por inimigo por frame. Polar também é o que vai servir ao
  zigue-zague da Traça e à órbita do Contratempo no M6.
- **A hora sai do tempo decorrido**, em `economy.js`, só para escalar o dreno
  e alimentar o HUD. Transição de hora, loja na virada e bônus de fim de hora
  são do M5.
- **Grupos espalhados pela volta inteira e pingados.** Duas correções que
  vieram da medição, não do papel:
  - A primeira versão soltava cada grupo num arco de 60° com base aleatória.
    Resultado: em ~5 de 6 partidas nenhum inimigo passava perto do slot 0 e a
    peça era decorativa. Num tabuleiro circular a pressão tem que vir de todo
    lado, senão escolher ângulo não significa nada.
  - A segunda versão nascia com o grupo inteiro no mesmo raio, então os 6 a 10
    chegavam juntos e tiravam 24–40 de corda num instante. A morte ficava
    quantizada pela chegada dos grupos: matar dois ou três não mudava o
    instante da morte. Agora o grupo sai pingado (`dripGap`), e cada morte
    tira dano de verdade da conta.
- **`[hidden]` precisou de `!important`.** `#gameover { display: flex }` tem
  especificidade maior que o `display:none` que o navegador dá ao atributo
  `hidden`, então o painel de fim de jogo ficava visível a partida inteira. O
  primeiro teste não pegou porque checava a propriedade `.hidden` em vez da
  visibilidade real; foi o screenshot que denunciou. Os testes agora conferem
  `getClientRects()`.
- **Tela de fim de jogo é provisória.** Um painel com "Dar corda" para
  reiniciar. A GAMEOVER de verdade é do M5.
- **Spawner usa `Math.random()`.** Vira mulberry32 semeado no M5, que é
  quando a partida precisa ser determinística para o save retomar.

**O critério e um Martelo só**

Uma peça cobre uma fatia do mostrador, e a fatia é pequena:

| | cobertura das direções |
|---|---|
| alcance 70 no aro interno (r=150) | **15,5%** |
| alcance 70 no aro externo (r=260) | **8,7%** |

E o ponteiro dos segundos só passa nela a cada 6 s, enquanto um inimigo
atravessa o alcance em 1 a 5 s dependendo do ângulo — então a peça ainda perde
cerca de metade do que entra na fatia. Um Martelo mata ~8% do fluxo.

Medido, 150 partidas por linha:

| peças | sobrevive | ganho | mortes | % do fluxo morto |
|---|---|---|---|---|
| 0 | 46,9 s | — | 0 | 0% |
| 1 | 47,9 s | **+2%** | 2 | 8% |
| 2 | 54,5 s | +16% | 4 | 14% |
| 3 | 60,9 s | +30% | 7 | 23% |
| 6 | 77,4 s | +65% | 21 | 49% |

O sistema escala como deveria — o problema é só o número 1. Nenhum ajuste de
dreno, custo ou volume muda isso, porque o teto é a fração de direções que uma
peça alcança, e ela não depende do fluxo. Baixar o volume até o dreno dominar
também não resolve: aí a peça encontra menos alvos ainda.

Isso está de acordo com o resto do design — SPEC §6 chama o Martelo de "linha
de base", e o CLAUDE.md diz que um jogador puramente defensivo deve perder. Um
Martelo é o build mais defensivo possível.

**Falta decidir** como o critério deve ficar. As opções são reescrevê-lo para
um build pequeno (3 Martelos, +30%, é onde a diferença fica óbvia), ou aceitar
+2% como "visível" e seguir. Não mexi no texto do critério porque isso é
decisão de design, não de implementação.

**Verificação.** Navegador, além da tabela acima:

- HUD começa em corda 100 / hora 1/6 / 0 engrenagens e acompanha a partida.
- Inimigos nascem no raio 400, nenhum além dele, e andam para o centro.
- A corda drena sozinha; o painel de fim de jogo aparece **de verdade** em 0,
  os ponteiros param, e "Dar corda" reinicia zerando o pool.
- Atalhos `E`, `G`, `I` e `R` funcionando; invencibilidade para o dreno.
- Pool nunca passa do tamanho; sem erros de runtime.

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
| 2026-09-02 | M3 | Grupos de Poeira nascem espalhados pela volta inteira e pingados, não num arco fechado nem todos de uma vez | Em arco estreito a utilidade de cada peça vira loteria: medindo, em ~5 de 6 partidas nenhum inimigo passava perto do slot com Martelo. Nascendo todos no mesmo raio, chegam juntos e a morte fica quantizada pela chegada dos grupos, o que zera o efeito de matar dois ou três. |
| 2026-09-02 | M3 | Tela de fim de jogo provisória com botão "Dar corda" | O critério do M3 exige comparar duas partidas; sem reinício isso vira recarregar a página a cada teste. A GAMEOVER de verdade é do M5. |
| 2026-09-02 | M2 | `crossed()` usa intervalo aberto em `prev` e fechado em `curr`, e devolve false com `d = 0` | O snippet do SPEC (`t <= d`) dispara duas vezes quando o ponteiro termina o frame em cima do alvo, e dispara todo frame com o ponteiro pausado. SPEC §5 corrigido no mesmo commit. |
| 2026-09-02 | M2 | Ponteiros testados em ordem decrescente de multiplicador | O cooldown é por peça e na Meia-Noite os dois ponteiros cruzam o mesmo slot interno quase juntos. Na ordem errada o ×3 dos segundos chega antes e engole o ×15 dos minutos. Regra acrescentada ao SPEC §5. |
| 2026-09-02 | M2 | Listeners do overlay em `render/debug.js`, não em `core/input.js` | O overlay é dono do próprio gesto de abrir. Criar `input.js` agora seria um stub que o M4 reescreve quando houver arrasto de peça. |
| 2026-09-02 | M1 | `src/render/palette.js` criado, fora da estrutura do SPEC §3 | A paleta do §13 é usada por `dial.js` e `renderer.js` e não é número de gameplay, então não cabe em `balance.js`. Um módulo de 6 constantes evita repetir hex em dois arquivos. O `index.html` mantém as mesmas cores como CSS vars para o HUD. |
| 2026-09-02 | pré-M1 | Ponteiro dos minutos 15°/s → **12°/s**, multiplicador ×4 → **×5** | O SPEC dizia que a Meia-Noite avançava 45° por alinhamento, mas com 15°/s o avanço real é 120°: só 3 colunas recebiam o bônus a partida inteira. `avanço = 360/(S/M − 1)` depende só da razão, e 12°/s dá razão 5, avanço de 90° e as 4 colunas 0°/90°/180°/270° — duas pareadas e duas órfãs. É o único valor inteiro limpo que melhora a cobertura; cobrir as 12 exigiria 300/17 ≈ 17,65°/s e multiplicador 3,4. Ver SPEC §5. |
| 2026-09-02 | pré-M1 | Carta de loja passa a escalar o mecanismo inteiro, não só os segundos | Com +30% só nos segundos a razão vira 6,5, o avanço vira 65,45° e o alinhamento cai em 11 ângulos dos quais só 1 tem slot — comprar a carta desligava a Meia-Noite. Escalar segundos e minutos juntos preserva a razão e as 4 colunas, e só aperta a cadência (7,5 s → 5,77 s). Ver SPEC §9. |
| 2026-09-02 | M0 | `src/data/balance.js` ainda não criado | O M0 não tem número de gameplay — 720×1280, dpr 2 e o clamp de 250 ms são técnicos. Criar o arquivo já com os valores do SPEC §15 seria adiantar M1–M5. O define `__DEV__` já está no build para o `window.BALANCE` entrar no M1. |
