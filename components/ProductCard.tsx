import Image from "next/image";
import Link from "next/link";
import YarnImage from "@/components/YarnImage";
import { formatPrice } from "@/lib/format";
import { CATEGORY_LABELS, type Product } from "@/lib/products";

export default function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const allSoldOut = product.colorways.every((c) => c.stock <= 0);
  // Uppladdad Blob-bild optimeras via next/image (vitlistad host i
  // next.config.mjs). Den äldre fritext-URL-overriden kan peka på vilken
  // host som helst, så den körs som vanlig <img> istället.
  const uploadedImageUrl = product.images?.[0]?.url;

  return (
    <Link
      href={`/produkt/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white/70 shadow-mjuk ring-1 ring-kol/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lyft"
    >
      <div className="relative aspect-square overflow-hidden">
        {uploadedImageUrl ? (
          <Image
            src={uploadedImageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"
          />
        ) : product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"
          />
        ) : (
          <YarnImage
            colorway={product.colorways[0]}
            seed={product.slug}
            className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.045]"
          />
        )}
        {allSoldOut && (
          <span className="absolute bottom-4 left-4 rounded-full bg-kol/85 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-krita">
            Slut i lager
          </span>
        )}
        {product.isNew && (
          <span className="absolute left-4 top-4 rounded-full bg-gran px-3 py-1 text-xs font-semibold uppercase tracking-widest text-krita">
            Nyhet
          </span>
        )}
        {product.category === "premium" && (
          <span className="absolute right-4 top-4 rounded-full bg-senap/90 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-kol">
            Premium
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-mull/70">
          {CATEGORY_LABELS[product.category]}
        </p>
        <h3 className="font-display text-xl font-semibold leading-snug text-kol transition-colors group-hover:text-tegel">
          {product.name}
        </h3>
        <p className="line-clamp-1 text-sm text-mull">{product.tagline}</p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <p className="font-display text-lg font-semibold text-kol">
            {formatPrice(product.price)}
            <span className="ml-1 text-xs font-normal text-mull">
              / {product.grams} g
            </span>
          </p>
          <div className="flex -space-x-1.5">
            {product.colorways.slice(0, 4).map((c) => (
              <span
                key={c.name}
                title={c.name}
                className={`h-4 w-4 rounded-full ring-2 ring-krita ${c.stock <= 0 ? "opacity-30" : ""}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            {product.colorways.length > 4 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-linne text-[9px] font-bold text-mull ring-2 ring-krita">
                +{product.colorways.length - 4}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
