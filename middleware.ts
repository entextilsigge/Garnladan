import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Content-Security-Policy via en per-request nonce.
//
// BAKGRUND PÅ EN RIKTIG BUGG: en tidigare CSP sattes direkt i next.config.mjs
// med script-src 'self' https://js.stripe.com — utan 'unsafe-inline' och
// utan nonce. Next.js App Router injicerar sina egna hydreringsscript som
// INLINE <script>-taggar (self.__next_f.push(...), en per RSC-chunk — ofta
// 100+ per sida). Utan 'unsafe-inline' ELLER en nonce blockerar webbläsaren
// tyst alla dessa, React hydrerar aldrig, och ALLA klientkomponenter slutar
// svara på klick (redigera-knappen i admin, färgval på produktsidan, lägg
// i varukorgen — allt). Inga konsolfel syns nödvändigtvis för CSP-brott på
// varje webbläsare, vilket gjorde detta extra lurigt att upptäcka.
//
// Lösningen (Next.js egna rekommenderade mönster, se deras CSP-dokumentation)
// är en nonce genererad per request i middleware: nonce:en sätts både på
// request-headern (så Next.js server-rendering kan läsa av den och stämpla
// sina egna scripts med rätt nonce) och på svarets CSP-header (så
// webbläsaren vet vilken nonce som är giltig). 'strict-dynamic' behövs också
// — Next.js laddar dynamiskt kodsplittrade chunk-scripts utan egen nonce,
// och strict-dynamic låter webbläsaren lita på dem eftersom de laddades av
// ett redan betrott (nonce:at) script.
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isProd = process.env.NODE_ENV === "production";

  const csp = [
    "default-src 'self'",
    // 'unsafe-eval' bara i dev — Turbopacks HMR/react-refresh kan behöva
    // eval() i utvecklingsläge, men aldrig i en produktionsbuild.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com${isProd ? "" : " 'unsafe-eval'"}`,
    // Appen använder inline style={{...}}-attribut för färgprickar
    // (colorway-hex) på många ställen — det är fortfarande bara CSS, inte
    // kod som kan köras, så 'unsafe-inline' här är en annan risknivå än i
    // script-src.
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    // Kör på alla sidor utom statiska filer/bilder — samma matcher som
    // Next.js egna CSP-exempel rekommenderar.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
