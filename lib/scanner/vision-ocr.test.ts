import { describe, it, expect, vi } from "vitest";
import { extractRawText, callVisionOcr } from "./vision-ocr";

describe("extractRawText", () => {
  it("usa fullTextAnnotation.text quando presente", () => {
    const json = { responses: [{ fullTextAnnotation: { text: "FIFA\nMEX1\nOFFICIAL" } }] };
    expect(extractRawText(json)).toBe("FIFA\nMEX1\nOFFICIAL");
  });

  it("cai para textAnnotations[0].description quando não há fullTextAnnotation", () => {
    const json = { responses: [{ textAnnotations: [{ description: "MEX1" }] }] };
    expect(extractRawText(json)).toBe("MEX1");
  });

  it("retorna string vazia quando não há texto", () => {
    expect(extractRawText({ responses: [{}] })).toBe("");
    expect(extractRawText({})).toBe("");
  });
});

describe("callVisionOcr", () => {
  it("monta a request correta e devolve o texto", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ responses: [{ fullTextAnnotation: { text: "MEX1" } }] }),
    });
    const text = await callVisionOcr("BASE64DATA", "KEY123", fetchMock as unknown as typeof fetch);

    expect(text).toBe("MEX1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("https://vision.googleapis.com/v1/images:annotate");
    expect(url).toContain("key=KEY123");
    const body = JSON.parse(init.body);
    expect(body.requests[0].image.content).toBe("BASE64DATA");
    expect(body.requests[0].features[0].type).toBe("TEXT_DETECTION");
  });

  it("lança erro quando a resposta não é ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "denied" });
    await expect(
      callVisionOcr("X", "KEY", fetchMock as unknown as typeof fetch),
    ).rejects.toThrow();
  });
});
