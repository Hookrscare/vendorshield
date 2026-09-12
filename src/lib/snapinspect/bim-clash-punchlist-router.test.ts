import { describe, it, expect } from "vitest";
import {
  BIMClashPunchListRouter,
  TradeSubcontractorProfile
} from "./bim-clash-punchlist-router";
import { BIMClashResult } from "./bim-clash-detector";

describe("SNAP-40: Multi-Trade BIM IFC Geometry Model Clash Detection & Punch-List Router", () => {
  const router = new BIMClashPunchListRouter();

  const hvacSub: TradeSubcontractorProfile = {
    subcontractorId: "SUB-MEP-01",
    companyName: "Apex Mechanical & HVAC",
    trade: "MEP_HVAC",
    contactEmail: "foreman@apexmech.com",
    leadSuperintendent: "Dave Miller",
    slaMaxResponseHours: 24
  };

  const structuralSub: TradeSubcontractorProfile = {
    subcontractorId: "SUB-STR-01",
    companyName: "Titan Steel Fabricators",
    trade: "STRUCTURAL",
    contactEmail: "ops@titansteel.com",
    leadSuperintendent: "Sarah Connor",
    slaMaxResponseHours: 48
  };

  router.registerSubcontractor(hvacSub);
  router.registerSubcontractor(structuralSub);

  it("routes structural vs HVAC clash to HVAC subcontractor with 24h SLA for critical penetration", () => {
    const mockClash: BIMClashResult = {
      clashId: "CLASH-BIM-001",
      clashType: "HARD_PENETRATION",
      severity: "CRITICAL",
      elementA: {
        guid: "GUID-BEAM-01",
        name: "W24x68 Steel Girder",
        ifcType: "IfcBeam",
        trade: "STRUCTURAL",
        bbox: { minX: 0, minY: 0, minZ: 3, maxX: 10, maxY: 0.5, maxZ: 3.6 }
      },
      elementB: {
        guid: "GUID-DUCT-01",
        name: "Supply Air Duct 24x12",
        ifcType: "IfcDuctSegment",
        trade: "MEP_HVAC",
        bbox: { minX: 5, minY: -0.2, minZ: 3.2, maxX: 5.6, maxY: 0.8, maxZ: 3.5 }
      },
      penetrationDepthMeters: 0.3,
      clearanceShortfallMeters: 0.35,
      clashCentroid: [5.3, 0.3, 3.35],
      bcfTopic: {
        title: "Duct penetrates structural girder",
        assignedTrade: "MEP_HVAC",
        priority: "HIGH",
        description: "HVAC duct collides with W24 steel girder"
      }
    };

    const baseDate = new Date("2026-09-12T10:00:00Z");
    const report = router.routeClashesToPunchList("PROJ-SNAP-SITE-A", [mockClash], baseDate);

    expect(report.totalPunchItemsCreated).toBe(1);
    expect(report.criticalPunchesCount).toBe(1);
    expect(report.tradeDispatchBreakdown.MEP_HVAC).toBe(1);

    const item = report.items[0];
    expect(item.assignedTrade).toBe("MEP_HVAC"); // Duct routes around steel
    expect(item.responsibleSubcontractorId).toBe("SUB-MEP-01");
    expect(item.severity).toBe("CRITICAL");
    expect(item.resolutionDeadlineIso).toBe(new Date("2026-09-13T10:00:00Z").toISOString()); // +24h
    expect(item.status).toBe("DISPATCHED");
  });

  it("verifies physical clearance resolution when relocated coordinates are submitted", () => {
    const punchId = "PUNCH-TEST-CLEARANCE";
    router.updatePunchStatus(punchId, "DISPATCHED");

    // Beam at Z=3.0 to 3.6
    const beamBox = { minX: 0, minY: 0, minZ: 3.0, maxX: 10, maxY: 0.5, maxZ: 3.6 };
    // Relocated Duct below beam: Z=2.2 to 2.5 (gap of 0.5m > 0.05m clearance)
    const relocatedDuctBox = { minX: 5, minY: 0, minZ: 2.2, maxX: 5.6, maxY: 0.5, maxZ: 2.5 };

    // Register a punch item to verify
    const item = router.routeClashesToPunchList("PROJ-B", [{
      clashId: "CLASH-CLEARANCE-02",
      clashType: "HARD_PENETRATION",
      severity: "MAJOR",
      elementA: { guid: "A", name: "Beam", ifcType: "IfcBeam", trade: "STRUCTURAL", bbox: beamBox },
      elementB: { guid: "B", name: "Duct", ifcType: "IfcDuctSegment", trade: "MEP_HVAC", bbox: beamBox },
      penetrationDepthMeters: 0.1,
      clearanceShortfallMeters: 0.1,
      clashCentroid: [5, 0.25, 3.3],
      bcfTopic: { title: "Clash", assignedTrade: "MEP_HVAC", priority: "MEDIUM", description: "Clash" }
    }]).items[0];

    const verified = router.verifyRectifiedClearance(item.punchId, beamBox, relocatedDuctBox, 0.05);
    expect(verified).toBe(true);
  });
});
