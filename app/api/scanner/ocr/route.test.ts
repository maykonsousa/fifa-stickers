import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims } }),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/scanner/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authed() {
  // getClaims devolve { claims: { sub, ... }, ... } quando o JWT é válido localmente.
  getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
}

describe("POST /api/scanner/ocr", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_VISION_API_KEY = "KEY123";
    getClaims.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna 401 sem sessão (claims vazias)", async () => {
    getClaims.mockResolvedValue({ data: null, error: { message: "no session" } });
    const res = await POST(makeRequest({ image: "X" }));
    expect(res.status).toBe(401);
  });

  it("retorna 401 se claims sem sub", async () => {
    getClaims.mockResolvedValue({ data: { claims: {} }, error: null });
    const res = await POST(makeRequest({ image: "X" }));
    expect(res.status).toBe(401);
  });

  it("retorna { rawText } com sessão e Vision ok", async () => {
    authed();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ responses: [{ fullTextAnnotation: { text: "MEX1" } }] }),
      }),
    );
    const res = await POST(makeRequest({ image: "BASE64" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rawText: "MEX1" });
  });

  it("retorna 502 quando o Vision falha", async () => {
    authed();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "denied" }),
    );
    const res = await POST(makeRequest({ image: "BASE64" }));
    expect(res.status).toBe(502);
  });

  it("retorna 400 sem imagem", async () => {
    authed();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("retorna 500 sem GOOGLE_VISION_API_KEY", async () => {
    authed();
    delete process.env.GOOGLE_VISION_API_KEY;
    const res = await POST(makeRequest({ image: "X" }));
    expect(res.status).toBe(500);
  });
});
