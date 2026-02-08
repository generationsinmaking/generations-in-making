// src/app/api/admin/orders/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { updateOrderStatus, type OrderStatus } from "@/lib/orderStore";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "");
  const status = String(body?.status || "") as OrderStatus;
  const trackingNumber = body?.trackingNumber ? String(body.trackingNumber) : undefined;

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id/status" }, { status: 400 });
  }

  const result = await updateOrderStatus(id, status, trackingNumber);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 404 });

  // Optional: email when shipped
  if (status === "shipped") {
    await sendOrderEmails({ order: result.order, type: "shipped" });
  }

  return NextResponse.json({ ok: true, order: result.order });
}
