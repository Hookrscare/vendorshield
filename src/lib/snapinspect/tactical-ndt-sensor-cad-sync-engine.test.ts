import { describe, it, expect } from "vitest";
import {
  TacticalNdtSensorCadSyncEngine,
  NdtSensorReading,
  CadStructuralElement
} from "./tactical-ndt-sensor-cad-sync-engine";

describe("TacticalNdtSensorCadSyncEngine (SNAP-109)", () => {
  const elements: CadStructuralElement[] = [
    {
      elementId: "BEAM-W24X68-L2",
      layer: "STRUCTURAL_STEEL",
      boundingBox: { minX: 1000, maxX: 5000, minY: 2000, maxY: 2500 }
    }
  ];

  it("identifies critical metal loss and snaps reading to CAD structural beam", () => {
    const reading: NdtSensorReading = {
      sensorId: "NDT-UTG-09",
      sensorType: "ULTRASONIC_THICKNESS",
      nominalValueMm: 12.0,
      measuredValueMm: 8.0, // 33.3% metal loss
      spatialCoord: { x: 1500, y: 2100, z: 3200 },
      timestampMs: Date.now()
    };

    const res = TacticalNdtSensorCadSyncEngine.syncReadingWithCad(reading, elements);

    expect(res.matchedElementId).toBe("BEAM-W24X68-L2");
    expect(res.criticalityLevel).toBe("CRITICAL_STRUCTURAL_DEFECT");
    expect(res.corrosionLossPct).toBeCloseTo(33.33, 1);
    expect(res.cadSnappedCoord.x).toBe(1500);
    expect(res.syncDigest).toHaveLength(64);
  });

  it("handles normal reading outside element bounds", () => {
    const reading: NdtSensorReading = {
      sensorId: "NDT-UTG-10",
      sensorType: "ULTRASONIC_THICKNESS",
      nominalValueMm: 10.0,
      measuredValueMm: 9.8, // 2% loss
      spatialCoord: { x: 9999, y: 9999, z: 0 },
      timestampMs: Date.now()
    };

    const res = TacticalNdtSensorCadSyncEngine.syncReadingWithCad(reading, elements);

    expect(res.matchedElementId).toBeNull();
    expect(res.criticalityLevel).toBe("NORMAL");
    expect(res.corrosionLossPct).toBe(2.0);
  });

  it("validates input sanity", () => {
    expect(() => {
      TacticalNdtSensorCadSyncEngine.syncReadingWithCad(
        {
          sensorId: "",
          sensorType: "ULTRASONIC_THICKNESS",
          nominalValueMm: -1,
          measuredValueMm: 0,
          spatialCoord: { x: 0, y: 0, z: 0 },
          timestampMs: 0
        },
        []
      );
    }).toThrow("Invalid NDT reading: sensorId and positive nominalValue required.");
  });
});
