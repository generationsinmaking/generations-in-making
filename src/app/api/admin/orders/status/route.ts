// src/app/api/admin/orders/status/route.ts
import { NextResponse } from "next/server";
import { updateOrderStatus, type OrderStatus } from "@/lib/orderStore";

function isAuthed(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_TOKEN || "";
  if (!expected) return false;
  return token === expected;
}

export async function POST(req: Request) {
  try {
    if (!isAuthed(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const orderId = String(body?.orderId || "");
    const status = body?.status as OrderStatus;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    if (!["pending", "in_progress", "completed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const result = updateOrderStatus(orderId, status);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
