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
  const product: Product = { ...input, id, slug, updatedAt: new Date().toISOString() };
  writeAll([...all, product]);
  return product;
}

export type UpdateProductResult =
  | { ok: true; product: Product }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "conflict"; current: Product };

/**
 * `expectedUpdatedAt`, om satt, måste matcha produktens nuvarande
 * `updatedAt` — annars avvisas sparandet med `{ok:false, reason:"conflict"}`
 * istället för att tyst skriva över en ändring en annan admin-session redan
 * sparat sedan formuläret laddades (se app/api/admin/products/[id]/route.ts).
 * Produkter som aldrig haft ett `updatedAt` (skapade innan detta skydd
 * fanns) har inget att jämföra mot och accepteras alltid.
 */
export function updateProduct(
  id: string,
  patch: Partial<ProductInput>,
  expectedUpdatedAt?: string
): UpdateProductResult {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const current = all[idx];
  if (expectedUpdatedAt && current.updatedAt && expectedUpdatedAt !== current.updatedAt) {
    return { ok: false, reason: "conflict", current };
  }
  let slug = current.slug;
  if (patch.slug || (patch.name && patch.name !== current.name)) {
    const base = slugify(patch.slug || patch.name || current.name);
    if (base !== current.slug) slug = uniqueSlug(base, all, id);
  }
  const updated: Product = { ...current, ...patch, id, slug, updatedAt: new Date().toISOString() };
  all[idx] = updated;
  writeAll(all);
  return { ok: true, product: updated };
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

/**
 * Justerar lagersaldot för en specifik färgvariant (identifierad på slug +
 * färgnamn, eftersom OrderItem inte har en direkt colorway-referens) med
 * `delta` — positivt vid återläggning efter en retur. Om slug/färg inte
 * längre finns (produkten borttagen eller färgen omdöpt) görs ingenting.
 */
export function adjustColorwayStock(slug: string, colorName: string, delta: number): void {
  const all = readAll();
  const idx = all.findIndex((p) => p.slug === slug);
  if (idx === -1) return;
  const product = all[idx];
  const colorIdx = product.colorways.findIndex((c) => c.name === colorName);
  if (colorIdx === -1) return;
  const colorways = [...product.colorways];
  colorways[colorIdx] = { ...colorways[colorIdx], stock: colorways[colorIdx].stock + delta };
  all[idx] = { ...product, colorways };
  writeAll(all);
}

/**
 * Atomär kontroll-och-minska-operation för en hel orderkorg: läser lagret
 * EN gång, kontrollerar att samtliga rader har täckning, och minskar sedan
 * samtliga i samma skrivning — allt inom en enda synkron funktion (bara
 * synkrona fs-anrop, inget `await` mellan läsning och skrivning).
 *
 * Det där är precis vad som gör den race-safe: Node.js kör JavaScript
 * entrådigt, och synkrona fs-anrop blockerar hela event-loopen tills de är
 * klara. Två requests som "samtidigt" försöker köpa den sista enheten kan
 * alltså aldrig interleava mitt i den här funktionen inom samma process —
 * den ena körs helt klart innan den andra ens börjar. (Detta håller INTE
 * över flera samtidiga serverless-instanser/processer — se filhuvudets
 * OBS om Vercel — men matchar den nivå av garanti hela JSON-fil-lagret
 * redan bygger på, och räcker gott för en enskild instans/lokal drift.)
 *
 * Allt-eller-inget: om NÅGON rad saknar täckning skrivs INGENTING, och ett
 * tydligt fel returneras så anroparen kan visa det i kassan istället för
 * att låta ordern gå igenom med negativt lager.
 */
export function reserveStockForItems(
  items: { slug: string; colorName: string; quantity: number; name?: string }[]
): { ok: true } | { ok: false; error: string } {
  const all = readAll();

  for (const item of items) {
    const product = all.find((p) => p.slug === item.slug);
    const colorway = product?.colorways.find((c) => c.name === item.colorName);
    if (!colorway || colorway.stock < item.quantity) {
      return {
        ok: false,
        error: `${item.name ?? item.slug} (${item.colorName}) finns tyvärr inte i tillräckligt antal längre — lagret har ändrats sedan du lade den i varukorgen.`,
      };
    }
  }

  for (const item of items) {
    const product = all.find((p) => p.slug === item.slug)!;
    const colorway = product.colorways.find((c) => c.name === item.colorName)!;
    colorway.stock -= item.quantity;
  }
  writeAll(all);
  return { ok: true };
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
