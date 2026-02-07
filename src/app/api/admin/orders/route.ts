import { NextResponse } from "next/server";
import { getOrders } from "@/lib/orderStore";

export const runtime = "nodejs";

function isAuthed(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  return token && token === (process.env.ADMIN_TOKEN || "");
}

export async function GET(req: Request) {
  try {
    if (!isAuthed(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await getOrders();
    return NextResponse.json({ ok: true, orders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load orders" },
      { status: 500 }
    );
  }
}
