import { describe, it, expect } from "vitest";
import {
  TacticalFieldNdtSensorCadVectorSynchronizer,
  TacticalNdtTelemetrySample,
  CadVectorComponentTarget
} from "./tactical-field-ndt-sensor-cad-vector-synchronizer";

describe("SNAP-130: TacticalFieldNdtSensorCadVectorSynchronizer", () => {
  const components: CadVectorComponentTarget[] = [
    {
      componentId: "cad-pipe-spool-01",
      specCode: "ASME-B31.3",
      boundingVolume: { minX: 0, maxX: 1000, minY: 0, maxY: 500, minZ: 0, maxZ: 500 },
      allowableDefectDepthPct: 20.0
    },
    {
      componentId: "cad-flange-weld-02",
      specCode: "API-570",
      boundingVolume: { minX: 1000, maxX: 1500, minY: 0, maxY: 500, minZ: 0, maxZ: 500 },
      allowableDefectDepthPct: 15.0
    }
  ];

  it("synchronizes PAUT telemetry sample and flags acceptable wall loss", () => {
    const samples: TacticalNdtTelemetrySample[] = [
      {
        sampleId: "sample-paut-001",
        modality: "PAUT",
        wallThicknessNominalMm: 12.7,
        wallThicknessMeasuredMm: 12.0,
        defectLengthMm: 5.0,
        probeCoordinates: { x: 500, y: 250, z: 250 },
        probeAttitudeDeg: { roll: 0, pitch: 0, yaw: 45 },
        signalToNoiseRatioDb: 28.5,
        timestamp: "2026-09-13T18:00:00Z"
      }
    ];

    const markers = TacticalFieldNdtSensorCadVectorSynchronizer.synchronizeTelemetryWithCad(
      samples,
      components
    );

    expect(markers).toHaveLength(1);
    expect(markers[0].componentId).toBe("cad-pipe-spool-01");
    expect(markers[0].defectSeverity).toBe("ACCEPTABLE");
    expect(markers[0].wallLossPct).toBeCloseTo(5.51, 1);
    expect(markers[0].telemetrySignature).toHaveLength(64);
  });

  it("classifies severe through-wall defect as IMMEDIATE_REJECT_REPAIR", () => {
    const samples: TacticalNdtTelemetrySample[] = [
      {
        sampleId: "sample-tofd-002",
        modality: "TOFD",
        wallThicknessNominalMm: 12.7,
        wallThicknessMeasuredMm: 6.0, // > 50% wall loss
        defectLengthMm: 65.0,
        probeCoordinates: { x: 1200, y: 250, z: 250 },
        probeAttitudeDeg: { roll: 0, pitch: 0, yaw: 0 },
        signalToNoiseRatioDb: 32.0,
        timestamp: "2026-09-13T18:01:00Z"
      }
    ];

    const markers = TacticalFieldNdtSensorCadVectorSynchronizer.synchronizeTelemetryWithCad(
      samples,
      components
    );

    expect(markers).toHaveLength(1);
    expect(markers[0].componentId).toBe("cad-flange-weld-02");
    expect(markers[0].defectSeverity).toBe("IMMEDIATE_REJECT_REPAIR");
    expect(markers[0].wallLossPct).toBeGreaterThan(50);
  });

  it("throws validation errors on invalid telemetry or components", () => {
    expect(() =>
      TacticalFieldNdtSensorCadVectorSynchronizer.synchronizeTelemetryWithCad([], components)
    ).toThrow("Telemetry samples array cannot be empty.");

    expect(() =>
      TacticalFieldNdtSensorCadVectorSynchronizer.synchronizeTelemetryWithCad(
        [
          {
            sampleId: "bad",
            modality: "MFL",
            wallThicknessNominalMm: -5,
            wallThicknessMeasuredMm: 5,
            defectLengthMm: 0,
            probeCoordinates: { x: 0, y: 0, z: 0 },
            probeAttitudeDeg: { roll: 0, pitch: 0, yaw: 0 },
            signalToNoiseRatioDb: 10,
            timestamp: "2026-09-13T18:00:00Z"
          }
        ],
        components
      )
    ).toThrow("Nominal wall thickness must be greater than zero.");
  });
});
