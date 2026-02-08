// src/app/admin/login/page.tsx
"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // IMPORTANT for cookie
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "Login failed");
        setBusy(false);
        return;
      }

      // go to orders after successful cookie set
      window.location.href = "/admin/orders";
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={onLogin} style={{ width: "min(640px, 100%)" }}>
        <h1 style={{ fontSize: 44, fontWeight: 800, textAlign: "center", marginBottom: 18 }}>
          Admin Login
        </h1>

        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          placeholder="Admin token"
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid #2a2a2a",
            background: "#101010",
            color: "white",
            fontSize: 16,
            outline: "none",
          }}
        />

        <button
          disabled={busy}
          type="submit"
          style={{
            marginTop: 12,
            width: "100%",
            padding: "14px 16px",
            borderRadius: 10,
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Logging in..." : "Login"}
        </button>

        {error ? <div style={{ marginTop: 12, color: "#ff6b6b" }}>{error}</div> : null}

        <div style={{ marginTop: 12, color: "#9aa0a6", fontSize: 14, textAlign: "center" }}>
          Tip: after login, admin is protected by a secure cookie + (optional) UK-only IP lock.
        </div>
      </form>
    </div>
  );
}
