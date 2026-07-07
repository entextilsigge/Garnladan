// ---------------------------------------------------------------------------
// Delade typer och etiketter för Garnladans sortiment.
//
// Denna fil innehåller bara typer + statiska UI-etiketter — den har inget
// fs-beroende och kan därför importeras från både server- och klientkod
// (t.ex. lib/cart.tsx, komponenter). Själva produktdatan (läsning/skrivning)
// finns i lib/data/productStore.ts, som bara får importeras från serverkod
// (route handlers, server components) eftersom den använder "fs".
// ---------------------------------------------------------------------------

export type Category = "ull" | "bomull" | "blandgarn" | "premium";

export type Fiber =
  | "ull"
  | "merino"
  | "bomull"
  | "lin"
  | "akryl"
  | "polyamid"
  | "viskos"
  | "alpacka"
  | "mohair"
  | "silke"
  | "kashmir";

export type WeightClass = "lace" | "fingering" | "sport" | "dk" | "aran" | "chunky";

export type ColorGroup =
  | "natur"
  | "grå"
  | "brun"
  | "röd"
  | "rosa"
  | "orange"
  | "gul"
  | "grön"
  | "blå"
  | "lila";

export interface ProductImage {
  id: string;
  /** Publik Blob-URL, visas direkt via next/image */
  url: string;
  /**
   * Blob-pathname (t.ex. "products/p_abc123/xyz.png") — krävs för att kunna
   * radera själva filen ur Blob-storage vid borttagning, inte bara
   * referensen i produktdatan.
   */
  pathname: string;
}

export interface Colorway {
  /** Färgnamn som visas för kund, t.ex. "Tegelröd" */
  name: string;
  /** Huvudkulör, används för garnillustrationen och färgprickar */
  hex: string;
  /** Färggrupp för filtrering */
  group: ColorGroup;
  /** Lagerantal för just denna färgvariant. 0 = slut i lager. */
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  /** Pris i SEK per nystan */
  price: number;
  /** Ev. tidigare pris (visar "rea"-känsla), i SEK */
  compareAtPrice?: number;
  /**
   * Inköpspris (självkostnad) i SEK per nystan — grund för
   * marginalberäkningar i adminstatistiken. PLATSHÅLLARE: värdena i
   * data/products.json är uppskattade för att ge en rimlig, varierad
   * bruttomarginal (35–60 %) per produkt, inte verkliga inköpspriser. Byt ut
   * mot faktiska siffror från leverantör/bokföring så snart de finns.
   */
  costPrice: number;
  tagline: string;
  description: string;
  /** Fibersammansättning som visas för kund, t.ex. "100 % svensk ull" */
  composition: string;
  /** Fibrer för filtrering */
  fibers: Fiber[];
  weightClass: WeightClass;
  /** Löpmeter per nystan */
  meterage: number;
  /** Vikt per nystan i gram */
  grams: number;
  /** Rekommenderad stickstorlek, t.ex. "4–5 mm" */
  needleSize: string;
  /** Stickfasthet, t.ex. "20 m × 26 v = 10 × 10 cm" */
  gauge: string;
  /** Tvättråd */
  care: string;
  colorways: Colorway[];
  isNew?: boolean;
  /** 0–100, används för sortering på popularitet */
  popularity: number;
  /**
   * Äldre, manuell override: en riktig produktbild-URL inklistrad direkt i
   * admin (inget filuppladdnings-flöde, ingen radering av bakomliggande
   * fil). Bevaras för bakåtkompatibilitet men ersätts i praktiken av
   * `images` — se getPrimaryImageUrl().
   */
  imageUrl?: string;
  /**
   * Uppladdade produktfoton (Vercel Blob), ersätter i tur och ordning
   * `imageUrl`-fältet ovan. Första bilden i listan är huvudbild (visas i
   * produktkort/kort-vyer), resten är galleribilder på produktsidan.
   * Ordningen i arrayen styr både galleriordning och vilken som är huvudbild
   * — att flytta en bild till index 0 gör den till huvudbild.
   */
  images?: ProductImage[];
}

/**
 * Vilken bild-URL som ska visas för produkten istället för den genererade
 * SVG-illustrationen, om någon. Prioritetsordning: uppladdat foto (images[0])
 * > äldre imageUrl-override > inget (SVG-fallback används).
 */
export function getPrimaryImageUrl(product: Product): string | undefined {
  return product.images?.[0]?.url || product.imageUrl || undefined;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  ull: "Ullgarn",
  bomull: "Bomullsgarn",
  blandgarn: "Bland- & syntetgarn",
  premium: "Premium & exklusivt",
};

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  ull: "Värmande garner från svenska och nordiska får — från rustik lovikka till mjukaste merino.",
  bomull: "Svala, slitstarka garner för sommarplagg, handdukar och barnkläder.",
  blandgarn: "Praktiska blandningar som tål vardagen — sockgarn, babygarn och maskintvättbara favoriter.",
  premium: "Vårt utvalda lyxsortiment: alpacka, mohair, silke och kashmir för de riktigt fina projekten.",
};

export const WEIGHT_LABELS: Record<WeightClass, string> = {
  lace: "Lace (1–2,5 mm)",
  fingering: "Fingering (2,5–3,5 mm)",
  sport: "Sport (3–3,5 mm)",
  dk: "DK (3,5–4,5 mm)",
  aran: "Aran (4,5–5,5 mm)",
  chunky: "Chunky (6 mm +)",
};

export const FIBER_LABELS: Record<Fiber, string> = {
  ull: "Ull",
  merino: "Merinoull",
  bomull: "Bomull",
  lin: "Lin",
  akryl: "Akryl",
  polyamid: "Polyamid",
  viskos: "Viskos",
  alpacka: "Alpacka",
  mohair: "Mohair",
  silke: "Silke",
  kashmir: "Kashmir",
};

export const COLOR_GROUP_SWATCHES: Record<ColorGroup, string> = {
  natur: "#EDE4D2",
  grå: "#9A968E",
  brun: "#7A5B3E",
  röd: "#A64B33",
  rosa: "#D8A0A0",
  orange: "#C97B3D",
  gul: "#C9A22B",
  grön: "#4A6455",
  blå: "#4D6478",
  lila: "#7E6480",
};
