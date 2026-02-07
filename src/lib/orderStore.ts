export type OrderStatus = "pending" | "processing" | "shipped" | "cancelled" | "refunded";

export type StoredOrderItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  uploadUrl: string | null;
  customText: string | null;
  font: string | null;
  optionId?: string | null;
  optionLabel?: string | null;
};

export type StoredOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  customerEmail: string;
  shippingZone: string;
  shippingCost: number;
  subtotal: number;
  total: number;
  stripeSessionId: string;
  items: StoredOrderItem[];

  // ✅ New: stored shipping address (HTML with <br/>)
  shippingAddressHtml?: string;
};

// Simple JSON-file store (works locally). If you later move to a DB, this stays similar.
const ORDERS_PATH = "data/orders.json";

async function readOrders(): Promise<StoredOrder[]> {
  try {
    const fs = await import("fs/promises");
    const raw = await fs.readFile(ORDERS_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeOrders(orders: StoredOrder[]) {
  const fs = await import("fs/promises");
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(ORDERS_PATH, JSON.stringify(orders, null, 2), "utf8");
}

export async function saveOrder(order: StoredOrder) {
  const orders = await readOrders();
  orders.unshift(order);
  await writeOrders(orders);
}

export async function getOrders() {
  return readOrders();
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const orders = await readOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return { ok: false, message: "Order not found" };
  orders[idx] = { ...orders[idx], status };
  await writeOrders(orders);
  return { ok: true };
}
