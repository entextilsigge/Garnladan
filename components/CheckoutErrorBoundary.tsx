"use client";

import { Component, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Error boundary specifikt runt kassaflödet (se app/kassa/page.tsx). Ett
// oväntat fel i ett enskilt steg (t.ex. Stripe Elements som kastar under
// rendering) ska visa ett hanterat felmeddelande i kassans egen yta, inte
// krascha hela sidan upp till Next.js app/error.tsx (som skulle ta bort
// header/footer/varukorg också).
//
// Måste vara en klasskomponent — React har ingen hook-motsvarighet till
// error boundaries (getDerivedStateFromError/componentDidCatch).
// ---------------------------------------------------------------------------

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class CheckoutErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[checkout-error-boundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-xl rounded-3xl bg-tegel/10 px-6 py-14 text-center">
          <p className="font-display text-2xl font-semibold text-kol">
            Något gick fel i kassan
          </p>
          <p className="mx-auto mt-3 max-w-sm text-mull">
            Det är inte du som gjort något fel — dina varor ligger fortfarande
            kvar i varukorgen. Försök igen om en liten stund.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-8 inline-block rounded-full bg-tegel px-8 py-3.5 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark"
          >
            Försök igen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
