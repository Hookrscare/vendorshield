/**
 * SNAP-90: Hydroelectric Penstock Acoustic Resonance & Hydraulic Transient Water-Hammer Sensor.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * Simulates and monitors high-head hydroelectric steel penstocks under rapid valve closure / transient loads:
 * - Computes acoustic pressure wave propagation velocity (Allievi-Joukowsky formula with pipe elasticity).
 * - Solves transient Joukowsky water-hammer shockwave pressure rise (ΔP = ρ * a * Δv).
 * - Analyzes acoustic resonance standing wave modes (f_n = n * a / 4L or 2L) to prevent governor governor hunting.
 * - Detects high-frequency ultrasonic acoustic emission (AE) bursts from cavitation implosion and fatigue cracking.
 * - Computes dynamic hoop stress (σ_h = P * D / 2e) vs allowable ASME/ASCE yield limits.
 * - Issues automated emergency valve damping and guide vane closure rate recommendations.
 */

export interface PenstockGeometry {
  penstockId: string;
  lengthMeters: number;
  outerDiameterMeters: number;
  wallThicknessMeters: number;
  steelModulusGpa: number; // typically 205-210 GPa for ASTM A516
  steelPoissonRatio: number; // ~0.30
  designYieldStrengthMpa: number; // e.g. 345 MPa
}

export interface WaterFlowState {
  waterDensityKgM3: number; // ~1000 kg/m3
  waterBulkModulusGpa: number; // ~2.15 GPa
  initialFlowVelocityMps: number; // e.g. 4.5 m/s
  rapidClosureDurationSeconds: number; // e.g. 0.8 s
  staticHeadMeters: number; // e.g. 350 m static head (~3.43 MPa)
}

export interface AcousticEmissionTelemetry {
  sensorRmsDb: number; // 0-120 dB
  peakFrequencyKhz: number; // 20 - 500 kHz
  ringdownCountsPerSec: number;
  cavitationEnergyMj: number;
}

export type PenstockAlarmSeverity = "NORMAL" | "ADVISORY" | "CRITICAL_WATER_HAMMER" | "RUPTURE_RISK";

export interface WaterHammerAnalysisResult {
  penstockId: string;
  acousticWaveSpeedMps: number;
  reflectionTimeSeconds: number; // T_r = 2L / a
  isDirectWaterHammer: boolean; // if closure_time <= T_r
  joukowskyPressureSurgeMpa: number;
  maximumTransientPressureMpa: number;
  dynamicHoopStressMpa: number;
  stressRatioToYieldPct: number;
  acousticFundamentalResonanceHz: number;
  cavitationSeverity: "NONE" | "MODERATE" | "SEVERE_EROSION";
  severity: PenstockAlarmSeverity;
  governorValveDampingRecommended: boolean;
  recommendedMinClosureTimeSeconds: number;
  analyzedAt: string;
}

export class HydroelectricPenstockAcousticResonanceSensor {
  /**
   * Evaluates hydraulic transient water-hammer and acoustic resonance risks for a penstock section.
   */
  public static analyzeTransient(
    geometry: PenstockGeometry,
    flow: WaterFlowState,
    ae: AcousticEmissionTelemetry
  ): WaterHammerAnalysisResult {
    const K = flow.waterBulkModulusGpa * 1e9;
    const E = geometry.steelModulusGpa * 1e9;
    const rho = flow.waterDensityKgM3;
    const D = geometry.outerDiameterMeters - 2 * geometry.wallThicknessMeters;
    const e = geometry.wallThicknessMeters;

    // Allievi equation for wave speed in an elastic thin/thick walled conduit (anchored with expansion joints):
    // c1 = 1 - 0.5 * nu
    const c1 = 1.0 - 0.5 * geometry.steelPoissonRatio;
    const elasticityFactor = (K / E) * (D / e) * c1;
    const waveSpeed = Math.sqrt((K / rho) / (1.0 + elasticityFactor));

    // Conduit acoustic reflection round-trip time: T_r = 2 * L / a
    const reflectionTime = (2.0 * geometry.lengthMeters) / waveSpeed;

    // Static pressure (P_static = rho * g * H)
    const staticPressurePa = rho * 9.80665 * flow.staticHeadMeters;
    const staticPressureMpa = staticPressurePa / 1e6;

    // Direct vs indirect water hammer
    const isDirect = flow.rapidClosureDurationSeconds <= reflectionTime;

    let joukowskySurgePa = 0.0;
    if (isDirect) {
      // Full Joukowsky surge: ΔP = ρ * a * v0
      joukowskySurgePa = rho * waveSpeed * flow.initialFlowVelocityMps;
    } else {
      // Linearized indirect surge: ΔP = (2 * L * ρ * v0) / T_c
      joukowskySurgePa =
        (2.0 * geometry.lengthMeters * rho * flow.initialFlowVelocityMps) /
        Math.max(0.01, flow.rapidClosureDurationSeconds);
    }

    const joukowskySurgeMpa = joukowskySurgePa / 1e6;
    const maxTransientPressureMpa = staticPressureMpa + joukowskySurgeMpa;

    // Dynamic hoop stress: σ_h = P_max * D / (2 * e)
    const hoopStressPa = (maxTransientPressureMpa * 1e6 * D) / (2.0 * e);
    const hoopStressMpa = hoopStressPa / 1e6;
    const stressRatioPct = (hoopStressMpa / geometry.designYieldStrengthMpa) * 100.0;

    // Fundamental acoustic standing wave frequency (closed valve, open reservoir): f_0 = a / (4L)
    const fundamentalResonanceHz = waveSpeed / (4.0 * geometry.lengthMeters);

    // Cavitation risk assessment from high-frequency ultrasonic energy
    let cavitationSeverity: "NONE" | "MODERATE" | "SEVERE_EROSION" = "NONE";
    if (ae.peakFrequencyKhz >= 80 && ae.sensorRmsDb > 65) {
      cavitationSeverity = ae.sensorRmsDb > 85 ? "SEVERE_EROSION" : "MODERATE";
    }

    // Determine alarm severity
    let severity: PenstockAlarmSeverity = "NORMAL";
    if (stressRatioPct >= 90.0 || (stressRatioPct >= 75.0 && cavitationSeverity === "SEVERE_EROSION")) {
      severity = "RUPTURE_RISK";
    } else if (stressRatioPct >= 70.0 || isDirect) {
      severity = "CRITICAL_WATER_HAMMER";
    } else if (stressRatioPct >= 50.0 || cavitationSeverity === "MODERATE") {
      severity = "ADVISORY";
    }

    const governorValveDampingRecommended = severity === "CRITICAL_WATER_HAMMER" || severity === "RUPTURE_RISK";

    // Recommended minimum closure time to prevent direct water-hammer and keep hoop stress < 60% yield:
    // Safe surge allowable = (0.60 * Yield - static_hoop) * 2e / D
    const staticHoopMpa = (staticPressureMpa * D) / (2.0 * e);
    const maxAllowableSurgeHoopMpa = Math.max(10.0, 0.60 * geometry.designYieldStrengthMpa - staticHoopMpa);
    const maxAllowableSurgePressurePa = (maxAllowableSurgeHoopMpa * 1e6 * 2.0 * e) / D;
    const recommendedMinClosureTimeSeconds = Math.max(
      reflectionTime * 1.5,
      (2.0 * geometry.lengthMeters * rho * flow.initialFlowVelocityMps) / maxAllowableSurgePressurePa
    );

    return {
      penstockId: geometry.penstockId,
      acousticWaveSpeedMps: Math.round(waveSpeed * 10) / 10,
      reflectionTimeSeconds: Math.round(reflectionTime * 1000) / 1000,
      isDirectWaterHammer: isDirect,
      joukowskyPressureSurgeMpa: Math.round(joukowskySurgeMpa * 100) / 100,
      maximumTransientPressureMpa: Math.round(maxTransientPressureMpa * 100) / 100,
      dynamicHoopStressMpa: Math.round(hoopStressMpa * 100) / 100,
      stressRatioToYieldPct: Math.round(stressRatioPct * 10) / 10,
      acousticFundamentalResonanceHz: Math.round(fundamentalResonanceHz * 100) / 100,
      cavitationSeverity,
      severity,
      governorValveDampingRecommended,
      recommendedMinClosureTimeSeconds: Math.round(recommendedMinClosureTimeSeconds * 100) / 100,
      analyzedAt: new Date().toISOString(),
    };
  }
}
