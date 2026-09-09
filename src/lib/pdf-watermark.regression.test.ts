// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import jsPDF from "jspdf";
import {
  applyWatermarkToDoc,
  generateTrackingToken,
  WatermarkOptions,
} from "./pdf-watermark";

describe("pdf-watermark (QA-114 Automated Stamping Engine)", () => {
  it("generates deterministic tracking tokens using SHA-256 substring", () => {
    const token1 = generateTrackingToken("Acme Corp CISO", "2026-09-07T12:00:00Z");
    const token2 = generateTrackingToken("Acme Corp CISO", "2026-09-07T12:00:00Z");
    const tokenDiff = generateTrackingToken("Other Corp CISO", "2026-09-07T12:00:00Z");

    expect(token1).toMatch(/^VS-SEC-[0-9A-F]{12}$/);
    expect(token1).toBe(token2);
    expect(token1).not.toBe(tokenDiff);
  });

  it("stamps single page document with recipient watermark and security banners", () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.text("SOC 2 Audit Report Content", 14, 20);

    const options: WatermarkOptions = {
      recipientName: "Enterprise Security Reviewer",
      recipientEmail: "ciso@bigcorp.example.com",
      organization: "BigCorp Inc",
      expirationDate: "2026-10-01",
    };

    const result = applyWatermarkToDoc(doc, options);

    expect(result.pagesStamped).toBe(1);
    expect(result.trackingToken).toMatch(/^VS-SEC-[0-9A-F]{12}$/);
    expect(result.recipientSummary).toContain("Enterprise Security Reviewer");
    expect(result.recipientSummary).toContain("BigCorp Inc");
    expect(result.recipientSummary).toContain("ciso@bigcorp.example.com");

    const pdfOutput = doc.output();
    expect(pdfOutput.startsWith("%PDF-")).toBe(true);
    expect(pdfOutput).toContain("CONFIDENTIAL");
    expect(pdfOutput).toContain("ENTERPRISE SECURITY REVIEWER");
  });

  it("stamps all pages across a multi-page document", () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.text("Page 1", 14, 20);
    doc.addPage();
    doc.text("Page 2", 14, 20);
    doc.addPage();
    doc.text("Page 3", 14, 20);

    const options: WatermarkOptions = {
      recipientName: "Lead Compliance Auditor",
      customTrackingToken: "VS-SEC-AUDIT9999",
      includeHeaderBanner: true,
      includeFooterNotice: true,
    };

    const result = applyWatermarkToDoc(doc, options);

    expect(result.pagesStamped).toBe(3);
    expect(result.trackingToken).toBe("VS-SEC-AUDIT9999");

    const pdfOutput = doc.output();
    expect(pdfOutput).toContain("VS-SEC-AUDIT9999");
    expect(pdfOutput).toContain("LEAD COMPLIANCE AUDITOR");
  });

  it("supports disabling header and footer banners for minimal diagonal stamp", () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.text("Minimal Document", 14, 20);

    const options: WatermarkOptions = {
      recipientName: "Confidential Reviewer",
      includeHeaderBanner: false,
      includeFooterNotice: false,
      angle: -45,
      opacity: 0.1,
    };

    const result = applyWatermarkToDoc(doc, options);
    expect(result.pagesStamped).toBe(1);

    const pdfOutput = doc.output();
    expect(pdfOutput.startsWith("%PDF-")).toBe(true);
  });
});
