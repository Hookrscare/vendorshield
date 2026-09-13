/**
 * src/lib/soc2-tsc-continuous-control-deviation-scorer.regression.test.ts
 * Unit tests for QA-188 Automated SOC 2 Continuous Control Deviation Scorer.
 */

import { describe, it, expect } from 'vitest';
import {
  Soc2ContinuousControlDeviationScorer,
  ControlTelemetrySample
} from './soc2-tsc-continuous-control-deviation-scorer';

describe('Soc2ContinuousControlDeviationScorer (QA-188)', () => {
  it('passes fully compliant SOC 2 control environments', () => {
    const controls: ControlTelemetrySample[] = [
      {
        controlId: 'CC6.1',
        category: 'SECURITY_CC',
        description: 'Logical access security perimeter enforced with MFA',
        hasDefect: false,
        openDurationHours: 0
      },
      {
        controlId: 'A1.2',
        category: 'AVAILABILITY_A',
        description: 'Environmental monitoring and redundancy failover active',
        hasDefect: false,
        openDurationHours: 0
      },
      {
        controlId: 'C1.1',
        category: 'CONFIDENTIALITY_C',
        description: 'Confidential data encrypted at rest with KMS keys',
        hasDefect: false,
        openDurationHours: 0
      }
    ];

    const res = Soc2ContinuousControlDeviationScorer.scoreControlDeviations(controls);
    expect(res.compliancePosture).toBe('PASS_SOC2_ASSURED');
    expect(res.defectiveControlsCount).toBe(0);
    expect(res.aggregateDeviationScore).toBe(0);
    expect(res.materialWeaknessDetected).toBe(false);
    expect(res.signedEvidenceDigestSha256).toHaveLength(64);
  });

  it('detects material weakness when critical control fails', () => {
    const controls: ControlTelemetrySample[] = [
      {
        controlId: 'CC6.8',
        category: 'SECURITY_CC',
        description: 'Prevent unauthorized remote software installation',
        hasDefect: true,
        severity: 'CRITICAL',
        openDurationHours: 48 // 2 days
      },
      {
        controlId: 'PI1.2',
        category: 'PROCESSING_INTEGRITY_PI',
        description: 'Transaction inputs verified',
        hasDefect: false,
        openDurationHours: 0
      }
    ];

    const res = Soc2ContinuousControlDeviationScorer.scoreControlDeviations(controls);
    expect(res.compliancePosture).toBe('MATERIAL_WEAKNESS_ALERT');
    expect(res.materialWeaknessDetected).toBe(true);
    expect(res.highRiskControls).toContain('CC6.8');
    expect(res.remediationPlan.length).toBe(1);
    expect(res.remediationPlan[0].priority).toBe('CRITICAL');
  });

  it('evaluates minor control deficiency without material weakness', () => {
    const controls: ControlTelemetrySample[] = [
      {
        controlId: 'CC2.1',
        category: 'SECURITY_CC',
        description: 'Annual policy acknowledgement sign-off',
        hasDefect: true,
        severity: 'LOW',
        openDurationHours: 12
      }
    ];

    const res = Soc2ContinuousControlDeviationScorer.scoreControlDeviations(controls);
    expect(res.compliancePosture).toBe('CONTROL_DEFICIENCY_OBSERVED');
    expect(res.materialWeaknessDetected).toBe(false);
    expect(res.highRiskControls).toHaveLength(0);
    expect(res.aggregateDeviationScore).toBeGreaterThan(0);
  });

  it('rejects empty control set', () => {
    expect(() =>
      Soc2ContinuousControlDeviationScorer.scoreControlDeviations([])
    ).toThrow('Telemetry sample set cannot be empty');
  });
});
