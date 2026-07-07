"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/format";

const NAV_LINKS = [
  { href: "/produkter", label: "Allt garn" },
  { href: "/produkter?kategori=ull", label: "Ullgarn" },
  { href: "/produkter?kategori=bomull", label: "Bomullsgarn" },
  { href: "/produkter?kategori=blandgarn", label: "Bland & syntet" },
  { href: "/produkter?kategori=premium", label: "Premium" },
];

export default function Header() {
  const { itemCount, openDrawer } = useCart();
  const settings = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-kol/10 bg-krita/90 backdrop-blur-md">
      <div className="bg-gran py-1.5 text-center text-xs font-medium tracking-wide text-krita/90">
        {settings.freeShippingEnabled && (
          <>Fri frakt över {formatPrice(settings.freeShippingThreshold)} · </>
        )}
        Skickas inom 24 timmar · Rötterna i Vänersborg sedan 2000
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tracking-tight text-kol sm:text-[1.7rem]">
            Garnladan
          </span>
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.22em] text-tegel sm:inline">
            Garn & hantverk
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="relative text-sm font-medium text-kol/80 transition-colors hover:text-tegel after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-tegel after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={openDrawer}
            className="relative flex items-center gap-2 rounded-full bg-kol px-4 py-2.5 text-sm font-medium text-krita transition-all hover:bg-tegel active:scale-95"
            aria-label={`Öppna varukorgen, ${itemCount} varor`}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 7h12l1.5 13.5a1 1 0 0 1-1 1.1H5.5a1 1 0 0 1-1-1.1L6 7Z" />
              <path d="M9 10V6a3 3 0 0 1 6 0v4" />
            </svg>
            <span className="hidden sm:inline">Varukorg</span>
            {itemCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-senap px-1.5 text-xs font-bold text-kol">
                {itemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-kol transition-colors hover:bg-linne lg:hidden"
            aria-label={mobileOpen ? "Stäng menyn" : "Öppna menyn"}
            aria-expanded={mobileOpen}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-kol/10 bg-krita px-4 py-3 lg:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-kol transition-colors hover:bg-linne hover:text-tegel"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
