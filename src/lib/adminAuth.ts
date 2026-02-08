// src/lib/adminAuth.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

const COOKIE_NAME = "gim_admin_session";
const SESSION_PREFIX = "admin:session:";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing Upstash Redis env vars (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)"
    );
  }
  return new Redis({ url, token });
}

function isUkOnlyEnabled() {
  return (process.env.ADMIN_UK_ONLY || "").trim() === "1";
}

function getCountry(req: NextRequest) {
  return (
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    ""
  ).toUpperCase();
}

export function checkUkLock(req: NextRequest) {
  if (!isUkOnlyEnabled()) return { ok: true as const };

  const country = getCountry(req);
  if (country && country !== "GB") {
    return { ok: false as const, message: "UK-only admin lock enabled." };
  }
  return { ok: true as const };
}

export function getSessionId(req: NextRequest) {
  return req.cookies.get(COOKIE_NAME)?.value || "";
}

export async function createAdminSession(): Promise<string> {
  const redis = getRedis();
  const sessionId = crypto.randomUUID();
  await redis.set(`${SESSION_PREFIX}${sessionId}`, "1", {
    ex: SESSION_TTL_SECONDS,
  });
  return sessionId;
}

export async function deleteAdminSession(sessionId: string) {
  if (!sessionId) return;
  const redis = getRedis();
  await redis.del(`${SESSION_PREFIX}${sessionId}`);
}

export async function isSessionValid(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const redis = getRedis();
  const val = await redis.get<string>(`${SESSION_PREFIX}${sessionId}`);
  return val === "1";
}

export function setAdminCookie(res: NextResponse, sessionId: string) {
  res.cookies.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", {
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

  const sessionId = getSessionId(req);
  const valid = await isSessionValid(sessionId);
  if (!valid) return { ok: false as const, status: 401, message: "Unauthorized" };

  return { ok: true as const };
}
