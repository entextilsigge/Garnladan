import BarList from "@/components/admin/charts/BarList";
import Histogram from "@/components/admin/charts/Histogram";
import { formatPrice } from "@/lib/format";
import type { AnalyticsResult } from "@/lib/analytics";

export default function CustomersSection({ data }: { data: AnalyticsResult["customers"] }) {
  const { newVsReturning, geo, orderValueHistogram, frequency } = data;
  const totalCustomerRevenue = newVsReturning.newRevenue + newVsReturning.returningRevenue;
  const newSharePct =
    totalCustomerRevenue > 0 ? Math.round((newVsReturning.newRevenue / totalCustomerRevenue) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">Nya vs. återkommande</h3>
          <div className="mt-4 flex items-center gap-6">
            <div>
              <p className="font-display text-3xl font-bold text-kol">{newVsReturning.newCustomers}</p>
              <p className="text-xs text-mull">nya kunder · {formatPrice(newVsReturning.newRevenue)}</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-kol">
                {newVsReturning.returningCustomers}
              </p>
              <p className="text-xs text-mull">
                återkommande · {formatPrice(newVsReturning.returningRevenue)}
              </p>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-linne">
            <div className="h-full bg-senap" style={{ width: `${newSharePct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-mull">
            {newSharePct}% av omsättningen i perioden kom från nya kunder.
          </p>
        </div>

        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">Köpfrekvens</h3>
          <p className="mt-1 text-xs text-mull">
            Klassificerat på kundens totala orderhistorik, bland kunder aktiva i perioden.
          </p>
          <div className="mt-4 flex items-center gap-6">
            <div>
              <p className="font-display text-3xl font-bold text-kol">{frequency.oneTime}</p>
              <p className="text-xs text-mull">engångsköpare</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-kol">{frequency.repeat}</p>
              <p className="text-xs text-mull">kunder med 2+ ordrar</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">Geografisk fördelning</h3>
          <p className="mt-1 text-xs text-mull">Baserat på ort från leveransadressen.</p>
          <div className="mt-4">
            <BarList
              items={geo.map((g) => ({ label: g.place, value: g.orders, sublabel: formatPrice(g.revenue) }))}
              color="#4D6478"
              valueFormatter={(n) => `${n} ordrar`}
            />
          </div>
        </div>
        <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
          <h3 className="font-display text-lg font-semibold text-kol">Fördelning av ordervärden</h3>
          <div className="mt-6">
            <Histogram data={orderValueHistogram} color="#2E463A" />
          </div>
        </div>
      </div>
    </div>
  );
}
