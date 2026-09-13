export type TimberSpecies = 'douglas_fir' | 'southern_pine' | 'white_oak' | 'glulam';

export type DecaySeverity = 'sound' | 'incipient' | 'moderate' | 'severe_cavity';

export interface UltrasonicChordReading {
  chordId: string;
  angleDeg: number;
  pathLengthMm: number;
  transitTimeUs: number;
}

export interface ChordAnalysisResult {
  chordId: string;
  angleDeg: number;
  measuredVelocityMs: number;
  velocityLossPercent: number;
  severity: DecaySeverity;
}

export interface TimberTomographyAssessment {
  species: TimberSpecies;
  nominalDiameterMm: number;
  baselineVelocityMs: number;
  chordResults: ChordAnalysisResult[];
  soundWoodFraction: number; // 0.0 - 1.0
  residualSectionModulusRatio: number; // Z_eff / Z_0
  estimatedBendingCapacityLossPercent: number;
  overallCondition: DecaySeverity;
  recommendedAction: 'no_action_required' | 'routine_monitoring' | 'structural_sistering' | 'immediate_load_restriction_replacement';
}

export class StructuralTimberUltrasonicRotTomographer {
  private static readonly BASELINE_CROSS_GRAIN_VELOCITY: Record<TimberSpecies, number> = {
    douglas_fir: 1550,
    southern_pine: 1500,
    white_oak: 1700,
    glulam: 1600,
  };

  /**
   * Analyzes ultrasonic stress wave readings to map internal fungal rot and residual capacity.
   */
  public static analyzeCrossSection(
    species: TimberSpecies,
    nominalDiameterMm: number,
    chords: UltrasonicChordReading[],
    customBaselineVelocityMs?: number
  ): TimberTomographyAssessment {
    if (chords.length === 0) {
      throw new Error('At least one ultrasonic chord reading is required for tomography.');
    }

    const baselineVelocity = customBaselineVelocityMs ?? this.BASELINE_CROSS_GRAIN_VELOCITY[species];
    let severeCount = 0;
    let moderateCount = 0;
    let totalVelocityLoss = 0;

    const chordResults: ChordAnalysisResult[] = chords.map((chord) => {
      // Velocity (m/s) = (pathLengthMm / transitTimeUs) * 1000
      const measuredVelocityMs = Math.round((chord.pathLengthMm / chord.transitTimeUs) * 1000);
      const velocityLossPercent = Math.max(
        0,
        Math.round(((baselineVelocity - measuredVelocityMs) / baselineVelocity) * 100 * 10) / 10
      );

      let severity: DecaySeverity = 'sound';
      if (measuredVelocityMs < baselineVelocity * 0.5) {
        severity = 'severe_cavity';
        severeCount += 1;
      } else if (measuredVelocityMs < baselineVelocity * 0.75) {
        severity = 'moderate';
        moderateCount += 1;
      } else if (measuredVelocityMs < baselineVelocity * 0.9) {
        severity = 'incipient';
      }

      totalVelocityLoss += velocityLossPercent;

      return {
        chordId: chord.chordId,
        angleDeg: chord.angleDeg,
        measuredVelocityMs,
        velocityLossPercent,
        severity,
      };
    });

    const avgVelocityLoss = totalVelocityLoss / chords.length;
    const soundWoodFraction = Math.max(0.05, Math.min(1.0, 1.0 - avgVelocityLoss / 100));

    // Internal cavity diameter ratio: d_cavity / d_0 = sqrt(1 - soundWoodFraction)
    // Section modulus reduction: Z_eff / Z_0 = 1 - (d_cavity / d_0)^4 = 1 - (1 - soundWoodFraction)^2
    // For general degraded modulus, Z scales proportionally with sound wood fraction
    const cavityRatio = Math.sqrt(Math.max(0, 1.0 - soundWoodFraction));
    const hollowZRatio = 1.0 - Math.pow(cavityRatio, 4);
    // Combine geometry loss and material stiffness loss
    const residualSectionModulusRatio = Math.round(Math.min(hollowZRatio, Math.pow(soundWoodFraction, 1.2)) * 1000) / 1000;
    const estimatedBendingCapacityLossPercent = Math.round((1.0 - residualSectionModulusRatio) * 100 * 10) / 10;

    let overallCondition: DecaySeverity = 'sound';
    if (severeCount >= 2 || avgVelocityLoss >= 45) {
      overallCondition = 'severe_cavity';
    } else if (severeCount === 1 || moderateCount >= 2 || avgVelocityLoss >= 20) {
      overallCondition = 'moderate';
    } else if (moderateCount === 1 || avgVelocityLoss >= 10) {
      overallCondition = 'incipient';
    }

    let recommendedAction: TimberTomographyAssessment['recommendedAction'] = 'no_action_required';
    if (overallCondition === 'severe_cavity' || estimatedBendingCapacityLossPercent > 35) {
      recommendedAction = 'immediate_load_restriction_replacement';
    } else if (overallCondition === 'moderate' || estimatedBendingCapacityLossPercent > 15) {
      recommendedAction = 'structural_sistering';
    } else if (overallCondition === 'incipient') {
      recommendedAction = 'routine_monitoring';
    }

    return {
      species,
      nominalDiameterMm,
      baselineVelocityMs: baselineVelocity,
      chordResults,
      soundWoodFraction: Math.round(soundWoodFraction * 1000) / 1000,
      residualSectionModulusRatio,
      estimatedBendingCapacityLossPercent,
      overallCondition,
      recommendedAction,
    };
  }
}
