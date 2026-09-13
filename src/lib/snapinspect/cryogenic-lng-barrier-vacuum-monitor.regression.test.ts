import { describe, it, expect } from "vitest";
import {
  CryogenicLngBarrierVacuumMonitor,
  LngInterBarrierTelemetry,
} from "./cryogenic-lng-barrier-vacuum-monitor";

describe("SNAP-77: CryogenicLngBarrierVacuumMonitor", () => {
  it("evaluates nominal stable conditions with deep vacuum and low methane", () => {
    const telemetry: LngInterBarrierTelemetry = {
      tankId: "LNG-TANK-NO96-01",
      timestampEpochMs: 1700000000000,
      secondarySpaceVacuumMbar: 0.02,
      methaneConcentrationPpm: 2.1,
      secondarySpaceTempKelvin: 125.0,
      nitrogenPurgeFlowM3h: 5.0,
    };

    const assessment = CryogenicLngBarrierVacuumMonitor.evaluateIntegrity(telemetry);

    expect(assessment.status).toBe("NORMAL_STABLE");
    expect(assessment.isAlarmActive).toBe(false);
    expect(assessment.insulationThermalConductivityMwPerMk).toBeLessThan(5.0);
    expect(assessment.auditHash).toHaveLength(64);
  });

  it("triggers PRIMARY_BARRIER_PINHOLE_LEAK on elevated methane concentration", () => {
    const telemetry: LngInterBarrierTelemetry = {
      tankId: "LNG-TANK-MARK3-02",
      timestampEpochMs: 1700000000000,
      secondarySpaceVacuumMbar: 0.04,
      methaneConcentrationPpm: 78.5,
      secondarySpaceTempKelvin: 120.0,
      nitrogenPurgeFlowM3h: 8.0,
    };

    const assessment = CryogenicLngBarrierVacuumMonitor.evaluateIntegrity(telemetry);

    expect(assessment.status).toBe("PRIMARY_BARRIER_PINHOLE_LEAK");
    expect(assessment.isAlarmActive).toBe(true);
    expect(assessment.recommendedAction).toContain("Primary membrane micro-perforation suspected");
  });

  it("triggers OUTER_JACKET_VACUUM_DEGRADATION when vacuum rises without methane", () => {
    const telemetry: LngInterBarrierTelemetry = {
      tankId: "LNG-TANK-NO96-03",
      timestampEpochMs: 1700000000000,
      secondarySpaceVacuumMbar: 0.45,
      methaneConcentrationPpm: 1.8,
      secondarySpaceTempKelvin: 140.0,
      nitrogenPurgeFlowM3h: 5.0,
    };

    const assessment = CryogenicLngBarrierVacuumMonitor.evaluateIntegrity(telemetry);

    expect(assessment.status).toBe("OUTER_JACKET_VACUUM_DEGRADATION");
    expect(assessment.isAlarmActive).toBe(true);
    expect(assessment.recommendedAction).toContain("turbomolecular vacuum pumping skid");
  });

  it("triggers CRITICAL_INTER_BARRIER_BREACH on critical methane leakage", () => {
    const telemetry: LngInterBarrierTelemetry = {
      tankId: "LNG-TANK-NO96-01",
      timestampEpochMs: 1700000000000,
      secondarySpaceVacuumMbar: 1.85,
      methaneConcentrationPpm: 820.0,
      secondarySpaceTempKelvin: 155.0,
      nitrogenPurgeFlowM3h: 25.0,
    };

    const assessment = CryogenicLngBarrierVacuumMonitor.evaluateIntegrity(telemetry);

    expect(assessment.status).toBe("CRITICAL_INTER_BARRIER_BREACH");
    expect(assessment.isAlarmActive).toBe(true);
    expect(assessment.recommendedAction).toContain("emergency purge");
  });

  it("throws an error on invalid negative inputs", () => {
    expect(() =>
      CryogenicLngBarrierVacuumMonitor.evaluateIntegrity({
        tankId: "ERR",
        timestampEpochMs: 1700000000000,
        secondarySpaceVacuumMbar: -0.1,
        methaneConcentrationPpm: 10,
        secondarySpaceTempKelvin: 120,
        nitrogenPurgeFlowM3h: 5,
      })
    ).toThrow("Vacuum pressure cannot be negative.");
  });
});
