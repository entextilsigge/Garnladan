import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { getAllProducts } from "@/lib/data/productStore";
import { getAllOrders } from "@/lib/data/orderStore";
import { DEFAULT_ATTRIBUTION } from "@/lib/attribution";

// Genererar en .xlsx-rapport (SheetJS/xlsx) för ett valt datumintervall:
// ett blad med rådata (en rad per orderrad) och ett blad med månadsvis
// aggregering. Se punkt 6 i statistik-specen.

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || todayKey();
  const to = searchParams.get("to") || todayKey();

  const fromTime = new Date(`${from}T00:00:00.000Z`).getTime();
  const toTime = new Date(`${to}T23:59:59.999Z`).getTime();

  const products = getAllProducts();
  const productBySlug = new Map(products.map((p) => [p.slug, p]));
  const orders = getAllOrders().filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= fromTime && t <= toTime;
  });

  const rawRows = orders.flatMap((order) => {
    const attribution = order.attribution ?? DEFAULT_ATTRIBUTION;
    return order.items.map((item) => {
      const product = productBySlug.get(item.slug);
      const lineRevenue = item.unitPrice * item.quantity;
      const lineMargin = product ? (item.unitPrice - product.costPrice) * item.quantity : null;
      return {
        Ordernummer: order.id,
        Datum: order.createdAt.slice(0, 10),
        Status: order.status,
        Produkt: item.name,
        Färg: item.colorName,
        Antal: item.quantity,
        "Pris (styck, kr)": item.unitPrice,
        "Radsumma (kr)": lineRevenue,
        "Marginal (kr)": lineMargin,
        "Marginal (%)":
          lineMargin !== null && lineRevenue > 0 ? Math.round((lineMargin / lineRevenue) * 1000) / 10 : null,
        Källa: attribution.source,
        Medium: attribution.medium,
        Kampanj: attribution.campaign,
        Kund: `${order.customer.firstName} ${order.customer.lastName}`,
        "E-post": order.customer.email,
        Ort: order.customer.city,
      };
    });
  });

  const monthlyMap = new Map<string, { revenue: number; margin: number; orders: number }>();
  for (const order of orders) {
    const monthKey = order.createdAt.slice(0, 7);
    const acc = monthlyMap.get(monthKey) ?? { revenue: 0, margin: 0, orders: 0 };
    acc.revenue += order.total;
    acc.orders += 1;
    for (const item of order.items) {
      const product = productBySlug.get(item.slug);
      if (product) acc.margin += (item.unitPrice - product.costPrice) * item.quantity;
    }
    monthlyMap.set(monthKey, acc);
  }
  const monthlyRows = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      Månad: month,
      "Omsättning (kr)": Math.round(v.revenue),
      "Marginal (kr)": Math.round(v.margin),
      "Marginal (%)": v.revenue > 0 ? Math.round((v.margin / v.revenue) * 1000) / 10 : null,
      Antal_ordrar: v.orders,
    }));

  const workbook = XLSX.utils.book_new();
  const rawSheet = XLSX.utils.json_to_sheet(rawRows.length > 0 ? rawRows : [{ Info: "Inga ordrar i valt intervall" }]);
  XLSX.utils.book_append_sheet(workbook, rawSheet, "Rådata");
  const monthlySheet = XLSX.utils.json_to_sheet(
    monthlyRows.length > 0 ? monthlyRows : [{ Info: "Inga ordrar i valt intervall" }]
  );
  XLSX.utils.book_append_sheet(workbook, monthlySheet, "Månadsvis sammanställning");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="garnladan-rapport-${from}_${to}.xlsx"`,
    },
  });
}
