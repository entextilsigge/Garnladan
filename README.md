# Garnladan

E-handelssajt för Garnladan — svensk webbutik för garn och stickmaterial.
Byggd med **Next.js (App Router), TypeScript och Tailwind CSS**. Helt på svenska.

## Kom igång

```bash
npm install
npm run dev        # http://localhost:3000
```

## Deploya till Vercel

```bash
npm i -g vercel    # om du inte redan har Vercel CLI
vercel deploy      # följ prompterna — ingen extra konfiguration behövs
```

Sajten kräver inga miljövariabler eller externa tjänster i nuvarande läge.

## Sidor

| Route | Beskrivning |
|---|---|
| `/` | Startsida: hero, kategorier, nyheter, om oss, nyhetsbrev |
| `/produkter` | Produktlistning med filter (material, tjocklek, färg) och sortering |
| `/produkt/[slug]` | Produktsida med galleri, färgväljare, specs, relaterade produkter |
| `/varukorg` | Varukorg (finns även som sidopanel i headern) |
| `/kassa` | Checkout i steg: leverans → betalning → bekräftelse |
| `/admin` | Adminvy med produkttabell (demo-lösenord: `garn`) |

## Byta ut platshållardata

All produktdata ligger i [`lib/products.ts`](lib/products.ts) — typad och skild
från UI-koden. Byt innehållet i `PRODUCTS`-arrayen (eller ersätt filen med
databas-/CMS-anrop) utan att röra komponenterna.

Produktbilderna genereras som SVG-illustrationer av
[`components/YarnImage.tsx`](components/YarnImage.tsx) utifrån varje färgvariants
hexkod. Byt den komponenten mot `next/image` med riktiga foton när de finns.

## Koppla in riktig betalning

Betalflödet är mockat men strukturerat för Stripe/Klarna:

- [`lib/checkout.ts`](lib/checkout.ts) — `createCheckoutSession()` och
  `confirmPayment()`, de enda funktioner UI:t anropar.
- [`app/api/checkout/session/route.ts`](app/api/checkout/session/route.ts) —
  byt mot `stripe.checkout.sessions.create(...)`. Beloppet beräknas redan
  server-side från produktdatan.
- [`app/api/checkout/confirm/route.ts`](app/api/checkout/confirm/route.ts) —
  byt mot verifiering av betalstatus + orderlagring.

Funktionssignaturerna är designade för att inte behöva ändras.

## Klart vs. mockat

**Riktigt klart:** all UI, produktdata-lager, varukorg (localStorage),
filtrering/sortering, checkout-flödets steg och validering, responsiv design.

**Medvetet mockat:** betalning (simulerad lyckad betalning), admin-auth
(sessionStorage, lösenord `garn`), lagersaldo i admin, nyhetsbrevs-signup
(endast UI), orderbekräftelse via mejl (skickas ej).
