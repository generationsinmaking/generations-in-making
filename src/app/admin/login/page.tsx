"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        throw new Error("Invalid admin token");
      }

      // Store token locally for admin pages
      localStorage.setItem("admin_token", token);

      // Go to orders page
      router.push("/admin/orders");
    } catch (err) {
      setError("Invalid admin token");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1220",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          background: "#111a2e",
          padding: 32,
          borderRadius: 12,
          width: "100%",
          maxWidth: 420,
          color: "#fff",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <h1 style={{ marginBottom: 8 }}>Admin Login</h1>
        <p style={{ marginBottom: 24, color: "#9aa4bf" }}>
          Enter your admin token
        </p>

        <input
          type="password"
          placeholder="Admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #2a355a",
            background: "#0b1220",
            color: "#fff",
            marginBottom: 12,
          }}
        />

        {error && (
          <div
            style={{
              background: "#3b0d0d",
              color: "#ffb4b4",
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 8,
            border: "none",
            background: loading ? "#555" : "#2563eb",
            color: "#fff",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
