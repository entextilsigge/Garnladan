import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Allmänna villkor",
  description: "Köpvillkor för Garnladan: leverans, betalning, reklamationsrätt och tvistlösning.",
  alternates: { canonical: "/villkor" },
};

export default function VillkorPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tegel">
        Juridiskt
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold text-kol">
        Allmänna villkor
      </h1>
      <p className="mt-4 text-mull">
        Dessa villkor gäller när du handlar hos Garnladan AB (org.nr
        559123-4567), Vargön. Genom att slutföra ett köp godkänner du
        villkoren nedan.
      </p>

      <div className="mt-10 rounded-2xl bg-senap/10 px-6 py-5 text-sm text-kol">
        <strong className="font-semibold">Observera:</strong> det här är ett
        utkast till villkor och är inte juridisk rådgivning. Innehållet
        behöver granskas av en jurist eller revisor innan sidan publiceras
        i skarp drift.
      </div>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">1. Priser och moms</h2>
        <p className="text-mull leading-relaxed">
          Alla priser i butiken anges i svenska kronor (SEK) och inkluderar
          svensk moms (25%). Momsbeloppet specificeras separat i
          orderbekräftelsen och kvittot.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">2. Betalning</h2>
        <p className="text-mull leading-relaxed">
          Betalning sker i kassan via kort eller Klarna, genom vår
          betalleverantör Stripe. Beloppet dras (eller Klarna-fakturan
          skapas) i samband med att beställningen läggs. Vi lagrar aldrig
          dina fullständiga kortuppgifter själva — det sköts av Stripe.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">3. Leverans</h2>
        <p className="text-mull leading-relaxed">
          Vi packar din beställning inom 24 timmar. Beräknad leveranstid
          beror på valt leveranssätt:
        </p>
        <ul className="ml-5 list-disc space-y-1.5 text-mull marker:text-tegel">
          <li>PostNord — ombud: 1–3 vardagar efter att paketet lämnat oss.</li>
          <li>Hemleverans: 1–2 vardagar efter att paketet lämnat oss.</li>
          <li>Hämta i Vargön: klart för avhämtning inom 2 timmar.</li>
        </ul>
        <p className="text-mull leading-relaxed">
          Om leveransen blir väsentligt försenad utan att vi meddelat dig i
          förväg har du rätt att kontakta oss på{" "}
          <a href="mailto:hej@garnladan.se" className="text-tegel underline underline-offset-2">
            hej@garnladan.se
          </a>{" "}
          och, om förseningen är väsentlig, häva köpet enligt
          konsumentköplagen.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          4. Reklamationsrätt
        </h2>
        <p className="text-mull leading-relaxed">
          Enligt konsumentköplagen har du som konsument tre års
          reklamationsrätt på varor som är felaktiga vid leverans
          (ursprungliga fel). Kontakta oss på{" "}
          <a href="mailto:hej@garnladan.se" className="text-tegel underline underline-offset-2">
            hej@garnladan.se
          </a>{" "}
          med ordernummer och en beskrivning av felet. Vid en godkänd
          reklamation står vi för returfrakten och du får varan reparerad,
          ersatt eller pengarna tillbaka.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          5. Ångerrätt
        </h2>
        <p className="text-mull leading-relaxed">
          Som konsument har du enligt distansavtalslagen 14 dagars
          ångerrätt från det att du (eller ett ombud du utsett) tagit emot
          varan. Fullständig information om hur du anmäler ånger, vem som
          står för returfrakten och hur återbetalning går till finns på vår{" "}
          <Link href="/villkor/angerratt" className="text-tegel underline underline-offset-2">
            sida om ångerrätt
          </Link>
          , inklusive en ifyllbar ångerblankett.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          6. Ägarförbehåll
        </h2>
        <p className="text-mull leading-relaxed">
          Varan förblir Garnladan AB:s egendom fram till dess att den
          fullständigt betalats (t.ex. vid delbetalning via Klarna).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          7. Personuppgifter
        </h2>
        <p className="text-mull leading-relaxed">
          Vi behandlar dina personuppgifter för att kunna hantera din
          beställning. Läs mer om vilka uppgifter vi samlar in, varför och
          hur länge i vår{" "}
          <Link href="/integritetspolicy" className="text-tegel underline underline-offset-2">
            integritetspolicy
          </Link>
          .
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          8. Om vi inte kan komma överens
        </h2>
        <p className="text-mull leading-relaxed">
          Kontakta oss alltid först på{" "}
          <a href="mailto:hej@garnladan.se" className="text-tegel underline underline-offset-2">
            hej@garnladan.se
          </a>{" "}
          — de flesta ärenden löser vi direkt. Går det inte att lösa
          tvisten kan du vända dig till Allmänna reklamationsnämnden (ARN),
          Box 174, 101 23 Stockholm,{" "}
          <a
            href="https://www.arn.se"
            target="_blank"
            rel="noopener noreferrer"
            className="text-tegel underline underline-offset-2"
          >
            arn.se
          </a>
          , eller EU-kommissionens plattform för tvistlösning online på{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-tegel underline underline-offset-2"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          9. Ändringar
        </h2>
        <p className="text-mull leading-relaxed">
          Vi kan uppdatera dessa villkor. Den version som gällde när du
          lade din beställning är den som tillämpas på det köpet.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          10. Kontakt
        </h2>
        <p className="text-mull leading-relaxed">
          Garnladan AB, Vargön · hej@garnladan.se · 0521-123 45 · Org.nr
          559123-4567
        </p>
      </section>
    </div>
  );
}
