import { describe, it, expect } from "vitest";
import { LngMembraneLaserShearographyAnalyzer, ShearographyPointData } from "./lng-membrane-laser-shearography-analyzer";

describe("LngMembraneLaserShearographyAnalyzer (SNAP-68)", () => {
  it("certifies integrity when shearography phase gradient is uniform and low", () => {
    const points: ShearographyPointData[] = [
      { xMm: 0, yMm: 0, phaseDerivativeRadPerMm: 0.15, carrierInterferogramContrast: 0.85 },
      { xMm: 5, yMm: 0, phaseDerivativeRadPerMm: 0.22, carrierInterferogramContrast: 0.88 },
      { xMm: 0, yMm: 5, phaseDerivativeRadPerMm: 0.18, carrierInterferogramContrast: 0.82 },
      { xMm: 5, yMm: 5, phaseDerivativeRadPerMm: 0.12, carrierInterferogramContrast: 0.90 }
    ];

    const res = LngMembraneLaserShearographyAnalyzer.analyzeShearographyData("ZONE-NO96-TANK-4B", 0.7, points);

    expect(res.severityClassification).toBe("INTEGRITY_VERIFIED");
    expect(res.delaminationVoidAreaMm2).toBe(0);
    expect(res.structuralSafetyFactor).toBeGreaterThan(3.0);
    expect(res.inspectionCertificateHash).toHaveLength(64);
  });

  it("detects critical membrane delamination voiding when displacement gradient spikes", () => {
    const points: ShearographyPointData[] = [];
    // Generate 15 points with large gradient (15 * 25 mm^2 = 375 mm^2 void area)
    for (let i = 0; i < 15; i++) {
      points.push({
        xMm: i * 5,
        yMm: 0,
        phaseDerivativeRadPerMm: 2.85,
        carrierInterferogramContrast: 0.75
      });
    }

    const res = LngMembraneLaserShearographyAnalyzer.analyzeShearographyData("ZONE-NO96-CRYO-RING", 0.7, points);

    expect(res.severityClassification).toBe("CRITICAL_MEMBRANE_DELAMINATION");
    expect(res.delaminationVoidAreaMm2).toBeGreaterThanOrEqual(250);
    expect(res.structuralSafetyFactor).toBeLessThan(1.0);
  });

  it("validates input boundary requirements", () => {
    expect(() => {
      LngMembraneLaserShearographyAnalyzer.analyzeShearographyData("", 0.7, []);
    }).toThrow("Tank Zone ID and points array must not be empty.");

    expect(() => {
      LngMembraneLaserShearographyAnalyzer.analyzeShearographyData("ZONE-1", -0.5, [
        { xMm: 0, yMm: 0, phaseDerivativeRadPerMm: 0.1, carrierInterferogramContrast: 0.8 }
      ]);
    }).toThrow("Nominal membrane thickness must be positive.");
  });
});
