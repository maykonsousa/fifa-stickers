# Perfil público — filtro de troca pra visitante logado

**Data:** 2026-05-15
**Rota afetada:** `/p/:username`

## Contexto

A rota `/p/:username` é pública e mostra, nas abas **Faltam** e **Repetidas**, a lista completa de figurinhas do dono do perfil. Hoje todo mundo vê a mesma coisa — incluindo o usuário logado que está olhando o perfil de outro. Pra esse caso, faz mais sentido mostrar só a **interseção de troca**: o que o dono tem que combina com o álbum do visitante.

## Requisitos

- Visitante anônimo: comportamento atual, lista cheia.
- Visitante logado olhando o **próprio** perfil: comportamento atual, lista cheia (vai alimentar uma feature futura de export PDF / mensagem de WhatsApp).
- Visitante logado olhando o perfil de **outro**: filtro de troca sempre ligado, sem toggle.
  - Aba **Faltam** → figurinhas que faltam pro dono **e** que o viewer tem repetida (`viewer_count > 1`).
  - Aba **Repetidas** → figurinhas que o dono tem repetidas (`owner_count > 1`) **e** que o viewer não tem.
- Contadores das tabs refletem a interseção; hero do perfil continua mostrando os totais reais do dono.
- Indicador sutil de que o filtro está ativo.
- Estado vazio específico quando a interseção é zero.
- Botão "Propor troca" acima das tabs, abre um dialog de under-construction (fluxo real fica pra depois).

## UX

### Comportamento por tipo de visitante

| Visitante | Próprio perfil | Perfil de outro |
|---|---|---|
| Anônimo | n/a | Lista completa (atual) |
| Logado | Lista completa (atual) | **Lista filtrada** (interseção de troca) |

### Contadores

- **Tabs** (`Faltam (3)` / `Repetidas (5)`): refletem a interseção filtrada quando o filtro está ativo.
- **Hero** (`totalOwned`, `totalMissing`, `totalDuplicates`, `percent`): inalterado — mostra os totais reais do dono do perfil.

### Texto sutil acima do grid (só quando filtro ativo)

> "Mostrando só figurinhas que combinam com seu álbum."

Pequeno, cinza claro, renderizado entre os filtros (busca + grupo) e o grid.

### Botão "Propor troca" — novo, acima das tabs

Container `rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`.

- Texto à esquerda: `"Quer trocar com @{ownerUsername}?"` em branco/médio.
- Botão à direita: `"Propor troca"` em verde (`bg-green-500 hover:bg-green-600`).
- **Visibilidade**: só quando `tradeFilterActive` (logado em perfil de outro). Não aparece pra anônimo nem em self-view.
- **Estado habilitado**: `tradeMissingCount + tradeDuplicatesCount > 0`. Independe de search/group filter local — usa a interseção total.
- **Estado desabilitado**: ambos = 0. Cor cinza, `cursor-not-allowed`, atributo `title="Sem trocas viáveis no momento"`.
- **onClick**: abre `<TradeProposalDialog>`.

### Estado vazio (interseção da aba ativa = 0, com filtro ligado)

> "Nenhuma troca viável aqui. Vocês não têm sobreposição nessa categoria no momento."

Substitui o "Nenhuma figurinha encontrada." atual só quando `tradeFilterActive`. Para visitante anônimo / self, mantém a mensagem genérica.

### Filtros existentes

Search por código e dropdown de grupo continuam funcionando, agora operando **dentro** da interseção. Sem mudança de UI.

### Dialog "Propor troca" (under-construction)

Componente novo `TradeProposalDialog` (cliente), co-localizado em `app/p/[username]/trade-proposal-dialog.tsx`. Usa `Dialog` do shadcn:

- Ícone `Construction` (lucide).
- Título: "Em construção".
- Texto: "Em breve você vai poder selecionar as figurinhas pra oferecer e as que quer receber, e enviar uma proposta de troca direto por aqui."
- Botão "Fechar".

Sem chamadas de API, sem state global.

### Layout final do `ProfileStickers` (quando filtro ativo)

```
TradeButtonRow              ← novo, só se tradeFilterActive
Tabs: Faltam (N) | Repetidas (M)
Filtros (busca + grupo)
"Mostrando só figurinhas..."  ← novo, só se tradeFilterActive
Grid de cards
Empty state (copy nova se tradeFilterActive)
Paginação
+ <TradeProposalDialog>
```

Pra anônimo e self, oculta `TradeButtonRow` e o hint, mantendo o layout atual.

## Camada de dados

### Migration `026_public_stickers_trade_filter.sql`

Substitui `get_public_stickers` adicionando `p_viewer_id UUID DEFAULT NULL`. Quando não-nulo e diferente de `p_user_id`, aplica a interseção. Caso contrário, comportamento idêntico ao atual — chamadas existentes sem o parâmetro preservam o byte-a-byte.

```sql
DROP FUNCTION IF EXISTS get_public_stickers;

CREATE FUNCTION get_public_stickers(
  p_user_id UUID,
  p_tab TEXT,
  p_group_id INT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_viewer_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id INT, code TEXT, title TEXT, image_url TEXT,
  group_name TEXT, duplicate_count INT, total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_page_size;
  v_total BIGINT;
  v_apply_filter BOOLEAN := p_viewer_id IS NOT NULL AND p_viewer_id <> p_user_id;
BEGIN
  IF p_tab = 'missing' THEN
    -- Missing pro dono + viewer tem repetida (cnt > 1)
    SELECT COUNT(*) INTO v_total
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_user_id
    )
    AND (NOT v_apply_filter OR s.id IN (
      SELECT us.sticker_id FROM public.user_stickers us
      WHERE us.user_id = p_viewer_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%');

    RETURN QUERY
    SELECT s.id, s.code, s.title, s.image_url, sg.name, 0::INT, v_total
    FROM public.stickers s
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_user_id
    )
    AND (NOT v_apply_filter OR s.id IN (
      SELECT us.sticker_id FROM public.user_stickers us
      WHERE us.user_id = p_viewer_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
    ORDER BY sg.id, s.number
    LIMIT p_page_size OFFSET v_offset;

  ELSIF p_tab = 'duplicates' THEN
    -- Dono tem repetida (cnt > 1) + viewer não tem
    SELECT COUNT(*) INTO v_total
    FROM (
      SELECT us.sticker_id, COUNT(*) AS cnt
      FROM public.user_stickers us
      WHERE us.user_id = p_user_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (NOT v_apply_filter OR s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%');

    RETURN QUERY
    SELECT s.id, s.code, s.title, s.image_url, sg.name,
           (dupes.cnt - 1)::INT, v_total
    FROM (
      SELECT us.sticker_id, COUNT(*) AS cnt
      FROM public.user_stickers us
      WHERE us.user_id = p_user_id
      GROUP BY us.sticker_id HAVING COUNT(*) > 1
    ) dupes
    JOIN public.stickers s ON s.id = dupes.sticker_id
    JOIN public.sticker_groups sg ON sg.id = s.group_id
    WHERE (NOT v_apply_filter OR s.id NOT IN (
      SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id
    ))
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
    ORDER BY sg.id, s.number
    LIMIT p_page_size OFFSET v_offset;
  END IF;
END;
$$;
```

**RLS:** `user_stickers` já é `SELECT TO anon USING (true)` (migration 021). `SECURITY DEFINER` preserva isso. Nenhuma policy nova.

### Stats da interseção em `page.tsx`

Computadas em JS no server component, sem RPC adicional. O dataset é pequeno (centenas de `int` por usuário) e o page.tsx já faz cálculos análogos com os dados do dono.

```ts
const isOwnProfile = user?.id === profile.id;
const tradeFilterActive = !!user && !isOwnProfile;

let viewerId: string | null = null;
let tradeMissingCount: number | null = null;
let tradeDuplicatesCount: number | null = null;

if (tradeFilterActive) {
  viewerId = user.id;

  const { data: viewerStickers } = await supabase
    .from("user_stickers")
    .select("sticker_id")
    .eq("user_id", user.id);

  const ownerOwned = new Set<number>();
  const ownerDupes = new Set<number>();
  for (const us of userStickers ?? []) {
    if (ownerOwned.has(us.sticker_id)) ownerDupes.add(us.sticker_id);
    ownerOwned.add(us.sticker_id);
  }

  const viewerCount = new Map<number, number>();
  for (const vs of viewerStickers ?? []) {
    viewerCount.set(vs.sticker_id, (viewerCount.get(vs.sticker_id) ?? 0) + 1);
  }
  const viewerDupes = new Set<number>(
    Array.from(viewerCount.entries()).filter(([, c]) => c > 1).map(([id]) => id)
  );

  tradeMissingCount = Array.from(viewerDupes).filter((id) => !ownerOwned.has(id)).length;
  tradeDuplicatesCount = Array.from(ownerDupes).filter((id) => !viewerCount.has(id)).length;
}
```

Esses valores são passados como props pro `ProfileStickers`.

## Cliente

### `app/p/[username]/page.tsx`

Sem mudança estrutural. Adiciona o bloco de cálculo acima e novos props ao `ProfileStickers`:

```tsx
<ProfileStickers
  userId={profile.id}
  viewerId={viewerId}
  tradeFilterActive={tradeFilterActive}
  ownerUsername={profile.username}
  groups={groups ?? []}
  missingCount={totalMissing}
  duplicatesCount={totalDuplicates}
  tradeMissingCount={tradeMissingCount}
  tradeDuplicatesCount={tradeDuplicatesCount}
/>
```

### `app/p/[username]/profile-stickers.tsx`

**Novos props:**

| Prop | Tipo | Uso |
|---|---|---|
| `viewerId` | `string \| null` | Passado pra RPC como `p_viewer_id`. |
| `tradeFilterActive` | `boolean` | Liga botão, hint text e empty state especiais. |
| `ownerUsername` | `string` | Usado no header do botão ("Quer trocar com @user?"). |
| `tradeMissingCount` | `number \| null` | Substitui `missingCount` nas tabs quando filtro ativo. |
| `tradeDuplicatesCount` | `number \| null` | Substitui `duplicatesCount` nas tabs quando filtro ativo. |

**Estado novo:** `const [tradeOpen, setTradeOpen] = useState(false)`.

**Chamada da RPC:** adiciona `p_viewer_id: viewerId`.

**Tab labels (quando `tradeFilterActive`):**
- `Faltam ({tradeMissingCount ?? 0})`
- `Repetidas ({tradeDuplicatesCount ?? 0})`

**Hint text:** renderizado entre os filtros e o grid quando `tradeFilterActive`.

**Empty state condicional:** copy nova quando `tradeFilterActive && results.length === 0 && !loading`.

### `app/p/[username]/trade-proposal-dialog.tsx` (novo)

```tsx
"use client";
import { Construction } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TradeProposalDialog({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-yellow-400" />
            Em construção
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-300">
          Em breve você vai poder selecionar as figurinhas pra oferecer e as que quer
          receber, e enviar uma proposta de troca direto por aqui.
        </p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Tratamento de erros

| Caso | Comportamento |
|---|---|
| Falha ao buscar `viewerStickers` no server | Fallback `[]` → contadores = 0, filtro segue ativo mas tudo vazio. Sem toast. Console log. Não derruba página. |
| Falha na RPC com `p_viewer_id` | Comportamento atual: `data = null` → `results = []`, empty state aparece. |
| Botão "Propor troca" clicado em estado desabilitado | Não-evento (`disabled` no `<button>`). |
| Sessão expirar entre SSR e CSR | RPC é `SECURITY DEFINER` e `user_stickers` é legível por anon — chamadas seguem funcionando com `p_viewer_id` mesmo sem sessão ativa. |

## Edge cases

| Caso | Comportamento |
|---|---|
| Viewer logado é o próprio dono | `tradeFilterActive = false`. Comportamento atual completo. |
| Viewer anônimo | `user === null` → `tradeFilterActive = false`. Comportamento atual. |
| Viewer tem 0 figurinhas | `tradeMissingCount = 0` (sem repetidas pra oferecer). `tradeDuplicatesCount` pode ser > 0. |
| Dono tem 0 figurinhas | `tradeDuplicatesCount = 0` (sem dupla pra dar). `tradeMissingCount` pode ser > 0. |
| Ambos com interseção total = 0 | Tabs `(0)`, hint visível, empty state especial, botão desabilitado. |
| Search/group narrow a interseção pra 0 | Empty state especial aparece. Botão segue o critério da interseção total (sem o search), então continua habilitado se globalmente > 0. |
| Estado do `user_stickers` muda entre page-loads | Foto estática até `router.refresh()`. Sem live updates. |

## Fora de escopo

- Fluxo real de seleção/proposta de troca (multi-select, mensagem agregada, envio, persistência). Dialog é só placeholder de under-construction.
- Notificações de proposta recebida.
- Filtro de troca em outras rotas (`/friends`, `/trades`, `/collection`).
- Export PDF / mensagem de WhatsApp da lista pública (feature futura mencionada como motivação pra preservar o self-view atual).
- Considerar trocas pendentes — tudo é foto do `user_stickers` no momento.
- Indicadores de "viewer tem N extras" nos cards individuais.
- Componente shadcn `Tooltip` — usa atributo `title` nativo no botão.

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/026_public_stickers_trade_filter.sql` | Novo. `DROP` + `CREATE` de `get_public_stickers` com novo parâmetro opcional `p_viewer_id`. |
| `app/p/[username]/page.tsx` | Fetch de `viewerStickers` quando logado em perfil de outro, cálculo de `tradeMissingCount` / `tradeDuplicatesCount`, novos props pra `ProfileStickers`. |
| `app/p/[username]/profile-stickers.tsx` | Novos props, tab labels dinâmicos, botão "Propor troca" acima das tabs, hint text, empty state condicional, `p_viewer_id` na chamada da RPC, state do dialog. |
| `app/p/[username]/trade-proposal-dialog.tsx` | Novo componente cliente — `Dialog` shadcn com conteúdo de under-construction. |
