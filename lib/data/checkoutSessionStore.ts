import type { PaymentMethod, ShippingDetails } from "@/lib/checkout";
import type { OrderAttribution } from "@/lib/data/orderStore";
import { getSupabaseServiceClient, throwIfSupabaseError } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Kortlivad mellanlagring mellan POST /api/checkout/session och POST
// /api/checkout/confirm (eller .../payment-intent) — Supabase Postgres
// (uppdrag 13, AKUT prioritet). Detta var lagret som faktiskt kraschade i
// produktion: Vercels serverless-funktioner har ett skrivskyddat
// filsystem, så fs.writeFileSync i den tidigare JSON-fil-baserade
// versionen kastade EROFS för varje enda checkout-försök.
// ---------------------------------------------------------------------------

export interface PendingSessionItem {
  slug: string;
  name: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
}

export interface PendingSession {
  sessionId: string;
  createdAt: string;
  items: PendingSessionItem[];
  shipping: ShippingDetails;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingCost: number;
  amount: number;
  attribution: OrderAttribution;
}

interface CheckoutSessionRow {
  session_id: string;
  created_at: string;
  items: PendingSessionItem[];
  shipping: ShippingDetails;
  payment_method: PaymentMethod;
  subtotal: number;
  shipping_cost: number;
  amount: number;
  attribution: OrderAttribution;
}

function rowToSession(row: CheckoutSessionRow): PendingSession {
  return {
    sessionId: row.session_id,
    createdAt: row.created_at,
    items: row.items,
    shipping: row.shipping,
    paymentMethod: row.payment_method,
    subtotal: Number(row.subtotal),
    shippingCost: Number(row.shipping_cost),
    amount: Number(row.amount),
    attribution: row.attribution,
  };
}

export async function saveSession(session: PendingSession): Promise<void> {
  const { error } = await getSupabaseServiceClient().from("checkout_sessions").insert({
    session_id: session.sessionId,
    created_at: session.createdAt,
    items: session.items,
    shipping: session.shipping,
    payment_method: session.paymentMethod,
    subtotal: session.subtotal,
    shipping_cost: session.shippingCost,
    amount: session.amount,
    attribution: session.attribution,
  });
  throwIfSupabaseError(error);
}

/**
 * Läser sessionen UTAN att ta bort den — används av
 * app/api/checkout/payment-intent/route.ts innan Stripe-anropet, så att
 * sessionen (kundens redan ifyllda leveransadress, fraktval och varukorg)
 * finns kvar för en retry om själva Stripe-anropet misslyckas (t.ex.
 * nätverksfel). Sessionen konsumeras (tas bort) bara efter att
 * PaymentIntenten faktiskt skapats.
 */
export async function peekSession(sessionId: string): Promise<PendingSession | null> {
  const { data, error } = await getSupabaseServiceClient()
    .from("checkout_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  throwIfSupabaseError(error);
  return data ? rowToSession(data as unknown as CheckoutSessionRow) : null;
}

/** Hämtar och tar samtidigt bort sessionen (kan bara konsumeras en gång). */
export async function consumeSession(sessionId: string): Promise<PendingSession | null> {
  const { data, error } = await getSupabaseServiceClient()
    .from("checkout_sessions")
    .delete()
    .eq("session_id", sessionId)
    .select("*")
    .maybeSingle();
  throwIfSupabaseError(error);
  return data ? rowToSession(data as unknown as CheckoutSessionRow) : null;
}
