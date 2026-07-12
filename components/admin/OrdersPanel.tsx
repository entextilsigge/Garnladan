"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import OrderDetailModal from "@/components/admin/OrderDetailModal";
import { formatPrice, calculateVatAmount } from "@/lib/format";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/data/orderStore";
import type { ShippingSettings } from "@/lib/checkout";

const STATUS_LABELS: Record<OrderStatus, string> = {
  vantar_packning: "Väntar packning",
  packad: "Packad",
  skickad: "Skickad",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  vantar_packning: "bg-senap/15 text-senap-dark",
  packad: "bg-tegel/10 text-tegel-dark",
  skickad: "bg-gran/10 text-gran",
};

// Ordrar skapade innan betalstatus fanns saknar fältet — de kom alla från
// det gamla mockade flödet, som alltid lyckades, så "paid" är rätt default.
const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Väntar betalning",
  paid: "Betald",
  failed: "Betalning misslyckades",
  refunded: "Återbetald",
  partially_refunded: "Delvis återbetald",
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-senap/15 text-senap-dark",
  paid: "bg-gran/10 text-gran",
  failed: "bg-tegel/10 text-tegel",
  refunded: "bg-kol/10 text-kol",
  partially_refunded: "bg-senap/15 text-senap-dark",
};

// En order som legat kvar som "pending" längre än detta är sannolikt ett
// tecken på att webhooken missat eventet (se AUDIT.md) — flaggas visuellt
// så packpersonalen ser den utan att behöva leta, och kan öppna
// orderdetaljerna för att stämma av mot Stripe direkt.
const STALE_PENDING_MS = 30 * 60 * 1000;

function isStalePending(order: Order): boolean {
  if ((order.paymentStatus ?? "paid") !== "pending") return false;
  return Date.now() - new Date(order.createdAt).getTime() > STALE_PENDING_MS;
}

export default function OrdersPanel({
  initialOrders,
  settings,
  fraktjaktConfigured,
}: {
  initialOrders: Order[];
  settings: ShippingSettings;
  fraktjaktConfigured: boolean;
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [query, setQuery] = useState("");
  // Default till "väntar packning" — den som packar dagligen ska se exakt
  // vad som behöver göras direkt, utan att bläddra bland redan skickade.
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "alla">("vantar_packning");
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== "alla") list = list.filter((o) => o.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          `${o.customer.firstName} ${o.customer.lastName}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, query, statusFilter]);

  function trackingFor(order: Order): string {
    return trackingDrafts[order.id] ?? order.trackingNumber ?? "";
  }

  function setRowError(orderId: string, message: string | null) {
    setRowErrors((prev) => {
      const next = { ...prev };
      if (message) next[orderId] = message;
      else delete next[orderId];
      return next;
    });
  }

  async function patchOrder(order: Order, body: Record<string, unknown>) {
    setUpdatingId(order.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Kunde inte uppdatera ordern.");
        return;
      }
      setOrders((prev) => prev.map((o) => (o.id === order.id ? data.order : o)));
      setRowError(order.id, null);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleStatusChange(order: Order, status: OrderStatus) {
    const tracking = trackingFor(order).trim();
    if (status === "skickad" && !tracking) {
      setRowError(order.id, "Ange spårningsnummer innan ordern markeras som skickad.");
      return;
    }
    await patchOrder(order, { status, ...(tracking ? { trackingNumber: tracking } : {}) });
  }

  async function handleSaveTracking(order: Order) {
    const tracking = trackingFor(order).trim();
    await patchOrder(order, { trackingNumber: tracking });
  }

  const countFor = (status: OrderStatus) => orders.filter((o) => o.status === status).length;
  const detailOrder = orders.find((o) => o.id === detailOrderId) ?? null;

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-2xl bg-tegel/10 px-5 py-3.5 text-sm font-medium text-tegel-dark">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Beställningar", String(orders.length)],
          ["Väntar packning", String(countFor("vantar_packning"))],
          ["Omsättning", formatPrice(orders.reduce((s, o) => s + o.total, 0))],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white/70 px-5 py-4 ring-1 ring-kol/5">
            <p className="text-xs font-medium uppercase tracking-wider text-mull">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-kol">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Sök på ordernummer eller kund…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-xs rounded-full border border-kol/15 bg-white px-5 py-2.5 text-sm focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("alla")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              statusFilter === "alla" ? "bg-kol text-krita" : "bg-linne text-mull hover:text-kol"
            }`}
          >
            Alla ({orders.length})
          </button>
          {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                statusFilter === s ? "bg-kol text-krita" : "bg-linne text-mull hover:text-kol"
              }`}
            >
              {STATUS_LABELS[s]} ({countFor(s)})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl bg-white/70 ring-1 ring-kol/5">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-kol/10 text-xs uppercase tracking-wider text-mull">
              <th className="px-5 py-3.5 font-semibold">Order</th>
              <th className="px-5 py-3.5 font-semibold">Datum</th>
              <th className="px-5 py-3.5 font-semibold">Kund</th>
              <th className="px-5 py-3.5 font-semibold">Rader</th>
              <th className="px-5 py-3.5 text-right font-semibold">Totalt</th>
              <th className="px-5 py-3.5 font-semibold">Betalning</th>
              <th className="px-5 py-3.5 font-semibold">Packning</th>
              <th className="px-5 py-3.5 font-semibold">Spårningsnr</th>
              <th className="px-5 py-3.5 font-semibold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-kol/[0.06]">
            {filtered.map((o) => {
              const paymentStatus: PaymentStatus = o.paymentStatus ?? "paid";
              const rowError = rowErrors[o.id];
              const trackingValue = trackingFor(o);
              const trackingChanged = trackingValue.trim() !== (o.trackingNumber ?? "");
              return (
                <tr key={o.id} className="align-top transition-colors hover:bg-linne/40">
                  <td className="px-5 py-3.5 font-mono text-xs font-medium text-kol">{o.id}</td>
                  <td className="px-5 py-3.5 text-mull">
                    {new Date(o.createdAt).toLocaleString("sv-SE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-kol">
                      {o.customer.firstName} {o.customer.lastName}
                    </p>
                    <p className="text-xs text-mull">{o.customer.email}</p>
                    <p className="text-xs text-mull">
                      {o.customer.postalCode} {o.customer.city}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-mull">
                    <ul className="space-y-0.5">
                      {o.items.map((item, i) => (
                        <li key={i} className="text-xs">
                          {item.name} · {item.colorName} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-kol">
                    {formatPrice(o.total)}
                    <div className="mt-0.5 text-xs font-normal text-mull">
                      varav moms 25%: {formatPrice(calculateVatAmount(o.total))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      title="Sätts automatiskt av Stripe (eller det mockade flödet) — går inte att ändra manuellt."
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_STATUS_STYLES[paymentStatus]}`}
                    >
                      {PAYMENT_STATUS_LABELS[paymentStatus]}
                    </span>
                    {isStalePending(o) && (
                      <p
                        className="mt-1.5 max-w-[140px] text-xs font-semibold text-tegel-dark"
                        title="Ordern har väntat på betalningsbekräftelse i över 30 minuter — webhooken kan ha missat eventet. Öppna Detaljer för att stämma av mot Stripe."
                      >
                        ⚠ Väntat &gt;30 min — kolla Stripe
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={o.status}
                      disabled={updatingId === o.id}
                      onChange={(e) => handleStatusChange(o, e.target.value as OrderStatus)}
                      className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-tegel/40 ${STATUS_STYLES[o.status]}`}
                    >
                      {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    {rowError && (
                      <p className="mt-1.5 max-w-[160px] text-xs font-medium text-tegel-dark">
                        {rowError}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Spårningsnr"
                        value={trackingValue}
                        disabled={updatingId === o.id}
                        onChange={(e) =>
                          setTrackingDrafts((prev) => ({ ...prev, [o.id]: e.target.value }))
                        }
                        className="w-32 rounded-full border border-kol/15 bg-white px-3 py-1.5 text-xs focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
                      />
                      {trackingChanged && (
                        <button
                          onClick={() => handleSaveTracking(o)}
                          disabled={updatingId === o.id}
                          title="Spara spårningsnummer"
                          className="rounded-full bg-kol px-2.5 py-1.5 text-xs font-semibold text-krita transition-colors hover:bg-tegel disabled:opacity-60"
                        >
                          Spara
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setDetailOrderId(o.id)}
                        className="whitespace-nowrap rounded-full border border-kol/15 px-3 py-1.5 text-xs font-medium text-kol transition-colors hover:bg-linne"
                      >
                        Detaljer
                      </button>
                      <Link
                        href={`/admin/packlista/${o.id}`}
                        target="_blank"
                        className="whitespace-nowrap rounded-full border border-kol/15 px-3 py-1.5 text-xs font-medium text-kol transition-colors hover:bg-linne"
                      >
                        Packsedel
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-mull">
                  Inga beställningar matchade.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          settings={settings}
          fraktjaktConfigured={fraktjaktConfigured}
          onClose={() => setDetailOrderId(null)}
          onUpdated={(updated) => {
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          }}
        />
      )}
    </div>
  );
}
