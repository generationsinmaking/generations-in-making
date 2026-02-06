// src/lib/orderStore.ts
import fs from "fs";
import path from "path";

export type OrderStatus = "pending" | "in_progress" | "completed";

export type StoredOrderItem = {
  id: string;
  name: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  uploadUrl?: string;
  customText?: string;
  font?: string;
};

export type StoredOrder = {
  id: string;
  email: string;
  shippingZone: string;
  shippingCost: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  stripeSessionId: string;
  items: StoredOrderItem[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]");
}

export function readOrders(): StoredOrder[] {
  ensureStore();
  return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
}

export function writeOrders(orders: StoredOrder[]) {
  ensureStore();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

export function saveOrder(order: StoredOrder) {
  const orders = readOrders();
  orders.unshift(order);
  writeOrders(orders);
}

export function listOrders() {
  return readOrders();
}

export function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): { ok: true } | { ok: false; message: string } {
  const orders = readOrders();
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return { ok: false, message: "Order not found" };
  }

  order.status = status;
  writeOrders(orders);

  return { ok: true };
}
