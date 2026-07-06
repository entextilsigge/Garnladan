// ---------------------------------------------------------------------------
// Produktdata för Garnladan.
//
// Detta är sajtens enda datakälla för sortimentet. Byt ut innehållet i
// PRODUCTS mot riktiga produkter (eller ersätt filen med ett fetch-anrop mot
// databas/CMS) — UI-koden läser bara via de exporterade funktionerna längst
// ner och behöver inte röras.
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

export interface Colorway {
  /** Färgnamn som visas för kund, t.ex. "Tegelröd" */
  name: string;
  /** Huvudkulör, används för garnillustrationen och färgprickar */
  hex: string;
  /** Färggrupp för filtrering */
  group: ColorGroup;
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

export const PRODUCTS: Product[] = [
  // ------------------------------------------------------------- Ullgarn --
  {
    id: "p01",
    slug: "faro-svensk-ull",
    name: "Fårö Svensk Ull",
    category: "ull",
    price: 89,
    tagline: "Rustik svensk ull med levande lyster",
    description:
      "Fårö är vårt signaturgarn — spunnet av svensk fårull från gotländska gårdar. Garnet har en levande, lätt melerad yta och blir bara vackrare med åren. Perfekt till tröjor, koftor och västar som ska hålla i generationer.",
    composition: "100 % svensk ull",
    fibers: ["ull"],
    weightClass: "aran",
    meterage: 160,
    grams: 100,
    needleSize: "4,5–5 mm",
    gauge: "18 m × 24 v = 10 × 10 cm",
    care: "Handtvätt 30 °C, plantorkas",
    colorways: [
      { name: "Tegelröd", hex: "#A64B33", group: "röd" },
      { name: "Ofärgad vit", hex: "#EDE4D2", group: "natur" },
      { name: "Granskog", hex: "#2E463A", group: "grön" },
      { name: "Höstsenap", hex: "#C08A2B", group: "gul" },
      { name: "Kolgrå", hex: "#4A453E", group: "grå" },
    ],
    popularity: 96,
  },
  {
    id: "p02",
    slug: "visby-merino",
    name: "Visby Merino",
    category: "ull",
    price: 109,
    tagline: "Extrafin merino som inte sticks",
    description:
      "Superwash-behandlad extrafin merinoull med en slät, jämn tråd och lyxig mjukhet direkt mot huden. Visby är valet för plagg närmast kroppen — sjalar, mössor och baby­plagg. Tål maskintvätt på ullprogram.",
    composition: "100 % extrafin merinoull",
    fibers: ["merino"],
    weightClass: "dk",
    meterage: 225,
    grams: 100,
    needleSize: "3,5–4 mm",
    gauge: "22 m × 30 v = 10 × 10 cm",
    care: "Maskintvätt 30 °C, ullprogram",
    colorways: [
      { name: "Cognac", hex: "#8A5A33", group: "brun" },
      { name: "Havsdimma", hex: "#7E93A3", group: "blå" },
      { name: "Ljungrosa", hex: "#C49BA4", group: "rosa" },
      { name: "Benvit", hex: "#F0E9DB", group: "natur" },
    ],
    popularity: 91,
  },
  {
    id: "p03",
    slug: "norrsken-lovikka",
    name: "Norrsken Lovikka",
    category: "ull",
    price: 119,
    tagline: "Tjockt lovikkagarn för vantar och värme",
    description:
      "Ett klassiskt tvåtrådigt lovikkagarn, löst spunnet för att kunna ruggas till den karaktäristiska luddiga ytan. Norrsken stickas snabbt på grova stickor och ger vantar, sockor och tröjor med rejäl norrländsk värme.",
    composition: "100 % norsk ull",
    fibers: ["ull"],
    weightClass: "chunky",
    meterage: 100,
    grams: 100,
    needleSize: "6–7 mm",
    gauge: "13 m × 18 v = 10 × 10 cm",
    care: "Handtvätt 30 °C, plantorkas",
    colorways: [
      { name: "Naturgrå", hex: "#B0A99C", group: "grå" },
      { name: "Midvinterblå", hex: "#3E5266", group: "blå" },
      { name: "Rönnbär", hex: "#94382E", group: "röd" },
    ],
    popularity: 78,
  },
  {
    id: "p04",
    slug: "gotland-lammull",
    name: "Gotland Lammull",
    category: "ull",
    price: 95,
    isNew: true,
    tagline: "Silkig lammull från gotlandsfår",
    description:
      "Första klippningens lammull från gotlandsfår — naturligt glansig, silvrig och förvånansvärt mjuk. Ett tunnare garn som gör sig vackert i sjalar och lättare plagg där lystern får spela huvudrollen.",
    composition: "100 % gotländsk lammull",
    fibers: ["ull"],
    weightClass: "sport",
    meterage: 250,
    grams: 100,
    needleSize: "3–3,5 mm",
    gauge: "24 m × 32 v = 10 × 10 cm",
    care: "Handtvätt 30 °C, plantorkas",
    colorways: [
      { name: "Silvergrå", hex: "#A8A49B", group: "grå" },
      { name: "Mörk sobel", hex: "#4E4238", group: "brun" },
      { name: "Pärlvit", hex: "#EAE3D4", group: "natur" },
    ],
    popularity: 74,
  },
  {
    id: "p05",
    slug: "harjedal-tweed",
    name: "Härjedal Tweed",
    category: "ull",
    price: 99,
    tagline: "Klassisk tweed med noppor i jordtoner",
    description:
      "Ett karaktärsfullt tweedgarn där små noppor i kontrasterande jordtoner ger djup åt varje maska. Härjedal är stickat herrgårdsliv — tänk västar, flat caps och kavajliknande koftor med skinnknappar.",
    composition: "85 % ull, 15 % viskos (noppor)",
    fibers: ["ull", "viskos"],
    weightClass: "dk",
    meterage: 210,
    grams: 100,
    needleSize: "4 mm",
    gauge: "21 m × 28 v = 10 × 10 cm",
    care: "Handtvätt 30 °C, plantorkas",
    colorways: [
      { name: "Ljunghed", hex: "#8A6D5C", group: "brun" },
      { name: "Mossgrön", hex: "#5C6B4A", group: "grön" },
      { name: "Gryningsröd", hex: "#9E5240", group: "röd" },
      { name: "Stengrå", hex: "#7D786E", group: "grå" },
    ],
    popularity: 69,
  },
  {
    id: "p06",
    slug: "roslagen-rya",
    name: "Roslagen Rya",
    category: "ull",
    price: 139,
    tagline: "Grovt ryagarn för pläd och inredning",
    description:
      "Ett riktigt grovt garn av ryaull med lång fiber och rustik känsla. Roslagen är byggt för hemmet: pläd­ar, kuddar och mattor som tål att användas. Stickas eller virkas på riktigt grova verktyg — ett nystan räcker längre än du tror.",
    composition: "100 % ryaull",
    fibers: ["ull"],
    weightClass: "chunky",
    meterage: 80,
    grams: 150,
    needleSize: "8–10 mm",
    gauge: "9 m × 13 v = 10 × 10 cm",
    care: "Handtvätt kallt, plantorkas",
    colorways: [
      { name: "Oblekt", hex: "#E6DCC8", group: "natur" },
      { name: "Järngrå", hex: "#5A564E", group: "grå" },
      { name: "Ockra", hex: "#B5822F", group: "gul" },
    ],
    popularity: 55,
  },

  // --------------------------------------------------------- Bomullsgarn --
  {
    id: "p07",
    slug: "oland-bomull",
    name: "Öland Bomull",
    category: "bomull",
    price: 59,
    tagline: "Mjuk kammad bomull för hela familjen",
    description:
      "En slät, kammad bomull med fin stickdefinition och behaglig känsla. Öland är vår mest mångsidiga bomull — sommartoppar, barnkläder, disktrasor och allt däremellan. Tål maskintvätt gång på gång utan att tappa formen.",
    composition: "100 % kammad bomull",
    fibers: ["bomull"],
    weightClass: "dk",
    meterage: 170,
    grams: 50,
    needleSize: "3,5–4 mm",
    gauge: "22 m × 30 v = 10 × 10 cm",
    care: "Maskintvätt 60 °C",
    colorways: [
      { name: "Kritvit", hex: "#F2EDE0", group: "natur" },
      { name: "Solgul", hex: "#D4A82F", group: "gul" },
      { name: "Terrakotta", hex: "#B85E42", group: "orange" },
      { name: "Salvia", hex: "#8CA08A", group: "grön" },
      { name: "Bläckblå", hex: "#3D5570", group: "blå" },
    ],
    popularity: 88,
  },
  {
    id: "p08",
    slug: "sommaro-eko",
    name: "Sommarö Eko",
    category: "bomull",
    price: 72,
    isNew: true,
    tagline: "GOTS-certifierad ekobomull i tunn kvalitet",
    description:
      "Ekologisk, GOTS-certifierad bomull i en tunnare kvalitet med vacker falluckighet. Sommarö gör luftiga sommarsjalar, tunna toppar och babyfiltar med gott samvete — odlad utan bekämpningsmedel och färgad med miljömärkta färger.",
    composition: "100 % ekologisk bomull (GOTS)",
    fibers: ["bomull"],
    weightClass: "fingering",
    meterage: 210,
    grams: 50,
    needleSize: "2,5–3 mm",
    gauge: "27 m × 36 v = 10 × 10 cm",
    care: "Maskintvätt 40 °C",
    colorways: [
      { name: "Snäckskal", hex: "#EFE3D0", group: "natur" },
      { name: "Aprikos", hex: "#D9995F", group: "orange" },
      { name: "Havstång", hex: "#6B7D62", group: "grön" },
      { name: "Duvblå", hex: "#8195A6", group: "blå" },
    ],
    popularity: 71,
  },
  {
    id: "p09",
    slug: "kalksten-bomullslin",
    name: "Kalksten Bomull & Lin",
    category: "bomull",
    price: 79,
    tagline: "Svalt sommargarn med linets knastriga karaktär",
    description:
      "Bomull och lin i skön förening: bomullen ger mjukhet, linet ger svalka, styrka och den där vackert knastriga ytan som mjuknar för varje tvätt. Kalksten är självskrivet till sommarens linnen och luftiga nät­kassar.",
    composition: "60 % bomull, 40 % lin",
    fibers: ["bomull", "lin"],
    weightClass: "sport",
    meterage: 190,
    grams: 50,
    needleSize: "3–3,5 mm",
    gauge: "24 m × 32 v = 10 × 10 cm",
    care: "Maskintvätt 40 °C",
    colorways: [
      { name: "Kalksten", hex: "#DDD3BE", group: "natur" },
      { name: "Rågblond", hex: "#C7A96A", group: "gul" },
      { name: "Olivkvist", hex: "#77775A", group: "grön" },
    ],
    popularity: 63,
  },
  {
    id: "p10",
    slug: "skargard-merceriserad",
    name: "Skärgård Merceriserad",
    category: "bomull",
    price: 65,
    tagline: "Glansig merceriserad bomull med skarp maskbild",
    description:
      "Merceriserad bomull med pärlemorartad glans och knivskarp stickdefinition — mönsterstickningens bästa vän. Skärgård håller färgen tvätt efter tvätt och gör sig lika bra i virkade dukar som i randiga sommartröjor.",
    composition: "100 % merceriserad bomull",
    fibers: ["bomull"],
    weightClass: "sport",
    meterage: 165,
    grams: 50,
    needleSize: "2,5–3,5 mm",
    gauge: "25 m × 33 v = 10 × 10 cm",
    care: "Maskintvätt 60 °C",
    colorways: [
      { name: "Segelvit", hex: "#F1ECDF", group: "natur" },
      { name: "Korall", hex: "#C96B52", group: "orange" },
      { name: "Fyrröd", hex: "#A63A2B", group: "röd" },
      { name: "Östersjö", hex: "#46617A", group: "blå" },
    ],
    popularity: 58,
  },
  {
    id: "p11",
    slug: "angso-denim",
    name: "Ängsö Återvunnen Denim",
    category: "bomull",
    price: 69,
    isNew: true,
    tagline: "Återvunnen bomull från kasserade jeans",
    description:
      "Ett garn med historia: spunnet av återvunna bomullsfibrer från kasserade jeans, med jeans­tygets typiska melerade blåtoner. Ängsö är slitstarkt, mjukt och gör tuffa vardagsplagg med minimal miljöpåverkan.",
    composition: "95 % återvunnen bomull, 5 % polyamid",
    fibers: ["bomull", "polyamid"],
    weightClass: "dk",
    meterage: 160,
    grams: 50,
    needleSize: "4 mm",
    gauge: "21 m × 29 v = 10 × 10 cm",
    care: "Maskintvätt 40 °C",
    colorways: [
      { name: "Ljus tvätt", hex: "#93A7B5", group: "blå" },
      { name: "Mellanblå", hex: "#5E7488", group: "blå" },
      { name: "Rå indigo", hex: "#39485C", group: "blå" },
    ],
    popularity: 66,
  },

  // -------------------------------------------------- Bland- & syntetgarn --
  {
    id: "p12",
    slug: "vardag-sockgarn",
    name: "Vardag Sockgarn",
    category: "blandgarn",
    price: 75,
    tagline: "Slitstarkt sockgarn som tål maskintvätt",
    description:
      "Klassiskt fyrtrådigt sockgarn där polyamiden gör hälar och tår långlivade. Ett nystan räcker till ett par vuxensockor. Vardag är garnet du alltid vill ha i väskan — lättstickat, maskintvättbart och snällt mot fötterna.",
    composition: "75 % superwash-ull, 25 % polyamid",
    fibers: ["ull", "polyamid"],
    weightClass: "fingering",
    meterage: 420,
    grams: 100,
    needleSize: "2,5–3 mm",
    gauge: "30 m × 42 v = 10 × 10 cm",
    care: "Maskintvätt 40 °C",
    colorways: [
      { name: "Grå melerad", hex: "#8D8880", group: "grå" },
      { name: "Lingondröm", hex: "#9E4A4A", group: "röd" },
      { name: "Blåbärsljung", hex: "#5C5C7A", group: "lila" },
      { name: "Skogsstig", hex: "#5F6B52", group: "grön" },
    ],
    popularity: 93,
  },
  {
    id: "p13",
    slug: "trygg-babygarn",
    name: "Trygg Babygarn",
    category: "blandgarn",
    price: 49,
    tagline: "Mjukt, allergivänligt och tvättåligt för de minsta",
    description:
      "Ett silkeslent babygarn som tål livet med små barn: maskintvätt 40 grader, torktumling och oändliga kramar. Öko-Tex-certifierat och fritt från ull för känslig hud. Trygg är dopfiltarnas och babykofternas trotjänare.",
    composition: "55 % akryl, 45 % bomull",
    fibers: ["akryl", "bomull"],
    weightClass: "dk",
    meterage: 180,
    grams: 50,
    needleSize: "3,5–4 mm",
    gauge: "22 m × 30 v = 10 × 10 cm",
    care: "Maskintvätt 40 °C, kan torktumlas",
    colorways: [
      { name: "Gräddvit", hex: "#F3EDDF", group: "natur" },
      { name: "Blek rosa", hex: "#E3C3C3", group: "rosa" },
      { name: "Himmelsblå", hex: "#A9BFCC", group: "blå" },
      { name: "Mjuk salvia", hex: "#B3C2AA", group: "grön" },
    ],
    popularity: 82,
  },
  {
    id: "p14",
    slug: "fjallrav-raggsocka",
    name: "Fjällräv Raggsockegarn",
    category: "blandgarn",
    price: 62,
    tagline: "Tjockt raggsockegarn för stuga och gummistövlar",
    description:
      "Tretrådigt raggsockegarn i den tjockare skolan — för raggsockor som värmer i stugan, båten och gummistövlarna. Ullen värmer även när den blir fuktig, syntetfibern gör att sockorna håller säsong efter säsong.",
    composition: "70 % ull, 30 % akryl",
    fibers: ["ull", "akryl"],
    weightClass: "aran",
    meterage: 150,
    grams: 100,
    needleSize: "4,5–5 mm",
    gauge: "18 m × 24 v = 10 × 10 cm",
    care: "Maskintvätt 40 °C, ullprogram",
    colorways: [
      { name: "Rävröd melerad", hex: "#A2593B", group: "orange" },
      { name: "Gråsten", hex: "#7B766C", group: "grå" },
      { name: "Naturmelerad", hex: "#CEC4B0", group: "natur" },
    ],
    popularity: 76,
  },
  {
    id: "p15",
    slug: "allmoge-mix",
    name: "Allmoge Mix",
    category: "blandgarn",
    price: 39,
    tagline: "Prisvärd basblandning i massor av kulörer",
    description:
      "Vår mest prisvärda kvalitet — en lättstickad ull- och akrylblandning som funkar till nästan allt: amigurumi, filtar, skolslöjd och snabba mössor. Stort kulörsortiment och en tråd som förlåter både nybörjare och bråttom.",
    composition: "20 % ull, 80 % akryl",
    fibers: ["ull", "akryl"],
    weightClass: "dk",
    meterage: 200,
    grams: 100,
    needleSize: "4 mm",
    gauge: "21 m × 28 v = 10 × 10 cm",
    care: "Maskintvätt 40 °C",
    colorways: [
      { name: "Tomtebo", hex: "#8E3B2C", group: "röd" },
      { name: "Kornblå", hex: "#4C6C99", group: "blå" },
      { name: "Ärtskida", hex: "#7E9159", group: "grön" },
      { name: "Solros", hex: "#D2A62E", group: "gul" },
      { name: "Syrén", hex: "#8F7796", group: "lila" },
    ],
    popularity: 84,
  },
  {
    id: "p16",
    slug: "stormvind-chunky",
    name: "Stormvind Chunky",
    category: "blandgarn",
    price: 85,
    tagline: "Snabbstickat chunkygarn för helgprojekt",
    description:
      "Ett fylligt, rundspunnnet chunkygarn som växer så det knakar — mössan blir klar på en kväll, tröjan på en helg. Ull­andelen ger värme och spänst, akrylen håller priset nere och formen uppe.",
    composition: "50 % ull, 50 % akryl",
    fibers: ["ull", "akryl"],
    weightClass: "chunky",
    meterage: 90,
    grams: 100,
    needleSize: "7–8 mm",
    gauge: "11 m × 15 v = 10 × 10 cm",
    care: "Maskintvätt 30 °C, ullprogram",
    colorways: [
      { name: "Askgrå", hex: "#9C9791", group: "grå" },
      { name: "Rost", hex: "#A05A35", group: "orange" },
      { name: "Flaskgrön", hex: "#3A5244", group: "grön" },
      { name: "Snödis", hex: "#EEE8DB", group: "natur" },
    ],
    popularity: 61,
  },

  // ------------------------------------------------- Premium & exklusivt --
  {
    id: "p17",
    slug: "silkesmanen-mohair",
    name: "Silkesmånen Mohair",
    category: "premium",
    price: 189,
    isNew: true,
    tagline: "Skimrande kid mohair på silkeskärna",
    description:
      "Vår mest eteriska kvalitet: superkid mohair borstad kring en kärna av rent mullbärssilke. Silkesmånen stickas ensam till molnlika sjalar eller tillsammans med ett bärgarn för den där dyrbara ljusgloria-effekten. En liten härva räcker långt.",
    composition: "72 % superkid mohair, 28 % mullbärssilke",
    fibers: ["mohair", "silke"],
    weightClass: "lace",
    meterage: 210,
    grams: 25,
    needleSize: "3–5 mm",
    gauge: "18–24 m = 10 cm (beroende på sticka)",
    care: "Handtvätt kallt, plantorkas",
    colorways: [
      { name: "Månsken", hex: "#EDE7DC", group: "natur" },
      { name: "Rosé", hex: "#D3ABAB", group: "rosa" },
      { name: "Bärnsten", hex: "#C08A2B", group: "gul" },
      { name: "Skymningslila", hex: "#77627E", group: "lila" },
      { name: "Djuphav", hex: "#3C5060", group: "blå" },
    ],
    popularity: 89,
  },
  {
    id: "p18",
    slug: "anderna-babyalpacka",
    name: "Anderna Babyalpacka",
    category: "premium",
    price: 149,
    tagline: "Fjäderlätt babyalpacka med siden­mjukt fall",
    description:
      "Ren babyalpacka från små familjekooperativ i Peru — varmare än ull, mjukare än det mesta och med ett tungt, elegant fall. Anderna gör tröjor och sjalar som känns dyra, för att de är det. Väl värt varje krona.",
    composition: "100 % babyalpacka",
    fibers: ["alpacka"],
    weightClass: "dk",
    meterage: 200,
    grams: 50,
    needleSize: "3,5–4,5 mm",
    gauge: "22 m × 28 v = 10 × 10 cm",
    care: "Handtvätt 30 °C, plantorkas",
    colorways: [
      { name: "Kamel", hex: "#B08D5E", group: "brun" },
      { name: "Perlemor", hex: "#EFE8DA", group: "natur" },
      { name: "Antracit", hex: "#3E3A35", group: "grå" },
      { name: "Vinröd", hex: "#7A3230", group: "röd" },
    ],
    popularity: 87,
  },
  {
    id: "p19",
    slug: "kashmirdrom",
    name: "Kashmirdröm",
    category: "premium",
    price: 329,
    tagline: "Ren kashmir — vårt allra finaste garn",
    description:
      "Ren mongolisk kashmir i fyra trådar, mjukare än allt annat i butiken. Kashmirdröm är garnet för livets stora projekt: brudsjalen, den första barnfilten, tröjan som ärvs. Behandla den varsamt så håller den ett liv.",
    composition: "100 % kashmir",
    fibers: ["kashmir"],
    weightClass: "fingering",
    meterage: 155,
    grams: 25,
    needleSize: "2,5–3,5 mm",
    gauge: "27 m × 36 v = 10 × 10 cm",
    care: "Handtvätt kallt med kashmirschampo",
    colorways: [
      { name: "Odyed vit", hex: "#F0EADD", group: "natur" },
      { name: "Puderrosa", hex: "#DBBCBC", group: "rosa" },
      { name: "Dovgrå", hex: "#8F8B84", group: "grå" },
    ],
    popularity: 72,
  },
  {
    id: "p20",
    slug: "havtorn-silkesmerino",
    name: "Havtorn Silkesmerino",
    category: "premium",
    price: 165,
    isNew: true,
    tagline: "Merino och silke med djup, mättad lyster",
    description:
      "Extrafin merino tvinnad med mullbärssilke — silket fångar ljuset och ger färgerna ett nästan ädelstensaktigt djup. Havtorn handfärgas i små partier; köp så det räcker till hela projektet, varje parti är unikt.",
    composition: "55 % merinoull, 45 % mullbärssilke",
    fibers: ["merino", "silke"],
    weightClass: "fingering",
    meterage: 400,
    grams: 100,
    needleSize: "2,5–3,5 mm",
    gauge: "28 m × 36 v = 10 × 10 cm",
    care: "Handtvätt 30 °C, plantorkas",
    colorways: [
      { name: "Havtornsgul", hex: "#C98F2E", group: "gul" },
      { name: "Granatäpple", hex: "#8E3A3E", group: "röd" },
      { name: "Malakit", hex: "#33594B", group: "grön" },
      { name: "Midnatt", hex: "#2E3A4E", group: "blå" },
    ],
    popularity: 80,
  },
];

// ------------------------------------------------------------- Hjälpare --

export function getAllProducts(): Product[] {
  return PRODUCTS;
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: Category): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}

export function getNewProducts(): Product[] {
  return PRODUCTS.filter((p) => p.isNew);
}

export function getRelatedProducts(slug: string, count = 4): Product[] {
  const product = getProductBySlug(slug);
  if (!product) return [];
  const sameCategory = PRODUCTS.filter(
    (p) => p.slug !== slug && p.category === product.category
  );
  const others = PRODUCTS.filter(
    (p) => p.slug !== slug && p.category !== product.category
  ).sort((a, b) => b.popularity - a.popularity);
  return [...sameCategory, ...others].slice(0, count);
}
