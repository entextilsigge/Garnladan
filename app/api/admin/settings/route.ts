import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { getShippingSettings, updateShippingSettings } from "@/lib/data/settingsStore";

function validateSettingsInput(body: unknown): string | null {
  if (!body || typeof body !== "object") return "Ogiltig data.";
  const input = body as Record<string, unknown>;
  if ("ombudPrice" in input && (typeof input.ombudPrice !== "number" || input.ombudPrice < 0)) {
    return "Ogiltigt pris för PostNord — ombud.";
  }
  if ("hemPrice" in input && (typeof input.hemPrice !== "number" || input.hemPrice < 0)) {
    return "Ogiltigt pris för hemleverans.";
  }
  if ("freeShippingEnabled" in input && typeof input.freeShippingEnabled !== "boolean") {
    return "Ogiltigt värde för fri frakt (av/på).";
  }
  if (
    "freeShippingThreshold" in input &&
    (typeof input.freeShippingThreshold !== "number" || input.freeShippingThreshold < 0)
  ) {
    return "Ogiltig fri frakt-gräns.";
  }
  for (const key of ["fraktjaktOmbudProductId", "fraktjaktHemProductId"] as const) {
    if (key in input && input[key] !== null && (typeof input[key] !== "number" || input[key]! <= 0)) {
      return "Ogiltigt Fraktjakt-tjänste-id (måste vara ett positivt heltal, eller tomt).";
    }
  }
  if (
    "fraktjaktBalanceThreshold" in input &&
    (typeof input.fraktjaktBalanceThreshold !== "number" || input.fraktjaktBalanceThreshold < 0)
  ) {
    return "Ogiltig varningströskel för Fraktjakt-saldo.";
  }
  if (
    "fraktjaktLastTopupAmount" in input &&
    (typeof input.fraktjaktLastTopupAmount !== "number" || input.fraktjaktLastTopupAmount < 0)
  ) {
    return "Ogiltigt belopp för \"senast påfyllt till\".";
  }
  for (const key of ["fraktjaktEstimatedCostOmbud", "fraktjaktEstimatedCostHem"] as const) {
    if (key in input && (typeof input[key] !== "number" || input[key]! < 0)) {
      return "Ogiltig uppskattad fraktkostnad.";
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  return NextResponse.json(await getShippingSettings());
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const validationError = validateSettingsInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  const updated = await updateShippingSettings(body as Record<string, unknown>);
  return NextResponse.json(updated);
}
