import type { Metadata } from "next";
import CartPageClient from "./CartPageClient";

export const metadata: Metadata = {
  title: "Varukorg",
  description: "Din varukorg hos Garnladan — se dina valda garner innan du går till kassan.",
  alternates: { canonical: "/varukorg" },
  // Innehållet är personligt (kundens egen varukorg) och inte relevant att
  // visa i sökresultat.
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartPageClient />;
}
