import { describe, it, expect } from "vitest";
import {
  TbmCutterheadVoidRadarClassifier,
  TbmExcavationTelemetry
} from "./tbm-cutterhead-void-radar-classifier";

describe("TbmCutterheadVoidRadarClassifier (SNAP-86)", () => {
  const nominalTelemetry: TbmExcavationTelemetry = {
    tunnelChainageMeters: 1420.5,
    cutterheadRpm: 2.8,
    thrustForceKiloNewtons: 18500,
    triaxialVibrationRmsG: 1.2,
    vibrationCrestFactor: 2.4,
    lookAheadGprDielectricConstant: 5.8, // Dry sound granite
    faceRadarReflectionAttenuationDb: 8.5
  };

  it("classifies nominal excavation through homogeneous rock mass", () => {
    const res = TbmCutterheadVoidRadarClassifier.classifyFace(nominalTelemetry);
    expect(res.geotechnicalFaceCondition).toBe("HOMOGENEOUS_MASS");
    expect(res.cutterDiscWearRisk).toBe("LOW");
    expect(res.operatorActionCode).toBe("PROCEED_STANDARD");
    expect(res.recommendedThrustReductionPercent).toBe(0);
    expect(res.verificationDigest).toHaveLength(64);
  });

  it("detects unconsolidated geological void requiring emergency grouting", () => {
    const res = TbmCutterheadVoidRadarClassifier.classifyFace({
      ...nominalTelemetry,
      lookAheadGprDielectricConstant: 1.1 // Air void
    });
    expect(res.geotechnicalFaceCondition).toBe("UNCONSOLIDATED_GEOTECHNICAL_VOID");
    expect(res.operatorActionCode).toBe("EMERGENCY_GROUTING_INTERVENTION");
    expect(res.recommendedThrustReductionPercent).toBe(60);
  });

  it("identifies boulder impact hazard and severe cutter wear risk", () => {
    const res = TbmCutterheadVoidRadarClassifier.classifyFace({
      ...nominalTelemetry,
      triaxialVibrationRmsG: 5.2,
      vibrationCrestFactor: 7.1
    });
    expect(res.geotechnicalFaceCondition).toBe("BOULDER_IMPACT_RISK");
    expect(res.cutterDiscWearRisk).toBe("SEVERE");
    expect(res.operatorActionCode).toBe("REDUCE_ADVANCE_RATE");
  });
});
