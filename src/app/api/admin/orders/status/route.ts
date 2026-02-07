// src/app/api/admin/orders/status/route.ts
import { NextResponse } from "next/server";
import { updateOrderStatus, type OrderStatus } from "@/lib/orderStore";

export const runtime = "nodejs";

function isAuthed(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

export async function POST(req: Request) {
  try {
    if (!isAuthed(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || "");
    const status = body.status as OrderStatus;

    if (!orderId || !status) {
      return NextResponse.json({ error: "Missing orderId or status" }, { status: 400 });
    }

    const result = await updateOrderStatus(orderId, status);

    if (!result.ok) {
      return NextResponse.json({ error: result.message || "Failed" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
