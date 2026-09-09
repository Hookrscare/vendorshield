/**
 * Unit tests for SNAP-43: Sub-Grade Geotechnical Retaining Wall Soil Lateral Pressure & Overturning Moment Profiler.
 */

import { describe, it, expect } from "vitest";
import {
  RetainingWallSoilPressureProfiler,
  RetainingWallGeometry,
  BackfillGeotechnicalProps
} from "./retaining-wall-soil-pressure-profiler";

describe("SNAP-43: RetainingWallSoilPressureProfiler", () => {
  it("evaluates well-drained stable retaining wall within IBC safety factors", () => {
    const geometry: RetainingWallGeometry = {
      wallHeightMeters: 3.5,
      stemThicknessMeters: 0.40,
      baseFootingWidthMeters: 2.2
    };

    const soil: BackfillGeotechnicalProps = {
      soilFrictionAngleDeg: 34,
      soilUnitWeightKnM3: 18.5,
      waterTableHeightMeters: 0.0,
      surchargeLoadKPa: 5.0
    };

    const res = RetainingWallSoilPressureProfiler.evaluateWallStability(geometry, soil);

    // Ka for 34 deg: (1 - sin(34)) / (1 + sin(34)) ~ (1 - 0.559) / (1 + 0.559) ~ 0.2827
    expect(res.activeEarthPressureCoeffKa).toBeCloseTo(0.28, 1);
    expect(res.drainageHydrostaticRisk).toBe("WELL_DRAINED");
    expect(res.factorOfSafetyOverturning).toBeGreaterThan(1.5);
    expect(res.structuralSafetyRating).toBe("SAFE_PASS");
    expect(res.auditDigestSha256).toHaveLength(64);
  });

  it("detects critical collapse hazard when water table causes excessive hydrostatic pressure", () => {
    const geometry: RetainingWallGeometry = {
      wallHeightMeters: 5.0,
      stemThicknessMeters: 0.30,
      baseFootingWidthMeters: 1.5 // Too narrow
    };

    const saturatedSoil: BackfillGeotechnicalProps = {
      soilFrictionAngleDeg: 28,
      soilUnitWeightKnM3: 20.0,
      waterTableHeightMeters: 4.0, // Severe flooded pore pressure
      surchargeLoadKPa: 15.0
    };

    const res = RetainingWallSoilPressureProfiler.evaluateWallStability(geometry, saturatedSoil);

    expect(res.drainageHydrostaticRisk).toBe("HYDROSTATIC_ACCUMULATION_CRITICAL");
    expect(res.factorOfSafetyOverturning).toBeLessThan(1.5);
    expect(res.remedialRecommendations.length).toBeGreaterThan(0);
    expect(["BORDERLINE_MONITORING", "CRITICAL_COLLAPSE_HAZARD"]).toContain(res.structuralSafetyRating);
  });
});
