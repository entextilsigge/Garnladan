"use client";

// Handrullad SVG-linjediagram — inget nytt chart-bibliotek, i linje med hur
// resten av sajten (t.ex. YarnImage) redan bygger egna SVG:er istället för
// att dra in tunga beroenden för relativt enkla visualiseringar.

interface Point {
  label: string;
  value: number;
}

export default function LineChart({
  data,
  color = "#A64B33",
  height = 200,
  valueFormatter = (n: number) => String(n),
}: {
  data: Point[];
  color?: string;
  height?: number;
  valueFormatter?: (n: number) => string;
}) {
  const width = 720;
  const padding = { top: 16, right: 16, bottom: 28, left: 56 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-mull">
        Ingen data att visa
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const x = (i: number) => (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => innerH - ((v - minValue) / range) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.value)}`).join(" ");
  const areaPath = `${linePath} L ${x(data.length - 1)} ${innerH} L ${x(0)} ${innerH} Z`;

  // Visa max ~7 x-axeletiketter så det inte blir en oläslig vägg av text
  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Trenddiagram">
      <g transform={`translate(${padding.left},${padding.top})`}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={0} x2={innerW} y1={innerH * f} y2={innerH * f} stroke="#241C14" strokeOpacity="0.06" />
            <text x={-8} y={innerH * f} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#5E4C3A">
              {valueFormatter(round1(maxValue - range * f))}
            </text>
          </g>
        ))}
        <path d={areaPath} fill={color} fillOpacity="0.12" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.value)} r={data.length > 40 ? 0 : 2.5} fill={color} />
        ))}
        {data.map((d, i) =>
          i % labelStep === 0 ? (
            <text key={i} x={x(i)} y={innerH + 18} textAnchor="middle" fontSize="10" fill="#5E4C3A">
              {d.label}
            </text>
          ) : null
        )}
      </g>
    </svg>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
