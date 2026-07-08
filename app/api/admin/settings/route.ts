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
