"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getCart, type CartItem } from "@/lib/cart";

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

function shippingCost(items: CartItem[], zone: "UK" | "INTL") {
  const hasWallet = items.some((i) => i.id === "metal-wallet-photo");
  if (zone === "INTL") return 14.4; // £14.40
  return hasWallet ? 2.2 : 0; // UK: £2.20 only if wallet cards exist
}

export default function CheckoutPage() {
  const [shippingZone, setShippingZone] = useState<"UK" | "INTL">("UK");

  // read cart once on load (same pattern you’ve been using)
  const items = useMemo(() => getCart(), []);

  const missingUploads = useMemo(
    () => items.filter((i) => !i.uploadUrl),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0),
    [items]
  );

  const shipping = useMemo(
    () => shippingCost(items, shippingZone),
    [items, shippingZone]
  );

  const total = subtotal + shipping;

  async function payByCard() {
    if (!items.length) {
      alert("Cart empty");
      return;
    }
    if (missingUploads.length) {
      alert("Upload photos for every item before paying.");
      return;
    }

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, shippingZone }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.url) {
        alert(data?.error || "Stripe checkout failed");
        return;
      }

      window.location.href = data.url;
    } catch {
      alert("Stripe checkout failed");
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#061225", color: "#eaf2ff" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <Link href="/cart">← Back to Cart</Link>
          <Link href="/shop">Shop</Link>
        </header>

        <h1 style={{ marginTop: 18, fontSize: 44, fontWeight: 900 }}>Checkout</h1>

        <div
          style={{
            background: "#0b1e3a",
            border: "1px solid #1b2b4d",
            borderRadius: 18,
            padding: 18,
            marginTop: 12,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 900 }}>Shipping:</span>
            <select
              value={shippingZone}
              onChange={(e) => setShippingZone(e.target.value as "UK" | "INTL")}
              style={{
                padding: 8,
                borderRadius: 10,
                color: "#000",
                backgroundColor: "#fff",
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="UK">UK</option>
              <option value="INTL">International</option>
            </select>
          </label>

          <div style={{ marginTop: 10, color: "#a9c0e6" }}>
            Shipping cost: <strong>{money(shipping)}</strong>
          </div>

          <hr style={{ borderColor: "#1b2b4d", margin: "16px 0" }} />

          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>
            Uploaded photos
          </h2>

          {items.length === 0 ? (
            <p style={{ color: "#a9c0e6" }}>Your cart is empty.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((i) => {
                const hasUpload = !!i.uploadUrl;

                return (
                  <div
                    key={i.lineId}
                    style={{
                      background: "#061225",
                      border: "1px solid #1b2b4d",
                      borderRadius: 16,
                      padding: 14,
                      display: "flex",
                      gap: 14,
                      alignItems: "flex-start",
                    }}
                  >
                    {/* ✅ Thumbnail */}
                    <div
                      style={{
                        width: 140,
                        height: 105,
                        borderRadius: 14,
                        border: "1px solid #1b2b4d",
                        background: "#0b1e3a",
                        overflow: "hidden",
                        flex: "0 0 auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {hasUpload ? (
                        <img
                          src={i.uploadUrl!}
                          alt="Uploaded preview"
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      ) : (
                        <div style={{ color: "#ffb4b4", fontWeight: 900 }}>No photo</div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>{i.name}</div>
                      <div style={{ color: "#a9c0e6", marginTop: 2 }}>
                        Unit: {money(i.unitPrice)} • Qty: {i.qty}
                      </div>

                      {i.customText ? (
                        <div style={{ marginTop: 8 }}>
                          <div>Text: {i.customText}</div>
                          {i.font ? <div>Font: {i.font}</div> : null}
                        </div>
                      ) : null}

                      <div style={{ marginTop: 10, fontWeight: 800 }}>
                        {hasUpload ? (
                          <span style={{ color: "#8cffb0" }}>
                            ✓ Uploaded —{" "}
                            <a
                              href={i.uploadUrl!}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#8cffb0", textDecoration: "underline" }}
                            >
                              view file
                            </a>
                          </span>
                        ) : (
                          <span style={{ color: "#ff6b6b" }}>✗ Missing upload</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <hr style={{ borderColor: "#1b2b4d", margin: "16px 0" }} />

          <div style={{ color: "#a9c0e6" }}>Subtotal: {money(subtotal)}</div>
          <div style={{ color: "#a9c0e6" }}>Shipping: {money(shipping)}</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>
            Total: {money(total)}
          </div>

          <h3 style={{ marginTop: 16, fontWeight: 900 }}>Pay by Card (Stripe)</h3>

          <button
            onClick={payByCard}
            disabled={!items.length || !!missingUploads.length}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "14px 14px",
              borderRadius: 14,
              border: "1px solid #1b2b4d",
              background: !items.length || missingUploads.length ? "#3a3a3a" : "#2f7bff",
              color: "#fff",
              cursor: !items.length || missingUploads.length ? "not-allowed" : "pointer",
              fontWeight: 900,
            }}
          >
            Pay by Card
          </button>

          {!!missingUploads.length ? (
            <div style={{ marginTop: 10, color: "#ff6b6b", fontWeight: 800 }}>
              Upload photos for every item to enable payment.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
