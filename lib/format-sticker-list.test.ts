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
  it("mostra apenas o número, sem sufixo de contagem, mesmo com count >= 3", () => {
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
    expect(text).toContain("MEX 🇲🇽: 1");
    expect(text).not.toContain("×");
  });

  it("lista vários números separados por vírgula sem contagem", () => {
    const text = formatShareList(baseInput);
    expect(text).toContain("MEX 🇲🇽: 1, 2");
    expect(text).not.toContain("×");
  });

  it("não adiciona sufixo nem para count alto (10)", () => {
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
    expect(text).toContain("BRA 🇧🇷: 7");
    expect(text).not.toContain("×");
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
  });
});