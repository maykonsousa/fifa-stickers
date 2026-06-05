# Scanner de Figurinha por Código (OCR on-device)

**Data:** 2026-06-05
**Status:** Aprovado (design) — pendente plano de implementação

## Problema

Hoje, para lançar uma figurinha na Coleção, o usuário busca pelo `code` (ex.: `FWC00`,
`MEX1`) e dá "lançar". Buscar manualmente código a código é lento, especialmente ao abrir
um pacote inteiro. Queremos ler o código impresso no **verso** da figurinha pela câmera e
agilizar o lançamento.

## Contexto

- O verso traz **apenas o código alfanumérico impresso como texto** (sem código de barras
  nem QR). Portanto a leitura é via **OCR**.
- Existe uma **lista fechada de códigos válidos** (`stickers.code`), o que permite
  "encaixar" o resultado bruto do OCR no código válido mais próximo e corrigir erros comuns.
- O projeto já estourou cota de egress do Supabase: a solução **não pode** mandar imagem
  pra fora nem ter custo por leitura. Por isso o OCR roda **on-device** (Tesseract.js WASM).
- Padrões existentes a reaproveitar: busca via RPC `search_stickers`, captura de imagem por
  `<input type="file" capture="environment">` (uma foto, não vídeo), e `detect-in-app-browser`
  (câmera ao vivo costuma quebrar dentro de Instagram/Facebook).

## Fluxo de uso

Scanner **contínuo, um de cada vez, com confirmação**:

1. Usuário abre o scanner e mira no verso da figurinha.
2. O app lê o código e mostra um **cartão de confirmação** que já informa **se o usuário já
   possui e quantas**.
3. Usuário decide:
   - **Lançar** — registra que possui (funciona como repetida se já tiver; caso "comprei o
     pacote").
   - **Descartar** — não faz nada e volta a escanear (caso "só analisando a pilha do colega").
   - **Não é essa? Buscar manualmente** — abre a busca normal já preenchida com o texto lido.
4. Após a decisão, volta automaticamente ao modo de leitura para a próxima figurinha.

## Decisões de design

### Motor de OCR — on-device (Tesseract.js)
- A leitura roda no aparelho do usuário: **zero custo por scan, zero egress**, imagem nunca
  sai do dispositivo.
- A precisão crua é mediana; é compensada pelo **encaixe na lista de códigos válidos** e pelo
  **escape manual**.
- Se a precisão em campo decepcionar, dá pra evoluir para OCR na nuvem depois **sem mudar o
  fluxo** (apenas troca a etapa de leitura).

### Captura — híbrida (vídeo ao vivo com fallback para foto)
- **Vídeo ao vivo (`getUserMedia`)** quando o ambiente permite: visor em tempo real, lê
  sozinho quando o código entra em foco. Sensação de scanner de verdade.
- **Fallback automático para foto (`<input capture>`)** quando for navegador in-app ou a
  permissão de câmera falhar (detectado via `detect-in-app-browser` + erro de `getUserMedia`).
  Reaproveita o padrão já testado do projeto.
- A escolha é transparente para o usuário: a tela decide qual modo usar.

## Arquitetura

### Tela / entrada
- Nova rota **`/collection/scanner`** dentro do grupo `(authenticated)`.
- Botão **"Escanear"** no topo da página de Coleção, junto do toggle Lista/Álbum.
- A tela ocupa a viewport (modo scanner) e mantém um **loop contínuo** ler → decidir → ler.

### Carga inicial
- Ao montar, busca **uma vez** todos os `code` válidos (`select code from stickers`). São
  poucas centenas de strings curtas — custo irrisório. Usados localmente para o encaixe.

### Componentes (unidades isoladas)
- **`ScannerView`** (client) — orquestra o estado da sessão (modo de captura, loop,
  contador), renderiza o visor e o cartão de confirmação.
- **Camada de captura** — abstrai "obter um frame/foto":
  - `LiveCameraSource` (getUserMedia + canvas) e `PhotoCaptureSource` (`<input capture>`),
    expondo a mesma interface (`getFrame(): Promise<ImageData|Blob>`).
  - Seleção do source feita por um helper de capacidade (in-app browser? getUserMedia ok?).
- **`recognizeCode(frame, validCodes)`** — pipeline de leitura puro e testável:
  1. recorta a janela central de mira;
  2. roda Tesseract.js;
  3. normaliza o texto (maiúsculas, remove espaços/ruído);
  4. **encaixa no `code` válido mais próximo** por distância de edição;
  5. retorna `{ code, confidence }` ou `null` se abaixo do limiar.
- **`ScannerConfirmCard`** — recebe o sticker resolvido + `owned_count`; renderiza imagem,
  `code`, título, "Você já tem: N" e as ações Lançar / Descartar / Buscar manualmente.

### Lookup de figurinha
- Lookup **exato por `code`** (consulta direta a `stickers` por código + contagem em
  `user_stickers` do usuário) para obter `owned_count`. Retorna o sticker resolvido para o
  cartão.

### Lançar / desfazer
- **Lançar**: `insert` em `user_stickers` (mesma operação de hoje); guarda o `id` inserido
  para permitir desfazer.
- **Desfazer**: `delete` do último `user_stickers` inserido na sessão.
- Toast em cada lançamento ("Lançada!" / "Lançada! (repetida)") com ação de desfazer.

### Erros / fallback
- Confiança baixa ou texto ilegível → estado **"não consegui ler"** com botão de **busca
  manual** (abre a busca preenchida com o texto bruto lido).
- O scanner nunca trava: sempre há saída manual.

### Sessão e feedback
- Contador discreto na tela: **"Lançadas nesta sessão: X"**.

## Dados / schema

- **Sem mudança de schema.** Usa `user_stickers` (insert/delete) e leitura de `stickers`.
- Tudo client-side via o Supabase client existente (`@/lib/supabase/client`).

## Testes

- `recognizeCode` (pipeline puro): normalização e encaixe na lista válida — casos como
  `MEXI`→`MEX1`, `FWC 00`→`FWC00`, texto sem match → `null`.
- Seleção de source de captura: in-app browser → `PhotoCaptureSource`; ambiente capaz →
  `LiveCameraSource`.
- Cartão de confirmação: estados "não tenho", "já tenho N", ações disparam os handlers certos.
- Lançar/desfazer: insert seguido de delete do `id` correto.

## Fora de escopo (YAGNI)

- Leitura em rajada / fila de múltiplos códigos (decidido: um de cada vez).
- OCR na nuvem ou modelo multimodal (fica como evolução futura se a precisão exigir).
- Leitura de código de barras / QR (o verso não tem).
