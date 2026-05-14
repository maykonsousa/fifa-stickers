# Admin — Adicionar figurinha

**Data:** 2026-05-14
**Rota afetada:** `/admin/stickers`

## Contexto

Hoje `/admin/stickers` só permite **editar** figurinhas existentes (título, descrição, imagem). Foram localizadas figurinhas oficiais do álbum que ainda não estão cadastradas no banco. Precisamos de um fluxo para **criar** novas figurinhas a partir dessa rota.

## Requisitos

- Criação **uma de cada vez** (não há demanda por importação em lote).
- Admin sabe o **código oficial** (ex: `BRA21`, `FWC15`) e o número impresso — não deve haver geração automática.
- **Imagem é opcional** no momento da criação — pode entrar via câmera/galeria no mesmo fluxo, ou ficar para depois.
- Reaproveitar a UX de imagem do fluxo de usuário, incluindo captura por câmera, crop em proporção 2/3 e compressão.

## UX

### Entrada na UI

Card `+` fixo como **primeiro item da primeira página** do grid em `/admin/stickers`. Mesmo aspect-ratio (2/3) e estilo das demais células, com ícone `+` centralizado. Em páginas além da primeira, o grid começa normalmente nas figurinhas (evita "esse card aparece toda página?").

Ao clicar, abre o modal de criação.

### Modal de criação

Reaproveita o estilo do modal de edição existente (mesmo container `<dialog>`, mesma paleta).

Campos:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| Grupo | combobox (popover + command) | sim | Lista `sticker_groups`. Pré-preenchido com o grupo do filtro ativo, se houver. |
| Código | text | sim | Convertido para uppercase no submit. |
| Número | number | sim | Sugere `max(number) + 1` calculado client-side a partir da lista `stickers` já recebida via props (filtrada pelo grupo selecionado). Admin pode sobrescrever. |
| Título | text | não | Mesmo placeholder do modal de edição. |
| Descrição | text | não | Mesmo placeholder do modal de edição. |

Botões: **Salvar** / **Cancelar**.

### Validações no client

- Grupo, código e número são obrigatórios.
- Código vazio → erro inline.
- Código que **não começa com o `code` do grupo selecionado** → aviso inline em amarelo abaixo do campo ("O código não segue o padrão do grupo `BRA`."). Ao clicar Salvar, dispara um `window.confirm("O código não segue o padrão do grupo. Continuar?")` antes de chamar a Server Action. Não bloqueia: figurinhas oficiais podem ter prefixos atípicos.
- Número precisa ser inteiro positivo.

### Fluxo de imagem (Opção A — duas etapas)

1. Admin preenche o form e clica **Salvar**.
2. Server Action `createSticker` insere a figurinha e devolve `{ id, code }`.
3. Modal de criação fecha automaticamente; em seguida abre o componente existente `StickerImageUpload` (`components/sticker-image-upload.tsx`) recebendo o `stickerId` e `stickerCode` recém-criados.
4. `StickerImageUpload` exibe os botões **Câmera** / **Galeria** / **Pular e adicionar sem foto** — comportamento idêntico ao fluxo do usuário.
5. Se admin anexar: componente faz crop + compressão + upload no Storage + `update` em `stickers.image_url`. Se pular: figurinha fica sem `image_url` (estado válido, várias figurinhas existentes estão assim).
6. Após o fechamento desse segundo modal, `router.refresh()` garante que o grid reflita o novo registro.

**Por que duas etapas em vez de um único modal:** reusa 100% o componente existente sem refactor, bate com a decisão "imagem opcional", e o `StickerImageUpload` já está validado em produção. A transição entre os dois modais é praticamente invisível.

## Camada de dados

### Server Action

Arquivo: `app/admin/(dashboard)/stickers/actions.ts`.

```ts
"use server";

export async function createSticker(input: {
  groupId: number;
  code: string;
  number: number;
  title?: string;
  description?: string;
}): Promise<
  | { data: { id: number; code: string }; error: null }
  | { data: null; error: "unauthorized" | "duplicate_code" | "invalid_input" | "unknown" }
>;
```

Passos internos:

1. Cria client Supabase no servidor (`@/lib/supabase/server`) e obtém o usuário via `auth.getUser()`.
2. Verifica `is_admin(auth.uid())` (função já existe na migration `014_create_admins.sql`). Se falso → `{ error: "unauthorized" }`.
3. Valida entrada: `groupId` referencia um grupo existente, `code` não vazio, `number` inteiro positivo. Normaliza `code` para uppercase. Se inválido → `{ error: "invalid_input" }`.
4. `INSERT INTO stickers (group_id, code, number, title, description) VALUES (...)`. Em violação de UNIQUE no `code` → `{ error: "duplicate_code" }`.
5. `UPDATE sticker_groups SET sticker_count = sticker_count + 1 WHERE id = $groupId` — atômico no Postgres, seguro sob concorrência.
6. Retorna `{ data: { id, code }, error: null }`.

### Nova migration RLS

Arquivo: `supabase/migrations/025_admin_stickers_write.sql`.

```sql
CREATE POLICY "stickers_insert_admin"
  ON stickers FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "sticker_groups_update_admin"
  ON sticker_groups FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
```

Necessário porque a Server Action roda com o token do admin autenticado (não service-role), e hoje só existe policy de SELECT em `stickers` e `sticker_groups`.

**Nota:** durante a implementação, validar se a `update` atual do modal de edição (que roda no client) realmente funciona — não há policy de UPDATE em `stickers` no schema atual. Se estiver silenciosamente quebrada, é bug separado a registrar; o fluxo de criação não depende disso para funcionar.

## Tratamento de erros

| Caso | Comportamento |
|---|---|
| Não-admin | `{ error: "unauthorized" }` → toast "Acesso negado". Defesa em profundidade — a rota já é protegida. |
| Código duplicado | `{ error: "duplicate_code" }` → mensagem inline no campo Código: "Já existe figurinha com esse código". Form permanece aberto, demais campos preservados. |
| Grupo inexistente | `{ error: "invalid_input" }` → toast genérico. Caso raro, combobox lista apenas grupos válidos. |
| Erro de DB inesperado | `{ error: "unknown" }` → toast "Erro ao criar figurinha. Tente novamente." e log no console. |
| Erro no upload de imagem (segundo modal) | Comportamento atual do `StickerImageUpload`: log no console. A figurinha já existe — admin pode reabrir editando depois. |

## Edge cases

- **Fechar modal de criação no meio do preenchimento:** estado descartado, nada gravado.
- **Fechar modal de upload sem anexar imagem:** figurinha fica sem `image_url` (estado válido).
- **Filtro de grupo ativo + admin escolhe grupo diferente no modal:** a nova figurinha pode não aparecer no grid se o filtro for por outro grupo. Aceitável.
- **Card `+` e paginação:** fixo apenas na primeira página.
- **`sticker_count` sob concorrência:** o `UPDATE ... = sticker_count + 1` é atômico no Postgres, então criações concorrentes não perdem contagem.

## Fora de escopo

- Edição ou deleção em massa.
- Importação por CSV / formulário repetível.
- Atalho "criar próxima na sequência" após salvar uma figurinha.
- Alteração do `number` ou `group_id` depois da criação.
- Correção retroativa do `sticker_count` em grupos que já estão dessincronizados (problema preexistente, separado).

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `app/admin/(dashboard)/stickers/stickers-admin.tsx` | Adicionar card `+` no início do grid (apenas pág. 1), estado para modal de criação, encadeamento para `StickerImageUpload` após sucesso. |
| `app/admin/(dashboard)/stickers/actions.ts` | Novo arquivo. Server Action `createSticker`. |
| `supabase/migrations/025_admin_stickers_write.sql` | Nova migration com policies de INSERT em `stickers` e UPDATE em `sticker_groups` restritas a admin. |
| `components/sticker-image-upload.tsx` | Sem mudanças. Reusado como está. |
