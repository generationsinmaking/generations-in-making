import { Redis } from "@upstash/redis";

/**
 * Redis client
 */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Order item
 */
export type StoredOrderItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  uploadUrl?: string | null;
  customText?: string | null;
  font?: string | null;
};

/**
 * Shipping address
 * (Packing slip expects phone to exist here, so we include it.)
 */
export type ShippingAddress = {
  name?: string | null;
  phone?: string | null; // ✅ added
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export type OrderStatus = "pending" | "shipped";

/**
 * Order record
 */
export type StoredOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;

  customerEmail: string;
  customerPhone?: string | null;

  shippingZone: string;
  shippingCost: number;

  subtotal: number;
  total: number;

  stripeSessionId: string;

  shippingAddress?: ShippingAddress | null;

  items: StoredOrderItem[];

  trackingNumber?: string | null;
};

/**
 * Redis keys
 */
const ORDER_PREFIX = "order:";
const ORDER_INDEX_KEY = "orders:index";

/**
 * Save a new order
 */
export async function saveOrder(order: StoredOrder) {
  const key = `${ORDER_PREFIX}${order.id}`;

  await redis.set(key, order);

  // Keep a sorted index by time
  await redis.zadd(ORDER_INDEX_KEY, {
    score: Date.now(),
    member: order.id,
  });
}

/**
 * Get all orders (newest first)
 */
export async function getOrders(): Promise<StoredOrder[]> {
  const ids = await redis.zrange(ORDER_INDEX_KEY, 0, -1, { rev: true });
  if (!ids.length) return [];

  const pipeline = redis.pipeline();
  ids.forEach((id) => pipeline.get(`${ORDER_PREFIX}${id}`));

  const results = await pipeline.exec();

  return results.map((r) => r as StoredOrder).filter(Boolean);
}

/**
 * Backwards-compatible name (your API currently imports listOrders)
 */
export async function listOrders(): Promise<StoredOrder[]> {
  return getOrders();
}

/**
 * Get a single order
 */
export async function getOrder(id: string): Promise<StoredOrder | null> {
  return (await redis.get(`${ORDER_PREFIX}${id}`)) as StoredOrder | null;
}

/**
 * Mark order as shipped
 */
export async function markOrderShipped(id: string, trackingNumber?: string) {
  const order = await getOrder(id);
  if (!order) return null;

  const updated: StoredOrder = {
    ...order,
    status: "shipped",
    trackingNumber: trackingNumber || null,
  };

  await redis.set(`${ORDER_PREFIX}${id}`, updated);
  return updated;
}

/**
 * Backwards-compatible updater (your API currently imports updateOrder)
 * Returns { ok, message, order } like your admin API expects.
 */
export async function updateOrder(
  orderId: string,
  status: OrderStatus,
  trackingNumber?: string
): Promise<{ ok: boolean; message?: string; order?: StoredOrder }> {
  const order = await getOrder(orderId);
  if (!order) return { ok: false, message: "Order not found" };

  const updated: StoredOrder = {
    ...order,
    status,
    trackingNumber:
      status === "shipped" ? trackingNumber || order.trackingNumber || null : null,
  };

  await redis.set(`${ORDER_PREFIX}${orderId}`, updated);
  return { ok: true, order: updated };
}
