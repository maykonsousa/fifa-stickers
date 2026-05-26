#!/usr/bin/env tsx
/**
 * Lê data/album-pages.txt (formato espelhando o álbum físico, página por
 * página) e escreve data/album-positions.csv pronto pro generate-album-seed.ts.
 *
 * Formato de entrada:
 *
 *   === PAGE 4 ===
 *   FWC1 FWC2
 *   FWC3 FWC4 FWC5 FWC6
 *   FWC7 FWC8 FWC9 FWC10
 *
 *   === PAGE 5 ===
 *   ...
 *
 * - Cabeçalho `=== PAGE N ===` define a página (N inteiro >= 1).
 * - Cada linha de conteúdo é uma linha visual da página.
 * - Códigos separados por whitespace; posição no array vira a coluna (1-based).
 * - Linhas em branco e linhas começando com `#` são ignoradas.
 *
 * Validações:
 * - Cada code aparece no máximo uma vez no arquivo todo.
 * - Cada (page, row, col) aparece no máximo uma vez.
 * - Falha com mensagem clara apontando linha/página do problema.
 *
 * Uso: npx tsx scripts/parse-album-pages.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const IN_PATH = join(process.cwd(), "data", "album-pages.txt");
const OUT_PATH = join(process.cwd(), "data", "album-positions.csv");

interface Entry {
  code: string;
  page: number;
  row: number;
  col: number;
  sourceLine: number; // 1-based line number in album-pages.txt for error messages
}

const PAGE_HEADER = /^===\s*PAGE\s+(\d+)\s*===\s*$/;

function parse(text: string): Entry[] {
  // Strip UTF-8 BOM if present.
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/);
  const entries: Entry[] = [];

  let currentPage: number | null = null;
  let rowInPage = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    const trimmed = raw.trim();

    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const headerMatch = trimmed.match(PAGE_HEADER);
    if (headerMatch) {
      currentPage = Number(headerMatch[1]);
      if (!Number.isInteger(currentPage) || currentPage < 1) {
        throw new Error(
          `Linha ${lineNo}: número de página inválido: "${trimmed}"`,
        );
      }
      rowInPage = 0;
      continue;
    }

    if (currentPage === null) {
      throw new Error(
        `Linha ${lineNo}: conteúdo "${trimmed}" antes do primeiro cabeçalho === PAGE N ===`,
      );
    }

    rowInPage += 1;
    const codes = trimmed.split(/\s+/).filter((s) => s.length > 0);
    codes.forEach((code, idx) => {
      entries.push({
        code,
        page: currentPage as number,
        row: rowInPage,
        col: idx + 1,
        sourceLine: lineNo,
      });
    });
  }

  return entries;
}

function validate(entries: Entry[]): void {
  const seenCodes = new Map<string, Entry>();
  const seenSlots = new Map<string, Entry>();

  for (const e of entries) {
    const slot = `${e.page}:${e.row}:${e.col}`;

    const existingCode = seenCodes.get(e.code);
    if (existingCode) {
      throw new Error(
        `Code duplicado "${e.code}" — linhas ${existingCode.sourceLine} ` +
          `(página ${existingCode.page}) e ${e.sourceLine} (página ${e.page}).`,
      );
    }
    seenCodes.set(e.code, e);

    const existingSlot = seenSlots.get(slot);
    if (existingSlot) {
      throw new Error(
        `Slot duplicado (página ${e.page}, linha ${e.row}, coluna ${e.col}) — ` +
          `"${existingSlot.code}" (linha ${existingSlot.sourceLine}) ` +
          `e "${e.code}" (linha ${e.sourceLine}).`,
      );
    }
    seenSlots.set(slot, e);
  }
}

function toCsv(entries: Entry[]): string {
  const header = "sticker_code,page,row,col";
  const rows = entries.map((e) => `${e.code},${e.page},${e.row},${e.col}`);
  return [header, ...rows].join("\n") + "\n";
}

function main() {
  const text = readFileSync(IN_PATH, "utf-8");
  const entries = parse(text);
  if (entries.length === 0) {
    console.error("Nenhuma posição encontrada em data/album-pages.txt — nada a gerar.");
    process.exit(1);
  }
  validate(entries);
  writeFileSync(OUT_PATH, toCsv(entries), "utf-8");
  console.log(`Gerado ${OUT_PATH} com ${entries.length} posições.`);
}

main();
