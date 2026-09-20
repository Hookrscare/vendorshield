import { NextResponse } from "next/server";

// Never return fixture verdicts or random strings as proof of submitted media.
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      code: "MEDIA_ANALYSIS_UNAVAILABLE",
      error: "Media authenticity analysis is not implemented. No verdict or certificate has been generated.",
    },
    { status: 501 }
  );
}
