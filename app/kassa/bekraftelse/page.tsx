import type { Metadata } from "next";
import BekraftelseClient from "./BekraftelseClient";

export const metadata: Metadata = {
  title: "Bekräftelse",
  description: "Orderbekräftelse för ditt köp hos Garnladan.",
  alternates: { canonical: "/kassa/bekraftelse" },
  // Personlig, per-order-sida (ordernummer i query-strängen) — ska inte
  // dyka upp i sökresultat.
  robots: { index: false, follow: false },
};

export default function ConfirmationPage() {
  return <BekraftelseClient />;
}
