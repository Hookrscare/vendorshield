/**
 * Regression test for QA-144: Continuous Sub-Processor Incident Blast Radius & Impact Analyzer.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SubProcessorIncidentBlastRadiusAnalyzer,
  SubProcessorProfile,
  TenantDependency,
  IncidentAlert
} from "./subprocessor-incident-blast-radius";

describe("SubProcessorIncidentBlastRadiusAnalyzer (QA-144)", () => {
  let analyzer: SubProcessorIncidentBlastRadiusAnalyzer;

  beforeEach(() => {
    analyzer = new SubProcessorIncidentBlastRadiusAnalyzer();

    const mockProcessors: SubProcessorProfile[] = [
      {
        id: "proc-stripe",
        name: "Stripe, Inc.",
        category: "PAYMENT_GATEWAY",
        dataClassificationsHandled: ["PII", "PCI_DSS"],
        isSinglePointOfFailure: true,
        dpaSigned: true,
        slaUptimePercent: 99.99
      },
      {
        id: "proc-openai",
        name: "OpenAI, LLC",
        category: "AI_LLM",
        dataClassificationsHandled: ["CONFIDENTIAL", "PII"],
        isSinglePointOfFailure: false,
        dpaSigned: true,
        slaUptimePercent: 99.5
      }
    ];

    const mockTenants: TenantDependency[] = [
      {
        tenantId: "ten-alpha",
        tenantName: "Acme Enterprise Corp",
        tier: "ENTERPRISE",
        activeSubProcessors: ["proc-stripe", "proc-openai"],
        hasPhiData: false,
        hasPciData: true
      },
      {
        tenantId: "ten-beta",
        tenantName: "Starter Startup LLC",
        tier: "PRO",
        activeSubProcessors: ["proc-stripe"],
        hasPhiData: false,
        hasPciData: false
      }
    ];

    mockProcessors.forEach(p => analyzer.registerSubProcessor(p));
    analyzer.registerTenants(mockTenants);
  });

  it("calculates critical blast radius and 72-hour GDPR notification deadline on Stripe breach", () => {
    const alert: IncidentAlert = {
      incidentId: "inc-2026-001",
      subProcessorId: "proc-stripe",
      incidentType: "DATA_BREACH",
      reportedAtIso: "2026-09-09T00:00:00.000Z",
      isConfirmedDataExfiltration: true,
      description: "Credential stuffing attack and API key compromise detected on payment gateway."
    };

    const assessment = analyzer.analyzeIncidentBlastRadius(alert);

    expect(assessment.incidentId).toBe("inc-2026-001");
    expect(assessment.totalAffectedTenants).toBe(2);
    expect(assessment.affectedEnterpriseTenants).toBe(1);
    expect(assessment.severityScore).toBeGreaterThanOrEqual(80);
    expect(assessment.regulatoryObligations.gdprArticle33BreachNotificationRequired).toBe(true);
    expect(assessment.regulatoryObligations.gdprNotificationDeadlineIso).toBe("2026-09-12T00:00:00.000Z");
    expect(assessment.remediationActionItems.length).toBeGreaterThanOrEqual(3);
    expect(assessment.auditDossierSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("evaluates lower severity for non-exfiltration transient outage", () => {
    const alert: IncidentAlert = {
      incidentId: "inc-2026-002",
      subProcessorId: "proc-openai",
      incidentType: "CRITICAL_OUTAGE",
      reportedAtIso: "2026-09-09T10:00:00.000Z",
      isConfirmedDataExfiltration: false,
      description: "API inference latency degradation across us-east."
    };

    const assessment = analyzer.analyzeIncidentBlastRadius(alert);

    expect(assessment.severityScore).toBeLessThan(50);
    expect(assessment.regulatoryObligations.gdprArticle33BreachNotificationRequired).toBe(false);
    expect(assessment.regulatoryObligations.gdprNotificationDeadlineIso).toBeNull();
  });
});
