// src/app/api/admin/auth/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "");
  const expected = process.env.ADMIN_TOKEN || "";

  if (!expected) {
    return NextResponse.json({ error: "Missing ADMIN_TOKEN env var" }, { status: 500 });
  }

  if (!token || token !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("gim_admin", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("gim_admin", "", { path: "/", maxAge: 0 });
  return res;
}
