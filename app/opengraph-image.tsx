import { ImageResponse } from "next/og";

// ---------------------------------------------------------------------------
// Generell varumärkesbild för Open Graph/Twitter-kort, använd av alla sidor
// som inte har en egen opengraph-image.tsx (produktsidan har sin egen, se
// app/produkt/[slug]/opengraph-image.tsx). Genereras som PNG vid request/
// build-tid via next/og — ingen statisk bildfil att hålla i synk.
// ---------------------------------------------------------------------------

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          background: "#F7F2E8",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 180,
            height: 180,
            borderRadius: 40,
            background: "#A64B33",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <svg width="110" height="110" viewBox="0 0 64 64" fill="none">
            <g stroke="#F7F2E8" strokeWidth="3.4" strokeLinecap="round">
              <path d="M12 32 C 18 18, 46 18, 52 32 C 46 46, 18 46, 12 32 Z" />
              <path
                d="M14 32 C 20 22, 44 22, 50 32 C 44 42, 20 42, 14 32 Z"
                strokeOpacity="0.65"
              />
              <path
                d="M16 32 C 22 26, 42 26, 48 32 C 42 38, 22 38, 16 32 Z"
                strokeOpacity="0.4"
              />
            </g>
          </svg>
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            color: "#241C14",
            letterSpacing: -2,
          }}
        >
          Garnladan
        </div>
        <div style={{ fontSize: 32, color: "#5E4C3A", marginTop: 12 }}>
          Garn &amp; stickmaterial online
        </div>
      </div>
    ),
    { ...size }
  );
}
