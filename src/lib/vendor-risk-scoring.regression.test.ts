/**
 * Regression Test Suite for QA-131: Continuous Automated Vendor Risk Scoring & Multi-Cloud Alerting Webhook.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import {
  VendorRiskScorer,
  SecurityIncidentSignal,
  VendorRiskLevel
} from "./vendor-risk-scoring";

describe("QA-131: Continuous Automated Vendor Risk Scoring & Multi-Cloud Alerting Webhook", () => {
  it("classifies risk scores into appropriate risk levels", () => {
    expect(VendorRiskScorer.determineLevel(10)).toBe("LOW");
    expect(VendorRiskScorer.determineLevel(35)).toBe("MEDIUM");
    expect(VendorRiskScorer.determineLevel(55)).toBe("HIGH");
    expect(VendorRiskScorer.determineLevel(85)).toBe("CRITICAL");
  });

  it("calculates cumulative dynamic risk penalty clamped to 100", () => {
    const signals: SecurityIncidentSignal[] = [
      {
        signalId: "sig-1",
        vendorId: "v-1",
        vendorName: "Cloud Vendor",
        incidentType: "SOC2_LAPSE",
        severityScore: 25,
        description: "SOC 2 Type II expired without bridge letter",
        detectedAtIso: new Date().toISOString(),
      },
      {
        signalId: "sig-2",
        vendorId: "v-1",
        vendorName: "Cloud Vendor",
        incidentType: "CVE_CRITICAL",
        severityScore: 35,
        description: "Zero-day vulnerability reported in API gateway",
        detectedAtIso: new Date().toISOString(),
      }
    ];

    const score = VendorRiskScorer.calculateDynamicScore(20, signals);
    expect(score).toBe(80); // 20 + 25 + 35 = 80
  });

  it("triggers HMAC-signed multi-cloud escalation alert on escalation to CRITICAL", () => {
    const criticalSignal: SecurityIncidentSignal = {
      signalId: "sig-breach",
      vendorId: "v-cdn",
      vendorName: "Edge CDN Global",
      incidentType: "DATA_BREACH",
      severityScore: 60,
      description: "Confirmed exfiltration incident reported",
      detectedAtIso: new Date().toISOString(),
    };

    const result = VendorRiskScorer.evaluateVendorRisk(
      "v-cdn",
      "Edge CDN Global",
      25, // Base: LOW/MEDIUM
      "MEDIUM",
      [criticalSignal],
      "super_secret_webhook_key"
    );

    expect(result.updatedState.currentLevel).toBe("CRITICAL");
    expect(result.escalationAlert).not.toBeNull();
    expect(result.escalationAlert?.eventType).toBe("VENDOR_RISK_ESCALATION");
    expect(result.escalationAlert?.destinationChannels).toContain("PAGERDUTY");
    expect(result.escalationAlert?.destinationChannels).toContain("SLACK");
    expect(result.escalationAlert?.hmacSignatureHex).toBeDefined();
    expect(result.escalationAlert?.hmacSignatureHex.length).toBe(64);
  });

  it("does not trigger escalation alert when risk stays within same level", () => {
    const result = VendorRiskScorer.evaluateVendorRisk(
      "v-stable",
      "Stable Storage Corp",
      15,
      "LOW",
      [], // No new incidents
      "secret"
    );

    expect(result.updatedState.currentLevel).toBe("LOW");
    expect(result.escalationAlert).toBeNull();
  });
});
