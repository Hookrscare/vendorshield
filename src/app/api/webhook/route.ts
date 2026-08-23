import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): boolean {
  const fields = signatureHeader.split(",").reduce<Record<string, string[]>>(
    (result, field) => {
      const separator = field.indexOf("=");
      if (separator === -1) return result;

      const key = field.slice(0, separator);
      const value = field.slice(separator + 1);
      result[key] = [...(result[key] || []), value];
      return result;
    },
    {}
  );

  const timestamp = Number(fields.t?.[0]);
  const signatures = fields.v1 || [];
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest();

  return signatures.some((signature) => {
    if (!/^[a-f\d]{64}$/i.test(signature)) return false;
    const actual = Buffer.from(signature, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const sig = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook is not configured" },
        { status: 503 }
      );
    }

    if (!sig || !verifyStripeSignature(payload, sig, webhookSecret)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    let event: {
      type?: string;
      data?: {
        object?: {
          customer_email?: string | null;
          customer_details?: { email?: string | null } | null;
          metadata?: { planId?: string } | null;
        };
      };
    };
    try {
      event = JSON.parse(payload);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;
      if (!session) {
        return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
      }
      const customerEmail = session.customer_email || session.customer_details?.email;
      const plan = session.metadata?.planId || "subscription";

      console.log(`[Stripe Webhook] Payment Successful for ${customerEmail} (Plan: ${plan})`);
      // This confirms receipt only. Durable, idempotent entitlement provisioning
      // must be implemented before paid access is enforced by the application.
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
