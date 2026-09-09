/**
 * QA-131: Continuous Automated Vendor Risk Scoring & Multi-Cloud Alerting Webhook.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Evaluates real-time security events, updates vendor dynamic composite risk scores,
 * detects threshold escalation events (e.g. transitioning to HIGH/CRITICAL),
 * and dispatches cryptographically signed webhook alerts (HMAC-SHA256) across multi-cloud receivers.
 */

import { createHmac, createHash } from "crypto";

export type VendorRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SecurityIncidentSignal {
  signalId: string;
  vendorId: string;
  vendorName: string;
  incidentType: "SOC2_LAPSE" | "DATA_BREACH" | "SLA_DEGRADATION" | "UNAUTHORIZED_SUBPROCESSOR" | "CVE_CRITICAL";
  severityScore: number; // 1 - 50
  description: string;
  detectedAtIso: string;
}

export interface DynamicVendorState {
  vendorId: string;
  vendorName: string;
  baseRiskScore: number; // 0 - 100
  activeSignals: SecurityIncidentSignal[];
  currentScore: number;
  currentLevel: VendorRiskLevel;
  previousLevel: VendorRiskLevel;
  lastEvaluatedIso: string;
}

export interface MultiCloudWebhookPayload {
  eventId: string;
  eventType: "VENDOR_RISK_ESCALATION" | "VENDOR_RISK_RESOLVED";
  timestampIso: string;
  vendorId: string;
  vendorName: string;
  previousRiskScore: number;
  newRiskScore: number;
  riskLevel: VendorRiskLevel;
  incidentSummary: string;
  destinationChannels: ("SLACK" | "PAGERDUTY" | "AWS_SNS" | "GCP_PUBSUB")[];
  hmacSignatureHex: string;
}

export class VendorRiskScorer {
  public static readonly HIGH_RISK_THRESHOLD = 50;
  public static readonly CRITICAL_RISK_THRESHOLD = 75;

  public static determineLevel(score: number): VendorRiskLevel {
    if (score >= this.CRITICAL_RISK_THRESHOLD) return "CRITICAL";
    if (score >= this.HIGH_RISK_THRESHOLD) return "HIGH";
    if (score >= 25) return "MEDIUM";
    return "LOW";
  }

  public static calculateDynamicScore(
    baseRiskScore: number,
    signals: SecurityIncidentSignal[]
  ): number {
    const signalPenalty = signals.reduce((acc, sig) => acc + sig.severityScore, 0);
    const total = baseRiskScore + signalPenalty;
    return Math.min(100, Math.max(0, Math.round(total)));
  }

  public static signPayload(payloadJsonString: string, secretKey: string): string {
    return createHmac("sha256", secretKey).update(payloadJsonString).digest("hex");
  }

  public static evaluateVendorRisk(
    vendorId: string,
    vendorName: string,
    baseRiskScore: number,
    previousLevel: VendorRiskLevel,
    newSignals: SecurityIncidentSignal[],
    webhookSecret: string = "vs_secret_multi_cloud_key_2026"
  ): {
    updatedState: DynamicVendorState;
    escalationAlert: MultiCloudWebhookPayload | null;
  } {
    const nowIso = new Date().toISOString();
    const newScore = this.calculateDynamicScore(baseRiskScore, newSignals);
    const newLevel = this.determineLevel(newScore);

    const updatedState: DynamicVendorState = {
      vendorId,
      vendorName,
      baseRiskScore,
      activeSignals: newSignals,
      currentScore: newScore,
      currentLevel: newLevel,
      previousLevel,
      lastEvaluatedIso: nowIso,
    };

    let escalationAlert: MultiCloudWebhookPayload | null = null;

    // Check for escalation condition (e.g. moved to HIGH or CRITICAL from lower tier)
    const isEscalation =
      (newLevel === "HIGH" && (previousLevel === "LOW" || previousLevel === "MEDIUM")) ||
      (newLevel === "CRITICAL" && previousLevel !== "CRITICAL");

    if (isEscalation) {
      const eventId = `evt_${createHash("sha256").update(`${vendorId}:${nowIso}:${newScore}`).digest("hex").slice(0, 16)}`;
      const rawPayload = {
        eventId,
        eventType: "VENDOR_RISK_ESCALATION" as const,
        timestampIso: nowIso,
        vendorId,
        vendorName,
        previousRiskScore: baseRiskScore,
        newRiskScore: newScore,
        riskLevel: newLevel,
        incidentSummary: newSignals.map((s) => s.description).join("; "),
        destinationChannels: ["SLACK", "PAGERDUTY", "AWS_SNS", "GCP_PUBSUB"] as ("SLACK" | "PAGERDUTY" | "AWS_SNS" | "GCP_PUBSUB")[],
      };

      const signature = this.signPayload(JSON.stringify(rawPayload), webhookSecret);

      escalationAlert = {
        ...rawPayload,
        hmacSignatureHex: signature,
      };
    }

    return {
      updatedState,
      escalationAlert,
    };
  }
}
