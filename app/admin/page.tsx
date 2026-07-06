"use client";

// Adminvy (demo). Inloggningen är medvetet mockad — lösenordet är "garn"
// och sparas bara i sessionStorage. Vid riktig drift ersätts detta med
// riktig auth (t.ex. NextAuth/Clerk) och tabellen kopplas mot databas/CMS
// istället för lib/products.ts.

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import {
  CATEGORY_LABELS,
  WEIGHT_LABELS,
  getAllProducts,
  type Category,
} from "@/lib/products";

const AUTH_KEY = "garnladan-admin";
const DEMO_PASSWORD = "garn";

/** Deterministiskt mock-lagersaldo per produkt (byts mot databasfält) */
function mockStock(slug: string): number {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return 3 + (h % 88);
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "alla">("alla");

  useEffect(() => {
    setAuthed(sessionStorage.getItem(AUTH_KEY) === "1");
  }, []);

  const products = useMemo(() => {
    let list = getAllProducts();
    if (categoryFilter !== "alla") {
      list = list.filter((p) => p.category === categoryFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.slug.includes(q)
      );
    }
    return list;
  }, [query, categoryFilter]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === DEMO_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      setAuthed(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  }

  if (authed === undefined) {
    return <div className="min-h-[50vh]" aria-hidden />;
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-white/70 p-8 shadow-mjuk ring-1 ring-kol/5">
          <h1 className="font-display text-2xl font-bold text-kol">Garnladan Admin</h1>
          <p className="mt-2 text-sm text-mull">
            Demo-inloggning — lösenordet är{" "}
            <code className="rounded bg-linne px-1.5 py-0.5 font-mono text-xs">garn</code>.
            Byts mot riktig autentisering vid driftsättning.
          </p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-kol">
                Lösenord
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError(false);
                }}
                className="w-full rounded-xl border border-kol/15 bg-white px-4 py-3 text-sm focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
                autoFocus
              />
            </div>
            {loginError && (
              <p className="text-sm font-medium text-tegel">Fel lösenord — prova &quot;garn&quot;.</p>
            )}
            <button
              type="submit"
              className="w-full rounded-full bg-kol py-3.5 text-sm font-semibold text-krita transition-colors hover:bg-tegel"
            >
              Logga in
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalValue = products.reduce((sum, p) => sum + p.price * mockStock(p.slug), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-tegel">
            Adminpanel · demo
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-kol">Produktkatalog</h1>
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem(AUTH_KEY);
            setAuthed(false);
          }}
          className="rounded-full border border-kol/15 px-5 py-2.5 text-sm font-medium text-kol transition-colors hover:bg-linne"
        >
          Logga ut
        </button>
      </div>

      <p className="mt-4 max-w-2xl rounded-2xl bg-senap/10 px-5 py-3.5 text-sm text-mull">
        <strong className="text-kol">Demo-läge:</strong> datat läses från{" "}
        <code className="font-mono text-xs">lib/products.ts</code> och lagersaldot är
        simulerat. Strukturen är redo att kopplas mot databas eller CMS.
      </p>

      {/* Nyckeltal */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Produkter", String(products.length)],
          ["Färgvarianter", String(products.reduce((s, p) => s + p.colorways.length, 0))],
          ["Lagervärde (sim.)", formatPrice(totalValue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white/70 px-5 py-4 ring-1 ring-kol/5">
            <p className="text-xs font-medium uppercase tracking-wider text-mull">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-kol">{value}</p>
          </div>
        ))}
      </div>

      {/* Filterrad */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Sök på namn eller slug…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-xs rounded-full border border-kol/15 bg-white px-5 py-2.5 text-sm focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | "alla")}
          className="rounded-full border border-kol/15 bg-white px-4 py-2.5 text-sm font-medium text-kol focus:outline-none focus:ring-2 focus:ring-tegel/25"
        >
          <option value="alla">Alla kategorier</option>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      {/* Produkttabell */}
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white/70 ring-1 ring-kol/5">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead>
            <tr className="border-b border-kol/10 text-xs uppercase tracking-wider text-mull">
              <th className="px-5 py-3.5 font-semibold">Produkt</th>
              <th className="px-5 py-3.5 font-semibold">Kategori</th>
              <th className="px-5 py-3.5 font-semibold">Tjocklek</th>
              <th className="px-5 py-3.5 font-semibold">Färger</th>
              <th className="px-5 py-3.5 text-right font-semibold">Pris</th>
              <th className="px-5 py-3.5 text-right font-semibold">Lager (sim.)</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kol/[0.06]">
            {products.map((p) => {
              const stock = mockStock(p.slug);
              return (
                <tr key={p.id} className="transition-colors hover:bg-linne/40">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-kol">{p.name}</p>
                    <p className="font-mono text-xs text-mull">{p.slug}</p>
                  </td>
                  <td className="px-5 py-3.5 text-mull">{CATEGORY_LABELS[p.category]}</td>
                  <td className="px-5 py-3.5 text-mull">{WEIGHT_LABELS[p.weightClass]}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex -space-x-1">
                      {p.colorways.map((c) => (
                        <span
                          key={c.name}
                          title={c.name}
                          className="h-4 w-4 rounded-full ring-2 ring-white"
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-kol">
                    {formatPrice(p.price)}
                  </td>
                  <td
                    className={`px-5 py-3.5 text-right font-medium ${
                      stock < 10 ? "text-tegel" : "text-kol"
                    }`}
                  >
                    {stock} st
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        p.isNew
                          ? "bg-gran/10 text-gran"
                          : stock < 10
                            ? "bg-tegel/10 text-tegel"
                            : "bg-linne text-mull"
                      }`}
                    >
                      {p.isNew ? "Nyhet" : stock < 10 ? "Lågt lager" : "Aktiv"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
