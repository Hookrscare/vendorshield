// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateInspectionPdf } from "./pdf-generator";
import { InspectionData } from "./types";
import fs from "fs";

describe("snapinspect/pdf-generator (QA-102 Regression Matrix)", () => {
  const mockInspection: InspectionData = {
    id: "insp-101",
    title: "Comprehensive Residential Safety Audit",
    trade: "residential",
    inspectorName: "Marcus Vance",
    inspectorCompany: "Vance Engineering Inspections LLC",
    inspectorLicense: "TREC #98421",
    inspectorPhone: "(555) 234-5678",
    inspectorEmail: "marcus@vanceinspect.example.com",
    clientName: "Eleanor Rigby",
    clientEmail: "eleanor@example.com",
    clientPhone: "(555) 876-5432",
    propertyAddress: "742 Evergreen Terrace, Springfield",
    inspectionDate: "2026-08-20",
    weatherConditions: "72°F, Clear, Dry",
    scopeOfInspection: "Full structural, roofing, electrical, and HVAC assessment.",
    overallCondition: "Fair / Maintenance Required",
    executiveSummary: "Visual inspection revealed 3 critical maintenance items and 1 urgent electrical issue requiring licensed contractor intervention.",
    defects: [
      {
        id: "d-1",
        category: "Electrical",
        title: "Double-tapped neutral bus bar in main breaker",
        description: "Multiple neutral conductors are terminated under a single screw lug.",
        severity: "Urgent Repair",
        location: "Main Service Panel - Garage",
        actionRecommended: "Have master electrician separate conductors to individual terminal points.",
        estimatedCost: "$350 - $500",
        photos: [
          {
            id: "p-1",
            url: "https://example.com/photo1.jpg",
            caption: "Main breaker panel neutral bar close-up",
            timestamp: "2026-08-20T10:15:00Z",
          },
        ],
        createdAt: "2026-08-20T10:15:00Z",
      },
      {
        id: "d-2",
        category: "Plumbing",
        title: "Slow drainage and calcification under kitchen sink P-trap",
        description: "Minor seepage observed around slip joint nut.",
        severity: "Minor / Cosmetic",
        location: "Kitchen",
        actionRecommended: "Replace rubber washer and re-tighten coupling.",
        estimatedCost: "$50 - $100",
        photos: [],
        createdAt: "2026-08-20T10:45:00Z",
      },
    ],
    status: "completed",
    disclaimerAccepted: true,
    createdAt: "2026-08-20T09:00:00Z",
    updatedAt: "2026-08-20T12:00:00Z",
  };

  let writeFileSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    writeFileSyncSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
  });

  afterEach(() => {
    writeFileSyncSpy.mockRestore();
  });

  it("generates inspection PDF and writes valid PDF binary stream", () => {
    generateInspectionPdf(mockInspection);

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [filename, data] = writeFileSyncSpy.mock.calls[0];
    expect(filename).toBe("insp-101-residential-inspection-report.pdf");
    expect(typeof data === "string" || Buffer.isBuffer(data) || data instanceof Uint8Array).toBe(true);
    expect(String(data).startsWith("%PDF-")).toBe(true);
  });

  it("handles empty defect lists without crashing and writes valid PDF", () => {
    generateInspectionPdf({
      ...mockInspection,
      defects: [],
    });

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [filename, data] = writeFileSyncSpy.mock.calls[0];
    expect(filename).toBe("insp-101-residential-inspection-report.pdf");
    expect(String(data).startsWith("%PDF-")).toBe(true);
  });

  it("safely sanitizes inspection ID and trade for filename and handles malicious XSS inputs without error", () => {
    const maliciousInspection: InspectionData = {
      ...mockInspection,
      id: "insp-../../<script>alert(1)</script>",
      title: "<img src=x onerror=alert('title')>",
      inspectorName: "\x00\x1b[31mMalicious Inspector\x1b[0m",
      propertyAddress: "'); DROP TABLE properties; -- <iframe src='javascript:alert(1)'>",
      executiveSummary: "<svg onload=alert(1)>".repeat(50),
      defects: [
        {
          id: "def-mal",
          category: "<script>document.cookie='leak'</script>",
          title: "Exploit attempt: {{constructor.constructor('alert(1)')()}}",
          description: "<object data='evil.swf'></object>",
          severity: "Urgent Repair",
          location: "../../../../etc/passwd",
          actionRecommended: "<marquee>RUN</marquee>",
          estimatedCost: "$$$$$$${7*7}",
          photos: [],
          createdAt: "2026-08-24",
        },
      ],
    };

    generateInspectionPdf(maliciousInspection);

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [filename, data] = writeFileSyncSpy.mock.calls[0];
    expect(filename).toBe("insp-_______script_alert_1___script_-residential-inspection-report.pdf");
    expect(String(data).startsWith("%PDF-")).toBe(true);
  });

  it("safely handles oversized inspections (35+ defects) with auto-table pagination across multiple pages", () => {
    const massiveInspection: InspectionData = {
      ...mockInspection,
      executiveSummary: "Massive executive summary. ".repeat(80),
      defects: Array.from({ length: 35 }, (_, i) => ({
        id: `defect-${i}`,
        category: `Category ${i}`,
        title: `Comprehensive Defect #${i} with very long title text describing multiple observations`,
        description: `Detailed observation narrative #${i}: `.repeat(15),
        severity: i % 4 === 0 ? "Urgent Repair" : i % 4 === 1 ? "Safety Hazard" : i % 4 === 2 ? "Moderate / Maintenance" : "Minor / Cosmetic",
        location: `Room / Sub-assembly area ${i} on floor level ${Math.floor(i / 5)}`,
        actionRecommended: `Contractor recommendation #${i}: replace assembly and perform follow-up pressure testing. `.repeat(5),
        estimatedCost: `$${(i + 1) * 250} - $${(i + 1) * 500}`,
        photos: Array.from({ length: (i % 3) + 1 }, (_, p) => ({
          id: `photo-${i}-${p}`,
          url: `https://example.com/photos/def-${i}-${p}.jpg`,
          caption: `Photo caption ${p} for defect ${i}`,
          timestamp: "2026-08-20T11:00:00Z",
        })),
        createdAt: "2026-08-20T11:00:00Z",
      })),
    };

    generateInspectionPdf(massiveInspection);

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [filename, data] = writeFileSyncSpy.mock.calls[0];
    expect(filename).toBe("insp-101-residential-inspection-report.pdf");
    expect(String(data).startsWith("%PDF-")).toBe(true);
  });

  it("supports all trade templates (commercial_roof, hvac, custom)", () => {
    const trades = ["commercial_roof", "hvac", "custom"] as const;
    for (const trade of trades) {
      generateInspectionPdf({
        ...mockInspection,
        trade,
      });
    }

    expect(writeFileSyncSpy).toHaveBeenCalledTimes(3);
    const generatedFilenames = writeFileSyncSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(generatedFilenames).toEqual([
      "insp-101-commercial_roof-inspection-report.pdf",
      "insp-101-hvac-inspection-report.pdf",
      "insp-101-custom-inspection-report.pdf",
    ]);
  });
});
