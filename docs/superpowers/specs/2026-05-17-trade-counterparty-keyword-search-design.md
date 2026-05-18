# Trade Counterparty — Busca por keyword (nome ou email)

**Data:** 2026-05-17
**Escopo:** Substituir a busca exata por email no passo "com quem você trocou?" por busca live com keyword (nome ou email), debounce e sugestões.

## Motivação

Hoje, ao criar uma troca, o usuário precisa digitar o email exato da contraparte para encontrá-la. Isso falha quando:

- O usuário não lembra o email do contato/lead criado em trocas anteriores → acaba criando lead duplicado e batendo na constraint `UNIQUE(email)` de `leads`.
- O usuário só lembra o nome.
- Pequenas variações (maiúsculas, espaço final) já são normalizadas pelo backend, mas typo em domínio ainda quebra a busca.

Queremos uma busca por *keyword* (nome OU email parcial) com sugestões enquanto o usuário digita.

## Não-objetivos

- Reformular o resto do wizard de troca.
- Mudar o schema de `leads` ou `profiles` (apenas adicionar índices se necessário).
- Implementar privacidade restritiva por nome — confirmado com o stakeholder que o app trata busca de membros como aberta.

## Arquitetura

### Backend — RPC `search_users`

Nova função genérica, pensada para reuso fora do fluxo de trocas (ex: futura @menção, busca de amigos):

```sql
search_users(
  p_keyword TEXT,
  p_limit INT DEFAULT 10,
  p_include_leads BOOLEAN DEFAULT false
) RETURNS TABLE (
  kind TEXT,           -- 'member' | 'lead'
  id UUID,
  display_name TEXT,
  avatar_url TEXT,     -- NULL para leads
  email TEXT
)
```

**Comportamento:**

1. `v_kw := lower(trim(p_keyword))`.
2. Se `length(v_kw) < 4` → retorna 0 linhas (defesa em profundidade; UI também filtra).
3. Detecta se é busca por email: `position('@' in v_kw) > 0`.
   - **Sim** → `WHERE lower(email) ILIKE v_kw || '%'` (prefix match em email).
   - **Não** → `WHERE lower(display_name) ILIKE '%' || v_kw || '%' OR lower(email) ILIKE v_kw || '%'`.
4. Quando `p_include_leads = true`, faz `UNION ALL` com `leads` aplicando mesmas regras, **excluindo** leads cujo `email` já corresponda a um `profile` retornado (precedência ao membro).
5. Filtra leads com `converted_to_profile_id IS NULL`.
6. Ordenação dentro da query:
   - `member` antes de `lead` (priority 0 vs 1).
   - Match exato de email `lower(email) = v_kw` ganha (rank 0), prefix de email (rank 1), substring de name (rank 2).
   - Tie-break alfabético por `display_name`.
7. `LIMIT p_limit`.

**Privilégios:** `SECURITY DEFINER`, `SET search_path = public`. Concede `EXECUTE` para `authenticated`. Sem RLS adicional — busca aberta conforme decidido.

**Índices:** verificar e (se ausentes) adicionar:

- `profiles`: `display_name` precisa de índice trigram (`pg_trgm`) ou `lower(display_name)` btree pra `ILIKE`. Como o volume hoje é pequeno, começamos com índice b-tree em `lower(display_name)` e `lower(email)` (em `auth.users` já existe). Se virar gargalo, migra pra `gin_trgm_ops`.
- `leads`: `idx_leads_email` já existe; adicionar `lower(name)` b-tree.

**Migration:** `040_search_users.sql`. Não removemos `find_counterparty_by_email` ainda (será removido em migration de cleanup depois que `step-counterparty.tsx` deixar de usá-la — na prática, no mesmo PR).

### Frontend — `app/(authenticated)/trades/new/step-counterparty.tsx`

Reescrita do componente:

#### Estado

```ts
const [keyword, setKeyword] = useState(initial?.email ?? initial?.name ?? "");
const debouncedKeyword = useDebouncedValue(keyword, 700);
const [results, setResults] = useState<Match[] | null>(null); // null = ainda não buscou
const [loading, setLoading] = useState(false);
const [selected, setSelected] = useState<Match | null>(/* derivado de initial, como hoje */);
const [creatingLead, setCreatingLead] = useState(false);
const [leadFields, setLeadFields] = useState({ name: "", email: "", city: "", state: "", whatsapp: "" });
```

#### Efeito de busca

```ts
useEffect(() => {
  if (debouncedKeyword.trim().length < 4) {
    setResults(null);
    return;
  }
  let cancelled = false;
  setLoading(true);
  searchCounterparties(debouncedKeyword).then((rows) => {
    if (cancelled) return;
    setResults(rows);
    setLoading(false);
  });
  return () => { cancelled = true; };
}, [debouncedKeyword]);
```

Race-condition: o flag `cancelled` no cleanup descarta respostas desatualizadas quando o usuário continua digitando.

#### Server action

`searchCounterparties(keyword: string)` em `trades/lib/search-counterparty.ts` (renomeia o arquivo de função, mantém a forma do tipo `Match`). Chama `search_users(keyword, 10, true)`.

#### Estados de UI

| Condição | Render |
|---|---|
| `keyword.length < 4` | Input + hint "Digite ao menos 4 caracteres (nome ou email)". |
| `loading` | Input + `<Loader2 />` abaixo. |
| `results !== null && results.length > 0 && !selected && !creatingLead` | Lista clicável (até 10 linhas) — avatar/inicial, display_name, email, badge "lead já cadastrado" quando `kind === 'lead'`. |
| `selected` | Card de confirmação com avatar/nome/email + botão "Continuar com X" + link "Trocar seleção" (que limpa `selected`). |
| `results !== null && results.length === 0 && !creatingLead` | Mensagem "Nenhum resultado encontrado" + botão **"Criar lead"**. |
| `creatingLead` | Form de lead (nome*, email*, cidade, estado, whatsapp) + botão "Continuar". |

#### Botão "Buscar"

**Removido.** A busca é automática via debounce. O papel descrito pelo usuário ("habilitar como hoje para criar um lead quando não houver correspondência") é assumido pelo botão **"Criar lead"**, que aparece no estado de zero resultados.

#### Pré-preenchimento do form de lead

Quando o usuário clica **"Criar lead"**, populamos `leadFields` baseado na keyword:

- `keyword.includes('@')` → `{ email: keyword, name: '' }`.
- Caso contrário → `{ name: keyword, email: '' }`.

Cidade, estado e whatsapp permanecem vazios.

#### Mudança no form de lead

Hoje o form de lead **não tem campo de email** (vem do input principal — linha 74 do componente atual). Como `leads.email` é `NOT NULL UNIQUE`, adicionamos campo **email** ao form de lead, obrigatório.

Validação: regex de email no submit; botão "Continuar" desabilitado enquanto nome ou email forem inválidos.

#### Hook reutilizável

Novo arquivo `lib/hooks/use-debounced-value.ts`:

```ts
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
```

Sem deps externas. Reutilizável em outros campos com busca live no futuro.

## Fluxo de dados (resumo)

```
[input keyword] → debounce 700ms → length >= 4? → server action
  → RPC search_users(kw, 10, true)
  → results[]
    ├─ vazio → "Criar lead" → form (pré-preenche email OU nome)
    └─ tem itens → lista → user clica → selected → "Continuar com X"
```

## Tratamento de erros

- Erro de rede / RPC: a server action retorna `[]` e loga server-side (mesmo padrão da `searchCounterpartyByEmail` atual). UI mostra estado de "Nenhum resultado encontrado" — usuário ainda consegue criar lead.
- Race condition entre digitação rápida: tratada via flag `cancelled` no `useEffect`.
- Keyword com caracteres especiais para `ILIKE` (`%`, `_`): escapados na server action antes de mandar pra RPC (`kw.replace(/[%_\\]/g, '\\$&')`), e a RPC usa `ESCAPE '\'`.

## Testes

Sem framework de testes automatizado no frontend hoje (confirmar no momento da execução). Cobertura manual:

- Digitar 3 chars → não busca.
- Digitar 4+ chars de nome → lista aparece após ~700ms.
- Digitar email parcial → match por email.
- Limpar input → results some.
- Selecionar resultado → card de confirmação.
- "Trocar seleção" volta pra busca.
- Sem resultados → "Criar lead" pré-preenche corretamente baseado em keyword com/sem `@`.
- Criar lead com email duplicado → erro tratado no step seguinte (mesmo comportamento de hoje).

## Migration de limpeza

Após PR mergeado e validado, segunda migration (`041_drop_find_counterparty_by_email.sql`) remove a RPC antiga. Pode ir no mesmo PR já que o único caller é o componente que será migrado.

## Arquivos afetados

- **Novos**:
  - `supabase/migrations/040_search_users.sql`
  - `supabase/migrations/041_drop_find_counterparty_by_email.sql`
  - `lib/hooks/use-debounced-value.ts`
- **Modificados**:
  - `app/(authenticated)/trades/new/step-counterparty.tsx`
  - `app/(authenticated)/trades/lib/search-counterparty.ts` (renomeia função e adapta tipo de retorno para lista)
- **Removidos**: nenhum (a rename mantém o arquivo).

## Trade-offs e alternativas consideradas

- **Múltiplos resultados vs único melhor match:** escolhemos lista. Único match frustra em buscas por nome comum (decisão do stakeholder).
- **Manter botão "Buscar" como trigger manual:** descartado — redundante com auto-search e gera dúvida sobre "por que tem botão se ele já buscou sozinho?".
- **Label dinâmica do botão ("Buscar" / "Criar lead"):** descartado — label-shifting confunde.
- **Privacidade restrita:** descartado — stakeholder confirmou que busca de membros é aberta.
- **Trigram (`pg_trgm`) já no PR:** adiado — volume atual não justifica; b-tree em `lower()` resolve até virar gargalo mensurável.
