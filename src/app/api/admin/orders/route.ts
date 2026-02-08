// src/app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listOrders } from "@/lib/orderStore";
import { requireAdmin, runtime } from "@/lib/adminAuth";

export { runtime };

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const orders = await listOrders(200);
  return NextResponse.json({ orders });
}
