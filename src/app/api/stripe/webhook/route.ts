import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { saveOrder, type StoredOrderItem } from "@/lib/orderStore";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const resend = new Resend(process.env.RESEND_API_KEY || "");

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
  shippingAddressText?: string | null;
}) {
  return `
  <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:24px">
    <div style="max-width:700px;margin:auto;background:#ffffff;border-radius:12px;padding:24px">
      <h1 style="margin-top:0">Thank you for your order 💙</h1>
      <p>Your order <strong>${order.id}</strong> has been received.</p>

      ${
        order.shippingAddressText
          ? `<p><strong>Shipping address:</strong><br/>${order.shippingAddressText}</p><hr />`
          : `<hr />`
      }

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

function formatAddress(addr: any) {
  if (!addr) return null;
  const parts = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.state,
    addr.postal_code,
    addr.country,
  ].filter(Boolean);
  return parts.length ? parts.join("<br/>") : null;
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

    const email =
      session.customer_details?.email ||
      session.customer_email ||
      "unknown";

    // ✅ This is the important part:
    // Stripe TS types on your install don't include shipping_details, so we read it safely.
    const shippingDetails = (session as any).shipping_details || null;
    const shippingAddr =
      shippingDetails?.address ||
      session.customer_details?.address ||
      null;

    const shippingName =
      shippingDetails?.name ||
      session.customer_details?.name ||
      null;

    const shippingPhone =
      session.customer_details?.phone || null;

    const shippingAddressText = (() => {
      const addrHtml = formatAddress(shippingAddr);
      if (!addrHtml) return null;
      const nameLine = shippingName ? `${shippingName}<br/>` : "";
      const phoneLine = shippingPhone ? `<br/>${shippingPhone}` : "";
      return `${nameLine}${addrHtml}${phoneLine}`;
    })();

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

    const order = {
      id: `GIM-${session.id.slice(-6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "pending" as const,
      customerEmail: email,

      // ✅ Save shipping data so you can post items
      shippingName,
      shippingPhone,
      shippingAddress: shippingAddr || null,
      shippingAddressText,

      shippingZone: meta?.shippingZone || "UK",
      shippingCost,
      subtotal,
      total,
      stripeSessionId: session.id,
      items,
    };

    // ✅ Save for admin panel
    await saveOrder(order as any);

    // ✅ Email customer (only if Resend is configured)
    if (process.env.RESEND_API_KEY && email !== "unknown") {
      try {
        await resend.emails.send({
          from:
            process.env.ORDER_FROM_EMAIL ||
            "Generations in Making <onboarding@resend.dev>",
          to: email,
          subject: `Your order ${order.id} – Generations in Making`,
          html: renderInvoiceEmail({
            id: order.id,
            customerEmail: email,
            items,
            subtotal,
            shippingCost,
            total,
            shippingAddressText,
          }),
        });
      } catch (e) {
        // Don't fail the webhook if email fails
        console.error("Resend send failed:", e);
      }
    }

    // ✅ Optional: email admin if set
    if (process.env.ADMIN_TO_EMAIL && process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from:
            process.env.ORDER_FROM_EMAIL ||
            "Generations in Making <onboarding@resend.dev>",
          to: process.env.ADMIN_TO_EMAIL,
          subject: `New order ${order.id}`,
          html: `
            <p><strong>New order:</strong> ${order.id}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${
              shippingAddressText
                ? `<p><strong>Shipping:</strong><br/>${shippingAddressText}</p>`
                : `<p><strong>Shipping:</strong> (missing)</p>`
            }
            <p><strong>Total:</strong> ${money(total)}</p>
          `,
        });
      } catch (e) {
        console.error("Admin email failed:", e);
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
