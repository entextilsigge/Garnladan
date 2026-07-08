// ---------------------------------------------------------------------------
// Content-Security-Policy sätts i middleware.ts, INTE här — App Router
// behöver en per-request nonce för sina inline hydreringsscript
// (self.__next_f.push(...), 100+ per sida), och headers() i den här filen
// kan bara sätta ett statiskt värde utan nonce. Se middleware.ts för hela
// bakgrunden till varför (en tidigare statisk CSP utan nonce blockerade
// tyst all hydrering och gjorde HELA sajten oklickbar — inga knappar,
// färgval eller "lägg i varukorgen" svarade på klick).
// ---------------------------------------------------------------------------

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
        ],
      },
    ];
  },
};

export default nextConfig;
