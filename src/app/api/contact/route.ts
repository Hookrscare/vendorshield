import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Contact delivery is not configured. No inquiry has been submitted or scheduled for follow-up." },
    { status: 503 }
  );
}
