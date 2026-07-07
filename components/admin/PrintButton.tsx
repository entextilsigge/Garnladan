"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-tegel px-6 py-3 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark"
    >
      Skriv ut packlista
    </button>
  );
}
