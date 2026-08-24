import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StripeCheckoutSession {
  payment_status?: string;
  metadata?: { planId?: string } | null;
  error?: { message?: string };
}

async function fetchCheckoutSession(
  sessionId: string,
  stripeSecretKey: string
): Promise<StripeCheckoutSession | null> {
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
      cache: "no-store",
    }
  );

  if (!response.ok) return null;
  return response.json();
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!sessionId || !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json(
      { error: "A valid paid checkout session is required" },
      { status: 401 }
    );
  }

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Download verification is temporarily unavailable" },
      { status: 503 }
    );
  }

  const session = await fetchCheckoutSession(sessionId, stripeSecretKey);
  if (
    !session ||
    session.payment_status !== "paid" ||
    session.metadata?.planId !== "inspector-toolkit"
  ) {
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 403 }
    );
  }

  const archivePath = join(
    process.cwd(),
    "private-assets",
    "inspector-business-toolkit-2026.zip"
  );
  const archive = await readFile(archivePath);

  return new NextResponse(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition":
        'attachment; filename="inspector-business-toolkit-2026.zip"',
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
