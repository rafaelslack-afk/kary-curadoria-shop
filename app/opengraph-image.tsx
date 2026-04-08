import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kary Curadoria — Moda Clássica e Elegante";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#EDE8DC",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* Bordas decorativas */}
        <div
          style={{
            position: "absolute",
            inset: 24,
            border: "1px solid #B89070",
            display: "flex",
          }}
        />

        {/* Conteúdo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          <div
            style={{
              fontSize: 13,
              letterSpacing: "0.4em",
              color: "#A0622A",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            LOJA ONLINE
          </div>

          <div
            style={{
              fontSize: 88,
              color: "#5C3317",
              fontWeight: 400,
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            Kary Curadoria
          </div>

          <div
            style={{
              width: 80,
              height: 1,
              background: "#A0622A",
              marginTop: 28,
              marginBottom: 28,
            }}
          />

          <div
            style={{
              fontSize: 22,
              color: "#A0622A",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            MODA CLÁSSICA E ELEGANTE
          </div>

          <div
            style={{
              fontSize: 17,
              color: "#B89070",
              marginTop: 16,
              letterSpacing: "0.08em",
            }}
          >
            karycuradoria.com.br
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
