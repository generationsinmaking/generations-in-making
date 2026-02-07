// src/app/admin/orders/[id]/packing-slip/page.tsx
import { getOrder } from "@/lib/orderStore";

export const runtime = "nodejs";

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

export default async function PackingSlipPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id);

  if (!order) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Not found</h1>
        <p>Order does not exist.</p>
      </div>
    );
  }

  const a = order.shippingAddress || {};
  const addrLines = [a.name, a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean);

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <style>{`
        @media print {
          button, a { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <a href="/admin/orders" style={{ textDecoration: "none" }}>← Back</a>
        <button
          onClick={() => window.print()}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            background: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Print
        </button>
      </div>

      <h1 style={{ margin: 0 }}>Packing Slip</h1>
      <div style={{ marginTop: 6, color: "#333" }}>
        <strong>Order:</strong> {order.id} • <strong>Date:</strong>{" "}
        {new Date(order.createdAt).toLocaleString()}
      </div>

      <hr style={{ margin: "16px 0" }} />

      <h2 style={{ margin: "0 0 8px 0" }}>Ship to</h2>
      {addrLines.length ? (
        <div style={{ lineHeight: 1.5 }}>
          {addrLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {a.phone ? <div>Phone: {a.phone}</div> : null}
        </div>
      ) : (
        <div>Shipping address not available.</div>
      )}

      <hr style={{ margin: "16px 0" }} />

      <h2 style={{ margin: "0 0 8px 0" }}>Items</h2>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 0" }}>Item</th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px 0" }}>Qty</th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px 0" }}>Line</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it, idx) => (
            <tr key={idx}>
              <td style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
                <div style={{ fontWeight: 700 }}>{it.name}</div>
                {it.customText ? (
                  <div style={{ color: "#444", marginTop: 4 }}>
                    Text: “{it.customText}” • Font: {it.font || "Default"}
                  </div>
                ) : null}
                {it.uploadUrl ? (
                  <div style={{ marginTop: 4, color: "#444" }}>Upload: {it.uploadUrl}</div>
                ) : null}
              </td>
              <td style={{ textAlign: "right", padding: "10px 0", borderBottom: "1px solid #eee" }}>
                {it.qty}
              </td>
              <td style={{ textAlign: "right", padding: "10px 0", borderBottom: "1px solid #eee" }}>
                {money(it.unitPrice * it.qty)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <div>Subtotal: {money(order.subtotal)}</div>
        <div>Shipping: {money(order.shippingCost)}</div>
        <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>Total: {money(order.total)}</div>
      </div>

      {order.trackingNumber ? (
        <div style={{ marginTop: 16 }}>
          <strong>Tracking:</strong> {order.trackingNumber}
        </div>
      ) : null}
    </div>
  );
}
