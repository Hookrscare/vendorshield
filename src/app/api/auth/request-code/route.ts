import { normalizeEmail, isValidEmail } from "@/lib/auth/validation";
import { createAuthActions } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { success: false, error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ success: true });
  const auth = createAuthActions({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });
  const { error } = await auth.signInWithOtp({ email });

  if (error) {
    return NextResponse.json(
      { success: false, error: "Unable to send a sign-in code. Try again shortly." },
      { status: error.statusCode >= 400 ? error.statusCode : 503 }
    );
  }

  return response;
}
