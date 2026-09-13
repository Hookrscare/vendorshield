import { describe, it, expect } from 'vitest';
import {
  Soc2TscContinuousControlDeviationScorer,
  ControlDeviationEvent
} from './soc2-tsc-continuous-control-deviation-scorer';

describe('QA-188: Soc2TscContinuousControlDeviationScorer', () => {
  const scorer = new Soc2TscContinuousControlDeviationScorer(35.0, 75.0);

  it('evaluates clean environment with 0 deviations', () => {
    const report = scorer.evaluateDeviations([]);
    expect(report.totalDeviations).toBe(0);
    expect(report.aggregateRiskScore).toBe(0);
    expect(report.auditOpinionForecast).toBe('CLEAN_UNQUALIFIED');
    expect(report.isAuditorDisclosureMandatory).toBe(false);
  });

  it('mitigates risk when compensating controls are operational', () => {
    const deviations: ControlDeviationEvent[] = [
      {
        eventId: 'DEV-001',
        criteriaCode: 'CC6.1',
        category: 'SECURITY',
        description: 'Temporary bypass of bastion host for emergency prod patch',
        durationHours: 12,
        affectedAssetsCount: 2,
        totalPopulationAssets: 100,
        hasCompensatingControl: true,
        compensatingControlDescription: 'Session recorded with AWS CloudTrail and full dual-engineer signoff'
      }
    ];

    const report = scorer.evaluateDeviations(deviations);
    expect(report.totalDeviations).toBe(1);
    // Rate is 2% (< 5%), mitigated risk should be small
    expect(report.aggregateRiskScore).toBeLessThan(10);
    expect(report.auditOpinionForecast).toBe('CLEAN_UNQUALIFIED');
  });

  it('triggers qualified exception risk on widespread uncompensated deviation', () => {
    const deviations: ControlDeviationEvent[] = [
      {
        eventId: 'DEV-SEVERE',
        criteriaCode: 'CC7.1',
        category: 'SECURITY',
        description: 'Vulnerability scanner disabled across production subnet',
        durationHours: 96, // > 72h
        affectedAssetsCount: 45,
        totalPopulationAssets: 100, // 45% deviation rate!
        hasCompensatingControl: false
      }
    ];

    const report = scorer.evaluateDeviations(deviations);
    expect(report.isAuditorDisclosureMandatory).toBe(true);
    expect(report.auditOpinionForecast).toMatch(/QUALIFIED_EXCEPTION_RISK|ADVERSE_OPINION_RISK/);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});
