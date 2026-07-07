import BarList from "@/components/admin/charts/BarList";
import { formatPrice } from "@/lib/format";
import type { AnalyticsResult } from "@/lib/analytics";

export default function ProductPerformanceSection({ data }: { data: AnalyticsResult["products"] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">Bästsäljare (enheter)</h3>
          <div className="mt-4">
            <BarList
              items={data.bestSellers.map((p) => ({
                label: p.name,
                value: p.units,
                sublabel: formatPrice(p.revenue),
              }))}
              color="#2E463A"
              valueFormatter={(n) => `${n} st`}
            />
          </div>
        </div>
        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">Sämst säljande</h3>
          <div className="mt-4">
            <BarList
              items={data.worstSellers.map((p) => ({
                label: p.name,
                value: p.units,
                sublabel: formatPrice(p.revenue),
              }))}
              color="#A64B33"
              valueFormatter={(n) => `${n} st`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
        <h3 className="font-display text-lg font-semibold text-kol">Försäljning per färgvariant</h3>
        <p className="mt-1 text-xs text-mull">Relevant för framtida inköp — vilka kulörer går bäst.</p>
        <div className="mt-4">
          <BarList
            items={data.colorwaySales.map((c) => ({
              label: `${c.productName} — ${c.colorName}`,
              value: c.units,
            }))}
            color="#8A5A33"
            valueFormatter={(n) => `${n} st`}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-tegel/[0.06] p-5 ring-1 ring-tegel/10">
          <h3 className="font-display text-lg font-semibold text-kol">
            Risk för slut i lager
          </h3>
          <p className="mt-1 text-xs text-mull">
            Lågt lager (≤10 st) och beräknat att ta slut inom 14 dagar i nuvarande takt.
          </p>
          {data.lowStockHighVelocity.length === 0 ? (
            <p className="mt-4 text-sm text-mull">Inga varianter i riskzonen just nu.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.lowStockHighVelocity.map((item, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-2.5 text-sm">
                  <span className="font-medium text-kol">
                    {item.productName} — {item.colorName}
                  </span>
                  <span className="text-tegel">
                    {item.currentStock} st · {item.daysOfStockRemaining} dagar kvar
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl bg-senap/[0.08] p-5 ring-1 ring-senap/20">
          <h3 className="font-display text-lg font-semibold text-kol">Kapitalbindning</h3>
          <p className="mt-1 text-xs text-mull">
            Högt lager (≥30 st) utan någon försäljning i den valda perioden.
          </p>
          {data.highStockLowVelocity.length === 0 ? (
            <p className="mt-4 text-sm text-mull">Inga varianter med bunden kapital just nu.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.highStockLowVelocity.map((item, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-2.5 text-sm">
                  <span className="font-medium text-kol">
                    {item.productName} — {item.colorName}
                  </span>
                  <span className="text-senap-dark">{item.currentStock} st i lager</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white/70 ring-1 ring-kol/5">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-kol/10 text-xs uppercase tracking-wider text-mull">
              <th className="px-5 py-3.5 font-semibold">Produkt / färg</th>
              <th className="px-5 py-3.5 text-right font-semibold">Lager</th>
              <th className="px-5 py-3.5 text-right font-semibold">Sålt i perioden</th>
              <th className="px-5 py-3.5 text-right font-semibold">Takt/dag</th>
              <th className="px-5 py-3.5 text-right font-semibold">Dagar kvar (est.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kol/[0.06]">
            {data.turnover.map((t, i) => (
              <tr key={i} className="hover:bg-linne/40">
                <td className="px-5 py-3 font-medium text-kol">
                  {t.productName} — {t.colorName}
                </td>
                <td className="px-5 py-3 text-right text-mull">{t.currentStock}</td>
                <td className="px-5 py-3 text-right text-mull">{t.unitsSoldInRange}</td>
                <td className="px-5 py-3 text-right text-mull">{t.velocityPerDay}</td>
                <td className="px-5 py-3 text-right text-mull">
                  {t.daysOfStockRemaining ?? "Ingen försäljning i perioden"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
