// src/app/api/admin/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orderStore";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  const order = await getOrder(id);

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}
