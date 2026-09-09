import { describe, it, expect } from 'vitest';
import {
  createIncidentRunbook,
  completeRunbookTask,
  generateCustomerSecurityAdvisory,
  generateStandardRunbookTasks
} from './incident-runbook';

describe('QA-125: Real-Time Sub-Processor Incident Response Runbook & Notification Flow', () => {
  it('generates standard runbook tasks with tight SLAs for critical incidents', () => {
    const criticalTasks = generateStandardRunbookTasks('SEV0_CRITICAL');
    const lowTasks = generateStandardRunbookTasks('SEV3_LOW');

    const criticalTriage = criticalTasks.find(t => t.id === 'task-detect-01');
    const lowTriage = lowTasks.find(t => t.id === 'task-detect-01');

    expect(criticalTriage?.slaMinutes).toBe(15);
    expect(lowTriage?.slaMinutes).toBe(60);
  });

  it('initializes incident runbook with statutory 72h regulatory deadline for SEV1_HIGH', () => {
    const fixedIso = '2026-09-08T12:00:00.000Z';
    const incident = createIncidentRunbook(
      'sub-stripe-01',
      'Stripe Payments',
      'SEV1_HIGH',
      'Unauthorized Webhook Signature Mutation',
      ['tenant-alpha', 'tenant-beta'],
      fixedIso
    );

    expect(incident.severity).toBe('SEV1_HIGH');
    expect(incident.currentStage).toBe('DETECTED');
    expect(incident.regulatoryNoticeRequired).toBe(true);

    const deadline = new Date(incident.regulatoryNoticeDeadline);
    const detected = new Date(fixedIso);
    const diffHours = (deadline.getTime() - detected.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBe(72);
  });

  it('completes runbook tasks and automatically advances incident stages', () => {
    const incident = createIncidentRunbook(
      'sub-aws-s3',
      'Amazon S3 US-East-1',
      'SEV0_CRITICAL',
      'Bucket Access Policy Leak',
      ['tenant-1']
    );

    expect(incident.currentStage).toBe('DETECTED');

    // Complete triage in DETECTED stage
    const updated1 = completeRunbookTask(incident, 'task-detect-01', 'security_officer_alice');
    expect(updated1.runbookTasks.find(t => t.id === 'task-detect-01')?.completed).toBe(true);
    expect(updated1.currentStage).toBe('CONTAINMENT');

    // Complete containment tasks
    const updated2 = completeRunbookTask(updated1, 'task-contain-01', 'security_officer_alice');
    const updated3 = completeRunbookTask(updated2, 'task-contain-02', 'counsel_bob');
    expect(updated3.currentStage).toBe('ERADICATION');
  });

  it('generates customer-ready advisory markdown', () => {
    const incident = createIncidentRunbook(
      'sub-twilio',
      'Twilio Communications',
      'SEV1_HIGH',
      'SMS Gateway Routing Degradation',
      ['tenant-enterprise']
    );

    const advisory = generateCustomerSecurityAdvisory(incident);
    expect(advisory).toContain('# 🛡️ Customer Security Advisory: Sub-Processor Incident Notice');
    expect(advisory).toContain('Twilio Communications');
    expect(advisory).toContain('SEV1_HIGH');
    expect(advisory).toContain('VendorShield SOC');
  });
});
