import { describe, it, expect } from "vitest";
import {
  DeepwaterMooringChainWearScanner,
  MooringChainScanData
} from "./deepwater-mooring-chain-wear-scanner";

describe("DeepwaterMooringChainWearScanner (SNAP-81)", () => {
  it("detects critical wear and orders immediate replacement when diameter drops > 10%", () => {
    const scan: MooringChainScanData = {
      chainLineId: "FPSO-TURRET-LINE-3",
      linkIndex: 442,
      chainSteelGrade: "R4",
      nominalBarDiameterMm: 150.0,
      measuredMinDiameterMm: 132.0, // 18 mm wear = 12.0% wear
      nominalMblKilonewtons: 18500.0,
      inspectionDepthMeters: 450.0
    };

    const res = DeepwaterMooringChainWearScanner.evaluateLinkWear(scan, 10.0);

    expect(res.diameterReductionPct).toBe(12.0);
    expect(res.requiresImmediateReplacement).toBe(true);
    expect(res.linkStructuralIntegrity).toBe("CRITICAL_FATIGUE_REPLACEMENT_ORDER");
    expect(res.residualMblKilonewtons).toBeLessThan(18500.0);
    expect(res.verificationDigest).toHaveLength(64);
  });

  it("approves fit-for-purpose link within allowable wear threshold", () => {
    const scan: MooringChainScanData = {
      chainLineId: "WIND-FLOAT-LINE-1",
      linkIndex: 85,
      chainSteelGrade: "R5",
      nominalBarDiameterMm: 120.0,
      measuredMinDiameterMm: 118.0, // ~1.67% wear
      nominalMblKilonewtons: 14000.0,
      inspectionDepthMeters: 180.0
    };

    const res = DeepwaterMooringChainWearScanner.evaluateLinkWear(scan, 10.0);

    expect(res.diameterReductionPct).toBe(1.67);
    expect(res.requiresImmediateReplacement).toBe(false);
    expect(res.linkStructuralIntegrity).toBe("FIT_FOR_PURPOSE");
  });

  it("validates input sanity", () => {
    expect(() => {
      DeepwaterMooringChainWearScanner.evaluateLinkWear({
        chainLineId: "",
        linkIndex: 0,
        chainSteelGrade: "R3",
        nominalBarDiameterMm: -10,
        measuredMinDiameterMm: 0,
        nominalMblKilonewtons: 0,
        inspectionDepthMeters: 0
      });
    }).toThrow("Invalid scan: chainLineId and positive diameters are required.");
  });
});
