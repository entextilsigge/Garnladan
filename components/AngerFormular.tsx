"use client";

// Ifyllbar ångerblankett, byggd efter Konsumentverkets standardformulär för
// utövande av ångerrätt (se t.ex. konsumentverket.se) — men inbyggd som en
// egen sida istället för en länk till en tredjepartssida som kan flytta
// eller brytas. Skickas inte till någon server: kunden skriver ut den
// (eller sparar som PDF via webbläsarens utskriftsfunktion) eller mejlar
// den ifyllda texten direkt till oss.

import { useState } from "react";
import { COMPANY_INFO, formatReturAddress } from "@/lib/company-info";

const EMPTY = {
  orderId: "",
  orderedDate: "",
  receivedDate: "",
  name: "",
  address: "",
  email: "",
  date: "",
};

export default function AngerFormular() {
  const [fields, setFields] = useState(EMPTY);

  function update<K extends keyof typeof EMPTY>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function mailtoBody(): string {
    return encodeURIComponent(
      `Till ${formatReturAddress()} (${COMPANY_INFO.email})\n\n` +
        `Jag/vi meddelar härmed att jag/vi frånträder mitt/vårt köpeavtal av följande varor:\n` +
        `Ordernummer: ${fields.orderId || "(fyll i)"}\n\n` +
        `Beställdes den: ${fields.orderedDate || "(fyll i)"}\n` +
        `Mottogs den: ${fields.receivedDate || "(fyll i)"}\n\n` +
        `Konsumentens namn: ${fields.name || "(fyll i)"}\n` +
        `Konsumentens adress: ${fields.address || "(fyll i)"}\n` +
        `Konsumentens e-post: ${fields.email || "(fyll i)"}\n\n` +
        `Datum: ${fields.date || "(fyll i)"}`
    );
  }

  const inputClass =
    "w-full rounded-xl border border-kol/15 bg-white px-4 py-2.5 text-sm text-kol placeholder:text-mull/50 focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25 print:border-kol/40 print:bg-transparent";

  return (
    <div
      data-print-form
      className="mt-6 rounded-3xl bg-white/70 p-6 shadow-mjuk ring-1 ring-kol/5 sm:p-8 print:rounded-none print:bg-transparent print:p-0 print:shadow-none print:ring-0"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mull">
        Ångerblankett
      </p>
      <p className="mt-2 text-sm leading-relaxed text-mull">
        Fyll i och skicka detta formulär endast om du vill frånträda avtalet.
      </p>

      <div className="mt-5 space-y-4 text-sm text-kol">
        <p>
          <strong>Till:</strong> {formatReturAddress()}, {COMPANY_INFO.email}
        </p>
        <p>
          Jag/vi meddelar härmed att jag/vi frånträder mitt/vårt köpeavtal
          av följande varor:
        </p>

        <div>
          <label htmlFor="orderId" className="mb-1.5 block font-medium">
            Ordernummer
          </label>
          <input
            id="orderId"
            value={fields.orderId}
            onChange={(e) => update("orderId", e.target.value)}
            placeholder="GL-123456"
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="orderedDate" className="mb-1.5 block font-medium">
              Beställdes den
            </label>
            <input
              id="orderedDate"
              type="date"
              value={fields.orderedDate}
              onChange={(e) => update("orderedDate", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="receivedDate" className="mb-1.5 block font-medium">
              Mottogs den
            </label>
            <input
              id="receivedDate"
              type="date"
              value={fields.receivedDate}
              onChange={(e) => update("receivedDate", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="name" className="mb-1.5 block font-medium">
            Konsumentens namn
          </label>
          <input
            id="name"
            value={fields.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="address" className="mb-1.5 block font-medium">
            Konsumentens adress
          </label>
          <input
            id="address"
            value={fields.address}
            onChange={(e) => update("address", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block font-medium">
            Konsumentens e-post
          </label>
          <input
            id="email"
            type="email"
            value={fields.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="mb-1.5 block font-medium">
              Datum
            </label>
            <input
              id="date"
              type="date"
              value={fields.date}
              onChange={(e) => update("date", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col justify-end">
            <p className="mb-1.5 font-medium">Underskrift</p>
            <div className="h-[42px] rounded-xl border border-dashed border-kol/25" />
          </div>
        </div>
      </div>

      <div data-print-hide className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-tegel px-6 py-3 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark"
        >
          Skriv ut / spara som PDF
        </button>
        <a
          href={`mailto:hej@garnladan.se?subject=${encodeURIComponent(
            `Ångerrätt — order ${fields.orderId || ""}`
          )}&body=${mailtoBody()}`}
          className="rounded-full border border-kol/15 px-6 py-3 text-center text-sm font-medium text-kol transition-colors hover:bg-linne"
        >
          Skicka ifylld blankett via e-post
        </a>
      </div>
    </div>
  );
}
