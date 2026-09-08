import { describe, it, expect } from "vitest";
import {
  RoofPitchUpliftCalculator,
  RoofPitchInput,
  WindUpliftParameters
} from "./roof-pitch-uplift";

describe("SNAP-20: RoofPitchUpliftCalculator", () => {
  it("computes pitch ratio and angle degrees correctly", () => {
    const pitch4: RoofPitchInput = { riseInches: 4, runInches: 12 };
    const res4 = RoofPitchUpliftCalculator.calculateSlope(pitch4);
    expect(res4.pitchRatio).toBe("4:12");
    expect(res4.slopeDegrees).toBeCloseTo(18.43, 1);

    const pitch12: RoofPitchInput = { riseInches: 12, runInches: 12 };
    const res12 = RoofPitchUpliftCalculator.calculateSlope(pitch12);
    expect(res12.pitchRatio).toBe("12:12");
    expect(res12.slopeDegrees).toBe(45);
  });

  it("calculates ASCE 7 velocity pressure scaling with wind speed", () => {
    const params110: WindUpliftParameters = {
      basicWindSpeedMph: 110,
      exposureCategory: "C",
      meanRoofHeightFeet: 20
    };
    const qz110 = RoofPitchUpliftCalculator.calculateVelocityPressure(params110);
    expect(qz110).toBeGreaterThan(20);
    expect(qz110).toBeLessThan(35);

    const params140: WindUpliftParameters = {
      basicWindSpeedMph: 140,
      exposureCategory: "C",
      meanRoofHeightFeet: 20
    };
    const qz140 = RoofPitchUpliftCalculator.calculateVelocityPressure(params140);
    expect(qz140).toBeGreaterThan(qz110);
  });

  it("evaluates compliant shingle and nail schedule under moderate wind", () => {
    const pitch: RoofPitchInput = { riseInches: 6, runInches: 12 };
    const wind: WindUpliftParameters = {
      basicWindSpeedMph: 90,
      exposureCategory: "B",
      meanRoofHeightFeet: 15
    };
    const assessment = RoofPitchUpliftCalculator.evaluateRoofUplift(
      pitch,
      wind,
      "ASTM_D7158_CLASS_H",
      "STANDARD_4_NAIL"
    );

    expect(assessment.isCompliant).toBe(true);
    expect(assessment.safetyFactor).toBeGreaterThanOrEqual(1.0);
    expect(assessment.zonePressures.length).toBe(3);
    // Zone 3 corner uplift pressure must be highest
    const cornerPressure = assessment.zonePressures.find(z => z.zone === "ZONE_3_CORNER")!;
    const fieldPressure = assessment.zonePressures.find(z => z.zone === "ZONE_1_FIELD")!;
    expect(cornerPressure.designUpliftPoundPerSquareFoot).toBeGreaterThan(fieldPressure.designUpliftPoundPerSquareFoot);
  });

  it("identifies non-compliant assembly in high-wind hurricane zone and recommends 6-nail upgrade", () => {
    const pitch: RoofPitchInput = { riseInches: 5, runInches: 12 };
    const coastalWind: WindUpliftParameters = {
      basicWindSpeedMph: 140,
      exposureCategory: "D",
      meanRoofHeightFeet: 25
    };
    const assessment = RoofPitchUpliftCalculator.evaluateRoofUplift(
      pitch,
      coastalWind,
      "ASTM_D3161_CLASS_A", // 60 mph rating
      "STANDARD_4_NAIL"
    );

    expect(assessment.isCompliant).toBe(false);
    expect(assessment.safetyFactor).toBeLessThan(1.0);
    expect(assessment.recommendedFastenerSchedule).toBe("ENHANCED_STARTER_STRIP_6_NAIL");
  });
});
