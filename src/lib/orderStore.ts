// src/lib/orderStore.ts
import { Redis } from "@upstash/redis";

export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "cancelled" | "refunded";

export type StoredOrderItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  uploadUrl?: string | null;
  customText?: string | null;
  font?: string | null;
  optionId?: string | null;
  optionLabel?: string | null;
};

export type StoredOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;

  customerEmail: string;

  // Shipping
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;

  shippingZone?: string | null;
  shippingCost: number;

  subtotal: number;
  total: number;

  stripeSessionId: string;

  items: StoredOrderItem[];
};

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Missing Upstash Redis env vars (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)");
  return new Redis({ url, token });
}

const KEY_LIST = "orders:list"; // sorted set of orderIds (timestamp score)
const KEY_ORDER = (id: string) => `orders:byId:${id}`;

export async function saveOrder(order: StoredOrder): Promise<void> {
  const redis = getRedis();
  const now = Date.now();

  // store the order object
  await redis.set(KEY_ORDER(order.id), order);

  // keep an index for listing
  // (score = now so newest can be shown first)
  await redis.zadd(KEY_LIST, { score: now, member: order.id });
}

export async function getOrders(limit = 200): Promise<StoredOrder[]> {
  const redis = getRedis();

  const ids = (await redis.zrange(KEY_LIST, 0, limit - 1, { rev: true })) as string[];
  if (!ids?.length) return [];

  const orders = await Promise.all(ids.map((id) => redis.get<StoredOrder>(KEY_ORDER(id))));
  return orders.filter(Boolean) as StoredOrder[];
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ ok: boolean; message?: string }> {
  const redis = getRedis();
  const existing = await redis.get<StoredOrder>(KEY_ORDER(orderId));

  if (!existing) return { ok: false, message: "Order not found" };

  const updated: StoredOrder = { ...existing, status };
  await redis.set(KEY_ORDER(orderId), updated);

  return { ok: true };
}
