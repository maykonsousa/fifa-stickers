// lib/format-sticker-list.test.ts
import { describe, it, expect } from "vitest";
import { formatShareList, type FormatShareListInput } from "./format-sticker-list";

const baseInput: FormatShareListInput = {
  kind: "duplicates",
  displayName: "Maria",
  username: "maria",
  totalCount: 2,
  groups: [
    {
      name: "México",
      code: "MEX",
      stickers: [
        { code: "MEX1", number: 1, title: null, count: 3 },
        { code: "MEX2", number: 2, title: null, count: 2 },
      ],
    },
  ],
  profileUrl: "https://faltauma.com/p/maria",
};

describe("formatShareList — duplicates", () => {
  it("mostra ×N ao lado do número quando count >= 3", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX1", number: 1, title: null, count: 3 }],
        },
      ],
      totalCount: 1,
    });
    expect(text).toContain("1 (×2)");
  });

  it("omite o sufixo quando count é 2", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX2", number: 2, title: null, count: 2 }],
        },
      ],
      totalCount: 1,
    });
    expect(text).toContain("2");
    expect(text).not.toContain("2 (×");
  });

  it("mistura stickers com e sem sufixo no mesmo grupo", () => {
    const text = formatShareList(baseInput);
    expect(text).toContain("1 (×2)");
    expect(text).toContain("2");
    // garante que 2 não ganhou sufixo
    expect(text).not.toMatch(/2 \(×/);
  });

  it("suporta count alto (10)", () => {
    const text = formatShareList({
      ...baseInput,
      groups: [
        {
          name: "Brasil",
          code: "BRA",
          stickers: [{ code: "BRA7", number: 7, title: null, count: 10 }],
        },
      ],
      totalCount: 1,
    });
    expect(text).toContain("7 (×9)");
  });

  it("header usa totalCount (stickers únicos) sem multiplicar por count", () => {
    const text = formatShareList({
      ...baseInput,
      totalCount: 3,
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX1", number: 1, title: null, count: 5 }],
        },
      ],
    });
    expect(text).toContain("Repetidas (3):");
  });
});

describe("formatShareList — missing", () => {
  it("não usa sufixo ×N mesmo com count = 0", () => {
    const text = formatShareList({
      ...baseInput,
      kind: "missing",
      groups: [
        {
          name: "México",
          code: "MEX",
          stickers: [{ code: "MEX1", number: 1, title: null, count: 0 }],
        },
      ],
      totalCount: 1,
    });
    expect(text).toContain("1");
    expect(text).not.toMatch(/1 \(×/);
    expect(text).toContain("Faltam (1):");
  });
});