"use client";

import { useEffect, useState } from "react";

interface LoggedError {
  id: string;
  timestamp: string;
  message: string;
  context?: string;
}

// ---------------------------------------------------------------------------
// Enkel intern felloggning — visar de senaste fångade serverfelen
// (webhooks, betalnings-API:er m.m., se lib/data/errorLogStore.ts). Ersätter
// INTE en riktig felövervakningstjänst (Sentry m.fl.), som medvetet väntar
// tills ett nytt konto är okej att lägga till — det här ger bara någon
// insyn under tiden.
// ---------------------------------------------------------------------------

export default function ErrorLogPanel() {
  const [errors, setErrors] = useState<LoggedError[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/errors")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setErrors(data.errors);
      })
      .catch(() => {
        if (!cancelled) setError("Kunde inte hämta felloggen.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="rounded-2xl bg-senap/10 px-5 py-4 text-sm text-kol">
        Enkel intern felloggning — inte en ersättning för riktig
        felövervakning (t.ex. Sentry), som väntar tills ett nytt konto är
        okej att koppla in. Visar de senaste fångade serverfelen (webhooks,
        betalnings-API:er).
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-tegel/10 px-5 py-3.5 text-sm font-medium text-tegel-dark">
          {error}
        </p>
      )}

      {errors === null && !error && (
        <p className="mt-4 text-sm text-mull">Hämtar felloggen…</p>
      )}

      {errors !== null && errors.length === 0 && (
        <p className="mt-4 text-sm text-mull">Inga loggade fel — allt ser bra ut.</p>
      )}

      {errors !== null && errors.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-2xl bg-white/70 ring-1 ring-kol/5">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-kol/10 text-xs uppercase tracking-wider text-mull">
                <th className="px-5 py-3.5 font-semibold">Tidpunkt</th>
                <th className="px-5 py-3.5 font-semibold">Kontext</th>
                <th className="px-5 py-3.5 font-semibold">Felmeddelande</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kol/[0.06]">
              {errors.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="whitespace-nowrap px-5 py-3.5 text-mull">
                    {new Date(e.timestamp).toLocaleString("sv-SE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-mull">
                    {e.context ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-kol">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
