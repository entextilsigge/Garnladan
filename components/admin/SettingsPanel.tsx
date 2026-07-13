"use client";

import { useEffect, useState } from "react";
import type { ShippingSettings } from "@/lib/checkout";

interface FraktjaktBalanceEstimate {
  estimatedBalance: number | null;
  threshold: number;
  lastTopupAmount: number;
  lastTopupAt: string | null;
  lowBalance: boolean;
}

export default function SettingsPanel({
  initialSettings,
  fraktjaktConfigured,
}: {
  initialSettings: ShippingSettings;
  fraktjaktConfigured: boolean;
}) {
  const [settings, setSettings] = useState<ShippingSettings>(initialSettings);
  const [draft, setDraft] = useState<ShippingSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  // Uppskattat Fraktjakt-saldo just nu (tillägg till uppdrag 15) — hämtas
  // vid inladdning och på nytt efter varje lyckad sparning, så admin ser
  // direkt hur en ny tröskel/påfyllning slår igenom.
  const [balance, setBalance] = useState<FraktjaktBalanceEstimate | null>(null);
  useEffect(() => {
    if (!fraktjaktConfigured) return;
    let cancelled = false;
    fetch("/api/admin/fraktjakt-balance")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setBalance(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fraktjaktConfigured, settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Kunde inte spara inställningarna.");
        return;
      }
      setSettings(data);
      setDraft(data);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl bg-senap/10 px-5 py-4 text-sm text-kol">
          Priserna nedan är enkla, fasta flat rate-priser som du sätter
          själv — oberoende av Fraktjakt-integrationen nedan, som bara
          bokar och skriver ut fraktsedlar (inte prissättningen i kassan).
        </div>

        <div className="rounded-3xl bg-white/70 p-6 shadow-mjuk ring-1 ring-kol/5 sm:p-8">
          <h2 className="font-display text-xl font-bold text-kol">
            Fraktpriser (flat rate)
          </h2>
          <p className="mt-1 text-sm text-mull">
            Fasta priser i kr, oavsett vikt eller destination. &quot;Hämta i
            Vargön&quot; är alltid gratis.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ombudPrice" className="mb-1.5 block text-sm font-medium text-kol">
                PostNord — ombud (kr)
              </label>
              <input
                id="ombudPrice"
                type="number"
                min={0}
                step={1}
                value={draft.ombudPrice}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, ombudPrice: Number(e.target.value) }))
                }
                className="w-full rounded-xl border border-kol/15 bg-white px-4 py-2.5 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
              />
            </div>
            <div>
              <label htmlFor="hemPrice" className="mb-1.5 block text-sm font-medium text-kol">
                Hemleverans (kr)
              </label>
              <input
                id="hemPrice"
                type="number"
                min={0}
                step={1}
                value={draft.hemPrice}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, hemPrice: Number(e.target.value) }))
                }
                className="w-full rounded-xl border border-kol/15 bg-white px-4 py-2.5 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white/70 p-6 shadow-mjuk ring-1 ring-kol/5 sm:p-8">
          <h2 className="font-display text-xl font-bold text-kol">Fri frakt</h2>
          <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-kol">
            <input
              type="checkbox"
              checked={draft.freeShippingEnabled}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, freeShippingEnabled: e.target.checked }))
              }
              className="h-4 w-4 accent-tegel"
            />
            Erbjud fri frakt över en viss ordersumma
          </label>
          <div className="mt-4">
            <label htmlFor="freeShippingThreshold" className="mb-1.5 block text-sm font-medium text-kol">
              Gräns för fri frakt (kr)
            </label>
            <input
              id="freeShippingThreshold"
              type="number"
              min={0}
              step={1}
              disabled={!draft.freeShippingEnabled}
              value={draft.freeShippingThreshold}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, freeShippingThreshold: Number(e.target.value) }))
              }
              className="w-full max-w-xs rounded-xl border border-kol/15 bg-white px-4 py-2.5 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white/70 p-6 shadow-mjuk ring-1 ring-kol/5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-kol">Fraktjakt</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                fraktjaktConfigured ? "bg-gran/10 text-gran" : "bg-tegel/10 text-tegel-dark"
              }`}
            >
              {fraktjaktConfigured ? "Konfigurerat på servern" : "Ej konfigurerat"}
            </span>
          </div>
          <p className="mt-1 text-sm text-mull">
            Bokar fraktsedlar och hämtar spårningsnummer automatiskt från
            orderdetaljvyn (&quot;Skapa fraktsedel&quot;). Kräver
            FRAKTJAKT_CONSIGNOR_ID/FRAKTJAKT_CONSIGNOR_KEY som
            miljövariabler (se README) samt att respektive
            shipping_product_id fylls i nedan — hämtas genom att öppna{" "}
            <code className="rounded bg-linne px-1 py-0.5 text-xs">
              https://api.fraktjakt.se/shipping_products/xml_list
            </code>{" "}
            med ditt Consignor-id/nyckel och leta upp PostNords tjänster.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fraktjaktOmbud" className="mb-1.5 block text-sm font-medium text-kol">
                shipping_product_id — PostNord ombud
              </label>
              <input
                id="fraktjaktOmbud"
                type="number"
                min={1}
                placeholder="Ej ifyllt"
                value={draft.fraktjaktOmbudProductId ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    fraktjaktOmbudProductId: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
                className="w-full rounded-xl border border-kol/15 bg-white px-4 py-2.5 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
              />
            </div>
            <div>
              <label htmlFor="fraktjaktHem" className="mb-1.5 block text-sm font-medium text-kol">
                shipping_product_id — PostNord hemleverans
              </label>
              <input
                id="fraktjaktHem"
                type="number"
                min={1}
                placeholder="Ej ifyllt"
                value={draft.fraktjaktHemProductId ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    fraktjaktHemProductId: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
                className="w-full rounded-xl border border-kol/15 bg-white px-4 py-2.5 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
              />
            </div>
          </div>

          <div className="mt-6 border-t border-kol/10 pt-5">
            <h3 className="text-sm font-semibold text-kol">Saldovarning</h3>
            <p className="mt-1 text-xs text-mull">
              Fraktjakt exponerar inget kontosaldo via API:et — det här är en
              egen uppskattning (senast påfyllt belopp minus loggade
              fraktsedlars schablonkostnad sedan dess), inte Fraktjakts
              faktiska saldo.
            </p>

            {fraktjaktConfigured && (
              <p className="mt-3 text-sm text-kol">
                Uppskattat saldo just nu:{" "}
                {balance === null ? (
                  <span className="text-mull">hämtar…</span>
                ) : balance.estimatedBalance === null ? (
                  <span className="text-mull">
                    okänt — sätt &quot;senast påfyllt till&quot; nedan för att börja räkna.
                  </span>
                ) : (
                  <span className={balance.lowBalance ? "font-semibold text-tegel-dark" : "font-semibold text-gran"}>
                    {Math.round(balance.estimatedBalance)} kr
                  </span>
                )}
              </p>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="fraktjaktBalanceThreshold" className="mb-1.5 block text-sm font-medium text-kol">
                  Varningströskel (kr)
                </label>
                <input
                  id="fraktjaktBalanceThreshold"
                  type="number"
                  min={0}
                  step={50}
                  value={draft.fraktjaktBalanceThreshold}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, fraktjaktBalanceThreshold: Number(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-kol/15 bg-white px-4 py-2.5 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
                />
              </div>
              <div>
                <label htmlFor="fraktjaktLastTopupAmount" className="mb-1.5 block text-sm font-medium text-kol">
                  Senast påfyllt till (kr)
                </label>
                <input
                  id="fraktjaktLastTopupAmount"
                  type="number"
                  min={0}
                  step={100}
                  value={draft.fraktjaktLastTopupAmount}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, fraktjaktLastTopupAmount: Number(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-kol/15 bg-white px-4 py-2.5 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
                />
                <p className="mt-1 text-xs text-mull">
                  Uppdatera efter varje påfyllning i Fraktjakt — datumet
                  sparas automatiskt.
                  {draft.fraktjaktLastTopupAt && (
                    <>
                      {" "}
                      Senast satt{" "}
                      {new Date(draft.fraktjaktLastTopupAt).toLocaleString("sv-SE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      .
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="fraktjaktEstimatedCostOmbud" className="mb-1.5 block text-sm font-medium text-kol">
                  Uppskattad kostnad — ombud (kr)
                </label>
                <input
                  id="fraktjaktEstimatedCostOmbud"
                  type="number"
                  min={0}
                  step={1}
                  value={draft.fraktjaktEstimatedCostOmbud}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, fraktjaktEstimatedCostOmbud: Number(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-kol/15 bg-white px-4 py-2.5 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
                />
              </div>
              <div>
                <label htmlFor="fraktjaktEstimatedCostHem" className="mb-1.5 block text-sm font-medium text-kol">
                  Uppskattad kostnad — hemleverans (kr)
                </label>
                <input
                  id="fraktjaktEstimatedCostHem"
                  type="number"
                  min={0}
                  step={1}
                  value={draft.fraktjaktEstimatedCostHem}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, fraktjaktEstimatedCostHem: Number(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-kol/15 bg-white px-4 py-2.5 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-mull">
              Schablonvärden — INTE Fraktjakts faktiska pris (går inte att
              hämta via API:et), justera mot vad Fraktjakt faktiskt
              debiterar er över tid.
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-2xl bg-tegel/10 px-5 py-3.5 text-sm font-medium text-tegel-dark">
            {error}
          </p>
        )}
        {saved && !isDirty && (
          <p className="rounded-2xl bg-gran/10 px-5 py-3.5 text-sm font-medium text-gran">
            Inställningarna är sparade.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !isDirty}
          className="rounded-full bg-tegel px-8 py-3.5 text-sm font-semibold text-krita transition-all hover:bg-tegel-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Sparar…" : "Spara ändringar"}
        </button>
      </form>

      <div className="rounded-3xl bg-white/70 p-6 shadow-mjuk ring-1 ring-kol/5 sm:p-8">
        <h2 className="font-display text-xl font-bold text-kol">Databackup</h2>
        <p className="mt-1 text-sm text-mull">
          All data (produkter, ordrar, kampanjer, nyhetsbrevsprenumeranter
          m.m.) ligger i JSON-filer utan extern databas eller automatisk
          backup. Ladda ner en .zip med hela datamappen och spara den någon
          annanstans, t.ex. Google Drive.
        </p>
        <a
          href="/api/admin/backup"
          className="mt-4 inline-block rounded-full border border-kol/15 px-6 py-3 text-sm font-semibold text-kol transition-colors hover:bg-linne"
        >
          Ladda ner backup
        </a>
        <p className="mt-3 text-xs font-medium text-tegel-dark">
          Ladda ner en backup regelbundet, särskilt innan större ändringar.
        </p>
      </div>
    </div>
  );
}
