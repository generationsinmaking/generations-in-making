// src/app/api/stripe/create-checkout-session/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import type { CartItem } from "@/lib/cart";

export const runtime = "nodejs";

/**
 * Picks the best base URL for redirects:
 * 1) SITE_URL (production) if set
 * 2) Request Origin header (dev / previews)
 * 3) VERCEL_URL fallback
 */
function getBaseUrl(req: Request) {
  const siteUrl = process.env.SITE_URL?.trim();
  if (siteUrl) return siteUrl.replace(/\/$/, "");

  const origin = req.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;

  // absolute last fallback (shouldn’t happen)
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
    const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

    if (!stripeSecret) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }
    if (!publishable) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, {
      // IMPORTANT: use the version that matches your installed Stripe types
      // If TypeScript complains, remove apiVersion entirely and Stripe will use your account default.
      // apiVersion: "2024-06-20",
    });

    const baseUrl = getBaseUrl(req);

    const body = await req.json().catch(() => ({}));
    const items: CartItem[] = Array.isArray(body.items) ? body.items : [];
    const shippingCost = Number(body.shippingCost ?? 0);
    const shippingZone = String(body.shippingZone ?? "UK");

    if (!items.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Build Stripe line items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((i) => ({
      quantity: i.qty,
      price_data: {
        currency: "gbp",
        product_data: {
          name: i.name,
          // You can add images here if you want: images: i.uploadUrl ? [i.uploadUrl] : undefined,
          metadata: {
            optionId: i.optionId || "",
            optionLabel: i.optionLabel || "",
            uploadUrl: i.uploadUrl || "",
            customText: i.customText || "",
            font: i.font || "",
          },
        },
        unit_amount: Math.round(i.unitPrice * 100),
      },
    }));

    // Optional: add shipping as its own line item
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

    // Put your cart into metadata so your webhook can recreate the order
    const cartMeta = JSON.stringify({
      items,
      shippingCost,
      shippingZone,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,

      // ✅ THIS is what was sending you to localhost before
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,

      // ✅ Ask for address
      // For physical products, this is the simplest way:
      shipping_address_collection: {
        allowed_countries: ["GB", "IE"],
      },

      // Useful for receipts + your webhook
      customer_email: body.email || undefined,

      // If you want Stripe to show a phone field too:
      // phone_number_collection: { enabled: true },

      metadata: {
        cart: cartMeta,
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
