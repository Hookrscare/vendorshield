import type { InspectionData } from "./types";

export const MAX_DOCUMENT_BYTES = 3_000_000;
export const INSPECTION_ID = /^[a-zA-Z0-9_-]{1,100}$/;

export function validateInspection(value: unknown): value is InspectionData {
  if (!value || typeof value !== "object") return false;
  const doc = value as Record<string, unknown>;
  const required = ["id", "title", "trade", "inspectorName", "inspectorCompany", "inspectorLicense", "inspectorPhone", "inspectorEmail", "clientName", "clientEmail", "clientPhone", "propertyAddress", "inspectionDate", "weatherConditions", "scopeOfInspection", "overallCondition", "executiveSummary", "status", "createdAt", "updatedAt"];
  if (required.some(key => typeof doc[key] !== "string" || (doc[key] as string).length > 20000)) return false;
  if (!INSPECTION_ID.test(doc.id as string) || !(doc.title as string).trim() || (doc.title as string).length > 240) return false;
  if (!["residential", "commercial_roof", "hvac", "custom"].includes(doc.trade as string)) return false;
  if (!["draft", "completed", "sent"].includes(doc.status as string) || typeof doc.disclaimerAccepted !== "boolean") return false;
  if (!Array.isArray(doc.defects) || doc.defects.length > 200) return false;
  return doc.defects.every(defect => {
    if (!defect || typeof defect !== "object") return false;
    if (["id", "title", "category", "description", "severity", "location", "actionRecommended", "createdAt"].some(key => typeof defect[key] !== "string" || defect[key].length > 20000)) return false;
    if (!Array.isArray(defect.photos) || defect.photos.length > 20) return false;
    return defect.photos.every((photo: Record<string, unknown>) => photo && typeof photo.id === "string" && typeof photo.caption === "string" && typeof photo.timestamp === "string" && typeof photo.url === "string" && /^data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]/i.test(photo.url));
  });
}
