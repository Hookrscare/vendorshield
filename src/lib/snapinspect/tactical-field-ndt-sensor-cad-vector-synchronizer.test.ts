import { describe, it, expect } from "vitest";
import {
  TacticalFieldNdtSensorCadVectorSynchronizer,
  TacticalNdtTelemetrySample,
  CadVectorComponentTarget
} from "./tactical-field-ndt-sensor-cad-vector-synchronizer";

describe("SNAP-130: TacticalFieldNdtSensorCadVectorSynchronizer", () => {
  const mockComponents: CadVectorComponentTarget[] = [
    {
      componentId: "pipe_spool_101",
      specCode: "ASTM_A106_GRADE_B",
      boundingVolume: {
        minX: 0,
        maxX: 1000,
        minY: 0,
        maxY: 500,
        minZ: 0,
        maxZ: 500
      },
      allowableDefectDepthPct: 20.0
    }
  ];

  it("synchronizes acceptable PAUT probe telemetry with 3D CAD coordinate space", () => {
    const samples: TacticalNdtTelemetrySample[] = [
      {
        sampleId: "sample_paut_01",
        modality: "PAUT",
        wallThicknessNominalMm: 12.5,
        wallThicknessMeasuredMm: 12.0, // 4% loss
        defectLengthMm: 5.0,
        probeCoordinates: { x: 150, y: 100, z: 50 },
        probeAttitudeDeg: { roll: 0, pitch: 0, yaw: 45 },
        signalToNoiseRatioDb: 28.5,
        timestamp: new Date().toISOString()
      }
    ];

    const markers = TacticalFieldNdtSensorCadVectorSynchronizer.synchronizeTelemetryWithCad(
      samples,
      mockComponents
    );

    expect(markers).toHaveLength(1);
    expect(markers[0].componentId).toBe("pipe_spool_101");
    expect(markers[0].modality).toBe("PAUT");
    expect(markers[0].wallLossPct).toBe(4.0);
    expect(markers[0].defectSeverity).toBe("ACCEPTABLE");
    expect(markers[0].cadAnchorCoordinate).toEqual({ x: 150, y: 100, z: 50 });
    expect(markers[0].telemetrySignature).toHaveLength(64);
  });

  it("flags severe wall thinning as IMMEDIATE_REJECT_REPAIR according to API 579-1 criteria", () => {
    const samples: TacticalNdtTelemetrySample[] = [
      {
        sampleId: "sample_tofd_critical",
        modality: "TOFD",
        wallThicknessNominalMm: 10.0,
        wallThicknessMeasuredMm: 6.0, // 40% loss > 20% * 1.5
        defectLengthMm: 65.0,
        probeCoordinates: { x: 200, y: 150, z: 80 },
        probeAttitudeDeg: { roll: 5, pitch: 0, yaw: 90 },
        signalToNoiseRatioDb: 22.0,
        timestamp: new Date().toISOString()
      }
    ];

    const markers = TacticalFieldNdtSensorCadVectorSynchronizer.synchronizeTelemetryWithCad(
      samples,
      mockComponents
    );

    expect(markers).toHaveLength(1);
    expect(markers[0].defectSeverity).toBe("IMMEDIATE_REJECT_REPAIR");
    expect(markers[0].wallLossPct).toBe(40.0);
  });

  it("rejects non-positive nominal wall thickness", () => {
    const invalidSample: TacticalNdtTelemetrySample[] = [
      {
        sampleId: "sample_bad",
        modality: "MFL",
        wallThicknessNominalMm: 0,
        wallThicknessMeasuredMm: 0,
        defectLengthMm: 10.0,
        probeCoordinates: { x: 0, y: 0, z: 0 },
        probeAttitudeDeg: { roll: 0, pitch: 0, yaw: 0 },
        signalToNoiseRatioDb: 10.0,
        timestamp: new Date().toISOString()
      }
    ];

    expect(() => {
      TacticalFieldNdtSensorCadVectorSynchronizer.synchronizeTelemetryWithCad(
        invalidSample,
        mockComponents
      );
    }).toThrow("Nominal wall thickness must be greater than zero.");
  });
});
