import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { resolveTenantContext } from "@/lib/insforge/context";
import { cloudError, PRIVATE_HEADERS } from "@/lib/snapinspect/cloud-server";
import { INSPECTION_ID } from "@/lib/snapinspect/document";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await resolveTenantContext(request);
  if (!tenant.success) return cloudError(tenant.error, tenant.status);
  const { context } = tenant;
  if (!["owner", "admin", "member"].includes(context.role)) return cloudError("Your role cannot share inspections", 403);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!INSPECTION_ID.test(id) || !body || !Number.isSafeInteger(body.revision) || body.revision < 1 || typeof body.revoke !== "boolean") return cloudError("Invalid share request", 400);
  if (body.organizationId !== context.organization.id) return cloudError("Workspace changed. Reload before sharing.", 409);
  const token = body.revoke ? null : randomBytes(32).toString("base64url");
  const result = await context.client.database.rpc("set_inspection_share", {
    target_org: context.organization.id, target_client_id: id, expected_revision: body.revision,
    token_hash: token ? createHash("sha256").update(token).digest("hex") : null,
  });
  if (result.error) return cloudError("Share could not be updated. Save and reload the latest revision first.", 409);
  return NextResponse.json({ success: true, token, expiresAt: result.data?.expiresAt }, { headers: PRIVATE_HEADERS });
}
