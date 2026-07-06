import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// MOCK: bekräfta betalning — lyckas alltid och genererar ett ordernummer.
//
// Vid riktig integration ersätts detta med verifiering hos
// betalleverantören, t.ex:
//
//   const session = await stripe.checkout.sessions.retrieve(sessionId);
//   if (session.payment_status !== "paid") { ...returnera fel... }
//
// ...samt att ordern sparas i databas och kvittomejl skickas.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.sessionId !== "string" || !body.sessionId.startsWith("mock_sess_")) {
    return NextResponse.json(
      { error: "Ogiltig betalningssession." },
      { status: 400 }
    );
  }

  // Simulera kort handläggningstid hos betalleverantören
  await new Promise((resolve) => setTimeout(resolve, 900));

  const orderId = `GL-${Math.floor(100000 + Math.random() * 900000)}`;

  return NextResponse.json({ orderId, status: "paid" as const, amount: 0 });
}
