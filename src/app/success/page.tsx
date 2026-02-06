"use client";

import Link from "next/link";
import { useEffect } from "react";
import { clearCart } from "@/lib/cart";

export default function SuccessPage() {
  useEffect(() => {
    clearCart();
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#061225", color: "#eaf2ff" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <h1 style={{ marginTop: 20, fontSize: 44, fontWeight: 800 }}>Payment successful ✅</h1>
        <p style={{ marginTop: 12, color: "#a9c0e6" }}>
          Thanks! Your order has been received. Your cart has been cleared.
        </p>

        <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
          <Link href="/shop">Back to Shop</Link>
          <Link href="/admin/orders" style={{ marginLeft: 12 }}>
            Admin Orders
          </Link>
        </div>
      </div>
    </main>
  );
}
