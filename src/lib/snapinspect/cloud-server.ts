import { NextResponse } from "next/server";
import { createInsForgeAdminClient } from "@/lib/insforge/server";
import { validateInspection } from "./document";

export const DOCUMENT_BUCKET = "snapinspect-documents";
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export function cloudError(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status, headers: PRIVATE_HEADERS });
}
export async function downloadInspection(key: string) {
  const result = await createInsForgeAdminClient().storage.from(DOCUMENT_BUCKET).download(key);
  if (result.error || !result.data) throw new Error("Document download failed");
  const value: unknown = JSON.parse(await result.data.text());
  if (!validateInspection(value)) throw new Error("Invalid stored inspection");
  return value;
}
