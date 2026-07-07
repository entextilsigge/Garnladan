import CampaignManager from "@/components/admin/CampaignManager";
import { formatPrice } from "@/lib/format";
import type { AnalyticsResult } from "@/lib/analytics";
import type { Campaign } from "@/lib/data/campaignStore";

export default function MarketingSection({
  data,
  campaigns,
  onCampaignsChange,
}: {
  data: AnalyticsResult["marketing"];
  campaigns: Campaign[];
  onCampaignsChange: (next: Campaign[]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-2xl bg-white/70 ring-1 ring-kol/5">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-kol/10 text-xs uppercase tracking-wider text-mull">
              <th className="px-5 py-3.5 font-semibold">Källa</th>
              <th className="px-5 py-3.5 font-semibold">Medium</th>
              <th className="px-5 py-3.5 font-semibold">Kampanj</th>
              <th className="px-5 py-3.5 text-right font-semibold">Ordrar</th>
              <th className="px-5 py-3.5 text-right font-semibold">Omsättning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kol/[0.06]">
            {data.bySource.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-mull">
                  Ingen försäljning i perioden att bryta ner ännu.
                </td>
              </tr>
            ) : (
              data.bySource.map((s, i) => (
                <tr key={i} className="hover:bg-linne/40">
                  <td className="px-5 py-3 font-medium text-kol">{s.source}</td>
                  <td className="px-5 py-3 text-mull">{s.medium}</td>
                  <td className="px-5 py-3 text-mull">{s.campaign}</td>
                  <td className="px-5 py-3 text-right text-mull">{s.orders}</td>
                  <td className="px-5 py-3 text-right font-medium text-kol">{formatPrice(s.revenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CampaignManager campaigns={campaigns} onChange={onCampaignsChange} />

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold text-kol">Kampanjresultat</h3>
        {data.campaigns.length === 0 ? (
          <p className="rounded-2xl bg-white/70 px-5 py-6 text-sm text-mull ring-1 ring-kol/5">
            Inga kampanjer registrerade — lägg till en i kampanjregistret ovan för att se
            resultat här.
          </p>
        ) : (
          <div className="space-y-3">
            {data.campaigns.map((c) => (
              <div key={c.id} className="rounded-2xl bg-white/70 p-5 ring-1 ring-kol/5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-base font-semibold text-kol">
                    {c.name} <span className="text-xs font-normal text-mull">· {c.channel}</span>
                  </p>
                  <p className="text-xs text-mull">
                    {c.startDate} – {c.endDate}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-mull">Attribuerade ordrar</p>
                    <p className="font-display text-lg font-bold text-kol">{c.attributedOrders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-mull">Attribuerad omsättning</p>
                    <p className="font-display text-lg font-bold text-kol">
                      {formatPrice(c.attributedRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-mull">Siteomsättning under vs. innan</p>
                    <p className="font-display text-lg font-bold text-kol">
                      {c.liftPct === null ? "Otillräcklig data" : `${c.liftPct > 0 ? "+" : ""}${c.liftPct}%`}
                    </p>
                    <p className="text-[11px] text-mull">
                      {formatPrice(c.siteWideDuringRevenue)} vs. {formatPrice(c.siteWideBeforeRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-mull">ROI (omsättning / budget)</p>
                    <p className="font-display text-lg font-bold text-kol">
                      {c.roi === null ? "Ingen budget angiven" : `${c.roi}×`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
