import { NextRequest, NextResponse } from "next/server";
import { PRICING_TIERS } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  try {
    const { planId, successUrl, cancelUrl, customerEmail } = await request.json();

    const tier = PRICING_TIERS[planId as keyof typeof PRICING_TIERS];
    if (!tier) {
      return NextResponse.json(
        { success: false, error: "Invalid pricing plan selected" },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // If Stripe Secret Key is configured, execute official Stripe Checkout
    if (stripeSecretKey) {
      try {
        const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            mode: tier.interval === "one_time" ? "payment" : "subscription",
            success_url: successUrl || `${origin}/dashboard?payment=success&plan=${planId}`,
            cancel_url: cancelUrl || `${origin}/#pricing`,
            ...(customerEmail ? { customer_email: customerEmail } : {}),
            "line_items[0][price_data][currency]": "usd",
            "line_items[0][price_data][product_data][name]": tier.name,
            "line_items[0][price_data][unit_amount]": tier.amount.toString(),
            ...(tier.interval !== "one_time"
              ? { "line_items[0][price_data][recurring][interval]": tier.interval }
              : {}),
            "line_items[0][quantity]": "1",
          }).toString(),
        });

        const stripeSession = await stripeRes.json();
        if (stripeSession.url) {
          return NextResponse.json({ success: true, url: stripeSession.url });
        }
      } catch (stripeErr) {
        console.error("Stripe API error", stripeErr);
      }
    }

    // Fallback Mock Checkout Simulator for instant local testing
    const fallbackCheckoutUrl = `${origin}/dashboard?payment_simulated=true&plan=${planId}&amount=${tier.amount / 100}`;
    return NextResponse.json({
      success: true,
      url: fallbackCheckoutUrl,
      isSimulated: true,
      message: "Checkout session generated. Set STRIPE_SECRET_KEY in .env for live cards.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to initiate checkout" },
      { status: 500 }
    );
  }
}
