import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const alt = "Perfil faltaUma";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, sticker_count")
    .eq("username", username)
    .single();

  if (!profile) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a3d2a" }}>
        <span style={{ fontSize: 48, color: "#fef9e8" }}>Perfil não encontrado</span>
      </div>,
      { ...size }
    );
  }

  const { count: totalStickers } = await supabase
    .from("stickers")
    .select("id", { count: "exact", head: true });

  const uniqueOwned = profile.sticker_count ?? 0;
  const total = totalStickers ?? 0;
  const missing = total - uniqueOwned;
  const percent = total > 0 ? Math.round((uniqueOwned / total) * 100) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          background: "linear-gradient(135deg, #0a3d2a 0%, #155236 50%, #04140b 100%)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 40 }}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              width={100}
              height={100}
              style={{ borderRadius: "50%", border: "3px solid rgba(255,255,255,0.2)" }}
            />
          ) : (
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(16,185,129,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
                fontWeight: 700,
                color: "#10b981",
              }}
            >
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 42, fontWeight: 900, color: "#fef9e8" }}>
              {profile.display_name}
            </span>
            <span style={{ fontSize: 22, color: "rgba(254,249,232,0.6)" }}>
              @{profile.username}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 24, marginBottom: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 32px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: "#10b981" }}>{uniqueOwned}</span>
            <span style={{ fontSize: 16, color: "rgba(254,249,232,0.6)" }}>Coladas</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 32px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: "#ef4444" }}>{missing}</span>
            <span style={{ fontSize: 16, color: "rgba(254,249,232,0.6)" }}>Faltam</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 32px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: "#fbbf24" }}>{percent}%</span>
            <span style={{ fontSize: 16, color: "rgba(254,249,232,0.6)" }}>Completo</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", width: "100%", height: 16, borderRadius: 8, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
          <div style={{ width: `${percent}%`, height: "100%", borderRadius: 8, background: "#10b981" }} />
        </div>

        {/* Branding */}
        <div style={{ display: "flex", alignItems: "baseline", position: "absolute", bottom: 40, right: 80 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: "#fef9e8" }}>falta</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: "#fbbf24" }}>Uma</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
