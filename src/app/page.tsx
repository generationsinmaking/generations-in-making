import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#061225", color: "#eaf2ff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Generations in Making</h1>
          <nav style={{ display: "flex", gap: 12 }}>
            <Link href="/shop">Shop</Link>
            <Link href="/cart">Cart</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </header>

        <section style={{ marginTop: 60 }}>
          <h2 style={{ fontSize: 36 }}>
            Personalised stainless steel photo keepsakes
          </h2>

          <p style={{ maxWidth: 600, lineHeight: 1.6, color: "#a9c0e6" }}>
            Premium 304 stainless steel photos and metal wallet photo cards —
            made to keep your special moments with you at all times.
          </p>

          <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
            <Link
              href="/shop"
              style={{
                padding: "12px 18px",
                background: "#2f7bff",
                borderRadius: 12,
                color: "white",
                fontWeight: 700,
              }}
            >
              Visit the Shop
            </Link>

            <a
              href="https://www.facebook.com/GenerationsInMaking/"
              target="_blank"
              style={{
                padding: "12px 18px",
                border: "1px solid #2f7bff",
                borderRadius: 12,
                color: "#eaf2ff",
              }}
            >
              Facebook Page
            </a>
          </div>

          <p style={{ marginTop: 20, color: "#a9c0e6" }}>
            Also available on{" "}
            <a
              href="https://www.etsy.com/shop/GenerationsInMaking"
              target="_blank"
              style={{ color: "#8bb3ff" }}
            >
              Etsy
            </a>{" "}
            and{" "}
            <a
              href="https://crafters.market/shop/generations-in-making"
              target="_blank"
              style={{ color: "#8bb3ff" }}
            >
              Crafters Market
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
