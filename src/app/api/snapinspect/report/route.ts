import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createInsForgeAdminClient } from "@/lib/insforge/server";
import { cloudError, downloadInspection, PRIVATE_HEADERS } from "@/lib/snapinspect/cloud-server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.token !== "string" || !/^[a-zA-Z0-9_-]{43}$/.test(body.token)) return cloudError("Report link is invalid or expired", 404);
  try {
    const result = await createInsForgeAdminClient().database.from("inspections")
      .select("share_document_key,share_expires_at")
      .eq("share_token_hash", createHash("sha256").update(body.token).digest("hex"))
      .gt("share_expires_at", new Date().toISOString()).maybeSingle();
    if (result.error) return cloudError("Report is temporarily unavailable", 503);
    if (!result.data?.share_document_key) return cloudError("Report link is invalid or expired", 404);
    const inspection = await downloadInspection(result.data.share_document_key);
    return NextResponse.json({ success: true, inspection, expiresAt: result.data.share_expires_at }, { headers: PRIVATE_HEADERS });
  } catch { return cloudError("Report is temporarily unavailable", 503); }
}
