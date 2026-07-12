import { getSupabaseServiceClient, throwIfSupabaseError } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Orderlager — Supabase Postgres (uppdrag 13; ersätter den tidigare
// JSON-fil-baserade lagringen). Alla ordrar hanteras uteslutande server-side
// via service-role-klienten (aldrig via anon-klienten — ordrar innehåller
// kund-PII och har ingen publik läspolicy, se
// supabase/migrations/0001_initial_schema.sql).
// ---------------------------------------------------------------------------

/**
 * Packflödet. "vantar_packning" är default för en ny, betald order;
 * "packad" är ett valfritt mellansteg; "skickad" sätts när
 * spårningsnumret matats in (se updateOrderFulfillment nedan), vilket
 * triggar skickad-mejlet i lib/email.ts. Spårningsnumret fylls numera i
 * automatiskt när admin skapar en fraktsedel via Fraktjakt (uppdrag 15,
 * se lib/fraktjakt.ts) — statusbytet till "skickad" görs ändå alltid som
 * ett separat, medvetet klick av personalen efter att paketet faktiskt
 * lämnats till PostNord.
 */
export type OrderStatus = "vantar_packning" | "packad" | "skickad";

/**
 * Betalstatus enligt Stripe — helt separat från OrderStatus (leverans-
 * status). Sätts till "paid" direkt av det mockade flödet (allt lyckas),
 * eller av app/api/webhooks/stripe/route.ts när en riktig
 * payment_intent.succeeded/payment_intent.payment_failed tas emot. Ändras
 * ALDRIG manuellt i admin (utom via en lyckad återbetalning) — Stripe
 * (eller mock-flödet) är alltid sanningskällan.
 */
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";

/** En enskild återbetalning mot ordern — flera delåterbetalningar kan förekomma. */
export interface OrderRefund {
  id: string;
  /** Stripes refund-id (re_...), saknas medan raden är 'pending' (se reserveRefund). */
  stripeRefundId: string | null;
  amount: number;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

export interface OrderItem {
  slug: string;
  name: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderCustomer {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
}

/**
 * Marknadsföringsattribution, fångad från utm_source/utm_medium/utm_campaign
 * vid landning och kopplad till ordern i checkout-flödet.
 */
export interface OrderAttribution {
  source: string;
  medium: string;
  campaign: string;
}

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
  trackingNumber?: string;
  /** Fraktjakts interna sändnings-id + access-kod (uppdrag 15) — sparas när en fraktsedel skapats, används för att hämta etikett-PDF:en på nytt utan att boka en ny sändning. */
  fraktjaktShipmentId?: number;
  fraktjaktAccessCode?: string;
  customer: OrderCustomer;
  shippingMethod: string;
  shippingLabel: string;
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  attribution: OrderAttribution;
  refunds?: OrderRefund[];
  restockedItemKeys?: string[];
}

interface OrderItemRow {
  slug: string;
  name: string;
  color_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderRefundRow {
  id: string;
  stripe_refund_id: string | null;
  amount: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

interface OrderRow {
  id: string;
  created_at: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_intent_id: string | null;
  tracking_number: string | null;
  fraktjakt_shipment_id: number | null;
  fraktjakt_access_code: string | null;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_address: string;
  customer_postal_code: string;
  customer_city: string;
  shipping_method: string;
  shipping_label: string;
  payment_method: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  attribution_source: string;
  attribution_medium: string;
  attribution_campaign: string;
  restocked_item_keys: string[];
  order_items: OrderItemRow[];
  order_refunds: OrderRefundRow[];
}

const ORDER_SELECT = "*, order_items(*), order_refunds(*)";

function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentIntentId: row.payment_intent_id ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    fraktjaktShipmentId: row.fraktjakt_shipment_id ?? undefined,
    fraktjaktAccessCode: row.fraktjakt_access_code ?? undefined,
    customer: {
      firstName: row.customer_first_name,
      lastName: row.customer_last_name,
      email: row.customer_email,
      address: row.customer_address,
      postalCode: row.customer_postal_code,
      city: row.customer_city,
    },
    shippingMethod: row.shipping_method,
    shippingLabel: row.shipping_label,
    paymentMethod: row.payment_method,
    items: (row.order_items ?? []).map((i) => ({
      slug: i.slug,
      name: i.name,
      colorName: i.color_name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
    })),
    subtotal: Number(row.subtotal),
    shippingCost: Number(row.shipping_cost),
    total: Number(row.total),
    attribution: {
      source: row.attribution_source,
      medium: row.attribution_medium,
      campaign: row.attribution_campaign,
    },
    refunds: (row.order_refunds ?? []).map((r) => ({
      id: r.id,
      stripeRefundId: r.stripe_refund_id,
      amount: Number(r.amount),
      status: r.status,
      createdAt: r.created_at,
    })),
    restockedItemKeys: row.restocked_item_keys ?? [],
  };
}

export async function getAllOrders(): Promise<Order[]> {
  const { data, error } = await getSupabaseServiceClient()
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });
  throwIfSupabaseError(error);
  return (data as unknown as OrderRow[]).map(rowToOrder);
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const { data, error } = await getSupabaseServiceClient()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  throwIfSupabaseError(error);
  return data ? rowToOrder(data as unknown as OrderRow) : undefined;
}

export async function createOrder(order: Order): Promise<Order> {
  const client = getSupabaseServiceClient();
  const { error: orderError } = await client.from("orders").insert({
    id: order.id,
    created_at: order.createdAt,
    status: order.status,
    payment_status: order.paymentStatus,
    payment_intent_id: order.paymentIntentId ?? null,
    tracking_number: order.trackingNumber ?? null,
    customer_first_name: order.customer.firstName,
    customer_last_name: order.customer.lastName,
    customer_email: order.customer.email,
    customer_address: order.customer.address,
    customer_postal_code: order.customer.postalCode,
    customer_city: order.customer.city,
    shipping_method: order.shippingMethod,
    shipping_label: order.shippingLabel,
    payment_method: order.paymentMethod,
    subtotal: order.subtotal,
    shipping_cost: order.shippingCost,
    total: order.total,
    attribution_source: order.attribution.source,
    attribution_medium: order.attribution.medium,
    attribution_campaign: order.attribution.campaign,
  });
  throwIfSupabaseError(orderError);

  if (order.items.length > 0) {
    const { error: itemsError } = await client.from("order_items").insert(
      order.items.map((item) => ({
        order_id: order.id,
        slug: item.slug,
        name: item.name,
        color_name: item.colorName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }))
    );
    throwIfSupabaseError(itemsError);
  }

  return (await getOrderById(order.id))!;
}

/**
 * Uppdaterar packningsstatus och/eller spårningsnummer i ett svep — så att
 * app/api/admin/orders/[id]/route.ts kan jämföra gammal/ny status (för att
 * avgöra om skickad-mejlet ska triggas) utifrån samma atomiska skrivning.
 */
export async function updateOrderFulfillment(
  id: string,
  updates: { status?: OrderStatus; trackingNumber?: string }
): Promise<Order | null> {
  const patch: Record<string, unknown> = {};
  if (updates.status) patch.status = updates.status;
  if (updates.trackingNumber !== undefined) patch.tracking_number = updates.trackingNumber;

  const { error } = await getSupabaseServiceClient().from("orders").update(patch).eq("id", id);
  throwIfSupabaseError(error);
  return (await getOrderById(id)) ?? null;
}

/**
 * Sparar Fraktjakts sändnings-referens på ordern efter en lyckad
 * "Skapa fraktsedel" (se app/api/admin/orders/[id]/fraktsedel/route.ts).
 * Fyller ALLTID i spårningsnumret automatiskt om Fraktjakt bokat/köpt
 * sändningen direkt — personalen slipper skriva in det manuellt när de
 * senare klickar "Markera som skickad".
 */
export async function saveFraktjaktShipment(
  id: string,
  update: { shipmentId: number; accessCode: string; trackingNumber: string | null }
): Promise<Order | null> {
  const patch: Record<string, unknown> = {
    fraktjakt_shipment_id: update.shipmentId,
    fraktjakt_access_code: update.accessCode,
  };
  if (update.trackingNumber) patch.tracking_number = update.trackingNumber;

  const { error } = await getSupabaseServiceClient().from("orders").update(patch).eq("id", id);
  throwIfSupabaseError(error);
  return (await getOrderById(id)) ?? null;
}

export async function updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<Order | null> {
  const { error } = await getSupabaseServiceClient()
    .from("orders")
    .update({ payment_status: paymentStatus })
    .eq("id", id);
  throwIfSupabaseError(error);
  return (await getOrderById(id)) ?? null;
}

/** Ersätter den generiska "stripe"-etiketten med den faktiska betalmetoden (t.ex. "card", "klarna"). */
export async function updatePaymentMethod(id: string, paymentMethod: string): Promise<Order | null> {
  const { error } = await getSupabaseServiceClient()
    .from("orders")
    .update({ payment_method: paymentMethod })
    .eq("id", id);
  throwIfSupabaseError(error);
  return (await getOrderById(id)) ?? null;
}

/** Markerar orderrader (`${slug}::${colorName}`) som redan återlagda i lager, så de inte krediteras igen. */
export async function markItemsRestocked(id: string, itemKeys: string[]): Promise<Order | null> {
  const current = await getOrderById(id);
  if (!current) return null;
  const restockedItemKeys = Array.from(new Set([...(current.restockedItemKeys ?? []), ...itemKeys]));
  const { error } = await getSupabaseServiceClient()
    .from("orders")
    .update({ restocked_item_keys: restockedItemKeys })
    .eq("id", id);
  throwIfSupabaseError(error);
  return (await getOrderById(id)) ?? null;
}

// =============================================================================
// ÅTERBETALNING — tvåfas, atomärt på databasnivå (uppdrag 13, ersätter det
// tidigare in-memory-låset i lib/orderLock.ts).
//
// Se de tre Postgres-funktionerna i supabase/migrations/0001_initial_schema.sql
// för den fulla motiveringen: reserve_refund låser ordern och kontrollerar
// (och räknar redan pending + completed återbetalningar mot) återstående
// belopp INNAN Stripe-anropet görs, så två nästan samtidiga
// återbetalningsförsök inte kan tillsammans överstiga ordersumman —
// oavsett hur många serverless-instanser som råkar hantera dem.
// =============================================================================

export type ReserveRefundResult = { ok: true } | { ok: false; error: string };

export async function reserveRefund(orderId: string, amount: number, refundId: string): Promise<ReserveRefundResult> {
  const { data, error } = await getSupabaseServiceClient().rpc("reserve_refund", {
    p_order_id: orderId,
    p_amount: amount,
    p_refund_id: refundId,
  });
  throwIfSupabaseError(error);
  return data as ReserveRefundResult;
}

export async function finalizeRefund(
  refundId: string,
  stripeRefundId: string
): Promise<{ ok: true; paymentStatus: PaymentStatus } | { ok: false; error: string }> {
  const { data, error } = await getSupabaseServiceClient().rpc("finalize_refund", {
    p_refund_id: refundId,
    p_stripe_refund_id: stripeRefundId,
  });
  throwIfSupabaseError(error);
  return data as { ok: true; paymentStatus: PaymentStatus } | { ok: false; error: string };
}

export async function cancelRefundReservation(refundId: string): Promise<void> {
  const { error } = await getSupabaseServiceClient().rpc("cancel_refund_reservation", {
    p_refund_id: refundId,
  });
  throwIfSupabaseError(error);
}
