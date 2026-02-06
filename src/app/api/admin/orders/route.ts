import { NextResponse } from "next/server";
import { listOrders } from "@/lib/orderStore";

export const runtime = "nodejs";

function isAllowed(req: Request) {
  const expected = process.env.ADMIN_TOKEN || "";
  if (!expected) return false;
  const url = new URL(req.url);
  const q = url.searchParams.get("token") || "";
  const h = req.headers.get("x-admin-token") || "";
  return q === expected || h === expected;
}

export async function GET(req: Request) {
  if (!isAllowed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orders = await listOrders();
  return NextResponse.json({ orders });
}
