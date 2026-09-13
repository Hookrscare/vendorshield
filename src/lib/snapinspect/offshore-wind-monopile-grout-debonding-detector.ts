/**
 * SNAP-78: Offshore Wind Monopile Grout Annulus Ultrasonic Debonding Detector
 * Part of SnapInspect AI Mobile CAD & Tactical NDT Field Inspection Engine.
 * 
 * Complies with DNV-ST-0126 and DNV-OS-J101 for offshore wind foundation integrity.
 * Analyzes ultrasonic pulse-echo reflection coefficients (Z_steel vs Z_grout vs Z_water/void)
 * and steel plate acoustic ringdown reverberations to detect interfacial delamination and grout loss.
 */

export interface UltrasonicAcousticScanPoint {
  pointId: string;
  circumferentialAngleDeg: number; // 0 to 360 degrees
  elevationM: number;             // Depth relative to seabed / transition piece datum
  steelThicknessMm: number;        // Nominal steel wall thickness
  incidentAmplitudeV: number;      // Transmitted ultrasonic pulse peak voltage
  measuredBackwallAmplitudeV: number; // Measured first steel-grout interface echo
  reverberationEchoCount: number;  // Number of steel reverberation echoes above -12dB threshold
  timeOfFlightMicroSec: number;
}

export interface EvaluatedScanPoint {
  pointId: string;
  circumferentialAngleDeg: number;
  elevationM: number;
  reflectionCoefficient: number;
  isDebonded: boolean;
  fluidIngressDetected: boolean;
  debondingConfidencePct: number;
}

export interface MonopileGroutIntegrityReport {
  timestamp: string;
  totalPointsScanned: number;
  debondedPointsCount: number;
  debondedAreaPercentage: number;
  maxContinuousDebondedArcDeg: number;
  structuralIntegrityRating: 'INTACT_ACCEPTABLE' | 'DEGRADED_MONITORING_REQUIRED' | 'CRITICAL_REPAIR_MANDATORY';
  dnvComplianceStatus: 'COMPLIANT' | 'NON_COMPLIANT_STRUCTURAL_RISK';
  recommendations: string[];
  evaluatedPoints: EvaluatedScanPoint[];
}

export class OffshoreWindMonopileGroutDebondingDetector {
  // Acoustic impedances (x10^6 kg / (m^2 * s))
  private readonly Z_STEEL = 45.4;
  private readonly Z_GROUT_INTACT = 11.2;
  private readonly Z_WATER = 1.48;

  // Expected theoretical reflection coefficients:
  // Intact steel-grout: |(11.2 - 45.4) / (11.2 + 45.4)| = 0.604
  // Debonded water gap: |(1.48 - 45.4) / (1.48 + 45.4)| = 0.937
  // Debonded dry air gap: ~ 1.000

  private readonly INTEL_DEBOND_REFLECTION_THRESHOLD = 0.82;
  private readonly DNV_MAX_DEBONDED_AREA_PCT = 15.0; // DNV-ST-0126 limit
  private readonly DNV_MAX_CONTINUOUS_ARC_DEG = 45.0;

  public evaluateGroutAnnulus(scans: UltrasonicAcousticScanPoint[]): MonopileGroutIntegrityReport {
    if (!scans || scans.length === 0) {
      throw new Error('Ultrasonic scan points cannot be empty.');
    }

    const evaluatedPoints: EvaluatedScanPoint[] = [];
    let debondedCount = 0;

    for (const scan of scans) {
      if (scan.incidentAmplitudeV <= 0) {
        throw new Error(`Invalid incident amplitude for scan point ${scan.pointId}`);
      }

      const reflection = Math.min(
        1.0,
        Math.max(0.0, scan.measuredBackwallAmplitudeV / scan.incidentAmplitudeV)
      );

      // Debonding criteria: high reflection coefficient and high reverberation (low acoustic damping into grout)
      const isHighReflection = reflection >= this.INTEL_DEBOND_REFLECTION_THRESHOLD;
      const isHighRinging = scan.reverberationEchoCount >= 4;
      const isDebonded = isHighReflection || (reflection >= 0.75 && isHighRinging);

      // Fluid ingress (water filling debonded micro-gap): reflection ~ 0.85 - 0.95
      const fluidIngress = isDebonded && reflection >= 0.84 && reflection <= 0.96;

      let confidence = 0;
      if (isDebonded) {
        confidence = Math.min(99.0, Math.round((reflection / 1.0) * 85.0 + scan.reverberationEchoCount * 2.5));
        debondedCount++;
      } else {
        confidence = Math.round((1.0 - reflection) * 100.0);
      }

      evaluatedPoints.push({
        pointId: scan.pointId,
        circumferentialAngleDeg: scan.circumferentialAngleDeg,
        elevationM: scan.elevationM,
        reflectionCoefficient: Math.round(reflection * 1000) / 1000,
        isDebonded,
        fluidIngressDetected: fluidIngress,
        debondingConfidencePct: confidence
      });
    }

    const debondedAreaPct = Math.round((debondedCount / scans.length) * 10000) / 100;

    // Calculate max continuous debonded arc along circumferential angles
    let maxContinuousArc = 0;
    let currentArc = 0;
    const sorted = [...evaluatedPoints].sort((a, b) => a.circumferentialAngleDeg - b.circumferentialAngleDeg);

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].isDebonded) {
        const step = i > 0 ? sorted[i].circumferentialAngleDeg - sorted[i - 1].circumferentialAngleDeg : 0;
        currentArc += Math.max(10, step);
        if (currentArc > maxContinuousArc) maxContinuousArc = currentArc;
      } else {
        currentArc = 0;
      }
    }

    let rating: 'INTACT_ACCEPTABLE' | 'DEGRADED_MONITORING_REQUIRED' | 'CRITICAL_REPAIR_MANDATORY' = 'INTACT_ACCEPTABLE';
    let dnvCompliance: 'COMPLIANT' | 'NON_COMPLIANT_STRUCTURAL_RISK' = 'COMPLIANT';
    const recommendations: string[] = [];

    if (debondedAreaPct >= this.DNV_MAX_DEBONDED_AREA_PCT || maxContinuousArc >= this.DNV_MAX_CONTINUOUS_ARC_DEG) {
      rating = 'CRITICAL_REPAIR_MANDATORY';
      dnvCompliance = 'NON_COMPLIANT_STRUCTURAL_RISK';
      recommendations.push(
        'DNV-ST-0126 violation: Debonded grout annulus exceeds structural tolerance. Schedule pressurized elastomer/epoxy resin grout injection.'
      );
    } else if (debondedAreaPct > 5.0 || debondedCount > 0) {
      rating = 'DEGRADED_MONITORING_REQUIRED';
      recommendations.push(
        'Early-stage micro-debonding detected. Increase acoustic survey frequency to 6-month intervals and monitor wind turbine tower bending moments.'
      );
    } else {
      recommendations.push('Grout annulus structural bonding intact. Normal annual maintenance schedule approved.');
    }

    return {
      timestamp: new Date().toISOString(),
      totalPointsScanned: scans.length,
      debondedPointsCount: debondedCount,
      debondedAreaPercentage: debondedAreaPct,
      maxContinuousDebondedArcDeg: maxContinuousArc,
      structuralIntegrityRating: rating,
      dnvComplianceStatus: dnvCompliance,
      recommendations,
      evaluatedPoints
    };
  }
}
