# Scanner UI: card de confirmação em bottom-sheet + vídeo mais enxuto

**Data:** 2026-06-06
**Branch:** `feature/refinamentos-ui`
**Status:** aprovado, pronto para plano de implementação

## Contexto

No scanner, o card de confirmação (e o bloco de entrada manual) renderizam **abaixo** do vídeo no fluxo normal da página. O vídeo é alto, então quando a confirmação aparece ela fica **fora da viewport** — o usuário precisa rolar pra ver e decidir, justo no momento mais crítico do fluxo. Além disso, a área de vídeo é grande demais.

Este refinamento: (1) transforma o card de confirmação e o bloco manual em **bottom-sheet** fixo na base da viewport, sempre visível; (2) **limita a altura do vídeo** pra a tela ficar mais enxuta, mantendo a caixa de mira alinhada ao recorte enviado ao OCR.

Estado atual relevante (`app/(authenticated)/collection/scanner/scanner-view.tsx`, na `main`): bloco `{phase.kind === "confirming" && <ScannerConfirmCard .../>}` e `{phase.kind === "manual" && (...)}` renderizados no fluxo da página, depois dos blocos de vídeo/foto. O vídeo é `<video className="w-full" />` dentro de um container `relative`, com a mira posicionada por porcentagem (`MIRA.w/MIRA.h`). O recorte do OCR (no loop de amostragem e em `autoCapture`) usa `MIRA.w * video.videoWidth` × `MIRA.h * video.videoHeight` centrado no frame **cru**.

## Objetivos

- A confirmação e o manual ficam visíveis sem rolagem, em qualquer tamanho de tela/vídeo.
- A área de vídeo fica mais contida (≈50–55% da altura da tela).
- A caixa de mira na tela continua correspondendo **exatamente** ao recorte enviado ao OCR.

## Não-objetivos

- Mudar a lógica de leitura, confirmação, modos ou custo do Vision.
- Redesenhar o card em si (conteúdo/botões permanecem).
- Mexer no modo foto além do que for necessário (a entrada manual aparece nos dois modos).

## 1. Bottom-sheet

Um wrapper pequeno e reusável posiciona o conteúdo fixo na base:

- **Scrim**: `fixed inset-0 bg-black/60`, z abaixo do sheet. **Não fecha ao toque** — durante a confirmação a decisão é explícita (É essa / Não é essa / Digitar código); no manual, o botão "Cancelar" fecha. Isso evita perder a leitura por toque acidental.
- **Sheet**: `fixed` ancorado embaixo, centralizado e com a largura máxima do container do app (mobile-first; em telas largas acompanha o container, não cola nas bordas da janela). Cantos arredondados no topo, padding, e `padding-bottom` respeitando a safe-area (`env(safe-area-inset-bottom)`).
- z-index acima do vídeo e do resto da página.

O card de confirmação e o bloco de entrada manual passam a ser renderizados **dentro** desse wrapper. O conteúdo dos dois (imagem/código/nome/botões, input/erro/botões) não muda.

## 2. Vídeo com altura limitada + alinhamento mira↔recorte

O container do vídeo ganha `max-height` (~52vh) e o `<video>` passa a `object-cover` (preenche a caixa, cortando o excedente centrado). Com isso o vídeo exibido deixa de mostrar o frame inteiro, então o recorte do OCR precisa ser derivado da **região visível**, não mais de `MIRA × dimensões intrínsecas`.

**Função pura nova** `lib/scanner/cover-crop-region.ts`:

```
coverCropRegion(videoW, videoH, boxW, boxH, miraW, miraH) → { sx, sy, sw, sh }
```

onde `videoW/H` são as dimensões intrínsecas do frame, `boxW/H` são as dimensões renderizadas da caixa do vídeo (`video.clientWidth/clientHeight`), e `miraW/H` são as frações da mira. Cálculo (`object-cover`, posição central):

```
s  = max(boxW / videoW, boxH / videoH)   // escala do cover
sw = miraW * boxW / s
sh = miraH * boxH / s
sx = (videoW - sw) / 2
sy = (videoH - sh) / 2
```

Propriedade importante: quando a caixa tem a mesma proporção do frame (caso atual, `w-full` sem corte), `s = boxW/videoW = boxH/videoH`, e o resultado vira `sw = miraW*videoW`, `sh = miraH*videoH` — exatamente o comportamento de hoje. Ou seja, a função **generaliza** o recorte atual; passamos a usá-la sempre na via de vídeo (lendo `clientWidth/clientHeight`), com ou sem corte.

Aplicação: o **loop de amostragem** e o **`autoCapture`** passam a montar o recorte com `coverCropRegion(video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight, MIRA.w, MIRA.h)`. A caixa de mira (overlay) continua posicionada por `%` da caixa — e agora corresponde ao recorte porque ambos derivam da mesma caixa visível.

A via **foto** (`handlePhoto`) não muda: continua recortando a imagem inteira (`cropToJpegBase64(img, naturalW, naturalH)` sem região), pois não há `object-cover` ali.

## 3. Arquivos

| Arquivo | Papel |
|---------|-------|
| **novo** `lib/scanner/cover-crop-region.ts` | função pura do recorte alinhado ao `object-cover` |
| **novo** `lib/scanner/cover-crop-region.test.ts` | testes (caso sem corte = comportamento atual; caso com corte) |
| **novo** `app/(authenticated)/collection/scanner/bottom-sheet.tsx` | wrapper presentational (scrim + sheet) |
| **modificar** `scanner-view.tsx` | envolve card/manual no `<BottomSheet>`; `max-h`/`object-cover` no vídeo; usa `coverCropRegion` no loop e no `autoCapture` |
| **sem mudança** | `scanner-confirm-card.tsx`, funções de leitura/confirmação, modo foto |

## 4. Tratamento de erros / bordas

- `video.clientWidth/clientHeight` podem ser 0 antes do layout; nesse caso o loop já não dispara (a guarda `readyState < 2` cobre o vídeo não pronto, mas a função deve ser robusta: se `boxW`/`boxH` forem 0, retorna a região centrada com base nas dimensões intrínsecas — equivalente ao fallback atual — pra nunca gerar `NaN`).
- Safe-area: usar `pb-[env(safe-area-inset-bottom)]` (ou utilitário equivalente) pra o sheet não ficar sob a barra do sistema.

## 5. Testes

- `cover-crop-region.test.ts`:
  - caixa com mesma proporção do frame → recorte idêntico ao `MIRA × intrínseco` (garante que não regredimos o caso atual);
  - caixa mais baixa que o frame (corte vertical) → `sh` menor, centrado;
  - `boxW`/`boxH` = 0 → fallback centrado sem `NaN`.
- Bottom-sheet e mudanças de layout do vídeo: visuais, verificadas manualmente (sem testing-library no repo).

## Decisões em aberto para o plano

- Valor exato do `max-height` do vídeo (≈52vh) e classe Tailwind da largura máxima do sheet — ajustar no dispositivo.
- Se o `<BottomSheet>` recebe os filhos via `children` ou props específicas — definir no plano (provável `children` + um `onScrimClick?` opcional não usado por ora).
