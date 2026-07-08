# Garnladan — lanseringsaudit (Uppdrag 11)

Genomförd: 2026-07-08. Detta är en genomgång av allt som byggts i uppdrag 1–10,
inte ett nytt funktionsbygge. Lågriskbuggar är fixade direkt (markerade
**[ÅTGÄRDAT]** nedan); allt som rör pengar, data, juridik eller är en
designfråga listas för beslut istället för att gissas bort.

Sammanfattning: **4 blockerande**, **11 viktiga** (varav 5 redan åtgärdade),
**7 mindre** fynd. Se slutet av dokumentet för direktfixarna som redan är
gjorda, samt `npm run build`/`npm audit`-resultat.

---

## Blockerande — måste lösas innan lansering

### B1. Juridiksidorna visar ett "detta är ett utkast"-baner till riktiga kunder
`app/villkor/page.tsx`, `app/villkor/angerratt/page.tsx` och
`app/integritetspolicy/page.tsx` renderar alla ovillkorligt en ruta i stil
med:

> "Observera: det här är ett utkast till villkor och är inte juridisk
> rådgivning. Innehållet behöver granskas av en jurist eller revisor innan
> sidan publiceras i skarp drift."

`app/integritetspolicy/page.tsx` nämner dessutom ett internt placeholder-namn
("t.ex. Cedra") som läckt in i kundvänd text. Om detta går live syns
disclaimern för riktiga kunder på Villkor, Ångerrätt och Integritetspolicy.

**Förslag:** antingen (a) få innehållet juridiskt granskat och ta bort
banner + "Cedra"-referensen, eller (b) medvetet skjuta upp lanseringen av
dessa sidor tills granskning skett. Detta är ett beslut för dig, inte något
jag ska gissa mig förbi.

### B2. "30 dagars öppet köp" på kassasidan motsäger den faktiska 14-dagars ångerrätten
`app/kassa/page.tsx:19`: *"Tryggt köp med 30 dagars öppet köp och snabb
leverans från ladan."*

Ingenstans annars i koden (villkor §5, ångerrätt-sidan, bekräftelsesidan,
orderbekräftelsemejlet) finns stöd för en 30-dagars öppet köp-policy — alla
andra ställen anger konsekvent lagstadgad **14 dagars ångerrätt**. En kund
som förväntar sig kunna returnera på dag 20 baserat på kassa-texten kan bli
nekad, vilket är en konsumenträttslig risk, inte bara en skrivbugg.

**Förslag:** antingen implementera en faktisk 30-dagars öppet köp-policy
konsekvent överallt, eller ändra kassatexten till att matcha den lagstadgade
14-dagarsrätten som resten av sajten redan utgår från. Affärsbeslut, inte en
kodfix.

### B3. Ordrar kan fastna permanent som "Väntar betalning" om Stripe-webhooken aldrig kommer fram
Webhooken (`app/api/webhooks/stripe/route.ts`) är designad som enda
sanningskälla för betalstatus — en medveten och korrekt arkitekturprincip.
Men det finns ingen avstämning/reconciliation som upptäcker och rättar till
fallet där webhooken av misstag aldrig konfigureras i Stripe Dashboard,
`STRIPE_WEBHOOK_SECRET` glöms bort vid deploy, eller Stripe har tillfälliga
leveransproblem. I det läget: kundens kort debiteras hos Stripe, men ordern
i `data/orders.json` ligger kvar som `"pending"` för evigt, utan att någon
(admin eller kund) får ett tydligt tecken på att något är fel — bekräftelse-
mejl skickas aldrig, och admin ser ordern som obetald trots att pengarna
faktiskt togs.

Eftersom Stripe enligt tidigare konversation ännu inte är uppsatt i
produktion, är det HÖG risk att just detta missas vid första skarpa
deploy.

**Förslag (designfråga, inte en blind fix):** lägg till antingen (a) en
enkel admin-knapp "Synka betalstatus från Stripe" på en `pending`-order som
gör ett `stripe.paymentIntents.retrieve`-anrop och uppdaterar lokalt om
Stripe redan visar `succeeded`, eller (b) ett launch-checklist-steg som
kräver att webhooken testas end-to-end (skicka ett riktigt test-event från
Stripe Dashboard) innan `STRIPE_SECRET_KEY` sätts i produktion. Jag har
inte byggt någon av delarna eftersom det är en avvägning mellan komplexitet
och risk som du bör besluta om.

### B4. `ADMIN_PASSWORD` föll tillbaka på ett hårdkodat lösenord även i produktion **[ÅTGÄRDAT]**
`lib/adminAuth.ts` returnerade tidigare dev-lösenordet `"garn"` oavsett
`NODE_ENV` om miljövariabeln saknades — och varningen som skulle avslöja
det var (av misstag) bara påslagen UTANFÖR produktion. En glömd
miljövariabel vid en Vercel-deploy hade alltså tyst skyddat orderhistorik,
kunders PII och återbetalningsknappen med ett känt lösenord, utan att något
syntes i loggarna.

**Åtgärdat:** i produktion returnerar `getConfiguredPassword()` nu `null`
om `ADMIN_PASSWORD` saknas, vilket gör att `isCorrectPassword`/
`isValidSessionToken` alltid returnerar `false` — admininloggning är helt
avstängd (inte bara osäker) tills variabeln sätts, och ett `console.error`
loggas så det syns i Vercels runtime-loggar.

---

## Viktigt — bör lösas snart efter lansering

### V1. PUT-routen för att redigera en produkt validerade ingenting **[ÅTGÄRDAT]**
`app/api/admin/products/[id]/route.ts` anropade `updateProduct` direkt utan
någon validering, medan POST-routen (skapa produkt) hade en fullständig
kontroll. En redigering kunde alltså spara en trasig produkt (tomt
`colorways`, ett pris som blivit en sträng, negativt lagersaldo) och
förstöra checkout-flödet för just den produkten.

**Åtgärdat:** validering flyttad till en delad `validateProductInput` i
`lib/validation.ts`, använd av BÅDE POST och PUT. Passade också på att lägga
till rimliga längdgränser (namn 150, ingress 200, beskrivning 3000, övriga
korta fält 300 tecken) för att adressera uppdragets fråga om extremt långa
produktnamn/beskrivningar i UI.

### V2. Checkout-felmeddelanden visade en generisk text istället för serverns faktiska fel **[ÅTGÄRDAT]**
`lib/checkout.ts` (`createCheckoutSession`/`confirmPayment`) kastade alltid
en hårdkodad generisk text vid ett `!res.ok`-svar, och slängde bort det
specifika felmeddelandet som API-routerna faktiskt skickade (t.ex. "X (Y)
finns tyvärr inte i tillräckligt antal längre", eller ett
valideringsfel för adressen). En kund som råkade ut för slut-i-lager
mitt i kassan fick alltså ett meningslöst "Kunde inte bekräfta betalningen"
istället för den redan skrivna, hjälpsamma texten.

**Åtgärdat:** båda funktionerna läser nu `error`-fältet ur svarskroppen och
visar det om det finns, med samma generiska text som fallback.

### V3. Bekräftelsesidan pollade inte trots att koden påstod det **[ÅTGÄRDAT]**
`app/kassa/bekraftelse/BekraftelseClient.tsx` gjorde bara EN hämtning av
`/api/checkout/order-status`, trots att kommentarer i koden (både där och i
`order-status/route.ts`) beskrev det som "pollar". Om webhooken (som är
sanningskällan) tog mer än någon bråkdel av en sekund att komma fram —
fullt normalt, Stripe garanterar ingen specifik latens — såg kunden
"Vi väntar på bekräftelse" för evigt, utan att sidan någonsin uppdaterade
sig själv (kunden var tvungen att manuellt ladda om).

**Åtgärdat:** riktig polling, var 2:a sekund i upp till 60 sekunder, som
stannar direkt så fort statusen blir `paid`/`failed` eller sidan stängs.

### V4. Stripes råa felmeddelanden skickades vidare till kund och admin **[ÅTGÄRDAT]**
`app/api/checkout/payment-intent/route.ts` och
`app/api/admin/orders/[id]/refund/route.ts` returnerade `err.message` direkt
från ett misslyckat Stripe-anrop. Inte en läcka av hemligheter, men Stripes
interna felformuleringar är inte avsedda för slutanvändare och kan avslöja
implementationsdetaljer.

**Åtgärdat:** generiska svenska meddelanden ersätter nu den råa texten;
fullständigt fel finns kvar i felloggen (`logError`) för felsökning.

### V5. Concurrency-risk: två admins som redigerar samma produkt samtidigt
`components/admin/ProductForm.tsx` laddar en produkt en gång, håller hela
formuläret i lokalt state, och skickar HELA objektet vid spara — inte bara
ändrade fält. Om två admin-sessioner (t.ex. samma lösenord på två enheter)
har samma produkt öppen samtidigt och båda sparar, vinner den som sparar
sist, tyst — den förstas ändringar skrivs över utan varning eller
konfliktdetektering.

**Förslag (designfråga):** lägg till en enkel version-/`updatedAt`-koll i
`updateProduct` som avvisar ett spara-anrop om produkten ändrats sedan
formuläret laddades, med ett tydligt "någon annan har redan ändrat den här
produkten, ladda om och försök igen"-fel. Inte byggt nu eftersom det är en
avvägning mellan enkelhet (dagens beteende, "sista vinner") och robusthet
som du bör ta ställning till — särskilt eftersom det i praktiken troligen
bara är du som administrerar sajten.

### V6. Möjlig dubbel-återbetalning vid snabba parallella anrop
`app/api/admin/orders/[id]/refund/route.ts` kontrollerar `remaining` innan
`stripe.refunds.create` anropas, men gör det utan låsning. Två nästan
samtidiga POST-anrop (t.ex. dubbelklick som hinner före `disabled`-state i
UI:t, eller två öppna admin-flikar) skulle båda kunna passera
`remaining`-kontrollen innan någon hunnit skriva, och resultera i en
återbetalning som överstiger ordersumman.

**Förslag:** detta rör pengalogik direkt, så jag har inte ändrat det utan
ditt godkännande. En enkel lösning vore en kort in-memory-lås per order-id
(samma mönster som `lib/rateLimit.ts`) runt hela refund-anropet.

### V7. Platshållar-företagsuppgifter utan varningsflagga
Org.nr `559123-4567`, telefon `0521-123 45` och e-post `hej@garnladan.se`
återges som fakta i `components/Footer.tsx`, `app/villkor/page.tsx` och
`app/integritetspolicy/page.tsx`. `lib/company-info.ts` flaggar uttryckligen
returadressen som platshållare som måste bekräftas — men org.nr/telefon/
e-post har ingen sådan flagga, trots att org.nr-formatet ser ut som ett
vanligt exempelnummer. En kund som ringer `0521-123 45` eller mejlar
`hej@garnladan.se` idag når sannolikt ingenting.

**Förslag:** bekräfta att alla dessa är riktiga, registrerade värden innan
lansering.

### V8. Inkonsekvent leveranslöfte: "skickas" vs. "packas" inom 24 timmar
`components/Header.tsx`, `components/ProductDetail.tsx` lovar *"Skickas
inom 24 timmar"*, medan `app/villkor/page.tsx`,
`app/kassa/bekraftelse/BekraftelseClient.tsx` och `lib/email.ts` säger
*"Vi packar din beställning inom 24 timmar"*. Det är två olika löften
(avsänt vs. bara packat) som används om vartannat genom hela köpresan.

**Förslag:** enas om en formulering — "skickas" är ett starkare löfte än
"packas" och kan uppfattas som motsägelsefullt av en uppmärksam kund.

### V9. Stripe-konfigurationsrisk utan skyddsnät: `STRIPE_SECRET_KEY` utan `STRIPE_WEBHOOK_SECRET`
Om en framtida deploy sätter `STRIPE_SECRET_KEY` +
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (aktiverar riktiga betalningar) men
glömmer `STRIPE_WEBHOOK_SECRET`, skapas och debiteras ordrar precis som
vanligt, men webhooken svarar 400 och flippar aldrig ordern till "paid" —
samma symptom som B3 ovan, men en specifik, lätt-att-missa
konfigurationsfälla. Ingen kodbugg, men värt att ha med i en
lanserings-checklista. Se även B3 för en mer generell lösning
(reconciliation).

### V10. `xlsx`-paketet installeras utanför npm-registret och täcks inte av `npm audit`
`package.json` pekar `xlsx` mot SheetJS egen CDN
(`https://cdn.sheetjs.com/...`), eftersom SheetJS slutat publicera aktuella
versioner på npm. `package-lock.json` har den pinnad med integritetshash
(reproducerbar, inte ett rörligt mål) men `npm audit` kan inte
sårbarhetskolla den alls — dagens "0 sårbarheter" säger alltså ingenting om
`xlsx`. Används bara server-side, admin-only, för att GENERERA (inte
tolka) `.xlsx`-export, så exponeringen är låg, men värt att känna till.

### V11. Emailmallarna använde inte sajtens prisformattering **[ÅTGÄRDAT]**
`lib/email.ts` interpolerade belopp direkt (`${order.total} kr`) istället
för att gå genom `formatPrice()` som resten av sajten konsekvent använder
(`Intl.NumberFormat("sv-SE", ...)`, ger t.ex. "1 299 kr" med
tusentalsavgränsare). Ett ordervärde på fyra siffror blev alltså
"1299 kr" i mejl men "1 299 kr" överallt annars — den kommunikation som
oftast sparas/skrivs ut som kvitto.

**Åtgärdat:** alla belopp i orderbekräftelse- och återbetalningsmejlen går
nu genom `formatPrice()`.

---

## Mindre / nice-to-have

### M1. Kategorifiltret på mobil har ingen visuell skroll-indikation
`components/ProductListing.tsx` — filterpillren ("Allt garn / Ullgarn /
Bomullsgarn / …") är horisontellt scrollbara (bekräftat, fungerar
mekaniskt) på smal mobil-viewport, men den sista pillen klipps av kanten
utan någon fade/pil som visar att det finns mer att scrolla till. Ren
UX-polering.

### M2. Footer-länken "Frakt & leverans" landar på hela villkorsdokumentet
`components/Footer.tsx:32` länkar till `/villkor` (fungerar, inte en
trasig länk) men etiketten antyder en dedikerad fraktsida.Ville kanske
länka till en specifik ankare/sektion istället — en avvägning, inte en bugg.

### M3. Tagline-formulering skiljer sig mellan startsidan och headern
`app/page.tsx`: *"Rötterna i Tygladan, Vänersborg sedan 2000"* vs.
`components/Header.tsx`: *"Rötterna i Vänersborg sedan 2000"* (utan
"i Tygladan"). Litet varumärkestextavvikelse, inte en grammatikfel.

### M4. Tillgängliga paketuppdateringar (inte akuta)
`npm outdated`: `@vercel/blob` 2.5.0→2.6.0 (minor, låg risk),
`@types/node` 20→26 (endast typer, låg risk), `tailwindcss` 3→4 (major,
brytande CSS/config-ändringar, kräver egen migrering),
`typescript` 5→6 (major, kan avslöja nya typfel). Rekommenderar att skjuta
Tailwind v4 och TypeScript 6 till efter lansering; `@vercel/blob` och
`@types/node` kan tas närsomhelst som lågriskstäd.

### M5. `console.warn`/`console.error` i `lib/adminAuth.ts` loggar bara en gång per processstart
Efter denna audits fix loggas varningen/felet om saknat `ADMIN_PASSWORD`
bara en gång (för att inte spamma loggarna) — men det betyder att om
loggen roterar/rensas efter den första varningen syns den inte igen förrän
processen startar om. Marginellt, eftersom Vercel ändå visar
deploy-/build-loggar separat, men värt att känna till.

### M6. Testmetod-anmärkning: interaktiv webbläsartestning var opålitlig i den här sessionen
Efter många snabba navigeringar i förhandsgranskningsfliken slutade
klickinteraktioner (t.ex. "Öka antal", "Lägg i varukorgen") att uppdatera
synligt state — även efter en helt färsk omstart av dev-servern, och även
för en trivial `setState`-uppdatering utan nätverk/localStorage inblandat.
Det matchar exakt ett tidigare dokumenterat mönster i det här projektet
(uppdrag 10) där webbläsarflikens hydrering gick sönder tab-brett efter
~20+ snabba navigeringar/omstarter — en känd verktygsbegränsning i den här
miljön, inte ett kodfel. Koden för `addItem`/`useCart`/`ProductDetail`
granskades manuellt och ser korrekt ut. **Rekommendation:** gör ett snabbt
manuellt handpåläggningstest av "lägg i varukorg" → kassa-flödet i en
riktig webbläsare (inte förhandsgranskningsverktyget) innan lansering, som
en sista, oberoende bekräftelse.

### M7. Kontrast och alt-text — inga fynd (kontrollerat, redovisas för fullständighet)
WCAG-kontrastberäkning för samtliga huvudsakliga textfärg/bakgrundspar i
den varma paletten (t.ex. `mull` på `linne` 6.6:1, `mull` på `krita` 7.3:1,
`kol` på `linne` 13.6:1, `tegel` på `krita` 5.1:1) klarar alla WCAG AA
(4.5:1) för normal text. Alt-texter på produktbilder är korrekt ifyllda
(`alt={product.name}`), och galleri-miniatyrer som korrekt använder
`alt=""` gör det för att deras omslutande knapp redan har en beskrivande
`aria-label` (rätt mönster, inte en brist).

---

## Direktfixar gjorda i denna audit (lågrisk, ingen designfråga)

1. **B4** — `ADMIN_PASSWORD` kan inte längre falla tillbaka på ett
   hårdkodat lösenord i produktion (`lib/adminAuth.ts`, `app/api/admin/login/route.ts`).
2. **V1** — Delad produktvalidering (med längdgränser) används nu av både
   skapa- och redigera-routen (`lib/validation.ts`,
   `app/api/admin/products/route.ts`, `app/api/admin/products/[id]/route.ts`).
3. **V2** — Checkout-klientfunktioner visar nu serverns specifika
   felmeddelande istället för en generisk text (`lib/checkout.ts`).
4. **V3** — Bekräftelsesidan pollar nu på riktigt istället för en enda
   hämtning (`app/kassa/bekraftelse/BekraftelseClient.tsx`).
5. **V4** — Stripes råa felmeddelanden visas inte längre för kund/admin
   (`app/api/checkout/payment-intent/route.ts`,
   `app/api/admin/orders/[id]/refund/route.ts`).
6. **V11** — E-postmallar använder nu `formatPrice()` konsekvent
   (`lib/email.ts`).
7. Städat bort ett osynligt mjukt bindestrecks-tecken (U+00AD) inuti
   "Demoläge" i `components/CheckoutFlow.tsx` (kosmetiskt textfel).

## Slutverifiering

- `npm run build`: se nedan (körs efter denna fil skrivs).
- `npm audit`: 0 sårbarheter, oförändrat.
- `npx tsc --noEmit`: rent efter samtliga direktfixar.
- Riktigt backup/återställningstest genomfört (inte bara nedladdning):
  tog en zip av `data/*.json`, flyttade bort hela `data/`-katalogen
  (simulerad total dataförlust), packade upp zip:en till en ny `data/`,
  och bekräftade byte-för-byte-identiskt innehåll mot originalet samt att
  sajten (startsida, `/api/products`, admin-inloggning, orderlista) fungerar
  identiskt mot den återställda datan.
