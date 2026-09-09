import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/insforge/context";

function getOrigin(request: NextRequest): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredOrigin && configuredOrigin.startsWith("http")) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      // fallback
    }
  }
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionUrl) return `https://${productionUrl}`;
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
  if (forwardedHost) return `${proto}://${forwardedHost}`;
  return request.nextUrl.origin || "https://vendorshield-blond.vercel.app";
}

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const origin = getOrigin(request);
    const returnUrl = `${origin}/dashboard?portal=return`;

    let customerId: string | null = null;
    try {
      const body = await request.json();
      customerId = body.customerId || null;
    } catch {
      // Body is optional
    }

    if (!customerId) {
      const tenantResult = await resolveTenantContext(request).catch(() => null);
      if (tenantResult && tenantResult.success) {
        customerId = (tenantResult.context.organization as { stripeCustomerId?: string }).stripeCustomerId || null;
      }
    }

    if (!stripeSecretKey) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { success: false, error: "Billing portal is currently unconfigured." },
          { status: 503 }
        );
      }
      return NextResponse.json({
        success: true,
        url: `${origin}/dashboard?portal_simulated=true`,
        isSimulated: true
      });
    }

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "No customer account identified for billing portal access." },
        { status: 400 }
      );
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        customer: customerId,
        return_url: returnUrl
      }).toString()
    });

    const portalSession = await stripeRes.json();
    if (stripeRes.ok && portalSession.url) {
      return NextResponse.json({ success: true, url: portalSession.url });
    }

    return NextResponse.json(
      { success: false, error: portalSession.error?.message || "Failed to create portal session" },
      { status: stripeRes.status }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
