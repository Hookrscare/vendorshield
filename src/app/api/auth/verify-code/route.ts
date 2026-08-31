import {
  isValidEmail,
  normalizeEmail,
  normalizeName,
  normalizeOtp,
} from "@/lib/auth/validation";
import { createAuthActions } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const name = normalizeName(body?.name);
  const otp = normalizeOtp(body?.otp);

  if (!isValidEmail(email) || otp.length !== 6) {
    return NextResponse.json(
      { success: false, error: "Enter the six-digit code from your email." },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ success: true });
  const auth = createAuthActions({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });
  const { data, error } = await auth.verifyOtp({ email, otp, name: name || undefined });

  if (error || !data?.user) {
    return NextResponse.json(
      { success: false, error: "That code is invalid or expired." },
      { status: error?.statusCode ?? 401 }
    );
  }

  return NextResponse.json(
    { success: true, user: { id: data.user.id, email: data.user.email } },
    { headers: response.headers }
  );
}
