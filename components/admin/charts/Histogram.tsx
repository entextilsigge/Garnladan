// Vertikalt stapeldiagram för ordervärdes-histogrammet.

export default function Histogram({
  data,
  color = "#2E463A",
}: {
  data: { bucket: string; count: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex h-[180px] items-end gap-3">
      {data.map((d) => (
        <div key={d.bucket} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-semibold text-kol">{d.count}</span>
          <div
            className="w-full rounded-t-lg transition-all"
            style={{ height: `${Math.max(4, (d.count / max) * 130)}px`, backgroundColor: color }}
          />
          <span className="text-center text-[11px] leading-tight text-mull">{d.bucket}</span>
        </div>
      ))}
    </div>
  );
}
