import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { resolveTenantContext } from "@/lib/insforge/context";
import { createInsForgeAdminClient } from "@/lib/insforge/server";
import { MAX_DOCUMENT_BYTES, validateInspection } from "@/lib/snapinspect/document";
import { cloudError, DOCUMENT_BUCKET, PRIVATE_HEADERS } from "@/lib/snapinspect/cloud-server";

export async function GET(request: NextRequest) {
  const tenant = await resolveTenantContext(request);
  if (!tenant.success) return cloudError(tenant.error, tenant.status);
  const { context } = tenant;
  const { data, error } = await context.client.database.from("inspections")
    .select("client_id,title,revision,updated_at,share_expires_at")
    .eq("organization_id", context.organization.id).not("document_key", "is", null)
    .order("updated_at", { ascending: false }).limit(100);
  if (error) return cloudError("Unable to load saved inspections", 503);
  return NextResponse.json({ success: true, organization: context.organization, userId: context.user.id, role: context.role, data }, { headers: PRIVATE_HEADERS });
}

export async function POST(request: NextRequest) {
  const tenant = await resolveTenantContext(request);
  if (!tenant.success) return cloudError(tenant.error, tenant.status);
  const { context } = tenant;
  if (!["owner", "admin", "member"].includes(context.role)) return cloudError("Your role cannot save inspections", 403);
  if (Number(request.headers.get("content-length")) > MAX_DOCUMENT_BYTES) return cloudError("Inspection exceeds the 3 MB limit. Reduce attached photos.", 413);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_DOCUMENT_BYTES) return cloudError("Inspection exceeds the 3 MB limit. Reduce attached photos.", 413);
  let body;
  try { body = JSON.parse(raw); } catch { return cloudError("Invalid JSON", 400); }
  const { inspection, revision, organizationId } = body || {};
  if (organizationId !== context.organization.id) return cloudError("Workspace changed. Reload before saving.", 409);
  if (!validateInspection(inspection) || !Number.isSafeInteger(revision) || revision < 0) return cloudError("Invalid inspection or revision", 400);
  const existing = await context.client.database.from("inspections").select("revision").eq("organization_id", context.organization.id).eq("client_id", inspection.id).maybeSingle();
  if (existing.error) return cloudError("Could not check the saved revision. Your local copy is unchanged.", 503);
  if ((existing.data?.revision || 0) !== revision) return cloudError("Another device saved a newer revision. Keep your draft and load the cloud copy separately.", 409);
  // Immutable blobs ensure a failed/conflicting DB save cannot overwrite another revision.
  const admin = createInsForgeAdminClient();
  const key = `${context.organization.id}/${inspection.id}/${randomUUID()}.json`;
  try {
    const upload = await admin.storage.from(DOCUMENT_BUCKET).upload(key, new Blob([JSON.stringify(inspection)], { type: "application/json" }));
    if (upload.error || !upload.data) return cloudError("Upload failed. Your local copy is unchanged.", 503);
    const saved = await context.client.database.rpc("save_inspection_document", {
      target_org: context.organization.id, target_client_id: inspection.id, expected_revision: revision,
      new_title: inspection.title, new_document_key: upload.data.key, new_document_url: upload.data.url,
    });
    if (saved.error) {
      // Do not delete on ambiguous commit failures; an acknowledged pointer could exist.
      const conflict = JSON.stringify(saved.error).includes("revision_conflict") || JSON.stringify(saved.error).includes("40001");
      return cloudError(conflict ? "Another device saved a newer revision. Keep your draft and load the cloud copy separately." : "Save could not be confirmed. Your local copy is unchanged.", conflict ? 409 : 503);
    }
    return NextResponse.json({ success: true, data: saved.data }, { headers: PRIVATE_HEADERS });
  } catch { return cloudError("Cloud save is unavailable. Your local copy is unchanged.", 503); }
}
