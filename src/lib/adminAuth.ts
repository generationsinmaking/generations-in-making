// src/lib/adminAuth.ts
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { redisGet, redisSet, redisDel } from "@/lib/orderStore";

const COOKIE_NAME = "gim_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type AdminAuthOk = { ok: true };
type AdminAuthFail = { ok: false; status: number; message: string };
export type AdminAuthResult = AdminAuthOk | AdminAuthFail;

type UkLockOk = { ok: true };
type UkLockFail = { ok: false; message: string };
export type UkLockResult = UkLockOk | UkLockFail;

function randomId() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function getClientIp(req: NextRequest) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "";
  return req.headers.get("x-real-ip") || "";
}

/**
 * Optional IP allowlist. Set:
 * ADMIN_IP_ALLOWLIST="1.2.3.4,5.6.7.8"
 * If empty/not set => allow all IPs.
 */
function isAllowlisted(ip: string) {
  const allow = (process.env.ADMIN_IP_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allow.length === 0) return true;
  return allow.includes(ip);
}

/**
 * ✅ This matches what your /api/admin/login route expects:
 * returns { ok: true } OR { ok: false, message }
 */
export function checkUkLock(req: NextRequest): UkLockResult {
  const ip = getClientIp(req);

  if (!isAllowlisted(ip)) {
    return { ok: false, message: "Admin access blocked by IP allowlist" };
  }

  return { ok: true };
}

export async function createAdminSession() {
  const sessionId = randomId();

  await redisSet(`admin_session:${sessionId}`, "1", { ex: SESSION_TTL_SECONDS });

  const jar = await cookies();
  jar.set({
    name: COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return sessionId;
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const sessionId = jar.get(COOKIE_NAME)?.value;

  if (sessionId) {
    await redisDel(`admin_session:${sessionId}`);
  }

  jar.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });
}

/**
 * Used by admin API routes.
 * Returns { ok:false, status, message } so routes can respond consistently.
 */
export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const jar = await cookies();
  const sessionId = jar.get(COOKIE_NAME)?.value || "";
  if (!sessionId) {
    return { ok: false, status: 401, message: "No admin session" };
  }

  const uk = checkUkLock(req);
  if (!uk.ok) {
    return { ok: false, status: 403, message: uk.message };
  }

  const v = await redisGet<string>(`admin_session:${sessionId}`);
  if (v !== "1") {
    return { ok: false, status: 401, message: "Invalid/expired admin session" };
  }

  return { ok: true };
}
