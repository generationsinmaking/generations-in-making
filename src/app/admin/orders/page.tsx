// src/app/admin/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type StoredOrderItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  uploadUrl?: string | null;
  customText?: string | null;
  font?: string | null;
};

type ShippingAddress = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
};

type StoredOrder = {
  id: string;
  createdAt: string;
  status: "pending" | "paid" | "shipped" | "cancelled";
  customerEmail: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingZone?: string;
  shippingAddress?: ShippingAddress | null;
  stripeSessionId: string;
  items: StoredOrderItem[];
  trackingNumber?: string | null;
  shippedAt?: string | null;
};

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

function formatAddr(a?: ShippingAddress | null) {
  if (!a) return null;
  const lines = [a.name, a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean);
  return { lines, phone: a.phone || null };
}

export default function AdminOrdersPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);

  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [trackingDraft, setTrackingDraft] = useState<Record<string, string>>({});

  async function login() {
    setErr("");
    const r = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!r.ok) {
      setAuthed(false);
      setErr("Invalid admin token.");
      return;
    }
    setAuthed(true);
    await loadOrders();
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
    setOrders([]);
  }

  async function loadOrders() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/orders", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to load orders");
      setOrders(Array.isArray(j.orders) ? j.orders : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function markShipped(orderId: string) {
    setErr("");
    const trackingNumber = (trackingDraft[orderId] || "").trim() || null;

    const r = await fetch("/api/admin/orders/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, status: "shipped", trackingNumber }),
    });
    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      setErr(j?.error || "Failed to mark shipped");
      return;
    }

    setOrders((prev) => prev.map((o) => (o.id === orderId ? j.order : o)));
  }

  // If already authed cookie exists, you can still just refresh orders
  useEffect(() => {
    // user chooses when to login; keep simple
  }, []);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [orders]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>Admin — Orders</h1>

      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token"
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(0,0,0,0.25)",
              color: "white",
              minWidth: 320,
            }}
          />
          <button
            onClick={login}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: "#2f7cff",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Login
          </button>

          <button
            onClick={loadOrders}
            disabled={!authed || loading}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "white",
              fontWeight: 700,
              cursor: !authed ? "not-allowed" : "pointer",
              opacity: !authed ? 0.6 : 1,
            }}
          >
            {loading ? "Loading..." : "Load / Refresh orders"}
          </button>

          <button
            onClick={logout}
            disabled={!authed}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "white",
              fontWeight: 700,
              cursor: !authed ? "not-allowed" : "pointer",
              opacity: !authed ? 0.6 : 1,
            }}
          >
            Logout
          </button>
        </div>

        {err ? <div style={{ color: "#ff6b6b", marginTop: 10 }}>{err}</div> : null}
        {!authed ? (
          <div style={{ marginTop: 10, opacity: 0.85 }}>
            Tip: after login, admin is protected by a secure cookie + (optional) UK-only IP lock.
          </div>
        ) : null}
      </div>

      {!authed ? (
        <div style={{ opacity: 0.9 }}>Login above to view orders.</div>
      ) : sortedOrders.length === 0 ? (
        <div style={{ opacity: 0.9 }}>No orders found yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sortedOrders.map((o) => {
            const addr = formatAddr(o.shippingAddress);
            return (
              <div
                key={o.id}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: 16,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>
                      {money(o.total)} • {o.customerEmail}
                    </div>
                    <div style={{ opacity: 0.85, marginTop: 4 }}>
                      {new Date(o.createdAt).toLocaleString()} • Status: <strong>{o.status}</strong>
                    </div>
                    <div style={{ opacity: 0.75, marginTop: 4 }}>
                      Session: <span style={{ fontFamily: "monospace" }}>{o.stripeSessionId}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <a
                      href={`/admin/orders/${encodeURIComponent(o.id)}/packing-slip`}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "white",
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      Print packing slip
                    </a>
                  </div>
                </div>

                {addr ? (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(0,0,0,0.18)" }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Shipping address</div>
                    <div style={{ lineHeight: 1.4 }}>
                      {addr.lines.map((l, idx) => (
                        <div key={idx}>{l}</div>
                      ))}
                      {addr.phone ? <div>Phone: {addr.phone}</div> : null}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, opacity: 0.85 }}>
                    Shipping address: <strong>Not available</strong> (make sure Stripe is collecting shipping).
                  </div>
                )}

                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {o.items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: 14,
                        alignItems: "center",
                        padding: 12,
                        borderRadius: 12,
                        background: "rgba(0,0,0,0.18)",
                      }}
                    >
                      {it.uploadUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.uploadUrl}
                          alt=""
                          style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 10 }}
                        />
                      ) : null}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900 }}>{it.name}</div>
                        <div style={{ opacity: 0.85 }}>
                          Qty {it.qty} • Unit {money(it.unitPrice)} • Line {money(it.unitPrice * it.qty)}
                        </div>
                        {it.customText ? (
                          <div style={{ opacity: 0.85, marginTop: 4 }}>
                            Text: “{it.customText}” • Font: {it.font || "Default"}
                          </div>
                        ) : null}
                      </div>
                      {it.uploadUrl ? (
                        <a href={it.uploadUrl} target="_blank" rel="noreferrer" style={{ color: "#7cc0ff" }}>
                          View upload
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    value={trackingDraft[o.id] ?? o.trackingNumber ?? ""}
                    onChange={(e) => setTrackingDraft((p) => ({ ...p, [o.id]: e.target.value }))}
                    placeholder="Tracking number (optional)"
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(0,0,0,0.25)",
                      color: "white",
                      minWidth: 260,
                    }}
                  />

                  <button
                    onClick={() => markShipped(o.id)}
                    disabled={o.status === "shipped"}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "none",
                      background: o.status === "shipped" ? "rgba(255,255,255,0.15)" : "#28c76f",
                      color: "white",
                      fontWeight: 900,
                      cursor: o.status === "shipped" ? "not-allowed" : "pointer",
                    }}
                  >
                    {o.status === "shipped" ? "Already shipped" : "Mark as shipped (emails buyer)"}
                  </button>

                  {o.shippedAt ? (
                    <div style={{ opacity: 0.85 }}>
                      Shipped at: {new Date(o.shippedAt).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
