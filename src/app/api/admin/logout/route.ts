// src/app/api/admin/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminCookie,
  deleteAdminSession,
  getSessionId,
  runtime,
} from "@/lib/adminAuth";

export { runtime };

export async function POST(req: NextRequest) {
  const sessionId = getSessionId(req);
  await deleteAdminSession(sessionId);

  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}
