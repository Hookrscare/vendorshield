/**
 * src/lib/snapinspect/floating-wind-spar-buoy-mooring-tdr-tomographer.test.ts
 * Unit tests for SNAP-77: Offshore Floating Wind Submersible Spar Buoy Mooring Line Tension TDR Tomographer.
 */

import { describe, it, expect } from "vitest";
import {
  FloatingWindSparBuoyMooringTdrTomographer,
  MooringLineTdrTelemetry,
} from "./floating-wind-spar-buoy-mooring-tdr-tomographer";

describe("SNAP-77: Floating Wind Spar Buoy Mooring Line Tension TDR Tomographer", () => {
  const tomographer = new FloatingWindSparBuoyMooringTdrTomographer();

  it("should evaluate nominal intact mooring line as NOMINAL and DNV compliant", () => {
    const telemetry: MooringLineTdrTelemetry = {
      sparBuoyId: "SPAR-HYWIND-SCOT-04",
      mooringLineId: "ML-NW-01",
      material: "POLYESTER_TAUT_TETHER",
      totalLengthMeters: 850.0,
      minimumBreakingLoadKn: 12000.0,
      waterDepthMeters: 220.0,
      fairleadTensionKn: 3500.0,
      tdrPulseTravelTimeNanoseconds: 7800.0,
      reflectionImpedancePeaks: [
        {
          distanceFromFairleadMeters: 550.0,
          reflectionCoefficientGamma: 0.05,
          impedanceAnomalyType: "BENTHIC_TOUCHDOWN",
        },
      ],
    };

    const res = tomographer.evaluateMooringLine(telemetry);
    expect(res.sparBuoyId).toBe("SPAR-HYWIND-SCOT-04");
    expect(res.mooringLineId).toBe("ML-NW-01");
    expect(res.isDnvCompliant).toBe(true);
    expect(res.safetyFactorDnv).toBeGreaterThan(1.67);
    expect(res.structuralIntegrityState).toBe("NOMINAL");
    expect(res.calculatedTouchdownDistanceMeters).toBe(550.0);
    expect(res.tdrTomographyDigestSha256).toHaveLength(64);
  });

  it("should detect partial wire break impedance spike and flag CRITICAL_TETHER_REPLACEMENT", () => {
    const telemetry: MooringLineTdrTelemetry = {
      sparBuoyId: "SPAR-HYWIND-SCOT-04",
      mooringLineId: "ML-SE-03",
      material: "STEEL_WIRE_ROPE",
      totalLengthMeters: 900.0,
      minimumBreakingLoadKn: 15000.0,
      waterDepthMeters: 250.0,
      fairleadTensionKn: 9200.0, // High pretension
      tdrPulseTravelTimeNanoseconds: 8200.0,
      reflectionImpedancePeaks: [
        {
          distanceFromFairleadMeters: 310.0,
          reflectionCoefficientGamma: 0.42, // Severe wire break reflection
          impedanceAnomalyType: "PARTIAL_WIRE_BREAK",
        },
      ],
    };

    const res = tomographer.evaluateMooringLine(telemetry);
    expect(res.isDnvCompliant).toBe(false);
    expect(res.structuralIntegrityState).toBe("CRITICAL_TETHER_REPLACEMENT");
    expect(res.detectedFlawsCount).toBe(1);
  });

  it("should flag MAINTENANCE_REQUIRED on biofouling accumulation without severe breaks", () => {
    const telemetry: MooringLineTdrTelemetry = {
      sparBuoyId: "SPAR-TEST-01",
      mooringLineId: "ML-SW-02",
      material: "STUDLESS_CHAIN_R4",
      totalLengthMeters: 700.0,
      minimumBreakingLoadKn: 18000.0,
      waterDepthMeters: 180.0,
      fairleadTensionKn: 8000.0,
      tdrPulseTravelTimeNanoseconds: 6500.0,
      reflectionImpedancePeaks: [
        {
          distanceFromFairleadMeters: 120.0,
          reflectionCoefficientGamma: 0.12,
          impedanceAnomalyType: "BIOFOULING_CLUSTER",
        },
      ],
    };

    const res = tomographer.evaluateMooringLine(telemetry);
    expect(res.structuralIntegrityState).toBe("MAINTENANCE_REQUIRED");
    expect(res.detectedFlawsCount).toBe(1);
  });
});
