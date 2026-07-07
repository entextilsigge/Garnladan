"use client";

import { useEffect } from "react";
import { captureUtmFromSearch } from "@/lib/attribution";

/**
 * Osynlig komponent monterad i root layout. Fångar utm_source/utm_medium/
 * utm_campaign från URL:en vid landning och sparar dem i en cookie (se
 * lib/attribution.ts), så att CheckoutFlow kan koppla attributionen till
 * ordern senare — oavsett hur många sidor besökaren hinner klicka runt på
 * innan köpet.
 *
 * Läser window.location.search direkt istället för useSearchParams() för
 * att slippa ett Suspense-krav för en komponent som ändå inte renderar
 * något.
 */
export default function UtmCapture() {
  useEffect(() => {
    captureUtmFromSearch(window.location.search);
  }, []);

  return null;
}
