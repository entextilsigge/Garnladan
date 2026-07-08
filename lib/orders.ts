import type { PendingSession } from "@/lib/data/checkoutSessionStore";
import {
  createOrder,
  getOrderById,
  updatePaymentMethod,
  updatePaymentStatus,
  type Order,
  type PaymentStatus,
} from "@/lib/data/orderStore";
import { SHIPPING_OPTIONS } from "@/lib/checkout";
import { resolveActualPaymentMethod } from "@/lib/stripe";
import { sendOrderConfirmationEmail } from "@/lib/email";

// Delad mellan det mockade flödet (app/api/checkout/confirm/route.ts) och
// det riktiga Stripe-flödet (app/api/checkout/payment-intent/route.ts) —
// båda bygger en Order av samma slags checkout-session, bara med olika
// paymentStatus och (i Stripe-fallet) ett paymentIntentId.

export function generateOrderId(): string {
  return `GL-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function createOrderFromSession(
  session: PendingSession,
  orderId: string,
  paymentStatus: PaymentStatus,
  paymentIntentId?: string
): Order {
  const shippingOption = SHIPPING_OPTIONS.find((o) => o.id === session.shipping.shippingMethod);

  const order: Order = {
    id: orderId,
    createdAt: new Date().toISOString(),
    status: "vantar_packning",
    paymentStatus,
    ...(paymentIntentId ? { paymentIntentId } : {}),
    customer: {
      firstName: session.shipping.firstName,
      lastName: session.shipping.lastName,
      email: session.shipping.email,
      address: session.shipping.address,
      postalCode: session.shipping.postalCode,
      city: session.shipping.city,
    },
    shippingMethod: session.shipping.shippingMethod,
    shippingLabel: shippingOption?.label ?? session.shipping.shippingMethod,
    paymentMethod: session.paymentMethod,
    items: session.items,
    subtotal: session.subtotal,
    shippingCost: session.shippingCost,
    total: session.amount,
    attribution: session.attribution,
  };

  return createOrder(order);
}

/**
 * Applicerar utfallet av en PaymentIntent (från webhooken ELLER från
 * admins manuella avstämningsknapp, se app/api/admin/orders/[id]/
 * reconcile/route.ts) på en order — delad så båda vägarna garanterat
 * hanterar samma order likadant, oavsett vilken som kommer fram först.
 *
 * Idempotent by design: gör INGENTING om ordern redan lämnat "pending"
 * (t.ex. redan flippad av webhooken, eller redan återbetald). Det är detta
 * — inte ett låst state — som gör det säkert att låta webhooken och en
 * manuell avstämning racea mot varandra: vem som än kommer fram först
 * "vinner", och den andra blir ett no-op istället för att skicka ett
 * dubbelt bekräftelsemejl eller skriva över en nyare status.
 */
export async function applyPaymentIntentOutcome(
  orderId: string,
  outcome: "paid" | "failed",
  paymentIntentId: string
): Promise<{ changed: boolean; order: Order | null }> {
  const current = getOrderById(orderId);
  if (!current || current.paymentStatus !== "pending") {
    return { changed: false, order: current ?? null };
  }

  const updated = updatePaymentStatus(orderId, outcome);
  if (!updated) return { changed: false, order: null };

  if (outcome === "paid") {
    const method = await resolveActualPaymentMethod(paymentIntentId);
    const withMethod = method ? updatePaymentMethod(orderId, method) ?? updated : updated;
    await sendOrderConfirmationEmail(withMethod);
    return { changed: true, order: withMethod };
  }

  return { changed: true, order: updated };
}
