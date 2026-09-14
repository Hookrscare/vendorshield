import { describe, it, expect } from 'vitest';
import {
  VendorRiskReassessmentScheduler,
  VendorRiskProfile,
} from './vendor-risk-reassessment-scheduler';

describe('QA-117: Automated Vendor Risk Re-Assessment Scheduling Engine', () => {
  it('schedules baseline quarterly review for Tier 1 Critical vendors', () => {
    const profile: VendorRiskProfile = {
      vendorId: 'vend-aws-01',
      vendorName: 'AWS Cloud Services',
      inherentRiskTier: 'TIER_1_CRITICAL',
      lastAssessmentDateIso: '2026-06-01T00:00:00.000Z',
      hasProductionDataAccess: true,
      processesSensitivePii: true,
      recentSecurityIncident: false,
      openCriticalFindingCount: 0,
    };

    const schedule = VendorRiskReassessmentScheduler.calculateSchedule(
      profile,
      '2026-06-15T00:00:00.000Z'
    );

    expect(schedule.cycleIntervalDays).toBe(90);
    expect(schedule.isAccelerated).toBe(false);
    expect(new Date(schedule.scheduledDateIso).toISOString()).toBe('2026-08-30T00:00:00.000Z');
    expect(schedule.auditDigest.length).toBe(64);
  });

  it('accelerates review to 30 days upon security incident detection', () => {
    const profile: VendorRiskProfile = {
      vendorId: 'vend-saas-analytics-02',
      vendorName: 'Global Analytics Inc',
      inherentRiskTier: 'TIER_3_MEDIUM',
      lastAssessmentDateIso: '2026-08-01T00:00:00.000Z',
      hasProductionDataAccess: false,
      processesSensitivePii: false,
      recentSecurityIncident: true,
      openCriticalFindingCount: 1,
    };

    const schedule = VendorRiskReassessmentScheduler.calculateSchedule(
      profile,
      '2026-08-10T00:00:00.000Z'
    );

    expect(schedule.cycleIntervalDays).toBe(30);
    expect(schedule.isAccelerated).toBe(true);
    expect(schedule.accelerationReasons.some(r => r.includes('security incident'))).toBe(true);
    expect(schedule.accelerationReasons.some(r => r.includes('unresolved critical risk findings'))).toBe(true);
  });

  it('aligns review with upcoming SOC 2 report expiration', () => {
    const profile: VendorRiskProfile = {
      vendorId: 'vend-auth-03',
      vendorName: 'Auth Identity Cloud',
      inherentRiskTier: 'TIER_2_HIGH',
      lastAssessmentDateIso: '2026-01-01T00:00:00.000Z',
      soc2ReportExpiryIso: '2026-05-01T00:00:00.000Z',
      hasProductionDataAccess: true,
      processesSensitivePii: false,
      recentSecurityIncident: false,
      openCriticalFindingCount: 0,
    };

    const schedule = VendorRiskReassessmentScheduler.calculateSchedule(
      profile,
      '2026-01-15T00:00:00.000Z'
    );

    expect(schedule.isAccelerated).toBe(true);
    expect(schedule.accelerationReasons.some(r => r.includes('SOC 2'))).toBe(true);
    // Expiry May 1 minus 30 days = April 1
    expect(new Date(schedule.scheduledDateIso).toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });

  it('assigns 14-day urgent remediation when re-assessment is already overdue', () => {
    const profile: VendorRiskProfile = {
      vendorId: 'vend-crm-04',
      vendorName: 'Legacy CRM Provider',
      inherentRiskTier: 'TIER_1_CRITICAL',
      lastAssessmentDateIso: '2025-01-01T00:00:00.000Z', // over a year ago
      hasProductionDataAccess: true,
      processesSensitivePii: true,
      recentSecurityIncident: false,
      openCriticalFindingCount: 0,
    };

    const schedule = VendorRiskReassessmentScheduler.calculateSchedule(
      profile,
      '2026-09-01T00:00:00.000Z'
    );

    expect(schedule.isAccelerated).toBe(true);
    expect(schedule.accelerationReasons.some(r => r.includes('Overdue'))).toBe(true);
    expect(new Date(schedule.scheduledDateIso).toISOString()).toBe('2026-09-15T00:00:00.000Z');
  });
});
