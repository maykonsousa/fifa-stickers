# Compartilhar "Preciso" com álbum completo

**Data:** 2026-07-14
**Status:** Aprovado

## Problema

O botão "Lista de faltantes" no menu de compartilhar do perfil público
(`app/p/[username]/share-menu.tsx:142`) só é renderizado quando
`totalMissing > 0`. Esse `totalMissing` vem de `get_profile_view_stats`
(`page.tsx:95` → `total - uniqueOwned`) e conta **apenas figurinhas realmente
ausentes**, sem considerar a lista de desejos (`album_wishlist`).

A RPC que gera o conteúdo da lista, `get_user_share_list` com `kind='missing'`
(`supabase/migrations/112_wishlist_reads.sql:122`), **já inclui os desejos**
(`COALESCE(c.cnt,0) = 0 OR w.sticker_id IS NOT NULL`).

Resultado: com o álbum completo (0 faltantes reais) mas com itens na wishlist,
`totalMissing == 0` esconde o botão, e a wishlist fica impossível de divulgar —
mesmo o backend já sabendo montá-la.

## Objetivo

Fazer o gate do botão respeitar a mesma regra da RPC (faltantes reais +
desejos), renomear o botão para **"Preciso"** e mostrar a contagem coerente com
o que a lista realmente contém.

## Decisões

- **Abordagem:** estender `get_profile_view_stats` (fonte da verdade única,
  numa chamada só) em vez de query separada no front.
- **Rótulo do botão:** "Preciso" (sempre).
- **Visibilidade:** visível para todos os visitantes (wishlist é pública, para
  o outro trocador saber o que oferecer) — sem checar `isOwnProfile`.
- **Título da mensagem compartilhada:** mantém `"Faltam pro {displayName}"`.
  O leitor não precisa saber que o dono já tem a figurinha e só quer mais uma.
- **Card "Faltam" no hero:** mantém apenas faltantes reais (`totalMissing`).

## Mudanças

### 1. Migration nova — `supabase/migrations/113_profile_view_stats_wishlist.sql`

Recria `get_profile_view_stats(p_album_id INT, p_viewer_album_id INT)`
adicionando a coluna `wishlist_needed BIGINT` ao retorno.

`wishlist_needed` = número de figurinhas em `album_wishlist` do álbum do dono
que **não são faltantes** (i.e. o dono já possui: `owned_count > 0`). As
faltantes que também estão na wishlist já entram em `owner_unique_owned` como
faltantes, então contar só o incremento evita dupla contagem:

```sql
wishlist_needed = COUNT(figurinhas em album_wishlist do álbum
                        onde a figurinha tem owned_count > 0)
```

Implementação: adicionar CTE de wishlist e contar interseção com
`owner_counts` (cnt >= 1). Restante da função permanece idêntico
(`total_stickers`, `owner_unique_owned`, `owner_total_duplicates`,
`trade_duplicates_count`).

Manter `GRANT EXECUTE ... TO anon, authenticated`.

### 2. `app/p/[username]/page.tsx`

- Adicionar `wishlist_needed` ao fallback de `stats` (default `0`).
- `const wishlistNeeded = Number(stats.wishlist_needed);`
- `const totalNeeded = totalMissing + wishlistNeeded;`
- Passar `totalNeeded` para `ProfileHero` (nova prop), mantendo `totalMissing`
  para o card "Faltam".

### 3. `app/p/[username]/profile-hero.tsx`

- Adicionar prop `totalNeeded: number`.
- Repassar `totalNeeded` para `<ShareMenu>` no lugar de `totalMissing`.
- Card "Faltam" continua usando `totalMissing`.

### 4. `app/p/[username]/share-menu.tsx`

- Renomear prop `totalMissing` → `totalNeeded`.
- Gate do MenuItem: `totalNeeded > 0`.
- `label`: `"Lista de faltantes"` → `"Preciso"`.
- `hint`: usar `totalNeeded` na contagem (`${totalNeeded} figurinha(s)`).
- `shareList("missing")` e o título `"Faltam pro {displayName}"` permanecem.

## O que NÃO muda

- `get_user_share_list` (migration 112) — já correto.
- `format-sticker-list.ts` — inalterado.
- Card "Faltam" no hero — segue mostrando só faltantes reais.
- Lista de "repetidas" — inalterada.

## Verificação

Cenários manuais no perfil público:

1. **Álbum completo + wishlist com desejos:** botão "Preciso" aparece; ao clicar,
   a lista traz as figurinhas desejadas.
2. **Álbum incompleto sem wishlist:** botão "Preciso" aparece com a contagem de
   faltantes reais; comportamento igual ao de antes.
3. **Álbum incompleto + wishlist:** contagem = faltantes + desejos (sem dupla
   contagem quando uma faltante também está na wishlist).
4. **Álbum completo sem wishlist:** botão "Preciso" some (nada a compartilhar).
5. **Visitante (não dono):** vê o botão nas mesmas condições.
