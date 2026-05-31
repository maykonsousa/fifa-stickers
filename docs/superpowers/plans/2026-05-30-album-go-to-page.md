# "Ir para página" no Modo Álbum — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um campo "Ir para página" no modo álbum que rola direto até a página desejada (pelo número exibido como "Página N"), mantendo o álbum inteiro carregado para que setas/swipe/teclado sigam funcionando após o salto.

**Architecture:** Mudança puramente client-side em `app/p/[username]/profile-stickers-album.tsx`. Uma função pura `resolvePageIndex` traduz o número de página digitado para o índice no carrossel; o componente ganha estado `pageInput` e um handler de submit que chama a função `goTo(idx)` já existente. Nenhuma alteração de banco, RPC ou filtro de grupo.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind, lucide-react. Sem framework de testes no projeto — verificação via `npm run lint`, `npm run build` e verificação manual no navegador.

---

## Contexto do código atual

Arquivo único: `app/p/[username]/profile-stickers-album.tsx`. Pontos de referência (antes desta mudança):

- `interface AlbumPage { page: number; groupName: string; stickers: AlbumSticker[] }` — linhas 27-31.
- `groupByPage(rows)` retorna `AlbumPage[]` ordenado por `page` — linhas 33-59.
- Estado do componente: `currentIdx`, `scrollerRef` etc. — linhas 81-86.
- `displayPages` (memo de `pages` com overrides aplicados; **mesmo comprimento e ordem de `pages`**) — linhas 111-125.
- `goTo(idx)` faz scroll suave, com clamp em `[0, pages.length-1]` — linhas 148-153.
- Header com rótulo `Página {current.page}` e controles desktop (`hidden sm:flex` com setas + contador `{currentIdx + 1} / {displayPages.length}`) — linhas 230-258.
- Indicador mobile `Página {currentIdx + 1} de {displayPages.length}` — linhas 277-280.

Detalhe-chave: o número que o usuário digita é o `page` (campo do `AlbumPage`, ex.: `23`), **não** o índice sequencial. A função de resolução traduz `page` → índice em `displayPages`.

---

## File Structure

- **Modificar:** `app/p/[username]/profile-stickers-album.tsx`
  - Adicionar função pura `resolvePageIndex(pages, pageNumber)` (próxima a `groupByPage`).
  - Adicionar estado `pageInput` e handler `handleGoToPage`.
  - Adicionar o campo "Ir para página" no header (desktop) e perto do indicador (mobile).

Sem novos arquivos.

---

## Task 1: Função pura `resolvePageIndex`

**Files:**
- Modify: `app/p/[username]/profile-stickers-album.tsx` (inserir após `groupByPage`, ~linha 59)

A função recebe a lista de páginas renderizadas e o número de página digitado, e retorna o índice no array ou `-1` se não houver página com aquele número. Funciona com qualquer objeto que tenha `page: number` (cobre tanto `AlbumPage` quanto `displayPages`).

- [ ] **Step 1: Implementar a função pura**

Inserir logo após o fechamento de `groupByPage` (depois da linha 59):

```typescript
// Traduz o número de página do álbum (campo `page`, ex.: 23) para o índice
// correspondente no carrossel. Retorna -1 quando não existe página com esse número.
function resolvePageIndex(pages: { page: number }[], pageNumber: number): number {
  return pages.findIndex((p) => p.page === pageNumber);
}
```

- [ ] **Step 2: Verificar tipagem/lint do arquivo**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros novos relacionados a `resolvePageIndex` (o projeto pode ter outros avisos preexistentes — confirmar que nenhum aponta para este arquivo/linha).

Run: `npm run lint`
Expected: sem erros novos em `profile-stickers-album.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/p/\[username\]/profile-stickers-album.tsx
git commit -m "feat(album): adiciona resolvePageIndex para navegacao por numero de pagina"
```

---

## Task 2: Estado e handler de submit

**Files:**
- Modify: `app/p/[username]/profile-stickers-album.tsx` (estado ~linha 83; handler perto de `goTo` ~linha 153)

- [ ] **Step 1: Adicionar o estado `pageInput`**

Logo após a linha `const [currentIdx, setCurrentIdx] = useState(0);` (linha 83), adicionar:

```typescript
const [pageInput, setPageInput] = useState("");
```

- [ ] **Step 2: Adicionar o handler `handleGoToPage`**

Logo após a definição de `goTo` (depois da linha 153), adicionar:

```typescript
const handleGoToPage = (e: React.FormEvent) => {
  e.preventDefault();
  const n = Number.parseInt(pageInput, 10);
  if (Number.isNaN(n)) {
    setPageInput("");
    return;
  }
  const idx = resolvePageIndex(displayPages, n);
  if (idx === -1) {
    // Página inexistente: no-op silencioso, campo volta ao estado vazio.
    setPageInput("");
    return;
  }
  goTo(idx);
  setPageInput("");
};
```

- [ ] **Step 3: Verificar tipagem/lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros novos neste arquivo.

Run: `npm run lint`
Expected: sem erros novos em `profile-stickers-album.tsx`.

- [ ] **Step 4: Commit**

```bash
git add app/p/\[username\]/profile-stickers-album.tsx
git commit -m "feat(album): estado e handler de ir para pagina"
```

---

## Task 3: Campo "Ir para página" (desktop)

**Files:**
- Modify: `app/p/[username]/profile-stickers-album.tsx` (bloco `hidden sm:flex` do header, linhas 235-257)

Adicionar um `<form>` compacto dentro do grupo de controles desktop, antes das setas. O input usa `current.page` como placeholder (mostra a página atual) e segue o estilo dos controles existentes.

- [ ] **Step 1: Inserir o formulário no grupo de controles desktop**

Dentro de `<div className="hidden sm:flex items-center gap-2">` (linha 235), inserir como **primeiro filho** (antes do botão "Página anterior"):

```tsx
<form onSubmit={handleGoToPage} className="flex items-center gap-1">
  <label htmlFor="album-goto-desktop" className="text-xs text-gray-400">
    Ir para
  </label>
  <input
    id="album-goto-desktop"
    type="number"
    inputMode="numeric"
    value={pageInput}
    onChange={(e) => setPageInput(e.target.value)}
    placeholder={String(current.page)}
    aria-label="Ir para a página"
    className="w-14 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white tabular-nums [appearance:textfield] focus:outline-none focus:ring-1 focus:ring-white/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
  />
  <button
    type="submit"
    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10"
  >
    Ir
  </button>
</form>
```

- [ ] **Step 2: Build para validar JSX/tipos**

Run: `npm run lint`
Expected: sem erros novos.

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/p/\[username\]/profile-stickers-album.tsx
git commit -m "feat(album): campo ir para pagina no desktop"
```

---

## Task 4: Campo "Ir para página" (mobile)

**Files:**
- Modify: `app/p/[username]/profile-stickers-album.tsx` (indicador mobile, linhas 277-280)

No mobile só existe o texto "Página X de Y" (`sm:hidden`). Substituir esse parágrafo por uma linha que mantém o indicador e adiciona o formulário compacto ao lado, visível apenas no mobile.

- [ ] **Step 1: Substituir o indicador mobile**

Trocar o bloco atual (linhas 277-280):

```tsx
{/* Indicador mobile (texto simples) */}
<p className="sm:hidden text-center text-xs text-gray-400 tabular-nums">
  Página {currentIdx + 1} de {displayPages.length}
</p>
```

por:

```tsx
{/* Indicador + ir para página (mobile) */}
<div className="sm:hidden flex items-center justify-center gap-3">
  <p className="text-xs text-gray-400 tabular-nums">
    Página {currentIdx + 1} de {displayPages.length}
  </p>
  <form onSubmit={handleGoToPage} className="flex items-center gap-1">
    <input
      type="number"
      inputMode="numeric"
      value={pageInput}
      onChange={(e) => setPageInput(e.target.value)}
      placeholder={String(current.page)}
      aria-label="Ir para a página"
      className="w-14 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white tabular-nums [appearance:textfield] focus:outline-none focus:ring-1 focus:ring-white/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
    <button
      type="submit"
      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10"
    >
      Ir
    </button>
  </form>
</div>
```

- [ ] **Step 2: Build para validar JSX/tipos**

Run: `npm run lint`
Expected: sem erros novos.

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/p/\[username\]/profile-stickers-album.tsx
git commit -m "feat(album): campo ir para pagina no mobile"
```

---

## Task 5: Verificação manual no navegador

**Files:** nenhum (validação)

Sem framework de testes no repo, a validação funcional é manual. Rodar a app e exercitar a coleção no modo álbum.

- [ ] **Step 1: Subir a app**

Run: `npm run dev`
Abrir `/collection`, alternar para o modo **Álbum**.

- [ ] **Step 2: Exercitar os cenários**

Verificar cada item:
- Digitar um número de página **existente** (ex.: o número mostrado em "Página N" de alguma página adiante) + Enter → o carrossel rola até a página cujo rótulo "Página N" bate com o digitado.
- Após o salto, clicar nas setas próxima/anterior → continua navegando normalmente (álbum inteiro disponível, sem ter sido filtrado).
- Digitar um número **inexistente** (ex.: `99999`) + Enter → nada acontece; o campo limpa e volta a mostrar a página atual como placeholder.
- Digitar texto não numérico → ignorado (input `type=number` já bloqueia; campo limpa no submit).
- Submeter via **Enter** e via clique no botão **"Ir"** → mesmo resultado.
- Repetir em viewport mobile (DevTools responsivo): o campo aparece junto ao indicador "Página X de Y".
- Abrir um perfil público em `/p/[username]` no modo álbum → o campo também aparece e funciona (componente compartilhado).

- [ ] **Step 3: Encerrar o dev server**

Parar o processo `npm run dev`.

---

## Self-Review (preenchido pelo autor do plano)

**Cobertura do spec:**
- "Campo numérico Ir para junto à navegação" → Tasks 3 e 4.
- "Digitar número da página do álbum (`current.page`), não posição sequencial" → `resolvePageIndex` compara `p.page === n` (Task 1); placeholder usa `current.page`.
- "Submit por Enter ou clique" → `<form onSubmit>` + `<button type="submit">` (Tasks 3/4); validado na Task 5.
- "Usa `goTo` existente; sem filtrar dados" → handler chama `goTo(idx)` (Task 2); navegação pós-salto validada na Task 5.
- "Não achou → no-op silencioso, campo volta à página atual" → `idx === -1` limpa o input (Task 2); placeholder reflete `current.page`.
- "Somente inteiros" → `Number.parseInt` + `Number.isNaN` (Task 2) e `type=number` (Tasks 3/4).
- "Aparece em coleção e perfis públicos (componente compartilhado)" → mudança no componente compartilhado; validado na Task 5.
- "Sem mudança de banco/RPC/filtro de grupo/modo lista" → escopo restrito a um arquivo client-side.

**Placeholder scan:** nenhum TODO/TBD; todo passo tem código ou comando concreto.

**Type consistency:** `resolvePageIndex(pages: { page: number }[], pageNumber: number): number` é usada com `displayPages` (cujos itens têm `page: number`) e número de `Number.parseInt`. Estado `pageInput: string`. Handler `handleGoToPage(e: React.FormEvent)`. Nomes consistentes entre as tasks.
