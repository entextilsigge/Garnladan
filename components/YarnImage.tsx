// Parametrisk produktillustration: en handritad garnhärva i produktens
// faktiska kulör, renderad som SVG. Deterministisk per (seed, färg) så att
// samma produkt alltid ser likadan ut, men varje bild i ett galleri är unik.
// Ersätts enkelt med riktiga produktfoton genom att byta ut denna komponent.

import type { Colorway } from "@/lib/products";

// -- Färghjälpare ------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Blanda färg a mot färg b, t = 0..1 */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** Ljusare (+) eller mörkare (−) nyans av en färg */
function shade(hex: string, amount: number): string {
  return amount >= 0 ? mix(hex, "#FFF9EE", amount) : mix(hex, "#241C14", -amount);
}

// -- Deterministisk slump ----------------------------------------------------

function seededRandom(seed: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// -- Härva -------------------------------------------------------------------

interface YarnImageProps {
  colorway: Colorway;
  /** Gör varje rendering unik men stabil, t.ex. produkt-slug */
  seed: string;
  /** "skein" = härva, "detail" = närbild på stickad yta */
  variant?: "skein" | "detail";
  /** Visa pappersbanderoll med varumärke */
  band?: boolean;
  className?: string;
}

export default function YarnImage({
  colorway,
  seed,
  variant = "skein",
  band = true,
  className,
}: YarnImageProps) {
  const rnd = seededRandom(`${seed}-${colorway.name}`);
  const yarn = colorway.hex;
  const bg = mix(yarn, "#F3EBDC", 0.88);
  const bgDeep = mix(yarn, "#E6DAC4", 0.8);

  if (variant === "detail") {
    return (
      <svg
        viewBox="0 0 480 480"
        className={className}
        role="img"
        aria-label={`Närbild på stickad yta i ${colorway.name}`}
      >
        <rect width="480" height="480" fill={mix(yarn, "#F3EBDC", 0.15)} />
        {Array.from({ length: 14 }).map((_, row) =>
          Array.from({ length: 12 }).map((__, col) => {
            const x = col * 44 - 20 + (row % 2 === 0 ? 0 : 0);
            const y = row * 38 - 12;
            const tone = shade(yarn, (rnd() - 0.55) * 0.45);
            return (
              <path
                key={`${row}-${col}`}
                d={`M ${x} ${y + 30} C ${x + 6} ${y + 6}, ${x + 16} ${y}, ${x + 22} ${y + 16} C ${x + 28} ${y}, ${x + 38} ${y + 6}, ${x + 44} ${y + 30}`}
                fill="none"
                stroke={tone}
                strokeWidth={13}
                strokeLinecap="round"
              />
            );
          })
        )}
        <rect width="480" height="480" fill="url(#detailVignette)" opacity="0.5" />
        <defs>
          <radialGradient id="detailVignette" cx="50%" cy="42%" r="75%">
            <stop offset="55%" stopColor="#241C14" stopOpacity="0" />
            <stop offset="100%" stopColor="#241C14" stopOpacity="0.28" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  // Härvans lager av trådar. Ankarpunkterna varieras i både x- och y-led så
  // härvan blir fyllig och organisk istället för en spetsig ellips. Det inre
  // lagret ("inner") har mindre bågar och fyller härvans mitt.
  const strands = Array.from({ length: 40 }).map((_, i) => {
    const inner = i < 16;
    const spreadTop = inner ? [168, 52] : [116, 66];
    const spreadBot = inner ? [268, 48] : [316, 62];
    const left = (inner ? 108 : 78) + rnd() * 30;
    const right = (inner ? 372 : 402) - rnd() * 30;
    const leftY = 226 + rnd() * 40;
    const rightY = 226 + rnd() * 40;
    const topY = spreadTop[0] + rnd() * spreadTop[1];
    const topY2 = spreadTop[0] + rnd() * spreadTop[1];
    const botY = spreadBot[0] + rnd() * spreadBot[1];
    const botY2 = spreadBot[0] + rnd() * spreadBot[1];
    const rot = (rnd() - 0.5) * 10;
    const width = 11 + rnd() * 8;
    const tone = shade(yarn, (rnd() - 0.48) * 0.42);
    return { i, left, right, leftY, rightY, topY, topY2, botY, botY2, rot, width, tone };
  });

  return (
    <svg
      viewBox="0 0 480 480"
      className={className}
      role="img"
      aria-label={`Garnhärva i färgen ${colorway.name}`}
    >
      <rect width="480" height="480" fill={bg} />
      <rect width="480" height="480" fill="url(#bgGlow)" />
      {/* Skugga under härvan */}
      <ellipse cx="242" cy="408" rx="160" ry="20" fill="#241C14" opacity="0.1" />
      {/* Solid basform så härvan känns fyllig, inte trådig */}
      <ellipse cx="240" cy="248" rx="154" ry="106" fill={shade(yarn, -0.14)} />
      {/* Trådarna */}
      <g>
        {strands.map((s) => (
          <path
            key={s.i}
            d={`M ${s.left} ${s.leftY} C ${s.left + 56} ${s.topY}, ${s.right - 56} ${s.topY2}, ${s.right} ${s.rightY} C ${s.right - 56} ${s.botY}, ${s.left + 56} ${s.botY2}, ${s.left} ${s.leftY} Z`}
            fill="none"
            stroke={s.tone}
            strokeWidth={s.width}
            strokeLinecap="round"
            transform={`rotate(${s.rot} 240 248)`}
          />
        ))}
      </g>
      {/* Mjuk highlight ovanpå trådarna */}
      <ellipse cx="200" cy="196" rx="120" ry="52" fill="#FFF9EE" opacity="0.14" />
      {/* Pappersbanderoll */}
      {band && (
        <g transform="rotate(-2 240 244)">
          <rect
            x="207"
            y="158"
            width="66"
            height="172"
            rx="5"
            fill="#F7F2E8"
            stroke="#241C14"
            strokeOpacity="0.12"
          />
          <rect x="207" y="158" width="66" height="172" rx="5" fill="url(#bandShade)" />
          <text
            x="246"
            y="244"
            fill="#241C14"
            fillOpacity="0.72"
            fontSize="15"
            fontFamily="Georgia, serif"
            letterSpacing="4"
            textAnchor="middle"
            transform="rotate(90 240 244)"
          >
            GARNLADAN
          </text>
          <line
            x1="215"
            y1="310"
            x2="265"
            y2="310"
            stroke={shade(yarn, -0.1)}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      )}
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="34%" r="80%">
          <stop offset="0%" stopColor="#FFF9EE" stopOpacity="0.55" />
          <stop offset="60%" stopColor={bgDeep} stopOpacity="0" />
          <stop offset="100%" stopColor="#241C14" stopOpacity="0.09" />
        </radialGradient>
        <linearGradient id="bandShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#241C14" stopOpacity="0.09" />
          <stop offset="18%" stopColor="#241C14" stopOpacity="0" />
          <stop offset="82%" stopColor="#241C14" stopOpacity="0" />
          <stop offset="100%" stopColor="#241C14" stopOpacity="0.09" />
        </linearGradient>
      </defs>
    </svg>
  );
}
