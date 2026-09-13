/**
 * src/lib/snapinspect/floating-wind-spar-buoy-mooring-tdr-tomographer.ts
 * SNAP-77: Offshore Floating Wind Submersible Spar Buoy Mooring Line Tension TDR Tomographer.
 * Part of SnapInspect Tactical NDT, Marine Energy & Offshore Structural Integrity Suite.
 *
 * Evaluates guided electro-acoustic Time-Domain Reflectometry (TDR) along deepwater
 * floating wind spar buoy mooring lines, calculating distributed catenary tension profiles,
 * touchdown point (TDP) benthic fatigue, wire breakage impedance spikes, and
 * DNV-ST-0119 / API RP 2SK safety factor compliance with SHA-256 telemetry sealing.
 */

import { createHash } from "crypto";

export type MooringLineMaterial = "STEEL_WIRE_ROPE" | "POLYESTER_TAUT_TETHER" | "STUDLESS_CHAIN_R4";

export interface MooringLineTdrTelemetry {
  sparBuoyId: string;
  mooringLineId: string;
  material: MooringLineMaterial;
  totalLengthMeters: number;       // e.g. 600 - 1200 m
  minimumBreakingLoadKn: number;   // MBL, e.g. 15,000 kN
  waterDepthMeters: number;        // e.g. 250 m
  fairleadTensionKn: number;       // Measured at spar fairlead
  tdrPulseTravelTimeNanoseconds: number;
  reflectionImpedancePeaks: Array<{
    distanceFromFairleadMeters: number;
    reflectionCoefficientGamma: number; // -1.0 to +1.0
    impedanceAnomalyType: "NONE" | "PARTIAL_WIRE_BREAK" | "BENTHIC_TOUCHDOWN" | "BIOFOULING_CLUSTER";
  }>;
}

export interface SparBuoyMooringAssessment {
  sparBuoyId: string;
  mooringLineId: string;
  material: MooringLineMaterial;
  calculatedTouchdownDistanceMeters: number;
  peakLineTensionKn: number;
  safetyFactorDnv: number; // MBL / PeakTension
  structuralIntegrityState: "NOMINAL" | "MAINTENANCE_REQUIRED" | "CRITICAL_TETHER_REPLACEMENT";
  detectedFlawsCount: number;
  isDnvCompliant: boolean; // DNV-ST-0119 requires SF >= 1.67 for intact lines
  tdrTomographyDigestSha256: string;
}

export class FloatingWindSparBuoyMooringTdrTomographer {
  // Nominal elastic axial stiffness EA (kN) and mass density (kg/m)
  private static readonly MATERIAL_SPECS: Record<MooringLineMaterial, { EA_kN: number; linearMassKgPerM: number }> = {
    STEEL_WIRE_ROPE: { EA_kN: 850000.0, linearMassKgPerM: 85.0 },
    POLYESTER_TAUT_TETHER: { EA_kN: 220000.0, linearMassKgPerM: 42.0 },
    STUDLESS_CHAIN_R4: { EA_kN: 1200000.0, linearMassKgPerM: 280.0 },
  };

  /**
   * Evaluates TDR trace and tension distribution along the floating spar mooring line.
   */
  public evaluateMooringLine(telemetry: MooringLineTdrTelemetry): SparBuoyMooringAssessment {
    if (telemetry.minimumBreakingLoadKn <= 0) {
      raise_err: throw new Error("minimumBreakingLoadKn must be positive");
    }

    const specs = FloatingWindSparBuoyMooringTdrTomographer.MATERIAL_SPECS[telemetry.material] || {
      EA_kN: 500000.0,
      linearMassKgPerM: 100.0,
    };

    // 1. Identify Touchdown Point (TDP) from reflection peaks or catenary approximation
    let tdpMeters = telemetry.totalLengthMeters * 0.70; // fallback
    for (const peak of telemetry.reflectionImpedancePeaks) {
      if (peak.impedanceAnomalyType === "BENTHIC_TOUCHDOWN") {
        tdpMeters = peak.distanceFromFairleadMeters;
        break;
      }
    }

    // 2. Count structural flaws (wire breaks, severe biofouling)
    let flawCount = 0;
    let hasSevereWireBreak = false;
    for (const peak of telemetry.reflectionImpedancePeaks) {
      if (peak.impedanceAnomalyType === "PARTIAL_WIRE_BREAK" && Math.abs(peak.reflectionCoefficientGamma) > 0.25) {
        flawCount++;
        hasSevereWireBreak = true;
      } else if (peak.impedanceAnomalyType === "BIOFOULING_CLUSTER") {
        flawCount++;
      }
    }

    // 3. Peak tension calculation (fairlead tension plus submerged catenary self-weight)
    const submergedWeightKn = (specs.linearMassKgPerM * 9.81 * telemetry.waterDepthMeters * 0.87) / 1000.0;
    const peakTension = telemetry.fairleadTensionKn + (hasSevereWireBreak ? submergedWeightKn * 1.2 : submergedWeightKn * 0.5);

    // 4. Safety Factor & DNV-ST-0119 compliance (SF >= 1.67)
    const safetyFactor = telemetry.minimumBreakingLoadKn / Math.max(1.0, peakTension);
    const isCompliant = safetyFactor >= 1.67 && !hasSevereWireBreak;

    let state: "NOMINAL" | "MAINTENANCE_REQUIRED" | "CRITICAL_TETHER_REPLACEMENT" = "NOMINAL";
    if (safetyFactor < 1.35 || hasSevereWireBreak) {
      state = "CRITICAL_TETHER_REPLACEMENT";
    } else if (safetyFactor < 1.67 || flawCount > 0) {
      state = "MAINTENANCE_REQUIRED";
    }

    const payload = `${telemetry.sparBuoyId}:${telemetry.mooringLineId}:${peakTension.toFixed(1)}:${safetyFactor.toFixed(2)}:${state}:${flawCount}`;
    const tdrTomographyDigestSha256 = createHash("sha256").update(payload).digest("hex");

    return {
      sparBuoyId: telemetry.sparBuoyId,
      mooringLineId: telemetry.mooringLineId,
      material: telemetry.material,
      calculatedTouchdownDistanceMeters: parseFloat(tdpMeters.toFixed(2)),
      peakLineTensionKn: parseFloat(peakTension.toFixed(2)),
      safetyFactorDnv: parseFloat(safetyFactor.toFixed(2)),
      structuralIntegrityState: state,
      detectedFlawsCount: flawCount,
      isDnvCompliant: isCompliant,
      tdrTomographyDigestSha256,
    };
  }
}
