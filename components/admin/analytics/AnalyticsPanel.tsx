"use client";

import { useEffect, useState } from "react";
import LineChart from "@/components/admin/charts/LineChart";
import ProfitabilitySection from "@/components/admin/analytics/ProfitabilitySection";
import ProductPerformanceSection from "@/components/admin/analytics/ProductPerformanceSection";
import CustomersSection from "@/components/admin/analytics/CustomersSection";
import MarketingSection from "@/components/admin/analytics/MarketingSection";
import { formatPrice } from "@/lib/format";
import type { AnalyticsResult, Granularity } from "@/lib/analytics";
import type { Campaign } from "@/lib/data/campaignStore";

type Preset = "7d" | "30d" | "90d" | "12m" | "allt" | "custom";

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return toDateKey(d);
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - n);
  return toDateKey(d);
}

const PRESET_LABELS: Record<Exclude<Preset, "custom">, string> = {
  "7d": "7 dagar",
  "30d": "30 dagar",
  "90d": "90 dagar",
  "12m": "12 månader",
  allt: "Allt",
};

export default function AnalyticsPanel() {
  const [preset, setPreset] = useState<Preset>("90d");
  const [from, setFrom] = useState(daysAgo(89));
  const [to, setTo] = useState(toDateKey(new Date()));
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [series, setSeries] = useState<"revenue" | "orders">("revenue");

  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === "7d") setFrom(daysAgo(6));
    else if (p === "30d") setFrom(daysAgo(29));
    else if (p === "90d") setFrom(daysAgo(89));
    else if (p === "12m") setFrom(monthsAgo(12));
    else if (p === "allt") setFrom("2000-01-01");
    setTo(toDateKey(new Date()));
    if (p === "7d" || p === "30d") setGranularity("day");
    if (p === "90d") setGranularity("week");
    if (p === "12m" || p === "allt") setGranularity("month");
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/admin/analytics?from=${from}&to=${to}&granularity=${granularity}`),
      fetch("/api/admin/campaigns"),
    ])
      .then(async ([analyticsRes, campaignsRes]) => {
        if (!analyticsRes.ok) throw new Error("Kunde inte hämta statistik.");
        const analyticsJson = await analyticsRes.json();
        const campaignsJson = campaignsRes.ok ? await campaignsRes.json() : { campaigns: [] };
        if (cancelled) return;
        setData(analyticsJson);
        setCampaigns(campaignsJson.campaigns ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Något gick fel.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, granularity]);

  async function refetch() {
    const res = await fetch(`/api/admin/analytics?from=${from}&to=${to}&granularity=${granularity}`);
    if (res.ok) setData(await res.json());
  }

  function handleExport() {
    window.location.href = `/api/admin/analytics/export?from=${from}&to=${to}`;
  }

  return (
    <div className="space-y-6">
      {/* Filterrad — styr alla sektioner nedan samtidigt */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-kol/5">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PRESET_LABELS) as Exclude<Preset, "custom">[]).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                preset === p ? "bg-kol text-krita" : "bg-linne text-mull hover:text-kol"
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPreset("custom");
            }}
            className="rounded-full border border-kol/15 bg-white px-3 py-1.5 text-xs text-kol focus:border-tegel focus:outline-none"
          />
          <span className="text-xs text-mull">till</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPreset("custom");
            }}
            className="rounded-full border border-kol/15 bg-white px-3 py-1.5 text-xs text-kol focus:border-tegel focus:outline-none"
          />
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as Granularity)}
            className="rounded-full border border-kol/15 bg-white px-3 py-1.5 text-xs font-medium text-kol focus:outline-none"
          >
            <option value="day">Dag</option>
            <option value="week">Vecka</option>
            <option value="month">Månad</option>
          </select>
          <button
            onClick={handleExport}
            className="rounded-full bg-gran px-4 py-1.5 text-xs font-semibold text-krita transition-colors hover:bg-gran-dark"
          >
            Exportera Excel
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-tegel/10 px-5 py-3.5 text-sm font-medium text-tegel-dark">{error}</p>
      )}

      {loading || !data ? (
        <p className="py-12 text-center text-sm text-mull">Laddar statistik…</p>
      ) : (
        <>
          {data.meta.thinData && (
            <p className="rounded-2xl bg-senap/10 px-5 py-3.5 text-sm text-mull">
              <strong className="text-kol">Tunn statistik ännu:</strong> butiken är ny och har bara{" "}
              {data.meta.totalOrderCountAllTime} {data.meta.totalOrderCountAllTime === 1 ? "order" : "ordrar"}{" "}
              totalt. Siffrorna nedan blir mer tillförlitliga när fler riktiga beställningar kommer in. Kör{" "}
              <code className="font-mono text-xs">npm run seed:analytics</code> lokalt för att se dashboarden
              med realistisk testdata.
            </p>
          )}

          {/* KPI-kort */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Omsättning" value={formatPrice(data.overview.totalRevenue)} />
            <KpiCard label="Antal ordrar" value={String(data.overview.totalOrders)} />
            <KpiCard label="Snittordervärde (AOV)" value={formatPrice(data.overview.aov)} />
            <KpiCard
              label="Bruttomarginal"
              value={data.profitability.totalMarginPct === null ? "—" : `${data.profitability.totalMarginPct}%`}
              sublabel={formatPrice(data.profitability.totalMarginAmount)}
            />
          </div>

          {/* Försäljningsöversikt */}
          <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold text-kol">Försäljning över tid</h3>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSeries("revenue")}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    series === "revenue" ? "bg-kol text-krita" : "bg-linne text-mull"
                  }`}
                >
                  Omsättning
                </button>
                <button
                  onClick={() => setSeries("orders")}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    series === "orders" ? "bg-kol text-krita" : "bg-linne text-mull"
                  }`}
                >
                  Ordrar
                </button>
              </div>
            </div>
            <div className="mt-4">
              <LineChart
                data={data.overview.series.map((s) => ({
                  label: s.label,
                  value: series === "revenue" ? s.revenue : s.orders,
                }))}
                valueFormatter={(n) => (series === "revenue" ? formatPrice(n) : String(n))}
              />
            </div>
          </div>

          {/* Månadsjämförelse */}
          <div className="rounded-2xl bg-linne/50 p-5">
            <h3 className="font-display text-lg font-semibold text-kol">
              {data.overview.monthComparison.currentMonthLabel} vs. tidigare
            </h3>
            <p className="mt-1 text-xs text-mull">
              Jämför alltid innevarande hela kalendermånad, oavsett period valt ovan.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ComparisonRow
                title="Vs. föregående månad"
                revenuePct={data.overview.monthComparison.vsPreviousMonth.revenuePct}
                ordersPct={data.overview.monthComparison.vsPreviousMonth.ordersPct}
                aovPct={data.overview.monthComparison.vsPreviousMonth.aovPct}
              />
              <ComparisonRow
                title="Vs. samma månad föregående år"
                revenuePct={data.overview.monthComparison.vsSameMonthLastYear.revenuePct}
                ordersPct={data.overview.monthComparison.vsSameMonthLastYear.ordersPct}
                aovPct={data.overview.monthComparison.vsSameMonthLastYear.aovPct}
                insufficient={data.overview.monthComparison.vsSameMonthLastYear.insufficientHistory}
              />
            </div>
          </div>

          <Section title="Lönsamhet / marginal">
            <ProfitabilitySection data={data.profitability} />
          </Section>

          <Section title="Produktprestanda">
            <ProductPerformanceSection data={data.products} />
          </Section>

          <Section title="Kunder / målgrupper">
            <CustomersSection data={data.customers} />
          </Section>

          <Section title="Marknadsföring / kampanjattribution">
            <MarketingSection
              data={data.marketing}
              campaigns={campaigns}
              onCampaignsChange={(next) => {
                setCampaigns(next);
                refetch();
              }}
            />
          </Section>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-5 py-4 ring-1 ring-kol/5">
      <p className="text-xs font-medium uppercase tracking-wider text-mull">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-kol">{value}</p>
      {sublabel && <p className="mt-0.5 text-xs text-mull">{sublabel}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-bold text-kol">{title}</h2>
      {children}
    </div>
  );
}

function ComparisonRow({
  title,
  revenuePct,
  ordersPct,
  aovPct,
  insufficient,
}: {
  title: string;
  revenuePct: number | null;
  ordersPct: number | null;
  aovPct: number | null;
  insufficient?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/70 p-4">
      <p className="text-sm font-semibold text-kol">{title}</p>
      {insufficient ? (
        <p className="mt-2 text-sm text-mull">Otillräcklig historik ännu.</p>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <PctStat label="Omsättning" pct={revenuePct} />
          <PctStat label="Ordrar" pct={ordersPct} />
          <PctStat label="AOV" pct={aovPct} />
        </div>
      )}
    </div>
  );
}

function PctStat({ label, pct }: { label: string; pct: number | null }) {
  const color = pct === null ? "text-mull" : pct >= 0 ? "text-gran" : "text-tegel";
  return (
    <div>
      <p className={`font-display text-lg font-bold ${color}`}>
        {pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct}%`}
      </p>
      <p className="text-[11px] text-mull">{label}</p>
    </div>
  );
}
