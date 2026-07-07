import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Integritetspolicy",
  description: "Hur Garnladan samlar in, använder och skyddar dina personuppgifter.",
  alternates: { canonical: "/integritetspolicy" },
};

export default function IntegritetspolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tegel">
        Juridiskt
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold text-kol">
        Integritetspolicy
      </h1>
      <p className="mt-4 text-mull">
        Den här sidan förklarar vilka personuppgifter Garnladan AB
        (org.nr 559123-4567, Vargön) samlar in när du handlar eller
        besöker vår sajt, varför, hur länge, och vilka rättigheter du har.
      </p>

      <div className="mt-10 rounded-2xl bg-senap/10 px-6 py-5 text-sm text-kol">
        <strong className="font-semibold">Observera:</strong> det här är ett
        förslag/utkast till integritetspolicy och är inte juridisk
        rådgivning. Innehållet behöver granskas av en jurist eller revisor
        (t.ex. Cedra) innan det publiceras i skarp drift.
      </div>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Vilka uppgifter samlar vi in?
        </h2>
        <ul className="ml-5 list-disc space-y-1.5 text-mull marker:text-tegel">
          <li>Namn (förnamn, efternamn)</li>
          <li>E-postadress</li>
          <li>Leveransadress, postnummer och ort</li>
          <li>
            Betalningsuppgifter — hanteras direkt av vår betalleverantör
            Stripe. Vi lagrar inte fullständiga kort- eller
            kontouppgifter själva, bara ordern och dess betalstatus.
          </li>
          <li>
            UTM/attribution-cookie — vilken kampanj, källa och kanal du
            eventuellt kom till oss ifrån (t.ex. ett Instagram-inlägg eller
            nyhetsbrev). Detta är en icke-nödvändig cookie och sätts bara
            om du samtyckt till det, se avsnittet om cookies nedan.
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Varför samlar vi in det?
        </h2>
        <ul className="ml-5 list-disc space-y-1.5 text-mull marker:text-tegel">
          <li>Namn, e-post och adress: för att kunna leverera din beställning och skicka orderbekräftelse.</li>
          <li>Betalningsuppgifter (via Stripe): för att kunna ta betalt för din beställning.</li>
          <li>UTM/attribution-cookie: för att förstå vilka marknadsföringskanaler som fungerar. Detta påverkar inte hur din beställning hanteras.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Hur länge sparar vi uppgifterna?
        </h2>
        <p className="text-mull leading-relaxed">
          Orderuppgifter (namn, adress, e-post, köphistorik) sparas så
          länge det krävs enligt bokföringslagen — normalt sju år efter
          räkenskapsårets utgång. UTM/attribution-cookien sparas i högst
          30 dagar.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Delar vi uppgifter med tredje part?
        </h2>
        <p className="text-mull leading-relaxed">
          Ja, med de leverantörer vi behöver för att driva butiken:
        </p>
        <ul className="ml-5 list-disc space-y-1.5 text-mull marker:text-tegel">
          <li>
            <strong className="font-semibold text-kol">Stripe</strong> —
            hanterar kort- och Klarna-betalningar. Stripe tar emot de
            uppgifter som krävs för att genomföra betalningen.
          </li>
          <li>
            <strong className="font-semibold text-kol">Resend</strong> (e-posttjänst) —
            skickar orderbekräftelser å våra vägnar och tar därför emot din
            e-postadress och orderinnehåll.
          </li>
        </ul>
        <p className="text-mull leading-relaxed">
          Vi säljer aldrig dina personuppgifter till tredje part.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Cookies
        </h2>
        <p className="text-mull leading-relaxed">
          Vi delar in cookies i två grupper:
        </p>
        <ul className="ml-5 list-disc space-y-2 text-mull marker:text-tegel">
          <li>
            <strong className="font-semibold text-kol">Nödvändiga cookies</strong> —
            håller reda på innehållet i din varukorg och din session i
            kassan. Utan dessa fungerar inte grundläggande funktioner som
            att lägga varor i varukorgen eller genomföra ett köp. De
            klassas som strikt nödvändiga enligt lag och kräver därför
            inte samtycke.
          </li>
          <li>
            <strong className="font-semibold text-kol">
              Icke-nödvändiga cookies (marknadsföring/attribution)
            </strong>{" "}
            — en UTM-cookie som kommer ihåg vilken kampanj eller källa du
            kom från. Den är inte nödvändig för att sajten eller ditt köp
            ska fungera, och sätts därför bara om du aktivt godkänt det i
            cookie-bannern. Tackar du nej sätts ingen sådan cookie, och
            eventuella tillfälligt mellanlagrade uppgifter raderas.
          </li>
        </ul>
        <p className="text-mull leading-relaxed">
          Du kan när som helst ändra ditt val genom att rensa
          webbläsarens lokala data för sajten, vilket visar
          cookie-bannern igen vid nästa besök.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Dina rättigheter
        </h2>
        <p className="text-mull leading-relaxed">
          Enligt GDPR har du rätt att:
        </p>
        <ul className="ml-5 list-disc space-y-1.5 text-mull marker:text-tegel">
          <li>Få ett utdrag av vilka uppgifter vi har om dig (registerutdrag)</li>
          <li>Få felaktiga uppgifter rättade</li>
          <li>Begära radering av dina uppgifter, i den mån vi inte är skyldiga att spara dem (t.ex. enligt bokföringslagen)</li>
          <li>Invända mot behandling som bygger på ditt samtycke, t.ex. attribution-cookien</li>
        </ul>
        <p className="text-mull leading-relaxed">
          Kontakta oss på{" "}
          <a href="mailto:hej@garnladan.se" className="text-tegel underline underline-offset-2">
            hej@garnladan.se
          </a>{" "}
          för att utöva någon av dessa rättigheter. Du har även rätt att
          klaga till Integritetsskyddsmyndigheten (IMY) om du anser att vi
          behandlar dina uppgifter felaktigt.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Personuppgiftsansvarig
        </h2>
        <p className="text-mull leading-relaxed">
          Garnladan AB, Vargön · hej@garnladan.se · 0521-123 45 · Org.nr
          559123-4567 är personuppgiftsansvarig för behandlingen som
          beskrivs här.
        </p>
      </section>

      <p className="mt-10 text-sm text-mull">
        Läs även våra{" "}
        <Link href="/villkor" className="text-tegel underline underline-offset-2">
          allmänna villkor
        </Link>{" "}
        och information om{" "}
        <Link href="/villkor/angerratt" className="text-tegel underline underline-offset-2">
          ångerrätt
        </Link>
        .
      </p>
    </div>
  );
}
