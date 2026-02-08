// src/app/api/admin/orders/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { updateOrderStatus, type OrderStatus } from "@/lib/orderStore";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "");
    const status = String(body?.status || "") as OrderStatus;
    const trackingNumber = (body?.trackingNumber ?? null) as string | null;

    if (!id) return NextResponse.json({ error: "Missing order id" }, { status: 400 });

    if (status !== "paid" && status !== "shipped" && status !== "cancelled") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // ✅ FIX: pass tracking number as a string (not an object)
    const result = await updateOrderStatus(id, status, trackingNumber ?? undefined);

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }

    // Email only when shipped (tracking optional)
    if (status === "shipped") {
      await sendOrderEmails({ order: result.order, type: "shipped" });
    }

    return NextResponse.json({ ok: true, order: result.order });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
