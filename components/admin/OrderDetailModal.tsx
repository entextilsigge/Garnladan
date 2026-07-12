"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice, calculateVatAmount } from "@/lib/format";
import type { Order } from "@/lib/data/orderStore";
import type { ShippingSettings } from "@/lib/checkout";

function itemKey(slug: string, colorName: string): string {
  return `${slug}::${colorName}`;
}

// ---------------------------------------------------------------------------
// Orderdetaljvy för admin — kompletterar radlistan i OrdersPanel.tsx med
// allt som inte får plats i en tabellrad: full leveransadress, en
// specificerad radlista och den riktiga återbetalningsknappen (mot
// stripe.refunds.create, se app/api/admin/orders/[id]/refund/route.ts).
// ---------------------------------------------------------------------------

export default function OrderDetailModal({
  order,
  settings,
  fraktjaktConfigured,
  onClose,
  onUpdated,
}: {
  order: Order;
  settings: ShippingSettings;
  fraktjaktConfigured: boolean;
  onClose: () => void;
  onUpdated: (order: Order) => void;
}) {
  // ---------------------------------------------------------- Frakt & etiketter
  // "Hämta i Vargön" har ingen frakt att boka — knappen ska aldrig visas
  // för såna ordrar (uppdrag 15).
  const isPickup = order.shippingMethod === "ladan";
  const shippingProductId =
    order.shippingMethod === "ombud"
      ? settings.fraktjaktOmbudProductId
      : order.shippingMethod === "hem"
        ? settings.fraktjaktHemProductId
        : null;
  const canCreateLabel = fraktjaktConfigured && Boolean(shippingProductId);
  const hasShipment = Boolean(order.fraktjaktShipmentId);
  const isBooked = hasShipment && Boolean(order.trackingNumber);

  const [creatingLabel, setCreatingLabel] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [pendingAccessLink, setPendingAccessLink] = useState<string | null>(null);

  async function handleCreateLabel() {
    setLabelError(null);
    setPendingAccessLink(null);
    setCreatingLabel(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/fraktsedel`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setLabelError(data?.error ?? "Kunde inte skapa fraktsedel.");
        return;
      }
      if (data.order) onUpdated(data.order);
      if (!data.booked) setPendingAccessLink(data.accessLink || null);
    } finally {
      setCreatingLabel(false);
    }
  }

  function handlePrintBoth() {
    window.open(`/admin/packlista/${order.id}`, "_blank");
    window.open(`/api/admin/orders/${order.id}/fraktsedel`, "_blank");
  }
  const alreadyRefunded = (order.refunds ?? []).reduce((sum, r) => sum + r.amount, 0);
  const remaining = Math.max(0, order.total - alreadyRefunded);
  const canRefund =
    Boolean(order.paymentIntentId) &&
    (order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded") &&
    remaining > 0;

  const [refundAmount, setRefundAmount] = useState(remaining);
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const canReconcile = order.paymentStatus === "pending" && Boolean(order.paymentIntentId);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  const restockedKeys = new Set(order.restockedItemKeys ?? []);
  const returnableItems = order.items.filter((item) => !restockedKeys.has(itemKey(item.slug, item.colorName)));
  const [selectedReturns, setSelectedReturns] = useState<Set<string>>(new Set());
  const [restocking, setRestocking] = useState(false);
  const [restockError, setRestockError] = useState<string | null>(null);
  // Bara relevant efter en delåterbetalning — vid full återbetalning läggs
  // allt tillbaka automatiskt (se refund-routen).
  const showRestockPicker = order.paymentStatus === "partially_refunded" && returnableItems.length > 0;

  async function handleRefund() {
    setRefundError(null);
    if (refundAmount <= 0 || refundAmount > remaining + 0.01) {
      setRefundError(`Ange ett belopp mellan 1 och ${remaining} kr.`);
      return;
    }
    setRefunding(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: refundAmount }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRefundError(data?.error ?? "Återbetalningen misslyckades.");
        return;
      }
      onUpdated(data.order);
    } finally {
      setRefunding(false);
    }
  }

  async function handleReconcile() {
    setReconcileError(null);
    setReconcileMessage(null);
    setReconciling(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/reconcile`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setReconcileError(data?.error ?? "Kunde inte kontrollera betalstatus.");
        return;
      }
      setReconcileMessage(data.message ?? null);
      if (data.order) onUpdated(data.order);
    } finally {
      setReconciling(false);
    }
  }

  function toggleReturn(key: string) {
    setSelectedReturns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleConfirmReturns() {
    setRestockError(null);
    if (selectedReturns.size === 0) {
      setRestockError("Markera minst en rad som returnerad.");
      return;
    }
    setRestocking(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKeys: Array.from(selectedReturns) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRestockError(data?.error ?? "Kunde inte lägga tillbaka lagret.");
        return;
      }
      setSelectedReturns(new Set());
      onUpdated(data.order);
    } finally {
      setRestocking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-kol/40 px-4 py-8 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl rounded-3xl bg-krita p-6 shadow-lyft sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-kol">Order {order.id}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-kol transition-colors hover:bg-linne"
            aria-label="Stäng"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-mull">
          {new Date(order.createdAt).toLocaleString("sv-SE", { dateStyle: "long", timeStyle: "short" })}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-linne/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-mull">Kund</p>
            <p className="mt-1 font-medium text-kol">
              {order.customer.firstName} {order.customer.lastName}
            </p>
            <p className="text-sm text-mull">{order.customer.email}</p>
            <p className="mt-2 text-sm text-mull">
              {order.customer.address}
              <br />
              {order.customer.postalCode} {order.customer.city}
            </p>
          </div>
          <div className="rounded-2xl bg-linne/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-mull">Leverans &amp; betalning</p>
            <p className="mt-1 text-sm text-kol">{order.shippingLabel}</p>
            <p className="text-sm text-mull">Betalmetod: {order.paymentMethod}</p>
            {order.trackingNumber && (
              <p className="text-sm text-mull">Spårningsnr: {order.trackingNumber}</p>
            )}
          </div>
        </div>

        {/* -------------------------------------------------- Frakt & etiketter */}
        <div className="mt-4 rounded-2xl bg-linne/50 p-5">
          <h3 className="font-display text-lg font-semibold text-kol">Frakt &amp; etiketter</h3>

          {isPickup ? (
            <p className="mt-2 text-sm text-mull">
              &quot;Hämta i Vargön&quot; — ingen frakt att boka, bara en lokal
              upphämtning. Skriv ut packsedeln nedan när ordern är redo.
            </p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreateLabel}
                  disabled={!canCreateLabel || creatingLabel}
                  title={
                    !fraktjaktConfigured
                      ? "Fraktjakt ej konfigurerat"
                      : !shippingProductId
                        ? `Fraktjakt-tjänst för "${order.shippingLabel}" är inte ifylld under Inställningar → Fraktjakt`
                        : undefined
                  }
                  className="rounded-full bg-tegel px-6 py-2.5 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark disabled:cursor-not-allowed disabled:bg-kol/20 disabled:text-mull"
                >
                  {creatingLabel
                    ? "Skapar fraktsedel…"
                    : hasShipment
                      ? "Skapa ny fraktsedel"
                      : "Skapa fraktsedel"}
                </button>
                {!canCreateLabel && (
                  <p className="text-xs font-medium text-tegel-dark">
                    {!fraktjaktConfigured
                      ? "Fraktjakt ej konfigurerat."
                      : `Fraktjakt-tjänst för "${order.shippingLabel}" är inte konfigurerad (Inställningar → Fraktjakt).`}
                  </p>
                )}
              </div>

              {labelError && (
                <p className="mt-3 rounded-xl bg-tegel/10 px-4 py-3 text-sm font-medium text-tegel-dark">
                  {labelError}
                </p>
              )}

              {isBooked && (
                <div className="mt-3 rounded-xl bg-gran/10 p-4">
                  <p className="text-sm font-medium text-gran">
                    Fraktsedel klar — spårningsnummer {order.trackingNumber}.
                  </p>
                  <a
                    href={`/api/admin/orders/${order.id}/fraktsedel`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-tegel underline underline-offset-2"
                  >
                    Öppna fraktsedel (PDF)
                  </a>
                </div>
              )}

              {hasShipment && !isBooked && (
                <div className="mt-3 rounded-xl bg-senap/10 p-4">
                  <p className="text-sm font-medium text-kol">
                    Sändningen kunde inte bokas automatiskt av Fraktjakt — slutför
                    köpet direkt i Fraktjakt, hämta sedan spårningsnumret därifrån
                    och fyll i det ovan (fältet finns i orderlistan).
                  </p>
                  {pendingAccessLink && (
                    <a
                      href={pendingAccessLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-semibold text-tegel underline underline-offset-2"
                    >
                      Öppna sändningen i Fraktjakt
                    </a>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-kol/10 pt-4">
                <Link
                  href={`/admin/packlista/${order.id}`}
                  target="_blank"
                  className="rounded-full border border-kol/15 px-5 py-2.5 text-sm font-medium text-kol transition-colors hover:bg-linne"
                >
                  Skriv ut packsedel
                </Link>
                {isBooked && (
                  <button
                    type="button"
                    onClick={handlePrintBoth}
                    className="rounded-full border border-kol/15 px-5 py-2.5 text-sm font-medium text-kol transition-colors hover:bg-linne"
                  >
                    Skriv ut båda
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {canReconcile && (
          <div className="mt-4 rounded-2xl bg-senap/10 p-4">
            <p className="text-sm font-medium text-kol">
              Ordern väntar fortfarande på betalningsbekräftelse.
            </p>
            <p className="mt-1 text-xs text-mull">
              Om det tar ovanligt lång tid kan webhooken ha missat eventet
              (t.ex. felkonfigurerad i produktion) — kontrollera direkt hos
              Stripe istället för att vänta.
            </p>
            <button
              type="button"
              onClick={handleReconcile}
              disabled={reconciling}
              className="mt-3 rounded-full border border-kol/15 px-5 py-2 text-xs font-semibold text-kol transition-colors hover:bg-linne disabled:opacity-60"
            >
              {reconciling ? "Kontrollerar…" : "Kontrollera betalstatus hos Stripe"}
            </button>
            {reconcileMessage && (
              <p className="mt-2 text-sm font-medium text-gran">{reconcileMessage}</p>
            )}
            {reconcileError && (
              <p className="mt-2 text-sm font-medium text-tegel-dark">{reconcileError}</p>
            )}
          </div>
        )}

        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-kol/10 text-xs uppercase tracking-wider text-mull">
              <th className="py-2 font-semibold">Produkt</th>
              <th className="py-2 font-semibold">Färg</th>
              <th className="py-2 text-right font-semibold">Antal</th>
              <th className="py-2 text-right font-semibold">Radsumma</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kol/[0.07]">
            {order.items.map((item, i) => (
              <tr key={i}>
                <td className="py-2 font-medium text-kol">{item.name}</td>
                <td className="py-2 text-mull">{item.colorName}</td>
                <td className="py-2 text-right text-kol">{item.quantity} st</td>
                <td className="py-2 text-right text-kol">{formatPrice(item.unitPrice * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 space-y-1.5 border-t border-kol/10 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-mull">Delsumma</dt>
            <dd className="text-kol">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mull">Frakt</dt>
            <dd className="text-kol">{formatPrice(order.shippingCost)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mull">Varav moms (25%)</dt>
            <dd className="text-kol">{formatPrice(calculateVatAmount(order.total))}</dd>
          </div>
          <div className="flex justify-between border-t border-kol/10 pt-2 font-semibold">
            <dt className="text-kol">Totalt</dt>
            <dd className="text-kol">{formatPrice(order.total)}</dd>
          </div>
        </dl>

        {/* -------------------------------------------------- Återbetalning */}
        <div className="mt-6 rounded-2xl bg-linne/50 p-5">
          <h3 className="font-display text-lg font-semibold text-kol">Återbetalning</h3>

          {(order.refunds ?? []).length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-mull">
              {order.refunds!.map((r) => (
                <li key={r.id}>
                  {formatPrice(r.amount)} återbetalad{" "}
                  {new Date(r.createdAt).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" })}
                </li>
              ))}
            </ul>
          )}

          {!order.paymentIntentId && (
            <p className="mt-2 text-sm text-mull">
              Ordern har inget Stripe-betalnings-id (mockad order) och kan inte återbetalas här.
            </p>
          )}

          {order.paymentIntentId && remaining <= 0 && (
            <p className="mt-2 text-sm font-medium text-gran">Ordern är helt återbetald.</p>
          )}

          {canRefund && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-kol">Belopp att återbetala (kr)</label>
                <input
                  type="number"
                  min={1}
                  max={remaining}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-32 rounded-xl border border-kol/15 bg-white px-3 py-2 text-sm focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
                />
                <p className="mt-1 text-xs text-mull">Max {formatPrice(remaining)}</p>
              </div>
              <button
                type="button"
                onClick={handleRefund}
                disabled={refunding}
                className="rounded-full bg-tegel px-6 py-2.5 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark disabled:opacity-60"
              >
                {refunding ? "Återbetalar…" : "Återbetala"}
              </button>
            </div>
          )}

          {refundError && (
            <p className="mt-2 text-sm font-medium text-tegel-dark">{refundError}</p>
          )}

          {showRestockPicker && (
            <div className="mt-5 border-t border-kol/10 pt-4">
              <p className="text-sm font-medium text-kol">
                Bekräfta returnerade rader (lägger tillbaka i lager)
              </p>
              <p className="mt-1 text-xs text-mull">
                Delåterbetalningar kopplas inte automatiskt till specifika rader — markera själv
                vilka varor som faktiskt kommit i retur.
              </p>
              <ul className="mt-2 space-y-1.5">
                {returnableItems.map((item) => {
                  const key = itemKey(item.slug, item.colorName);
                  return (
                    <li key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedReturns.has(key)}
                        onChange={() => toggleReturn(key)}
                        className="h-4 w-4 accent-tegel"
                        id={`return-${key}`}
                      />
                      <label htmlFor={`return-${key}`} className="text-kol">
                        {item.name} · {item.colorName} × {item.quantity}
                      </label>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={handleConfirmReturns}
                disabled={restocking}
                className="mt-3 rounded-full border border-kol/15 px-5 py-2 text-xs font-semibold text-kol transition-colors hover:bg-linne disabled:opacity-60"
              >
                {restocking ? "Lägger tillbaka…" : "Lägg tillbaka markerade i lager"}
              </button>
              {restockError && (
                <p className="mt-2 text-sm font-medium text-tegel-dark">{restockError}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-kol/15 px-6 py-3 text-sm font-medium text-kol transition-colors hover:bg-linne"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
