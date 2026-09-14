import { describe, it, expect } from "vitest";
import {
  SubseaHvdcCableFreespanVivSensor,
  SubseaCableFreespanTelemetry
} from "./subsea-hvdc-cable-freespan-viv-sensor";

describe("SNAP-88: Subsea HVDC Export Cable Dynamic Seabed Freespan Vortex-Induced Vibration Sensor", () => {
  it("evaluates a stable buried or short span subsea cable with no VIV risk", () => {
    const stableTelemetry: SubseaCableFreespanTelemetry = {
      cableId: "HVDC-BORWIN-3-SPAN-01",
      cableOuterDiameterMeters: 0.16,
      cableSubmergedWeightNPerMeter: 360.0,
      freespanLengthMeters: 4.5,
      bottomClearanceGapMeters: 0.15,
      bottomCurrentVelocityMPerSec: 0.25,
      effectiveAxialTensionN: 35000.0,
      cableBendingStiffnessNm2: 1.4e5,
    };

    const evaluation = SubseaHvdcCableFreespanVivSensor.evaluateFreespanStability(stableTelemetry);

    expect(evaluation.cableId).toBe("HVDC-BORWIN-3-SPAN-01");
    expect(evaluation.vivLockInStatus).toBe("NO_VIBRATION");
    expect(evaluation.remedialInterventionRequired).toBe(false);
    expect(evaluation.recommendedInterventionType).toBe("NONE");
    expect(evaluation.reducedVelocityVr).toBeLessThan(1.0);
    expect(evaluation.attestationDigest).toHaveLength(64);
  });

  it("detects critical cross-flow lock-in on an excessive freespan during storm currents", () => {
    const criticalTelemetry: SubseaCableFreespanTelemetry = {
      cableId: "HVDC-DOLWIN-6-SPAN-19",
      cableOuterDiameterMeters: 0.18,
      cableSubmergedWeightNPerMeter: 400.0,
      freespanLengthMeters: 22.0,
      bottomClearanceGapMeters: 0.85,
      bottomCurrentVelocityMPerSec: 1.6, // Strong tidal storm current
      effectiveAxialTensionN: 15000.0,
      cableBendingStiffnessNm2: 1.1e5,
    };

    const evaluation = SubseaHvdcCableFreespanVivSensor.evaluateFreespanStability(criticalTelemetry);

    expect(evaluation.vivLockInStatus).toBe("CROSS_FLOW_LOCK_IN_CRITICAL");
    expect(evaluation.reducedVelocityVr).toBeGreaterThanOrEqual(3.0);
    expect(evaluation.remedialInterventionRequired).toBe(true);
    expect(evaluation.recommendedInterventionType).toBe("GROUT_BAG_MATTRESS_SUPPORT");
    expect(evaluation.estimatedDailyFatigueDamage).toBeGreaterThan(0.001);
  });

  it("throws validation error on invalid physical inputs", () => {
    expect(() => {
      SubseaHvdcCableFreespanVivSensor.evaluateFreespanStability({
        cableId: "",
        cableOuterDiameterMeters: 0.16,
        cableSubmergedWeightNPerMeter: 300.0,
        freespanLengthMeters: 10.0,
        bottomClearanceGapMeters: 0.2,
        bottomCurrentVelocityMPerSec: 0.5,
        effectiveAxialTensionN: 20000.0,
        cableBendingStiffnessNm2: 1e5,
      });
    }).toThrow("cableId is required.");

    expect(() => {
      SubseaHvdcCableFreespanVivSensor.evaluateFreespanStability({
        cableId: "CABLE-01",
        cableOuterDiameterMeters: -0.16,
        cableSubmergedWeightNPerMeter: 300.0,
        freespanLengthMeters: 10.0,
        bottomClearanceGapMeters: 0.2,
        bottomCurrentVelocityMPerSec: 0.5,
        effectiveAxialTensionN: 20000.0,
        cableBendingStiffnessNm2: 1e5,
      });
    }).toThrow("cableOuterDiameterMeters must be strictly positive.");
  });
});
