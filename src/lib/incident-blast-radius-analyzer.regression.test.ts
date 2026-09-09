import { describe, it, expect } from "vitest";
import {
  SubprocessorIncidentBlastRadiusAnalyzer,
  SecurityIncidentDeclaration,
  SubprocessorServiceDependency
} from "./incident-blast-radius-analyzer";

describe("QA-144: Continuous Sub-Processor Incident Blast Radius & Impact Analyzer", () => {
  const dependencies: SubprocessorServiceDependency[] = [
    {
      subprocessorId: "sub_twilio_01",
      subprocessorName: "Twilio Communications",
      serviceName: "SMS 2FA Authentication",
      dataClassification: "RESTRICTED_PII",
      criticality: "TIER_1_MISSION_CRITICAL",
      affectedTenantIds: ["tenant_acme", "tenant_globex", "tenant_stark"]
    },
    {
      subprocessorId: "sub_stripe_01",
      subprocessorName: "Stripe Payments",
      serviceName: "Subscription Processing",
      dataClassification: "HIGHLY_REGULATED_PHI_PCI",
      criticality: "TIER_1_MISSION_CRITICAL",
      affectedTenantIds: ["tenant_acme", "tenant_wayne"]
    }
  ];

  const analyzer = new SubprocessorIncidentBlastRadiusAnalyzer(dependencies);

  it("calculates high blast radius score and regulatory reporting for critical data breach", () => {
    const incident: SecurityIncidentDeclaration = {
      incidentId: "inc_tw_20260909",
      subprocessorId: "sub_twilio_01",
      detectedAtIso: "2026-09-09T00:00:00Z",
      incidentType: "DATA_BREACH",
      severity: "CRITICAL",
      description: "Unauthorized exfiltration of SMS routing metadata."
    };

    // Evaluated 12 hours after detection
    const evalTimeIso = "2026-09-09T12:00:00Z";
    const report = analyzer.evaluateIncidentBlastRadius(incident, evalTimeIso);

    expect(report.overallBlastRadiusScore).toBeGreaterThanOrEqual(80);
    expect(report.totalTenantsExposed).toBe(3);
    expect(report.affectedTenants).toEqual(["tenant_acme", "tenant_globex", "tenant_stark"]);
    expect(report.exposedDataLevels).toContain("RESTRICTED_PII");
    expect(report.regulatoryDeadlines.requiresRegulatoryReporting).toBe(true);
    expect(report.regulatoryDeadlines.gdprArticle33HoursRemaining).toBe(60); // 72 - 12 = 60h
    expect(report.containmentRecommendations.length).toBeGreaterThanOrEqual(2);
    expect(report.tamperSeal).toMatch(/^[a-f0-9]{64}$/);
  });

  it("evaluates low blast radius for non-critical isolated vendor outage", () => {
    const incident: SecurityIncidentDeclaration = {
      incidentId: "inc_analytics_down",
      subprocessorId: "sub_analytics_noncritical",
      detectedAtIso: "2026-09-09T01:00:00Z",
      incidentType: "SYSTEM_OUTAGE",
      severity: "LOW",
      description: "Intermittent delay in marketing telemetry ingestion."
    };

    const report = analyzer.evaluateIncidentBlastRadius(incident);
    expect(report.totalTenantsExposed).toBe(0);
    expect(report.overallBlastRadiusScore).toBeLessThan(30);
    expect(report.regulatoryDeadlines.requiresRegulatoryReporting).toBe(false);
  });

  it("generates actionable containment playbooks on credential compromise", () => {
    const incident: SecurityIncidentDeclaration = {
      incidentId: "inc_stripe_key_leak",
      subprocessorId: "sub_stripe_01",
      detectedAtIso: "2026-09-09T02:00:00Z",
      incidentType: "CREDENTIAL_COMPROMISE",
      severity: "HIGH",
      description: "Compromised third-party API webhook signing secret."
    };

    const report = analyzer.evaluateIncidentBlastRadius(incident);
    expect(report.containmentRecommendations.some((r) => r.includes("Immediately revoke"))).toBe(true);
    expect(report.containmentRecommendations.some((r) => r.includes("circuit breaker"))).toBe(true);
  });
});
