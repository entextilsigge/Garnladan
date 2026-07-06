import Link from "next/link";
import Newsletter from "@/components/Newsletter";
import ProductCard from "@/components/ProductCard";
import YarnImage from "@/components/YarnImage";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  getAllProducts,
  getNewProducts,
  getProductBySlug,
  type Category,
} from "@/lib/products";

const HERO_SKEINS: { slug: string; colorIndex: number; className: string }[] = [
  { slug: "faro-svensk-ull", colorIndex: 0, className: "rotate-[-6deg]" },
  { slug: "silkesmanen-mohair", colorIndex: 3, className: "translate-y-8 rotate-[4deg]" },
  { slug: "visby-merino", colorIndex: 0, className: "translate-y-3 rotate-[-2deg]" },
  { slug: "havtorn-silkesmerino", colorIndex: 2, className: "translate-y-12 rotate-[7deg]" },
];

const CATEGORIES: Category[] = ["ull", "bomull", "blandgarn", "premium"];

const CATEGORY_TINTS: Record<Category, string> = {
  ull: "bg-tegel/[0.07]",
  bomull: "bg-senap/[0.09]",
  blandgarn: "bg-gran/[0.07]",
  premium: "bg-cognac/[0.09]",
};

const CATEGORY_SKEINS: Record<Category, { slug: string; colorIndex: number }> = {
  ull: { slug: "faro-svensk-ull", colorIndex: 2 },
  bomull: { slug: "oland-bomull", colorIndex: 1 },
  blandgarn: { slug: "vardag-sockgarn", colorIndex: 1 },
  premium: { slug: "kashmirdrom", colorIndex: 1 },
};

export default function HomePage() {
  const newProducts = getNewProducts().slice(0, 4);
  const popular = [...getAllProducts()]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 4);

  return (
    <>
      {/* ---------------------------------------------------------- Hero -- */}
      <section className="knit-texture-dark relative overflow-hidden bg-linne">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-tegel">
              Garnbutik i Leksand sedan 2012
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight text-kol sm:text-5xl lg:text-6xl">
              Garn med själ,
              <br />
              <em className="italic text-tegel">från ladan</em> till
              <br />
              dina händer.
            </h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-mull">
              Svensk ull, ekologisk bomull och en och annan härva ren lyx.
              Vi väljer varje kvalitet för hand — så att det du stickar
              blir något att ärva.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/produkter"
                className="rounded-full bg-kol px-8 py-4 text-sm font-semibold text-krita transition-all hover:bg-tegel hover:shadow-lyft active:scale-95"
              >
                Utforska sortimentet
              </Link>
              <Link
                href="/produkter?kategori=premium"
                className="rounded-full border border-kol/20 bg-krita/60 px-8 py-4 text-sm font-semibold text-kol transition-all hover:border-tegel hover:text-tegel active:scale-95"
              >
                Upptäck premium
              </Link>
            </div>
          </div>
          <div className="relative mx-auto grid w-full max-w-lg grid-cols-4 gap-3 lg:max-w-none">
            {HERO_SKEINS.map(({ slug, colorIndex, className }, i) => {
              const product = getProductBySlug(slug)!;
              const colorway = product.colorways[colorIndex] ?? product.colorways[0];
              return (
                <Link
                  key={slug}
                  href={`/produkt/${slug}`}
                  className={`group overflow-hidden rounded-2xl shadow-mjuk ring-1 ring-kol/10 transition-all duration-300 hover:z-10 hover:scale-105 hover:shadow-lyft ${className}`}
                  style={{ animationDelay: `${i * 90}ms` }}
                  title={`${product.name} — ${colorway.name}`}
                >
                  <YarnImage
                    colorway={colorway}
                    seed={`hero-${slug}`}
                    className="h-full w-full"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- Kategorier -- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-tegel">
              Sortimentet
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-kol sm:text-4xl">
              Hitta ditt nästa garn
            </h2>
          </div>
          <Link
            href="/produkter"
            className="hidden shrink-0 text-sm font-medium text-tegel underline-offset-4 transition-all hover:underline sm:block"
          >
            Visa allt garn →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const skein = CATEGORY_SKEINS[cat];
            const product = getProductBySlug(skein.slug)!;
            const colorway = product.colorways[skein.colorIndex] ?? product.colorways[0];
            return (
              <Link
                key={cat}
                href={`/produkter?kategori=${cat}`}
                className={`group flex flex-col justify-between overflow-hidden rounded-3xl p-6 ring-1 ring-kol/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lyft ${CATEGORY_TINTS[cat]}`}
              >
                <div>
                  <h3 className="font-display text-2xl font-semibold text-kol transition-colors group-hover:text-tegel">
                    {CATEGORY_LABELS[cat]}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-mull">
                    {CATEGORY_DESCRIPTIONS[cat]}
                  </p>
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <span className="text-sm font-medium text-tegel opacity-0 transition-all duration-300 group-hover:opacity-100">
                    Handla →
                  </span>
                  <div className="h-24 w-24 overflow-hidden rounded-2xl shadow-mjuk transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                    <YarnImage
                      colorway={colorway}
                      seed={`kategori-${cat}`}
                      band={false}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------------------- Nyheter -- */}
      <section className="knit-texture-dark bg-linne/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-tegel">
                Nytt i ladan
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold text-kol sm:text-4xl">
                Säsongens nykomlingar
              </h2>
            </div>
            <Link
              href="/produkter?sortering=nyheter"
              className="hidden shrink-0 text-sm font-medium text-tegel underline-offset-4 transition-all hover:underline sm:block"
            >
              Alla nyheter →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {newProducts.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Om Garnladan -- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-tegel">
              Om Garnladan
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-kol sm:text-4xl">
              En röd lada, tolv år av garn
              <br className="hidden sm:block" /> och en enda regel:
              <em className="italic text-tegel"> det ska kännas i handen.</em>
            </h2>
            <div className="mt-6 max-w-xl space-y-4 text-[16px] leading-relaxed text-mull">
              <p>
                Garnladan började 2012 i en faluröd lada utanför Leksand, med
                trettio härvor svensk ull och en övertygelse: garn köper man
                inte med ögonen, utan med fingertopparna. Därför provstickar
                vi varenda kvalitet innan den får plats på hyllorna.
              </p>
              <p>
                Idag skickar vi garn över hela Sverige — men varje beställning
                packas fortfarande för hand i ladan, med ett handskrivet tack
                och en liten bit garn att provsticka ur nästa favorit.
              </p>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-4">
              {[
                ["12 år", "i branschen"],
                ["20+", "utvalda kvaliteter"],
                ["24 h", "packat & klart"],
              ].map(([big, small]) => (
                <div
                  key={small}
                  className="rounded-2xl bg-linne/70 px-4 py-5 text-center ring-1 ring-kol/5"
                >
                  <p className="font-display text-2xl font-bold text-tegel">{big}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-mull">
                    {small}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            {popular.slice(0, 2).map((p, i) => (
              <div
                key={p.slug}
                className={`overflow-hidden rounded-3xl shadow-mjuk ring-1 ring-kol/5 ${i === 1 ? "translate-y-8" : ""}`}
              >
                <YarnImage
                  colorway={p.colorways[i % p.colorways.length]}
                  seed={`om-${p.slug}`}
                  className="h-full w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Populärt -- */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-tegel">
              Kundfavoriter
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-kol sm:text-4xl">
              Mest älskade just nu
            </h2>
          </div>
          <Link
            href="/produkter?sortering=popularitet"
            className="hidden shrink-0 text-sm font-medium text-tegel underline-offset-4 transition-all hover:underline sm:block"
          >
            Visa alla →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      <Newsletter />
    </>
  );
}
