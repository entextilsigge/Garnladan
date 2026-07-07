"use client";

// Anpassad 500-felsida (Next.js error-boundary för hela route-trädet under
// root layout — header/footer/varumärke behålls, till skillnad från
// Next.js standardfelsida). Fångar oväntade fel som kastas under
// rendering av en sida på servern eller klienten. Loggas till konsolen
// (och skulle i produktion även synas i Vercels function logs) — se
// lib/data/errorLogStore.ts för den interna felloggen som fångar API-fel
// separat.
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="font-display text-6xl font-bold text-tegel">Oj då</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-kol">
        Något gick fel
      </h1>
      <p className="mt-3 text-mull">
        Ett oväntat fel inträffade. Det är inte du som gjort något fel —
        försök igen om en liten stund.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-block rounded-full bg-tegel px-8 py-3.5 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark"
        >
          Försök igen
        </button>
        <a
          href="/"
          className="inline-block rounded-full border border-kol/15 px-8 py-3.5 text-sm font-medium text-kol transition-colors hover:bg-linne"
        >
          Till startsidan
        </a>
      </div>
    </div>
  );
}
