"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { products } from "@/lib/products";
import { addToCart } from "@/lib/cart";

// Fonts you wanted (names shown in dropdown)
const WALLET_FONTS = ["Lato", "Charm", "Griffy", "Berkshire Swash"];

export default function Shop() {
  const [selectedOption, setSelectedOption] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of products) initial[p.id] = p.options[0]?.id || "";
    return initial;
  });

  const [walletText, setWalletText] = useState("");
  const [walletFont, setWalletFont] = useState(WALLET_FONTS[0]);

  function money(n: number) {
    return `£${n.toFixed(2)}`;
  }

  return (
    <main style={{ minHeight: "100vh", background: "#061225", color: "#eaf2ff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <Link href="/">← Home</Link>
          <Link href="/cart">Cart</Link>
        </header>

        <h1 style={{ marginTop: 30 }}>Shop</h1>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {products.map((p) => {
            const optionId = selectedOption[p.id];
            const opt = p.options.find((o) => o.id === optionId) || p.options[0];
            const needsText = !!opt?.requiresText;

            return (
              <div
                key={p.id}
                style={{
                  background: "#0b1e3a",
                  borderRadius: 18,
                  border: "1px solid #1b2b4d",
                  overflow: "hidden",
                }}
              >
                {/* Product image (NOT CROPPED) */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 340,
                    background: "#071a33",
                  }}
                >
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    style={{
                      objectFit: "contain", // <-- this stops cropping
                      padding: 14,
                    }}
                  />
                </div>

                {/* View full image link */}
                <div style={{ padding: "10px 16px 0" }}>
                  <a
                    href={p.image}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#a9c0e6", fontSize: 13, textDecoration: "underline" }}
                  >
                    View full image
                  </a>
                </div>

                <div style={{ padding: 16 }}>
                  <h3 style={{ margin: "0 0 6px" }}>{p.name}</h3>
                  <p style={{ margin: "0 0 12px", color: "#a9c0e6" }}>{p.description}</p>

                  <select
                    value={optionId}
                    onChange={(e) =>
                      setSelectedOption((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid #1b2b4d",
                      backgroundColor: "#ffffff",
                      color: "#000000",
                      fontWeight: 600,
                    }}
                  >
                    {p.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  {/* Wallet custom text UI */}
                  {p.id === "metal-wallet-photo" && needsText && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid #1b2b4d",
                        background: "#071a33",
                      }}
                    >
                      {p.fontGuideImage && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontWeight: 800, marginBottom: 8 }}>
                            Font guide (preview)
                          </div>

                          {/* Font guide image (NOT CROPPED) */}
                          <div
                            style={{
                              position: "relative",
                              width: "100%",
                              height: 220,
                              background: "#061225",
                              borderRadius: 12,
                              overflow: "hidden",
                            }}
                          >
                            <Image
                              src={p.fontGuideImage}
                              alt="Font guide"
                              fill
                              style={{
                                objectFit: "contain", // <-- not cropped
                                padding: 10,
                              }}
                            />
                          </div>

                          <div style={{ marginTop: 8 }}>
                            <a
                              href={p.fontGuideImage}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "#a9c0e6",
                                fontSize: 13,
                                textDecoration: "underline",
                              }}
                            >
                              View font guide full size
                            </a>
                          </div>
                        </div>
                      )}

                      <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
                        Choose font
                      </label>
                      <select
                        value={walletFont}
                        onChange={(e) => setWalletFont(e.target.value)}
                        style={{
                          width: "100%",
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid #1b2b4d",
                          backgroundColor: "#ffffff",
                          color: "#000000",
                          fontWeight: 600,
                          marginBottom: 10,
                        }}
                      >
                        {WALLET_FONTS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>

                      <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
                        Personalisation text
                      </label>
                      <input
                        value={walletText}
                        onChange={(e) => setWalletText(e.target.value)}
                        placeholder="Type the text you want on the card..."
                        style={{
                          width: "100%",
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid #1b2b4d",
                          backgroundColor: "#ffffff",
                          color: "#000000",
                        }}
                      />

                      <div style={{ marginTop: 8, color: "#a9c0e6", fontSize: 13 }}>
                        Price: {money(opt?.price ?? 0)} (includes custom text)
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (!opt) return;

                      // Require text if option requires it
                      if (p.id === "metal-wallet-photo" && opt.requiresText) {
                        if (!walletText.trim()) {
                          alert("Please type the custom text before adding to cart.");
                          return;
                        }
                      }

                      const displayName =
                        opt?.label?.includes("—")
                          ? `${p.name} (${opt.label.split("—")[0].trim()})`
                          : `${p.name} (${opt.label})`;

                      addToCart({
                        id: p.id,
                        name: displayName,
                        unitPrice: opt.price,
                        optionId: opt.id,
                        personalisation:
                          p.id === "metal-wallet-photo" && opt.requiresText
                            ? walletText.trim()
                            : undefined,
                        font:
                          p.id === "metal-wallet-photo" && opt.requiresText ? walletFont : undefined,
                      });

                      // reset wallet fields after add
                      if (p.id === "metal-wallet-photo" && opt.requiresText) {
                        setWalletText("");
                        setWalletFont(WALLET_FONTS[0]);
                      }

                      alert("Added to cart!");
                    }}
                    style={{
                      marginTop: 12,
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "none",
                      background: "#2f7bff",
                      color: "white",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
