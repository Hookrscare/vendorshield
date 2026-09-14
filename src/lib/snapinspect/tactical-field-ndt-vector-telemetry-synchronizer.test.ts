import { describe, it, expect } from "vitest";
import {
  TacticalFieldNdtVectorTelemetrySynchronizer,
  NdtScanPoint
} from "./tactical-field-ndt-vector-telemetry-synchronizer";

describe("SNAP-137: TacticalFieldNdtVectorTelemetrySynchronizer", () => {
  const synchronizer = new TacticalFieldNdtVectorTelemetrySynchronizer([100.0, 200.0, 50.0]);

  it("synchronizes nominal scan point within acceptable tolerance", () => {
    const point: NdtScanPoint = {
      scanPointId: "pt_001",
      timestampMs: 1726260000000,
      pose: {
        xMm: 10.0,
        yMm: 20.0,
        zMm: 5.0,
        normalX: 0,
        normalY: 0,
        normalZ: 1
      },
      amplitudeDb: 25.0,
      timeOfFlightMicrosec: 4.2,
      wallThicknessMm: 12.0,
      nominalThicknessMm: 12.5
    };

    const res = synchronizer.synchronizeScanPoint(point, "cad_pressure_vessel_shell_01");

    expect(res.globalCadCoordinatesMm).toEqual([110.0, 220.0, 55.0]);
    expect(res.wallLossPercentage).toBe(4.0);
    expect(res.asmeSeverity).toBe("ACCEPTABLE");
    expect(res.requiresImmediateCutout).toBe(false);
    expect(res.tamperEvidentDigest).toHaveLength(64);
  });

  it("identifies critical wall loss flaw requiring immediate cutout", () => {
    const point: NdtScanPoint = {
      scanPointId: "pt_defect_02",
      timestampMs: 1726260005000,
      pose: {
        xMm: 50.0,
        yMm: 80.0,
        zMm: 0.0,
        normalX: 0,
        normalY: 1,
        normalZ: 0
      },
      amplitudeDb: 88.0,
      timeOfFlightMicrosec: 1.8,
      wallThicknessMm: 4.5,
      nominalThicknessMm: 12.5 // > 60% loss
    };

    const res = synchronizer.synchronizeScanPoint(point, "cad_elbow_joint_04", "PAUT");

    expect(res.wallLossPercentage).toBe(64.0);
    expect(res.asmeSeverity).toBe("CRITICAL_DEFECT_REJECT");
    expect(res.requiresImmediateCutout).toBe(true);
  });

  it("validates non-physical thickness inputs", () => {
    const invalidPoint: NdtScanPoint = {
      scanPointId: "pt_err",
      timestampMs: 1726260010000,
      pose: { xMm: 0, yMm: 0, zMm: 0, normalX: 0, normalY: 0, normalZ: 1 },
      amplitudeDb: 10.0,
      timeOfFlightMicrosec: 1.0,
      wallThicknessMm: -5.0,
      nominalThicknessMm: 10.0
    };

    expect(() => {
      synchronizer.synchronizeScanPoint(invalidPoint, "cad_surface_err");
    }).toThrow("Measured wall thickness cannot be negative");
  });
});
