// src/lib/orderStore.ts
import fs from "fs/promises";
import path from "path";

export type OrderStatus = "pending" | "in_progress" | "completed";

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
  id: string;
  createdAt: string;
  status: OrderStatus;

  // Keep both for compatibility
  email: string; // ✅ canonical field
  customerEmail?: string; // ✅ backwards compatible

  shippingZone: "UK" | "INTL";
  shippingCost: number;
  subtotal: number;
  total: number;

  stripeSessionId: string;
  items: StoredOrderItem[];
};

function storePath() {
  // ✅ On Vercel you can only write to /tmp
  // You can override locally using ORDER_STORE_PATH=data/orders.json
  const p = process.env.ORDER_STORE_PATH || "/tmp/gim-orders.json";

  // If user sets a relative path (like data/orders.json), resolve from project root
  if (p.startsWith("/") || p.includes(":")) return p;
  return path.join(process.cwd(), p);
}

async function ensureDirForFile(file: string) {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
}

export async function readOrders(): Promise<StoredOrder[]> {
  const file = storePath();
  try {
    const raw = await fs.readFile(file, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data as StoredOrder[];
  } catch {
    return [];
  }
}

export async function writeOrders(orders: StoredOrder[]) {
  const file = storePath();
  await ensureDirForFile(file);
  await fs.writeFile(file, JSON.stringify(orders, null, 2), "utf8");
}

export async function saveOrder(order: StoredOrder) {
  const orders = await readOrders();

  // Replace if same id exists
  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) orders[idx] = order;
  else orders.unshift(order);

  await writeOrders(orders);
}

export async function listOrders(): Promise<StoredOrder[]> {
  return readOrders();
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const orders = await readOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return false;

  orders[idx] = { ...orders[idx], status };
  await writeOrders(orders);
  return true;
}
