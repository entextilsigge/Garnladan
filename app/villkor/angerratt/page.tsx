import type { Metadata } from "next";
import Link from "next/link";
import AngerFormular from "@/components/AngerFormular";
import { COMPANY_INFO } from "@/lib/company-info";

export const metadata: Metadata = {
  title: "Ångerrätt",
  description:
    "Så fungerar din 14 dagars ångerrätt hos Garnladan — och en ifyllbar ångerblankett.",
};

export default function AngerrattPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tegel">
        Juridiskt
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold text-kol">
        Ångerrätt
      </h1>
      <p className="mt-4 text-mull">
        Handlar du som privatperson (konsument) har du enligt
        distansavtalslagen rätt att ångra ditt köp — utan att behöva ange
        något skäl.
      </p>

      <div
        data-print-hide
        className="mt-10 rounded-2xl bg-senap/10 px-6 py-5 text-sm text-kol"
      >
        <strong className="font-semibold">Observera:</strong> det här är ett
        utkast till villkorstext och är inte juridisk rådgivning. Innehållet
        behöver granskas av en jurist eller revisor innan sidan publiceras
        i skarp drift.
      </div>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Ångerfrist: 14 dagar
        </h2>
        <p className="text-mull leading-relaxed">
          Ångerfristen är 14 dagar och räknas från den dag du (eller ett
          ombud du utsett) tog emot varan. Består beställningen av flera
          varor som levereras separat räknas fristen från den dag du tog
          emot den sista varan.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Hur anmäler du ånger?
        </h2>
        <p className="text-mull leading-relaxed">
          Meddela oss innan ångerfristen har löpt ut genom att skicka den
          ifyllda blanketten längre ner på den här sidan till{" "}
          <a href="mailto:hej@garnladan.se" className="text-tegel underline underline-offset-2">
            hej@garnladan.se
          </a>
          , eller skriv till oss på egen hand med ordernummer och att du
          ångrar köpet. Skicka därefter tillbaka varan så snart som möjligt,
          och senast inom 14 dagar från det att du meddelat oss.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Vem betalar returfrakten?
        </h2>
        <p className="text-mull leading-relaxed">
          Du står själv för returfrakten och ansvarar för varans skick
          under returtransporten. Vi rekommenderar spårbar frakt. Skicka
          returen till:
        </p>
        <p className="text-mull leading-relaxed">
          {COMPANY_INFO.name}
          <br />
          {COMPANY_INFO.returAddress.street}
          <br />
          {COMPANY_INFO.returAddress.postalCode} {COMPANY_INFO.returAddress.city}
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Återbetalning
        </h2>
        <p className="text-mull leading-relaxed">
          När vi har tagit emot varan (eller ett bevis på att den skickats
          tillbaka) betalar vi tillbaka vad du betalat för varan, inklusive
          ursprunglig standardfraktkostnad, inom 14 dagar. Återbetalningen
          sker till samma betalningsmetod du använde vid köpet, t.ex.
          tillbaka till ditt kort eller via Klarna.
        </p>
        <p className="text-mull leading-relaxed">
          Har du valt ett dyrare leveranssätt än vårt standardalternativ
          återbetalas bara motsvarande kostnaden för standardleverans.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Varans skick
        </h2>
        <p className="text-mull leading-relaxed">
          Du får undersöka varan för att avgöra dess art och egenskaper,
          ungefär som du hade kunnat göra i en fysisk butik. Är varan
          använd eller skadad utöver vad som krävs för att prova den kan
          vi göra avdrag på återbetalningen som motsvarar värdeminskningen.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-kol">
          Undantag från ångerrätten
        </h2>
        <p className="text-mull leading-relaxed">
          Garn som klippts till specialmått eller på annat sätt anpassats
          särskilt för dig omfattas normalt inte av ångerrätten, eftersom
          varan då är tillverkad enligt dina specifikationer.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-kol">
          Ångerblankett
        </h2>
        <p className="mt-2 text-mull leading-relaxed">
          Du behöver inte använda den här blanketten, men den gör det
          enklare för oss att hantera din ånger snabbt.
        </p>
        <AngerFormular />
      </section>

      <p data-print-hide className="mt-10 text-sm text-mull">
        Läs även våra{" "}
        <Link href="/villkor" className="text-tegel underline underline-offset-2">
          allmänna villkor
        </Link>{" "}
        och vår{" "}
        <Link href="/integritetspolicy" className="text-tegel underline underline-offset-2">
          integritetspolicy
        </Link>
        .
      </p>
    </div>
  );
}
