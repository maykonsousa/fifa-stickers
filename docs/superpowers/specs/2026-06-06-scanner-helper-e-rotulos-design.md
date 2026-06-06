# Scanner: helper por modo + rótulos dinâmicos de ação

**Data:** 2026-06-06
**Branch:** `feature/refinamentos-ui`
**Status:** aprovado, pronto para plano de implementação

## Contexto

O scanner tem três modos (Lançamento / Troca / Baixa), mas a UI não explica o que cada um faz, e os botões do card de confirmação são genéricos ("É essa" / "Não é essa"). Refinamento de cópia/affordance pra deixar claro o que está acontecendo em cada modo.

## Mudanças

### 1. Texto de instrução vira helper por modo

A `<p>` estática de instrução ("Enquadre a figurinha inteira na caixa — o código é detectado automaticamente.") é **substituída** por um texto que muda com o modo ativo:

- **Lançamento:** "Use para adicionar novas figurinhas ao seu álbum — incluindo as repetidas."
- **Troca:** "Use para analisar as figurinhas de outro colecionador e pegar as que faltam."
- **Baixa:** "Use para remover do álbum as repetidas que você está trocando."

Mapa simples `modo → texto` (constante), renderizado conforme `scanMode`.

### 2. Botão de confirmar dinâmico

`resolveScanAction(mode, ownedCount)` ganha um campo **`actionLabel`** (fonte única da verdade), derivado de modo + ação:

| caso | action | actionLabel |
|------|--------|-------------|
| Lançamento (qualquer) | add | **Lançar** |
| Troca, `owned_count == 0` | add | **Pegar** |
| Baixa, `owned_count >= 2` | remove | **Entregar** |
| Troca `>=1` / Baixa `1` / Baixa `0` | none | **Próxima** |

Regra: `actionLabel = action === "none" ? "Próxima" : (lancamento → "Lançar", troca → "Pegar", baixa → "Entregar")`. O "Próxima" sinaliza que não há ação — é só conferir a leitura e ir pra próxima figurinha.

O card de confirmação mostra `result.actionLabel` no botão de confirmar, em vez do fixo "É essa".

### 3. Botão de descartar vira "Cancelar"

No card, o botão de rejeitar muda de "Não é essa" para **"Cancelar"** nos três modos. A pergunta do card ("É essa a figurinha que você tem?") permanece.

## Não-objetivos

- Mudar a lógica de leitura/confirmação/cores/ações (só rótulos e texto).
- Mexer no fluxo do bottom-sheet, no gatilho on-device ou no modo foto além dos rótulos compartilhados (o card é o mesmo nas duas vias).

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `lib/scanner/resolve-scan-action.ts` | adiciona `actionLabel` ao `ScanActionResult` |
| `lib/scanner/resolve-scan-action.test.ts` | cobre `actionLabel` em cada caso |
| `app/(authenticated)/collection/scanner/scanner-confirm-card.tsx` | botão confirmar usa `result.actionLabel`; reject = "Cancelar" |
| `app/(authenticated)/collection/scanner/scanner-view.tsx` | helper de texto por modo (constante + render) |

## Testes

- `resolve-scan-action.test.ts`: estende os casos existentes pra checar `actionLabel` (Lançar/Pegar/Entregar/Próxima) em toda a matriz modo × owned_count.
- Card e helper: visuais, verificados por build/lint + manual (sem testing-library no repo).

## Decisões em aberto

Nenhuma — cópia e rótulos definidos.
