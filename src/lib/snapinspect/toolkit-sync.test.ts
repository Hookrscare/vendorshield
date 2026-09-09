// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  formatPreInspectionContract,
  generateContractPdf,
  getNotionWorkspaceBlueprints,
  InspectorProfile,
  InspectionEngagement,
} from "./toolkit-sync";

describe("snapinspect toolkit-sync (SNAP-04 Digital Inspector Toolkit)", () => {
  const mockInspector: InspectorProfile = {
    companyName: "Apex Building Diagnostics",
    inspectorName: "Marcus Vance",
    licenseNumber: "HI-94821",
    phone: "(555) 234-5678",
    email: "marcus@apexinspections.example",
  };

  const mockEngagement: InspectionEngagement = {
    clientName: "David Sterling",
    propertyAddress: "1248 Oakridge Lane, Boulder, CO",
    inspectionDate: "2026-09-15",
    inspectionFee: 550.0,
  };

  it("formats compliant InterNACHI markdown pre-inspection agreement", () => {
    const text = formatPreInspectionContract(mockInspector, mockEngagement);

    expect(text).toContain("Apex Building Diagnostics");
    expect(text).toContain("HI-94821");
    expect(text).toContain("David Sterling");
    expect(text).toContain("1248 Oakridge Lane");
    expect(text).toContain("$550.00");
    expect(text).toContain("LIMITATION OF LIABILITY");
    expect(text).toContain("CLIENT SIGNATURE");
  });

  it("generates valid PDF contract with checksum and signature blocks", () => {
    const result = generateContractPdf(mockInspector, mockEngagement);

    expect(result.filename).toBe("david-sterling-pre-inspection-agreement.pdf");
    expect(result.checksum).toMatch(/^SNAP-CONTRACT-[0-9A-F]{10}$/);
    expect(result.pdfBytes.startsWith("%PDF-")).toBe(true);
    expect(result.pdfBytes).toContain("APEX BUILDING DIAGNOSTICS");
    expect(result.pdfBytes).toContain("PRE-INSPECTION AGREEMENT");
  });

  it("provides structured Notion OS workspace blueprints", () => {
    const blueprints = getNotionWorkspaceBlueprints();

    expect(blueprints.inspectionPipeline).toBeDefined();
    expect(blueprints.inspectionPipeline.title).toBe("Active Inspection Orders");
    expect(blueprints.inspectionPipeline.properties.Property.type).toBe("title");
    expect(blueprints.inspectionPipeline.properties.Fee.type).toBe("number");
    expect(blueprints.inspectionPipeline.recommendedViews.length).toBeGreaterThanOrEqual(3);

    expect(blueprints.equipmentLog).toBeDefined();
    expect(blueprints.equipmentLog.title).toBe("Field Equipment & Calibration Register");
    expect(blueprints.equipmentLog.properties.ToolName.type).toBe("title");
    expect(blueprints.equipmentLog.properties.OperationalStatus.type).toBe("select");
  });
});
