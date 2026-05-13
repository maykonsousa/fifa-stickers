# Perfil Público — Redesign

## Contexto

A página `/p/[username]` é o cartão de visitas do colecionador e o principal canal de aquisição de novos membros. Usuários compartilham o link para mostrar figurinhas que precisam e que têm para trocar. Visitantes precisam ver uma página bonita, útil e navegável que os motive a se cadastrar.

## Requisitos

- Página pública acessível sem login
- Header com branding + CTA para visitantes não-logados; omitido para logados (que já têm a NavBar)
- Hero card com identidade do colecionador e stats
- Grid visual de figurinhas com imagens reais (aspect 2:3)
- Duas abas: "Faltam" e "Repetidas"
- Filtro por grupo (combobox) + busca por código
- Paginação server-side para performance
- Responsivo (mobile-first)

## Arquitetura

### Rota: `app/p/[username]/page.tsx` (Server Component)

- Busca perfil por username
- Detecta se visitante está logado (cookie, sem redirect) para decidir header
- Passa dados iniciais para componentes client

### Componentes

```
app/p/[username]/
├── page.tsx              — Server: busca perfil, stats, renderiza layout
├── public-header.tsx     — Client: logo + CTA (só para não-logados)
├── profile-hero.tsx      — Server: avatar, nome, stats, progresso, contato
├── profile-stickers.tsx  — Client: abas, filtros, grid, paginação
```

### Layout da página

```
┌─────────────────────────────────────────────┐
│ [Logo faltaUma]              [Começar agora] │  ← header público (não-logados)
├─────────────────────────────────────────────┤
│                                             │
│  [Avatar]  Nome                             │
│            @username · Cidade, UF           │
│                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ 420  │  │ 218  │  │  45  │              │
│  │Coladas│  │Faltam│  │Repet.│              │
│  └──────┘  └──────┘  └──────┘              │
│                                             │
│  ████████████████░░░░░░░  66%               │  ← progresso
│                                             │
│  📷 @instagram  📱 whatsapp                 │  ← contato (se flags ativas)
│                                             │
├─────────────────────────────────────────────┤
│  [Faltam (218)]  [Repetidas (45)]           │  ← abas
│                                             │
│  [🔍 Buscar código]  [Filtrar por grupo ▾]  │  ← filtros
│                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │     │ │     │ │     │ │     │ │     │  │
│  │ img │ │ img │ │ img │ │ img │ │ img │  │
│  │     │ │     │ │     │ │     │ │     │  │
│  │BRA14│ │ARG20│ │FRA07│ │ESP15│ │POR03│  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ ... │ │ ... │ │ ... │ │ ... │ │ ... │  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │
│                                             │
│         [← Anterior]  [Próxima →]           │  ← paginação
│                                             │
└─────────────────────────────────────────────┘
```

## Componentes em detalhe

### `public-header.tsx`

- Client component (precisa detectar auth state)
- Logo "faltaUma" (reutiliza `MarkFU` + wordmark) linkando para `/`
- Botão "Começar agora" estilo CTA (bg-yellow-400, font-display) linkando para `/`
- Sticky top, backdrop-blur, border-b border-white/10
- Não renderiza se usuário está logado

### `profile-hero.tsx`

- Avatar (80px, rounded-full) ou inicial do nome
- Nome (text-2xl, font-bold), @username, localização
- 3 stat cards: Coladas, Faltam, Repetidas
- Barra de progresso (green-500)
- Seção de contato com ícones (Instagram, WhatsApp) — só se flags ativas

### `profile-stickers.tsx`

- Client component (interatividade: abas, filtros, paginação)
- Recebe: `userId`, `groups[]` (para o filtro)
- Fetch client-side via API route ou RPC para paginação
- Abas com contagem
- Filtros: input de busca + combobox de grupo (mesmo padrão da collection)
- Grid responsivo: 3 cols mobile, 4 tablet, 5 desktop
- Cards de figurinha:
  - Imagem real (aspect 2:3, object-cover, rounded-lg)
  - Placeholder com ícone + código quando sem imagem
  - Badge inferior com código
  - Na aba "Repetidas": badge amber com ×N no canto superior direito
- Paginação: 20 items por página, componente `PaginationControl` existente

## Data Flow

### Server (page.tsx)
1. Busca perfil por username
2. Busca stats agregados (total owned, missing, duplicates counts)
3. Busca lista de grupos (para filtro)
4. Detecta auth state (cookie)
5. Passa tudo para os componentes

### Client (profile-stickers.tsx)
1. Fetch paginado de figurinhas (filtrado por aba + grupo + keyword)
2. Usa RPC ou query direta ao Supabase com anon key
3. Re-fetch ao mudar aba, filtro, busca ou página

### RPC necessária: `get_public_stickers`

```sql
CREATE FUNCTION get_public_stickers(
  p_user_id UUID,
  p_tab TEXT,        -- 'missing' ou 'duplicates'
  p_group_id INT,    -- null = todos
  p_keyword TEXT,    -- null = sem filtro
  p_page INT,
  p_page_size INT
)
RETURNS TABLE(
  id INT,
  code TEXT,
  image_url TEXT,
  group_name TEXT,
  duplicate_count INT,
  total_count BIGINT
)
```

## Estilo Visual

- Background: `bg-gradient-to-br from-gray-900 via-gray-900 to-green-950`
- Cards: `bg-white/5 border border-white/10 rounded-xl`
- Stats: fundo glassmorphism, números em font-display
- Figurinhas sem imagem: placeholder escuro com código centralizado
- Hover nos cards: scale sutil + borda mais visível
- Consistente com o dark theme do app

## Migration necessária

Nova RPC `get_public_stickers` em `supabase/migrations/022_public_stickers_rpc.sql`

## Verificação

1. Build sem erros
2. Acessar `/p/[username]` deslogado → header público visível, dados carregam
3. Acessar `/p/[username]` logado → sem header público, NavBar normal
4. Filtrar por grupo → grid atualiza
5. Buscar por código → resultados filtram
6. Trocar aba → conteúdo muda
7. Paginar → próxima página carrega
8. Mobile → layout responsivo, 3 colunas
