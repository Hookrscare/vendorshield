import { describe, it, expect } from "vitest";
import {
  DeepwaterMooringChainLaserScanner,
  MooringChainLinkProfile,
  LaserScanPoint
} from "./deepwater-mooring-chain-laser-scanner";

describe("DeepwaterMooringChainLaserScanner (SNAP-81)", () => {
  const healthyProfile: MooringChainLinkProfile = {
    linkId: "MOOR-LINK-042",
    nominalBarDiameterMm: 140.0,
    nominalPitchMm: 840.0, // 6 * d
    chainGrade: "R5",
    nominalMblKiloNewtons: 18500
  };

  it("should evaluate an unworn healthy chain link", () => {
    const scanPoints: LaserScanPoint[] = [
      { angleDegrees: 0, measuredRadiusMm: 69.8, axialPositionMm: 10, reflectivity: 0.95 },
      { angleDegrees: 90, measuredRadiusMm: 70.0, axialPositionMm: 10, reflectivity: 0.94 },
      { angleDegrees: 180, measuredRadiusMm: 69.9, axialPositionMm: 10, reflectivity: 0.96 },
      { angleDegrees: 270, measuredRadiusMm: 70.1, axialPositionMm: 10, reflectivity: 0.95 }
    ];

    const res = DeepwaterMooringChainLaserScanner.analyzeLinkScan(healthyProfile, scanPoints, 840.5);

    expect(res.complianceStatus).toBe("CHAIN_HEALTHY_IN_SPEC");
    expect(res.diameterWearPercentage).toBeLessThan(1.0);
    expect(res.requiresImmediateEmergencyRetensionOrSwap).toBe(false);
    expect(res.tamperEvidentDigest).toHaveLength(64);
  });

  it("should detect critical tensile failure risk under severe grip wear and elongation", () => {
    // 140mm nominal (70mm radius). Severe wear down to 55mm radius (110mm diameter = 21.4% wear)
    const wornPoints: LaserScanPoint[] = [
      { angleDegrees: 0, measuredRadiusMm: 55.0, axialPositionMm: 15, reflectivity: 0.8 },
      { angleDegrees: 90, measuredRadiusMm: 68.0, axialPositionMm: 15, reflectivity: 0.9 },
      { angleDegrees: 180, measuredRadiusMm: 56.0, axialPositionMm: 15, reflectivity: 0.82 },
      { angleDegrees: 270, measuredRadiusMm: 67.5, axialPositionMm: 15, reflectivity: 0.89 }
    ];

    const res = DeepwaterMooringChainLaserScanner.analyzeLinkScan(
      healthyProfile,
      wornPoints,
      870.0 // 840 -> 870 = 3.57% elongation (> 3%)
    );

    expect(res.complianceStatus).toBe("CRITICAL_TENSILE_FAILURE_RISK_REPLACE_IMMEDIATELY");
    expect(res.requiresImmediateEmergencyRetensionOrSwap).toBe(true);
    expect(res.diameterWearPercentage).toBeGreaterThan(15.0);
    expect(res.pitchElongationPercentage).toBeGreaterThan(3.0);
  });

  it("should reject invalid profiles or insufficient scan points", () => {
    expect(() => {
      DeepwaterMooringChainLaserScanner.analyzeLinkScan(
        { ...healthyProfile, nominalBarDiameterMm: -10 },
        [],
        840
      );
    }).toThrow();

    expect(() => {
      DeepwaterMooringChainLaserScanner.analyzeLinkScan(
        healthyProfile,
        [{ angleDegrees: 0, measuredRadiusMm: 70, axialPositionMm: 0, reflectivity: 1 }],
        840
      );
    }).toThrow();
  });
});
