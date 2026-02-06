export type ShippingZone = "UK" | "INTL";

export type CartItem = {
  // product identity
  id: string;

  // unique per cart line (so each can have its own upload/customizations)
  lineId: string;

  // display
  name: string;

  // pricing
  unitPrice: number;
  qty: number;

  // customizations
  optionId?: string;
  customText?: string;
  font?: string;

  // uploads
  uploadUrl?: string;
  uploadName?: string;
};

const STORAGE_KEY = "gim_cart_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<CartItem[]>(localStorage.getItem(STORAGE_KEY), []);
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getCart(): CartItem[] {
  return readCart();
}

export function clearCart() {
  writeCart([]);
}

export function removeFromCart(lineId: string) {
  const items = readCart().filter((i) => i.lineId !== lineId);
  writeCart(items);
}

export function setItemUpload(lineId: string, uploadUrl: string, uploadName?: string) {
  const items = readCart().map((i) =>
    i.lineId === lineId ? { ...i, uploadUrl, uploadName } : i
  );
  writeCart(items);
}

export function setItemText(lineId: string, customText: string) {
  const items = readCart().map((i) => (i.lineId === lineId ? { ...i, customText } : i));
  writeCart(items);
}

export function setItemFont(lineId: string, font: string) {
  const items = readCart().map((i) => (i.lineId === lineId ? { ...i, font } : i));
  writeCart(items);
}

// IMPORTANT: For photo products, qty should always be 1 because each needs its own upload.
// If in future you add non-photo products, we can re-enable qty changes for those only.
export function addToCart(item: Omit<CartItem, "lineId" | "qty"> & { qty?: number }) {
  const items = readCart();

  const lineId =
    (globalThis.crypto && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `line_${Date.now()}_${Math.random().toString(16).slice(2)}`);

  const newLine: CartItem = {
    ...item,
    lineId,
    qty: 1, // always 1 per line for uploads
  };

  items.push(newLine);
  writeCart(items);

  return newLine;
}
