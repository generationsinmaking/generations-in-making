import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, setAdminCookie, checkUkLock } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const uk = checkUkLock(req);
  if (!uk.ok) {
    return NextResponse.json({ error: uk.message }, { status: 403 });
  }

  const adminToken = (process.env.ADMIN_TOKEN || "").trim();
  if (!adminToken) {
    return NextResponse.json(
      { error: "Missing ADMIN_TOKEN on server" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "").trim();

  if (!token || token !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = await createAdminSession();
  const res = NextResponse.json({ ok: true });
  setAdminCookie(res, sessionId);
  return res;
}
