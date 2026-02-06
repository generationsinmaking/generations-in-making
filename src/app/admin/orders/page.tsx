"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  uploadUrl?: string | null;
  customText?: string | null;
  font?: string | null;
};

type Order = {
  id: string;
  createdAt: string;
  status: "pending" | "in_progress" | "completed";
  customerEmail: string;
  shippingZone: "UK" | "INTL";
  shippingCost: number;
  subtotal: number;
  total: number;
  stripeSessionId?: string;
  items: OrderItem[];
};

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

export default function AdminOrdersPage() {
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const res = await fetch("/api/admin/orders", {
      headers: { "x-admin-token": token },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOrders([]);
      setError(data?.error || "Failed to load orders");
      return;
    }
    setOrders(Array.isArray(data.orders) ? data.orders : []);
  }

  useEffect(() => {
    // do not auto-load (needs token)
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#061225", color: "#eaf2ff" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <Link href="/">← Home</Link>
          <Link href="/shop">Shop</Link>
        </header>

        <h1 style={{ marginTop: 18 }}>Admin — Orders</h1>

        <div
          style={{
            marginTop: 12,
            background: "#0b1e3a",
            border: "1px solid #1b2b4d",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <label style={{ display: "block", color: "#a9c0e6" }}>
            Admin token:
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={{
                display: "block",
                marginTop: 8,
                width: "100%",
                maxWidth: 420,
                padding: 10,
                borderRadius: 12,
                border: "1px solid #1b2b4d",
                background: "#061225",
                color: "#eaf2ff",
              }}
            />
          </label>

          <button
            onClick={load}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              background: "#2f7bff",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Load / Refresh orders
          </button>

          {error ? <div style={{ marginTop: 10, color: "#ffb4b4" }}>{error}</div> : null}
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
          {orders.length === 0 ? (
            <div style={{ color: "#a9c0e6" }}>No orders found yet.</div>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                style={{
                  background: "#0b1e3a",
                  border: "1px solid #1b2b4d",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {money(o.total)} • {o.customerEmail || "unknown"}
                </div>
                <div style={{ color: "#a9c0e6", marginTop: 4 }}>
                  {new Date(o.createdAt).toLocaleString()} • Shipping {o.shippingZone} ({money(o.shippingCost)}) •
                  Subtotal {money(o.subtotal)}
                </div>
                <div style={{ color: "#8fb0dc", marginTop: 4, fontSize: 12 }}>
                  Session: {o.stripeSessionId || o.id}
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {o.items.map((i, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        border: "1px solid #1b2b4d",
                        borderRadius: 14,
                        padding: 12,
                        background: "#061225",
                      }}
                    >
                      <div
                        style={{
                          width: 140,
                          height: 100,
                          borderRadius: 12,
                          border: "1px solid #1b2b4d",
                          background: "#0b1e3a",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {i.uploadUrl ? (
                          <img
                            src={i.uploadUrl}
                            alt="upload"
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <div style={{ color: "#ffb4b4", fontWeight: 800 }}>No upload</div>
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900 }}>{i.name}</div>
                        <div style={{ color: "#a9c0e6" }}>
                          Qty {i.qty} • Unit {money(i.unitPrice)} • Line {money(i.unitPrice * i.qty)}
                        </div>

                        {i.customText ? (
                          <div style={{ marginTop: 6 }}>
                            <div>Text: {i.customText}</div>
                            {i.font ? <div>Font: {i.font}</div> : null}
                          </div>
                        ) : null}

                        {i.uploadUrl ? (
                          <div style={{ marginTop: 6 }}>
                            <a
                              href={i.uploadUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#8cffb0", textDecoration: "underline" }}
                            >
                              View upload
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
