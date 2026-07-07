import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { createCampaign, getAllCampaigns, type CampaignInput } from "@/lib/data/campaignStore";

function validateCampaignInput(body: unknown): string | null {
  if (!body || typeof body !== "object") return "Ogiltig kampanjdata.";
  const input = body as Record<string, unknown>;
  if (!input.name || typeof input.name !== "string") return "Namn krävs.";
  if (!input.channel || typeof input.channel !== "string") return "Kanal krävs.";
  if (!input.startDate || typeof input.startDate !== "string") return "Startdatum krävs.";
  if (!input.endDate || typeof input.endDate !== "string") return "Slutdatum krävs.";
  if (input.startDate > input.endDate) return "Startdatum måste vara före slutdatum.";
  if (input.budget !== undefined && input.budget !== null && typeof input.budget !== "number") {
    return "Budget måste vara ett tal.";
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  return NextResponse.json({ campaigns: getAllCampaigns() });
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const validationError = validateCampaignInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  const campaign = createCampaign(body as CampaignInput);
  return NextResponse.json({ campaign }, { status: 201 });
}
