import { NextResponse } from "next/server";
import { listOrders } from "@/lib/orderStore";

export const runtime = "nodejs";

export async function GET() {
  try {
    const orders = await listOrders();

    // Optional: limit how many show in admin
    const limited = orders.slice(0, 200);

    return NextResponse.json({ orders: limited });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load orders" },
      { status: 500 }
    );
  }
}
