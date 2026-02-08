// src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { saveOrder, type StoredOrder } from "@/lib/orderStore";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const resend = new Resend(process.env.RESEND_API_KEY || "");

function safeString(v: unknown) {
  return typeof v === "string" ? v : "";
}

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    if (!webhookSecret) {
      return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
    }

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err?.message || "Unknown error"}` },
        { status: 400 }
      );
    }

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ ok: true, ignored: event.type });
    }

    const sessionFromEvent = event.data.object as Stripe.Checkout.Session;
    const sessionId = sessionFromEvent.id;

    // Fetch full session with line items
    const fullResp = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    });

    // Stripe returns Stripe.Response<Session> — cast to Session so we can use it
    const full = fullResp as unknown as Stripe.Checkout.Session;

    const lineItems = (full.line_items?.data || []) as Stripe.LineItem[];

    // ✅ Stripe types sometimes don’t include shipping_details, so access via "any"
    const shippingDetails = (((full as any).shipping_details ?? null) as any) || null;
    const customerDetails = (((full as any).customer_details ?? null) as any) || null;

    const addrSrc = shippingDetails?.address ?? customerDetails?.address ?? null;

    const shippingName =
      safeString(shippingDetails?.name) ||
      safeString(customerDetails?.name) ||
      safeString((full as any)?.customer_details?.name) ||
      "";

    const shippingAddress = addrSrc
      ? {
          line1: safeString(addrSrc.line1),
          line2: safeString(addrSrc.line2),
          city: safeString(addrSrc.city),
          state: safeString(addrSrc.state),
          postalCode: safeString(addrSrc.postal_code),
          country: safeString(addrSrc.country),
          phone: safeString(shippingDetails?.phone || customerDetails?.phone || null),
        }
      : null;

    const customerEmail =
      safeString((full as any)?.customer_details?.email) ||
      safeString((full as any)?.customer_email) ||
      "";

    const subtotalPence = (full as any).amount_subtotal ?? 0;
    const shippingPence = (full as any).total_details?.amount_shipping ?? 0;
    const totalPence = (full as any).amount_total ?? 0;

    const items = lineItems.map((li) => {
      const qty = li.quantity ?? 1;

      const unitAmountPence =
        (li.price?.unit_amount ?? null) ??
        ((li.amount_subtotal != null
          ? Math.round(li.amount_subtotal / Math.max(qty, 1))
          : 0) as number);

      const lineTotalPence =
        li.amount_subtotal != null ? li.amount_subtotal : unitAmountPence * qty;

      const productName =
        safeString((li.price?.product as any)?.name) ||
        safeString(li.description) ||
        "Item";

      const meta = ((li as any)?.metadata || {}) as Record<string, any>;
      const uploadUrl = safeString(meta.uploadUrl || meta.upload_url || "");
      const customText = safeString(meta.customText || meta.custom_text || "");
      const font = safeString(meta.font || "");

      return {
        name: productName,
        quantity: qty,
        unitPrice: Number((unitAmountPence / 100).toFixed(2)),
        lineTotal: Number((lineTotalPence / 100).toFixed(2)),
        uploadUrl: uploadUrl || undefined,
        customText: customText || undefined,
        font: font || undefined,
      };
    });

    const orderId = `GIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const order: StoredOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      status: "paid",
      customerEmail,
      stripeSessionId: sessionId,

      subtotal: Number((subtotalPence / 100).toFixed(2)),
      shipping: Number((shippingPence / 100).toFixed(2)),
      total: Number((totalPence / 100).toFixed(2)),

      shippingName: shippingName || undefined,
      shippingAddress: shippingAddress || undefined,

      items,
    };

    await saveOrder(order);

    // ✅ Your sendOrderEmails only supports: "new_order" | "shipped"
    await sendOrderEmails({ order, type: "new_order" });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Webhook failed" }, { status: 500 });
  }
}
