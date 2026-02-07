import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { saveOrder, type StoredOrderItem } from "@/lib/orderStore";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  // Don't set apiVersion here if you keep hitting type issues.
  // Stripe will use your account default. This avoids TS mismatch problems.
});

const resend = new Resend(process.env.RESEND_API_KEY || "");

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

function formatAddress(a: {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
} | null) {
  if (!a) return "Not provided";
  const parts = [
    a.line1,
    a.line2,
    a.city,
    a.postal_code,
    a.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "Not provided";
}

function renderInvoiceEmail(order: {
  id: string;
  email: string;
  items: StoredOrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingAddress: any;
}) {
  return `
  <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:24px">
    <div style="max-width:700px;margin:auto;background:#ffffff;border-radius:12px;padding:24px">
      <h1 style="margin-top:0">Thank you for your order 💙</h1>
      <p>Your order <strong>${order.id}</strong> has been received.</p>

      <hr />

      <h3>Delivery address</h3>
      <p style="margin-top:0">${formatAddress(order.shippingAddress)}</p>

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
        We’ll begin working on your item shortly. If you have any questions, reply to this email.
      </p>

      <p style="margin-top:24px;font-weight:bold">Generations in Making</p>
    </div>
  </div>
  `;
}

export async function POST(req: Request) {
  try {
    const sig = req.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !secret) {
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
    }

    const raw = await req.text();
    const event = stripe.webhooks.constructEvent(raw, sig, secret);

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // ✅ Email
    const email =
      session.customer_details?.email ||
      session.customer_email ||
      "unknown";

    // ✅ Shipping address (Type-safe workaround: Stripe types can differ by version)
    const shippingDetails = (session as any).shipping_details as
      | { address?: any }
      | undefined;

    const shippingAddress =
      shippingDetails?.address ||
      session.customer_details?.address ||
      null;

    // ✅ Cart metadata you saved when creating the checkout session
    const meta = session.metadata?.cart
      ? JSON.parse(session.metadata.cart)
      : null;

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

    // ✅ Build an order object (use any so we don’t get blocked by strict type differences)
    const order: any = {
      id: `GIM-${session.id.slice(-6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "paid",
      email,              // some parts of your app expect email
      customerEmail: email, // some parts of your app expect customerEmail
      shippingCost,
      subtotal,
      total,
      stripeSessionId: session.id,
      shippingAddress,    // ✅ address saved in order
      items,
    };

    // ✅ Save for admin panel
    await saveOrder(order);

    // ✅ Send buyer email (and optionally admin email)
    const from =
      process.env.ORDER_FROM_EMAIL ||
      "Generations in Making <onboarding@resend.dev>";

    const adminTo = process.env.ADMIN_TO_EMAIL || "";

    // Buyer
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from,
        to: email,
        subject: `Your order ${order.id} – Generations in Making`,
        html: renderInvoiceEmail({
          id: order.id,
          email,
          items,
          subtotal,
          shippingCost,
          total,
          shippingAddress,
        }),
      });

      // Admin copy (optional but recommended)
      if (adminTo) {
        await resend.emails.send({
          from,
          to: adminTo,
          subject: `NEW ORDER ${order.id} – ${money(total)}`,
          html: renderInvoiceEmail({
            id: order.id,
            email,
            items,
            subtotal,
            shippingCost,
            total,
            shippingAddress,
          }),
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Webhook error" },
      { status: 500 }
    );
  }
}
