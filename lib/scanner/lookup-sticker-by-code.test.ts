import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lookupStickerByCode } from "./lookup-sticker-by-code";

function fakeClient(rpcResult: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const client = { rpc } as unknown as SupabaseClient;
  return { client, rpc };
}

describe("lookupStickerByCode", () => {
  it("chama a RPC lookup_sticker_by_code com código e albumId", async () => {
    const { client, rpc } = fakeClient({
      data: [{ id: 7, code: "MEX1", title: "Messi", image_url: "u", owned_count: 2 }],
      error: null,
    });
    await lookupStickerByCode(client, "MEX1", 1);
    expect(rpc).toHaveBeenCalledWith("lookup_sticker_by_code", {
      p_code: "MEX1",
      p_album_id: 1,
    });
  });

  it("devolve o sticker mapeado quando a RPC retorna uma linha", async () => {
    const { client } = fakeClient({
      data: [{ id: 7, code: "MEX1", title: "Messi", image_url: "u", owned_count: 2 }],
      error: null,
    });
    const result = await lookupStickerByCode(client, "MEX1", 1);
    expect(result).toEqual({ id: 7, code: "MEX1", title: "Messi", image_url: "u", owned_count: 2, wishlisted: false });
  });

  it("mapeia o campo wishlisted quando presente na RPC", async () => {
    const { client } = fakeClient({
      data: [{ id: 7, code: "MEX1", title: "Messi", image_url: "u", owned_count: 2, wishlisted: true }],
      error: null,
    });
    const result = await lookupStickerByCode(client, "MEX1", 1);
    expect(result).toEqual({ id: 7, code: "MEX1", title: "Messi", image_url: "u", owned_count: 2, wishlisted: true });
  });

  it("devolve null quando a RPC não retorna linha (código inexistente)", async () => {
    const { client } = fakeClient({ data: [], error: null });
    const result = await lookupStickerByCode(client, "ZZZ9", 1);
    expect(result).toBeNull();
  });

  it("devolve null quando a RPC erra", async () => {
    const { client } = fakeClient({ data: null, error: { message: "boom" } });
    const result = await lookupStickerByCode(client, "MEX1", 1);
    expect(result).toBeNull();
  });
});
