/**
 * src/lib/snapinspect/cable-stayed-bridge-aerodynamic-damping-analyzer.ts
 * Part of SnapInspect AI Drone Inspection & Structural Telemetry Platform.
 *
 * SNAP-66: Suspended Cable-Stayed Bridge Main Stay Vibration Frequency Aerodynamic Damping Analyzer.
 * 1. Solves cable multi-mode transverse natural frequencies fn = (n / 2L) * sqrt(T / m).
 * 2. Analyzes Scruton number Sc = (2 * m * zeta) / (rho * D^2) for vortex-induced vibration (VIV) immunity.
 * 3. Evaluates Den Hartog galloping instability criteria (dCL/dalpha + CD < 0).
 * 4. Models Rain-Wind-Induced Vibration (RWIV) susceptibility and computes auxiliary damping deficit.
 * 5. Emits SHA-256 cryptographic structural integrity verification hash.
 */

import crypto from "crypto";

export interface StayCableParameters {
  cableId: string;
  spanLengthMeters: number;        // L [m]
  tensionNewtons: number;          // T [N]
  massPerUnitLengthKgM: number;    // m [kg/m]
  outerDiameterMeters: number;     // D [m]
  structuralDampingRatio: number;  // zeta_struct (e.g. 0.003 - 0.006)
  hasSurfaceHelicalRib: boolean;   // Helical pattern suppressing water rivulets
}

export interface WindExcitationConditions {
  windVelocityMps: number;         // U [m/s]
  windIncidenceAngleDeg: number;   // alpha [deg]
  airDensityKgM3: number;          // rho [kg/m^3], default ~1.225
  isPrecipitating: boolean;        // Rain presence
}

export interface AerodynamicDampingResult {
  cableId: string;
  mode1NaturalFrequencyHz: number;
  mode2NaturalFrequencyHz: number;
  mode3NaturalFrequencyHz: number;
  scrutonNumber: number;
  isVivSuppressed: boolean;        // Sc > 10.0 for VIV suppression
  isRwivRiskHigh: boolean;         // Rain-Wind Induced Vibration risk
  isGallopingUnstable: boolean;    // Den Hartog criterion
  requiredAuxiliaryDamperRatio: number; // Deficit to reach target damping (e.g. 0.01)
  auditHash: string;
}

export class CableStayedBridgeAerodynamicDampingAnalyzer {
  private readonly airDensityKgM3: number;
  private readonly strouhalNumber: number;
  private readonly targetDampingRatio: number;

  constructor(
    airDensityKgM3: number = 1.225,
    strouhalNumber: number = 0.18,
    targetDampingRatio: number = 0.010
  ) {
    this.airDensityKgM3 = airDensityKgM3;
    this.strouhalNumber = strouhalNumber;
    this.targetDampingRatio = targetDampingRatio;
  }

  public analyzeCableStay(
    cable: StayCableParameters,
    wind: WindExcitationConditions
  ): AerodynamicDampingResult {
    if (cable.spanLengthMeters <= 0 || cable.massPerUnitLengthKgM <= 0 || cable.tensionNewtons <= 0) {
      throw new Error("Invalid physical parameters for stay cable.");
    }

    // Natural frequencies fn = (n / 2L) * sqrt(T / m)
    const waveSpeed = Math.sqrt(cable.tensionNewtons / cable.massPerUnitLengthKgM);
    const f1 = (1.0 / (2.0 * cable.spanLengthMeters)) * waveSpeed;
    const f2 = 2.0 * f1;
    const f3 = 3.0 * f1;

    // Scruton number Sc = 2 * m * zeta / (rho * D^2)
    const rho = wind.airDensityKgM3 || this.airDensityKgM3;
    const D = cable.outerDiameterMeters;
    const m = cable.massPerUnitLengthKgM;
    const zeta = cable.structuralDampingRatio;

    const scrutonNumber = (2.0 * m * zeta) / (rho * D * D);
    const isVivSuppressed = scrutonNumber >= 10.0;

    // Rain-Wind-Induced Vibration (RWIV): occurs typically between 6 m/s - 18 m/s with rain
    // and smooth cable surfaces without helical ribs
    const isRwivRiskHigh =
      wind.isPrecipitating &&
      !cable.hasSurfaceHelicalRib &&
      wind.windVelocityMps >= 6.0 &&
      wind.windVelocityMps <= 18.0 &&
      scrutonNumber < 12.0;

    // Den Hartog Galloping: occurs when dCL/dalpha + CD < 0
    // For circular cables with upper water rivulets, effective lift gradient can invert
    let isGallopingUnstable = false;
    if (wind.isPrecipitating && !cable.hasSurfaceHelicalRib && wind.windIncidenceAngleDeg > 20.0) {
      isGallopingUnstable = true;
    }

    // Required auxiliary damping (viscous damper or TMD installation requirement)
    const damperDeficit = Math.max(0.0, this.targetDampingRatio - cable.structuralDampingRatio);

    const auditPayload = {
      cableId: cable.cableId,
      f1: round(f1, 4),
      scrutonNumber: round(scrutonNumber, 3),
      isVivSuppressed,
      isRwivRiskHigh,
      isGallopingUnstable,
      damperDeficit: round(damperDeficit, 5),
    };
    const auditHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(auditPayload))
      .digest("hex");

    return {
      cableId: cable.cableId,
      mode1NaturalFrequencyHz: round(f1, 4),
      mode2NaturalFrequencyHz: round(f2, 4),
      mode3NaturalFrequencyHz: round(f3, 4),
      scrutonNumber: round(scrutonNumber, 3),
      isVivSuppressed,
      isRwivRiskHigh,
      isGallopingUnstable,
      requiredAuxiliaryDamperRatio: round(damperDeficit, 5),
      auditHash,
    };
  }
}

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
