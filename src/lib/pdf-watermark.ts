/**
 * QA-114: Automated SOC 2 Trust Report Watermark Stamping Engine.
 * Dynamically stamps recipient metadata, NDA confidentiality disclaimers,
 * expiration dates, and tamper-evident tracking tokens across PDF pages.
 */

import jsPDF from "jspdf";
import crypto from "crypto";

export interface WatermarkOptions {
  recipientName: string;
  recipientEmail?: string;
  organization?: string;
  confidentialityNotice?: string;
  expirationDate?: string;
  angle?: number;
  opacity?: number;
  fontSize?: number;
  color?: [number, number, number];
  includeHeaderBanner?: boolean;
  includeFooterNotice?: boolean;
  customTrackingToken?: string;
}

export interface WatermarkStampResult {
  pagesStamped: number;
  trackingToken: string;
  timestampIso: string;
  recipientSummary: string;
}

export function generateTrackingToken(recipient: string, dateIso: string): string {
  const payload = `${recipient.trim().toLowerCase()}:${dateIso}:vendorshield-soc2-nda`;
  return `VS-SEC-${crypto.createHash("sha256").update(payload).digest("hex").substring(0, 12).toUpperCase()}`;
}

export function applyWatermarkToDoc(doc: jsPDF, options: WatermarkOptions): WatermarkStampResult {
  const totalPages = (doc as any).internal.getNumberOfPages();
  const angle = options.angle ?? -38;
  const opacity = options.opacity ?? 0.15;
  const fontSize = options.fontSize ?? 20;
  const color = options.color ?? [148, 163, 184]; // slate-400
  const timestampIso = new Date().toISOString();
  const token = options.customTrackingToken || generateTrackingToken(options.recipientName, timestampIso);

  const orgPart = options.organization ? ` (${options.organization})` : "";
  const emailPart = options.recipientEmail ? ` <${options.recipientEmail}>` : "";
  const expiryPart = options.expirationDate ? ` • EXPIRES: ${options.expirationDate}` : "";

  const watermarkPrimaryText = `CONFIDENTIAL • PREPARED FOR ${options.recipientName.toUpperCase()}${orgPart.toUpperCase()}`;
  const watermarkSecondaryText = `DO NOT DISTRIBUTE • TRACKING ID: ${token}${expiryPart}`;

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    // Apply diagonal watermark text in the page center
    // jsPDF supports saveGraphicsState and setGState for transparency
    const hasGState = typeof (doc as any).GState === "function" && typeof (doc as any).setGState === "function";

    if (hasGState) {
      (doc as any).saveGraphicsState();
      (doc as any).setGState(new (doc as any).GState({ opacity }));
    }

    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);

    // Primary diagonal line
    doc.text(watermarkPrimaryText, centerX, centerY - 8, {
      align: "center",
      angle,
    });

    // Secondary diagonal line
    doc.setFontSize(Math.max(9, Math.round(fontSize * 0.45)));
    doc.setFont("helvetica", "normal");
    doc.text(watermarkSecondaryText, centerX, centerY + 4, {
      align: "center",
      angle,
    });

    if (hasGState) {
      (doc as any).restoreGraphicsState();
    }

    // Top tracking badge (if enabled)
    if (options.includeHeaderBanner ?? true) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); // red-600
      const headerText = `RESTRICTED RECIPIENT COPY • PREPARED EXCLUSIVELY FOR ${options.recipientName.toUpperCase()}${emailPart}`;
      doc.text(headerText, pageWidth - 14, 8, { align: "right" });
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont("helvetica", "normal");
      doc.text(`SECURITY AUDIT ID: ${token}`, pageWidth - 14, 11.5, { align: "right" });
    }

    // Bottom NDA disclaimer footer (if enabled)
    if (options.includeFooterNotice ?? true) {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139); // slate-500
      const footerNotice =
        options.confidentialityNotice ||
        "PROPRIETARY & CONFIDENTIAL UNDER MUTUAL NDA. UNAUTHORIZED REPRODUCTION, REDISTRIBUTION, OR TRANSMISSION IS STRICTLY PROHIBITED.";
      doc.text(footerNotice, centerX, pageHeight - 6, { align: "center" });
    }
  }

  return {
    pagesStamped: totalPages,
    trackingToken: token,
    timestampIso,
    recipientSummary: `${options.recipientName}${orgPart}${emailPart}`,
  };
}
