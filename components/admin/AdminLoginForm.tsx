"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Fel lösenord.");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Kunde inte logga in. Försök igen.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20 sm:px-6">
      <div className="rounded-3xl bg-white/70 p-8 shadow-mjuk ring-1 ring-kol/5">
        <h1 className="font-display text-2xl font-bold text-kol">Garnladan Admin</h1>
        <p className="mt-2 text-sm text-mull">
          Logga in med adminlösenordet för att hantera produkter och
          beställningar.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-kol">
              Lösenord
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-kol/15 bg-white px-4 py-3 text-sm focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
              autoFocus
            />
          </div>
          {error && <p className="text-sm font-medium text-tegel">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-kol py-3.5 text-sm font-semibold text-krita transition-colors hover:bg-tegel disabled:opacity-60"
          >
            {loading ? "Loggar in…" : "Logga in"}
          </button>
        </form>
      </div>
    </div>
  );
}
