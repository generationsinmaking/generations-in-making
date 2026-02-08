// src/lib/orderStore.ts
import { Redis } from "@upstash/redis";

export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export type ShippingAddress = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
};

export type StoredOrderItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;

  uploadUrl?: string | null;

  // optional personalization (safe even if you don't use it yet)
  customText?: string | null;
  font?: string | null;
};

export type StoredOrder = {
  id: string;
  createdAt: string; // ISO string
  status: OrderStatus;

  customerEmail: string;

  // pricing
  subtotal: number;
  shipping: number;
  total: number;

  // shipping (captured from Stripe)
  shippingZone?: string;
  shippingAddress?: ShippingAddress | null;

  // stripe
  stripeSessionId: string;

  // items
  items: StoredOrderItem[];

  // fulfillment
  trackingNumber?: string | null;
  shippedAt?: string | null;
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

const ORDER_KEY = (id: string) => `order:${id}`;
const ORDER_INDEX = "orders:index"; // sorted set by createdAt (ms)

export async function saveOrder(order: StoredOrder) {
  const redis = getRedis();
  await redis.set(ORDER_KEY(order.id), order);

  const score = Date.parse(order.createdAt) || Date.now();
  await redis.zadd(ORDER_INDEX, { score, member: order.id });
}

export async function getOrder(id: string): Promise<StoredOrder | null> {
  const redis = getRedis();
  const order = await redis.get<StoredOrder>(ORDER_KEY(id));
  return order ?? null;
}

export async function listOrders(limit = 100): Promise<StoredOrder[]> {
  const redis = getRedis();

  const ids = await redis.zrange<string[]>(ORDER_INDEX, 0, limit - 1, { rev: true });
  if (!ids?.length) return [];

  const keys = ids.map((id) => ORDER_KEY(id));
  const orders = await redis.mget<StoredOrder[]>(...keys);

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
  const existing = await redis.get<StoredOrder>(ORDER_KEY(id));
  if (!existing) return { ok: false, message: "Order not found" };

  const updated: StoredOrder = { ...existing, ...patch };

  await redis.set(ORDER_KEY(id), updated);
  return { ok: true, order: updated };
}
