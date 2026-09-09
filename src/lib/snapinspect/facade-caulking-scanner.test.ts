import { describe, it, expect } from "vitest";
import { FacadeCaulkingScanner, FacadeJointSegment } from "./facade-caulking-scanner";

describe("SNAP-32: FacadeCaulkingScanner Vitest Suite", () => {
  it("evaluates healthy facade joints with low water ingress risk", () => {
    const segments: FacadeJointSegment[] = [
      {
        jointId: "joint_fl4_w01",
        floorLevel: 4,
        facadeOrientation: "NORTH",
        lengthLinearFeet: 50,
        detectedFailureMode: "NOMINAL_HEALTHY",
        crackWidthMm: 0.0,
        adhesionLossPercent: 0,
        uvExposureYears: 2
      },
      {
        jointId: "joint_fl4_w02",
        floorLevel: 4,
        facadeOrientation: "NORTH",
        lengthLinearFeet: 50,
        detectedFailureMode: "UV_CRAZING",
        crackWidthMm: 0.5,
        adhesionLossPercent: 0,
        uvExposureYears: 2
      }
    ];

    const report = FacadeCaulkingScanner.scanJointSegments(segments);
    expect(report.totalLinearFeetScanned).toBe(100);
    expect(report.waterIngressRiskLevel).toBe("LOW");
    expect(report.deteriorationIndex).toBeLessThan(20);
  });

  it("detects critical water ingress risk when cohesive and adhesive failures dominate", () => {
    const segments: FacadeJointSegment[] = [
      {
        jointId: "joint_fl10_s01",
        floorLevel: 10,
        facadeOrientation: "SOUTH",
        lengthLinearFeet: 80,
        detectedFailureMode: "COHESIVE_TEAR",
        crackWidthMm: 4.5,
        adhesionLossPercent: 90,
        uvExposureYears: 12
      },
      {
        jointId: "joint_fl10_s02",
        floorLevel: 10,
        facadeOrientation: "SOUTH",
        lengthLinearFeet: 40,
        detectedFailureMode: "ADHESIVE_DETACHMENT",
        crackWidthMm: 3.0,
        adhesionLossPercent: 100,
        uvExposureYears: 12
      }
    ];

    const report = FacadeCaulkingScanner.scanJointSegments(segments);
    expect(report.totalLinearFeetScanned).toBe(120);
    expect(report.totalDefectiveFeet).toBe(120);
    expect(report.waterIngressRiskLevel).toBe("CRITICAL_LEAK_RISK");
    expect(report.deteriorationIndex).toBeGreaterThanOrEqual(90);
  });

  it("throws error if empty segments provided", () => {
    expect(() => FacadeCaulkingScanner.scanJointSegments([])).toThrow();
  });
});
