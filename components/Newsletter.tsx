"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      return;
    }
    // UI-only: här kopplas riktig nyhetsbrevstjänst (Mailchimp/Rule) in senare.
    setStatus("done");
  }

  return (
    <section className="knit-texture bg-tegel">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-krita/70">
          Nyhetsbrevet Maskan
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold text-krita sm:text-4xl">
          Först till nya garner, mönster och lad-erbjudanden
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-krita/85">
          En gång i månaden, alltid med ett gratis mönster. Aldrig spam —
          vi har bättre saker för oss, som att sticka.
        </p>
        {status === "done" ? (
          <p className="mx-auto mt-8 max-w-md rounded-full bg-krita/15 px-6 py-3.5 text-sm font-medium text-krita">
            Tack! Kolla din inkorg — första numret är på väg. 🧶
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              E-postadress
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setStatus("idle");
              }}
              placeholder="din@epost.se"
              className="flex-1 rounded-full border-0 bg-krita px-5 py-3.5 text-sm text-kol placeholder:text-mull/60 focus:outline-none focus:ring-2 focus:ring-senap"
            />
            <button
              type="submit"
              className="rounded-full bg-kol px-7 py-3.5 text-sm font-semibold text-krita transition-all hover:bg-gran active:scale-95"
            >
              Prenumerera
            </button>
          </form>
        )}
        {status === "error" && (
          <p className="mt-3 text-sm text-krita/90">
            Hmm, det där ser inte ut som en giltig e-postadress.
          </p>
        )}
      </div>
    </section>
  );
}
