// src/app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkUkLock, createAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const uk = checkUkLock(req);
  if (!uk.ok) return NextResponse.json({ error: uk.message }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "");

  if (!process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Missing ADMIN_TOKEN env var" }, { status: 500 });
  }

  if (token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}
