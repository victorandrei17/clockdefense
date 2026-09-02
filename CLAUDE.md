# O Último Relógio

Tower defense circular em Canvas 2D vanilla, empacotado para Android via Capacitor.
Torres são peças no mostrador que só disparam quando um ponteiro passa por cima delas.

## Fluxo de trabalho

- `SPEC.md` é a fonte da verdade do design. `PROGRESS.md` é a fila de trabalho.
- Implemente **um marco por vez**, na ordem. Não adiante código de marcos futuros.
- Antes de começar: leia o marco em `PROGRESS.md` e as seções de `SPEC.md` que ele referencia.
- Ao terminar: marque os checkboxes, anote decisões na seção de notas do marco, e commit com `M<n>: <resumo>`.
- Se o spec estiver ambíguo ou errado, **pergunte antes de decidir**. Se decidirmos algo novo, atualize `SPEC.md` no mesmo commit.

## Comandos

```bash
npm run dev     # esbuild --serve, acessível na rede local para teste no celular
npm run build   # bundle único em dist/
npm run android # build + cap sync + cap open android
```

## Convenções que não são o padrão da ferramenta

**Ângulos em graus, 0° = 12 horas, sentido horário positivo.** Converta para radianos só na chamada de desenho. Toda a lógica de jogo usa graus.

**Todos os números de jogo vivem em `src/data/balance.js`.** Nenhum literal numérico de gameplay espalhado pelo código. Exponha em `window.BALANCE` no build de dev.

**Escreva em ES Modules, entregue um bundle IIFE único.** ES Modules soltos quebram sob `file://` no Android.

## Armadilhas do WebView Android

- **Nunca use `ctx.shadowBlur`.** Faça glow com sprites de gradiente radial pré-renderizados.
- O mostrador estático (aros, marcações, números) é pré-renderizado **uma vez** em `OffscreenCanvas`. Se ele estiver sendo redesenhado por frame, é bug.
- Inimigos, projéteis e partículas vêm de pool. Nada de `new` dentro do loop.
- `devicePixelRatio` limitado a 2.
- Texto do HUD é DOM por cima do canvas, atualizado só na mudança de valor. Não desenhe texto no canvas por frame.
- `dt` acumulado clampado em 250 ms. Quando o app volta do background, os ponteiros **reposicionam sem disparar**.
- `beforeunload` não é confiável no Android. Grave o save em `visibilitychange` e `pagehide`.
- Save via Capacitor Preferences, não localStorage — o WebView pode limpar localStorage ao recuperar espaço.

## Regras de design que parecem bugs mas não são

- Só 6 das 12 colunas externas têm par no aro interno. É intencional.
- Mola e Ampulheta não causam dano nenhum. É intencional.
- Cooldown de 0,35 s por peça existe para impedir abuso do Cronógrafo. Não remova.
- A corda drena sozinha. Um jogador puramente defensivo deve perder.

## Debug

O overlay de debug (tecla `F1`, ou toque de 3 dedos no celular) é ferramenta de trabalho, não extra.
Ele entra no M2 e é mantido até o fim. Ver `PROGRESS.md`.
