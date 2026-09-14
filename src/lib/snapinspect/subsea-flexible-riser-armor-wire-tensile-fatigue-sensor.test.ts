import { describe, it, expect } from "vitest";
import {
  SubseaFlexibleRiserArmorWireTensileFatigueSensor,
  AeWaveformFeature,
  TensileArmorRiserSpec
} from "./subsea-flexible-riser-armor-wire-tensile-fatigue-sensor";

describe("SNAP-87: SubseaFlexibleRiserArmorWireTensileFatigueSensor", () => {
  const defaultSpec: TensileArmorRiserSpec = {
    riserId: "RISER-DEEPWATER-04",
    totalTensileWires: 128,
    nominalYieldTensionKn: 3200,
    maxAllowableBrokenWires: 4,
    operatingTensionKn: 1100
  };

  it("classifies benign inter-wire fretting sliding friction bursts", () => {
    const frettingBurst: AeWaveformFeature = {
      burstId: "AE-001",
      timestampMs: 1000,
      peakAmplitudeDb: 42.5,
      riseTimeMicroseconds: 85.0,
      durationMicroseconds: 400.0,
      ringDownCounts: 18,
      marseEnergyUnits: 45.0
    };

    const res = SubseaFlexibleRiserArmorWireTensileFatigueSensor.classifyBurst(frettingBurst);
    expect(res.classification).toBe("BENIGN_INTERWIRE_SLIDING_FRICTION");
    expect(res.isCriticalWireBreak).toBe(false);
  });

  it("classifies fatigue microcrack propagation burst with moderate energy and fast rise time", () => {
    const crackBurst: AeWaveformFeature = {
      burstId: "AE-002",
      timestampMs: 2500,
      peakAmplitudeDb: 62.0,
      riseTimeMicroseconds: 32.0,
      durationMicroseconds: 220.0,
      ringDownCounts: 45,
      marseEnergyUnits: 180.0
    };

    const res = SubseaFlexibleRiserArmorWireTensileFatigueSensor.classifyBurst(crackBurst);
    expect(res.classification).toBe("FATIGUE_MICROCRACK_PROPAGATION");
    expect(res.isCriticalWireBreak).toBe(false);
  });

  it("classifies high-energy abrupt tensile armor wire rupture", () => {
    const ruptureBurst: AeWaveformFeature = {
      burstId: "AE-003",
      timestampMs: 4200,
      peakAmplitudeDb: 88.5,
      riseTimeMicroseconds: 11.2,
      durationMicroseconds: 680.0,
      ringDownCounts: 140,
      marseEnergyUnits: 890.0
    };

    const res = SubseaFlexibleRiserArmorWireTensileFatigueSensor.classifyBurst(ruptureBurst);
    expect(res.classification).toBe("TENSILE_ARMOR_WIRE_RUPTURE");
    expect(res.isCriticalWireBreak).toBe(true);
  });

  it("evaluates healthy operating riser status when only fretting is observed", () => {
    const bursts: AeWaveformFeature[] = [
      {
        burstId: "B-1",
        timestampMs: 100,
        peakAmplitudeDb: 45.0,
        riseTimeMicroseconds: 90.0,
        durationMicroseconds: 300.0,
        ringDownCounts: 12,
        marseEnergyUnits: 30.0
      },
      {
        burstId: "B-2",
        timestampMs: 200,
        peakAmplitudeDb: 48.0,
        riseTimeMicroseconds: 70.0,
        durationMicroseconds: 350.0,
        ringDownCounts: 15,
        marseEnergyUnits: 40.0
      }
    ];

    const assessment = SubseaFlexibleRiserArmorWireTensileFatigueSensor.evaluateRiserArmorIntegrity(defaultSpec, bursts);
    expect(assessment.status).toBe("SAFE_OPERATING");
    expect(assessment.brokenWiresDetected).toBe(0);
    expect(assessment.residualTensileCapacityPercent).toBe(100.0);
    expect(assessment.safetyFactor).toBeGreaterThan(2.5);
    expect(assessment.attestationDigest).toHaveLength(64);
  });

  it("triggers critical shutdown alert when broken wires exceed allowable threshold", () => {
    const bursts: AeWaveformFeature[] = Array.from({ length: 5 }, (_, i) => ({
      burstId: `RUPTURE-${i}`,
      timestampMs: 1000 * i,
      peakAmplitudeDb: 82.0,
      riseTimeMicroseconds: 14.0,
      durationMicroseconds: 500.0,
      ringDownCounts: 110,
      marseEnergyUnits: 650.0
    }));

    const assessment = SubseaFlexibleRiserArmorWireTensileFatigueSensor.evaluateRiserArmorIntegrity(defaultSpec, bursts);
    expect(assessment.status).toBe("CRITICAL_SHUTDOWN_RECOMMENDED");
    expect(assessment.brokenWiresDetected).toBe(5);
    expect(assessment.tacticalDirective).toContain("CRITICAL ALERT");
    expect(assessment.residualTensileCapacityPercent).toBeLessThan(97.0);
  });
});
