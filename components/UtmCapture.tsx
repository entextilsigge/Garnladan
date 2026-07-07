"use client";

import { useEffect } from "react";
import {
  captureUtmFromSearch,
  applyPendingAttributionIfConsented,
  clearAttributionIfConsentDeclined,
} from "@/lib/attribution";
import { CONSENT_EVENT } from "@/lib/consent";

/**
 * Osynlig komponent monterad i root layout. Fångar utm_source/utm_medium/
 * utm_campaign från URL:en vid landning (se lib/attribution.ts) — men
 * skriver bara till en riktig cookie om besökaren redan samtyckt till
 * icke-nödvändiga cookies (lib/consent.ts). Lyssnar även på
 * CONSENT_EVENT så att ett samtycke som ges (eller dras tillbaka) senare
 * under besöket appliceras direkt, utan att sidan behöver laddas om.
 *
 * Läser window.location.search direkt istället för useSearchParams() för
 * att slippa ett Suspense-krav för en komponent som ändå inte renderar
 * något.
 */
export default function UtmCapture() {
  useEffect(() => {
    captureUtmFromSearch(window.location.search);
    applyPendingAttributionIfConsented();

    function handleConsentChange() {
      applyPendingAttributionIfConsented();
      clearAttributionIfConsentDeclined();
    }

    window.addEventListener(CONSENT_EVENT, handleConsentChange);
    return () => window.removeEventListener(CONSENT_EVENT, handleConsentChange);
  }, []);

  return null;
}
