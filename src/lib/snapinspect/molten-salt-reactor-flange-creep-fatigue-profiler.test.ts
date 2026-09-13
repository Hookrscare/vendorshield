/**
 * src/lib/snapinspect/molten-salt-reactor-flange-creep-fatigue-profiler.test.ts
 * Unit tests for SNAP-76: High-Temperature Molten Salt Reactor Pipe Flange Creep Fatigue Profiler.
 */

import { describe, it, expect } from "vitest";
import {
  MoltenSaltReactorFlangeCreepFatigueProfiler,
  MsrFlangeOperationalTelemetry,
} from "./molten-salt-reactor-flange-creep-fatigue-profiler";

describe("SNAP-76: Molten Salt Reactor Pipe Flange Creep Fatigue Profiler", () => {
  const profiler = new MoltenSaltReactorFlangeCreepFatigueProfiler();

  it("should evaluate nominal operating flange as ASME III-5 COMPLIANT", () => {
    const telemetry: MsrFlangeOperationalTelemetry = {
      flangeId: "FLG-MSR-LOOP1-HOT-01",
      alloy: "HASTELLOY_N",
      sustainedTemperatureCelsius: 650.0,
      internalPressureMpa: 1.0,
      flangeBoltPreloadKn: 120.0,
      sustainedHoldTimeHours: 5000.0,
      thermalTransientCycles: [
        {
          cycleName: "Reactor Startup/Shutdown",
          temperatureDeltaCelsius: 350.0,
          cyclesObserved: 15,
          allowableCyclesAtDelta: 500,
        },
      ],
    };

    const res = profiler.assessFlange(telemetry);
    expect(res.flangeId).toBe("FLG-MSR-LOOP1-HOT-01");
    expect(res.alloy).toBe("HASTELLOY_N");
    expect(res.temperatureKelvin).toBeCloseTo(923.15, 1);
    expect(res.cumulativeFatigueDamageDf).toBeCloseTo(0.03, 2);
    expect(res.asmeSectionIiiDiv5Status).toBe("COMPLIANT");
    expect(res.telemetrySealSha256).toHaveLength(64);
  });

  it("should detect severe creep damage and trigger CRITICAL_INSPECTION_REQUIRED", () => {
    const telemetry: MsrFlangeOperationalTelemetry = {
      flangeId: "FLG-MSR-HEAT-EXCHANGER-04",
      alloy: "STAINLESS_STEEL_316H",
      sustainedTemperatureCelsius: 750.0, // High thermal stress for 316H
      internalPressureMpa: 2.2,
      flangeBoltPreloadKn: 110.0,
      sustainedHoldTimeHours: 50000.0,    // Extreme hold time
      thermalTransientCycles: [
        {
          cycleName: "Emergency Scram Transient",
          temperatureDeltaCelsius: 400.0,
          cyclesObserved: 180,
          allowableCyclesAtDelta: 200,
        },
      ],
    };

    const res = profiler.assessFlange(telemetry);
    expect(res.asmeSectionIiiDiv5Status).toBe("CRITICAL_INSPECTION_REQUIRED");
    expect(res.boltPreloadRelaxationPercent).toBeGreaterThan(50.0);
    expect(res.cumulativeFatigueDamageDf).toBeGreaterThan(0.8);
  });

  it("should trigger MAINTENANCE_REQUIRED when creep-fatigue interaction enters warning band", () => {
    const telemetry: MsrFlangeOperationalTelemetry = {
      flangeId: "FLG-MSR-PUMP-INLET-02",
      alloy: "ALLOY_617",
      sustainedTemperatureCelsius: 700.0,
      internalPressureMpa: 1.5,
      flangeBoltPreloadKn: 130.0,
      sustainedHoldTimeHours: 25000.0,
      thermalTransientCycles: [
        {
          cycleName: "Power Ramp 50-100%",
          temperatureDeltaCelsius: 200.0,
          cyclesObserved: 600,
          allowableCyclesAtDelta: 1000,
        },
      ],
    };

    const res = profiler.assessFlange(telemetry);
    expect(res.interactionEnvelopeScore).toBeGreaterThan(0.5);
    expect(["MAINTENANCE_REQUIRED", "CRITICAL_INSPECTION_REQUIRED"]).toContain(res.asmeSectionIiiDiv5Status);
  });
});
