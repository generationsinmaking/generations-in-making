import Stripe from "stripe";
import { NextResponse } from "next/server";
import type { CartItem } from "@/lib/cart";

export const runtime = "nodejs";

// IMPORTANT: don't force apiVersion here (it caused TS errors for you before)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function getShippingQuote(zone: string, items: CartItem[]) {
  // You can tweak these prices any time
  const z = (zone || "UK").toUpperCase();

  // Example simple rules:
  // - UK: £2.20
  // - Everywhere else: £4.95
  const shippingCost = z === "UK" ? 2.2 : 4.95;

  return { shippingZone: z, shippingCost };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const items: CartItem[] = Array.isArray(body.items) ? body.items : [];
    const shippingZone: string = body.shippingZone || "UK";

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const { shippingCost } = getShippingQuote(shippingZone, items);

    // Stripe requires amounts in pence
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (i) => ({
        quantity: i.qty,
        price_data: {
          currency: "gbp",
          product_data: {
            name: i.name,
            // If you store an image URL on the item, include it (optional)
            images: i.uploadUrl ? [i.uploadUrl] : undefined,
          },
          unit_amount: Math.round(i.unitPrice * 100),
        },
      })
    );

    // Add shipping as a line item (simple + reliable)
    if (shippingCost > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "gbp",
          product_data: { name: `Shipping (${shippingZone})` },
          unit_amount: Math.round(shippingCost * 100),
        },
      });
    }

    // Store what we need for the webhook (so admin panel + emails can use it)
    const cartForWebhook = {
      shippingZone,
      shippingCost,
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice,
        uploadUrl: i.uploadUrl || null,
        customText: (i as any).customText || null,
        font: (i as any).font || null,
      })),
    };

    const siteUrl =
      process.env.SITE_URL ||
      (req.headers.get("origin") ? req.headers.get("origin")! : "");

    if (!siteUrl) {
      return NextResponse.json(
        { error: "Missing SITE_URL env var (or origin header)" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      // This makes Stripe ask for name + address on Checkout
      billing_address_collection: "required",
      // This forces address collection (shipping address)
      shipping_address_collection: {
        allowed_countries: ["GB", "IE", "US", "CA", "AU", "NZ", "FR", "DE", "ES", "IT", "NL"],
      },
      customer_creation: "always",
      metadata: {
        cart: JSON.stringify(cartForWebhook),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
