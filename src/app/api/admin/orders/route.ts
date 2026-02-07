// src/app/api/admin/orders/route.ts
import { NextResponse } from "next/server";
import { listOrders } from "@/lib/orderStore";

export const runtime = "nodejs";

export async function GET() {
  try {
    const orders = await listOrders(200);
    return NextResponse.json({ orders });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load orders" }, { status: 500 });
  }
}
