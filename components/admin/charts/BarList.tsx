// Horisontell stapellista för topplistor (bästsäljare, marginal m.m.).
// Serverkomponent-vänlig (ingen "use client" behövs, inga event handlers).

interface BarItem {
  label: string;
  value: number;
  sublabel?: string;
}

export default function BarList({
  items,
  color = "#A64B33",
  valueFormatter = (n: number) => String(n),
}: {
  items: BarItem[];
  color?: string;
  valueFormatter?: (n: number) => string;
}) {
  if (items.length === 0) {
    return <p className="py-4 text-sm text-mull">Ingen data att visa.</p>;
  }

  const maxAbs = Math.max(...items.map((i) => Math.abs(i.value)), 1);

  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-kol">{item.label}</span>
            <span className="shrink-0 font-display font-semibold text-kol">
              {valueFormatter(item.value)}
            </span>
          </div>
          {item.sublabel && <p className="text-xs text-mull">{item.sublabel}</p>}
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-linne">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(3, (Math.abs(item.value) / maxAbs) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
