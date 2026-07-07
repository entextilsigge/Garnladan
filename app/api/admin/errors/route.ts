import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { getRecentErrors } from "@/lib/data/errorLogStore";

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  return NextResponse.json({ errors: getRecentErrors(100) });
}
