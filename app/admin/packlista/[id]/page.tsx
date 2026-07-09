import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_COOKIE_NAME, isValidSessionToken } from "@/lib/adminAuth";
import { getOrderById } from "@/lib/data/orderStore";
import { formatReturAddress } from "@/lib/company-info";
import { formatOrderDate } from "@/lib/format";
import PrintButton from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Packsedel",
  robots: { index: false, follow: false },
};

// Ren, utskriftsvänlig packsedel för en enskild order — INGET pris, bara
// vad packaren behöver: ordernummer, datum och rader (produkt, färg,
// antal). header/footer/cookie-banner döljs vid utskrift via print-CSS:en
// i app/globals.css ([data-print-hide]/header/footer).
export default async function PacklistaPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const authed = isValidSessionToken((await cookies()).get(ADMIN_COOKIE_NAME)?.value);
  if (!authed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="font-display text-2xl font-bold text-kol">Ej inloggad</p>
        <p className="mt-3 text-mull">Logga in i adminpanelen för att se packsedeln.</p>
      </div>
    );
  }

  const order = await getOrderById(params.id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div data-print-hide className="mb-6">
        <PrintButton />
      </div>

      <div
        data-print-form
        className="rounded-3xl bg-white/70 p-8 shadow-mjuk ring-1 ring-kol/5 print:rounded-none print:bg-transparent print:p-0 print:shadow-none print:ring-0"
      >
        <div className="flex items-start justify-between gap-4 border-b border-kol/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mull">
              Packsedel
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-kol">{order.id}</h1>
          </div>
          <div className="text-right text-sm text-mull">
            <p>{formatOrderDate(order.createdAt)}</p>
            <p className="mt-1">{formatReturAddress()}</p>
          </div>
        </div>

        <p className="mt-5 text-sm text-kol">
          <span className="font-semibold">
            {order.customer.firstName} {order.customer.lastName}
          </span>{" "}
          · {order.shippingLabel}
        </p>

        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-kol/10 text-xs uppercase tracking-wider text-mull">
              <th className="py-2 font-semibold">Produkt</th>
              <th className="py-2 font-semibold">Färg</th>
              <th className="py-2 text-right font-semibold">Antal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kol/[0.07]">
            {order.items.map((item, i) => (
              <tr key={i}>
                <td className="py-2.5 font-medium text-kol">{item.name}</td>
                <td className="py-2.5 text-mull">{item.colorName}</td>
                <td className="py-2.5 text-right font-semibold text-kol">{item.quantity} st</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
