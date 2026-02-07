"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextUrl = useMemo(() => sp.get("next") || "/admin/orders", [sp]);

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.error || "Login failed");
        setLoading(false);
        return;
      }

      // success: API should set an httpOnly cookie
      router.replace(nextUrl);
      router.refresh();
    } catch (err: any) {
      setMsg(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: 32 }}>Admin Login</h1>
        <p style={{ marginTop: 0, opacity: 0.8 }}>
          Enter your admin token to access orders.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 14, opacity: 0.9 }}>Admin token</span>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter admin token"
              type="password"
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.25)",
                color: "white",
                outline: "none",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading || token.trim().length === 0}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontWeight: 700,
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {msg ? (
            <div
              style={{
                background: "rgba(255,0,0,0.12)",
                border: "1px solid rgba(255,0,0,0.25)",
                padding: 12,
                borderRadius: 12,
              }}
            >
              {msg}
            </div>
          ) : null}

          <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.4 }}>
            Tip: bookmark <code>/admin/login</code>. Don’t link it publicly.
          </div>
        </form>
      </div>
    </div>
  );
}
