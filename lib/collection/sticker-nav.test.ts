import { describe, it, expect } from "vitest";
import {
  listToNavList,
  albumToNavList,
  canGoPrev,
  canGoNext,
  resolveNext,
} from "./sticker-nav";

describe("listToNavList", () => {
  it("preserva a ordem e assume orientation portrait", () => {
    const rows = [
      { id: 2, code: "B2", title: "Bola", image_url: "u2", owned_count: 0, wishlisted: true },
      { id: 1, code: "A1", title: null, image_url: null, owned_count: 3, wishlisted: false },
    ];
    const nav = listToNavList(rows);
    expect(nav.map((s) => s.id)).toEqual([2, 1]);
    expect(nav[0]).toEqual({
      id: 2, code: "B2", title: "Bola", image_url: "u2",
      orientation: "portrait", owned_count: 0, wishlisted: true,
    });
  });
});

describe("albumToNavList", () => {
  it("achata na ordem página→row→col e puxa wishlisted do Set", () => {
    const pages = [
      {
        page: 2,
        stickers: [
          { id: 30, code: "C", title: null, image_url: null, orientation: "portrait" as const, row: 1, col: 1, viewer_owned_count: 1 },
        ],
      },
      {
        page: 1,
        stickers: [
          { id: 20, code: "B", title: null, image_url: null, orientation: "landscape" as const, row: 1, col: 3, viewer_owned_count: 0 },
          { id: 10, code: "A", title: null, image_url: null, orientation: "portrait" as const, row: 1, col: 1, viewer_owned_count: 2 },
        ],
      },
    ];
    const nav = albumToNavList(pages, new Set([20]));
    expect(nav.map((s) => s.id)).toEqual([10, 20, 30]);
    expect(nav.find((s) => s.id === 20)?.wishlisted).toBe(true);
    expect(nav.find((s) => s.id === 10)?.wishlisted).toBe(false);
    expect(nav.find((s) => s.id === 10)?.owned_count).toBe(2);
  });
});

describe("canGoPrev / canGoNext", () => {
  it("canGoPrev só a partir do índice 1", () => {
    expect(canGoPrev(0)).toBe(false);
    expect(canGoPrev(1)).toBe(true);
  });
  it("canGoNext considera hasMore quando no fim", () => {
    expect(canGoNext(0, 3, false)).toBe(true);
    expect(canGoNext(2, 3, false)).toBe(false);
    expect(canGoNext(2, 3, true)).toBe(true);
  });
});

describe("resolveNext", () => {
  it("move quando há próximo item", () => {
    expect(resolveNext(0, 3, false)).toEqual({ type: "move", index: 1 });
  });
  it("loadMore no fim quando hasMore", () => {
    expect(resolveNext(2, 3, true)).toEqual({ type: "loadMore" });
  });
  it("none no fim sem hasMore", () => {
    expect(resolveNext(2, 3, false)).toEqual({ type: "none" });
  });
});
