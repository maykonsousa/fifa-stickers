import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "faltaUma — álbum colecionável 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a3d2a 0%, #155236 50%, #04140b 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: 24 }}>
          <span style={{ fontSize: 96, fontWeight: 900, color: "#fef9e8", letterSpacing: -3 }}>
            falta
          </span>
          <span style={{ fontSize: 96, fontWeight: 900, color: "#fbbf24", letterSpacing: -3 }}>
            Uma
          </span>
        </div>
        <p style={{ fontSize: 32, color: "#fef9e8", opacity: 0.8, margin: 0 }}>
          Cada figurinha colada é uma vitória
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 40,
            padding: "12px 24px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
          }}
        >
          <span style={{ fontSize: 18, color: "#fbbf24" }}>⚽</span>
          <span style={{ fontSize: 18, color: "#fef9e8", letterSpacing: 2 }}>
            ÁLBUM COLECIONÁVEL · 2026
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
