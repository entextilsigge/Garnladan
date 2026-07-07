"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readConsent, saveConsent } from "@/lib/consent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [marketingChecked, setMarketingChecked] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  function decide(marketing: boolean) {
    saveConsent(marketing);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie-inställningar"
      aria-modal="false"
      data-print-hide
      className="fixed inset-x-0 bottom-0 z-[60] animate-fade-up px-4 pb-4 sm:px-6"
    >
      <div className="mx-auto max-w-3xl rounded-3xl bg-kol p-6 text-krita shadow-lyft ring-1 ring-krita/10 sm:p-7">
        <p className="text-sm leading-relaxed text-krita/85">
          Vi använder cookies. Nödvändiga cookies (t.ex. varukorg och
          kassans sessionshantering) sätts alltid eftersom sajten inte
          fungerar utan dem. Icke-nödvändiga cookies (marknadsförings- och
          attributionsstatistik) sätts bara om du godkänner det. Läs mer i{" "}
          <Link href="/integritetspolicy" className="underline underline-offset-2 hover:text-senap">
            vår integritetspolicy
          </Link>
          .
        </p>

        {customizing && (
          <div className="mt-4 space-y-3 rounded-2xl bg-krita/[0.06] p-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked
                disabled
                className="mt-0.5 h-4 w-4 accent-senap"
              />
              <span>
                <span className="block font-semibold">Nödvändiga cookies</span>
                <span className="block text-xs text-krita/60">
                  Varukorg och kassa. Kan inte stängas av.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={marketingChecked}
                onChange={(e) => setMarketingChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-senap"
              />
              <span>
                <span className="block font-semibold">
                  Marknadsföring &amp; attribution
                </span>
                <span className="block text-xs text-krita/60">
                  UTM-cookie som kommer ihåg vilken kampanj/källa du kom
                  ifrån, så vi kan se vad som fungerar.
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          {!customizing ? (
            <>
              <button
                type="button"
                onClick={() => decide(true)}
                className="rounded-full bg-senap px-6 py-3 text-sm font-semibold text-kol transition-colors hover:bg-senap-dark sm:order-3"
              >
                Acceptera alla
              </button>
              <button
                type="button"
                onClick={() => decide(false)}
                className="rounded-full border border-krita/25 px-6 py-3 text-sm font-medium text-krita transition-colors hover:bg-krita/10 sm:order-2"
              >
                Endast nödvändiga
              </button>
              <button
                type="button"
                onClick={() => setCustomizing(true)}
                className="rounded-full px-6 py-3 text-sm font-medium text-krita/70 underline underline-offset-2 hover:text-krita sm:order-1"
              >
                Anpassa
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => decide(marketingChecked)}
              className="rounded-full bg-senap px-6 py-3 text-sm font-semibold text-kol transition-colors hover:bg-senap-dark"
            >
              Spara val
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
