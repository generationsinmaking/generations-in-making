"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addToCart } from "@/lib/cart";

type ProductOption = {
  id: string;
  label: string;
  price: number;
  requiresText?: boolean;
};

type Product = {
  id: string;
  name: string;
  image: string;
  options: ProductOption[];
};

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

const FONTS = ["Lato", "Charm", "Griffy", "Berkshire Swash"] as const;

export default function ShopPage() {
  const products: Product[] = useMemo(
    () => [
      {
        id: "steel-photo",
        name: "304 Stainless Steel Photo",
        image: "/images/steel-photo.jpg",
        options: [
          { id: "100x100", label: "100mm × 100mm", price: 20 },
          { id: "100x200", label: "100mm × 200mm", price: 40 },
        ],
      },
      {
        id: "metal-wallet-photo",
        name: "Metal Wallet Photo Card",
        image: "/images/wallet-photo.jpg",
        options: [
          { id: "photo-only", label: "Photo only", price: 4, requiresText: false },
          { id: "photo-text", label: "Photo + custom text", price: 5.5, requiresText: true },
        ],
      },
    ],
    []
  );

  const [selectedOptionByProduct, setSelectedOptionByProduct] = useState<Record<string, string>>({
    "steel-photo": "100x100",
    "metal-wallet-photo": "photo-only",
  });

  const [walletText, setWalletText] = useState<string>("");
  const [walletFont, setWalletFont] = useState<(typeof FONTS)[number]>("Lato");

  function getSelectedOption(product: Product) {
    const optId = selectedOptionByProduct[product.id] || product.options[0].id;
    return product.options.find((o) => o.id === optId) || product.options[0];
  }

  function onAdd(product: Product) {
    const opt = getSelectedOption(product);
    const requiresText = !!opt.requiresText;

    const cleanText = walletText.trim();

    if (product.id === "metal-wallet-photo" && requiresText && !cleanText) {
      alert("Please enter your personalisation text.");
      return;
    }

    // IMPORTANT:
    // We only include fields that your cart system is already using:
    // id, name, qty, unitPrice + optionId/optionLabel + customText/font
    addToCart({
      id: product.id,
      name:
        product.id === "steel-photo"
          ? `${product.name} (${opt.label})`
          : `${product.name} (${opt.label})`,
      qty: 1,
      unitPrice: opt.price,
      optionId: opt.id,
      optionLabel: opt.label,
      customText: product.id === "metal-wallet-photo" && requiresText ? cleanText : undefined,
      font: product.id === "metal-wallet-photo" && requiresText ? walletFont : undefined,
    } as any);

    // Optional: clear the text after adding the custom-text version
    if (product.id === "metal-wallet-photo" && requiresText) {
      setWalletText("");
      setWalletFont("Lato");
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#061225", color: "#eaf2ff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ color: "#b98cff", textDecoration: "none" }}>
            ← Home
          </Link>
          <Link href="/cart" style={{ color: "#b98cff", textDecoration: "none" }}>
            Cart
          </Link>
        </header>

        <h1 style={{ marginTop: 18, fontSize: 44, fontWeight: 800 }}>Shop</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 22,
            marginTop: 18,
          }}
        >
          {products.map((p) => {
            const opt = getSelectedOption(p);
            const needsText = p.id === "metal-wallet-photo" && !!opt.requiresText;

            return (
              <section
                key={p.id}
                style={{
                  background: "#0b1e3a",
                  border: "1px solid #1b2b4d",
                  borderRadius: 18,
                  overflow: "hidden",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                }}
              >
                <div style={{ padding: 18 }}>
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.12)",
                      padding: 12,
                    }}
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{
                        width: "100%",
                        height: 330,
                        objectFit: "contain",
                        borderRadius: 12,
                        display: "block",
                      }}
                    />
                  </div>

                  <h2 style={{ marginTop: 16, marginBottom: 10, fontSize: 22, fontWeight: 800 }}>
                    {p.name}
                  </h2>

                  <label style={{ display: "block", marginTop: 10, fontSize: 14, opacity: 0.92 }}>
                    Choose option:
                  </label>

                  <select
                    value={selectedOptionByProduct[p.id] || p.options[0].id}
                    onChange={(e) =>
                      setSelectedOptionByProduct((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "#ffffff",
                      color: "#000",
                      fontSize: 15,
                    }}
                  >
                    {p.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label} — {money(o.price)}
                      </option>
                    ))}
                  </select>

                  {/* Wallet custom text + font selection */}
                  {p.id === "metal-wallet-photo" && needsText && (
                    <>
                      <label
                        style={{
                          display: "block",
                          marginTop: 14,
                          fontSize: 14,
                          opacity: 0.92,
                        }}
                      >
                        Personalisation text:
                      </label>

                      <input
                        value={walletText}
                        onChange={(e) => setWalletText(e.target.value)}
                        placeholder="Type your text here..."
                        style={{
                          width: "100%",
                          marginTop: 8,
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "#ffffff",
                          color: "#000",
                          fontSize: 15,
                        }}
                      />

                      {/* ✅ THIS is where the font preview image goes: ABOVE the font dropdown */}
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 14, opacity: 0.92, marginBottom: 8 }}>
                          Font examples:
                        </div>

                        <img
                          src="/images/fonts-preview.jpg"
                          alt="Font examples (Lato, Charm, Griffy, Berkshire Swash)"
                          style={{
                            width: "100%",
                            maxHeight: 220,
                            objectFit: "contain",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.04)",
                            padding: 10,
                          }}
                        />
                      </div>

                      <label
                        style={{
                          display: "block",
                          marginTop: 14,
                          fontSize: 14,
                          opacity: 0.92,
                        }}
                      >
                        Choose font:
                      </label>

                      <select
                        value={walletFont}
                        onChange={(e) => setWalletFont(e.target.value as any)}
                        style={{
                          width: "100%",
                          marginTop: 8,
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "#ffffff",
                          color: "#000",
                          fontSize: 15,
                        }}
                      >
                        {FONTS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  <button
                    onClick={() => onAdd(p)}
                    style={{
                      width: "100%",
                      marginTop: 18,
                      padding: "14px 14px",
                      borderRadius: 12,
                      border: "0",
                      background: "#2f7cff",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Add to Cart • {money(opt.price)}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
