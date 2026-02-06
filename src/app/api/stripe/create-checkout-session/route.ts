import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type CartItem = {
  lineId: string;
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  uploadUrl?: string;
  uploadName?: string;
  customText?: string;
  font?: string;
};

function shippingPence(items: CartItem[], zone: "UK" | "INTL") {
  const hasWallet = items.some((i) => i.id === "metal-wallet-photo");
  if (zone === "INTL") return 1440;
  return hasWallet ? 220 : 0;
}

export async function POST(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    // ✅ Don't pin apiVersion – avoids TypeScript mismatch on Vercel
    const stripe = new Stripe(stripeSecret);

    const body = await req.json().catch(() => ({}));
    const items: CartItem[] = Array.isArray(body.items) ? body.items : [];
    const shippingZone: "UK" | "INTL" = body.shippingZone === "INTL" ? "INTL" : "UK";

    if (!items.length) {
      return NextResponse.json({ error: "Cart empty" }, { status: 400 });
    }
    if (items.some((i) => !i.uploadUrl)) {
      return NextResponse.json({ error: "Missing upload for one or more items" }, { status: 400 });
    }

    const ship = shippingPence(items, shippingZone);

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((i) => ({
      quantity: Math.max(1, Number(i.qty || 1)),
      price_data: {
        currency: "gbp",
        unit_amount: Math.round(Number(i.unitPrice || 0) * 100),
        product_data: { name: i.name },
      },
    }));

    if (ship > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: ship,
          product_data: { name: `Shipping (${shippingZone})` },
        },
      });
    }

    const origin = req.headers.get("origin") || process.env.SITE_URL || "http://localhost:3000";

    const meta = {
      shippingZone,
      shippingCost: (ship / 100).toFixed(2),
      items: items.map((i) => ({
        lineId: i.lineId,
        id: i.id,
        name: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice,
        uploadUrl: i.uploadUrl,
        uploadName: i.uploadName || "",
        customText: i.customText || "",
        font: i.font || "",
      })),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      metadata: {
        cart: JSON.stringify(meta),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Stripe checkout failed" }, { status: 500 });
  }
}
