import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/scanner/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/scanner/ocr", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_VISION_API_KEY = "KEY123";
    getUser.mockReset();
  });

  it("retorna 401 sem sessão", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ image: "X" }));
    expect(res.status).toBe(401);
  });

  it("retorna { rawText } com sessão e Vision ok", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
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
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "denied" }),
    );
    const res = await POST(makeRequest({ image: "BASE64" }));
    expect(res.status).toBe(502);
  });

  it("retorna 400 sem imagem", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
