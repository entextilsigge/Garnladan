import type { Category, Colorway, Product, ProductImage } from "@/lib/products";
import { getSupabaseAnonClient, getSupabaseServiceClient, throwIfSupabaseError } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Produktlager — Supabase Postgres (uppdrag 13; ersätter den tidigare
// JSON-fil-baserade lagringen, som kraschade med EROFS på Vercels
// skrivskyddade serverless-filsystem i produktion).
//
// Publika LÄSNINGAR (produktlistning, produktsida, sitemap) går via
// anon-klienten och respekterar RLS (bara SELECT tillåtet, se
// supabase/migrations/0001_initial_schema.sql). ALL SKRIVNING (admin-CRUD,
// lagerjusteringar) går via service-role-klienten, som bara får anropas
// server-side.
//
// Alla funktioner är nu async (nätverksanrop till Postgres istället för
// synkrona fs-anrop) — varje anropsställe i appen har uppdaterats med
// await i samma commit-serie.
// ---------------------------------------------------------------------------

interface ProductVariantRow {
  id: string;
  name: string;
  hex: string;
  color_group: string;
  stock: number;
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number;
  tagline: string;
  description: string;
  composition: string;
  fibers: string[];
  weight_class: string;
  meterage: number;
  grams: number;
  needle_size: string;
  gauge: string;
  care: string;
  is_new: boolean;
  popularity: number;
  image_url: string | null;
  images: ProductImage[];
  version: number;
  updated_at: string;
  product_variants: ProductVariantRow[];
}

const PRODUCT_SELECT = "*, product_variants(*)";

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as Category,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : undefined,
    costPrice: Number(row.cost_price),
    tagline: row.tagline,
    description: row.description,
    composition: row.composition,
    fibers: row.fibers as Product["fibers"],
    weightClass: row.weight_class as Product["weightClass"],
    meterage: row.meterage,
    grams: row.grams,
    needleSize: row.needle_size,
    gauge: row.gauge,
    care: row.care,
    isNew: row.is_new,
    popularity: row.popularity,
    imageUrl: row.image_url ?? undefined,
    images: row.images ?? [],
    updatedAt: row.updated_at,
    colorways: (row.product_variants ?? []).map(
      (v): Colorway => ({
        name: v.name,
        hex: v.hex,
        group: v.color_group as Colorway["group"],
        stock: v.stock,
      })
    ),
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await getSupabaseAnonClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .order("popularity", { ascending: false });
  throwIfSupabaseError(error);
  return (data as unknown as ProductRow[]).map(rowToProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const { data, error } = await getSupabaseAnonClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  throwIfSupabaseError(error);
  return data ? rowToProduct(data as unknown as ProductRow) : undefined;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const { data, error } = await getSupabaseServiceClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();
  throwIfSupabaseError(error);
  return data ? rowToProduct(data as unknown as ProductRow) : undefined;
}

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  const { data, error } = await getSupabaseAnonClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("category", category)
    .order("popularity", { ascending: false });
  throwIfSupabaseError(error);
  return (data as unknown as ProductRow[]).map(rowToProduct);
}

export async function getNewProducts(): Promise<Product[]> {
  const { data, error } = await getSupabaseAnonClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_new", true)
    .order("popularity", { ascending: false });
  throwIfSupabaseError(error);
  return (data as unknown as ProductRow[]).map(rowToProduct);
}

export async function getRelatedProducts(slug: string, count = 4): Promise<Product[]> {
  const all = await getAllProducts();
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

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let i = 2;
  for (;;) {
    let query = getSupabaseServiceClient().from("products").select("id").eq("slug", slug);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query.maybeSingle();
    throwIfSupabaseError(error);
    if (!data) return slug;
    slug = `${base}-${i++}`;
  }
}

export type ProductInput = Omit<Product, "id" | "slug"> & { slug?: string };

function productInputToRow(input: ProductInput) {
  return {
    name: input.name,
    category: input.category,
    price: input.price,
    compare_at_price: input.compareAtPrice ?? null,
    cost_price: input.costPrice,
    tagline: input.tagline,
    description: input.description,
    composition: input.composition,
    fibers: input.fibers,
    weight_class: input.weightClass,
    meterage: input.meterage,
    grams: input.grams,
    needle_size: input.needleSize,
    gauge: input.gauge,
    care: input.care,
    is_new: Boolean(input.isNew),
    popularity: input.popularity,
    image_url: input.imageUrl || null,
  };
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const slug = await uniqueSlug(slugify(input.slug || input.name));
  const client = getSupabaseServiceClient();

  const { data: productRow, error: productError } = await client
    .from("products")
    .insert({ ...productInputToRow(input), slug })
    .select()
    .single();
  throwIfSupabaseError(productError);

  if (input.colorways.length > 0) {
    const { error: variantsError } = await client.from("product_variants").insert(
      input.colorways.map((c) => ({
        product_id: productRow.id,
        name: c.name,
        hex: c.hex,
        color_group: c.group,
        stock: c.stock,
      }))
    );
    throwIfSupabaseError(variantsError);
  }

  const created = await getProductById(productRow.id);
  return created!;
}

export type UpdateProductResult =
  | { ok: true; product: Product }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "conflict"; current: Product };

/**
 * `expectedUpdatedAt`, om satt, jämförs mot produktens nuvarande version i
 * en atomär `UPDATE ... WHERE id = $1 AND version = $2` — matchar den
 * inte (en annan admin-session har redan sparat en ändring sedan
 * formuläret laddades) returneras `reason: "conflict"` istället för att
 * skriva över den andras ändring. Produkter utan tidigare updatedAt
 * (borde inte förekomma efter migreringen, men skyddar ändå) accepteras
 * alltid.
 */
export async function updateProduct(
  id: string,
  patch: Partial<ProductInput>,
  expectedUpdatedAt?: string
): Promise<UpdateProductResult> {
  const client = getSupabaseServiceClient();
  const current = await getProductById(id);
  if (!current) return { ok: false, reason: "not_found" };

  if (expectedUpdatedAt && current.updatedAt && expectedUpdatedAt !== current.updatedAt) {
    return { ok: false, reason: "conflict", current };
  }

  let slug = current.slug;
  if (patch.slug || (patch.name && patch.name !== current.name)) {
    const base = slugify(patch.slug || patch.name || current.name);
    if (base !== current.slug) slug = await uniqueSlug(base, id);
  }

  const merged: ProductInput = { ...current, ...patch };
  const row = { ...productInputToRow(merged), slug, updated_at: new Date().toISOString() };

  let query = client.from("products").update(row).eq("id", id);
  if (expectedUpdatedAt && current.updatedAt) {
    query = query.eq("updated_at", expectedUpdatedAt);
  }
  const { data: updatedRows, error } = await query.select("id");
  throwIfSupabaseError(error);

  if (!updatedRows || updatedRows.length === 0) {
    // Någon annan hann skriva mellan vår läsning ovan och denna UPDATE.
    const latest = await getProductById(id);
    return { ok: false, reason: "conflict", current: latest ?? current };
  }

  if (patch.colorways) {
    // Enklast korrekta sättet att synka en hel array av varianter: ta bort
    // alla nuvarande och infoga de nya i samma anrop-serie. Produktens id
    // (foreign key) ändras aldrig, så existerande order-rader (som
    // refererar till slug + färgnamn, inte variant-id) påverkas inte.
    const { error: deleteError } = await client.from("product_variants").delete().eq("product_id", id);
    throwIfSupabaseError(deleteError);
    const { error: insertError } = await client.from("product_variants").insert(
      patch.colorways.map((c) => ({
        product_id: id,
        name: c.name,
        hex: c.hex,
        color_group: c.group,
        stock: c.stock,
      }))
    );
    throwIfSupabaseError(insertError);
  }

  const updated = await getProductById(id);
  return { ok: true, product: updated! };
}

export async function deleteProduct(id: string): Promise<boolean> {
  const { error, count } = await getSupabaseServiceClient()
    .from("products")
    .delete({ count: "exact" })
    .eq("id", id);
  throwIfSupabaseError(error);
  return (count ?? 0) > 0;
}

/** Lägger till en nyuppladdad bild sist i galleriet (blir huvudbild om det är den första). */
export async function addProductImage(id: string, image: ProductImage): Promise<Product | null> {
  const current = await getProductById(id);
  if (!current) return null;
  const images = [...(current.images ?? []), image];
  const { error } = await getSupabaseServiceClient().from("products").update({ images }).eq("id", id);
  throwIfSupabaseError(error);
  return getProductById(id) as Promise<Product>;
}

/**
 * Ersätter hela bildordningen (t.ex. efter upp/ner-flytt eller "gör till
 * huvudbild" — index 0 blir alltid huvudbild). Tar bara emot id-ordningen,
 * inte hela objekten, så anroparen inte kan smyga in manipulerade URL:er.
 */
export async function reorderProductImages(id: string, orderedIds: string[]): Promise<Product | null> {
  const current = await getProductById(id);
  if (!current) return null;
  const byId = new Map((current.images ?? []).map((img) => [img.id, img]));
  const reordered = orderedIds.map((imgId) => byId.get(imgId)).filter((img): img is ProductImage => Boolean(img));
  if (reordered.length !== (current.images ?? []).length) return null;
  const { error } = await getSupabaseServiceClient()
    .from("products")
    .update({ images: reordered })
    .eq("id", id);
  throwIfSupabaseError(error);
  return getProductById(id) as Promise<Product>;
}

/** Tar bort en bildreferens ur produkten och returnerar den borttagna bilden (för Blob-radering) tillsammans med produkten. */
export async function removeProductImage(
  id: string,
  imageId: string
): Promise<{ product: Product; removed: ProductImage } | null> {
  const current = await getProductById(id);
  if (!current) return null;
  const removed = (current.images ?? []).find((img) => img.id === imageId);
  if (!removed) return null;
  const images = (current.images ?? []).filter((img) => img.id !== imageId);
  const { error } = await getSupabaseServiceClient().from("products").update({ images }).eq("id", id);
  throwIfSupabaseError(error);
  const product = await getProductById(id);
  return { product: product!, removed };
}

/**
 * Justerar lagersaldot för en specifik färgvariant (identifierad på slug +
 * färgnamn, eftersom OrderItem inte har en direkt colorway-referens) med
 * `delta` — positivt vid återläggning efter en retur. Om slug/färg inte
 * längre finns (produkten borttagen eller färgen omdöpt) görs ingenting.
 *
 * Egen liten atomär operation (inte via reserve_stock-funktionen, som är
 * till för allt-eller-inget-kontroller vid köp) — behöver bara hitta rätt
 * rad och addera deltat, ingen "räcker lagret"-kontroll relevant här
 * (återläggning kan aldrig göra lagret negativt).
 */
export async function adjustColorwayStock(slug: string, colorName: string, delta: number): Promise<void> {
  const client = getSupabaseServiceClient();
  const { data: product, error: productError } = await client
    .from("products")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  throwIfSupabaseError(productError);
  if (!product) return;

  const { data: variant, error: variantError } = await client
    .from("product_variants")
    .select("id, stock")
    .eq("product_id", product.id)
    .eq("name", colorName)
    .maybeSingle();
  throwIfSupabaseError(variantError);
  if (!variant) return;

  const { error: updateError } = await client
    .from("product_variants")
    .update({ stock: variant.stock + delta })
    .eq("id", variant.id);
  throwIfSupabaseError(updateError);
}

/**
 * Atomär kontroll-och-minska-operation för en hel orderkorg, via Postgres-
 * funktionen `reserve_stock` (se supabase/migrations/0001_initial_schema.sql)
 * — verifierar samtliga rader (med radlås, FOR UPDATE) INNAN någon
 * skrivning görs, och antingen committar allt eller inget. Genuint atomärt
 * på databasnivå, till skillnad från den tidigare fil-baserade lösningen
 * som bara var race-safe inom en enskild process/instans.
 */
export async function reserveStockForItems(
  items: { slug: string; colorName: string; quantity: number; name?: string }[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await getSupabaseServiceClient().rpc("reserve_stock", { items });
  throwIfSupabaseError(error);
  return data as { ok: true } | { ok: false; error: string };
}
