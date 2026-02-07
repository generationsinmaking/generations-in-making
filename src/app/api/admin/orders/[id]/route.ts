// src/app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/orderStore";

export const runtime = "nodejs";

function isAuthed(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || "";
  return token && token === (process.env.ADMIN_TOKEN || "");
}

// Optional: UK-only lock
function isAllowedCountry(req: NextRequest) {
  if (process.env.ADMIN_UK_ONLY !== "1") return true;

  const vercelCountry = (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const cfCountry = (req.headers.get("cf-ipcountry") || "").toUpperCase();

  const country = vercelCountry || cfCountry;
  return country === "GB";
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAuthed(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAllowedCountry(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
