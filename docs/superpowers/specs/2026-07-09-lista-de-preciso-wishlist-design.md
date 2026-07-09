# Lista de Preciso — Wishlist por Álbum

**Data:** 2026-07-09
**Branch:** `feature/lista-desejo-por-album`

## Problema

Hoje o app só mapeia o que **falta** para completar o álbum (`catálogo − o que tenho`, derivado por álbum). Mas algumas figurinhas são de **alta demanda** — quando o usuário as tem, elas "saem fácil" nas trocas. Na euforia da troca presencial, ele deixa passar a chance de pegar cópias extras dessas figurinhas, porque o app não sinaliza que ele **quer** elas (só sinaliza as que faltam).

## Objetivo

Transformar a "lista de faltantes" numa **"lista de preciso"**, que mescla:

- **faltantes** (automático, `owned = 0`) — some ao adquirir, como hoje.
- **desejos** (manual, liga/desliga) — figurinhas que o usuário quer estocar mesmo já tendo; ficam na lista até ele desligar.

Escopo do desejo: **por álbum** (fiel ao modelo multi-álbum existente).

## Não-objetivos (YAGNI)

- **Sem meta de quantidade.** O desejo é um marcador liga/desliga. Em vez de meta, mostramos "você tem N" para orientar quando desligar.
- **Sem wishlist no perfil público / trocas online.** Não mexe no matching de troca online (hoje "o que te ofereço" = faltantes do dono). Isso gera contradição (a figurinha desejada o usuário já tem, e ela também é "repetida") e casos de borda. Fica para uma evolução futura.

## Definição da "lista de preciso"

Para um álbum:

```
preciso = faltantes (owned = 0)  ∪  desejos (na wishlist, qualquer owned)
```

- Faltante: aparece como hoje; some quando `owned > 0`.
- Desejo: fica na lista para sempre até desligar manualmente; exibido com badge **"tem N"**.
- Marcar desejo só faz sentido em figurinhas que o usuário **já tem** (faltantes já estão na lista por definição). Marcar uma faltante é redundante mas inofensivo.

## Modelo de dados

Nova tabela `album_wishlist`:

| coluna       | tipo    | notas                                  |
|--------------|---------|----------------------------------------|
| `id`         | uuid    | PK (padrão `user_stickers`)            |
| `album_id`   | int     | FK → `albums` `ON DELETE CASCADE`      |
| `sticker_id` | uuid    | FK → `stickers`                        |
| `created_at` | timestamptz | default now()                      |

- `UNIQUE (album_id, sticker_id)` — marcador liga/desliga.
- **RLS:** só o dono do álbum faz `select`/`insert`/`delete` (álbum pertence a `auth.uid()`), mesmo padrão de `user_stickers` (migration 106).
- Cascade ao deletar álbum (a wishlist é por álbum).

Toggle é `insert`/`delete` direto do client sob RLS — igual o `user_stickers` já faz no scanner. Sem RPC de escrita.

## Comportamento por tela

### 1. Coleção (visão do dono)
- Filtro **"Faltam" → "Preciso"** = faltantes + desejos.
  - Faltantes: como hoje.
  - Desejos que já possui: badge **"tem N"**.
- Cada card ganha toggle **⭐** (estrela = "quero pegar"; escolhido sobre coração, que sugere "favoritar/curtir"). Ligado = na wishlist. Toque liga/desliga (`insert`/`delete` em `album_wishlist`).
- Filtros "Tenho" e "Repetidas": inalterados. Uma figurinha desejada que o usuário tem continua aparecendo neles — sem conflito.

### 2. Lista compartilhável (WhatsApp)
- A lista "faltam" enviada aos parceiros passa a incluir os desejos → vira a **lista de preciso** completa (agrupada por time, com os números — formato atual).
- Mesclado direto, sem seção separada: para o parceiro, só importa quais números o usuário quer.

### 3. Scanner — modo Troca (`troca`)
`resolveScanAction(mode, ownedCount, wishlisted)`:

| condição                          | cor      | ação   | mensagem                              | botão      |
|-----------------------------------|----------|--------|---------------------------------------|------------|
| `owned = 0`                       | verde    | `add`  | "Nova — pega!"                        | "Pegar"    |
| `owned ≥ 1` **e** `wishlisted`    | verde    | `add`  | "Você quer mais dessa — pega! (tem N)"| "Pegar"    |
| `owned ≥ 1` **e** não wishlisted  | amarelo  | `none` | "Você tem N figurinhas"               | "Próxima"  |

- "Pegar" no caso wishlist adiciona à coleção (vira repetida), igual ao pegar uma faltante.
- O scanner **só lê** a wishlist; gerenciamento (liga/desliga) é pela coleção.
- Modos `lancamento` e `baixa`: inalterados.

## Implementação

Migrations (convenção numerada; não editar as antigas):

- **`111_album_wishlist.sql`** — cria `album_wishlist` + RLS.
- **`112_wishlist_reads.sql`** — atualiza 3 RPCs:
  - `search_stickers` → novo status **`preciso`** (`owned = 0` OU na wishlist) + retorna flag `wishlisted` por linha (para desenhar a ⭐).
  - `get_user_share_list` / `get_user_share_list_count` → `kind='missing'` passa a incluir os desejos.
  - `lookup_sticker_by_code` → retorna `wishlisted` (para o scanner).

Código:

- `lib/scanner/resolve-scan-action.ts` — novo ramo troca+wishlist (assinatura ganha `wishlisted`). **Função pura → TDD.**
- `lib/scanner/lookup-sticker-by-code.ts` + `scanner-view.tsx` — lê `wishlisted`, repassa a `resolveScanAction`. Copy do card/flash reflete a nova mensagem.
- Coleção (`collection-view.tsx` + `sticker-card.tsx`) — toggle ⭐, filtro "Faltam"→"Preciso", badge "tem N".
- Lista compartilhável — sem mudança de código (a RPC entrega mesclado).

## Testes

- **Unit (TDD):** `resolve-scan-action.test.ts` — ramo troca+wishlist (owned≥1 wishlisted → verde/add; owned≥1 não wishlisted → amarelo/none; owned=0 inalterado).
- **Migrations:** validar RLS (dono lê/escreve; não-dono bloqueado) e a semântica `preciso` em `search_stickers`.
- **Manual (end-to-end):** ligar/desligar ⭐ na coleção; conferir "Preciso" e badge "tem N"; conferir texto do WhatsApp com desejos; escanear em modo Troca uma figurinha que possui e está na wishlist → "pega!".
