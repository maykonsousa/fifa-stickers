# Modo álbum no perfil — paginação por arrasto

**Data:** 2026-05-26
**Branch base:** `feature/sticker-album-page-pagination`

## Problema

A página de perfil (`/p/[username]`) hoje mostra as figurinhas em grid com scroll infinito e abas Faltam/Repetidas. Falta uma experiência que represente o álbum físico: folhear página por página, com swipe lateral, vendo as figurinhas posicionadas como no livreto real.

Pra isso, o schema atual não basta — não sabemos em qual página do álbum cada figurinha mora, nem onde ela aparece dentro da página.

## Decisões

- **Posição é per-sticker, não per-grupo.** FWC tem layouts irregulares, então derivar do grupo+ordem não funciona uniformemente. Cada figurinha carrega `page`, `row`, `col`.
- **Numeração de página absoluta** (igual ao álbum físico), não relativa por grupo.
- **Mapeamento manual via CSV** versionado em git, convertido em migração de seed. Permite revisão em PR e reprodução em qualquer ambiente.
- **Modo álbum convive com modo lista** via toggle persistido em `localStorage`. Não substitui a UX existente de trocas (que segue só na lista).
- **RPC dedicada pro álbum**, separada da `get_public_stickers` da lista. Assinatura e ordenação diferentes não justificam unificar.

## Schema

Migração `056_add_album_position_to_stickers.sql`:

```sql
ALTER TABLE stickers
  ADD COLUMN page INT,
  ADD COLUMN row INT,
  ADD COLUMN col INT;

CREATE INDEX idx_stickers_page ON stickers(page);

CREATE UNIQUE INDEX uq_stickers_page_position
  ON stickers(page, row, col)
  WHERE page IS NOT NULL;
```

- Colunas **nullable** inicialmente: schema entra em prod antes do mapeamento estar completo. UI trata `page IS NULL` como "não posicionada".
- Índice único parcial impede duas figurinhas no mesmo slot — erros de digitação no CSV explodem no apply.
- Quando o mapeamento estiver 100% verificado em prod, uma migração futura faz `SET NOT NULL` (fora do escopo desta entrega).
- `col` é palavra reservada em SQL padrão mas válida como identificador em Postgres. Mantemos `col` por brevidade; consumidores TS usam o mesmo nome.

## Dados

Fonte verdade: `data/album-positions.csv` (commitado em git).

```csv
sticker_code,page,row,col
BRA1,8,1,1
BRA2,8,1,2
BRA3,8,2,1
...
```

Script `scripts/generate-album-seed.ts` lê o CSV e gera `supabase/migrations/057_seed_album_positions.sql` com `UPDATE stickers SET page=…, row=…, col=… WHERE code='…';` por linha.

Fluxo:
1. Script gera o CSV inicial com todos os `sticker_code`s atuais e colunas de posição vazias.
2. Usuário preenche manualmente (220+ figurinhas, inclui FWC).
3. Script regenera a migração 057 a partir do CSV preenchido.
4. PR contém CSV + migração — reviewável linha a linha.

## RPC

Nova função em `058_public_stickers_album_rpc.sql`:

```sql
get_public_stickers_album(
  p_user_id uuid,
  p_group_id int default null,
  p_keyword text default null,
  p_viewer_id uuid default null
)
returns table (
  id int,
  code text,
  title text,
  image_url text,
  page int,
  row int,
  col int,
  group_id int,
  group_name text,
  duplicate_count int,
  viewer_owned_count int
)
```

- Filtra `page IS NOT NULL`.
- Aplica os mesmos filtros de grupo e keyword da RPC de lista (com `unaccent` + `ilike`).
- Ordena por `(page, row, col)`.
- **Sem paginação por offset** — universo é ~220 stickers, cabe em uma resposta única. Frontend agrupa por `page` em memória.
- **Sem filtro de tab nem de viewer_filter** — modo álbum sempre mostra tudo com indicador visual de posse.
- `duplicate_count` e `viewer_owned_count` mantidos pra renderizar o mesmo `StickerCard` da lista.

## Frontend

### Estrutura

Refatoração mínima do `app/p/[username]/profile-stickers.tsx` (hoje 692 linhas):

| Arquivo | Responsabilidade |
|---------|------------------|
| `profile-stickers.tsx` | Shell: filtros compartilhados (busca/grupo), toggle Lista/Álbum, monta o componente filho correto. |
| `profile-stickers-list.tsx` | **Extrair** view atual: abas Faltam/Repetidas, grid, scroll infinito, seleção de proposta, CTA sticky. Comportamento idêntico ao de hoje. |
| `profile-stickers-album.tsx` | **Novo:** carrossel de páginas, swipe/drag, indicador de progresso. |
| `sticker-card.tsx` | **Extrair** o `StickerCard` (inline hoje) — reutilizado pelos dois modos. |

Refatoração não muda comportamento da lista; só move código. Comportamento de trocas continua exclusivo do modo lista.

### Toggle de view

No header do `profile-stickers.tsx`, ao lado das abas:

```
[Faltam (12)] [Repetidas (8)]        [Lista] [Álbum]
```

Estado persistido em `localStorage` com chave `profileViewMode` (`'list' | 'album'`). Default: `'list'`.

Abas Faltam/Repetidas **escondidas no modo álbum** — folhear é sobre ver tudo contextualizado. Toggle fica visível pra trocar de volta.

### Filtros no modo álbum

- **Busca por código** e **filtro de grupo** continuam ativos. Filtrar grupo "Brasil" salta direto pras páginas 8–9.
- **Viewer filter** (Todas/Que eu tenho/Que tenho repetidas) — escondido. Modo álbum sempre mostra tudo.

### Layout de página

Renderiza grid `[row][col]` direto dos dados. Headers e indicadores:

```
┌─────────────────────────┐
│ Página 8 — Brasil       │
├─────────────────────────┤
│  [1] [2]                │
│ [3] [4] [5] [6]         │
│ [7] [8] [9] [10]        │
├─────────────────────────┤
│  ← Página 7 de 12 →     │
└─────────────────────────┘
```

Header da página mostra grupo predominante (a partir de `group_name` das figurinhas da página).

### Interação

- **Mobile:** tira horizontal com CSS `scroll-snap-type: x mandatory` + `scroll-snap-align: center` por página. Swipe nativo, sem JS de drag.
- **Desktop:** mesmo scroll-snap; drag com mouse implementado por cima (pointer events → `scrollLeft`). Setas ← → e arrow keys do teclado também movem.
- Pre-render de páginas adjacentes (anterior + atual + próxima). Resto das páginas montadas lazy quando entram na viewport.
- Indicador "Página X de N" + dots no rodapé (desktop).

### Empty states

- **Filtro vazio:** "Nenhuma página encontrada com esses filtros."
- **Mapeamento incompleto:** se figurinhas do filtro têm `page IS NULL`, banner não-bloqueante no topo: "Algumas figurinhas ainda não foram posicionadas no álbum. Use o modo lista pra ver todas."

## Fora de escopo (follow-ups)

- Tela admin pra editar `page`/`row`/`col` figurinha por figurinha (correções pós-seed).
- `SET NOT NULL` nas colunas após mapeamento 100% verificado.
- Modo álbum em outras telas (catálogo público, página de grupo).
- Trocas/proposta direto do modo álbum (continua só na lista).

## Riscos

- **Mapeamento manual:** 220+ entradas. Risco de erro de digitação mitigado pelo índice único parcial — apply quebra com mensagem clara apontando o conflito.
- **Layout FWC irregular:** modelo `(row, col)` lida nativamente, mas a previsibilidade do CSV vira responsabilidade humana. Diff em PR é a única revisão.
- **Performance da RPC:** carregar 220 stickers sem paginação é trivial. Se o álbum crescer pra milhares no futuro, paginação por página/grupo passa a ser necessária — não é problema agora.
