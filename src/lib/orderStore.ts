import { promises as fs } from "fs";
import path from "path";

export type StoredOrderItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  uploadUrl?: string | null;
  customText?: string | null;
  font?: string | null;
};

export type StoredOrder = {
  id: string; // our internal id
  createdAt: string; // ISO string
  status: "pending" | "in_progress" | "completed";
  customerEmail: string;
  shippingZone: "UK" | "INTL";
  shippingCost: number;
  subtotal: number;
  total: number;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  items: StoredOrderItem[];
};

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(ORDERS_FILE);
  } catch {
    await fs.writeFile(ORDERS_FILE, JSON.stringify({ orders: [] }, null, 2), "utf8");
  }
}

export async function readOrders(): Promise<StoredOrder[]> {
  await ensureDataFile();
  const raw = await fs.readFile(ORDERS_FILE, "utf8");
  const parsed = JSON.parse(raw || "{}");
  return Array.isArray(parsed?.orders) ? (parsed.orders as StoredOrder[]) : [];
}

export async function writeOrders(orders: StoredOrder[]) {
  await ensureDataFile();
  await fs.writeFile(ORDERS_FILE, JSON.stringify({ orders }, null, 2), "utf8");
}

export async function listOrders(): Promise<StoredOrder[]> {
  const orders = await readOrders();
  // newest first
  return orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function saveOrder(order: StoredOrder): Promise<void> {
  const orders = await readOrders();

  // Deduplicate: if we already saved an order for this Stripe session, update it
  const idx = order.stripeSessionId
    ? orders.findIndex((o) => o.stripeSessionId === order.stripeSessionId)
    : -1;

  if (idx >= 0) {
    orders[idx] = { ...orders[idx], ...order };
  } else {
    orders.push(order);
  }

  await writeOrders(orders);
}

export async function updateOrderStatus(orderId: string, status: StoredOrder["status"]) {
  const orders = await readOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return;
  orders[idx] = { ...orders[idx], status };
  await writeOrders(orders);
}
