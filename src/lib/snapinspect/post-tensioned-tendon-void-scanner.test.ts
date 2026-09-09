import { describe, it, expect } from "vitest";
import {
  PostTensionedTendonVoidScanner,
  DuctScanPoint
} from "./post-tensioned-tendon-void-scanner";

describe("SNAP-43: PostTensionedTendonVoidScanner Suite", () => {
  it("verifies completely grouted sound tendon duct", () => {
    // 10 meters of sound grout (epsilon_r ~ 8.0)
    const scanPoints: DuctScanPoint[] = [];
    for (let x = 0; x <= 10; x += 0.5) {
      scanPoints.push({
        positionMeters: x,
        relativePermittivity: 8.2,
        reflectionAmplitudeMv: 12.0,
        echoFrequencyKhz: 22.5
      });
    }

    const res = PostTensionedTendonVoidScanner.analyzeDuct("DUCT-EAST-01", scanPoints);
    expect(res.overallCondition).toBe("SATISFACTORY");
    expect(res.voidPercentage).toBe(0);
    expect(res.voidSegments).toHaveLength(0);
    expect(res.totalVoidLengthMeters).toBe(0);
  });

  it("detects localized air void in tendon duct", () => {
    const scanPoints: DuctScanPoint[] = [
      { positionMeters: 0.0, relativePermittivity: 8.0, reflectionAmplitudeMv: 10, echoFrequencyKhz: 22 },
      { positionMeters: 1.0, relativePermittivity: 8.0, reflectionAmplitudeMv: 12, echoFrequencyKhz: 22 },
      // Air void between 2.0 and 2.6m
      { positionMeters: 2.0, relativePermittivity: 1.2, reflectionAmplitudeMv: -95, echoFrequencyKhz: 45 },
      { positionMeters: 2.3, relativePermittivity: 1.1, reflectionAmplitudeMv: -105, echoFrequencyKhz: 46 },
      { positionMeters: 2.6, relativePermittivity: 1.3, reflectionAmplitudeMv: -90, echoFrequencyKhz: 44 },
      { positionMeters: 3.0, relativePermittivity: 7.9, reflectionAmplitudeMv: 11, echoFrequencyKhz: 22 },
      { positionMeters: 5.0, relativePermittivity: 8.1, reflectionAmplitudeMv: 10, echoFrequencyKhz: 22 }
    ];

    const res = PostTensionedTendonVoidScanner.analyzeDuct("DUCT-MID-04", scanPoints);
    expect(res.overallCondition).toBe("MODERATE_DEFECT");
    expect(res.voidSegments).toHaveLength(1);
    expect(res.voidSegments[0].voidType).toBe("AIR_VOID");
    expect(res.voidSegments[0].severityClass).toBe("CLASS_2_MODERATE");
  });

  it("flags critical collapse risk on water-filled void", () => {
    const scanPoints: DuctScanPoint[] = [
      { positionMeters: 0.0, relativePermittivity: 8.0, reflectionAmplitudeMv: 10, echoFrequencyKhz: 22 },
      // Water-filled void at low point of tendon drape (epsilon_r ~ 80)
      { positionMeters: 1.0, relativePermittivity: 78.0, reflectionAmplitudeMv: 300, echoFrequencyKhz: 12 },
      { positionMeters: 1.5, relativePermittivity: 81.0, reflectionAmplitudeMv: 320, echoFrequencyKhz: 11 },
      { positionMeters: 2.0, relativePermittivity: 79.0, reflectionAmplitudeMv: 310, echoFrequencyKhz: 12 },
      { positionMeters: 3.0, relativePermittivity: 8.0, reflectionAmplitudeMv: 12, echoFrequencyKhz: 22 }
    ];

    const res = PostTensionedTendonVoidScanner.analyzeDuct("DUCT-LOW-SPAN-09", scanPoints);
    expect(res.overallCondition).toBe("CRITICAL_COLLAPSE_RISK");
    expect(res.voidSegments[0].voidType).toBe("WATER_FILLED_VOID");
    expect(res.recommendedAction).toContain("IMMEDIATE REMEDIATION");
  });
});
