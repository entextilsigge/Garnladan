"use client";

// Yttersta felfångaren — triggas bara om ROOT-layouten själv (app/layout.tsx)
// kastar ett fel, så den måste definiera sin egen <html>/<body> (ersätter
// hela dokumentet, inga andra layouts/CSS-variabler är garanterat laddade).
// Håller sig därför till inline-stilar istället för Tailwind-klasser eller
// varumärkets typsnitt, som en sista, garanterat fungerande reserv.
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error-boundary]", error);
  }, [error]);

  return (
    <html lang="sv">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7F2E8",
          color: "#241C14",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <p style={{ fontSize: 56, fontWeight: 700, color: "#A64B33", margin: 0 }}>Oj då</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 16 }}>Något gick fel</h1>
          <p style={{ marginTop: 12, color: "#5E4C3A" }}>
            Ett oväntat fel inträffade. Försök igen om en liten stund.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              borderRadius: 999,
              background: "#A64B33",
              color: "#F7F2E8",
              border: "none",
              padding: "14px 32px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Försök igen
          </button>
        </div>
      </body>
    </html>
  );
}
