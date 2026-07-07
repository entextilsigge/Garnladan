import BarList from "@/components/admin/charts/BarList";
import LineChart from "@/components/admin/charts/LineChart";
import { formatPrice } from "@/lib/format";
import { CATEGORY_LABELS, type Category } from "@/lib/products";
import type { AnalyticsResult } from "@/lib/analytics";

export default function ProfitabilitySection({ data }: { data: AnalyticsResult["profitability"] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">Marginal per kategori</h3>
          <div className="mt-4">
            <BarList
              items={data.byCategory.map((c) => ({
                label: CATEGORY_LABELS[c.category as Category] ?? c.category,
                value: c.marginPct ?? 0,
                sublabel: `${formatPrice(c.marginAmount)} av ${formatPrice(c.revenue)} omsättning`,
              }))}
              color="#2E463A"
              valueFormatter={(n) => `${n} %`}
            />
          </div>
        </div>
        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">Marginaltrend</h3>
          {data.marginTrend.length === 0 ? (
            <p className="mt-4 text-sm text-mull">
              Ingen försäljning i perioden att beräkna en trend från ännu.
            </p>
          ) : (
            <div className="mt-2">
              <LineChart
                data={data.marginTrend.map((d) => ({ label: d.label, value: d.marginPct }))}
                color="#2E463A"
                valueFormatter={(n) => `${n}%`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">
            Högst marginal (%) — katalog
          </h3>
          <div className="mt-4">
            <BarList
              items={data.topMarginProducts.map((p) => ({ label: p.name, value: p.marginPct }))}
              color="#C08A2B"
              valueFormatter={(n) => `${n} %`}
            />
          </div>
        </div>
        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">
            Lägst marginal (%) — katalog
          </h3>
          <div className="mt-4">
            <BarList
              items={data.bottomMarginProducts.map((p) => ({ label: p.name, value: p.marginPct }))}
              color="#A64B33"
              valueFormatter={(n) => `${n} %`}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">
            Högst täckningsbidrag (perioden)
          </h3>
          <p className="mt-1 text-xs text-mull">Marginal × sålda enheter — inte bara marginal%.</p>
          <div className="mt-4">
            <BarList
              items={data.topContributionProducts.map((p) => ({
                label: p.name,
                value: p.marginAmount,
                sublabel: `${p.unitsSold} sålda enheter`,
              }))}
              color="#2E463A"
              valueFormatter={(n) => formatPrice(n)}
            />
          </div>
        </div>
        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">
            Lägst täckningsbidrag (perioden)
          </h3>
          <p className="mt-1 text-xs text-mull">
            Kan bero på hög marginal% men få sålda enheter, eller tvärtom.
          </p>
          <div className="mt-4">
            <BarList
              items={data.bottomContributionProducts.map((p) => ({
                label: p.name,
                value: p.marginAmount,
                sublabel: `${p.unitsSold} sålda enheter`,
              }))}
              color="#A64B33"
              valueFormatter={(n) => formatPrice(n)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
