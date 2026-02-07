// src/app/api/admin/orders/route.ts
import { NextResponse } from "next/server";
import { getOrders } from "@/lib/orderStore";

export const runtime = "nodejs";

function isAuthed(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

export async function GET(req: Request) {
  try {
    if (!isAuthed(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await getOrders();
    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
