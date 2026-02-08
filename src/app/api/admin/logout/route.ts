// src/app/api/admin/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}
