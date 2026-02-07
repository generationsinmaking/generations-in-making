// src/lib/email.ts
import { Resend } from "resend";
import type { StoredOrder } from "@/lib/orderStore";

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

function formatAddress(order: StoredOrder) {
  const a = order.shippingAddress || {};
  const lines = [
    a.name,
    a.line1,
    a.line2,
    a.city,
    a.state,
    a.postal_code,
    a.country,
  ].filter(Boolean);

  return {
    lines,
    phone: a.phone || null,
  };
}

export function renderOrderEmail(order: StoredOrder) {
  const addr = formatAddress(order);

  return `
  <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:24px">
    <div style="max-width:700px;margin:auto;background:#ffffff;border-radius:12px;padding:24px">
      <h1 style="margin-top:0">Thank you for your order 💙</h1>
      <p>Your order <strong>${order.id}</strong> has been received.</p>

      ${
        addr.lines.length
          ? `
        <div style="margin-top:10px">
          <strong>Shipping address</strong><br/>
          ${addr.lines.map((l) => `${l}<br/>`).join("")}
          ${addr.phone ? `<div>Phone: ${addr.phone}</div>` : ""}
        </div>
      `
          : ""
      }

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

      ${
        order.trackingNumber
          ? `
        <hr />
        <h3>Tracking</h3>
        <p>Your tracking number is: <strong>${order.trackingNumber}</strong></p>
      `
          : ""
      }

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

export async function sendOrderEmails(params: {
  order: StoredOrder;
  type: "new_order" | "shipped";
}) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("Missing RESEND_API_KEY");

  const resend = new Resend(resendKey);

  const from = process.env.ORDER_FROM_EMAIL || "Generations in Making <onboarding@resend.dev>";
  const adminTo = process.env.ADMIN_TO_EMAIL || "";
  const subject =
    params.type === "shipped"
      ? `Shipped: ${params.order.id} – ${params.order.trackingNumber || ""}`
      : `Your order ${params.order.id} – Generations in Making`;

  // buyer
  if (params.order.customerEmail && params.order.customerEmail !== "unknown") {
    await resend.emails.send({
      from,
      to: params.order.customerEmail,
      subject,
      html: renderOrderEmail(params.order),
    });
  }

  // admin copy (optional)
  if (adminTo) {
    await resend.emails.send({
      from,
      to: adminTo,
      subject: `[ADMIN] ${subject}`,
      html: renderOrderEmail(params.order),
    });
  }
}
