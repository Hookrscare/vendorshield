/**
 * subsea-flexible-riser-armor-wire-tensile-fatigue-sensor.ts
 * SNAP-87: Subsea Flexible Riser Armor Wire Tensile Fatigue Acoustic Emission Sensor.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile NDT.
 *
 * Grounded in API RP 17B (Recommended Practice for Flexible Pipe) and ISO 13628-2:
 * 1. Evaluates acoustic emission (AE) wave transients detected at the top-end hang-off fitting / bend stiffener.
 * 2. Distinguishes benign inter-wire sliding friction from microcrack initiation and full wire fracture events.
 * 3. Quantifies peak amplitude (dB AE), rise time (microseconds), ring-down count, and MARSE energy.
 * 4. Tracks accumulated broken wire count across helical tensile armor layers (inner & outer armor).
 * 5. Computes residual structural tensile strength capacity percentage and triggers API 17B emergency alarms.
 * 6. Generates tamper-evident SHA-256 field diagnostic attestation digest.
 */

import { createHash } from "crypto";

export interface AeWaveformFeature {
  burstId: string;
  timestampMs: number;
  peakAmplitudeDb: number;        // Peak dB (ref 1 uV at sensor, typically 30 - 100 dB)
  riseTimeMicroseconds: number;   // Time from threshold crossing to peak (us)
  durationMicroseconds: number;   // Total burst duration
  ringDownCounts: number;         // Threshold crossings
  marseEnergyUnits: number;       // Measured Area of Rectified Signal Envelope (eu)
}

export interface TensileArmorRiserSpec {
  riserId: string;
  totalTensileWires: number;      // e.g. 64 outer + 64 inner = 128 wires
  nominalYieldTensionKn: number;  // Maximum tensile design capacity (kN)
  maxAllowableBrokenWires: number;// Allowable before derating (typically 3 to 5 wires per API 17B)
  operatingTensionKn: number;     // Current dynamic hang-off tension (kN)
}

export type WireDamageClassification =
  | "BENIGN_INTERWIRE_SLIDING_FRICTION"
  | "FATIGUE_MICROCRACK_PROPAGATION"
  | "TENSILE_ARMOR_WIRE_RUPTURE";

export interface BurstClassificationResult {
  burstId: string;
  classification: WireDamageClassification;
  confidence: number;
  isCriticalWireBreak: boolean;
}

export interface RiserTensileArmorIntegrityAssessment {
  riserId: string;
  totalBurstsEvaluated: number;
  frettingEventsCount: number;
  microcrackEventsCount: number;
  brokenWiresDetected: number;
  residualTensileCapacityPercent: number;
  safetyFactor: number;
  status: "SAFE_OPERATING" | "DEGRADED_INSPECTION_REQUIRED" | "CRITICAL_SHUTDOWN_RECOMMENDED";
  tacticalDirective: string;
  attestationDigest: string;
}

export class SubseaFlexibleRiserArmorWireTensileFatigueSensor {
  // Classification boundaries based on ASTM E1316 / API RP 17B NDT guidelines
  private static readonly WIRE_BREAK_MIN_AMPLITUDE_DB = 75.0;
  private static readonly WIRE_BREAK_MAX_RISE_TIME_US = 20.0;
  private static readonly WIRE_BREAK_MIN_ENERGY_EU = 450.0;

  private static readonly MICROCRACK_MIN_AMPLITUDE_DB = 55.0;
  private static readonly MICROCRACK_MAX_RISE_TIME_US = 50.0;
  private static readonly MICROCRACK_MIN_ENERGY_EU = 120.0;

  /**
   * Classifies a single acoustic emission waveform burst.
   */
  public static classifyBurst(feature: AeWaveformFeature): BurstClassificationResult {
    if (
      feature.peakAmplitudeDb >= this.WIRE_BREAK_MIN_AMPLITUDE_DB &&
      feature.riseTimeMicroseconds <= this.WIRE_BREAK_MAX_RISE_TIME_US &&
      feature.marseEnergyUnits >= this.WIRE_BREAK_MIN_ENERGY_EU
    ) {
      return {
        burstId: feature.burstId,
        classification: "TENSILE_ARMOR_WIRE_RUPTURE",
        confidence: 0.96,
        isCriticalWireBreak: true
      };
    }

    if (
      feature.peakAmplitudeDb >= this.MICROCRACK_MIN_AMPLITUDE_DB &&
      feature.riseTimeMicroseconds <= this.MICROCRACK_MAX_RISE_TIME_US &&
      feature.marseEnergyUnits >= this.MICROCRACK_MIN_ENERGY_EU
    ) {
      return {
        burstId: feature.burstId,
        classification: "FATIGUE_MICROCRACK_PROPAGATION",
        confidence: 0.88,
        isCriticalWireBreak: false
      };
    }

    return {
      burstId: feature.burstId,
      classification: "BENIGN_INTERWIRE_SLIDING_FRICTION",
      confidence: 0.92,
      isCriticalWireBreak: false
    };
  }

  /**
   * Evaluates burst batch across riser structural profile and estimates remaining load capacity.
   */
  public static evaluateRiserArmorIntegrity(
    spec: TensileArmorRiserSpec,
    bursts: AeWaveformFeature[]
  ): RiserTensileArmorIntegrityAssessment {
    if (spec.totalTensileWires <= 0 || spec.nominalYieldTensionKn <= 0) {
      throw new Error("Invalid riser specification: total wires and yield tension must be positive.");
    }

    let frettingCount = 0;
    let microcrackCount = 0;
    let brokenWiresCount = 0;

    for (const b of bursts) {
      const res = this.classifyBurst(b);
      if (res.classification === "TENSILE_ARMOR_WIRE_RUPTURE") {
        brokenWiresCount++;
      } else if (res.classification === "FATIGUE_MICROCRACK_PROPAGATION") {
        microcrackCount++;
      } else {
        frettingCount++;
      }
    }

    // Residual tensile capacity calculation
    const survivingWires = Math.max(0, spec.totalTensileWires - brokenWiresCount);
    const capacityRatio = survivingWires / spec.totalTensileWires;
    const residualCapacityPercent = Math.round(capacityRatio * 1000) / 10;
    const effectiveYieldKn = spec.nominalYieldTensionKn * capacityRatio;
    const safetyFactor = Math.round((effectiveYieldKn / Math.max(1, spec.operatingTensionKn)) * 100) / 100;

    let status: "SAFE_OPERATING" | "DEGRADED_INSPECTION_REQUIRED" | "CRITICAL_SHUTDOWN_RECOMMENDED";
    let tacticalDirective: string;

    if (brokenWiresCount >= spec.maxAllowableBrokenWires || safetyFactor < 1.5) {
      status = "CRITICAL_SHUTDOWN_RECOMMENDED";
      tacticalDirective = `CRITICAL ALERT: ${brokenWiresCount} tensile armor wire break(s) detected. Safety factor ${safetyFactor} < 1.5. Halt production and mobilize ROV ultrasonic UT inspection.`;
    } else if (brokenWiresCount > 0 || microcrackCount >= 10 || safetyFactor < 2.0) {
      status = "DEGRADED_INSPECTION_REQUIRED";
      tacticalDirective = `WARNING: Active armor wire degradation detected (${brokenWiresCount} broken wire(s), ${microcrackCount} microcrack events). Increase AE sampling and schedule topside radiographic scan.`;
    } else {
      status = "SAFE_OPERATING";
      tacticalDirective = `NORMAL: Tensile armor wire integrity nominal. Residual capacity ${residualCapacityPercent}%, safety factor ${safetyFactor}.`;
    }

    const digestPayload = `${spec.riserId}:${bursts.length}:${brokenWiresCount}:${residualCapacityPercent}:${safetyFactor}:${status}`;
    const attestationDigest = createHash("sha256").update(digestPayload).digest("hex");

    return {
      riserId: spec.riserId,
      totalBurstsEvaluated: bursts.length,
      frettingEventsCount: frettingCount,
      microcrackEventsCount: microcrackCount,
      brokenWiresDetected: brokenWiresCount,
      residualTensileCapacityPercent: residualCapacityPercent,
      safetyFactor,
      status,
      tacticalDirective,
      attestationDigest
    };
  }
}
