# Modo Álbum — "Ir para página"

**Data:** 2026-05-30
**Status:** Aprovado (aguardando revisão do spec)

## Problema

No modo álbum da coleção, a navegação entre páginas é feita por setas (próxima/anterior),
swipe, teclado e carrossel. Para chegar a uma página distante, o usuário precisa percorrer
todas as páginas intermediárias.

Hoje existe um filtro por grupo/time que leva o usuário até uma seção, mas ele **reduz o
conjunto de dados** (a RPC só retorna aquele grupo). Consequência: depois de filtrar, o
usuário fica "preso" — não consegue navegar para a página seguinte ou anterior fora do
filtro. O usuário quer poder pular direto para uma página **sem perder a navegação**.

## Objetivo

Adicionar um campo de "Ir para página" no modo álbum que leva o usuário direto à página
desejada, mantendo o álbum inteiro carregado para que a navegação (setas, swipe, teclado)
continue funcionando normalmente depois do salto.

## Comportamento

- Um campo numérico pequeno ("Ir para") fica junto aos controles de navegação do álbum.
- O usuário digita o **número da página do álbum** — o valor exibido em destaque como
  "Página {current.page}" (ex: `23`). **Não** é a posição sequencial no carrossel.
- Ao submeter (tecla Enter ou clique no botão), o componente rola suavemente até a página
  correspondente usando a função `goTo(idx)` já existente.
- Como **nenhum dado é filtrado**, o álbum inteiro permanece carregado. Setas, swipe e
  navegação por teclado continuam funcionando após o salto.

### Lógica do salto

1. Construir um mapa `pageNumber → índice no carrossel` a partir de `displayPages`
   (cada `AlbumPage` tem o campo `page`).
2. No submit, procurar a página cujo `page === número digitado`.
3. **Achou:** chamar `goTo(índice)`.
4. **Não achou** (número inexistente — ex.: gap na numeração ou fora do alcance):
   no-op silencioso; o campo volta a exibir a página atual. Sem mensagem de erro intrusiva.
5. Aceitar somente inteiros.

## UI / Posicionamento

O componente do álbum (`app/p/[username]/profile-stickers-album.tsx`) é **compartilhado**
entre a coleção (`/collection`) e os perfis públicos (`/p/[username]`). O campo é adicionado
**no próprio componente do álbum**, portanto a navegação aparece nos dois contextos — é um
auxílio de navegação inerente ao álbum, não específico da coleção. (Confirmado com o usuário.)

- **Desktop:** o campo aparece no grupo de controles de navegação (`hidden sm:flex`, junto
  às setas `ChevronLeft`/`ChevronRight` e ao contador `{currentIdx + 1} / {total}`).
- **Mobile:** versão compacta perto do indicador de texto "Página X de Y".

O estilo segue o padrão visual já usado nos controles do álbum (bordas `border-white/10`,
fundo `bg-white/5`, texto branco, `tabular-nums`).

## Estado

Estado local no componente do álbum:

- `pageInput: string` — valor digitado no campo.

Sem mudanças de estado global, contexto ou persistência.

## O que NÃO muda

- **Banco de dados / RPC:** nenhuma alteração. É navegação puramente no cliente.
- **Filtro de grupo existente:** permanece como está.
- **Modo lista:** não afetado.

## Testes

- Digitar um número de página existente → carrossel rola até a página correta
  (`current.page` corresponde ao número digitado).
- Após o salto, setas próxima/anterior continuam navegando normalmente.
- Digitar número inexistente → no-op; campo reverte para a página atual.
- Entrada não numérica é rejeitada/ignorada.
- Submit via Enter e via clique no botão produzem o mesmo resultado.

## Arquivos afetados

- `app/p/[username]/profile-stickers-album.tsx` — adicionar o campo "Ir para página", o
  mapa `page → índice` e o handler de submit que chama `goTo`.
