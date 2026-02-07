// src/app/api/admin/orders/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { updateOrder, type OrderStatus } from "@/lib/orderStore";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";

function isAdminAllowed(req: NextRequest) {
  if (process.env.ADMIN_UK_ONLY === "1") {
    const country = req.headers.get("x-vercel-ip-country");
    if (country && country !== "GB") return false;
  }
  return true;
}

function isAuthed(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || "";
  return token && token === process.env.ADMIN_TOKEN;
}

export async function POST(req: NextRequest) {
  if (!isAdminAllowed(req)) {
    return NextResponse.json({ error: "Admin is restricted" }, { status: 403 });
  }
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { id?: string; status?: OrderStatus; trackingNumber?: string }
    | null;

  const id = body?.id;
  const status = body?.status;

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id/status" }, { status: 400 });
  }

  const patch: { status: OrderStatus; trackingNumber?: string | null; shippedAt?: string | null } = {
    status,
  };

  if (typeof body?.trackingNumber === "string" && body.trackingNumber.trim()) {
    patch.trackingNumber = body.trackingNumber.trim();
  }

  if (status === "shipped") {
    patch.shippedAt = new Date().toISOString();
  } else {
    patch.shippedAt = null;
  }

  const result = await updateOrder(id, patch);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  // If you want emails when marked shipped:
  if (status === "shipped") {
    await sendOrderEmails({ order: result.order, type: "shipped" });
  }

  return NextResponse.json({ ok: true, order: result.order });
}
