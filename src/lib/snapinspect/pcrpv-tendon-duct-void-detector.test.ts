import { describe, it, expect } from "vitest";
import {
  PcrpvTendonDuctVoidDetector,
  PcrpvInspectionPoint
} from "./pcrpv-tendon-duct-void-detector";

describe("SNAP-62: PCRPV Tendon Duct Grouting Void Detector", () => {
  const healthyPoint: PcrpvInspectionPoint = {
    pointId: "PT-HEALTHY-01",
    ductId: "DUCT-HOOP-L3-04",
    ductType: "CIRCUMFERENTIAL_HOOP",
    chainageMeters: 12.5,
    nominalCoverDepthMm: 160.0,
    nominalVesselWallThicknessMeters: 2.8,
    measuredDominantFrequencyHz: 685.0, // Matches full vessel thickness resonance
    measuredSecondaryPeakHz: 1350.0,
    echoAmplitudePercentFsh: 35.0,
    phaseInversionDetected: false,
    pWaveVelocityMPerSec: 4000.0
  };

  const voidPointCritical: PcrpvInspectionPoint = {
    pointId: "PT-VOID-CRIT-02",
    ductId: "DUCT-HOOP-L3-04",
    ductType: "CIRCUMFERENTIAL_HOOP",
    chainageMeters: 14.0,
    nominalCoverDepthMm: 160.0,
    nominalVesselWallThicknessMeters: 2.8,
    measuredDominantFrequencyHz: 12000.0, // Matches ~160mm cover resonance: 0.96*4000/(2*0.16) = 12000 Hz
    measuredSecondaryPeakHz: 24000.0,
    echoAmplitudePercentFsh: 110.0,
    phaseInversionDetected: true,
    pWaveVelocityMPerSec: 4000.0
  };

  const voidPointPartial: PcrpvInspectionPoint = {
    pointId: "PT-VOID-PART-03",
    ductId: "DUCT-HOOP-L3-04",
    ductType: "CIRCUMFERENTIAL_HOOP",
    chainageMeters: 15.5,
    nominalCoverDepthMm: 160.0,
    nominalVesselWallThicknessMeters: 2.8,
    measuredDominantFrequencyHz: 11500.0,
    measuredSecondaryPeakHz: 23000.0,
    echoAmplitudePercentFsh: 80.0,
    phaseInversionDetected: true,
    pWaveVelocityMPerSec: 4000.0
  };

  it("classifies solid fully grouted tendon duct as conformant", () => {
    const evalRes = PcrpvTendonDuctVoidDetector.evaluatePoint(healthyPoint);
    expect(evalRes.isVoidDetected).toBe(false);
    expect(evalRes.conditionTier).toBe("CONFORMANT_FULLY_GROUTED");
    expect(evalRes.asmeSectionXiStatus).toBe("ACCEPTABLE");
    expect(evalRes.estimatedGroutFillRatioPercent).toBeGreaterThanOrEqual(95.0);
  });

  it("detects severe acoustic impedance reflection void as critical repair mandatory", () => {
    const evalRes = PcrpvTendonDuctVoidDetector.evaluatePoint(voidPointCritical);
    expect(evalRes.isVoidDetected).toBe(true);
    expect(evalRes.conditionTier).toBe("CRITICAL_VOID_RE_GROUT_REQUIRED");
    expect(evalRes.asmeSectionXiStatus).toBe("IMMEDIATE_REPAIR_MANDATORY");
    expect(evalRes.estimatedVoidDepthMm).toBe(160);
  });

  it("analyzes multi-point batch scan and flags reactor containment status", () => {
    const summary = PcrpvTendonDuctVoidDetector.analyzeBatch("REACTOR-CONTAINMENT-UNIT-2", [
      healthyPoint,
      voidPointCritical,
      voidPointPartial
    ]);

    expect(summary.totalPointsScanned).toBe(3);
    expect(summary.voidPointsCount).toBe(2);
    expect(summary.criticalPointsCount).toBe(1);
    expect(summary.overallCompliance).toBe("REMEDIATION_REQUIRED");
    expect(summary.nuclearInspectionTokenSha256).toHaveLength(64);
  });

  it("throws validation error for non-positive dimensions", () => {
    expect(() => {
      PcrpvTendonDuctVoidDetector.evaluatePoint({
        ...healthyPoint,
        nominalCoverDepthMm: -10
      });
    }).toThrow("Duct cover depth and vessel wall thickness must be positive.");
  });
});
