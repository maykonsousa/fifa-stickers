#!/usr/bin/env tsx
/**
 * Lê data/album-pages.txt (formato espelhando o álbum físico, página por
 * página, grade fixa 4×3) e escreve data/album-positions.csv pronto pro
 * generate-album-seed.ts.
 *
 * Formato de entrada:
 *
 *   === PAGE 1 ===
 *   FWC00:L FWC1:L
 *   FWC2:L FWC3:L
 *   _ _ FWC4 _
 *
 * Tokens por linha:
 *   - `CODIGO`      → figurinha retrato, ocupa 1 célula
 *   - `CODIGO:L`    → figurinha paisagem, ocupa 2 células consecutivas
 *   - `_`           → célula vazia, ocupa 1 célula
 *
 * Layout assumido: grade 4 colunas × 3 linhas em TODAS as páginas.
 * A coluna de cada token é derivada acumulando os spans dos tokens anteriores.
 *
 * Validações:
 *   - Cada linha consome exatamente 4 colunas (nem mais nem menos).
 *   - Cada page tem no máximo 3 linhas de conteúdo.
 *   - Cada code aparece no máximo uma vez no arquivo todo.
 *   - Cada (page, row, col) aparece no máximo uma vez (decorrente do span).
 *
 * Uso: npx tsx scripts/parse-album-pages.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const IN_PATH = join(process.cwd(), "data", "album-pages.txt");
const OUT_PATH = join(process.cwd(), "data", "album-positions.csv");

const GRID_COLS = 4;
const GRID_ROWS = 3;

interface Entry {
  code: string;
  page: number;
  row: number;
  col: number;
  orientation: "portrait" | "landscape";
  sourceLine: number;
}

const PAGE_HEADER = /^===\s*PAGE\s+(\d+)\s*===\s*$/;

function parse(text: string): Entry[] {
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
        throw new Error(`Linha ${lineNo}: número de página inválido: "${trimmed}"`);
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
    if (rowInPage > GRID_ROWS) {
      throw new Error(
        `Linha ${lineNo}: página ${currentPage} excede ${GRID_ROWS} linhas.`,
      );
    }

    const tokens = trimmed.split(/\s+/).filter(Boolean);
    let col = 1;
    for (const token of tokens) {
      if (col > GRID_COLS) {
        throw new Error(
          `Linha ${lineNo}: página ${currentPage} linha ${rowInPage} excede ${GRID_COLS} colunas.`,
        );
      }

      if (token === "_") {
        col += 1;
        continue;
      }

      let code = token;
      let orientation: "portrait" | "landscape" = "portrait";
      if (code.endsWith(":L")) {
        orientation = "landscape";
        code = code.slice(0, -2);
      } else if (code.endsWith(":P")) {
        code = code.slice(0, -2);
      }

      if (code.length === 0) {
        throw new Error(`Linha ${lineNo}: token "${token}" sem código.`);
      }

      const span = orientation === "landscape" ? 2 : 1;
      if (col + span - 1 > GRID_COLS) {
        throw new Error(
          `Linha ${lineNo}: "${code}" landscape começando na coluna ${col} excede ${GRID_COLS} colunas.`,
        );
      }

      entries.push({
        code,
        page: currentPage as number,
        row: rowInPage,
        col,
        orientation,
        sourceLine: lineNo,
      });
      col += span;
    }

    if (col !== GRID_COLS + 1) {
      throw new Error(
        `Linha ${lineNo}: página ${currentPage} linha ${rowInPage} consome ${col - 1} colunas, esperado ${GRID_COLS} (use _ pra células vazias).`,
      );
    }
  }

  return entries;
}

function validate(entries: Entry[]): void {
  const seenCodes = new Map<string, Entry>();
  for (const e of entries) {
    const existing = seenCodes.get(e.code);
    if (existing) {
      throw new Error(
        `Code duplicado "${e.code}" — linhas ${existing.sourceLine} (página ${existing.page}) e ${e.sourceLine} (página ${e.page}).`,
      );
    }
    seenCodes.set(e.code, e);
  }
}

function toCsv(entries: Entry[]): string {
  const header = "sticker_code,page,row,col,orientation";
  const rows = entries.map(
    (e) => `${e.code},${e.page},${e.row},${e.col},${e.orientation}`,
  );
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
  const landscape = entries.filter((e) => e.orientation === "landscape").length;
  console.log(
    `Gerado ${OUT_PATH} com ${entries.length} posições (${landscape} landscape).`,
  );
}

main();
