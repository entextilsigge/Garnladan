// ---------------------------------------------------------------------------
// HTML-escaping för fritext som kunden själv skrivit in (namn, adress,
// e-post) men som sedan klistras in i rå HTML-strängar — t.ex.
// bekräftelsemejlen i lib/email.ts, som byggs som HTML-mallar med
// template-interpolation, INTE via Reacts JSX (som redan escapar
// automatiskt). Utan detta skulle ett kundnamn som `<img src=x onerror=...>`
// injiceras rakt in i mejlets HTML.
// ---------------------------------------------------------------------------

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
