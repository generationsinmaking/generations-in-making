// src/lib/orderStore.ts
import { Redis } from "@upstash/redis";

/**
 * Core types
 */
export type OrderStatus = "paid" | "shipped" | "cancelled";

export type ShippingAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
};

export type OrderItem = {
  name: string;
  quantity: number;
  unitPrice: number; // £
  lineTotal: number; // £
  uploadUrl?: string;
  customText?: string;
  font?: string;
};

export type StoredOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;

  customerEmail: string;
  stripeSessionId: string;

  // totals in £
  subtotal: number;
  shipping: number;
  total: number;

  // shipping
  shippingName?: string;
  shippingAddress?: ShippingAddress;

  // items
  items: OrderItem[];

  // fulfilment
  trackingNumber?: string;
  shippedAt?: string;
};

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

/**
 * Low-level helpers used by adminAuth.ts
 */
export async function redisGet<T = unknown>(key: string): Promise<T | null> {
  const redis = getRedis();
  const v = await redis.get(key);
  return (v ?? null) as T | null;
}

export async function redisSet(
  key: string,
  value: string,
  opts?: { ex?: number }
): Promise<void> {
  const redis = getRedis();
  if (opts?.ex) {
    await redis.set(key, value, { ex: opts.ex });
  } else {
    await redis.set(key, value);
  }
}

export async function redisDel(key: string): Promise<void> {
  const redis = getRedis();
  await redis.del(key);
}

/**
 * Order storage
 */
const ORDER_KEY = (id: string) => `order:${id}`;
const ORDER_INDEX = `orders:index`; // sorted set by createdAt (ms)

export async function saveOrder(order: StoredOrder) {
  const redis = getRedis();
  await redis.set(ORDER_KEY(order.id), order);
  const score = Date.parse(order.createdAt) || Date.now();
  await redis.zadd(ORDER_INDEX, { score, member: order.id });
}

export async function getOrder(id: string): Promise<StoredOrder | null> {
  const redis = getRedis();
  const order = await redis.get(ORDER_KEY(id));
  return (order ?? null) as StoredOrder | null;
}

export async function listOrders(limit = 100): Promise<StoredOrder[]> {
  const redis = getRedis();

  // ✅ Upstash generics expect array types, so cast safely
  const ids = (await redis.zrange(ORDER_INDEX, 0, limit - 1, { rev: true })) as unknown as string[];
  if (!ids?.length) return [];

  // de-dupe just in case
  const seen = new Set<string>();
  const uniqueIds: string[] = [];
  for (const id of ids) {
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    uniqueIds.push(id);
  }

  const keys = uniqueIds.map((id) => ORDER_KEY(id));

  // ✅ mget also expects array generic types; cast the result
  const orders = (await redis.mget(...keys)) as unknown as Array<StoredOrder | null>;

  return (orders || []).filter(Boolean) as StoredOrder[];
}

export type UpdateOrderResult =
  | { ok: true; order: StoredOrder }
  | { ok: false; message: string };

export async function updateOrder(
  id: string,
  patch: Partial<StoredOrder>
): Promise<UpdateOrderResult> {
  const redis = getRedis();
  const existing = (await redis.get(ORDER_KEY(id))) as unknown as StoredOrder | null;
  if (!existing) return { ok: false, message: "Order not found" };

  const updated: StoredOrder = {
    ...existing,
    ...patch,
  };

  await redis.set(ORDER_KEY(id), updated);
  return { ok: true, order: updated };
}

/**
 * Used by /api/admin/orders/status
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  trackingNumber?: string
): Promise<UpdateOrderResult> {
  const patch: Partial<StoredOrder> = { status };

  if (typeof trackingNumber === "string") {
    patch.trackingNumber = trackingNumber;
  }

  if (status === "shipped") {
    patch.shippedAt = new Date().toISOString();
  }

  return updateOrder(id, patch);
}
