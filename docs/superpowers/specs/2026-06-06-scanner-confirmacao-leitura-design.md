# Scanner: confirmação por figurinha antes da ação

**Data:** 2026-06-06
**Branch:** `feature/scanner-confirmacao-leitura`
**Status:** aprovado, pronto para plano de implementação

## Contexto

O scanner hoje (mergeado no PR #39) é hands-free: detecta → executa a ação do modo na hora → flash de cor + toast "Desfazer". Na prática o OCR **erra com frequência** e identifica uma figurinha diferente da que o usuário tem na mão. O toast "Desfazer" não basta — a ação errada já aconteceu e o usuário pode nem perceber qual figurinha foi registrada.

Este trabalho insere um **passo de confirmação por figurinha** antes de qualquer ação, em todos os modos (Lançamento, Troca, Baixa) e nas duas vias de captura (vídeo live e foto). A confirmação mostra a imagem da figurinha identificada pra o usuário comparar com a física antes de confirmar.

Base já existente: `lookupStickerByCode` devolve `image_url`, `title`, `code`, `owned_count`; `resolveScanAction(mode, owned_count)` devolve `{ color, action, message }`; a máquina de estados do gatilho on-device (`frame-signal`) e as métricas (`frame-metrics`) continuam intactas. Ver `docs/superpowers/specs/2026-06-06-scanner-auto-detect-modes-design.md`.

## Objetivos

- Nenhuma ação na coleção sem o usuário confirmar visualmente que a leitura está correta.
- Saída garantida quando a leitura automática teima em errar (entrada manual de código).
- Custo ao Vision inalterado (1 chamada por leitura disparada; a confirmação é local).

## Não-objetivos

- Melhorar a precisão do OCR (múltiplas leituras, voting etc.) — fora de escopo; a confirmação é a salvaguarda.
- Busca manual rica na coleção / navegação pra fora do scanner.
- Mudanças nas funções puras (`resolveScanAction`, `frame-metrics`, `frame-signal`).

## Fluxo (todos os modos; live e foto)

1. Detecta/lê (live: gatilho on-device dispara 1 OCR; foto: usuário tira a foto) → `resolveAndRun` resolve o código e a figurinha.
2. **Pausa o loop** e mostra o **card de confirmação** — NÃO executa a ação ainda.
3. O card mostra: **imagem + código + nome** da figurinha; a **cor** do sinal (🟢/🟡/🔴); e o **rótulo da ação** que será executada conforme modo × `owned_count`:
   - Lançamento → "Lançar" (com "nova"/"repetida").
   - Troca `owned_count==0` → "Pegar (você não tem)"; `>=1` → "Você já tem — pular".
   - Baixa `>=2` → "Dar baixa"; `==1` → "Sua única — protegida"; `==0` → "Você não tem essa".
4. Ações do card:
   - **"É essa"** → executa a ação do modo (`add`/`remove`/`none`) → flash rápido de sucesso → rearma o loop.
   - **"Não é essa"** → descarta sem mutar → rearma o loop (o rearm já exige o frame mudar pra reler; o usuário reposiciona a figurinha).
   - **"Digitar código"** → abre a entrada manual (abaixo).
5. O toast "Desfazer" é **removido** — a confirmação prévia é a rede de segurança.

Para ações `none` (Troca 🔴, Baixa 🟡/🔴), "É essa" apenas confirma a leitura e rearma (nada muda na coleção); "Não é essa" trata o misread.

## Loop pausado durante a confirmação

Enquanto o card de confirmação **ou** a entrada manual estão abertos, o loop de amostragem não dispara novas leituras. Volta a procurar somente após confirmar, rejeitar ou concluir/cancelar o manual.

## Entrada manual (fallback)

Input simples de **código**. Ao submeter: `lookupStickerByCode(code)`.
- Achou → mostra o **mesmo card de confirmação** com a figurinha encontrada (ao confirmar, aplica a ação do modo corrente).
- Não achou → mensagem de erro inline; o usuário corrige e tenta de novo, ou fecha o manual.

Acessível a partir de: (a) o card de confirmação (botão "Digitar código", para corrigir um misread); e (b) o estado de leitura falha "não consegui ler" (quando nada foi reconhecido). Fechar o manual sem concluir volta ao `searching`.

## Estados (scanner-view)

Máquina de estados curta substitui a execução imediata atual:

- `searching` — loop ativo (live) ou aguardando foto (photo).
- `confirming` — card aberto com `{ sticker, actionResult }`; loop pausado.
- `manual` — input de código aberto; loop pausado.

Transições:
- `searching` → (leitura resolve figurinha) → `confirming`.
- `searching` → (leitura sem código / não encontrada) → flash vermelho + oferta de `manual`; permanece `searching`.
- `confirming` → "É essa" → executa ação → flash sucesso → `searching` (rearmado).
- `confirming` → "Não é essa" → `searching` (rearmado).
- `confirming` → "Digitar código" → `manual`.
- `manual` → código válido → `confirming`.
- `manual` → fechar → `searching`.

## Estrutura de código

| Arquivo | Papel |
|---------|-------|
| **recriar** `app/(authenticated)/collection/scanner/scanner-confirm-card.tsx` | card de confirmação dirigido por `{ sticker, actionResult }`: imagem/código/nome, cor do sinal, rótulo da ação, botões "É essa" / "Não é essa" / "Digitar código". Reaproveita o layout do card pré-hands-free. |
| **modificar** `app/(authenticated)/collection/scanner/scanner-view.tsx` | troca a execução imediata em `runScan` por: resolver → entrar em `confirming`. Adiciona o estado de confirmação/manual, pausa o loop nesses estados, executa a ação só no "É essa", e renderiza o card + input manual. |
| **sem mudança** | `resolveScanAction`, `frame-metrics`, `frame-signal`, rota `/api/scanner/ocr`. |

Detalhe: `resolveAndRun` passa a entregar `{ sticker, mode }` ao estado de confirmação em vez de chamar `runScan` direto. A mutação (`add`/`remove`) vira a função executada no "É essa", recebendo `sticker` + `mode` capturado no disparo.

## Tratamento de erros

- Leitura sem código / figurinha inexistente → flash vermelho + acesso ao manual; não entra em `confirming`.
- Troca de modo enquanto o card está aberto → o card já carrega o `mode` capturado no disparo, então a ação confirmada honra esse modo (consistente com o fix atual). Ao rearmar, o modo corrente volta a valer.
- Falha do Vision → tratado como leitura vazia (flash vermelho + manual).
- Lookup manual com código inexistente → erro inline, sem sair do `manual`.

## Testes

- **Card** (`scanner-confirm-card`): renderiza imagem/código/nome; mostra o rótulo da ação e a cor conforme o `actionResult` (verde/amarelo/vermelho); dispara os callbacks dos três botões.
- **Máquina de estados de confirmação**: extrair a lógica de transição numa função/redutor puro testável — `confirm` executa a ação resolvida e rearma; `reject` não muta e rearma; `manual` com código válido → `confirming`; inválido → erro. Isolar a transição do plumbing de React pra ser testável sem DOM.
- Funções puras existentes seguem cobertas, sem alteração.

## Decisões em aberto para o plano

- Forma exata do redutor de estados (enum + dados anexos) e como isolar a parte testável do `scanner-view` (que mistura refs do loop, supabase e UI).
- Layout final do input manual (inline no card vs bloco separado) — ajustar na implementação.
