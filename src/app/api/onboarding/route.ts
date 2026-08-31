import { normalizeName, slugifyOrganizationName } from "@/lib/auth/validation";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const client = await createInsForgeServerClient();
  const { data: authData, error: authError } = await client.auth.getCurrentUser();
  const user = authData?.user;

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: "Sign in before creating an organization." },
      { status: 401 }
    );
  }

  const existingMembership = await client.database
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingMembership.error) {
    return NextResponse.json(
      { success: false, error: "Unable to check your organization." },
      { status: 503 }
    );
  }

  if (existingMembership.data) {
    return NextResponse.json({
      success: true,
      organizationId: existingMembership.data.organization_id,
    });
  }

  const body = await request.json().catch(() => null);
  const name = normalizeName(body?.name);
  const slug = slugifyOrganizationName(body?.name);

  if (!name || !slug) {
    return NextResponse.json(
      { success: false, error: "Enter a valid organization name." },
      { status: 400 }
    );
  }

  const { data, error } = await client.database.rpc("create_organization", {
    organization_name: name,
    organization_slug: slug,
  });

  if (error) {
    const isDuplicate = error.message.toLowerCase().includes("duplicate");
    return NextResponse.json(
      {
        success: false,
        error: isDuplicate
          ? "That organization name is already in use. Try a more specific name."
          : "Unable to create your organization.",
      },
      { status: isDuplicate ? 409 : 503 }
    );
  }

  return NextResponse.json({ success: true, organizationId: data }, { status: 201 });
}
