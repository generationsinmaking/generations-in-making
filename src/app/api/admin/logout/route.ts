import { NextRequest, NextResponse } from "next/server";
import { clearAdminCookie, deleteAdminSession, getSessionId } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sessionId = getSessionId(req);
  await deleteAdminSession(sessionId);

  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}
