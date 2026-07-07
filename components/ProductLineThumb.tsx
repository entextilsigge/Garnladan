import YarnImage from "@/components/YarnImage";
import { getPrimaryImageUrl, type Colorway, type Product } from "@/lib/products";

// Liten kvadratisk miniatyr för varukorg/kassa-radlistor. Använder vanlig
// <img> snarare än next/image eftersom källan kan vara antingen en
// Blob-URL eller den äldre fritext-imageUrl-overriden (godtycklig host) —
// i den här storleken ger next/image ingen märkbar optimeringsvinst.
export default function ProductLineThumb({
  product,
  colorway,
  className,
}: {
  product: Product;
  colorway: Colorway;
  className?: string;
}) {
  const imageUrl = getPrimaryImageUrl(product);
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={product.name} className={`object-cover ${className ?? ""}`} />
    );
  }
  return <YarnImage colorway={colorway} seed={product.slug} band={false} className={className} />;
}
