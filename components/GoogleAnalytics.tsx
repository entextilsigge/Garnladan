"use client";

import { useEffect } from "react";
import { CONSENT_EVENT, hasMarketingConsent } from "@/lib/consent";

// ---------------------------------------------------------------------------
// Google Analytics 4. Mät-ID:t kommer från NEXT_PUBLIC_GA_MEASUREMENT_ID
// (se .env.example). Saknas variabeln renderas inget alls.
//
// Laddningen är helt beroende av cookiesamtycket (lib/consent.ts): ingen
// gtag.js hämtas och inga _ga-cookies sätts förrän besökaren godkänt
// icke-nödvändiga cookies. Lyssnar på CONSENT_EVENT så att samtycke som
// ges (eller dras tillbaka) under besöket slår igenom direkt.
//
// Skriptet injiceras dynamiskt från ett redan nonce:at skript — det tillåts
// av 'strict-dynamic' i CSP:n (middleware.ts), så ingen egen nonce behövs.
// GA4:s "enhanced measurement" spårar sidvisningar vid klientnavigering
// (History API) automatiskt, så vi skickar inga manuella page_view.
// ---------------------------------------------------------------------------

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type GtagWindow = Window &
  Record<string, unknown> & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };

let loaded = false;

function loadGa(id: string) {
  const w = window as GtagWindow;
  w[`ga-disable-${id}`] = false;
  if (loaded) return;
  loaded = true;

  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // gtag.js kräver `arguments`-objektet, inte en spread-array.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", id);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

function disableGa(id: string) {
  const w = window as GtagWindow;
  // Officiell opt-out-flagga: stoppar all vidare mätning i den här fliken.
  w[`ga-disable-${id}`] = true;

  // Rensa redan satta GA-cookies (_ga, _ga_<ID>) på alla relevanta domännivåer.
  const names = ["_ga", `_ga_${id.replace(/^G-/, "")}`];
  const host = window.location.hostname;
  const parts = host.split(".");
  const domains = ["", host];
  for (let i = 1; i < parts.length - 1; i++) {
    domains.push("." + parts.slice(i).join("."));
  }
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${
        domain ? `; domain=${domain}` : ""
      }`;
    }
  }
}

export default function GoogleAnalytics() {
  useEffect(() => {
    if (!GA_ID) return;

    function sync() {
      if (hasMarketingConsent()) loadGa(GA_ID!);
      else if (loaded) disableGa(GA_ID!);
    }

    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  return null;
}
