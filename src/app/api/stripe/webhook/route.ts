// src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createOrder } from "@/lib/orderStore";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Let Stripe use your account’s default API version
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // ✅ We only care about successful checkouts
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  /* ----------------------------------------
     1️⃣ Extract customer + shipping details
  ---------------------------------------- */

  const customerEmail =
    session.customer_details?.email ||
    session.customer_email ||
    "";

  const customerName =
    session.customer_details?.name ||
    "";

  const shippingAddress =
    session.shipping_details?.address ||
    session.customer_details?.address ||
    null;

  /* ----------------------------------------
     2️⃣ Extract cart data from metadata
  ---------------------------------------- */

  let cartData: {
    items: any[];
    shippingCost?: number;
    shippingZone?: string;
  } = { items: [] };

  try {
    if (session.metadata?.cart) {
      cartData = JSON.parse(session.metadata.cart);
    }
  } catch {
    // ignore malformed metadata
  }

  /* ----------------------------------------
     3️⃣ Create the order in your store
  ---------------------------------------- */

  const order = createOrder({
    stripeSessionId: session.id,
    email: customerEmail,
    name: customerName,
    items: cartData.items || [],
    total: (session.amount_total ?? 0) / 100,
    currency: session.currency || "gbp",
    shippingCost: cartData.shippingCost ?? 0,
    shippingZone: cartData.shippingZone ?? "UK",
    address: shippingAddress
      ? {
          line1: shippingAddress.line1 || "",
          line2: shippingAddress.line2 || "",
          city: shippingAddress.city || "",
          postcode: shippingAddress.postal_code || "",
          country: shippingAddress.country || "",
        }
      : null,
    status: "paid",
    createdAt: new Date().toISOString(),
  });

  /* ----------------------------------------
     4️⃣ Send confirmation emails
  ---------------------------------------- */

  try {
    await sendOrderEmails(order);
  } catch (emailErr) {
    console.error("Email send failed:", emailErr);
  }

  return NextResponse.json({ received: true });
}
