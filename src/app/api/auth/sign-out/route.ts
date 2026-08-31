import { createAuthActions } from "@insforge/sdk/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  const auth = createAuthActions({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });
  const { error } = await auth.signOut();

  if (error) {
    return NextResponse.json(
      { success: false, error: "Unable to sign out." },
      { status: error.statusCode ?? 500 }
    );
  }

  return response;
}
