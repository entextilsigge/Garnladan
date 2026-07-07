import type { PendingSession } from "@/lib/data/checkoutSessionStore";
import { createOrder, type Order, type PaymentStatus } from "@/lib/data/orderStore";
import { SHIPPING_OPTIONS } from "@/lib/checkout";

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
    status: "mottagen",
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
