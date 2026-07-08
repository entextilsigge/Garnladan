import type { Metadata } from "next";
import ProductListing from "@/components/ProductListing";
import { getAllProducts } from "@/lib/data/productStore";
import { CATEGORY_LABELS, type Category } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Allt garn — sortiment",
  description:
    "Utforska hela Garnladans sortiment: svensk ull, ekologisk bomull, sockgarn och exklusiva kvaliteter som mohair och kashmir. Filtrera på material, tjocklek och färg.",
  // Sidan kan nås med filter-/sorterings-querysträngar (?kategori=…&sort=…)
  // — canonical pekar alltid på bas-URL:en så de inte räknas som separat
  // innehåll.
  alternates: { canonical: "/produkter" },
};

const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
const VALID_SORTS = ["popularitet", "nyheter", "pris-stigande", "pris-fallande"] as const;

export default async function ProductsPage(
  props: {
    searchParams: Promise<{ kategori?: string; sortering?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const category = VALID_CATEGORIES.includes(searchParams.kategori as Category)
    ? (searchParams.kategori as Category)
    : undefined;
  const sort = VALID_SORTS.includes(searchParams.sortering as (typeof VALID_SORTS)[number])
    ? (searchParams.sortering as (typeof VALID_SORTS)[number])
    : undefined;
  const products = await getAllProducts();

  return (
    <>
      <section className="knit-texture-dark bg-linne/60">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-tegel">
            Sortimentet
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold text-kol sm:text-5xl">
            {category ? CATEGORY_LABELS[category] : "Allt garn"}
          </h1>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-mull">
            Varje kvalitet är provstickad i ladan innan den får plats här.
            Filtrera på material, tjocklek och färg — eller strosa runt som
            i butiken.
          </p>
        </div>
      </section>
      <div className="pt-8">
        <ProductListing
          key={`${category ?? "alla"}-${sort ?? "std"}`}
          products={products}
          initialCategory={category}
          initialSort={sort}
        />
      </div>
    </>
  );
}
