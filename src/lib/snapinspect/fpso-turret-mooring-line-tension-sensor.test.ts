import { describe, it, expect } from "vitest";
import {
  FpsoTurretMooringLineTensionSensor,
  MooringLineReading
} from "./fpso-turret-mooring-line-tension-sensor";

describe("FpsoTurretMooringLineTensionSensor", () => {
  it("evaluates healthy deepwater R4 mooring line under nominal pretension", () => {
    const reading: MooringLineReading = {
      lineIdentifier: "FPSO-LINE-04-WEST",
      nominalLinkDiameterMm: 140.0,
      measuredGripDiameterMm: 138.0, // Minimal wear (1.4%)
      baselineTimeOfFlightNs: 12000.0,
      stressedTimeOfFlightNs: 12080.0, // delta = 80 ns -> 68 MPa
      acoustoelasticStressConstantMpaPerNs: 0.85,
      chainGrade: "R4",
      waveSignificantHeightMeters: 2.5
    };

    const evalResult = FpsoTurretMooringLineTensionSensor.evaluateMooringLine(reading);
    expect(evalResult.integrityStatus).toBe("NOMINAL");
    expect(evalResult.safetyFactorApi2sk).toBeGreaterThan(3.0);
    expect(evalResult.nominalDiameterWearPercentage).toBeLessThan(3.0);
    expect(evalResult.structuralIntegrityDigest).toHaveLength(64);
  });

  it("triggers critical snapback hazard on severe wear and over-tension", () => {
    const reading: MooringLineReading = {
      lineIdentifier: "FPSO-LINE-08-STORM",
      nominalLinkDiameterMm: 140.0,
      measuredGripDiameterMm: 122.0, // Severe wear (> 12.8%)
      baselineTimeOfFlightNs: 12000.0,
      stressedTimeOfFlightNs: 12500.0, // delta = 500 ns -> massive storm tension
      acoustoelasticStressConstantMpaPerNs: 0.85,
      chainGrade: "R3",
      waveSignificantHeightMeters: 9.8
    };

    const evalResult = FpsoTurretMooringLineTensionSensor.evaluateMooringLine(reading);
    expect(evalResult.integrityStatus).toBe("CRITICAL_SNAPBACK_HAZARD");
    expect(evalResult.safetyFactorApi2sk).toBeLessThan(1.67);
    expect(evalResult.actionRecommendation).toContain("CRITICAL");
  });

  it("validates input boundary checks", () => {
    expect(() => {
      FpsoTurretMooringLineTensionSensor.evaluateMooringLine({
        lineIdentifier: "",
        nominalLinkDiameterMm: 140,
        measuredGripDiameterMm: 138,
        baselineTimeOfFlightNs: 12000,
        stressedTimeOfFlightNs: 12050,
        acoustoelasticStressConstantMpaPerNs: 0.85,
        chainGrade: "R4",
        waveSignificantHeightMeters: 2.0
      });
    }).toThrow();
  });
});
