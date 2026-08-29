// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateAuditorPdf, generateCsvExport } from "./pdf-export";
import { CompanySettings, SubProcessorVendor } from "./types";
import fs from "fs";

describe("pdf-export (QA-102 Regression Matrix)", () => {
  const mockCompany: CompanySettings = {
    name: "Acme Corp",
    slug: "acme-corp",
    website: "https://acme.example.com",
    privacyEmail: "privacy@acme.example.com",
    dpoName: "Jane Doe",
    lastAuditDate: "2026-08-01",
    autoSyncPublicPage: true,
    theme: "system",
    notificationEmail: "security@acme.example.com",
  };

  const mockVendors: SubProcessorVendor[] = [
    {
      id: "v-1",
      name: "AWS",
      slug: "aws",
      description: "Primary cloud provider",
      category: "Cloud Infrastructure & Hosting",
      website: "https://aws.amazon.com",
      dataProcessed: ["Customer PII", "Database Backups"],
      dataLocation: "US-East, EU-Central",
      dpaStatus: "Signed",
      dpaUrl: "https://aws.amazon.com/dpa",
      certifications: ["SOC 2 Type II", "ISO 27001"],
      riskLevel: "Low",
      lastReviewedDate: "2026-01-15",
      nextReviewDate: "2027-01-15",
      notes: "Primary cloud host",
      isPublic: true,
      addedAt: "2025-01-15",
    },
    {
      id: "v-2",
      name: "OpenAI",
      slug: "openai",
      description: "AI model provider",
      category: "AI & Machine Learning",
      website: "https://openai.com",
      dataProcessed: ["Prompt Text"],
      dataLocation: "US",
      dpaStatus: "Missing",
      dpaUrl: "",
      certifications: ["SOC 2 Type II"],
      riskLevel: "High",
      lastReviewedDate: "2026-02-01",
      nextReviewDate: "2026-08-01",
      notes: "Zero data retention agreement pending",
      isPublic: true,
      addedAt: "2025-02-01",
    },
  ];

  let writeFileSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    writeFileSyncSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
  });

  afterEach(() => {
    writeFileSyncSpy.mockRestore();
  });

  it("generates auditor PDF and writes valid PDF binary stream", () => {
    generateAuditorPdf(mockCompany, mockVendors, "Jane Doe (Head of Security)");

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [filename, data] = writeFileSyncSpy.mock.calls[0];
    expect(filename).toBe("acme-corp-soc2-subprocessor-register.pdf");
    expect(typeof data === "string" || Buffer.isBuffer(data) || data instanceof Uint8Array).toBe(true);
    const contentStr = String(data);
    expect(contentStr.startsWith("%PDF-")).toBe(true);
  });

  it("handles empty vendor lists without crashing and writes valid PDF", () => {
    generateAuditorPdf(mockCompany, [], "Auditor");

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [filename, data] = writeFileSyncSpy.mock.calls[0];
    expect(filename).toBe("acme-corp-soc2-subprocessor-register.pdf");
    expect(String(data).startsWith("%PDF-")).toBe(true);
  });

  it("safely sanitizes company slug in filename and handles malicious XSS payloads without error", () => {
    const maliciousCompany: CompanySettings = {
      ...mockCompany,
      slug: "acme/../../../evil<script>alert(1)</script>",
    };

    const maliciousVendors: SubProcessorVendor[] = [
      {
        id: "v-xss",
        name: "<script>alert('xss')</script>",
        slug: "malicious-vendor",
        description: "<svg onload=alert(1)>",
        category: "Developer Tools & CI/CD",
        website: "javascript:alert(1)",
        dataProcessed: ["<img src=x onerror=alert(1)>", "Normal Data"],
        dataLocation: "\x00\x08Null and control characters\n\r\t",
        dpaStatus: "Missing",
        dpaUrl: "https://example.com/\"'<>",
        certifications: ["None"],
        riskLevel: "High",
        lastReviewedDate: "2026-01-01",
        nextReviewDate: "2026-12-31",
        notes: "'; DROP TABLE vendors; --",
        isPublic: false,
        addedAt: "2026-01-01",
      },
    ];

    generateAuditorPdf(maliciousCompany, maliciousVendors, "<script>alert('ciso')</script>");

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [filename, data] = writeFileSyncSpy.mock.calls[0];
    expect(filename).toBe("acme__________evil_script_alert_1___script_-soc2-subprocessor-register.pdf");
    expect(String(data).startsWith("%PDF-")).toBe(true);
  });

  it("safely handles oversized vendor rosters (50+ items) with multi-page table pagination", () => {
    const largeVendorList: SubProcessorVendor[] = Array.from({ length: 60 }, (_, i) => ({
      id: `v-${i}`,
      name: `Enterprise Vendor #${i} ${"LongName ".repeat(5)}`,
      slug: `enterprise-vendor-${i}`,
      description: `Enterprise monitoring vendor ${i}`,
      category: "Analytics & Observability",
      website: `https://vendor-${i}.example.com`,
      dataProcessed: ["Telemetry", "User Logs", "Transaction Metadata", "Session IDs"],
      dataLocation: "Global Multi-Region (US, EU, APAC, LATAM)",
      dpaStatus: i % 2 === 0 ? "Signed" : "Missing",
      dpaUrl: `https://vendor-${i}.example.com/dpa`,
      certifications: ["SOC 2 Type II", "ISO 27001", "HIPAA", "PCI-DSS"],
      riskLevel: i % 3 === 0 ? "Low" : i % 3 === 1 ? "Medium" : "High",
      lastReviewedDate: "2026-01-01",
      nextReviewDate: "2027-01-01",
      notes: `Detailed compliance notes for vendor ${i}. `.repeat(10),
      isPublic: true,
      addedAt: "2025-01-01",
    }));

    generateAuditorPdf(mockCompany, largeVendorList, "Lead Auditor");

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [filename, data] = writeFileSyncSpy.mock.calls[0];
    expect(filename).toBe("acme-corp-soc2-subprocessor-register.pdf");
    expect(String(data).startsWith("%PDF-")).toBe(true);
  });

  it("generates CSV export without escaping issues", () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    
    expect(() => {
      generateCsvExport(mockCompany, mockVendors);
    }).not.toThrow();

    expect(clickSpy).toHaveBeenCalled();
  });
});
