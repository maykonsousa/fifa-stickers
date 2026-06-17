# Share duplicates list — show count when ≥ 3

## Context

O usuário logado pode compartilhar sua lista de figurinhas repetidas pelo
`ShareMenu` no `/p/[username]`. Hoje o texto sai como
`MEX1, MEX2, MEX2, MEX7, MEX7, MEX7` — uma entrada por cópia, sem indicar
quantas cópias o usuário tem de cada figurinha.

Quem recebe a lista (em geral via WhatsApp) precisa contar visualmente as
ocorrências para saber o quanto o outro tem disponível para trocar. Isso é
ruim principalmente para figurinhas com várias repetidas.

Regra acordada com o usuário:
- **1 cópia** → não aparece (já é o caso atual — não entra em `duplicates`).
- **2 cópias** → aparece **sem** sufixo (`MEX2`). Intuitivamente, o leitor não
  precisa saber que existe uma "sobra" — duas cópias é o estado-base de uma
  figurinha "repetida".
- **3+ cópias** → aparece **com** sufixo `×N` (`MEX7 ×3`). A partir de 3 vale
  a pena sinalizar que há 2+ unidades disponíveis para troca.

A lista de faltantes (`kind: missing`) não é afetada — não tem count
relevante (sempre 0 cópias).

## Approach

Reaproveitar o que já existe. Mudanças mínimas e localizadas em três
arquivos, nenhuma alteração de UI.

### 1. RPC `get_user_share_list` (migration 062)

`CREATE OR REPLACE FUNCTION` — adicionar coluna `count INT` ao `RETURNS
TABLE` e ao SELECT, expondo a contagem do CTE `counts` que já existe:

```sql
RETURNS TABLE (
  group_id INT,
  group_name TEXT,
  group_code TEXT,
  sticker_id INT,
  sticker_code TEXT,
  sticker_number INT,
  sticker_title TEXT,
  count INT
)
```

No SELECT, adicionar `c.cnt AS count` (com `COALESCE(c.cnt, 0)` para manter
semântica, embora o `WHERE` já garanta que sempre há contagem).

### 2. `lib/format-sticker-list.ts`

- Estender `ShareStickerItem` com `count: number`.
- Em `formatShareList`, substituir a linha que junta os códigos:

  ```ts
  // antes
  lines.push(group.stickers.map((s) => s.code).join(", "));

  // depois
  lines.push(
    group.stickers
      .map((s) => (s.count >= 3 ? `${s.code} ×${s.count}` : s.code))
      .join(", ")
  );
  ```

Nenhuma outra parte da função muda. O `totalCount` no header continua sendo
a soma de stickers únicos (sem multiplicar por count) — bate com o que o
`ShareMenu` mostra no hint do menu item.

### 3. `app/p/[username]/lib/get-shareable-list.ts`

- Adicionar `count: number` ao tipo local `ShareRow`.
- Propagar no `bucket.stickers.push(...)`.

Sem mudança de contrato com o `ShareMenu` — ele só consome `{ ok, text, count }`.

## Não-objetivos (escopo explícito)

- **Não** mudar o header `(N total)` — bate com a contagem única atual e
  com o hint do menu item.
- **Não** mudar a UI do `ShareMenu` (popover, ícones, hints, ordem dos
  itens).
- **Não** mudar a lista de faltantes.
- **Não** mexer no RPC `lookup_sticker_by_code` (usado pelo scanner).
- **Não** introduzir novo formato "uma linha por cópia" — lista compacta
  continua sendo o formato preferido pra WhatsApp.

## Error handling

Sem novos modos de falha:
- O `count` vem do mesmo CTE que já filtra o resultado — não há caminho em
  que o `count` esteja indefinido.
- Se `count` vier `NULL` por algum motivo, `COALESCE` no SQL garante `0`,
  e a regra `>= 3` simplesmente não dispara (cai no ramo sem sufixo).

## Testes

Atualizar/criar testes de `formatShareList` em
`lib/format-sticker-list.test.ts` (criar se não existir) cobrindo:

- Repetida com `count: 2` → código puro (`MEX2`).
- Repetida com `count: 3` → `MEX2 ×3`.
- Repetida com `count: 10` → `MEX2 ×10`.
- Mista (algumas com `count: 2`, outras com `count: 3`) no mesmo grupo →
  cada sticker é formatado pela sua própria contagem.
- Faltantes: comportamento inalterado (`code` puro, sem sufixo, mesmo que
  o `count` venha 0).
- `totalCount` no header é a soma de stickers únicos, sem multiplicar por
  `count`.

## Arquivos afetados

| Arquivo | Tipo de mudança |
|---|---|
| `supabase/migrations/062_get_user_share_list.sql` | Adicionar coluna `count` |
| `lib/format-sticker-list.ts` | Tipo + regra de formatação |
| `app/p/[username]/lib/get-shareable-list.ts` | Propagar `count` |
| `lib/format-sticker-list.test.ts` | (novo) testes |
