import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
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
    default: "Garnladan — garn & stickmaterial från Leksand",
    template: "%s · Garnladan",
  },
  description:
    "Handplockat garn från en röd lada i Leksand: svensk ull, ekologisk bomull, lyxig alpacka och mohair. Fri frakt över 499 kr.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" className={`${fraunces.variable} ${karla.variable}`}>
      <body>
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
