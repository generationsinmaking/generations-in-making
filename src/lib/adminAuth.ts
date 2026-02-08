// src/lib/adminAuth.ts
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { redisGet, redisSet, redisDel } from "@/lib/orderStore";

const COOKIE_NAME = "gim_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getCountry(req: NextRequest) {
  // Vercel sets this on edge/proxy
  return (
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    ""
  ).toUpperCase();
}

export function checkUkLock(req: NextRequest) {
  if (process.env.ADMIN_UK_ONLY !== "1") return { ok: true as const };
  const country = getCountry(req);
  if (country === "GB") return { ok: true as const };
  return { ok: false as const, message: "UK-only admin lock enabled." };
}

function randomId() {
  // simple strong-enough session id for this use case
  return crypto.randomUUID();
}

export async function createAdminSession() {
  const sessionId = randomId();
  await redisSet(`admin_session:${sessionId}`, "1", SESSION_TTL_SECONDS);

  const jar = await cookies();
  jar.set({
    name: COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: true, // important on production https
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return sessionId;
}

export async function destroyAdminSession(req?: NextRequest) {
  const jar = await cookies();
  const sessionId = jar.get(COOKIE_NAME)?.value;
  if (sessionId) await redisDel(`admin_session:${sessionId}`);

  jar.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireAdmin(req: NextRequest) {
  const uk = checkUkLock(req);
  if (!uk.ok) return { ok: false as const, status: 403, message: uk.message };

  const jar = await cookies();
  const sessionId = jar.get(COOKIE_NAME)?.value;
  if (!sessionId) return { ok: false as const, status: 401, message: "Unauthorized" };

  const exists = await redisGet(`admin_session:${sessionId}`);
  if (!exists) return { ok: false as const, status: 401, message: "Unauthorized" };

  return { ok: true as const, sessionId };
}
