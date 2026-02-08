import { NextRequest, NextResponse } from "next/server";
import { updateOrder, type OrderStatus } from "@/lib/orderStore";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "").trim();
  const status = String(body?.status || "").trim() as OrderStatus;
  const trackingNumber = body?.trackingNumber
    ? String(body.trackingNumber).trim()
    : undefined;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

  const patch: Record<string, any> = { status };

  if (status === "shipped") {
    patch.shippedAt = new Date().toISOString();
    if (trackingNumber) patch.trackingNumber = trackingNumber;
  }

  const result = await updateOrder(id, patch);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order: result.order });
}
