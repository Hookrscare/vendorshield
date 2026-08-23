import { NextRequest, NextResponse } from "next/server";
import { PRICING_TIERS } from "@/lib/pricing";

function getCheckoutOrigin(request: NextRequest): string {
  // 1. Configured app URL
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredOrigin && configuredOrigin.startsWith("http")) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      // fallback
    }
  }

  // 2. Vercel deployment URL
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  // 3. Request forwarded host or host header
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
  if (forwardedHost) {
    return `${proto}://${forwardedHost}`;
  }

  // 4. Default fallback
  return request.nextUrl.origin || "https://vendorshield-blond.vercel.app";
}

export async function POST(request: NextRequest) {
  try {
    const { planId, customerEmail } = await request.json();

    const tier = PRICING_TIERS[planId as keyof typeof PRICING_TIERS];
    if (!tier) {
      return NextResponse.json(
        { success: false, error: "Invalid pricing plan selected" },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const origin = getCheckoutOrigin(request);
    const hasConfiguredPrice = !tier.priceId.endsWith("_mock");

    if (
      customerEmail !== undefined &&
      (typeof customerEmail !== "string" ||
        customerEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
    ) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address" },
        { status: 400 }
      );
    }

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
            success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/#pricing`,
            ...(customerEmail ? { customer_email: customerEmail } : {}),
            "metadata[planId]": planId,
            ...(hasConfiguredPrice
              ? { "line_items[0][price]": tier.priceId }
              : {
                  "line_items[0][price_data][currency]": "usd",
                  "line_items[0][price_data][product_data][name]": tier.name,
                  "line_items[0][price_data][unit_amount]": tier.amount.toString(),
                  ...(tier.interval !== "one_time"
                    ? {
                        "line_items[0][price_data][recurring][interval]":
                          tier.interval,
                      }
                    : {}),
                }),
            "line_items[0][quantity]": "1",
          }).toString(),
        });

        const stripeSession: { url?: string; error?: { message?: string } } =
          await stripeRes.json();
        if (stripeRes.ok && stripeSession.url) {
          return NextResponse.json({ success: true, url: stripeSession.url });
        }

        console.error(
          "Stripe Checkout session creation failed",
          stripeSession.error?.message || `HTTP ${stripeRes.status}`
        );
        return NextResponse.json(
          {
            success: false,
            error:
              stripeSession.error?.message ||
              "Unable to start secure checkout. Please check Stripe credentials.",
          },
          { status: 502 }
        );
      } catch (stripeErr) {
        console.error("Stripe API error", stripeErr);
        return NextResponse.json(
          { success: false, error: "Unable to reach secure checkout" },
          { status: 502 }
        );
      }
    }

    // Interactive Checkout Simulator for local testing or when keys are pending
    const simulatedCheckoutUrl = `${origin}/dashboard?payment_simulated=true&plan=${planId}&amount=${tier.amount / 100}`;
    return NextResponse.json({
      success: true,
      url: simulatedCheckoutUrl,
      isSimulated: true,
      message: "Checkout session generated. Configure STRIPE_SECRET_KEY in Vercel for live cards.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to initiate checkout" },
      { status: 500 }
    );
  }
}
