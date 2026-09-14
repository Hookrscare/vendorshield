import { describe, it, expect } from "vitest";
import {
  SubseaFlowlineVivModalShapeStrakesAnalyzer,
  FlowlineParameters,
  OceanCurrentTelemetry
} from "./subsea-flowline-viv-modal-shape-strakes-analyzer";

describe("SNAP-88: SubseaFlowlineVivModalShapeStrakesAnalyzer", () => {
  const mockFlowline: FlowlineParameters = {
    flowlineId: "FLOWLINE-GOM-DEEP-402",
    outerDiameterMeters: 0.355, // 14 inch OD
    wallThicknessMeters: 0.025,
    spanLengthMeters: 38.0,
    steelElasticModulusGpa: 207.0,
    steelYieldStressMpa: 450.0,
    hasHelicalStrakes: true,
    strakesFoulingPercent: 10.0
  };

  const mockCurrent: OceanCurrentTelemetry = {
    currentVelocityMps: 0.95,
    seawaterDensityKgM3: 1025.0,
    kinematicViscosityM2s: 1.4e-6
  };

  it("calculates fundamental beam natural frequency accurately", () => {
    const fn = SubseaFlowlineVivModalShapeStrakesAnalyzer.computeFundamentalNaturalFrequency(mockFlowline);
    expect(fn).toBeGreaterThan(0.2);
    expect(fn).toBeLessThan(3.0);
  });

  it("evaluates helical strakes suppression efficiency under ocean currents", () => {
    const res = SubseaFlowlineVivModalShapeStrakesAnalyzer.analyzeVivIntegrity(mockFlowline, mockCurrent);

    expect(res.flowlineId).toBe("FLOWLINE-GOM-DEEP-402");
    expect(res.reynoldsNumber).toBeGreaterThan(100000);
    expect(res.strouhalFrequencyHz).toBeCloseTo(0.535, 1);
    expect(res.strakesEfficiencyPercent).toBeGreaterThan(70.0);
    expect(res.effectiveLiftCoefficient).toBeLessThan(0.25);
    expect(res.attestationDigest).toHaveLength(64);
  });

  it("detects high lift and bending stress without strakes (bare pipe)", () => {
    const bareFlowline: FlowlineParameters = {
      ...mockFlowline,
      hasHelicalStrakes: false,
      strakesFoulingPercent: 0
    };

    const res = SubseaFlowlineVivModalShapeStrakesAnalyzer.analyzeVivIntegrity(bareFlowline, mockCurrent);

    expect(res.effectiveLiftCoefficient).toBe(0.80);
    expect(res.strakesEfficiencyPercent).toBe(0.0);
    expect(res.maxBendingStressMpa).toBeGreaterThan(50.0);
  });

  it("validates input boundaries and rejects invalid configurations", () => {
    expect(() => {
      SubseaFlowlineVivModalShapeStrakesAnalyzer.analyzeVivIntegrity(
        { ...mockFlowline, flowlineId: "" },
        mockCurrent
      );
    }).toThrow("flowlineId cannot be empty.");

    expect(() => {
      SubseaFlowlineVivModalShapeStrakesAnalyzer.analyzeVivIntegrity(
        mockFlowline,
        { ...mockCurrent, currentVelocityMps: -0.5 }
      );
    }).toThrow("currentVelocityMps cannot be negative.");
  });
});
