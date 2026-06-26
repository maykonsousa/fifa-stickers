import { describe, it, expect } from "vitest";
import { validateAlbumName, canDeleteAlbum } from "./album-rules";

describe("validateAlbumName", () => {
  it("rejeita nome vazio", () => {
    expect(validateAlbumName("   ", [])).toEqual({ ok: false, error: "Informe um nome." });
  });
  it("rejeita nome duplicado (case/space-insensitive)", () => {
    expect(validateAlbumName(" Meu Álbum - 001 ", ["Meu Álbum - 001"]))
      .toEqual({ ok: false, error: "Já existe um álbum com esse nome." });
  });
  it("aceita nome novo", () => {
    expect(validateAlbumName("Álbum do João", ["Meu Álbum - 001"])).toEqual({ ok: true });
  });
});

describe("canDeleteAlbum", () => {
  it("bloqueia exclusão do álbum público", () => {
    expect(canDeleteAlbum({ albumId: 5, publicAlbumId: 5, totalAlbums: 3 }))
      .toEqual({ ok: false, error: "Não é possível excluir o álbum público." });
  });
  it("bloqueia exclusão do último álbum", () => {
    expect(canDeleteAlbum({ albumId: 5, publicAlbumId: 9, totalAlbums: 1 }))
      .toEqual({ ok: false, error: "Você precisa ter ao menos um álbum." });
  });
  it("permite excluir álbum comum quando há outros", () => {
    expect(canDeleteAlbum({ albumId: 5, publicAlbumId: 9, totalAlbums: 3 })).toEqual({ ok: true });
  });
});
