import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="font-display text-6xl font-bold text-tegel">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-kol">
        Den här tråden ledde ingenvart
      </h1>
      <p className="mt-3 text-mull">
        Sidan du letar efter finns inte — kanske har garnet tagit slut, eller
        så har adressen trasslat sig.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-kol px-8 py-3.5 text-sm font-semibold text-krita transition-colors hover:bg-tegel"
      >
        Tillbaka till startsidan
      </Link>
    </div>
  );
}
