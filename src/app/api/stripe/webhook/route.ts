import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { saveOrder, type StoredOrder, type StoredOrderItem } from "@/lib/orderStore";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

const resend = new Resend(process.env.RESEND_API_KEY || "");

function gbpToNumber(amountMinor: number | null | undefined) {
  return typeof amountMinor === "number" ? amountMinor / 100 : 0;
}

function moneyGBP(n: number) {
  return `£${n.toFixed(2)}`;
}

function safeText(s: unknown) {
  return typeof s === "string" ? s : "";
}

function formatShippingHTML(addr?: StoredOrder["shippingAddress"] | null) {
  if (!addr) return "";

  const lines = [
    addr.name,
    addr.line1,
    addr.line2,
    addr.city,
    addr.state,
    addr.postal_code,
    addr.country,
  ].filter(Boolean);

  return `
    <div style="margin-top:10px">
      <strong>Shipping address</strong><br/>
      ${lines.map((l) => `${l}<br/>`).join("")}
      ${addr.phone ? `<div>Phone: ${addr.phone}</div>` : ""}
    </div>
  `;
}

function buildItemsHTML(items: StoredOrderItem[]) {
  return items
    .map((it) => {
      const img = it.uploadUrl
        ? `<img src="${it.uploadUrl}" style="width:120px;height:90px;object-fit:contain;border:1px solid #ddd;border-radius:8px" />`
        : "";

      return `
        <div style="display:flex;gap:16px;margin-bottom:16px">
          ${img}
          <div>
            <strong>${it.name}</strong><br/>
            Qty: ${it.qty}<br/>
            Unit price: ${moneyGBP(it.unitPrice)}<br/>
            Line total: ${moneyGBP(it.unitPrice * it.qty)}
            ${it.customText ? `<div style="margin-top:6px"><strong>Text:</strong> ${it.customText}</div>` : ""}
            ${it.font ? `<div><strong>Font:</strong> ${it.font}</div>` : ""}
          </div>
        </div>
      `;
    })
    .join("");
}

async function sendOrderEmails(params: {
  order: StoredOrder;
  buyerEmail?: string | null;
  adminEmail?: string | null;
  type: "created" | "shipped";
  trackingNumber?: string | null;
}) {
  const { order, buyerEmail, adminEmail, type, trackingNumber } = params;

  const from = safeText(process.env.ORDER_FROM_EMAIL).trim();
  if (!from || !from.includes("<") || !from.includes(">")) {
    throw new Error(
      "ORDER_FROM_EMAIL is missing or invalid. Use: Name <email@yourdomain.com>"
    );
  }

  const subject =
    type === "created"
      ? `NEW ORDER ${order.id} – ${moneyGBP(order.total)}`
      : `SHIPPED ${order.id}${trackingNumber ? ` – Tracking: ${trackingNumber}` : ""}`;

  const html = `
  <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:24px">
    <div style="max-width:700px;margin:auto;background:#ffffff;border-radius:12px;padding:24px">
      <h1 style="margin-top:0">
        ${type === "created" ? "Thank you for your order 💙" : "Your order has shipped 📦"}
      </h1>

      <p>
        Your order <strong>${order.id}</strong>
        ${type === "created" ? " has been received." : " is on the way."}
      </p>

      ${trackingNumber ? `<p><strong>Tracking:</strong> ${trackingNumber}</p>` : ""}

      ${formatShippingHTML(order.shippingAddress)}

      <hr />

      ${buildItemsHTML(order.items)}

      <hr />

      <p>Subtotal: ${moneyGBP(order.subtotal)}</p>
      <p>Shipping: ${moneyGBP(order.shippingCost)}</p>
      <h2>Total: ${moneyGBP(order.total)}</h2>

      <hr />

      <p style="font-size:14px;color:#555">
        ${type === "created"
          ? "We’ll begin working on your item shortly. If you have any questions, reply to this email."
          : "If you have any questions, reply to this email and we’ll help you."}
      </p>

      <p style="margin-top:24px;font-weight:bold">Generations in Making</p>
    </div>
  </div>
  `;

  if (buyerEmail) {
    await resend.emails.send({
      from,
      to: buyerEmail,
      subject: type === "created" ? `Order received ${order.id}` : `Order shipped ${order.id}`,
      html,
    });
  }

  if (adminEmail) {
    await resend.emails.send({
      from,
      to: adminEmail,
      subject,
      html,
    });
  }
}

export async function POST(req: Request) {
  try {
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing Stripe signature or STRIPE_WEBHOOK_SECRET" },
        { status: 400 }
      );
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err?.message || "unknown"}` },
        { status: 400 }
      );
    }

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ ok: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price.product"],
    });

    const customerEmail =
      full.customer_details?.email ||
      (typeof full.customer_email === "string" ? full.customer_email : "") ||
      "";

    const customerName = full.customer_details?.name || "";
    const phone = full.customer_details?.phone || "";

    const addr = full.customer_details?.address || null;

    const shippingAddress: StoredOrder["shippingAddress"] = addr
      ? {
          name: customerName,
          phone,
          line1: addr.line1 || "",
          line2: addr.line2 || "",
          city: addr.city || "",
          state: addr.state || "",
          postal_code: addr.postal_code || "",
          country: addr.country || "",
        }
      : null;

    const lineItems = full.line_items?.data || [];

    const items: StoredOrderItem[] = lineItems.map((li) => {
      const qty = li.quantity || 1;
      const unitPrice = gbpToNumber(li.price?.unit_amount);

      const product = li.price?.product as Stripe.Product | null;
      const name = product?.name || li.description || "Item";

      const uploadUrl = safeText(full.metadata?.uploadUrl) || null;
      const customText = safeText(full.metadata?.customText) || null;
      const font = safeText(full.metadata?.font) || null;

      return {
        id: li.id,
        name,
        qty,
        unitPrice,
        uploadUrl,
        customText,
        font,
      };
    });

    const subtotal = gbpToNumber(full.amount_subtotal);
    const total = gbpToNumber(full.amount_total);
    const shippingCost = gbpToNumber(full.total_details?.amount_shipping);

    const orderId = `GIM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const order: StoredOrder = {
      id: orderId,
      // ✅ FIX: StoredOrder.createdAt is a string in your project
      createdAt: new Date().toISOString(),
      status: "paid",
      customerEmail,
      stripeSessionId: full.id,
      items,
      subtotal,
      shippingCost,
      total,
      shippingZone: safeText(full.metadata?.shippingZone) || "UK",
      shippingAddress,
    };

    await saveOrder(order);

    await sendOrderEmails({
      order,
      buyerEmail: customerEmail || null,
      adminEmail: process.env.ADMIN_TO_EMAIL || null,
      type: "created",
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
