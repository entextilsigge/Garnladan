"use client";

import { useState } from "react";
import type { ShippingSettings } from "@/lib/checkout";

export default function SettingsPanel({
  initialSettings,
}: {
  initialSettings: ShippingSettings;
}) {
  const [settings, setSettings] = useState<ShippingSettings>(initialSettings);
  const [draft, setDraft] = useState<ShippingSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

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
    <form onSubmit={handleSave} className="max-w-xl space-y-6">
      <div className="rounded-2xl bg-senap/10 px-5 py-4 text-sm text-kol">
        Ingen fraktförmedlare (t.ex. Fraktjakt/Sendcloud) är kopplad — det
        här är enkla, fasta priser som du sätter själv. Frakt hanteras
        manuellt via PostNord.
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
  );
}
