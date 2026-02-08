// src/lib/orderStore.ts
export type OrderStatus = "paid" | "shipped" | "refunded" | "cancelled";

export type ShippingAddress = {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

export type OrderItem = {
  name: string;
  qty: number;
  unitPrice: number; // in major currency units (e.g. 4.00)
  lineTotal: number;
  imageUrl?: string;
  uploadUrl?: string;

  // Optional personalisation fields (used by packing slip / custom products)
  customText?: string;
  font?: string;
};

export type StoredOrder = {
  id: string;
  createdAt: string; // ISO string
  status: OrderStatus;
  currency: string; // "gbp"
  subtotal: number;
  shipping: number;
  total: number;

  customerEmail?: string;
  stripeSessionId?: string;

  shippingAddress?: ShippingAddress;

  items: OrderItem[];

  trackingNumber?: string;
};

const UPSTASH_URL =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const UPSTASH_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

function requireRedis() {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error(
      "Missing Upstash env vars (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)."
    );
  }
}

async function redisFetch(path: string, init?: RequestInit) {
  requireRedis();
  const res = await fetch(`${UPSTASH_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Redis request failed: ${res.status}`);
  }
  return json;
}

/** Basic helpers used by admin auth too */
export async function redisGet(key: string): Promise<string | null> {
  const j = await redisFetch(`/get/${encodeURIComponent(key)}`, {
    method: "GET",
  });
  return j?.result ?? null;
}

export async function redisSet(key: string, value: string, exSeconds?: number) {
  const body = exSeconds ? { value, ex: exSeconds } : { value };
  await redisFetch(`/set/${encodeURIComponent(key)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function redisDel(key: string) {
  await redisFetch(`/del/${encodeURIComponent(key)}`, { method: "POST" });
}

function orderKey(id: string) {
  return `order:${id}`;
}

// store ids in a sorted set by createdAt timestamp
async function zadd(setKey: string, score: number, member: string) {
  await redisFetch(`/zadd/${encodeURIComponent(setKey)}`, {
    method: "POST",
    body: JSON.stringify([score, member]),
  });
}

async function zrange(setKey: string, start: number, stop: number, rev = true) {
  const cmd = rev ? "zrevrange" : "zrange";
  const j = await redisFetch(
    `/${cmd}/${encodeURIComponent(setKey)}/${start}/${stop}`,
    { method: "GET" }
  );
  return (j?.result || []) as string[];
}

export async function saveOrder(order: StoredOrder) {
  const score = Date.parse(order.createdAt) || Date.now();
  await redisSet(orderKey(order.id), JSON.stringify(order));
  await zadd("orders", score, order.id);
  return { ok: true as const };
}

export async function getOrder(id: string): Promise<StoredOrder | null> {
  const raw = await redisGet(orderKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOrder;
  } catch {
    return null;
  }
}

export async function listOrders(limit = 200): Promise<StoredOrder[]> {
  const ids = await zrange("orders", 0, Math.max(0, limit - 1), true);
  const out: StoredOrder[] = [];
  for (const id of ids) {
    const o = await getOrder(id);
    if (o) out.push(o);
  }
  return out;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  trackingNumber?: string
) {
  const existing = await getOrder(id);
  if (!existing) return { ok: false as const, message: "Order not found" };

  const next: StoredOrder = {
    ...existing,
    status,
    trackingNumber: trackingNumber ?? existing.trackingNumber,
  };

  await redisSet(orderKey(id), JSON.stringify(next));
  return { ok: true as const, order: next };
}
