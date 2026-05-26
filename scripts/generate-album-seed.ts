#!/usr/bin/env tsx
/**
 * Lê data/album-positions.csv e gera supabase/migrations/057_seed_album_positions.sql
 * com UPDATEs idempotentes por sticker_code.
 *
 * Uso: npx tsx scripts/generate-album-seed.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CSV_PATH = join(process.cwd(), "data", "album-positions.csv");
const OUT_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "057_seed_album_positions.sql",
);

interface Row {
  code: string;
  page: number;
  row: number;
  col: number;
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error("CSV vazio");
  }
  const header = lines[0].split(",").map((s) => s.trim());
  const expected = ["sticker_code", "page", "row", "col"];
  if (header.join(",") !== expected.join(",")) {
    throw new Error(
      `Cabeçalho inválido. Esperado: ${expected.join(",")}. Obtido: ${header.join(",")}`,
    );
  }
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    if (parts.length !== 4) {
      throw new Error(`Linha ${i + 1}: esperado 4 colunas, encontrado ${parts.length}`);
    }
    const [code, page, row, col] = parts;
    if (!code) throw new Error(`Linha ${i + 1}: sticker_code vazio`);
    const pageN = Number(page);
    const rowN = Number(row);
    const colN = Number(col);
    if (!Number.isInteger(pageN) || pageN < 1)
      throw new Error(`Linha ${i + 1}: page inválida (${page})`);
    if (!Number.isInteger(rowN) || rowN < 1)
      throw new Error(`Linha ${i + 1}: row inválida (${row})`);
    if (!Number.isInteger(colN) || colN < 1)
      throw new Error(`Linha ${i + 1}: col inválida (${col})`);
    rows.push({ code, page: pageN, row: rowN, col: colN });
  }
  return rows;
}

function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''");
}

function generateSql(rows: Row[]): string {
  const header = `-- 057_seed_album_positions.sql
-- GERADO AUTOMATICAMENTE a partir de data/album-positions.csv
-- pelo script scripts/generate-album-seed.ts
-- NÃO EDITAR À MÃO: rode \`npx tsx scripts/generate-album-seed.ts\` após mudar o CSV.

BEGIN;

`;
  const updates = rows
    .map(
      (r) =>
        `UPDATE stickers SET page = ${r.page}, row = ${r.row}, col = ${r.col} WHERE code = '${escapeSqlString(r.code)}';`,
    )
    .join("\n");
  return `${header}${updates}\n\nCOMMIT;\n`;
}

function main() {
  // Strip UTF-8 BOM that Excel and some editors prepend when saving CSV.
  const csv = readFileSync(CSV_PATH, "utf-8").replace(/^﻿/, "");
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    console.error("CSV não tem linhas de dados — nada a gerar.");
    process.exit(1);
  }
  const sql = generateSql(rows);
  writeFileSync(OUT_PATH, sql, "utf-8");
  console.log(`Gerado ${OUT_PATH} com ${rows.length} UPDATEs.`);
}

main();
