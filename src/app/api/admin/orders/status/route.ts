import { NextResponse } from "next/server";
import { updateOrderStatus, type OrderStatus } from "@/lib/orderStore";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";

function getAdminToken(req: Request) {
  const headerToken = req.headers.get("x-admin-token");
  if (headerToken) return headerToken;

  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7);

  return null;
}

export async function POST(request: Request) {
  try {
    // --- Admin auth ---
    const expected = process.env.ADMIN_TOKEN;
    const provided = getAdminToken(request);

    if (!expected) {
      return NextResponse.json(
        { error: "Missing ADMIN_TOKEN on server" },
        { status: 500 }
      );
    }

    if (!provided || provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Body ---
    const body = await request.json().catch(() => null);
    const orderId = body?.orderId as string | undefined;
    const status = body?.status as OrderStatus | undefined;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "Missing orderId or status" },
        { status: 400 }
      );
    }

    // --- Update ---
    const result = await updateOrderStatus(orderId, status);

    // result.order can be undefined -> handle it safely
    if (!result?.ok || !result?.order) {
      return NextResponse.json(
        { error: result?.message || "Order not found" },
        { status: 404 }
      );
    }

    // --- Optional: shipped email ---
    if (status === "shipped") {
      await sendOrderEmails({ order: result.order, type: "shipped" } as any);
    }

    return NextResponse.json({ ok: true, order: result.order });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to update order" },
      { status: 500 }
    );
  }
}
