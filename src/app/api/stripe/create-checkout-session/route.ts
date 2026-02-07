// src/app/api/stripe/create-checkout-session/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CartItem = {
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

export async function POST(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2026-01-28.clover",
    });

    const body = await req.json().catch(() => ({}));
    const items: CartItem[] = Array.isArray(body.items) ? body.items : [];
    const shippingCost = Number(body.shippingCost || 0);
    const shippingZone = String(body.shippingZone || "UK");

    if (!items.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const siteUrl = process.env.SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      // ✅ makes Stripe ask for address
      shipping_address_collection: {
        allowed_countries: ["GB", "IE"],
      },

      // (optional but useful)
      phone_number_collection: { enabled: true },

      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,

      customer_creation: "always",

      line_items: [
        ...items.map((i) => ({
          quantity: i.qty,
          price_data: {
            currency: "gbp",
            product_data: { name: i.name },
            unit_amount: Math.round(i.unitPrice * 100),
          },
        })),
        ...(shippingCost > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "gbp",
                  product_data: { name: `Shipping (${shippingZone})` },
                  unit_amount: Math.round(shippingCost * 100),
                },
              },
            ]
          : []),
      ],

      metadata: {
        cart: JSON.stringify({ items, shippingCost, shippingZone }),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Stripe error" }, { status: 500 });
  }
}
