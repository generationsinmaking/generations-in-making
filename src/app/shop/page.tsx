"use client";

import Link from "next/link";
import Image from "next/image";
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
  showFontGuideImage?: string; // optional helper image
};

const FONTS = ["Lato", "Charm", "Griffy", "Berkshire Swash"] as const;

const PRODUCTS: Product[] = [
  {
    id: "steel-photo",
    name: "304 Stainless Steel Photo",
    image: "/images/steel-photo.jpg",
    options: [
      { id: "steel-100x100", label: "100mm × 100mm — £20", price: 20 },
      { id: "steel-100x200", label: "100mm × 200mm — £40", price: 40 },
    ],
  },
  {
    id: "metal-wallet-photo",
    name: "Metal Wallet Photo Card",
    image: "/images/wallet-photo.jpg",
    // If you add a font guide image into /public/images, set it here:
    // showFontGuideImage: "/images/wallet-fonts.jpg",
    options: [
      { id: "wallet-photo-only", label: "Photo only — £4", price: 4 },
      { id: "wallet-photo-text", label: "Photo + custom text — £5.50", price: 5.5, requiresText: true },
    ],
  },
];

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

export default function ShopPage() {
  const [selectedOptionId, setSelectedOptionId] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of PRODUCTS) init[p.id] = p.options[0]?.id || "";
    return init;
  });

  const [walletText, setWalletText] = useState("");
  const [walletFont, setWalletFont] = useState<(typeof FONTS)[number]>("Lato");
  const [error, setError] = useState<string>("");

  const selectedOptionByProduct = useMemo(() => {
    const map: Record<string, ProductOption | undefined> = {};
    for (const p of PRODUCTS) {
      map[p.id] = p.options.find((o) => o.id === selectedOptionId[p.id]);
    }
    return map;
  }, [selectedOptionId]);

  function handleAdd(product: Product) {
    setError("");

    const opt = selectedOptionByProduct[product.id];
    if (!opt) {
      setError("Please choose an option.");
      return;
    }

    const isWallet = product.id === "metal-wallet-photo";
    const needsText = isWallet && !!opt.requiresText;

    const cleanText = walletText.trim();
    if (needsText && !cleanText) {
      setError("Please type the custom text for the wallet card.");
      return;
    }

    // ✅ CartItem DOES NOT support optionLabel in your project
    // So we include the option label inside the item name instead.
    const displayName = `${product.name} (${opt.label.replace(/ — £.*$/, "")})`;

    addToCart({
      id: product.id,
      name: displayName,
      qty: 1,
      unitPrice: opt.price,
      optionId: opt.id,
      customText: needsText ? cleanText : undefined,
      font: needsText ? walletFont : undefined,
    });
  }

  return (
    <main style={{ minHeight: "100vh", background: "#061225", color: "#eaf2ff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/">← Home</Link>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/cart">Cart</Link>
            <Link href="/checkout">Checkout</Link>
          </div>
        </header>

        <h1 style={{ marginTop: 22, fontSize: 44, letterSpacing: -0.5 }}>Shop</h1>

        {error ? (
          <div
            style={{
              background: "#3a1220",
              border: "1px solid #5a2335",
              color: "#ffd4df",
              padding: 12,
              borderRadius: 12,
              marginTop: 12,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
            marginTop: 18,
          }}
        >
          {PRODUCTS.map((p) => {
            const opt = selectedOptionByProduct[p.id];
            const isWallet = p.id === "metal-wallet-photo";
            const needsText = isWallet && !!opt?.requiresText;

            return (
              <div
                key={p.id}
                style={{
                  background: "#0b1e3a",
                  padding: 16,
                  borderRadius: 18,
                  border: "1px solid #1b2b4d",
                }}
              >
                <div
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid #20365f",
                    background: "#061225",
                  }}
                >
                  {/* Less cropping: contain */}
                  <div style={{ position: "relative", width: "100%", height: 340 }}>
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 520px"
                      style={{ objectFit: "contain" }}
                      priority={p.id === "steel-photo"}
                    />
                  </div>
                </div>

                <h2 style={{ marginTop: 14, fontSize: 20 }}>{p.name}</h2>

                <label style={{ display: "block", marginTop: 10, fontSize: 14, opacity: 0.95 }}>
                  Choose option:
                </label>
                <select
                  value={selectedOptionId[p.id]}
                  onChange={(e) => setSelectedOptionId((s) => ({ ...s, [p.id]: e.target.value }))}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: 10,
                    borderRadius: 12,
                    background: "#ffffff",
                    color: "#000",
                    border: "none",
                  }}
                >
                  {p.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>

                {isWallet ? (
                  <div style={{ marginTop: 12 }}>
                    {p.showFontGuideImage ? (
                      <div
                        style={{
                          marginTop: 10,
                          borderRadius: 14,
                          overflow: "hidden",
                          border: "1px solid #20365f",
                          background: "#061225",
                        }}
                      >
                        <div style={{ position: "relative", width: "100%", height: 220 }}>
                          <Image
                            src={p.showFontGuideImage}
                            alt="Font guide"
                            fill
                            sizes="(max-width: 768px) 100vw, 520px"
                            style={{ objectFit: "contain" }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {needsText ? (
                      <>
                        <label style={{ display: "block", marginTop: 12, fontSize: 14 }}>
                          Personalisation text:
                        </label>
                        <input
                          value={walletText}
                          onChange={(e) => setWalletText(e.target.value)}
                          placeholder="Type your text here…"
                          style={{
                            marginTop: 8,
                            width: "100%",
                            padding: 10,
                            borderRadius: 12,
                            border: "none",
                          }}
                        />

                        <label style={{ display: "block", marginTop: 12, fontSize: 14 }}>
                          Choose font:
                        </label>
                        <select
                          value={walletFont}
                          onChange={(e) => setWalletFont(e.target.value as (typeof FONTS)[number])}
                          style={{
                            marginTop: 8,
                            width: "100%",
                            padding: 10,
                            borderRadius: 12,
                            background: "#ffffff",
                            color: "#000",
                            border: "none",
                          }}
                        >
                          {FONTS.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <p style={{ marginTop: 10, opacity: 0.85, fontSize: 14 }}>
                        (Select “Photo + custom text” to add text + font.)
                      </p>
                    )}
                  </div>
                ) : null}

                <button
                  onClick={() => handleAdd(p)}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "none",
                    background: "#2f7bff",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Add to Cart {opt ? `• ${money(opt.price)}` : ""}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
