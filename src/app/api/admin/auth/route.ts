// src/app/api/admin/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, runtime } from "@/lib/adminAuth";

export { runtime };

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false }, { status: auth.status });
  }
  return NextResponse.json({ ok: true });
}
