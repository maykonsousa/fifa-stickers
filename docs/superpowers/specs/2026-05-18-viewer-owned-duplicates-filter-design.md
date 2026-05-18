# Filtro de propriedade do viewer na aba "Faltam" do perfil público

## Problema

Na rota `/p/[username]` (perfil público), quando o **usuário logado** visualiza o perfil de **outro usuário** na aba **"Faltam"**, a grid mostra todas as figurinhas que o dono do perfil ainda precisa. Para identificar candidatas de troca, o usuário logado precisa saber **quais dessas figurinhas ele mesmo tem repetidas** — pois são as que ele pode oferecer.

Hoje existe apenas um sinalizador visual na borda do card (gradiente dourado/amarelo para repetida, cinza/branco para 1 cópia, transparente para "não tem") e um checkbox booleano **"Só as que tenho"** que filtra para tudo que o viewer possui (≥1 cópia). Isso não distingue entre "tenho 1" e "tenho repetida" — o que é exatamente a distinção relevante para troca. A sinalização visual existe mas não é suficiente em listas longas.

## Objetivo

Substituir o checkbox por um **toggle de 3 estados** que permita ao viewer recortar a grid da aba "Faltam" pela sua própria propriedade:

- **Todas** — sem filtro
- **Que eu tenho** — viewer possui ≥1 cópia (preserva semântica do checkbox atual)
- **Que eu tenho repetidas** — viewer possui ≥2 cópias (novo recorte, foco em troca)

A aba "Repetidas" já aplica por padrão a interseção "repetidas do dono que faltam ao viewer" via `get_public_stickers`; não recebe mudanças.

## Escopo

### Alterações de UI (`app/p/[username]/profile-stickers.tsx`)

1. **Substituir** o `<label><input type=checkbox>` que renderiza "Só as que tenho" (linhas ~344-354) por um segmented control com as 3 opções acima, na mesma posição da linha de filtros (busca + grupo).
2. **Visibilidade**: idêntica à atual — `tab === "missing" && tradeUIEnabled && isLoggedIn`.
3. **Default**: `"duplicates"` quando `isLoggedIn`, senão `"all"`. Substitui o default atual `ownedOnly = isLoggedIn`, refletindo a dor real (encontrar candidatas de troca).
4. **Acessibilidade**: o controle deve ser navegável por teclado e ter labels semânticos. Usar `role="radiogroup"` ou um componente segmentado já existente no design system se houver — caso contrário, três `<button>` com `aria-pressed` no container `flex` no padrão visual dos outros filtros (borda `white/10`, fundo `white/5`).

### Alterações de estado (mesmo arquivo)

1. Substituir `const [ownedOnly, setOwnedOnly] = useState(isLoggedIn)` por:
   ```ts
   type ViewerFilter = "all" | "owned" | "duplicates";
   const [viewerFilter, setViewerFilter] = useState<ViewerFilter>(isLoggedIn ? "duplicates" : "all");
   ```
2. Substituir `effectiveOwnedOnly` por `effectiveViewerFilter`:
   ```ts
   const effectiveViewerFilter: ViewerFilter =
     tab === "missing" && isLoggedIn ? viewerFilter : "all";
   ```
3. Passar `p_viewer_filter: effectiveViewerFilter` nas duas chamadas a `supabase.rpc("get_public_stickers", ...)` (carga inicial e infinite scroll), no lugar de `p_owned_only`.
4. Incluir `effectiveViewerFilter` no array de dependências dos dois `useEffect` (carga inicial e observer), substituindo `effectiveOwnedOnly`. O reset de paginação (`pageRef.current = 1`, `setResults([])`) ocorre naturalmente como hoje.

### Alterações de SQL — nova migração `supabase/migrations/051_public_stickers_viewer_filter.sql`

1. `DROP FUNCTION IF EXISTS get_public_stickers;` (padrão estabelecido pelas migrations 022, 026, 050).
2. Recriar `get_public_stickers` com a assinatura idêntica à atual exceto pela substituição do último parâmetro:
   - Remover: `p_owned_only BOOLEAN DEFAULT FALSE`
   - Adicionar: `p_viewer_filter TEXT DEFAULT 'all'` (valores aceitos: `'all'`, `'owned'`, `'duplicates'`)
3. Lógica do filtro (somente quando `v_viewer_present` é true e `p_tab = 'missing'`):
   - `'owned'` → `s.id IN (SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id)` — mantém comportamento atual de `p_owned_only=true`.
   - `'duplicates'` → `s.id IN (SELECT us.sticker_id FROM public.user_stickers us WHERE us.user_id = p_viewer_id GROUP BY us.sticker_id HAVING COUNT(*) > 1)` — novo.
   - `'all'` → sem cláusula adicional.
4. Aplicar o predicado igualmente nas duas queries da branch `p_tab = 'missing'` (a do `COUNT` para `v_total` e a do `RETURN QUERY`). Branch `p_tab = 'duplicates'` permanece inalterada.
5. Manter `SECURITY DEFINER SET search_path = ''` e todos os demais predicados (`p_group_id`, `p_keyword`, ordenação, paginação) iguais.

### Fora do escopo

- Aba "Repetidas" — sem mudança.
- Sinalizador visual em `StickerCard` — preservado como reforço para os modos "Todas" e "Que eu tenho".
- `viewerOwnedCounts` no client — preservado; continua alimentando o badge por card.
- Visualização do próprio perfil — sem mudança; o filtro continua não aparecendo (condição `tradeUIEnabled = !isOwnProfile` na page).
- Visitante deslogado — sem mudança; o filtro continua não aparecendo.

## Critérios de aceitação

1. Logado, acessando perfil de outro usuário, aba "Faltam":
   - O toggle de 3 estados aparece no lugar do checkbox.
   - Default selecionado é "Que eu tenho repetidas".
   - "Todas" retorna o universo completo de figurinhas que faltam ao dono.
   - "Que eu tenho" retorna apenas as que o viewer possui ≥1 cópia (idêntico ao comportamento histórico do checkbox marcado).
   - "Que eu tenho repetidas" retorna apenas as que o viewer possui ≥2 cópias.
   - `total_count` retornado pelo RPC reflete o filtro escolhido.
   - Infinite scroll funciona em cada modo.
   - Mudar o filtro reseta a paginação para a primeira página.
2. Logado, no próprio perfil: o toggle não aparece (já é coberto por `tradeUIEnabled = !isOwnProfile`).
3. Deslogado, em perfil alheio: o toggle não aparece.
4. Aba "Repetidas" do mesmo perfil: comportamento inalterado.
5. Sinalizador visual na borda do card permanece visível e correto nos modos "Todas" e "Que eu tenho".

## Notas de implementação

- O RPC já recebe `p_viewer_id`; o cálculo de duplicatas do viewer usa a mesma tabela `public.user_stickers` agregada por `sticker_id` (padrão idêntico ao da branch `duplicates` na migration 050).
- A renomeação do parâmetro (`p_owned_only` → `p_viewer_filter`) é breaking. Verificação por grep mostra que o único chamador em runtime é `app/p/[username]/profile-stickers.tsx` — atualizar nesse arquivo na mesma mudança.
- Não há feature flag; a mudança vai junto do PR.
