"use client";

// Klientkontext för fraktinställningar (flatrate-priser, fri frakt-gräns).
// Hämtas från GET /api/settings — klientkod kan inte importera den
// fs-baserade settingsStore direkt (se lib/data/settingsStore.ts).
//
// Startar med DEFAULT_SHIPPING_SETTINGS tills fetchen svarat, så inget
// flimrar eller kraschar innan värdena hunnit laddas.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_SHIPPING_SETTINGS, type ShippingSettings } from "@/lib/checkout";

const SettingsContext = createContext<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch(() => {
        // Nätverksfel — fortsätt med defaultvärdena, samma priser som
        // visas i kassan tills sidan laddats om.
      });
  }, []);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings(): ShippingSettings {
  return useContext(SettingsContext);
}
