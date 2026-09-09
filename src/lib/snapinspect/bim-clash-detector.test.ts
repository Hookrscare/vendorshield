import { describe, it, expect } from "vitest";
import {
  BIMClashDetector,
  BIMElement,
} from "./bim-clash-detector";

describe("SNAP-25: BIMClashDetector", () => {
  const detector = new BIMClashDetector(0.005); // 5mm tolerance

  const structuralBeam: BIMElement = {
    guid: "elem-beam-001",
    name: "W12x26 Steel Girder",
    ifcType: "IfcBeam",
    trade: "STRUCTURAL",
    bbox: {
      minX: 0.0,
      minY: 0.0,
      minZ: 3.0,
      maxX: 10.0,
      maxY: 0.3,
      maxZ: 3.4,
    },
  };

  it("detects critical hard clash between HVAC duct and structural steel girder", () => {
    // HVAC Duct physically crossing right through the beam
    const hvacDuct: BIMElement = {
      guid: "elem-duct-002",
      name: "Main Return Air Duct 500x300",
      ifcType: "IfcDuctSegment",
      trade: "MEP_HVAC",
      bbox: {
        minX: 4.5,
        minY: -1.0,
        minZ: 3.1, // penetrates 3.1m to 3.4m (0.3m depth)
        maxX: 5.5,
        maxY: 1.0,
        maxZ: 3.4,
      },
    };

    const report = detector.detectClashes("Hospital Wing B", [structuralBeam, hvacDuct]);

    expect(report.totalClashesFound).toBe(1);
    expect(report.hardClashesCount).toBe(1);
    expect(report.criticalSeverityCount).toBe(1);

    const clash = report.clashes[0];
    expect(clash.clashType).toBe("HARD_PENETRATION");
    expect(clash.severity).toBe("CRITICAL");
    expect(clash.penetrationDepthMeters).toBeGreaterThan(0.05);
    expect(clash.bcfTopic.assignedTrade).toBe("MEP_HVAC");
    expect(clash.bcfTopic.priority).toBe("HIGH");
  });

  it("detects soft clash clearance buffer violation", () => {
    // Electrical conduit within 50mm maintenance clearance zone of high voltage bus
    const busway: BIMElement = {
      guid: "elem-bus-003",
      name: "480V Feeder Busway",
      ifcType: "IfcFlowSegment",
      trade: "ELECTRICAL",
      bbox: {
        minX: 0.0,
        minY: 5.0,
        minZ: 2.0,
        maxX: 6.0,
        maxY: 5.2,
        maxZ: 2.2,
      },
      requiredClearanceMeters: 0.15, // 150mm clearance buffer
    };

    const plumbingPipe: BIMElement = {
      guid: "elem-pipe-004",
      name: "Domestic Cold Water Pipe 50mm",
      ifcType: "IfcPipeSegment",
      trade: "PLUMBING",
      bbox: {
        minX: 2.0,
        minY: 5.25, // 50mm away from busway (violates 150mm buffer)
        minZ: 2.0,
        maxX: 4.0,
        maxY: 5.30,
        maxZ: 2.05,
      },
    };

    const report = detector.detectClashes("Commercial Tower", [busway, plumbingPipe]);

    expect(report.totalClashesFound).toBe(1);
    expect(report.softClashesCount).toBe(1);
    expect(report.clashes[0].clashType).toBe("SOFT_CLEARANCE_VIOLATION");
    expect(report.clashes[0].severity).toBe("MINOR");
  });

  it("ignores elements with no geometric overlap or clearance infringement", () => {
    const floorSlab: BIMElement = {
      guid: "elem-slab-005",
      name: "Ground Floor Concrete Slab",
      ifcType: "IfcSlab",
      trade: "STRUCTURAL",
      bbox: {
        minX: 0.0,
        minY: 0.0,
        minZ: 0.0,
        maxX: 20.0,
        maxY: 20.0,
        maxZ: 0.2,
      },
    };

    const roofJoist: BIMElement = {
      guid: "elem-joist-006",
      name: "Roof Joist",
      ifcType: "IfcBeam",
      trade: "STRUCTURAL",
      bbox: {
        minX: 0.0,
        minY: 0.0,
        minZ: 10.0,
        maxX: 20.0,
        maxY: 0.2,
        maxZ: 10.3,
      },
    };

    const report = detector.detectClashes("Warehouse", [floorSlab, roofJoist]);
    expect(report.totalClashesFound).toBe(0);
  });
});
