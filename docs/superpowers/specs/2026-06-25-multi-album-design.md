# Multi-álbum (Etapa 1) — Design

**Data:** 2026-06-25
**Status:** Aprovado para planejamento
**Escopo:** Etapa 1 de 2. A Etapa 2 (mover figurinhas repetidas entre álbuns) fica fora deste documento.

## Problema

Hoje o app assume **um único álbum implícito e global**. Não existe tabela `albums`: as posições das figurinhas (`page/row/col`) ficam direto em `stickers`, e `user_stickers` liga um usuário a uma figurinha sem nenhum escopo de álbum. Logo, cada usuário tem exatamente uma coleção.

Queremos permitir que o usuário tenha **mais de um álbum pessoal do mesmo template** (ex.: o seu e o do filho, ou um pra trocar), cada um com sua própria contagem de possuídas/repetidas, começando vazio. A estrutura deve ficar preparada para que, no futuro, cada álbum aponte para um **template/modalidade diferente** (não só a Copa).

## Conceitos

- **Template / catálogo** — o conjunto de figurinhas, grupos e posições. Hoje há **um só** (`copa-2026`), global e compartilhado. Futuro: várias modalidades.
- **Álbum do usuário** — instância pessoal **nomeada**, vinculada a um template, contendo a coleção (`user_stickers`) do usuário. Um usuário pode ter vários.

A mudança central: o vínculo deixa de ser `user_sticker → user` e passa a ser `user_sticker → album` (o álbum é que pertence ao usuário).

## Decisões de produto (confirmadas)

1. **Perfil público** mostra **um álbum público escolhido pelo usuário** (`public_album_id`). O link compartilhado sempre aponta pra esse álbum.
2. **Álbum ativo** dentro do app é escolhido por um **seletor no header** e **persistido** (`active_album_id`), voltando no último usado entre sessões.
3. **CRUD completo** de álbuns: criar + renomear + excluir, com proteções (não excluir o álbum público nem o último álbum restante).
4. **Álbum padrão da migração:** todo perfil existente ganha um álbum `"Meu Álbum - 001"` (`template = 'copa-2026'`), que vira o ativo e o público inicial.
5. **Catálogo continua global** nesta etapa — `stickers` e `sticker_groups` ficam intactos. O `template` no álbum é só o gancho para o futuro.

## Modelo de dados

### Nova tabela `albums`

```sql
albums (
  id            SERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  template      TEXT NOT NULL DEFAULT 'copa-2026',   -- gancho p/ modalidades futuras
  sticker_count INT  NOT NULL DEFAULT 0,             -- distintas possuídas NESTE álbum
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
)
```

### Alteração em `user_stickers`

```sql
ALTER TABLE user_stickers ADD COLUMN album_id INT REFERENCES albums(id) ON DELETE CASCADE;
-- user_id permanece (denormalizado, sempre = albums.user_id) para minimizar reescrita
-- de RLS e do trigger de contagem. Invariante: user_stickers.user_id = albums.user_id.
-- album_id vira NOT NULL após o backfill da migração.
```

Índice: `CREATE INDEX ON user_stickers(album_id)` (e manter o de `user_id`).

### Ponteiros em `profiles`

```sql
ALTER TABLE profiles ADD COLUMN active_album_id INT REFERENCES albums(id);  -- persistência do seletor
ALTER TABLE profiles ADD COLUMN public_album_id INT REFERENCES albums(id);  -- exibido no /p/[username]
```

### Contagem (`sticker_count`)

O conceito de "quantas figurinhas distintas" migra de **por-usuário** para **por-álbum** (`albums.sticker_count`). O trigger atual, que mantém `profiles.sticker_count` a partir de `user_stickers`, passa a manter `albums.sticker_count` por `album_id`. O perfil público lê o count do `public_album_id` em vez de `profiles.sticker_count`. A coluna `profiles.sticker_count` deixa de ser fonte de verdade e seu uso é removido das leituras (mantida ou descontinuada conforme conveniência durante a implementação).

## Migração de dados (na própria migration, idempotente)

1. Para **todo perfil existente**, criar um álbum `"Meu Álbum - 001"` com `template = 'copa-2026'`.
2. `UPDATE user_stickers SET album_id = <álbum do dono>` em todas as linhas existentes.
3. Setar `profiles.active_album_id` e `profiles.public_album_id` para esse álbum.
4. Recalcular `albums.sticker_count = COUNT(DISTINCT sticker_id)` por álbum.
5. Tornar `user_stickers.album_id` **NOT NULL**.

Próximo número de migração disponível: **100** (`100_*.sql`).

## RLS / segurança

- **`albums`**: `SELECT` público (o perfil público precisa ler nome/count do álbum público de outros usuários). `INSERT`/`UPDATE`/`DELETE` apenas do dono (`user_id = auth.uid()`).
- **`user_stickers`**: políticas atuais por `user_id` continuam válidas; adicionar validação de que o `album_id` informado pertence ao usuário (check na RPC de escrita ou trigger).
- **Proteções de DELETE de álbum** (regra de negócio, na RPC `delete_album`): rejeitar se o álbum for o `public_album_id` do usuário **ou** se for o último álbum restante.

## RPCs e camada de dados

Todas as RPCs que hoje recebem `p_user_id` passam a operar por **álbum** (adicionar `p_album_id` e filtrar `user_stickers` por ele):

- **`search_stickers`** — `+ p_album_id`; `owned_count` e status (owned/missing/duplicate) contados dentro do álbum. O parâmetro de visitante (`p_viewer_*`) usa o `public_album_id` do dono como referência.
- **`get_public_stickers_album`** — `+ p_album_id` (no perfil público = `public_album_id` do dono; na collection = álbum ativo).
- **`get_user_group_counts`** e **`get_profile_view_stats`** — escopados por `p_album_id`.
- **Escrita** (add/remove no scanner e na collection) — grava/apaga `user_stickers` com `album_id` = álbum ativo.

Novas RPCs/ações:

- `create_album(p_name)` → cria álbum do usuário; retorna o álbum.
- `rename_album(p_album_id, p_name)` → renomeia (valida dono + unicidade do nome).
- `delete_album(p_album_id)` → exclui com as proteções (não público, não único).
- `set_active_album(p_album_id)` → atualiza `profiles.active_album_id`.
- `set_public_album(p_album_id)` → atualiza `profiles.public_album_id`.

Regra geral: **álbum ativo** dirige collection/dashboard/scanner; **álbum público** dirige `/p/[username]`.

## UI/UX

- **Seletor de álbum no header** (área logada): dropdown com os álbuns do usuário + ação "Criar álbum". Selecionar grava `active_album_id` e recarrega o contexto. Persistido entre sessões.
- **Página "Meus álbuns"** (`/albums`): lista os álbuns (nome, contagem, badges "ativo"/"público") com ações criar / renomear / excluir / definir como público.
- **Collection, Dashboard, Scanner**: passam a usar o álbum ativo de forma transparente — refletem o álbum corrente, sem grandes mudanças visuais.
- **Perfil público `/p/[username]`**: lê o `public_album_id`; pode exibir o nome do álbum no cabeçalho. Compartilhamento permanece igual, apontando para o álbum público.
- **Estado vazio**: álbum novo começa zerado, com empty state convidando a escanear/adicionar (e servindo de gancho visual para a Etapa 2 — "mover repetidas").

## Áreas de impacto a confirmar no planejamento

- **Trocas (trades / `trade_items`)**: as trocas operam sobre `user_stickers`, que agora têm `album_id`. Default confirmado: as trocas usam o escopo do **álbum público** (as repetidas mostradas no perfil público são as do `public_album_id`). Isso casa com o fluxo pretendido: após a Etapa 2, as repetidas são transferidas para o álbum novo e o anterior fica completo (sem repetidas), então as trocas acontecem naturalmente no álbum que concentra as repetidas — o público. Validar se `trade_items`/RPCs de troca precisam de `album_id` explícito ou se basta derivar do álbum público do dono.
- **Compartilhamento de repetidas** (feature recente): a lista compartilhada passa a refletir o álbum público.

## Fora de escopo (Etapa 2)

- Função de **mover figurinhas repetidas** de um álbum para outro.
- Suporte real a **múltiplos templates/modalidades** (criação de catálogos distintos). Apenas o gancho (`albums.template`) é entregue agora.
- Permitir que o **visitante escolha qual álbum do colega** visualizar no perfil público (hoje mostra só o `public_album_id`).

## Estratégia de testes

- Migração: a partir de um dump com `user_stickers` existentes, verificar que cada perfil ganha exatamente um `"Meu Álbum - 001"`, todas as linhas recebem `album_id`, e `sticker_count` por álbum bate com `COUNT(DISTINCT sticker_id)`.
- RPCs: coleções de álbuns diferentes do mesmo usuário permanecem isoladas (adicionar no álbum A não afeta o B).
- Proteções: `delete_album` rejeita álbum público e último álbum; `create_album` respeita unicidade de nome por usuário.
- RLS: usuário não lê/escreve `user_stickers` de álbum de outro; `albums` é legível publicamente mas só editável pelo dono.
- Perfil público: `/p/[username]` mostra o `public_album_id`; trocar o ativo no app não altera o conteúdo do link público.
