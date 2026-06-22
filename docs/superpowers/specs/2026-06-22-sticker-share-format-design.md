# Design: Novo Formato de Compartilhamento de Figurinhas

**Data:** 2026-06-22
**Status:** Aprovado

## Objetivo

Simplificar o formato de texto compartilhável das listas de figurinhas repetidas e faltantes no perfil do usuário.

## Formato Atual vs Novo

### Formato Atual (blocos separados)
```
🏆 *faltaUma* — álbum do @username
👤 Display Name

📋 Faltam (N):
─────────────

*🇲🇽 México* (MEX)
1, 2, 3

*🇧🇷 Brasil* (BRA)
5, 7

─────────────
💬 Bora trocar? 🤝
🔗 https://faltauma.com/p/username
```

### Novo Formato (uma linha por seleção)
```
MEX 🇲🇽: 1×2, 8×3, 9
RSA 🇿🇦: 3, 4, 5, 8
BRA 🇧🇷: 5, 7×2, 10
FWC 🏆: 1×5

Falta alguma? Me mande sua lista! 🔄
https://faltauma.com/p/username
```

## Estrutura do Novo Formato

| Elemento | Formato |
|----------|---------|
| **Linha por seleção** | `{CODE} {EMOJI}: {NUMBERS}` |
| **Duplicadas** | `1×2` (número × cópias extras disponíveis) |
| **Únicas** | só o número: `9` |
| **Separação** | vírgula + espaço: `, ` |
| **Header removido** | sem bloco de título, nome ou username |
| **Footer** | mensagem de chamada + link do perfil |

## Regras de Negócio

1. **Figurinhas duplicadas** (count >= 2):
   - count = 2 → mostra só o número: `9`
   - count = 3 → mostra `9×2` (1 disponível para troca)
   - count = N → mostra `9×(N-1)`

2. **Figurinhas faltantes** (count = 0):
   - Sempre mostra só o número: `9`

3. **Ordenação**:
   - Grupos ordenados alfabeticamente por código
   - Números em ordem crescente dentro de cada grupo

## Arquivos a Alterar

1. `lib/format-sticker-list.ts`
   - Reescrever função `formatShareList()`
   - Remover header detalhado
   - Formatar cada linha como `{CODE} {EMOJI}: {NUMBERS}`

2. `lib/format-sticker-list.test.ts`
   - Adaptar testes existentes
   - Adicionar novos testes para o formato compacto

## Exemplo de Saída Completa

```
MEX 🇲🇽: 1×2, 8×3, 9
RSA 🇿🇦: 3, 4, 5, 8
KOR 🇰🇷: 3, 8, 11, 14, 15
CZE 🇨🇿: 4, 6, 7, 8, 9, 10, 11, 19
CAN 🇨🇦: 1, 13, 14
BIH 🇧🇦: 8, 9, 12, 14, 15
FWC 🏆: 1, 10, 12, 13, 14, 16, 19

Falta alguma? Me mande sua lista! 🔄
https://faltauma.com/p/username
```

## Decisões de Implementação

- Manter interface `FormatShareListInput` existente (não muda)
- Usar `getGroupEmoji()` para obter emoji do grupo
- Remover constante `SEPARATOR` (não usada no novo formato)
- Remover constantes `HEADER_LABEL` (não usadas no novo formato)
