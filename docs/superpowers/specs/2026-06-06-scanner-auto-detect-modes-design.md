# Scanner: auto-detect + modos (Lançamento / Troca / Baixa)

**Data:** 2026-06-06
**Branch:** `feature/scanner-auto-detect`
**Status:** aprovado, pronto para plano de implementação

## Contexto

Hoje o scanner (modo live) lê a figurinha só quando o usuário toca em **"Ler código"**, que recorta a mira e chama o Google Vision. Cada chamada ao Vision é **paga** (tier grátis ~1.000/mês, exige billing ativo), então polling ingênuo torra a cota.

Este trabalho transforma o scanner em duas frentes que andam juntas:

1. **Auto-detect** — eliminar o botão "Ler código": a leitura dispara sozinha quando o usuário enquadra e segura a figurinha, mas com um **gatilho on-device gratuito** que filtra antes de gastar a chamada paga.
2. **Modos** — Lançamento, Troca e Baixa, cada um com uma ação diferente após a leitura. O auto-detect é o motor de leitura comum aos três.

Peças já isoladas e reusadas: `lib/scanner/crop-frame.ts` (`cropToJpegBase64`), `lib/scanner/recognize-frame.ts` (`recognizeFrame` → rota paga), `lib/scanner/find-code-in-text.ts`, `lib/scanner/lookup-sticker-by-code.ts` (devolve `owned_count`). Orquestração em `app/(authenticated)/collection/scanner/scanner-view.tsx`.

Contexto de sensibilidade a custo: a migração para o Vision (`docs/superpowers/specs/2026-06-05-scanner-google-vision-design.md`) e o projeto já estourou egress do Supabase antes.

## Objetivos

- Ler figurinhas em série, sem clique entre uma e outra (hands-free).
- ~1 chamada paga ao Vision **por figurinha**, mesmo com a câmera parada segurando o enquadramento.
- Três modos com ações e sinais visuais distintos, alternáveis num toque.
- Proteção contra erros destrutivos (dar baixa na última cópia; pegar a mesma figurinha duas vezes numa troca).

## Não-objetivos

- Auto-detect no modo foto (fallback de in-app browser) — lá o gatilho continua manual.
- Detecção de código de barras/QR — as figurinhas têm código **alfanumérico** (texto), lido por OCR.
- Mudanças na rota `/api/scanner/ocr` ou no parsing do Vision.

## Modos

Seletor: **segmented control** com 3 botões lado a lado, fixo no topo (acima do vídeo), sempre visível. Padrão ao abrir: **Lançamento**. A cor de destaque do modo ativo serve de lembrete (evita dar baixa achando que está lançando).

A ação depende do modo e do `owned_count` (cópias que o usuário já tem, no momento da leitura):

| Modo | `owned_count` | sinal | ação | "Desfazer" |
|------|--------------|-------|------|-----------|
| **Lançamento** | qualquer | 🟢 (rótulo "nova"/"repetida") | adiciona sempre | sim — remove o inserido |
| **Troca** | 0 | 🟢 "pega!" | adiciona | sim — remove o inserido |
| **Troca** | ≥ 1 | 🔴 "já tem, pula" | nenhuma | — |
| **Baixa** | ≥ 2 | 🟢 | remove uma (sobra ≥ 1) | sim — re-insere |
| **Baixa** | 1 | 🟡 "essa é sua única" | nenhuma | — |
| **Baixa** | 0 | 🔴 "você não tem essa" | nenhuma | — |

Fronteiras conceituais:
- **Lançamento** = comprou pacote → adiciona tudo, inclusive repetidas (repetida tem valor pra trocar).
- **Troca** = evento com colega → adiciona só as novas (🟢) e avisa pra pular as repetidas (🔴). Como o 🟢 já entra na coleção, a próxima leitura do mesmo código vira 🔴 → nunca se pega a mesma figurinha duas vezes.
- **Baixa** = separar excedente pra venda/troca → só remove quem tem repetida; protege a única (🟡) e avisa o que não existe (🔴).

## Motor de leitura (auto-detect)

Gatilho escolhido: **estabilidade + conteúdo na mira** (gratuito, on-device) antes de chamar o Vision.

Loop amostra o vídeo ~5–6×/s desenhando a **região da mira** num canvas pequeno em escala de cinza (ex.: ~64×48 px). Custo zero — não envolve o Vision. Calcula dois sinais:

- **Estabilidade**: diferença média de pixels entre amostras consecutivas. "Estável" = diferença abaixo de um limiar por ~0,5s (o usuário enquadrou e segurou).
- **Conteúdo**: variância/contraste dos pixels da mira acima de um limiar mínimo (não dispara mirando superfície lisa/mesa vazia).

### Máquina de estados do loop

- `searching`: amostrando. Quando **estável + tem conteúdo + a amostra estável difere da última lida** → transição para `reading` e dispara **uma** chamada ao Vision.
- `reading`: chamada ao Vision em voo; não dispara novas leituras.
- `rearm`: após processar o resultado, guarda a assinatura (cinza reduzido) do frame lido. Só volta a `searching` quando o frame **mudar bastante** em relação a essa assinatura (o usuário tirou a figurinha da mira). Combina dois guards — assinatura-do-último-lido e movimento — pra garantir ~1 chamada por figurinha mesmo com a câmera parada.

Leitura que volta **vazia** (frame borrado, OCR sem código): não re-dispara no mesmo frame parado, porque a assinatura do último lido bloqueia. Só tenta de novo quando o frame mudar. Evita loop queimando cota.

## Fluxo hands-free

1. Loop detecta gatilho → recorta a mira (`cropToJpegBase64`) → `recognizeFrame` (Vision) → `findCodeInText` → `lookupStickerByCode`.
2. Resolve a ação via função pura `resolveScanAction(mode, owned_count)` → `{ color, message, action }`.
3. Executa a mutação (`add` / `remove` / `none`) e pisca a cor na **borda da mira** + nome da figurinha.
4. Ações que mexem na coleção mostram **toast com "Desfazer"**; ações `none` mostram só o flash de cor + mensagem.
5. Volta a `rearm` → `searching`. Sem clique entre figurinhas.

Falha de leitura (sem código / sticker inexistente): aviso discreto e rearma sozinho — **sem** card bloqueante. (Substitui o estado `notfound` travado atual no modo live.)

## Modo foto (fallback)

Mantém o seletor de modo e a mesma ação/cor/Desfazer. Só o gatilho é manual: o usuário tira a foto → lê → aplica a ação do modo. Sem auto-detect (é uma foto só). Sem regras diferentes por ambiente.

## Estrutura de código

| Arquivo | Papel |
|---------|-------|
| `app/(authenticated)/collection/scanner/scanner-view.tsx` | orquestra: estado de modo, segmented control, loop de amostragem, dispatch da ação, mutações + undo |
| **novo** `lib/scanner/frame-signal.ts` | função pura: recebe métricas de frame (diff, contraste, diff-vs-último-lido) → decide `idle \| stable-ready \| rearm`. Testável. |
| **novo** `lib/scanner/resolve-scan-action.ts` | função pura `(mode, owned_count) → { color: 'green'\|'yellow'\|'red', message, action: 'add'\|'remove'\|'none' }`. Testável. |
| reuso | `cropToJpegBase64`, `recognizeFrame`, `findCodeInText`, `lookupStickerByCode` |

Princípio: toda a decisão fica nas duas funções puras; o `scanner-view` faz só plumbing (canvas, timers, supabase, toast). Mutação e undo vivem no `scanner-view`, dirigidos pelo resultado de `resolveScanAction`.

### Detalhes de mutação

- **add** (Lançamento, Troca-🟢): insert em `user_stickers` retornando `id`; undo = delete por esse `id` (igual ao `handleLancar` atual).
- **remove** (Baixa-🟢): seleciona **um** `user_stickers.id` daquele `sticker_id`+`user_id` e deleta; undo = re-insert do `sticker_id`.
- **none**: nenhuma escrita.

## Tratamento de erros

- `validCodes` ainda não carregou → loop não dispara (gating de `codesReady`, como hoje).
- Permissão de câmera negada / indisponível → cai pro modo foto (comportamento atual).
- Chamada ao Vision falha → `recognizeFrame` devolve `""` → tratado como leitura vazia → aviso discreto + rearm.
- Troca de modo no meio da sessão → reseta estado transitório do loop (`rearm`/assinatura), mantém o stream de vídeo.

## Testes

- `frame-signal.test.ts`: dado conjunto de métricas, retorna a decisão correta (estável-e-com-conteúdo dispara; estável-sem-conteúdo não; frame igual ao último lido não re-dispara; frame mudou rearma).
- `resolve-scan-action.test.ts`: matriz completa modo × `owned_count` → cor + ação corretas (incluindo Baixa: ≥2 remove, 1 amarelo bloqueia, 0 vermelho).
- O loop/canvas fica fino (plumbing), coberto pelas funções puras.

## Decisões em aberto para o plano

- Limiares numéricos exatos (diff de estabilidade, contraste mínimo, diff de rearm) e tamanho do canvas de amostragem — calibrar na implementação/teste em dispositivo.
- Frequência de amostragem (proposto ~5–6×/s) — ajustar por consumo de CPU/bateria.
