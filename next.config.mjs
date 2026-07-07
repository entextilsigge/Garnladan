// ---------------------------------------------------------------------------
// Content-Security-Policy — tillåter bara det som faktiskt behövs:
// Stripe.js (Payment Element, laddas som script + iframes från
// js.stripe.com, pratar med api.stripe.com) och egna domänen. Inga inline
// scripts tillåts (ingen 'unsafe-inline'/'unsafe-eval' i script-src) —
// 'unsafe-inline' i style-src behövs dock eftersom appen använder inline
// style={{...}}-attribut för färgprickar (colorway-hex) på många ställen;
// det är fortfarande bara CSS, inte kod som kan köras.
//
// 'unsafe-eval' läggs bara till i dev — Next/Turbopacks
// HMR/react-refresh kan behöva eval() i utvecklingsläge, men aldrig i en
// produktionsbuild.
// ---------------------------------------------------------------------------
const isProd = process.env.NODE_ENV === "production";

const CSP = [
  "default-src 'self'",
  `script-src 'self' https://js.stripe.com${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Uppladdade produktfoton serveras från Vercel Blobs publika
    // *.public.blob.vercel-storage.com-domän — måste vitlistas för att
    // next/image ska få optimera dem.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
