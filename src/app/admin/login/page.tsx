"use client";

import { Suspense } from "react";
import LoginForm from "./login-form";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
