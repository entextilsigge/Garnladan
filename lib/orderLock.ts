// ---------------------------------------------------------------------------
// Enkelt in-memory lås per order-id — förhindrar att två nästan samtidiga
// anrop (t.ex. ett dubbelklick som hinner före knappens disabled-state, eller
// två öppna admin-flikar) båda hinner passera en kontroll som bygger på
// samma inlästa orderdata innan någon av dem hunnit skriva (se
// app/api/admin/orders/[id]/refund/route.ts, där två parallella
// återbetalningar annars skulle kunna tillsammans överstiga ordersumman).
//
// Race-safe av samma anledning som reserveStockForItems i
// lib/data/productStore.ts: `acquireOrderLock` är en helt synkron
// check-och-sätt (Set.has + Set.add, inget `await` emellan), och Node kör
// JavaScript entrådigt — så två anrop kan aldrig interleava mitt i den.
// Delas INTE mellan flera serverless-instanser (samma begränsning som
// lib/rateLimit.ts), men skyddar korrekt inom en enskild process/instans.
// ---------------------------------------------------------------------------

const locked = new Set<string>();

/** Försöker ta låset för en order. Returnerar false om det redan är taget. */
export function acquireOrderLock(orderId: string): boolean {
  if (locked.has(orderId)) return false;
  locked.add(orderId);
  return true;
}

export function releaseOrderLock(orderId: string): void {
  locked.delete(orderId);
}
