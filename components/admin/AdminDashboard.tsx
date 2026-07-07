"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProductsPanel from "@/components/admin/ProductsPanel";
import OrdersPanel from "@/components/admin/OrdersPanel";
import AnalyticsPanel from "@/components/admin/analytics/AnalyticsPanel";
import type { Product } from "@/lib/products";
import type { Order } from "@/lib/data/orderStore";

type Tab = "produkter" | "bestallningar" | "statistik";

export default function AdminDashboard({
  initialProducts,
  initialOrders,
}: {
  initialProducts: Product[];
  initialOrders: Order[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("produkter");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-tegel">
            Adminpanel
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-kol">Garnladan Admin</h1>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-full border border-kol/15 px-5 py-2.5 text-sm font-medium text-kol transition-colors hover:bg-linne disabled:opacity-60"
        >
          {loggingOut ? "Loggar ut…" : "Logga ut"}
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setTab("produkter")}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
            tab === "produkter" ? "bg-kol text-krita" : "bg-linne text-mull hover:text-kol"
          }`}
        >
          Produkter
        </button>
        <button
          onClick={() => setTab("bestallningar")}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
            tab === "bestallningar" ? "bg-kol text-krita" : "bg-linne text-mull hover:text-kol"
          }`}
        >
          Beställningar
        </button>
        <button
          onClick={() => setTab("statistik")}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
            tab === "statistik" ? "bg-kol text-krita" : "bg-linne text-mull hover:text-kol"
          }`}
        >
          Statistik
        </button>
      </div>

      <div className="mt-6">
        {tab === "produkter" && <ProductsPanel initialProducts={initialProducts} />}
        {tab === "bestallningar" && <OrdersPanel initialOrders={initialOrders} />}
        {tab === "statistik" && <AnalyticsPanel />}
      </div>
    </div>
  );
}
