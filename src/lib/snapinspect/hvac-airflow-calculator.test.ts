import { describe, it, expect } from "vitest";
import {
  calculateTESP,
  estimateDeliveredCfm,
  assessHVACAirflow,
  StaticPressureReadings,
  HVACSystemSpec
} from "./hvac-airflow-calculator";

describe("SNAP-15: Multi-Sensor HVAC Static Pressure & Airflow Balancing Loss Calculator", () => {
  it("calculates Total External Static Pressure (TESP) from supply and return probe readings", () => {
    const readings: StaticPressureReadings = {
      returnStaticPressureInWc: -0.26,
      supplyStaticPressureInWc: 0.22
    };
    expect(calculateTESP(readings)).toBe(0.48);
  });

  it("evaluates a properly balanced residential split system within design specifications", () => {
    const readings: StaticPressureReadings = {
      returnStaticPressureInWc: -0.20,
      supplyStaticPressureInWc: 0.25,
      filterPressureDropInWc: 0.12,
      coilPressureDropInWc: 0.18
    };
    const specs: HVACSystemSpec = {
      ratedCoolingTons: 3.0,
      ratedCfmAtDesignTesp: 1200,
      maxDesignTespInWc: 0.50,
      systemType: "RESIDENTIAL_SPLIT"
    };

    const assessment = assessHVACAirflow(readings, specs);
    expect(assessment.tespInWc).toBe(0.45);
    expect(assessment.tespStatus).toBe("NORMAL");
    expect(assessment.cfmPerTon).toBeGreaterThanOrEqual(380);
    expect(assessment.cfmPerTonStatus).toBe("NORMAL_BALANCED");
    expect(assessment.primaryRestrictionLocation).toBe("BALANCED");
    expect(assessment.airflowLossPercentage).toBe(0);
  });

  it("identifies high return static pressure restriction and calculates airflow deficit and freeze risk", () => {
    const readings: StaticPressureReadings = {
      returnStaticPressureInWc: -0.58, // Severely choked return
      supplyStaticPressureInWc: 0.24,
      filterPressureDropInWc: 0.14
    };
    const specs: HVACSystemSpec = {
      ratedCoolingTons: 4.0,
      ratedCfmAtDesignTesp: 1600,
      maxDesignTespInWc: 0.50,
      systemType: "HEAT_PUMP"
    };

    const assessment = assessHVACAirflow(readings, specs);
    expect(assessment.tespInWc).toBe(0.82);
    expect(assessment.tespStatus).toBe("CRITICAL_OVERPRESSURE");
    expect(assessment.deliveredCfm).toBeLessThan(1200);
    expect(assessment.cfmDeficit).toBeGreaterThan(400);
    expect(assessment.airflowLossPercentage).toBeGreaterThan(25.0);
    expect(assessment.cfmPerTonStatus).toBe("CRITICAL_INSUFFICIENT");
    expect(assessment.primaryRestrictionLocation).toBe("RETURN_DUCT");
    expect(assessment.inspectorRecommendations.some(r => r.includes("Return side restriction"))).toBe(true);
  });

  it("identifies dirty filter media bottleneck when filter drop exceeds threshold", () => {
    const readings: StaticPressureReadings = {
      returnStaticPressureInWc: -0.35,
      supplyStaticPressureInWc: 0.35,
      filterPressureDropInWc: 0.38 // Highly clogged 1-inch filter
    };
    const specs: HVACSystemSpec = {
      ratedCoolingTons: 3.5,
      ratedCfmAtDesignTesp: 1400,
      maxDesignTespInWc: 0.50,
      systemType: "RESIDENTIAL_SPLIT"
    };

    const assessment = assessHVACAirflow(readings, specs);
    expect(assessment.primaryRestrictionLocation).toBe("FILTER_MEDIA");
    expect(assessment.inspectorRecommendations.some(r => r.includes("filter media"))).toBe(true);
  });
});
