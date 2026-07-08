import Link from "next/link";
import { COMPANY_INFO } from "@/lib/company-info";

export default function Footer() {
  return (
    <footer className="knit-texture bg-gran-dark text-krita/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="max-w-xs">
          <p className="font-display text-2xl font-bold text-krita">Garnladan</p>
          <p className="mt-3 text-sm leading-relaxed">
            Garnladan har sina rötter i Tygladan i Vänersborg. Vi tror på
            material som håller, färger som glöder och stickning som får ta
            tid.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-senap">
            Sortiment
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/produkter?kategori=ull" className="transition-colors hover:text-krita">Ullgarn</Link></li>
            <li><Link href="/produkter?kategori=bomull" className="transition-colors hover:text-krita">Bomullsgarn</Link></li>
            <li><Link href="/produkter?kategori=blandgarn" className="transition-colors hover:text-krita">Bland- & syntetgarn</Link></li>
            <li><Link href="/produkter?kategori=premium" className="transition-colors hover:text-krita">Premium & exklusivt</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-senap">
            Kundservice
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/varukorg" className="transition-colors hover:text-krita">Varukorg</Link></li>
            <li><Link href="/villkor" className="transition-colors hover:text-krita">Frakt & leverans</Link></li>
            <li><Link href="/villkor/angerratt" className="transition-colors hover:text-krita">Byten & returer</Link></li>
            <li><span className="cursor-default">Stickhjälp — fråga oss!</span></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-senap">
            Hitta till ladan
          </p>
          <address className="mt-4 space-y-2.5 text-sm not-italic leading-relaxed">
            <p>{COMPANY_INFO.name}<br />Vargön</p>
            <p>{COMPANY_INFO.email}<br />{COMPANY_INFO.phone}</p>
          </address>
        </div>
      </div>
      <div className="border-t border-krita/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-krita/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} {COMPANY_INFO.legalName}. Alla rättigheter förbehållna.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
            <li><Link href="/villkor" className="transition-colors hover:text-krita">Allmänna villkor</Link></li>
            <li><Link href="/villkor/angerratt" className="transition-colors hover:text-krita">Ångerrätt</Link></li>
            <li><Link href="/integritetspolicy" className="transition-colors hover:text-krita">Integritetspolicy</Link></li>
          </ul>
          <p>Org.nr {COMPANY_INFO.orgNumber} · Priser inkl. moms</p>
        </div>
      </div>
    </footer>
  );
}
