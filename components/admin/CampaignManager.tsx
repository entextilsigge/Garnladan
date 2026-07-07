"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import type { Campaign } from "@/lib/data/campaignStore";

const inputClassSm =
  "w-full rounded-lg border border-kol/15 bg-white px-3 py-2 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25";

interface FormState {
  name: string;
  channel: string;
  startDate: string;
  endDate: string;
  budget: string;
}

const EMPTY_FORM: FormState = { name: "", channel: "", startDate: "", endDate: "", budget: "" };

export default function CampaignManager({
  campaigns,
  onChange,
}: {
  campaigns: Campaign[];
  onChange: (next: Campaign[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEdit(c: Campaign) {
    setEditing(c);
    setForm({
      name: c.name,
      channel: c.channel,
      startDate: c.startDate,
      endDate: c.endDate,
      budget: c.budget != null ? String(c.budget) : "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.channel.trim() || !form.startDate || !form.endDate) {
      setError("Namn, kanal, startdatum och slutdatum krävs.");
      return;
    }
    if (form.startDate > form.endDate) {
      setError("Startdatum måste vara före slutdatum.");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      channel: form.channel.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      budget: form.budget.trim() ? Number(form.budget) : undefined,
    };
    try {
      const res = editing
        ? await fetch(`/api/admin/campaigns/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Kunde inte spara kampanjen.");
        setSaving(false);
        return;
      }
      const saved: Campaign = data.campaign;
      onChange(editing ? campaigns.map((c) => (c.id === saved.id ? saved : c)) : [...campaigns, saved]);
      setShowForm(false);
    } catch {
      setError("Kunde inte spara kampanjen. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Campaign) {
    if (!confirm(`Ta bort kampanjen "${c.name}"?`)) return;
    const res = await fetch(`/api/admin/campaigns/${c.id}`, { method: "DELETE" });
    if (res.ok) onChange(campaigns.filter((x) => x.id !== c.id));
  }

  return (
    <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-kol">Kampanjregister</h3>
        <button
          onClick={openCreate}
          className="rounded-full bg-tegel px-4 py-2 text-xs font-semibold text-krita transition-colors hover:bg-tegel-dark"
        >
          + Lägg till kampanj
        </button>
      </div>
      <p className="mt-1 text-xs text-mull">
        Namnet måste matcha <code className="font-mono">utm_campaign</code>-värdet i länkarna som
        används i marknadsföringen för att ordrar ska kunna kopplas till kampanjen.
      </p>

      {campaigns.length === 0 ? (
        <p className="mt-4 text-sm text-mull">Inga kampanjer registrerade ännu.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-linne/50 px-4 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium text-kol">
                  {c.name} <span className="text-xs font-normal text-mull">· {c.channel}</span>
                </p>
                <p className="text-xs text-mull">
                  {c.startDate} – {c.endDate}
                  {c.budget != null && ` · Budget ${formatPrice(c.budget)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(c)}
                  className="rounded-full border border-kol/15 px-3 py-1 text-xs font-medium text-kol transition-colors hover:bg-white"
                >
                  Redigera
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="rounded-full border border-tegel/30 px-3 py-1 text-xs font-medium text-tegel transition-colors hover:bg-tegel/10"
                >
                  Ta bort
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 rounded-xl bg-linne/40 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-kol">
              Namn (matchar utm_campaign)
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="t.ex. sommarrea-2026"
              className={inputClassSm}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-kol">Kanal</label>
            <input
              value={form.channel}
              onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
              placeholder="t.ex. Instagram, Nyhetsbrev"
              className={inputClassSm}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-kol">Budget (SEK, valfritt)</label>
            <input
              type="number"
              min={0}
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              className={inputClassSm}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-kol">Startdatum</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className={inputClassSm}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-kol">Slutdatum</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className={inputClassSm}
            />
          </div>
          {error && <p className="text-xs font-medium text-tegel sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-kol/15 px-4 py-2 text-xs font-medium text-kol transition-colors hover:bg-white"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-tegel px-4 py-2 text-xs font-semibold text-krita transition-colors hover:bg-tegel-dark disabled:opacity-60"
            >
              {saving ? "Sparar…" : "Spara kampanj"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
