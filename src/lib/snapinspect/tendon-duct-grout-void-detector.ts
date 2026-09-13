/**
 * tendon-duct-grout-void-detector.ts
 * SNAP-62: Prestressed Concrete Reactor Pressure Vessel (PCRPV) Tendon Duct Grouting Void Detector.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * Evaluates impact-echo (IE) and ultrasonic pulse resonance across post-tensioned tendon ducts:
 * 1. Computes nominal solid wall thickness resonance frequency: f_solid = (beta * C_p) / (2 * T).
 * 2. Identifies duct reflection frequency shifts: f_duct = (beta * C_p) / (2 * d_cover).
 * 3. Evaluates acoustic impedance boundary: solid grout transmission vs air void boundary reflection.
 * 4. Generates Grout Void Severity Index (GVSI) and marks repair points for vacuum-assisted grout injection.
 */

export interface ConcreteAcousticProperties {
  pWaveVelocityMPerSec: number;   // C_p, typically ~ 4000 m/s for high-strength nuclear concrete
  concreteThicknessMeters: number; // Overall wall thickness T, e.g. 1.5 meters
  ductNominalDepthMeters: number;  // Distance from surface to tendon duct d_cover, e.g. 0.25 meters
  geometricFactorBeta?: number;    // Typically 0.96 for plate structures
}

export interface ImpactEchoSounding {
  stationId: string;
  ductLinearPositionMeters: number; // Distance along tendon duct path
  dominantFrequencyKhz: number;     // Measured resonant frequency
  peakAmplitudeDb: number;
}

export interface DuctVoidAssessment {
  stationId: string;
  positionMeters: number;
  condition: 'FULLY_GROUTED' | 'SUSPECTED_HONEYCOMBING' | 'CRITICAL_AIR_VOID';
  groutVoidSeverityIndex: number;  // 0.0 (perfect) to 1.0 (complete air void)
  detectedDepthMeters: number;
  repairRequired: boolean;
}

export interface DuctInspectionReport {
  ductId: string;
  totalSoundings: number;
  voidLocationsCount: number;
  maxSeverityIndex: number;
  containmentIntegrityStatus: 'COMPLIANT' | 'REPAIR_INTERVENTION_MANDATORY';
  soundingsAssessment: DuctVoidAssessment[];
  recommendedRepairs: string[];
}

export class TendonDuctGroutVoidDetector {
  /**
   * Evaluates impact-echo soundings along a post-tensioned tendon duct.
   */
  public static evaluateDuct(
    ductId: string,
    concrete: ConcreteAcousticProperties,
    soundings: ImpactEchoSounding[]
  ): DuctInspectionReport {
    const beta = concrete.geometricFactorBeta ?? 0.96;
    const cp = concrete.pWaveVelocityMPerSec;

    // Resonant frequency for back wall reflection (solid transmission)
    // f_wall = (beta * Cp) / (2 * T) in kHz
    const expectedSolidFreqKhz = ((beta * cp) / (2.0 * concrete.concreteThicknessMeters)) / 1000.0;

    // Resonant frequency if reflecting early off an air-filled duct void
    // f_void = (beta * Cp) / (2 * d_cover) in kHz
    const expectedVoidFreqKhz = ((beta * cp) / (2.0 * concrete.ductNominalDepthMeters)) / 1000.0;

    const assessments: DuctVoidAssessment[] = [];
    const repairs: string[] = [];
    let maxSeverity = 0.0;
    let voidCount = 0;

    for (const s of soundings) {
      // Frequency difference ratio: how close is measured f to expected void f
      const voidFreqDiff = Math.abs(s.dominantFrequencyKhz - expectedVoidFreqKhz);
      const solidFreqDiff = Math.abs(s.dominantFrequencyKhz - expectedSolidFreqKhz);

      let condition: DuctVoidAssessment['condition'] = 'FULLY_GROUTED';
      let gvsi = 0.0;
      let depth = concrete.concreteThicknessMeters;

      if (voidFreqDiff < 1.2 && s.peakAmplitudeDb > 25.0) {
        // High frequency reflection matching duct depth with strong resonance amplitude
        condition = 'CRITICAL_AIR_VOID';
        gvsi = Math.min(1.0, 0.70 + (s.peakAmplitudeDb / 100.0));
        depth = concrete.ductNominalDepthMeters;
        voidCount++;
        repairs.push(`VACUUM_GROUT_INJECTION: Station ${s.stationId} at ${s.ductLinearPositionMeters}m (Void Severity: ${Math.round(gvsi * 100)}%).`);
      } else if (s.dominantFrequencyKhz > expectedSolidFreqKhz * 1.3 && s.dominantFrequencyKhz < expectedVoidFreqKhz) {
        condition = 'SUSPECTED_HONEYCOMBING';
        gvsi = 0.45;
        depth = Math.round(((beta * cp) / (2.0 * s.dominantFrequencyKhz * 1000.0)) * 100) / 100;
        voidCount++;
      } else {
        condition = 'FULLY_GROUTED';
        gvsi = 0.05;
        depth = concrete.concreteThicknessMeters;
      }

      if (gvsi > maxSeverity) maxSeverity = gvsi;

      assessments.push({
        stationId: s.stationId,
        positionMeters: s.ductLinearPositionMeters,
        condition,
        groutVoidSeverityIndex: Math.round(gvsi * 100) / 100,
        detectedDepthMeters: depth,
        repairRequired: condition !== 'FULLY_GROUTED'
      });
    }

    const integrityStatus = voidCount === 0 ? 'COMPLIANT' : 'REPAIR_INTERVENTION_MANDATORY';

    return {
      ductId,
      totalSoundings: soundings.length,
      voidLocationsCount: voidCount,
      maxSeverityIndex: Math.round(maxSeverity * 100) / 100,
      containmentIntegrityStatus: integrityStatus,
      soundingsAssessment: assessments,
      recommendedRepairs: repairs
    };
  }
}
