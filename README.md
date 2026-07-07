# Garnladan

E-handelssajt för Garnladan — svensk webbutik för garn och stickmaterial.
Byggd med **Next.js (App Router), TypeScript och Tailwind CSS**. Helt på svenska.

## Kom igång

```bash
npm install
cp .env.example .env.local   # sätt ADMIN_PASSWORD (valfritt: RESEND_API_KEY)
npm run dev                  # http://localhost:3000
```

## Deploya till Vercel

```bash
npm i -g vercel    # om du inte redan har Vercel CLI
vercel deploy      # följ prompterna
```

Sätt `ADMIN_PASSWORD` (och valfritt `RESEND_API_KEY` / `RESEND_FROM_EMAIL`)
under Project Settings → Environment Variables i Vercel — se
[`.env.example`](.env.example). Utan `ADMIN_PASSWORD` faller admin-inloggningen
tillbaka på lösenordet `garn` och varnar i konsolen; sätt ett riktigt värde
innan sajten är på riktigt igång.

## Sidor

| Route | Beskrivning |
|---|---|
| `/` | Startsida: hero, kategorier, nyheter, om oss, nyhetsbrev |
| `/produkter` | Produktlistning med filter (material, tjocklek, färg) och sortering |
| `/produkt/[slug]` | Produktsida med galleri, färgväljare, lagerstatus, specs, relaterade produkter |
| `/varukorg` | Varukorg (finns även som sidopanel i headern) |
| `/kassa` | Checkout i steg: leverans → betalning → bekräftelse |
| `/admin` | Adminpanel: produkt-CRUD, lager, orderhantering (lösenordsskyddad) |

## Datalagring

Det finns ingen databas ännu — sortiment, ordrar och nyhetsbrevsprenumeranter
lagras som JSON-filer under [`data/`](data), lästa/skrivna via:

- [`lib/data/productStore.ts`](lib/data/productStore.ts) — produkter (`data/products.json`)
- [`lib/data/orderStore.ts`](lib/data/orderStore.ts) — beställningar (`data/orders.json`)
- [`lib/data/newsletterStore.ts`](lib/data/newsletterStore.ts) — nyhetsbrev (`data/newsletter.json`)
- [`lib/data/checkoutSessionStore.ts`](lib/data/checkoutSessionStore.ts) — kortlivad koppling mellan checkout-session och order

Varje fil har en kommentar om var en riktig databas (Postgres/Supabase/
PlanetScale etc.) ska kopplas in — resten av koden (admin-API:t, checkout)
pratar bara med funktionerna i dessa moduler och behöver inte ändras.

**Viktigt för Vercel:** filsystemet i serverless-funktioner är read-only
(utom `/tmp`, som inte delas mellan anrop). Skrivningar fungerar utmärkt
lokalt (`npm run dev` / `npm start`) men **försvinner vid nästa deploy eller
cold start i produktion**. För en riktig driftsättning, byt ut dessa fyra
filer mot en riktig databas — inget annat i kodbasen behöver röras.

Produktbilderna genereras som SVG-illustrationer av
[`components/YarnImage.tsx`](components/YarnImage.tsx) utifrån varje
färgvariants hexkod. Varje produkt kan även få en `imageUrl`-override i admin
(fältet "Bild-URL") — är den satt visas ett riktigt foto istället, överallt på
sajten, utan att röra resten av bildsystemet.

## Admin

`/admin` är lösenordsskyddad via `ADMIN_PASSWORD` (miljövariabel, kontrolleras
server-side — se [`lib/adminAuth.ts`](lib/adminAuth.ts)). Sessionen är en
httpOnly-cookie, giltig i 8 timmar.

- **Produkter**: lägg till, redigera och ta bort produkter i ett formulär
  (namn, pris, beskrivning, material, garntjocklek, löpmeter, stickfasthet,
  tvättråd, bild-URL). Varje färgvariant har ett eget redigerbart lagerantal.
- **Lager**: en färgvariant med 0 i lager visas som "Slut i lager" på
  produktsidan och går inte att lägga i varukorgen (kollas både i UI och i
  varukorgslogiken).
- **Beställningar**: lista över alla genomförda (mockade) köp med
  ordernummer, datum, kund, rader och totalsumma. Status kan ändras
  (Mottagen → Skickad → Levererad). Sök/filtrera på ordernummer, kund eller
  status.
- **Statistik**: försäljning, lönsamhet, produktprestanda, kunder och
  marknadsföring — se eget avsnitt nedan.

## Statistik / analytics (`/admin` → Statistik-fliken)

En egen flik i admin, filtrerbar på tidsperiod (styr alla sektioner
samtidigt) med snabbval (7/30/90 dagar, 12 månader, allt) och fri
datumväljare + dag/vecka/månad-upplösning på trendgrafen.

- **Försäljningsöversikt** — omsättning/ordrar/AOV över tid som trendgraf,
  plus en fast "innevarande kalendermånad vs. föregående / samma månad
  föregående år"-jämförelse (oberoende av periodfiltret, tydligt märkt i
  UI:t, annars blir "månad mot månad" obegripligt om man filtrerar på t.ex.
  7 dagar).
- **Lönsamhet** — bruttomarginal totalt och per kategori, topp/botten
  marginal% (katalogbaserat) och topp/botten täckningsbidrag
  (marginal × sålda enheter, beräknat på vald period), marginaltrend.
- **Produktprestanda** — bästsäljare/sämst säljande, försäljning per
  färgvariant, lageromsättningstakt, varningar för risk att ta slut
  (lågt lager + hög säljtakt) och kapitalbindning (högt lager + ingen
  försäljning).
- **Kunder** — nya vs. återkommande (andel av omsättning), geografisk
  fördelning (ort), histogram över ordervärden, engångs- vs.
  återkommande köpare.
- **Marknadsföring** — nedbrytning per källa/medium/kampanj (från
  UTM-spårning, se nedan), ett kampanjregister (namn/kanal/period/budget)
  och per kampanj: attribuerade ordrar/omsättning, en jämförelse av
  siteomsättning under kampanjperioden mot en lika lång period strax innan
  (indikerar lyft utan att kräva en riktig annonsplattforms-integration),
  och ROI om en budget är angiven.
- **Excel-export** — knapp som laddar ner en `.xlsx` (via `xlsx`/SheetJS)
  för valt datumintervall: ett blad med rådata per orderrad (datum,
  produkt, färg, antal, pris, marginal, källa/kampanj) och ett blad med
  månadsvis sammanställning. Filnamnet innehåller datumintervallet, t.ex.
  `garnladan-rapport-2026-06-01_2026-06-30.xlsx`.

**UTM-spårning**: [`components/UtmCapture.tsx`](components/UtmCapture.tsx)
läser `utm_source`/`utm_medium`/`utm_campaign` från query-strängen vid
landning och sparar dem i en cookie (se
[`lib/attribution.ts`](lib/attribution.ts)). Checkout läser cookien och
skickar med attributionen, som hamnar på `Order.attribution`. Utan
UTM-parametrar defaultar det till `direkt`/`okänt`/`okänd`.

**Inköpspris / marginal**: `Product.costPrice` i
[`lib/products.ts`](lib/products.ts) är grunden för alla
marginalberäkningar. Värdena i `data/products.json` är **platshållare**
(35–60 % varierad bruttomarginal, se kommentar i koden) — inte riktiga
inköpspriser. Byt ut dem så snart verkliga siffror finns; ingen annan kod
behöver ändras.

**Seeda testdata (endast lokalt):**

```bash
npm run seed:analytics
```

Fyller `data/orders.json` och `data/campaigns.json` med ~140 realistiska
testordrar spridda över de senaste ~5 månaderna (varierande kampanjkällor,
kunder, produkter) plus tre exempelkampanjer, så statistiken går att
utvärdera innan riktiga ordrar finns. Vägrar köra om `NODE_ENV=production`
eller på Vercel. Idempotent — kör om när du vill, tidigare seed-data
(identifierad via `SEED-`-prefix på ordernumret) rensas och ersätts. **Kör
aldrig detta mot en databas med riktiga kundordrar** utan att först säkerhetskopiera `data/orders.json`.

## Koppla in riktig betalning

Betalflödet är mockat men strukturerat för Stripe/Klarna:

- [`lib/checkout.ts`](lib/checkout.ts) — `createCheckoutSession()` och
  `confirmPayment()`, de enda funktioner UI:t anropar. Rörs inte vid en
  riktig integration.
- [`app/api/checkout/session/route.ts`](app/api/checkout/session/route.ts) —
  byt mot `stripe.checkout.sessions.create(...)`. Beloppet beräknas redan
  server-side från produktdatan.
- [`app/api/checkout/confirm/route.ts`](app/api/checkout/confirm/route.ts) —
  byt mot verifiering av betalstatus. Ordern sparas redan idag persistent
  (för adminvyn) och ett bekräftelsemejl skickas via Resend om
  `RESEND_API_KEY` är satt — båda delarna kan återanvändas som de är.

Funktionssignaturerna är designade för att inte behöva ändras.

## Bekräftelsemejl

[`lib/email.ts`](lib/email.ts) skickar ett bekräftelsemejl via Resends
REST-API vid genomförd (mockad) order. Saknas `RESEND_API_KEY` loggas mejlet
bara till konsolen — checkout-flödet fungerar felfritt även utan nyckel. Lägg
till `RESEND_API_KEY` (och valfritt `RESEND_FROM_EMAIL`) för att aktivera
riktiga mejl.

## Klart vs. mockat

**Riktigt klart:** all UI och design, produktdata i JSON-fil med riktig
CRUD + lagerhantering via admin, orderhantering i admin (status,
sök/filtrering), varukorg (localStorage + lagerkoll mot katalogen),
filtrering/sortering, checkout-flödets steg och validering, adminlösenord via
miljövariabel med serverside-koll, nyhetsbrevs-signup med persistent lagring,
bekräftelsemejl-integration (no-op utan nyckel), per-sida `<title>`/meta
description, responsiv design, UTM-attribution end-to-end, statistik-
dashboarden med Excel-export.

**Medvetet mockat:** själva betalningen (simulerad lyckad betalning —
Stripe/Klarna kopplas in enligt ovan), datalagring via JSON-filer istället
för databas (fungerar lokalt, försvinner mellan deploys på Vercel — se
"Datalagring" ovan), bekräftelsemejl skickas bara om `RESEND_API_KEY` är
satt, `costPrice` är platshållarvärden (se "Statistik / analytics" ovan).

**Inte hunnet / medvetet avgränsat:**
- Lagersaldo dras inte automatiskt vid en genomförd beställning — det är
  bara admin-redigerbart. Enkelt att lägga till i
  `app/api/checkout/confirm/route.ts` om det önskas.
- Bildhantering per produkt är begränsad till att byta färgkulör (hex) på
  den genererade illustrationen eller ange en enda bild-URL-override — inga
  fler SVG-parametrar (härvans form, antal trådar etc.) är exponerade i
  admin.
- Produktens slug genereras om automatiskt om namnet ändras i admin, vilket
  ändrar produktens URL. Ingen varning visas för detta i UI:t.
- Adminsessionen är en enda delad, stateless cookie (inga separata
  användarkonton eller roller) — tillräckligt för en ensam butiksägare, men
  inte en fleranvändarlösning.
- **Marginal på historiska ordrar** räknas mot produktens *nuvarande*
  `costPrice`, inte det som gällde vid köptillfället (inte historiserat).
  Marginalen på gamla ordrar "rör sig" alltså om du ändrar ett inköpspris i
  efterhand. För exakt historisk marginal krävs att costPrice sparas per
  orderrad vid köptillfället.
- **Kampanjattribution** kräver att kampanjnamnet i registret matchar
  `utm_campaign` exakt (skiftlägeskänsligt, ingen fuzzy-matchning) — och
  bygger på sista träffens UTM-cookie (last-touch), inte en fullständig
  multi-touch-modell.
- **Geografisk nedbrytning** är en lista grupperad på `city` (fritext från
  kunden), inte en riktig karta eller postnummer-baserad regionindelning —
  ingen kartbiblioteks-dependency drogs in för detta. Fungerar men blir
  känsligt för stavningsvarianter av samma ort i större datamängder.
- Diagrammen är handrullad SVG (samma mönster som `YarnImage.tsx`) istället
  för ett chart-bibliotek som Recharts — medvetet val för att undvika en ny,
  tung dependency för ett fåtal enkla linje-/stapeldiagram. Inga
  zoom/hover-tooltips.
- `xlsx`-paketet installeras från SheetJS egna CDN
  (`https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz` i `package.json`,
  se [`.env.example`](.env.example)-liknande princip men för dependencies)
  istället för npm-registrets `xlsx`-paket, som har kända ofixade
  `npm audit`-varningar (prototype pollution/ReDoS). Samma API, ingen
  kodändring — bara installationskällan skiljer sig. Kör `npm install` som
  vanligt; `npm audit` ska inte längre visa någon `xlsx`-varning.
