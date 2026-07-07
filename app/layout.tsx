import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import UtmCapture from "@/components/UtmCapture";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { CartProvider } from "@/lib/cart";
import { SettingsProvider } from "@/lib/settings";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

// Fraunces: en varm, "mjukt gammaldags" display-serif med hög karaktär —
// samma känsla som Canela/GT Sectra men fritt tillgänglig via Google Fonts.
// Karla: humanist sans med rund, vänlig ton som brödtext.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
});

const DEFAULT_DESCRIPTION =
  "Garn och stickmaterial online, med rötterna i Tygladan i Vänersborg. Svensk ull, ekologisk bomull, lyxig alpacka och mohair. Fri frakt över 499 kr.";

export const metadata: Metadata = {
  // Gör att relativa URL:er i openGraph/twitter-bilder och alternates.canonical
  // (satta per sida) löses upp mot rätt domän. Sätt NEXT_PUBLIC_SITE_URL i
  // produktion — se lib/seo.ts / .env.example.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Garnladan — garn & stickmaterial online",
    template: "%s · Garnladan",
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Garnladan",
    locale: "sv_SE",
    title: "Garnladan — garn & stickmaterial online",
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Garnladan — garn & stickmaterial online",
    description: DEFAULT_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="sv"
      className={`${fraunces.variable} ${karla.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <UtmCapture />
        <SettingsProvider>
          <CartProvider>
            <Header />
            <main className="min-h-[60vh]">{children}</main>
            <Footer />
            <CartDrawer />
          </CartProvider>
        </SettingsProvider>
        <CookieConsentBanner />
      </body>
    </html>
  );
}
