import Stripe from "stripe";
import { NextResponse } from "next/server";
import type { CartItem } from "@/lib/cart";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const items: CartItem[] = Array.isArray(body.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.SITE_URL || "https://www.generationsinmaking.com";

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      items.map((item) => ({
        price_data: {
          currency: "gbp",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.unitPrice * 100),
        },
        quantity: item.qty,
      }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      // ✅ THIS FORCES ADDRESS COLLECTION
      shipping_address_collection: {
        allowed_countries: ["GB"],
      },

      // ✅ THIS MAKES STRIPE REQUIRE SHIPPING DETAILS
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: Math.round((body.shippingCost || 0) * 100),
              currency: "gbp",
            },
            display_name: "UK Shipping",
          },
        },
      ],

      line_items,

      // ✅ LIVE SITE REDIRECTS (NOT LOCALHOST)
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,

      // ✅ SAVE CART DATA FOR WEBHOOK
      metadata: {
        cart: JSON.stringify({
          items,
          shippingCost: body.shippingCost || 0,
        }),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
