// src/lib/email.ts
import { Resend } from "resend";
import type { StoredOrder } from "@/lib/orderStore";

type EmailType = "new_order" | "shipped";

const resend = new Resend(process.env.RESEND_API_KEY || "");

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderItems(order: StoredOrder) {
  return order.items
    .map((i) => {
      const img = i.uploadUrl
        ? `<img src="${escapeHtml(i.uploadUrl)}" style="width:120px;height:90px;object-fit:contain;border:1px solid #ddd;border-radius:8px" />`
        : "";

      const custom =
        i.customText
          ? `<div style="margin-top:6px;color:#333">
               <div><strong>Text:</strong> “${escapeHtml(i.customText)}”</div>
               <div><strong>Font:</strong> ${escapeHtml(i.font || "Default")}</div>
             </div>`
          : "";

      return `
        <div style="display:flex;gap:16px;margin-bottom:16px">
          ${img}
          <div>
            <strong>${escapeHtml(i.name)}</strong><br/>
            Qty: ${i.quantity}<br/>
            Unit price: ${money(i.unitPrice)}<br/>
            Line total: ${money(i.lineTotal)}
            ${custom}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderShippingBlock(order: StoredOrder) {
  const a = order.shippingAddress || null;

  const lines = [
    order.shippingName || "",
    a?.line1 || "",
    a?.line2 || "",
    a?.city || "",
    a?.state || "",
    a?.postalCode || "",
    a?.country || "",
  ].filter(Boolean);

  if (lines.length === 0 && !a?.phone) return "";

  return `
    <div style="margin-top:10px">
      <strong>Shipping address</strong><br/>
      ${lines.map((l) => `${escapeHtml(l)}<br/>`).join("")}
      ${a?.phone ? `<div>Phone: ${escapeHtml(a.phone)}</div>` : ""}
    </div>
  `;
}

function renderEmail(order: StoredOrder, type: EmailType, recipient: "buyer" | "admin") {
  const heading =
    type === "shipped"
      ? "Your order has shipped 📦"
      : recipient === "admin"
      ? "New order received 💙"
      : "Thank you for your order 💙";

  const subject =
    type === "shipped"
      ? `Your order ${order.id} has shipped – Generations in Making`
      : recipient === "admin"
      ? `NEW ORDER ${order.id} – ${money(order.total)}`
      : `Your order ${order.id} – Generations in Making`;

  const html = `
  <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:24px">
    <div style="max-width:700px;margin:auto;background:#ffffff;border-radius:12px;padding:24px">
      <h1 style="margin-top:0">${heading}</h1>

      <p>
        Order <strong>${escapeHtml(order.id)}</strong><br/>
        Date: ${escapeHtml(new Date(order.createdAt).toLocaleString("en-GB"))}<br/>
        Status: ${escapeHtml(order.status)}
      </p>

      ${renderShippingBlock(order)}

      <hr />

      ${renderItems(order)}

      <hr />

      <p>Subtotal: ${money(order.subtotal)}</p>
      <p>Shipping: ${money(order.shipping)}</p>
      <h2>Total: ${money(order.total)}</h2>

      <hr />

      <p style="font-size:14px;color:#555">
        We’ll begin working on your item shortly.
        If you have any questions, reply to this email.
      </p>

      <p style="margin-top:24px;font-weight:bold">Generations in Making</p>
    </div>
  </div>
  `;

  return { subject, html };
}

export async function sendOrderEmails({
  order,
  type,
}: {
  order: StoredOrder;
  type: EmailType;
}) {
  const from =
    process.env.ORDER_FROM_EMAIL || "Generations in Making <onboarding@resend.dev>";
  const adminTo = process.env.ORDER_TO_EMAIL || "";

  // Buyer email
  if (order.customerEmail) {
    const { subject, html } = renderEmail(order, type, "buyer");
    await resend.emails.send({
      from,
      to: order.customerEmail,
      subject,
      html,
    });
  }

  // Admin email (optional but recommended)
  if (adminTo) {
    const { subject, html } = renderEmail(order, type, "admin");
    await resend.emails.send({
      from,
      to: adminTo,
      subject,
      html,
    });
  }
}
