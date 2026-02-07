import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { saveOrder, type StoredOrderItem } from "@/lib/orderStore";

export const runtime = "nodejs";

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

function renderInvoiceEmail(order: {
  id: string;
  customerEmail: string;
  items: StoredOrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
}) {
  return `
  <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:24px">
    <div style="max-width:700px;margin:auto;background:#ffffff;border-radius:12px;padding:24px">

      <h1 style="margin-top:0">Thank you for your order 💙</h1>
      <p>Your order <strong>${order.id}</strong> has been received.</p>

      <hr />

      ${order.items
        .map(
          (i) => `
        <div style="display:flex;gap:16px;margin-bottom:16px;align-items:flex-start">
          ${
            i.uploadUrl
              ? `<img src="${i.uploadUrl}" style="width:120px;height:90px;object-fit:contain;border:1px solid #ddd;border-radius:8px" />`
              : ""
          }
          <div>
            <strong>${i.name}</strong><br/>
            Qty: ${i.qty}<br/>
            Unit price: ${money(i.unitPrice)}<br/>
            Line total: ${money(i.unitPrice * i.qty)}
            ${
              i.customText
                ? `<div style="margin-top:6px">
                    Text: "${i.customText}"<br/>
                    Font: ${i.font || "Default"}
                  </div>`
                : ""
            }
          </div>
        </div>
      `
        )
        .join("")}

      <hr />

      <p>Subtotal: ${money(order.subtotal)}</p>
      <p>Shipping: ${money(order.shippingCost)}</p>
      <h2>Total: ${money(order.total)}</h2>

      <hr />

      <p style="font-size:14px;color:#555">
        We’ll begin working on your item shortly.
        If you have any questions, reply to this email.
      </p>

      <p style="margin-top:24px;font-weight:bold">
        Generations in Making
      </p>
    </div>
  </div>
  `;
}

export async function POST(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecret) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }
    if (!webhookSecret) {
      return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
    }

    // Create Stripe ONLY at request time (prevents Vercel build crash)
    const stripe = new Stripe(stripeSecret);

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    const raw = await req.text();
    const event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    const email =
      session.customer_details?.email ||
      session.customer_email ||
      "unknown";

    const meta = session.metadata?.cart ? JSON.parse(session.metadata.cart) : null;

    const items: StoredOrderItem[] = Array.isArray(meta?.items)
      ? meta.items.map((i: any) => ({
          id: i.id,
          name: i.name,
          qty: i.qty,
          unitPrice: i.unitPrice,
          uploadUrl: i.uploadUrl || null,
          customText: i.customText || null,
          font: i.font || null,
        }))
      : [];

    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const shippingCost = Number(meta?.shippingCost || 0);
    const total = subtotal + shippingCost;

    // IMPORTANT: some older orderStore types expect "email" not "customerEmail"
    const order = {
      id: `GIM-${session.id.slice(-6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "pending" as const,
      email, // <- keeps compatibility if your StoredOrder expects email
      customerEmail: email, // <- also keep this for your UI if you use it
      shippingZone: meta?.shippingZone || "UK",
      shippingCost,
      subtotal,
      total,
      stripeSessionId: session.id,
      items,
    } as any;

    await saveOrder(order);

    // Send email only if Resend key exists (never crash the webhook)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: process.env.ORDER_FROM_EMAIL || "Generations in Making <onboarding@resend.dev>",
        to: email,
        subject: `Your order ${order.id} – Generations in Making`,
        html: renderInvoiceEmail({
          id: order.id,
          customerEmail: email,
          items,
          subtotal,
          shippingCost,
          total,
        }),
      });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Webhook error" },
      { status: 500 }
    );
  }
}
