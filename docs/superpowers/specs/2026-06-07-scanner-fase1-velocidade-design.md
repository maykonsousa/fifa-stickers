# Scanner — Fase 1: menos chamadas ao Vision e leitura mais rápida

Data: 2026-06-07
Status: design aprovado (aguardando review do spec)

## Contexto

O scanner identifica figurinhas por OCR: captura a janela de mira → JPEG 0.8 base64
→ `POST /api/scanner/ocr` → Google Cloud Vision `TEXT_DETECTION` → texto → match
fuzzy (Levenshtein) contra ~2.300 códigos → 2 queries no Supabase (lookup + count)
→ card de confirmação.

O gargalo dominante é o round-trip da Vision (~500–2000ms). A Vision é **paga por
chamada** (custo por imagem, independente do tamanho), e não há cache nem dedupe.
Tesseract/OCR on-device já foi testado e descartado: o conteúdo gráfico da carta
atrapalha demais a leitura. Portanto a Vision continua sendo o "cérebro" da leitura.

Cenário crítico: **momentos de troca**, em que o tempo por leitura precisa ser o
menor possível para os usuários trocarem rápido.

### Fato relevante sobre o layout da figurinha

O código (ex: `MEX1`) fica num **badge no canto superior direito** da carta. O badge
tem duas variantes de cor: preto com letras claras, ou o inverso (claro com letras
escuras). Isso proíbe binarização de polaridade fixa on-device, mas a Vision lida
bem com as duas variantes recebendo a imagem **em cor**.

## Objetivo

Reduzir o número de chamadas ao Vision (custo) e o tempo por leitura (velocidade em
troca), sem perder a precisão atual.

## Não-objetivos (Fase 1)

- Não substituir a Vision por OCR on-device (descartado por precisão).
- Não mexer no fluxo de confirmação por toque (isso é Fase 3).
- Não implementar dedupe por hash perceptual (isso é Fase 2).

## Estrutura em fases (visão geral)

- **Fase 1 (este spec):** recorte na região do código + gate de qualidade (nitidez)
  + unir as queries do Supabase numa só.
- **Fase 2:** dedupe por hash perceptual — não reler a mesma figurinha.
- **Fase 3:** modo troca sem toque de confirmação (auto-confirma + auto-avança).

---

## Bloco 1 — Recorte na região do código

### O quê
Hoje a captura recorta a janela de mira inteira (`MIRA = { w: 0.82, h: 0.62 }`) e
manda pra Vision (`scanner-view.tsx:239-247`, `cropToJpegBase64`). Vamos adicionar um
**segundo recorte**, interno, só na faixa do badge (canto superior direito), antes de
gerar o JPEG enviado.

### Por quê
- Imagem muito menor → round-trip da Vision mais rápido.
- Sem a arte da carta → leitura do código mais certeira na primeira tentativa →
  menos retentativa (que é o que mais trava em troca).

### Como
Nova função pura `codeCropRegion(mira: CropRegion, code: { w; h }): CropRegion` (novo
arquivo `lib/scanner/code-crop-region.ts`), que recebe o retângulo do mira em pixels
de fonte (o que `coverCropRegion` já devolve) e retorna o sub-retângulo do badge,
ancorado em cima-à-direita:

```
sx = mira.sx + mira.sw * (1 - CODE.w)
sy = mira.sy
sw = mira.sw * CODE.w
sh = mira.sh * CODE.h
```

Constante de calibração (em `scanner-view.tsx`, ao lado de `MIRA`):

```
const CODE = { w: 0.45, h: 0.25 }; // canto superior direito; folga generosa
```

Em `autoCapture` (`scanner-view.tsx:239-247`), depois de calcular `region` do mira,
calcular `codeCropRegion(region, CODE)` e passar **esse** retângulo ao
`cropToJpegBase64`. O `cropToJpegBase64` não muda (já aceita um `CropRegion`).

### Detalhes / decisões
- **Sem cinza/binarização.** Mantém o JPEG colorido (compatível com as duas variantes
  de cor do badge). Reforça o comentário já existente em `crop-frame.ts`.
- **A mira na tela não muda.** O usuário continua enquadrando a carta inteira; o
  recorte do badge é interno, só no instante da captura.
- **Modo foto** (`handlePhoto`, `scanner-view.tsx:254-272`) hoje manda a imagem inteira
  sem `region`. Na Fase 1 mantemos o comportamento do modo foto **inalterado** (sem
  recorte do badge), porque ali não há mira para ancorar o recorte de forma confiável.
  O recorte do código vale só para o modo `live`.
- **Calibração.** As frações `CODE` são chute inicial com folga; ajustar em
  dispositivo. Ficam como constante única, fácil de mexer.

### Risco
Se o enquadramento variar muito e o badge sair da faixa superior-direita, a Vision
recebe um recorte sem o código → "Não consegui ler". Mitigado pela folga generosa
(45%×25%) e pela calibração em dispositivo. Caso vire problema, a faixa pode crescer
sem mudar a arquitetura.

---

## Bloco 2 — Gate de qualidade do frame (nitidez)

### O quê
O gatilho on-device hoje dispara com base em estabilidade (`diffFromPrev <= diff`) e
conteúdo (`content >= content`) — ver `frame-signal.ts` e `frame-metrics.ts`. Falta
medir **nitidez**: um frame estável porém borrado passa e vira chamada paga sem
resultado. Vamos exigir nitidez mínima na **região do badge** antes de disparar.

### Por quê
Corta as chamadas em foto borrada/tremida — desperdício puro de chamada paga e de
tempo do usuário esperando um resultado vazio.

### Como
1. Nova métrica pura em `frame-metrics.ts`:
   `sharpness(gray: Uint8Array, w: number, h: number): number` — variância do
   Laplaciano (kernel 4-vizinhos) sobre o buffer cinza. Superfície borrada → baixa;
   bordas nítidas de texto → alta. Custo O(n), barato.
2. A nitidez é medida **na região do badge**, não na mira toda (o badge é só um
   cantinho da amostra atual de 64×48, pequeno demais para Laplaciano confiável).
   No loop de amostragem (`scanner-view.tsx:274-331`), além da amostra da mira para
   `content`/`diff`, desenhar a região do badge num pequeno canvas próprio
   (ex: `BADGE_SAMPLE = { w: 64, h: 32 }`, usando `codeCropRegion`) e calcular
   `sharpness` ali. Um `drawImage` + uma passada Laplaciano a mais por tick — barato.
3. Estender os tipos do gatilho:
   - `FrameSample` ganha `sharpness: number`.
   - `FrameThresholds` ganha `sharpness: number` (limiar mínimo).
   - `nextFrameSignal`: na fase `searching`, exigir `stable && hasContent && sharp`,
     onde `sharp = sample.sharpness >= t.sharpness`. Se não passar, reinicia
     `stableCount` (mesma lógica de `!stable || !hasContent` hoje).
4. Adicionar `sharpness` ao objeto `THRESHOLDS` (`scanner-view.tsx:46-51`), com valor
   inicial a calibrar em dispositivo.

### Decisões
- Métrica e limiar **na escala da própria amostra** do badge; calibrar como já se faz
  com `content` (comentário em `scanner-view.tsx:41-43`).
- A máquina de estados continua pura e testável; só ganha mais uma condição de gate.

### Risco
Limiar de nitidez alto demais → nunca dispara (figurinha boa rejeitada). Baixo demais
→ não filtra borrão. Mitigado por calibração e por logar/observar em teste. Começar
conservador (baixo) e apertar.

---

## Bloco 3 — Unir as queries do Supabase

### O quê
`lookupStickerByCode` (`lib/scanner/lookup-sticker-by-code.ts`) faz hoje **2 idas
sequenciais**: busca o sticker por código, depois conta as cópias do usuário. Unir
numa **única** chamada.

### Por quê
Tira um round-trip de DB do caminho crítico pós-Vision (`resolveAndRun`,
`scanner-view.tsx:216-232`).

### Como
Criar uma função RPC no Postgres (via migration Supabase) que recebe `p_code` e
`p_user_id` e devolve numa linha `{ id, code, title, image_url, owned_count }`:

```sql
create or replace function lookup_sticker_by_code(p_code text, p_user_id uuid)
returns table (id bigint, code text, title text, image_url text, owned_count bigint)
language sql stable
as $$
  select s.id, s.code, s.title, s.image_url,
         (select count(*) from user_stickers us
            where us.sticker_id = s.id and us.user_id = p_user_id) as owned_count
  from stickers s
  where s.code = p_code
  limit 1;
$$;
```

(Tipos exatos de coluna — `bigint` vs `int`, nullability — a confirmar contra o schema
real na implementação.)

`lookupStickerByCode` passa a chamar `supabase.rpc("lookup_sticker_by_code", {...})`,
mantendo a **mesma assinatura e o mesmo tipo de retorno** (`ScannedSticker | null`).
Nenhum chamador muda (`resolveAndRun` e a via manual continuam iguais).

### Decisões
- Manter a interface pública de `lookupStickerByCode` idêntica → mudança isolada.
- Migration versionada no padrão do projeto (confirmar diretório/ferramenta de
  migrations na implementação).

### Risco
Baixo. Se a RPC falhar/não existir em algum ambiente, a leitura quebra → garantir que
a migration seja aplicada antes do deploy. Testável localmente.

---

## Componentes afetados (resumo)

| Arquivo | Mudança |
|---|---|
| `lib/scanner/code-crop-region.ts` (novo) | função pura do recorte do badge |
| `lib/scanner/crop-frame.ts` | sem mudança (já aceita `CropRegion`); reforçar comentário cor |
| `lib/scanner/frame-metrics.ts` | nova métrica `sharpness` (variância do Laplaciano) |
| `lib/scanner/frame-signal.ts` | `FrameSample`/`FrameThresholds` + condição de nitidez |
| `lib/scanner/lookup-sticker-by-code.ts` | passa a chamar a RPC; mesma assinatura |
| `app/(authenticated)/collection/scanner/scanner-view.tsx` | constante `CODE`, amostra do badge, recorte na captura, limiar `sharpness` |
| migration Supabase (novo) | função `lookup_sticker_by_code` |

## Fluxo de dados (modo live, depois da Fase 1)

1. Loop 170ms: amostra da mira (content/diff) **+** amostra do badge (sharpness).
2. `nextFrameSignal` dispara só com estável + conteúdo + **nitidez**.
3. No fire: `coverCropRegion` (mira) → `codeCropRegion` (badge) → `cropToJpegBase64`
   gera JPEG **pequeno e colorido** só do badge.
4. `POST /api/scanner/ocr` → Vision `TEXT_DETECTION` → texto.
5. `findCodeInText` (inalterado) garimpa o código.
6. `lookupStickerByCode` → **1 RPC** → `{ id, code, title, image_url, owned_count }`.
7. `resolveScanAction` + card (inalterado).

## Tratamento de erro

- Recorte sem o código (badge fora da faixa) → Vision não acha → fluxo atual de
  "Não consegui ler" (já existe). Sem regressão de comportamento.
- Nitidez nunca atingida → não dispara (igual a hoje quando não há conteúdo). Calibrar.
- RPC indisponível → erro de leitura; mitigado garantindo migration aplicada.

## Testes

- **Unitário (puro, sem DOM):**
  - `codeCropRegion`: âncora superior-direita, frações corretas, dentro dos limites do
    mira.
  - `sharpness`: buffer liso → baixo; buffer com bordas → alto; vazio → 0.
  - `nextFrameSignal`: não dispara quando `sharpness < limiar` mesmo com estável +
    conteúdo; dispara quando os três passam; reinicia `stableCount` ao falhar nitidez.
- **Integração leve:** `lookupStickerByCode` contra a RPC (sticker existente, código
  inexistente, contagem 0 e >0).
- **Manual em dispositivo:** calibrar `CODE` e `sharpness`; confirmar leitura nas duas
  variantes de cor do badge; medir tempo por leitura antes/depois.

## Observações de implementação

- O `AGENTS.md` exige ler o guia relevante em `node_modules/next/dist/docs/` antes de
  escrever código — esta versão do Next pode ter convenções diferentes. Vale também
  para qualquer rota/migração tocada.
- Projeto é sensível a egress do Supabase: a mudança da RPC **reduz** round-trips, não
  aumenta payload — alinhado com a restrição.
