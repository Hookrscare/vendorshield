import { NextRequest, NextResponse } from "next/server";
import { createInsForgeServerClient } from "@/lib/insforge/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json().catch(() => null);

    if (!body || !body.email || typeof body.email !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const email = body.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address" },
        { status: 400 }
      );
    }

    const normalizedSlug = slug.toLowerCase().trim();
    if (["demo", "acme", "acme-saas"].includes(normalizedSlug)) {
      return NextResponse.json({
        success: true,
        message: "Demo subscription confirmed. No email was stored.",
        isDemo: true,
      });
    }

    const client = await createInsForgeServerClient();
    const { data, error } = await client.database.rpc("subscribe_subprocessor_changes", {
      p_slug: normalizedSlug,
      p_email: email,
    });

    if (error) {
      console.error("Subscriber persistence failed", error.message);
      return NextResponse.json(
        { success: false, error: "Change-alert subscriptions are temporarily unavailable" },
        { status: 503 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Public register not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscription confirmed. You will receive sub-processor change alerts.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to process subscription" },
      { status: 500 }
    );
  }
}
