import fs from "fs";
import path from "path";
import type { Category, Product, ProductImage } from "@/lib/products";
// Kompileringstida startdata — samma innehåll som data/products.json hade vid
// byggtillfället. Fungerar som fallback om JSON-filen på disk saknas eller
// inte går att tolka (t.ex. första körningen i en ny miljö).
import PRODUCTS_SEED_JSON from "@/data/products.json";

const PRODUCTS_SEED = PRODUCTS_SEED_JSON as unknown as Product[];

// ---------------------------------------------------------------------------
// Produktlager — JSON-fil-baserad, server-only (använder "fs").
//
// Importera ENDAST från route handlers eller server components. Aldrig från
// en "use client"-fil (fs finns inte i webbläsaren) — klientkod som behöver
// produktdata (t.ex. varukorgen) ska hämta via GET /api/products istället.
//
// OBS för produktion: på Vercels serverless-funktioner är filsystemet
// read-only (utom katalogen /tmp, som i sin tur inte delas mellan anrop
// eller instanser). Skrivningar nedan fungerar utmärkt lokalt (npm run dev /
// npm start) men FÖRSVINNER vid nästa deploy eller cold start på Vercel.
//
// Byt ut readAll/writeAll mot en riktig databas (Postgres/Supabase/
// PlanetScale etc.) för produktion — resten av admin-API:t (routes under
// app/api/admin/products) pratar bara med funktionerna i den här filen och
// behöver inte ändras.
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(PRODUCTS_SEED, null, 2));
  }
}

function readAll(): Product[] {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : PRODUCTS_SEED;
  } catch {
    return PRODUCTS_SEED;
  }
}

function writeAll(products: Product[]) {
  ensureFile();
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

export function getAllProducts(): Product[] {
  return readAll();
}

export function getProductBySlug(slug: string): Product | undefined {
  return readAll().find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return readAll().find((p) => p.id === id);
}

export function getProductsByCategory(category: Category): Product[] {
  return readAll().filter((p) => p.category === category);
}

export function getNewProducts(): Product[] {
  return readAll().filter((p) => p.isNew);
}

export function getRelatedProducts(slug: string, count = 4): Product[] {
  const all = readAll();
  const product = all.find((p) => p.slug === slug);
  if (!product) return [];
  const sameCategory = all.filter((p) => p.slug !== slug && p.category === product.category);
  const others = all
    .filter((p) => p.slug !== slug && p.category !== product.category)
    .sort((a, b) => b.popularity - a.popularity);
  return [...sameCategory, ...others].slice(0, count);
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "produkt"
  );
}

function uniqueSlug(base: string, all: Product[], excludeId?: string): string {
  let slug = base;
  let i = 2;
  while (all.some((p) => p.slug === slug && p.id !== excludeId)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export type ProductInput = Omit<Product, "id" | "slug"> & { slug?: string };

export function createProduct(input: ProductInput): Product {
  const all = readAll();
  const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const slug = uniqueSlug(slugify(input.slug || input.name), all);
  const product: Product = { ...input, id, slug };
  writeAll([...all, product]);
  return product;
}

export function updateProduct(id: string, patch: Partial<ProductInput>): Product | null {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const current = all[idx];
  let slug = current.slug;
  if (patch.slug || (patch.name && patch.name !== current.name)) {
    const base = slugify(patch.slug || patch.name || current.name);
    if (base !== current.slug) slug = uniqueSlug(base, all, id);
  }
  const updated: Product = { ...current, ...patch, id, slug };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function deleteProduct(id: string): boolean {
  const all = readAll();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}

/** Lägger till en nyuppladdad bild sist i galleriet (blir huvudbild om det är den första). */
export function addProductImage(id: string, image: ProductImage): Product | null {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated: Product = { ...all[idx], images: [...(all[idx].images ?? []), image] };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

/**
 * Ersätter hela bildordningen (t.ex. efter upp/ner-flytt eller "gör till
 * huvudbild" — index 0 blir alltid huvudbild). Tar bara emot id-ordningen,
 * inte hela objekten, så anroparen inte kan smyga in manipulerade URL:er.
 */
export function reorderProductImages(id: string, orderedIds: string[]): Product | null {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const current = all[idx].images ?? [];
  const byId = new Map(current.map((img) => [img.id, img]));
  const reordered = orderedIds.map((imgId) => byId.get(imgId)).filter((img): img is ProductImage => Boolean(img));
  if (reordered.length !== current.length) return null;
  const updated: Product = { ...all[idx], images: reordered };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

/** Tar bort en bildreferens ur produkten och returnerar den borttagna bilden (för Blob-radering) tillsammans med produkten. */
export function removeProductImage(
  id: string,
  imageId: string
): { product: Product; removed: ProductImage } | null {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const current = all[idx].images ?? [];
  const removed = current.find((img) => img.id === imageId);
  if (!removed) return null;
  const updated: Product = { ...all[idx], images: current.filter((img) => img.id !== imageId) };
  all[idx] = updated;
  writeAll(all);
  return { product: updated, removed };
}
