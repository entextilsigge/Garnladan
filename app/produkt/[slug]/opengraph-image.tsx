import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/data/productStore";
import { getPrimaryImageUrl } from "@/lib/products";

// ---------------------------------------------------------------------------
// Per-produkt Open Graph-bild: den uppladdade produktbilden om en finns
// (se lib/products.ts getPrimaryImageUrl), annars ett enkelt kort i
// produktens egen kulör — samma princip som SVG-fallbacken på sajten
// (YarnImage.tsx), fast som ett statiskt kort istället för illustrationen
// själv (ImageResponse/Satori kan inte rendera YarnImage-komponenten).
// ---------------------------------------------------------------------------

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F7F2E8",
            fontSize: 64,
            fontWeight: 700,
            color: "#241C14",
          }}
        >
          Garnladan
        </div>
      ),
      { ...size }
    );
  }

  const imageUrl = getPrimaryImageUrl(product);
  const colorway = product.colorways[0];

  return new ImageResponse(
    imageUrl ? (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          width={1200}
          height={630}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            padding: "48px 64px",
            background: "linear-gradient(transparent, rgba(36,28,20,0.88))",
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 700, color: "#F7F2E8" }}>{product.name}</div>
          <div style={{ fontSize: 28, color: "#F7F2E8", opacity: 0.9, marginTop: 6 }}>
            {product.tagline}
          </div>
        </div>
      </div>
    ) : (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: colorway.hex,
          padding: "0 100px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, color: "#F7F2E8" }}>{product.name}</div>
        <div style={{ fontSize: 32, color: "#F7F2E8", opacity: 0.9, marginTop: 18 }}>
          {product.tagline}
        </div>
        <div style={{ fontSize: 24, color: "#F7F2E8", opacity: 0.7, marginTop: 32 }}>
          Garnladan
        </div>
      </div>
    ),
    { ...size }
  );
}
