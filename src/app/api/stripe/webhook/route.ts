// src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { saveOrder, type StoredOrderItem, type StoredOrder } from "@/lib/orderStore";

export const runtime = "nodejs";

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

function renderInvoiceEmail(order: StoredOrder) {
  const addr = order.shippingAddress;
  const addressHtml = addr
    ? `
      <div style="margin-top:10px">
        <strong>Shipping address</strong><br/>
        ${order.shippingName ? `${order.shippingName}<br/>` : ""}
        ${addr.line1 ? `${addr.line1}<br/>` : ""}
        ${addr.line2 ? `${addr.line2}<br/>` : ""}
        ${addr.city ? `${addr.city}<br/>` : ""}
        ${addr.state ? `${addr.state}<br/>` : ""}
        ${addr.postal_code ? `${addr.postal_code}<br/>` : ""}
        ${addr.country ? `${addr.country}<br/>` : ""}
        ${order.shippingPhone ? `<div>Phone: ${order.shippingPhone}</div>` : ""}
      </div>
    `
    : `<div style="margin-top:10px"><strong>Shipping address</strong><br/>Not provided</div>`;

  return `
  <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:24px">
    <div style="max-width:700px;margin:auto;background:#ffffff;border-radius:12px;padding:24px">
      <h1 style="margin-top:0">Thank you for your order 💙</h1>
      <p>Your order <strong>${order.id}</strong> has been received.</p>

      ${addressHtml}

      <hr />

      ${order.items
        .map(
          (i) => `
        <div style="display:flex;gap:16px;margin-bottom:16px">
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

    if (!stripeSecret || !webhookSecret) {
      return NextResponse.json({ error: "Missing Stripe keys" }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2026-01-28.clover",
    });

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
    }

    const rawBody = await req.text();
    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

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
          optionId: i.optionId || null,
          optionLabel: i.optionLabel || null,
        }))
      : [];

    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const shippingCost = Number(meta?.shippingCost || 0);
    const total = subtotal + shippingCost;

    const addr = session.customer_details?.address || null;

    const order: StoredOrder = {
      id: `GIM-${session.id.slice(-6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "paid",
      customerEmail: email,

      shippingName: session.customer_details?.name || null,
      shippingPhone: session.customer_details?.phone || null,
      shippingAddress: addr
        ? {
            line1: addr.line1 || null,
            line2: addr.line2 || null,
            city: addr.city || null,
            state: addr.state || null,
            postal_code: addr.postal_code || null,
            country: addr.country || null,
          }
        : null,

      shippingZone: meta?.shippingZone || "UK",
      shippingCost,
      subtotal,
      total,

      stripeSessionId: session.id,
      items,
    };

    // ✅ Save order into Redis (works on Vercel)
    await saveOrder(order);

    // ✅ Emails
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.ORDER_FROM_EMAIL || "Generations in Making <onboarding@resend.dev>";
    const adminTo = process.env.ADMIN_TO_EMAIL;

    if (resendKey) {
      const resend = new Resend(resendKey);

      // customer email
      if (email && email !== "unknown") {
        await resend.emails.send({
          from,
          to: email,
          subject: `Your order ${order.id} – Generations in Making`,
          html: renderInvoiceEmail(order),
        });
      }

      // admin email
      if (adminTo) {
        await resend.emails.send({
          from,
          to: adminTo,
          subject: `NEW ORDER ${order.id} – £${order.total.toFixed(2)}`,
          html: renderInvoiceEmail(order),
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    // Stripe wants a 2xx if you handled it, otherwise it will keep retrying.
    return NextResponse.json({ error: err?.message || "Webhook error" }, { status: 500 });
  }
}
