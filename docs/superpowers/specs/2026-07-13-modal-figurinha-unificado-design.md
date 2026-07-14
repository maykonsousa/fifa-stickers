# Modal de figurinha unificado (coleção)

**Data:** 2026-07-13
**Escopo:** Página de coleção (`app/(authenticated)/collection/`) — visões lista e álbum.

## Problema

Ao clicar numa figurinha na coleção, o usuário percebe "modais diferentes" entre a
visão lista e a visão álbum. Na prática, hoje **as duas visões compartilham os mesmos
componentes**, e o que abre depende do *estado da figurinha*, não da visão:

- Possui (owned ≥ 1) → `StickerActionsModal` (+1 / −1 / wishlist), **sem foto**.
- Não possui + sem imagem → `StickerImageUpload` (câmera/galeria + crop).
- Não possui + com imagem → **+1 direto, sem modal**.

Divergência real entre as visões: o modo álbum **não passa `wishlisted`**, então o botão
de wishlist não aparece lá.

## Objetivo

Um **único modal** para toda figurinha clicada, com layout consistente, foto embutida,
upload embutido, wishlist funcionando nas duas visões e **navegação entre figurinhas**
(setas + swipe) sem fechar o modal.

## Decisões (do brainstorming)

1. Um modal para tudo, incluindo o upload de foto embutido. *(Q1=A)*
2. Todo clique abre o modal; adicionar é sempre pelo botão do footer (sem +1 direto). *(Q2=A)*
3. Sem foto: quantidade + footer + wishlist continuam visíveis e funcionais; foto é opcional. *(Q3=A)*
4. Wishlist funciona nas duas visões. *(Q4=A)*
5. Dialog centralizado (mantém consistência com os modais atuais). *(Q5=A)*
6. Navegação respeita filtros/ordem atuais *(Q6.1=A)*; para nos extremos (não circular) *(Q6.2=A)*.
7. Na lista paginada, ao passar do fim da página carrega a próxima e continua. *(Q7=B)*
8. Incluir swipe lateral no mobile + setas. *(follow-up=A)*

## Layout

Dialog centralizado (base `@/components/ui/dialog`, `@base-ui/react`), estilo dark igual
aos modais atuais (`bg-zinc-900/95 backdrop-blur-xl border-white/15`).

```
┌─────────────────────────────────────┐
│  [★]        CÓDIGO                [✕]│   header
│             Nome da figurinha         │
├─────────────────────────────────────┤
│  ‹                                 ›  │   setas prev/próxima (laterais)
│           ┌───────────┐               │
│           │   FOTO     │              │   área da foto (ou editor de upload)
│           │  49x63     │              │
│           └───────────┘               │
│         Quantidade no álbum           │
│               3                       │
├─────────────────────────────────────┤
│    [ − Remover 1 ]   [ + Adicionar ] │   footer (actions)
└─────────────────────────────────────┘
```

**Header:**
- Esquerda: botão ★ wishlist — `aria-pressed`, preenchido (`fill="currentColor"`) quando ativo, spinner quando `wishlistBusy`.
- Centro: código em destaque + nome (`title`) embaixo, menor/cinza; trunca se longo.
- Direita: ✕ fechar (desabilitado enquanto `busy`, igual comportamento atual).

**Área da foto — 3 estados:**
1. **Com imagem:** `<img>` respeitando `orientation` (aspect `49/63` retrato / `5/3` paisagem), fundo preto. Botão discreto "Trocar foto" abre o editor no lugar da foto.
2. **Sem imagem:** renderiza `StickerImageEditor` (botões Câmera/Galeria). Quantidade + footer + wishlist continuam visíveis e ativos.
3. **Editando (arquivo escolhido):** crop + zoom + orientação (retrato/paisagem) + Confirmar/Trocar, no lugar da foto — comportamento idêntico ao `StickerImageUpload` atual.

**Quantidade:** "Quantidade no álbum" + número grande (`tabular-nums`), como hoje.

**Footer (actions):**
- "− Remover 1": desabilitado quando `owned_count === 0` ou `busy`.
- "+ Adicionar 1": desabilitado quando `busy`.
- Ambos mostram spinner durante a mutation.

**Navegação (setas ‹ › + swipe):**
- Setas absolutas nas laterais da área central. Desabilitadas nos extremos.
- Swipe lateral no mobile (arrastar) troca de figurinha — reaproveitar o padrão de `pointerdown/move/up` do álbum (`profile-stickers-album.tsx`).
- Trocar de figurinha atualiza o conteúdo do modal in-place; +1/−1/wishlist/foto agem sempre sobre a figurinha visível.
- **Lista:** percorre `results`. Ao chegar no fim com `hasMore`, dispara `setPage(p+1)`; a seta › mostra spinner até a página carregar, então avança para o próximo item.
- **Álbum:** percorre a sequência achatada de `displayPages` (ordem página→linha→coluna). Tudo já em memória; sem fetch adicional.
- Se ao editar/trocar foto o usuário estiver no meio do fluxo de crop, navegar cancela o crop em andamento (reset do editor).

## Arquitetura

### Componentes

**Novo — `app/(authenticated)/collection/sticker-detail-modal.tsx` (`StickerDetailModal`)**
O modal unificado. Puramente apresentacional + navegação; recebe callbacks do pai.

Props:
```ts
interface StickerDetailModalProps {
  open: boolean;
  onClose: () => void;
  sticker: {
    id: number;
    code: string;
    title: string | null;
    image_url: string | null;
    orientation: "portrait" | "landscape";
    owned_count: number;
    wishlisted: boolean;
  } | null;
  userId: string;
  busy: boolean;          // mutation +1/-1 em andamento
  wishlistBusy: boolean;
  // navegação
  hasPrev: boolean;
  hasNext: boolean;
  navBusy: boolean;       // carregando próxima página (lista)
  onPrev: () => void;
  onNext: () => void;
  // ações
  onIncrement: () => void;
  onDecrement: () => void;
  onToggleWishlist: () => void;
  // foto (repassa pro editor embutido)
  onImageUploaded: (imageUrl: string) => void;
  onImageRemoved: () => void;
}
```

**Novo (refactor) — `components/sticker-image-editor.tsx` (`StickerImageEditor`)**
Miolo extraído do `StickerImageUpload` **sem** o `Dialog`. Contém toda a lógica de
seleção de arquivo, crop (`react-easy-crop`), zoom, orientação, upload pro Storage
(`sticker-images`, `cacheControl` 1 ano, `?v=` cache-bust) e remoção — igual hoje.

Props aproximadas (herdadas do `StickerImageUpload` atual):
`{ stickerId, stickerCode, userId, onSuccess, onSkip?, currentImageUrl?, onRemove?, canReplace? }`.

**`components/sticker-image-upload.tsx`** vira casca fina: `Dialog` + `DialogHeader` +
`<StickerImageEditor .../>`. Mantém a mesma API pública — o admin
(`app/admin/(dashboard)/stickers/stickers-admin.tsx`, usa `canReplace`) segue funcionando
sem mudança.

**`app/(authenticated)/collection/sticker-actions-modal.tsx`** removido — só a coleção usa.

### Estado e dados (`CollectionView`)

Substituir `actionsSticker` + `uploadSticker` por navegação por índice:

- `navIndex: number | null` — índice da figurinha aberta na lista de navegação (null = fechado).
- `navList` — lista ordenada **normalizada** derivada da visão ativa:
  - Modo lista: mapeia `results`.
  - Modo álbum: achata `displayPages` na ordem página→row→col.
  - Forma normalizada: `{ id, code, title, image_url, orientation, owned_count, wishlisted }`.
- `handleCardClick(sticker)` passa a **só** abrir o modal: acha o índice do sticker na `navList` e faz `setNavIndex(idx)`. Remove os ramos de +1 direto e de escolher qual modal abrir.

**Orientação:** `StickerResult` (lista) não tem `orientation` hoje; `AlbumSticker` tem.
Adicionar `orientation` ao retorno da lista seria migração de RPC. Para evitar isso e não
mexer no egress, no modo lista assume-se `"portrait"` como padrão (tamanho 49x63) quando
o dado não estiver disponível. *(Aceitável: a foto só define o aspect ratio de exibição; a
orientação real é gravada no upload e usada no álbum.)*

**Wishlist no álbum (Q4):** sem migração de RPC. Em `CollectionView`, buscar uma vez os
`sticker_id` de `album_wishlist` do álbum atual (`select sticker_id where album_id = albumId`)
para um `Set<number>` (`wishlistedIds`), refazendo o fetch quando `albumId` mudar. O modo
álbum usa esse Set para preencher `wishlisted`. O modo lista continua usando o `wishlisted`
que o `search_stickers` já retorna. O toggle de wishlist atualiza **ambos**: o `results`
(como hoje) e o `wishlistedIds` Set (para o álbum refletir na hora).

**Mutations:** reaproveitar as já existentes, generalizando para receber `stickerId`
explícito (hoje algumas leem de `actionsSticker`):
- `doIncrement(id)` / `doDecrement(id)` — já recebem id; manter `incrementLocal`/`decrementLocal`/`bumpOverride` (updates otimistas que evitam refetch).
- `doToggleWishlist(id, current)` — generalizar para receber id e estado atual; atualizar `results` + `wishlistedIds`.
- Upload: `onImageUploaded(id, url)` → `incrementLocal`? Não. Hoje o upload adiciona +1 ao concluir. **Mudança:** com o modal unificado, adicionar foto **não** implica +1 automático — adicionar quantidade é sempre pelo footer. O upload só grava a imagem (`setImageLocal(id, url)`); o +1 é ação separada do usuário no footer.
- Remover foto: `setImageLocal(id, null)`.

> Nota de comportamento: hoje `handleUploadSuccess`/`handleSkipUpload` fazem insert em
> `user_stickers` (+1) porque o upload era o caminho de "adicionar figurinha nova sem foto".
> No modelo novo isso se separa: **foto = só imagem; quantidade = só footer.** Isso é
> coerente com Q2=A (todo clique abre modal; adicionar é sempre pelo botão).

### Navegação — lógica no `CollectionView`

- `hasPrev = navIndex > 0`.
- `hasNext` (lista) = `navIndex < navList.length - 1` **ou** `hasMore` (pode carregar mais).
- `hasNext` (álbum) = `navIndex < navList.length - 1`.
- `onNext`: se `navIndex + 1 < navList.length` → incrementa. Senão, se lista e `hasMore` →
  `setPage(p+1)`, marca `navBusy`; um `useEffect` observando o crescimento de `navList`
  avança o índice quando os novos itens chegam e limpa `navBusy`.
- `onPrev`: decrementa se `hasPrev`.
- Teclas ← / → também navegam quando o modal está aberto (opcional, consistente com o álbum).

## Estados de erro

- Falha em +1/−1/wishlist/upload: mantém o tratamento atual (toasts via `sonner`;
  upload loga erro no console e não fecha). Sem regressão.
- Navegação para próxima página que retorna vazio: `navBusy` limpa, seta › fica desabilitada.

## Testes

Seguir o padrão de testes já existente no projeto (verificar `*.test.ts(x)` próximos).
Cobrir, no mínimo:
- Normalização `navList` a partir de `results` (lista) e de `displayPages` (álbum, ordem página→row→col).
- Lógica de navegação: extremos desabilitam setas; `hasNext` considera `hasMore` no modo lista.
- `wishlistedIds` Set: toggle atualiza estado; álbum reflete `wishlisted`.
- `StickerDetailModal`: renderiza os 3 estados da área da foto; footer desabilita "Remover 1" com `owned_count === 0`.
- `StickerImageEditor` extraído mantém comportamento de upload/crop (teste do `StickerImageUpload` existente, se houver, deve continuar passando).

## Fora de escopo (YAGNI)

- Scanner (`scanner-view.tsx`) e perfil público (`/p/[username]`) — não mudam agora.
- Migração dos RPCs `search_stickers` / `get_public_stickers_album`.
- `StickerImageEditor` fica disponível para unificação futura, mas não é aplicado fora da coleção neste trabalho.

## Componentes tocados (resumo)

| Arquivo | Ação |
|---|---|
| `app/(authenticated)/collection/sticker-detail-modal.tsx` | **novo** — modal unificado |
| `components/sticker-image-editor.tsx` | **novo** — miolo de upload/crop sem Dialog |
| `components/sticker-image-upload.tsx` | refactor — casca fina sobre o editor (API preservada) |
| `app/(authenticated)/collection/collection-view.tsx` | troca modais por navegação; fetch wishlist do álbum; `handleCardClick` só abre modal |
| `app/(authenticated)/collection/sticker-actions-modal.tsx` | **removido** |
