import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/insforge/context";
import { cloudError, downloadInspection, PRIVATE_HEADERS } from "@/lib/snapinspect/cloud-server";
import { INSPECTION_ID } from "@/lib/snapinspect/document";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await resolveTenantContext(request);
  if (!tenant.success) return cloudError(tenant.error, tenant.status);
  const { id } = await params;
  if (!INSPECTION_ID.test(id)) return cloudError("Invalid inspection ID", 400);
  const { context } = tenant;
  const result = await context.client.database.from("inspections").select("document_key,revision")
    .eq("organization_id", context.organization.id).eq("client_id", id).maybeSingle();
  if (result.error) return cloudError("Unable to load inspection", 503);
  if (!result.data?.document_key) return cloudError("Inspection not found", 404);
  try {
    const inspection = await downloadInspection(result.data.document_key);
    return NextResponse.json({ success: true, inspection, revision: result.data.revision }, { headers: PRIVATE_HEADERS });
  } catch { return cloudError("Unable to retrieve inspection document", 503); }
}
