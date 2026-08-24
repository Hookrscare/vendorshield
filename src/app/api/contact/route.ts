import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, message, product = "VendorShield" } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email is required." },
        { status: 400 }
      );
    }

    console.log(`[Enterprise Lead / Demo Inquiry] Product: ${product} | Name: ${name} | Email: ${email} | Company: ${company}`);
    if (message) {
      console.log(`[Message Content]: ${message}`);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for reaching out! A compliance specialist will be in touch within 24 hours.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process contact inquiry." },
      { status: 500 }
    );
  }
}
