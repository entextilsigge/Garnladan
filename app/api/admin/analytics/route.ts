import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { getAllProducts } from "@/lib/data/productStore";
import { getAllOrders } from "@/lib/data/orderStore";
import { getAllCampaigns } from "@/lib/data/campaignStore";
import { computeAnalytics, type Granularity } from "@/lib/analytics";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoKey(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || daysAgoKey(89);
  const to = searchParams.get("to") || todayKey();
  const granularityParam = searchParams.get("granularity");
  const granularity: Granularity =
    granularityParam === "day" || granularityParam === "week" || granularityParam === "month"
      ? granularityParam
      : "day";

  const [products, orders, campaigns] = await Promise.all([
    getAllProducts(),
    getAllOrders(),
    getAllCampaigns(),
  ]);
  const result = computeAnalytics({
    products,
    orders,
    campaigns,
    range: { from, to },
    granularity,
  });

  return NextResponse.json(result);
}
