// src/app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listOrders } from "@/lib/orderStore";

export const runtime = "nodejs";

function isAdminAllowed(req: NextRequest) {
  // Optional UK-only lock (works on Vercel where this header exists)
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

export async function GET(req: NextRequest) {
  if (!isAdminAllowed(req)) {
    return NextResponse.json({ error: "Admin is restricted" }, { status: 403 });
  }
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || "200");

  const orders = await listOrders(Number.isFinite(limit) ? limit : 200);
  return NextResponse.json({ orders });
}
