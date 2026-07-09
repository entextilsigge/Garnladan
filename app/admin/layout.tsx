// Egen, enkel layout för hela /admin (uppdrag 14) — internt verktyg för
// personal, inte en kundvänd sida, så butikens header/kategorinavigering/
// varukorg (och den gröna marknadsföringstoppen "Fri frakt över...") hör
// inte hemma här. Header.tsx döljer sig själv på /admin-rutter (se dess
// egen usePathname-koll) istället för att adminsidorna behöver ett eget
// träd utanför root-layouten — enklast sättet att uppnå samma resultat utan
// att flytta om hela appens routningsstruktur.
//
// AdminDashboard/AdminLoginForm/packsedeln bygger redan sin egen fullständiga
// sidstruktur (inkl. "Garnladan Admin"-titeln), så den här layouten behöver
// inte lägga till något eget UI ovanpå — bara finnas som markering av att
// /admin är ett separat träd.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
