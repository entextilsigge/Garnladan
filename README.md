# Garnladan

E-handelssajt för Garnladan — svensk webbutik för garn och stickmaterial.
Byggd med **Next.js (App Router), TypeScript och Tailwind CSS**. Helt på svenska.

## Kom igång

```bash
npm install
cp .env.example .env.local   # sätt ADMIN_PASSWORD (valfritt: RESEND_API_KEY, BLOB_READ_WRITE_TOKEN)
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

## SEO

- **`/sitemap.xml`** ([`app/sitemap.ts`](app/sitemap.ts)) — genereras automatiskt av Next.js. Innehåller alla statiska sidor (start, produktlista, villkor, ångerrätt, integritetspolicy) och alla produktsidor dynamiskt från produktdatan — nya produkter dyker upp här utan kodändring.
- **`/robots.txt`** ([`app/robots.ts`](app/robots.ts)) — tillåter allt utom `/admin` och `/api`, pekar på sitemapen.
- **Metadata per sida**: varje publik sida har en egen, relevant `<title>`/beskrivning (inte bara root-layoutens default). Produktsidor genererar titel/beskrivning från produktens eget namn, tagline och specifikationer (`generateMetadata` i [`app/produkt/[slug]/page.tsx`](app/produkt/%5Bslug%5D/page.tsx)). Sidor med personligt/icke-indexerbart innehåll (`/kassa`, `/varukorg`, `/kassa/bekraftelse`, `/admin`) har `robots: { index: false }`.
- **Canonical URLs** (`alternates.canonical`) satta per sida — särskilt viktigt för produktsidor och `/produkter`, som båda kan nås med extra querysträngar (UTM-attribution, filter/sortering); canonical pekar alltid på den rena bas-URL:en.
- **Open Graph/Twitter-kort**: [`app/opengraph-image.tsx`](app/opengraph-image.tsx) genererar en generell varumärkesbild (via `next/og`) som används av alla sidor som inte har en egen. Produktsidor har sin egen [`app/produkt/[slug]/opengraph-image.tsx`](app/produkt/%5Bslug%5D/opengraph-image.tsx): visar produktens uppladdade foto om ett finns, annars ett enkelt kort i produktens egen kulör (samma idé som SVG-fallbacken på sajten, fast som ett statiskt OG-kort). `metadataBase` sätts i [`app/layout.tsx`](app/layout.tsx) från [`lib/seo.ts`](lib/seo.ts) (samma `NEXT_PUBLIC_SITE_URL` som mejlens länkar använder) så relativa OG-bild-URL:er löses upp mot rätt domän.
- **Favicon**: [`app/icon.svg`](app/icon.svg) — en egen, varumärkesanpassad platshållare (stiliserad garnhärva i tegel-rött), inte Next.js standardikon.

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
färgvariants hexkod. En produkt kan få riktiga foton uppladdade i admin (se
"Produktbilder / Vercel Blob" nedan) — då visas första bilden istället för
SVG:n, överallt på sajten. Det äldre `imageUrl`-fältet ("Bild-URL", en
fritextlänk utan uppladdning eller radering) finns kvar för bakåtkompatibilitet
men används bara om inga bilder laddats upp.

## Produktbilder / Vercel Blob

Uppladdade produktfoton lagras i **Vercel Blob**, inte på lokal disk — precis
som JSON-datalagret ovan är serverless-filsystemet tillfälligt i produktion,
så lokala uppladdningar skulle försvinna mellan requests på Vercel.

**Så aktiverar du det (en gång per projekt):**

1. Gå till projektet i **Vercel Dashboard**.
2. Öppna fliken **Storage** → **Create Database** → välj **Blob**.
3. Ge storet ett namn och koppla det till det här projektet ("Connect Project").
   Detta sätter automatiskt miljövariabeln `BLOB_READ_WRITE_TOKEN` för
   projektets miljöer (Production/Preview/Development) i Vercel.
4. För att uppladdning ska fungera lokalt också: kör `vercel env pull
   .env.local` (eller kopiera värdet manuellt från Dashboard) så att
   `BLOB_READ_WRITE_TOKEN` finns i din `.env.local`. Vercel Blob fungerar
   utmärkt från `npm run dev` så länge token finns satt — ingen lokal emulator
   behövs.

Utan `BLOB_READ_WRITE_TOKEN` fungerar hela sajten och bygget som vanligt —
admin visar bara ett tydligt felmeddelande om man försöker ladda upp en bild.

**Var i koden:**

- [`app/api/admin/products/[id]/images/route.ts`](app/api/admin/products/%5Bid%5D/images/route.ts) — POST (ladda upp), PATCH (ändra ordning/huvudbild)
- [`app/api/admin/products/[id]/images/[imageId]/route.ts`](app/api/admin/products/%5Bid%5D/images/%5BimageId%5D/route.ts) — DELETE (tar bort både referensen och filen i Blob)
- [`components/admin/ProductImages.tsx`](components/admin/ProductImages.tsx) — admin-UI (uppladdning, förhandsgranskning, ordning, huvudbild, radering)
- Stöds format: PNG (inkl. transparens), JPG, WebP — max 8 MB per fil.
- En produkt utan uppladdad bild visar alltid SVG-fallbacken — ingen produkt
  saknar någonsin bild helt.
- Bilder kopplas till produkten, inte till enskilda färgvarianter — foto per
  färgvariant är en separat, mindre utökning om det behövs senare.

## Admin

`/admin` är lösenordsskyddad via `ADMIN_PASSWORD` (miljövariabel, kontrolleras
server-side — se [`lib/adminAuth.ts`](lib/adminAuth.ts)). Sessionen är en
httpOnly-cookie, giltig i 8 timmar.

- **Produkter**: lägg till, redigera och ta bort produkter i ett formulär
  (namn, pris, beskrivning, material, garntjocklek, löpmeter, stickfasthet,
  tvättråd, bild-URL) samt ladda upp riktiga produktfoton (se "Produktbilder /
  Vercel Blob" ovan). Varje färgvariant har ett eget redigerbart lagerantal.
- **Lager**: en färgvariant med 0 i lager visas som "Slut i lager" på
  produktsidan och går inte att lägga i varukorgen (kollas både i UI och i
  varukorgslogiken).
- **Beställningar**: lista över alla genomförda köp med ordernummer, datum,
  kund, rader, betalstatus, packstatus och spårningsnummer synligt direkt i
  tabellen. Sök/filtrera på ordernummer, kund eller packstatus. Öppna en
  order ("Detaljer") för full orderinfo och riktig återbetalning — se
  "Återbetalningar" nedan.
- **Statistik**: försäljning, lönsamhet, produktprestanda, kunder och
  marknadsföring — se eget avsnitt nedan.
- **Databackup** (Inställningar-fliken): "Ladda ner backup" zippar alla
  JSON-datafiler i `data/` (produkter, ordrar, kampanjer,
  nyhetsbrevsprenumeranter, inställningar) till en nedladdningsbar fil
  `garnladan-backup-ÅÅÅÅ-MM-DD.zip` ([`app/api/admin/backup/route.ts`](app/api/admin/backup/route.ts)).
  Helt manuellt — admin sparar filen själv (t.ex. i Google Drive); ingen
  schemalagd eller molnbaserad backup i det här skedet, det kräver nya
  konton/tokens. En påminnelsetext bredvid knappen uppmanar till regelbunden
  nedladdning, särskilt innan större ändringar.

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

## Stripe / betalning

Betalningen är byggd med **Stripe Elements** (eget UI i vår egen
checkout-design, inte Stripes hostade Checkout-sida). **Klarna kräver ingen
extra kod** — den dyker upp automatiskt i Payment Element så fort Klarna är
aktiverat i Stripe Dashboard, eftersom PaymentIntenten skapas med
`automatic_payment_methods: { enabled: true }` (se
[`app/api/checkout/payment-intent/route.ts`](app/api/checkout/payment-intent/route.ts)).

**Utan Stripe-nycklar körs sajten i mockat betalläge automatiskt** — inget
kraschar, och en tydlig varning (`Stripe-nycklar saknas, kör mockat
betalflöde`) loggas i webbläsarkonsolen. Så fort nycklarna finns i miljön
växlar sajten till riktiga Stripe Elements, helt utan kodändring — bara en
redeploy (eller omstart av `npm run dev` lokalt).

### Miljövariabler att lägga till i Vercel

När ni skaffat ett Stripe-konto, lägg till dessa tre under **Project
Settings → Environment Variables**:

| Variabel | Var den hittas i Stripe Dashboard |
|---|---|
| `STRIPE_SECRET_KEY` | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) — växla mellan test-/liveläge högst upp på sidan. Börjar med `sk_test_` respektive `sk_live_`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Samma sida som ovan, `pk_test_`/`pk_live_`-nyckeln. Denna är avsedd att vara publik (skickas till klienten). |
| `STRIPE_WEBHOOK_SECRET` | [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint** → URL `https://<din-domän>/api/webhooks/stripe` → prenumerera på `payment_intent.succeeded` och `payment_intent.payment_failed` → kopiera **Signing secret** för just den endpointen (inte en generell API-nyckel). |

Aktivera Klarna under **Settings → Payment methods** i Stripe Dashboard — då
dyker den upp i kassan automatiskt, ingen kod behöver ändras.

### Arkitektur

- [`lib/stripe.ts`](lib/stripe.ts) — `isStripeConfigured()` styr all
  växling mellan mockat och riktigt läge, server-side.
- [`app/api/checkout/session/route.ts`](app/api/checkout/session/route.ts) —
  **orört** vid Stripe-integrationen. Beräknar fortfarande beloppet
  server-side från produktdatan, oavsett betalsätt.
- [`app/api/checkout/payment-intent/route.ts`](app/api/checkout/payment-intent/route.ts) —
  skapar en Stripe PaymentIntent från sessionens redan beräknade belopp
  (i öre) och skapar samtidigt ordern med `paymentStatus: "pending"`.
- [`components/checkout/StripePaymentStep.tsx`](components/checkout/StripePaymentStep.tsx) +
  [`PaymentForm.tsx`](components/checkout/PaymentForm.tsx) — Stripes
  `Elements`-provider och `PaymentElement`, stylad via `appearance`-API:t
  för att matcha Fraunces/Karla och den varma paletten så långt Stripe
  tillåter (Elements renderas i en iframe).
- [`app/api/webhooks/stripe/route.ts`](app/api/webhooks/stripe/route.ts) —
  **sanningskällan** för om en order är betald. Lyssnar på
  `payment_intent.succeeded`/`payment_intent.payment_failed`, verifierar
  Stripes signatur med `STRIPE_WEBHOOK_SECRET`, uppdaterar
  `order.paymentStatus`, och triggar bekräftelsemejlet (inte klientens
  redirect — se kommentarer i filen för varför).
- [`app/kassa/bekraftelse/page.tsx`](app/kassa/bekraftelse/page.tsx) —
  hämtar alltid den faktiska betalstatusen live från
  `/api/checkout/order-status` istället för att lita på klientens redirect;
  visar "väntar bekräftelse" om webhooken inte hunnit köra än.
- Mockat läge ([`app/api/checkout/confirm/route.ts`](app/api/checkout/confirm/route.ts))
  och riktigt Stripe-läge delar samma order-byggarfunktion
  ([`lib/orders.ts`](lib/orders.ts)) — enda skillnaden är `paymentStatus`
  och om ett `paymentIntentId` sätts.

### Moms

Alla priser i produktkatalogen är redan momsinkluderade (25 % svensk moms),
vilket redan syns i UI:t ("Totalt **inkl. moms**" i varukorg och kassa).
Beloppet som skickas till Stripe (`session.amount * 100` öre) är exakt
samma belopp som visas för kunden — `automatic_tax` används medvetet INTE
på PaymentIntenten, det skulle lägga på moms en gång till ovanpå ett redan
momsinkluderat pris.

### Testning när kontot finns

Sätt in test-nycklarna (`sk_test_…`/`pk_test_…`), kör `npm run dev`, och
betala med Stripes officiella testkort, t.ex. **4242 4242 4242 4242** (valfritt
framtida utgångsdatum, valfri CVC/postnummer) — dokumenterat på
[docs.stripe.com/testing](https://docs.stripe.com/testing). Detta har inte
kunnat verifieras i den här sessionen eftersom inget Stripe-konto finns
ännu — verifiera tillsammans så fort kontot är skapat.

Jag har verifierat arkitekturen genom att tillfälligt sätta in en
**ogiltig** testnyckel: sajten växlade korrekt till de riktiga Stripe
Elements-komponenterna (inget mockat UI längre, ingen "saknas nycklar"-
varning), och när anropet till Stripes API nådde fram fick vi tillbaka
Stripes egna felmeddelande ("Invalid API Key provided…") snyggt visat i
kassan — vilket bekräftar att hela kedjan (session → PaymentIntent →
Stripe-anrop → felhantering) fungerar; det enda som saknas är ett riktigt
konto.

Samma ogiltiga-nyckel-trick användes för att verifiera
kassa-resiliensen (se "Återbetalningar" nedan för själva
återbetalnings-verifieringen): ett misslyckat PaymentIntent-anrop lämnade
sessionen (kundens adress, fraktval, varukorg) orörd i
`data/checkoutSessions.json`, och "Försök igen"-knappen återanvände samma
session (ingen ny skapades) istället för att tvinga kunden tillbaka till
steg 1.

## Återbetalningar

Riktiga återbetalningar körs mot `stripe.refunds.create` — se
[`app/api/admin/orders/[id]/refund/route.ts`](app/api/admin/orders/%5Bid%5D/refund/route.ts),
knappen "Återbetala" i orderdetaljvyn i admin (klicka "Detaljer" på en
order i Beställningar-fliken).

- **Delåterbetalning** stöds — admin anger valfritt belopp upp till vad
  som återstår av ordersumman.
- **Ordning**: Stripe-anropet görs FÖRST. Lyckas det inte (redan
  återbetalad, för sent, nätverksfel) ändras INGET lokalt — ordern behåller
  sin gamla betalstatus och felet visas rakt av i admin.
- **Lager**: en återbetalning som gör ordern helt återbetald lägger
  automatiskt tillbaka lagret för alla rader. En delåterbetalning gör
  INGET automatiskt — den kopplas inte till specifika rader (för
  felkänsligt att gissa utifrån ett delbelopp), utan admin bekräftar
  manuellt vilka rader som kommit i retur i samma vy
  ([`app/api/admin/orders/[id]/restock/route.ts`](app/api/admin/orders/%5Bid%5D/restock/route.ts)).
- **Mejl**: `sendRefundConfirmationEmail` (i [`lib/email.ts`](lib/email.ts))
  skickas till kunden när återbetalningen lyckats, samma
  no-op-utan-`RESEND_API_KEY`-beteende som övriga mejl.
- **Betalmetod**: `order.paymentMethod` sätts inledningsvis generiskt till
  `"stripe"` men uppdateras av webhooken (`payment_intent.succeeded`) till
  den faktiska metoden (`"card"`, `"klarna"` osv.), hämtad via ett riktat
  `paymentIntents.retrieve(..., { expand: ["latest_charge"] })`-anrop (den
  äldre `charges`-listan finns inte kvar i den Stripe SDK-version projektet
  använder). Ingen nedbrytning per metod i statistik-dashboarden ännu —
  bara datainsamlingen är på plats.

Verifierat i den här sessionen utan ett riktigt Stripe-konto: (1)
`recordRefund`/lagerlogiken i `lib/data/orderStore.ts` och
`lib/data/productStore.ts` genom att tillfälligt simulera en lyckad
återbetalning direkt mot store-funktionerna (full återbetalning → korrekt
`paymentStatus: "refunded"` + automatisk lagerpåfyllning; delåterbetalning
→ `"partially_refunded"` + INGEN automatisk lagerpåfyllning + korrekt
manuell rad-för-rad-återläggning via restock-routen), och (2) att ett
faktiskt Stripe-fel (ogiltig nyckel) från `/refund`-routen korrekt lämnar
lokal status orörd. Själva `stripe.refunds.create`-anropet mot en riktig
betalning kunde inte verifieras utan ett Stripe-konto — testa med en liten
testorder så fort kontot finns (skapa ordern, återbetala den via
adminknappen, kontrollera i Stripe Dashboard att pengarna går tillbaka).

## Robusthet & säkerhet

- **Webhook-idempotens**: [`lib/data/webhookEventStore.ts`](lib/data/webhookEventStore.ts)
  loggar Stripes `event.id` för varje hanterad webhook-händelse
  ([`app/api/webhooks/stripe/route.ts`](app/api/webhooks/stripe/route.ts)).
  En upprepad händelse (Stripe garanterar inte exactly-once-leverans)
  returneras `{ received: true, duplicate: true }` direkt utan att köra
  logiken igen — inga dubbla bekräftelsemejl. Testat: samma signerade
  event skickat två gånger gav `paymentStatus: "paid"` exakt en gång och
  precis ett mejlförsök loggat.
- **Lagerskydd mot race conditions**: `reserveStockForItems` i
  [`lib/data/productStore.ts`](lib/data/productStore.ts) läser lagret,
  kontrollerar samtliga rader och skriver tillbaka i EN synkron funktion
  (bara synkrona `fs`-anrop, inget `await` mellan läsning och skrivning) —
  Node kör JS entrådigt, så två "samtidiga" köp av samma sista enhet kan
  aldrig interleava mitt i funktionen inom samma process. Körs innan
  Stripe kontaktas ([`app/api/checkout/payment-intent/route.ts`](app/api/checkout/payment-intent/route.ts))
  respektive innan mock-ordern slutförs
  ([`app/api/checkout/confirm/route.ts`](app/api/checkout/confirm/route.ts));
  misslyckas kontrollen avvisas köpet med ett tydligt fel (409) istället
  för att lagret går under noll. Testat med två parallella requests mot
  en produkt med exakt 1 i lager: den ena lyckades, den andra fick
  "finns tyvärr inte i tillräckligt antal längre", och slutligt lagersaldo
  blev exakt 0.
- **Server-side validering**: [`lib/validation.ts`](lib/validation.ts)
  validerar leveransuppgifter (e-postformat, obligatoriska fält,
  längdgränser, svenskt postnummerformat) i
  [`app/api/checkout/session/route.ts`](app/api/checkout/session/route.ts) —
  klientens `required`/`pattern`-attribut är bara en UX-genväg och skyddar
  inte mot direkta API-anrop. Samma route validerar även att en beställd
  färgvariant faktiskt matchar produkten, inte en godtycklig fritextsträng.
- **HTML-sanering**: [`lib/sanitize.ts`](lib/sanitize.ts) (`escapeHtml`)
  används i [`lib/email.ts`](lib/email.ts) där kundnamn/produktdata
  klistras in i rå HTML-mejlmallar (till skillnad från Reacts JSX, som
  redan escapar automatiskt) — annars skulle t.ex. ett kundnamn med
  `<img onerror=...>` injiceras rakt in i bekräftelsemejlet.
- **Rate limiting** ([`lib/rateLimit.ts`](lib/rateLimit.ts), enkel
  in-memory räknare per IP — delas inte mellan serverless-instanser,
  nollställs vid cold start, men stoppar naivt missbruk):
  - `POST /api/checkout/session`: 20 req/60 s per IP.
  - `POST /api/newsletter`: 5 req/60 s per IP.
  - `POST /api/admin/login`: spärras i 5 minuter efter 5 felaktiga
    lösenordsförsök i rad från samma IP (även ett KORREKT lösenord
    avvisas under spärren) — se `loginLockoutSecondsRemaining` i
    [`lib/adminAuth.ts`](lib/adminAuth.ts).

  Testat: 6:e nyhetsbrevsanmälan inom en minut gav 429; 6:e felaktiga
  adminlösenordsförsöket gav "För många felaktiga försök. Försök igen om
  300 sekunder." och blockerade även efterföljande korrekta lösenord.
- **Felsidor**: [`app/error.tsx`](app/error.tsx) fångar oväntade fel
  inom route-trädet (behåller header/footer/varumärke, till skillnad från
  Next.js standardfelsida); [`app/global-error.tsx`](app/global-error.tsx)
  är den yttersta reserven om själva root-layouten kraschar (måste
  definiera egen `<html>/<body>` och kan därför inte förlita sig på
  Tailwind — inline-stilar). [`components/CheckoutErrorBoundary.tsx`](components/CheckoutErrorBoundary.tsx)
  omsluter specifikt `<CheckoutFlow />` ([`app/kassa/page.tsx`](app/kassa/page.tsx))
  så ett fel i ett enskilt kassasteg inte kraschar hela sidan. Verifierat
  server-side (mer tillförlitligt än klick i förhandsgranskningsläget,
  som fick återkommande hydreringsproblem under en lång testsession): ett
  medvetet testfel i en sidas server-komponent gav status 500, och
  RSC-svaret visade att Next.js korrekt valde `app/error.tsx` som
  boundary för det route-segmentet — samma digest-hash syntes både i
  klientens svar och i serverloggen (fullständigt felmeddelande där,
  redigerat till bara ett hash-ID mot klienten, vilket är Next.js
  avsedda produktionsbeteende).
- **Säkerhetsheaders** ([`next.config.mjs`](next.config.mjs) → `headers()`):
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: strict-origin-when-cross-origin`, och en
  `Content-Security-Policy` som bara tillåter det som faktiskt behövs
  (egna domänen + `js.stripe.com`/`api.stripe.com` för Stripe Elements)
  — inga inline scripts (`'unsafe-inline'` finns bara i `style-src`, för
  de färgprickar som sätts via inline `style={{...}}`, inte i
  `script-src`). `'unsafe-eval'` läggs bara till i dev-läge (Turbopacks
  HMR kan behöva det), aldrig i produktion.
- **Intern felloggning** ([`lib/data/errorLogStore.ts`](lib/data/errorLogStore.ts)):
  fångade serverfel i webhooken och betalnings-/återbetalnings-API:erna
  skrivs till `data/errors.json` (tidsstämpel, felmeddelande, kontext).
  Ersätter INTE en riktig tjänst (Sentry m.fl., som väntar på ett nytt
  konto) — ger bara viss insyn under tiden. Visas i en ny flik i admin
  ("Felloggen", [`components/admin/ErrorLogPanel.tsx`](components/admin/ErrorLogPanel.tsx)
  + `GET /api/admin/errors`).

## Bekräftelsemejl

[`lib/email.ts`](lib/email.ts) skickar ett bekräftelsemejl via Resends
REST-API. I mockat betalläge triggas det direkt av
`app/api/checkout/confirm/route.ts`; i riktigt Stripe-läge triggas det av
webhooken (`payment_intent.succeeded`), inte av klientens redirect — se
"Stripe / betalning" ovan. Saknas `RESEND_API_KEY` loggas mejlet bara till
konsolen — checkout-flödet fungerar felfritt även utan nyckel. Lägg till
`RESEND_API_KEY` (och valfritt `RESEND_FROM_EMAIL`) för att aktivera riktiga
mejl.

## Klart vs. mockat

**Riktigt klart:** all UI och design, produktdata i JSON-fil med riktig
CRUD + lagerhantering via admin, orderhantering i admin (status,
betalstatus, sök/filtrering), varukorg (localStorage + lagerkoll mot
katalogen), filtrering/sortering, checkout-flödets steg och validering,
adminlösenord via miljövariabel med serverside-koll, nyhetsbrevs-signup med
persistent lagring, bekräftelsemejl-integration (no-op utan nyckel),
per-sida `<title>`/meta description, responsiv design, UTM-attribution
end-to-end, statistik-dashboarden med Excel-export, och **hela
Stripe Elements + Klarna-integrationen (kod och arkitektur)** — enda som
saknas för att den ska vara skarp är själva Stripe-kontot och test enligt
avsnittet "Stripe / betalning" ovan.

**Medvetet mockat tills Stripe-konto finns:** betalningen körs i simulerat
läge (se `lib/checkout.ts`/`app/api/checkout/confirm/route.ts`) tills
`STRIPE_SECRET_KEY`/`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` läggs in. Utöver
det: datalagring via JSON-filer istället för databas (fungerar lokalt,
försvinner mellan deploys på Vercel — se "Datalagring" ovan),
bekräftelsemejl skickas bara om `RESEND_API_KEY` är satt, `costPrice` är
platshållarvärden (se "Statistik / analytics" ovan).

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
- **`order.paymentMethod`** sätts till den generiska strängen `"stripe"` i
  riktigt betalläge (istället för t.ex. `"klarna"`) — kunden väljer sin
  metod inuti Payment Element efter att ordern redan skapats med
  `paymentStatus: "pending"`, så exakt metod är bara känd i Stripes eget
  dashboard, inte i vår lokala orderdata. Går att förbättra genom att läsa
  `charge.payment_method_details.type` i webhooken om det behövs senare.
- Om själva anropet till Stripes API skulle misslyckas när en PaymentIntent
  skapas (t.ex. tillfälligt nätverksfel — inte samma sak som en avvisad
  betalning, vilket hanteras normalt via `stripe.confirmPayment`), kastas
  den redan konsumerade checkout-sessionen bort och kunden får fylla i
  kassan på nytt. Ovanligt i praktiken men värt att känna till.
