// src/app/api/admin/orders/status/route.ts
import { NextResponse } from "next/server";
import { updateOrder, type OrderStatus } from "@/lib/orderStore";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.orderId || "");
    const status = String(body?.status || "") as OrderStatus;
    const trackingNumber = body?.trackingNumber ? String(body.trackingNumber) : null;

    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

    const patch: any = { status };

    if (status === "shipped") {
      patch.trackingNumber = trackingNumber || null;
      patch.shippedAt = new Date().toISOString();
    }

    const result = await updateOrder(orderId, patch);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }

    if (status === "shipped") {
      await sendOrderEmails({ order: result.order, type: "shipped" });
    }

    return NextResponse.json({ ok: true, order: result.order });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update order" }, { status: 500 });
  }
}
