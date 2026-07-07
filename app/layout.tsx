import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import UtmCapture from "@/components/UtmCapture";
import { CartProvider } from "@/lib/cart";
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

export const metadata: Metadata = {
  title: {
    default: "Garnladan — garn & stickmaterial online",
    template: "%s · Garnladan",
  },
  description:
    "Garn och stickmaterial online, med rötterna i Tygladan i Vänersborg. Svensk ull, ekologisk bomull, lyxig alpacka och mohair. Fri frakt över 499 kr.",
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
        <CartProvider>
          <Header />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
