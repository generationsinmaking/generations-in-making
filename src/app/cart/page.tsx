"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCart,
  removeFromCart,
  clearCart,
  setItemUpload,
  type CartItem,
} from "@/lib/cart";

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [uploadingLineId, setUploadingLineId] = useState<string | null>(null);

  // one ref per lineId so we can reset the file input safely
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function refresh() {
    setItems(getCart());
  }

  useEffect(() => {
    refresh();
    const onChanged = () => refresh();
    window.addEventListener("gim-cart-changed", onChanged);
    return () => window.removeEventListener("gim-cart-changed", onChanged);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0),
    [items]
  );

  async function uploadForItem(lineId: string, file: File) {
    setUploadingLineId(lineId);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error || "Upload failed");
        return;
      }

      // Expecting: { url: "/uploads/xxx.jpg", name: "xxx.jpg" }
      const url = data?.url as string | undefined;
      const name = (data?.name as string | undefined) || file.name;

      if (!url) {
        alert("Upload worked but server did not return a file URL.");
        return;
      }

      setItemUpload(lineId, url, name);
      refresh();
    } finally {
      setUploadingLineId(null);

      // reset file input so user can pick same file again
      const el = fileRefs.current[lineId];
      if (el) el.value = "";
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#061225", color: "#eaf2ff" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <Link href="/shop">← Shop</Link>
          <Link href="/checkout">Checkout</Link>
        </header>

        <h1 style={{ marginTop: 18, fontSize: 44, fontWeight: 900 }}>Your Cart</h1>

        {items.length === 0 ? (
          <p style={{ color: "#a9c0e6" }}>Your cart is empty.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {items.map((i) => {
              const isUploading = uploadingLineId === i.lineId;

              return (
                <div
                  key={i.lineId}
                  style={{
                    background: "#0b1e3a",
                    border: "1px solid #1b2b4d",
                    borderRadius: 18,
                    padding: 18,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 20 }}>{i.name}</div>

                      <div style={{ color: "#a9c0e6", marginTop: 4 }}>
                        Unit price: {money(i.unitPrice)} • Qty: {i.qty}
                      </div>

                      {i.customText ? (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontWeight: 800 }}>Custom text:</div>
                          <div>{i.customText}</div>
                          {i.font ? (
                            <div style={{ color: "#a9c0e6" }}>Font: {i.font}</div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={() => {
                        removeFromCart(i.lineId);
                        refresh();
                      }}
                      style={{
                        height: 36,
                        padding: "0 14px",
                        borderRadius: 12,
                        border: "1px solid #1b2b4d",
                        background: "#061225",
                        color: "#eaf2ff",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  {/* ✅ THUMBNAIL + UPLOAD */}
                  <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 160,
                        height: 120,
                        borderRadius: 14,
                        border: "1px solid #1b2b4d",
                        background: "#061225",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      {i.uploadUrl ? (
                        <img
                          src={i.uploadUrl}
                          alt="Uploaded preview"
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      ) : (
                        <div style={{ color: "#ffb4b4", fontWeight: 900 }}>No photo</div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>
                        Upload photo (required)
                      </div>

                      {i.uploadUrl ? (
                        <div style={{ color: "#8cffb0", fontWeight: 800, marginBottom: 6 }}>
                          ✓ Uploaded —{" "}
                          <a
                            href={i.uploadUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#8cffb0", textDecoration: "underline" }}
                          >
                            view file
                          </a>
                        </div>
                      ) : (
                        <div style={{ color: "#ff6b6b", fontWeight: 800, marginBottom: 6 }}>
                          ✗ Not uploaded yet
                        </div>
                      )}

                      <input
                        ref={(el) => {
                          fileRefs.current[i.lineId] = el;
                        }}
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0];
                          if (!file) return;
                          uploadForItem(i.lineId, file);
                        }}
                      />

                      <div style={{ marginTop: 12, fontWeight: 900 }}>
                        Line total: {money(i.unitPrice * i.qty)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 18, fontSize: 22, fontWeight: 900 }}>
          Total: {money(total)}
        </div>

        <button
          onClick={() => {
            clearCart();
            refresh();
          }}
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #1b2b4d",
            background: "#061225",
            color: "#eaf2ff",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Clear cart
        </button>
      </div>
    </main>
  );
}
