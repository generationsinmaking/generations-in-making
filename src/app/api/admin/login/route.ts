// src/app/api/admin/login/route.ts
import { NextResponse } from "next/server";

const COOKIE_NAME = "gim_admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const secret = process.env.ADMIN_TOKEN || "";
    if (!secret) {
      return NextResponse.json(
        { error: "Missing ADMIN_TOKEN on server" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "");

    if (!token || token !== secret) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Login failed" },
      { status: 500 }
    );
  }
}
