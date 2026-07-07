import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/data/productStore";
import { SITE_URL } from "@/lib/seo";

// ---------------------------------------------------------------------------
// Genereras automatiskt av Next.js på /sitemap.xml — inget eget API-anrop
// eller admin-steg krävs. Statiska sidor listas explicit; produktsidorna
// genereras dynamiskt från produktdatan så nya produkter dyker upp här
// automatiskt utan kodändring.
// ---------------------------------------------------------------------------

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/produkter`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/villkor`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/villkor/angerratt`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/integritetspolicy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const productPages: MetadataRoute.Sitemap = getAllProducts().map((product) => ({
    url: `${SITE_URL}/produkt/${product.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...productPages];
}
