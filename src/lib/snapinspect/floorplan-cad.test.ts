import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  calculatePolygonArea,
  computeRoomPhysicalArea,
  findNearbyDefectPins,
  upsertDefectPin,
  generateFloorplanSvgMarkup,
  type FloorplanCADModel,
  type CADPoint,
  type DefectPin
} from "./floorplan-cad";

describe("SNAP-10: Client-Side Offline SVG Floorplan Vector CAD Annotator", () => {
  const sampleModel: FloorplanCADModel = {
    id: "FP-101",
    propertyAddress: "742 Evergreen Terrace, Sector 4",
    scalePixelsPerUnit: 20, // 20px = 1 ft
    unit: "FT",
    width: 800,
    height: 600,
    walls: [
      {
        id: "w-01",
        start: { x: 50, y: 50 },
        end: { x: 450, y: 50 },
        type: "EXTERIOR_BEARING",
        thicknessPx: 6
      },
      {
        id: "w-02",
        start: { x: 450, y: 50 },
        end: { x: 450, y: 350 },
        type: "EXTERIOR_BEARING",
        thicknessPx: 6
      },
      {
        id: "w-03",
        start: { x: 450, y: 350 },
        end: { x: 50, y: 350 },
        type: "EXTERIOR_BEARING",
        thicknessPx: 6
      },
      {
        id: "w-04",
        start: { x: 50, y: 350 },
        end: { x: 50, y: 50 },
        type: "EXTERIOR_BEARING",
        thicknessPx: 6
      }
    ],
    rooms: [
      {
        id: "rm-1",
        name: "Main Laboratory",
        polygon: [
          { x: 50, y: 50 },
          { x: 450, y: 50 },
          { x: 450, y: 350 },
          { x: 50, y: 350 }
        ]
      }
    ],
    defectPins: [
      {
        id: "pin-1",
        location: { x: 120, y: 50 },
        code: "STR-01",
        title: "Vertical shear crack in foundation concrete",
        trade: "STRUCTURAL",
        severity: "CRITICAL"
      },
      {
        id: "pin-2",
        location: { x: 300, y: 200 },
        code: "HVAC-04",
        title: "Condensate drip tray overflow leak",
        trade: "HVAC",
        severity: "MAJOR"
      }
    ],
    dimensions: [
      {
        id: "dim-1",
        start: { x: 50, y: 30 },
        end: { x: 450, y: 30 },
        label: "20.0 FT"
      }
    ]
  };

  it("calculates Euclidean distance correctly", () => {
    const p1: CADPoint = { x: 0, y: 0 };
    const p2: CADPoint = { x: 30, y: 40 };
    expect(calculateDistance(p1, p2)).toBe(50);
  });

  it("computes polygon area via Shoelace formula and scales to physical square footage", () => {
    // 400px wide by 300px tall rectangle = 120,000 px^2
    // at 20 px/ft: 20ft * 15ft = 300 sq ft
    const polygon = [
      { x: 50, y: 50 },
      { x: 450, y: 50 },
      { x: 450, y: 350 },
      { x: 50, y: 350 }
    ];
    const pxArea = calculatePolygonArea(polygon);
    expect(pxArea).toBe(120000);

    const { physicalArea } = computeRoomPhysicalArea(polygon, 20);
    expect(physicalArea).toBe(300);
  });

  it("finds nearby defect pins within proximity tolerance", () => {
    // pin-1 is at (120, 50)
    const nearby = findNearbyDefectPins(sampleModel, { x: 125, y: 52 }, 10);
    expect(nearby.length).toBe(1);
    expect(nearby[0].id).toBe("pin-1");

    // Outside tolerance
    const far = findNearbyDefectPins(sampleModel, { x: 500, y: 500 }, 20);
    expect(far.length).toBe(0);
  });

  it("upserts defect pins into the CAD model immutably", () => {
    const newPin: DefectPin = {
      id: "pin-3",
      location: { x: 200, y: 150 },
      code: "ELE-02",
      title: "Uncovered high voltage junction box",
      trade: "ELECTRICAL",
      severity: "CRITICAL"
    };

    const updated = upsertDefectPin(sampleModel, newPin);
    expect(updated.defectPins.length).toBe(3);
    expect(sampleModel.defectPins.length).toBe(2); // Immutability check

    // Update existing pin
    const modifiedPin: DefectPin = {
      ...newPin,
      severity: "MINOR",
      title: "Junction box cover replaced"
    };
    const reupdated = upsertDefectPin(updated, modifiedPin);
    expect(reupdated.defectPins.length).toBe(3);
    const found = reupdated.defectPins.find(p => p.id === "pin-3");
    expect(found?.severity).toBe("MINOR");
  });

  it("renders valid SVG markup with specified themes and layers", () => {
    const svg = generateFloorplanSvgMarkup(sampleModel, {
      theme: "BLUEPRINT",
      showGrid: true,
      showWalls: true,
      showRooms: true,
      showDimensions: true,
      showDefectPins: true
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain('viewBox="0 0 800 600"');
    expect(svg).toContain("pattern id=\"cad-grid\"");
    expect(svg).toContain("Main Laboratory");
    expect(svg).toContain("300 sq ft");
    expect(svg).toContain("STR");
    expect(svg).toContain("HVAC");
    expect(svg).toContain("</svg>");
  });

  it("respects layer visibility toggles", () => {
    const noPinsSvg = generateFloorplanSvgMarkup(sampleModel, {
      showDefectPins: false,
      showGrid: false
    });

    expect(noPinsSvg).not.toContain("Defect Pins Layer");
    expect(noPinsSvg).not.toContain("pattern id=\"cad-grid\"");
    expect(noPinsSvg).toContain("Walls Layer");
  });
});
