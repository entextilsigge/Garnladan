// ---------------------------------------------------------------------------
// Delad SEO-grund: sajtens kanoniska bas-URL, återanvänd av root layout
// (metadataBase), sitemap.ts, robots.ts och per-sida canonical-taggar/OG-
// bilder — samt av lib/email.ts för absoluta länkar i mejl. Sätt
// NEXT_PUBLIC_SITE_URL i produktion (se .env.example); faller annars
// tillbaka på den riktiga domänen.
// ---------------------------------------------------------------------------

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://garnladan.se";
