import { updateSession } from "@insforge/sdk/ssr/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Keep the existing public demo available during staged rollout. Auth session
  // refresh becomes active as soon as both public InsForge variables are set.
  if (
    !process.env.NEXT_PUBLIC_INSFORGE_URL ||
    !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  ) {
    return response;
  }

  await updateSession({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
