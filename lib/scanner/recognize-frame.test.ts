import { describe, it, expect, vi, afterEach } from "vitest";
import { recognizeFrame } from "./recognize-frame";

afterEach(() => vi.unstubAllGlobals());

describe("recognizeFrame", () => {
  it("posta a imagem na rota e devolve rawText", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rawText: "MEX1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = await recognizeFrame("BASE64");

    expect(text).toBe("MEX1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/scanner/ocr");
    expect(JSON.parse(init.body)).toEqual({ image: "BASE64" });
  });

  it("retorna string vazia quando a rota responde erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    expect(await recognizeFrame("X")).toBe("");
  });

  it("retorna string vazia em erro de rede (não quebra o loop)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await recognizeFrame("X")).toBe("");
  });
});
