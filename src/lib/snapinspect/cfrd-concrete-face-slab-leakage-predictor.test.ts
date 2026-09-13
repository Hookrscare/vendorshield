import { describe, it, expect } from "vitest";
import {
  CfrdConcreteFaceSlabLeakagePredictor,
  DamHydraulicConditions,
  TriaxialJointDisplacement,
  CfrdSafetyAssessment
} from "./cfrd-concrete-face-slab-leakage-predictor";

describe("SNAP-70: Geotechnical CFRD Concrete Face Slab Extensometer Leakage Predictor", () => {
  it("evaluates healthy dam within elastic joint tolerances", () => {
    const conditions: DamHydraulicConditions = {
      damIdentifier: "CFRD-DAM-ALPHA",
      damHeightMeters: 185.0,
      currentReservoirHeadMeters: 172.0,
      weirSeepageFlowLps: 8.5,
      seepageTurbidityNtu: 0.8,
      waterstopType: "COPPER_EPDM_DUAL"
    };

    const joints: TriaxialJointDisplacement[] = [
      {
        sensorId: "EXT-PLINTH-01",
        jointLocation: "PERIMETER_PLINTH_JOINT",
        openingDxMm: 5.2,
        shearDyMm: 2.1,
        settlementDzMm: 3.0
      },
      {
        sensorId: "EXT-VERT-12",
        jointLocation: "VERTICAL_SLAB_JOINT",
        openingDxMm: 3.4,
        shearDyMm: 1.0,
        settlementDzMm: 1.8
      }
    ];

    const res: CfrdSafetyAssessment = CfrdConcreteFaceSlabLeakagePredictor.evaluateDamHealth(conditions, joints);
    expect(res.maxJointOpeningMm).toBe(5.2);
    expect(res.pipingErosionRisk).toBe("NEGLIGIBLE");
    expect(res.icoldSafetyStatus).toBe("NORMAL");
    expect(res.jointIntegrityScore).toBeGreaterThanOrEqual(85.0);
    expect(res.predicted30DaySeepageLps).toBe(8.5);
    expect(res.auditHash).toHaveLength(64);
    expect(res.mitigationDirectives[0]).toContain("NOMINAL");
  });

  it("triggers emergency drawdown on severe joint rupture and piping turbidity", () => {
    const conditions: DamHydraulicConditions = {
      damIdentifier: "CFRD-DAM-BETA",
      damHeightMeters: 210.0,
      currentReservoirHeadMeters: 202.0,
      weirSeepageFlowLps: 78.0,
      seepageTurbidityNtu: 18.5, // Severe piping washout
      waterstopType: "COPPER_EPDM_DUAL"
    };

    const joints: TriaxialJointDisplacement[] = [
      {
        sensorId: "EXT-PLINTH-09",
        jointLocation: "PERIMETER_PLINTH_JOINT",
        openingDxMm: 42.5, // Exceeds critical 40mm threshold
        shearDyMm: 18.0,
        settlementDzMm: 22.0
      }
    ];

    const res = CfrdConcreteFaceSlabLeakagePredictor.evaluateDamHealth(conditions, joints);
    expect(res.pipingErosionRisk).toBe("CRITICAL_FOUNDATION_WASH");
    expect(res.icoldSafetyStatus).toBe("EMERGENCY_DRAWDOWN");
    expect(res.jointIntegrityScore).toBeLessThan(30.0);
    expect(res.predicted30DaySeepageLps).toBeGreaterThan(conditions.weirSeepageFlowLps);
    expect(res.mitigationDirectives[0]).toContain("EMERGENCY");
  });
});
