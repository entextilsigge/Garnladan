import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductDetail from "@/components/ProductDetail";
import {
  CATEGORY_LABELS,
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/products";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const product = getProductBySlug(params.slug);
  if (!product) return { title: "Produkten hittades inte" };
  return {
    title: product.name,
    description: `${product.tagline}. ${product.composition}, ${product.meterage} m / ${product.grams} g. Köp hos Garnladan — fri frakt över 499 kr.`,
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug);
  if (!product) notFound();

  const related = getRelatedProducts(params.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Brödsmulor */}
      <nav aria-label="Brödsmulor" className="mb-8 text-sm text-mull">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="transition-colors hover:text-tegel">
              Hem
            </Link>
          </li>
          <li aria-hidden>·</li>
          <li>
            <Link href="/produkter" className="transition-colors hover:text-tegel">
              Allt garn
            </Link>
          </li>
          <li aria-hidden>·</li>
          <li>
            <Link
              href={`/produkter?kategori=${product.category}`}
              className="transition-colors hover:text-tegel"
            >
              {CATEGORY_LABELS[product.category]}
            </Link>
          </li>
          <li aria-hidden>·</li>
          <li className="font-medium text-kol">{product.name}</li>
        </ol>
      </nav>

      <ProductDetail product={product} />

      {/* Relaterade produkter */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl font-bold text-kol sm:text-3xl">
            Passar bra ihop med
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
