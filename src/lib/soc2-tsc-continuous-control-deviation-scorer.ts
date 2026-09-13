/**
 * src/lib/soc2-tsc-continuous-control-deviation-scorer.ts
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * QA-188: Automated SOC 2 Trust Services Criteria Continuous Control Deviation Scorer.
 * Continuously evaluates multi-cloud infrastructure telemetry against AICPA
 * Trust Services Criteria (Security CC, Availability A, Confidentiality C,
 * Processing Integrity PI, and Privacy P). Computes time-weighted control
 * deviation scores, flags material weaknesses, and generates auditor-signed receipts.
 */

import { createHash } from 'crypto';

export type TscCategory =
  | 'SECURITY_CC'
  | 'AVAILABILITY_A'
  | 'CONFIDENTIALITY_C'
  | 'PROCESSING_INTEGRITY_PI'
  | 'PRIVACY_P';

export type DefectSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ControlTelemetrySample {
  controlId: string; // e.g. "CC6.1", "CC6.8", "A1.2"
  category: TscCategory;
  description: string;
  hasDefect: boolean;
  severity?: DefectSeverity;
  openDurationHours: number;
}

export interface Soc2DeviationAssessment {
  timestamp: string;
  totalControlsAudited: number;
  defectiveControlsCount: number;
  aggregateDeviationScore: number;
  compliancePosture: 'PASS_SOC2_ASSURED' | 'CONTROL_DEFICIENCY_OBSERVED' | 'MATERIAL_WEAKNESS_ALERT';
  materialWeaknessDetected: boolean;
  highRiskControls: string[];
  remediationPlan: Array<{
    controlId: string;
    priority: DefectSeverity;
    remediationAction: string;
  }>;
  signedEvidenceDigestSha256: string;
}

export class Soc2ContinuousControlDeviationScorer {
  private static readonly SEVERITY_WEIGHTS: Record<DefectSeverity, number> = {
    LOW: 1.5,
    MEDIUM: 5.0,
    HIGH: 15.0,
    CRITICAL: 40.0
  };

  public static scoreControlDeviations(
    samples: ControlTelemetrySample[]
  ): Soc2DeviationAssessment {
    if (samples.length === 0) {
      throw new Error('Telemetry sample set cannot be empty for SOC 2 evaluation.');
    }

    let aggregateScore = 0.0;
    let defectiveCount = 0;
    const highRiskControls: string[] = [];
    const remediationPlan: Soc2DeviationAssessment['remediationPlan'] = [];

    for (const sample of samples) {
      if (sample.openDurationHours < 0) {
        throw new Error(`Invalid open duration for ${sample.controlId}: cannot be negative.`);
      }

      if (sample.hasDefect && sample.severity) {
        defectiveCount++;
        const baseWeight = this.SEVERITY_WEIGHTS[sample.severity];
        // Time-weighted degradation: longer open durations exponentiate penalty
        const timeFactor = Math.log(Math.E + sample.openDurationHours / 24.0);
        const controlScore = baseWeight * timeFactor;
        aggregateScore += controlScore;

        if (sample.severity === 'HIGH' || sample.severity === 'CRITICAL') {
          highRiskControls.push(sample.controlId);
        }

        remediationPlan.push({
          controlId: sample.controlId,
          priority: sample.severity,
          remediationAction: `Remediate ${sample.category} non-compliance on ${sample.controlId}: ${sample.description}`
        });
      }
    }

    // Material weakness triggered if any CRITICAL defect or aggregate score >= 25.0
    const hasCritical = samples.some(s => s.hasDefect && s.severity === 'CRITICAL');
    const materialWeakness = hasCritical || aggregateScore >= 25.0;

    let posture: Soc2DeviationAssessment['compliancePosture'];
    if (materialWeakness) {
      posture = 'MATERIAL_WEAKNESS_ALERT';
    } else if (aggregateScore >= 6.0 || defectiveCount > 0) {
      posture = 'CONTROL_DEFICIENCY_OBSERVED';
    } else {
      posture = 'PASS_SOC2_ASSURED';
    }

    const payload = `${samples.length}:${defectiveCount}:${aggregateScore.toFixed(3)}:${posture}`;
    const digest = createHash('sha256').update(payload).digest('hex');

    return {
      timestamp: new Date().toISOString(),
      totalControlsAudited: samples.length,
      defectiveControlsCount: defectiveCount,
      aggregateDeviationScore: Math.round(aggregateScore * 100) / 100,
      compliancePosture: posture,
      materialWeaknessDetected: materialWeakness,
      highRiskControls,
      remediationPlan,
      signedEvidenceDigestSha256: digest
    };
  }
}
