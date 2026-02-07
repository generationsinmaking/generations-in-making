// src/app/admin/login/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const params = useSearchParams();
  const router = useRouter();

  const nextPath = useMemo(() => {
    const n = params.get("next");
    return n && n.startsWith("/admin") ? n : "/admin/orders";
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(data?.error || "Login failed");
        return;
      }

      router.replace(nextPath);
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#071a2b] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
        <p className="text-white/70 mb-6">
          Enter your admin password to access orders.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/80 mb-2">
              Admin password
            </label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-black"
              placeholder="Enter admin password"
              type="password"
              autoComplete="current-password"
            />
          </div>

          {err ? (
            <div className="rounded-xl bg-red-500/20 border border-red-400/30 p-3 text-sm">
              {err}
            </div>
          ) : null}

          <button
            disabled={loading || !token}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-4 py-3 font-semibold"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
