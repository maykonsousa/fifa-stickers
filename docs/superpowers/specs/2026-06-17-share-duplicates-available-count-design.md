# Share Duplicates Count — show available (count - 1)

## Context

Correção de regra da feature "Share Duplicates Count". A regra original era:
- count=2 → sem sufixo
- count>=3 → `×N` (com N = count)

O usuário aponta que isso está errado: o usuário tem N cópias, mas uma vai ficar
no álbum. As **disponíveis para troca** são `count - 1`. Logo, a regra correta é:
- count=2 → (count-1)=1 disponível → sem sufixo (não tem nada sobrando pra trocar)
- count=3 → (count-1)=2 disponíveis → `(×2)`
- count=10 → (count-1)=9 disponíveis → `(×9)`

Ou seja: o número exibido é `(count - 1)`, e a regra de exibição vira
`count - 1 >= 2` (ou equivalentemente `count >= 3` — mesmo gatilho, valor
diferente).

Importante: o `totalCount` no header da seção **NÃO** muda — ele continua
sendo a soma de stickers únicos (a "quantos figurinhas tenho repetidas"),
não a soma de unidades disponíveis pra troca. O `(N total)` no header bate
com o hint que o `ShareMenu` mostra (`X figurinhas`).

## Approach

Ajuste cirúrgico em `lib/format-sticker-list.ts`:
- Trocar `${sticker.code} ×${sticker.count}` por `${sticker.code} (×${sticker.count - 1})`.
- Manter o gatilho `sticker.count >= 3` (equivalente a `sticker.count - 1 >= 2`).

Atualizar os testes para refletir:
- `count: 3` → espera `MEX1 (×2)` (não mais `MEX1 ×3`).
- `count: 10` → espera `BRA7 (×9)` (não mais `BRA7 ×10`).
- Manter os testes de count=2, mixed, missing e header sem mudança (eles já
  passam com a nova formatação porque não dependem do formato exato do sufixo,
  apenas que ele aparece/não aparece).

## Não-objetivos

- Não mexer no RPC, no server action, em nenhum tipo, em nenhum arquivo de
  migration. O `count` continua sendo a contagem total no banco; só a
  apresentação muda.
- Não mudar `totalCount`.
- Não mudar a UI.

## Error handling

Sem novos modos de falha. `count` continua sendo `number` e o `count - 1`
funciona para qualquer inteiro >= 0 (com `count: 0` ou `count: 1` o gatilho
não dispara).

## Testes

Atualizar `lib/format-sticker-list.test.ts`:

| Teste | Antes | Depois |
|---|---|---|
| mostra ×N com count >= 3 | `MEX1 ×3` | `MEX1 (×2)` |
| mistura no mesmo grupo | `MEX1 ×3` | `MEX1 (×2)` |
| count alto (10) | `BRA7 ×10` | `BRA7 (×9)` |
| omite sufixo com count=2 | sem sufixo | sem sufixo (inalterado) |
| header usa totalCount | inalterado | inalterado |
| missing não usa sufixo | inalterado | inalterado |

## Arquivos afetados

| Arquivo | Tipo de mudança |
|---|---|
| `lib/format-sticker-list.ts` | Template do sufixo: `×N` → `(×(N-1))` |
| `lib/format-sticker-list.test.ts` | Atualizar 3 asserções |