# Scanner de Figurinha — Migração do OCR de Tesseract para Google Vision

**Data:** 2026-06-05
**Status:** Aprovado (design) — pendente plano de implementação
**Relacionado:** [Scanner de Figurinha por Código (OCR on-device)](./2026-06-05-sticker-code-scanner-design.md)

## Problema

O scanner de código de figurinha foi construído com OCR on-device (Tesseract.js WASM).
A precisão em campo decepcionou mesmo com o pipeline de pré-processamento (tons de cinza,
binarização adaptativa Bradley, dupla passada com inversão). O design original já previa
essa saída:

> "Se a precisão em campo decepcionar, dá pra evoluir para OCR na nuvem depois **sem mudar
> o fluxo** (apenas troca a etapa de leitura)."

Vamos trocar o motor de leitura para **Google Cloud Vision** (`TEXT_DETECTION`), mantendo o
resto do fluxo intacto.

## Decisões e trade-offs

- **OCR na nuvem em vez de on-device.** A imagem passa a **sair do dispositivo** e há **custo
  por requisição** (~US$1,50/1000 leituras). Aceito conscientemente em troca de precisão.
- **Não afeta o egress do Supabase.** A chamada ao Vision é tráfego de saída para o Google,
  fluxo diferente do egress de Storage que estourou cota antes. O recorte enviado é um JPEG
  pequeno (~<100 KB), não a imagem cheia.
- **Credencial = API key** (string `AIza...`), já existente. A key **nunca** vai ao browser:
  fica numa rota server-side que a segura.
- **Pré-processamento on-device removido.** Aquele pipeline existia para compensar a fraqueza
  do Tesseract; binarizar antes de mandar pro Vision normalmente **piora** o resultado dele.
  Enviamos o recorte colorido cru, só comprimido em JPEG.

## Arquitetura

O fluxo de uso (visor → ler → cartão de confirmação → lançar / descartar / buscar manual)
**não muda**. Muda apenas a etapa de leitura.

```
[browser] captura frame → recorta janela de mira → JPEG comprimido (base64)
   → POST /api/scanner/ocr   (valida sessão Supabase, segura a API key)
      → Google Vision REST  (images:annotate, feature TEXT_DETECTION)
   ← { rawText }
[browser] findCodeInText(rawText, validCodes) → encaixe na lista válida → cartão
```

Tudo após `rawText` (encaixe, lookup por código, lançar/desfazer, contador de sessão) fica
**idêntico** ao que existe hoje.

### Segurança

A rota expõe um endpoint que gasta dinheiro na API key. Portanto **valida a sessão Supabase**
(`createClient().auth.getUser()`) e recusa com **401** quem não estiver autenticado. Sem isso,
qualquer um poderia chamar e torrar a cota. A validação de sessão também cobre o papel de
anti-abuso anônimo (não precisamos de rate-limit próprio neste escopo).

## Componentes

### Novo

- **`app/api/scanner/ocr/route.ts`** — Route Handler `POST`. Segue o padrão de
  `app/api/contact/route.ts`. Passos:
  1. Valida `createClient().auth.getUser()`; sem usuário → `401`.
  2. Lê o corpo JSON `{ image: "<base64 sem prefixo data:>" }`; payload inválido → `400`.
  3. Chama Vision REST
     `POST https://vision.googleapis.com/v1/images:annotate?key=GOOGLE_VISION_API_KEY`
     com `{ requests: [{ image: { content: <base64> }, features: [{ type: "TEXT_DETECTION" }] }] }`.
  4. Extrai `responses[0].fullTextAnnotation.text` (fallback `textAnnotations[0].description`,
     senão `""`) e devolve `{ rawText }`.
  - Env var ausente → `500` logado; Vision não-2xx → `502`.

- **`lib/scanner/crop-frame.ts`** — recorta a janela de mira de um `CanvasImageSource` e
  exporta um Blob/base64 JPEG comprimido (`canvas.toBlob`, qualidade ~0.8). Assume o papel de
  recorte/compressão que `preprocessForOcr` tinha, **sem** conversão para cinza nem binarização.

### Reescrito

- **`lib/scanner/recognize-frame.ts`** — em vez de criar worker Tesseract, faz
  `fetch("/api/scanner/ocr", ...)` com o JPEG base64 e retorna `{ rawText, confidence }`.
  `confidence` deixa de vir do motor (o encaixe na lista válida é quem decide a aceitação);
  é fixado/derivado. Erro de rede → `{ rawText: "" }` (não quebra o loop; cliente cai em
  "não consegui ler"). `terminateOcr` deixa de existir / vira no-op removido.

- **`app/(authenticated)/collection/scanner/scanner-view.tsx`** — a dupla-passada com inversão
  (`runOcr` + `invertCanvas`) vira **uma chamada única**. Captura (vídeo e foto) passa a usar
  `crop-frame` + `recognizeFrame`. Remove imports de `preprocessForOcr`, `adaptiveThreshold`,
  `invertCanvas` e `terminateOcr`.

### Removido

- De `lib/scanner/preprocess-ocr.ts`: `preprocessForOcr`, `adaptiveThreshold`, `invertCanvas`.
  **Mantém `loadImage`** (ainda usado pelo modo foto). O arquivo pode ser renomeado/encolhido
  para conter só `loadImage`.
- Dependência `tesseract.js` do `package.json`.

### Inalterado

`lib/scanner/find-code-in-text.ts`, `lib/scanner/lookup-sticker-by-code.ts`,
`lib/scanner/choose-capture-mode.ts`, `scanner-confirm-card.tsx`, e todo o fluxo de
lançar/desfazer e contador de sessão.

## Configuração

- Nova env var **`GOOGLE_VISION_API_KEY`** em `.env` e documentada em `.env.example`.

## Detalhes do payload e da chamada

- **Entrada da rota:** JSON `{ image: "<base64>" }` (sem o prefixo `data:image/jpeg;base64,`).
  Recorte da mira em JPEG ~0.8 mantém o corpo pequeno (tipicamente <100 KB).
- **Feature:** `TEXT_DETECTION` (não `DOCUMENT_TEXT_DETECTION`) — o verso traz texto curto e
  esparso, não um documento denso.
- **Resposta sem texto:** `{ rawText: "" }` → cliente entra no estado "não consegui ler", que
  já existe, com botão de busca manual.

## Testes

- **`crop-frame`**: recorta a região esperada e produz um JPEG não-vazio.
- **`recognize-frame`** (`fetch` mockado): monta o body correto, lê `rawText` da resposta; em
  erro de rede retorna `rawText: ""` sem lançar.
- **Rota `/api/scanner/ocr`**: sem sessão → `401`; com sessão + Vision mockado → `{ rawText }`;
  Vision com erro → `502`.
- **Mantidos:** `find-code-in-text` e `snap-to-valid-code.test.ts` seguem valendo sem alteração.

## Fora de escopo (YAGNI)

- Cache/dedupe de leituras e rate-limit próprio (a validação de sessão já barra abuso anônimo).
- Service account / Application Default Credentials (usamos API key).
- Re-tentativa automática e múltiplas features do Vision numa só chamada.
