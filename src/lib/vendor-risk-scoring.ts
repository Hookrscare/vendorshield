/**
 * QA-131: Continuous Automated Vendor Risk Scoring & Multi-Cloud Alerting Webhook.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Evaluates real-time vendor risk scores based on security controls, multi-cloud hosting,
 * vulnerability exposure, and data residency. Emits HMAC-signed multi-cloud webhooks.
 */

import { createHmac, createHash } from "crypto";

export type VendorTier = "TIER_1_CRITICAL" | "TIER_2_SIGNIFICANT" | "TIER_3_LOW";
export type CloudProvider = "AWS" | "GCP" | "AZURE" | "CLOUDFLARE" | "ON_PREM";
export type AlertSeverity = "P1_CRITICAL" | "P2_HIGH" | "P3_MEDIUM" | "P4_INFO";

export interface VendorRiskInput {
  vendorId: string;
  vendorName: string;
  tier: VendorTier;
  cloudProviders: CloudProvider[];
  dataResidencyCompliant: boolean;
  hasSoc2Type2: boolean;
  hasIso27001: boolean;
  dpaSigned: boolean;
  unresolvedCveCount: number;
  maxCvssScore: number; // 0.0 - 10.0
  uptimeSlaPct: number;
}

export interface VendorRiskScoreResult {
  vendorId: string;
  vendorName: string;
  riskScore: number; // 0 (safest) to 100 (highest risk)
  riskCategory: "LOW" | "MODERATE" | "ELEVATED" | "CRITICAL";
  alertRequired: boolean;
  severity: AlertSeverity;
  contributingFactors: string[];
}

export interface MultiCloudWebhookPayload {
  eventId: string;
  timestampIso: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  severity: AlertSeverity;
  riskScore: number;
  message: string;
  affectedCloudProviders: CloudProvider[];
  signatureHmacSha256: string;
}

export class VendorRiskScoringEngine {
  private webhookSecret: string;

  constructor(webhookSecret: string = "default_vendorshield_secret_key_2026") {
    this.webhookSecret = webhookSecret;
  }

  public calculateRisk(input: VendorRiskInput): VendorRiskScoreResult {
    let score = 10; // Baseline low risk
    const factors: string[] = [];

    // Tier weighting
    if (input.tier === "TIER_1_CRITICAL") {
      score += 25;
      factors.push("Tier 1 Critical core infrastructure dependency");
    } else if (input.tier === "TIER_2_SIGNIFICANT") {
      score += 15;
    }

    // Security certifications
    if (!input.hasSoc2Type2) {
      score += 20;
      factors.push("Missing verified SOC 2 Type II attestation");
    }
    if (!input.hasIso27001) {
      score += 10;
    }
    if (!input.dpaSigned) {
      score += 20;
      factors.push("Missing executed GDPR Data Processing Agreement");
    }

    // Data residency
    if (!input.dataResidencyCompliant) {
      score += 25;
      factors.push("Cross-border data transfer violates regional residency guardrails");
    }

    // Vulnerabilities
    if (input.maxCvssScore >= 9.0) {
      score += 30;
      factors.push(`Critical CVE vulnerability detected (CVSS ${input.maxCvssScore})`);
    } else if (input.maxCvssScore >= 7.0) {
      score += 15;
      factors.push(`High CVE vulnerability detected (CVSS ${input.maxCvssScore})`);
    }

    if (input.unresolvedCveCount > 3) {
      score += 10;
      factors.push(`${input.unresolvedCveCount} unresolved vulnerabilities pending patch`);
    }

    // SLA reliability
    if (input.uptimeSlaPct < 99.0) {
      score += 15;
      factors.push(`Uptime SLA degraded to ${input.uptimeSlaPct}%`);
    }

    const clampedScore = Math.min(100, Math.max(0, score));

    let riskCategory: "LOW" | "MODERATE" | "ELEVATED" | "CRITICAL";
    let severity: AlertSeverity;
    let alertRequired = false;

    if (clampedScore >= 75) {
      riskCategory = "CRITICAL";
      severity = "P1_CRITICAL";
      alertRequired = true;
    } else if (clampedScore >= 55) {
      riskCategory = "ELEVATED";
      severity = "P2_HIGH";
      alertRequired = true;
    } else if (clampedScore >= 35) {
      riskCategory = "MODERATE";
      severity = "P3_MEDIUM";
      alertRequired = false;
    } else {
      riskCategory = "LOW";
      severity = "P4_INFO";
      alertRequired = false;
    }

    return {
      vendorId: input.vendorId,
      vendorName: input.vendorName,
      riskScore: clampedScore,
      riskCategory,
      alertRequired,
      severity,
      contributingFactors: factors,
    };
  }

  public createWebhookPayload(
    tenantId: string,
    riskResult: VendorRiskScoreResult,
    cloudProviders: CloudProvider[]
  ): MultiCloudWebhookPayload {
    const timestampIso = new Date().toISOString();
    const eventId = `evt_${createHash("sha256")
      .update(`${tenantId}:${riskResult.vendorId}:${timestampIso}`)
      .digest("hex")
      .slice(0, 16)}`;

    const message = `VendorShield Alert: ${riskResult.vendorName} escalated to ${riskResult.riskCategory} risk (Score: ${riskResult.riskScore}). Factors: ${riskResult.contributingFactors.join("; ")}`;

    const rawPayload = `${eventId}:${timestampIso}:${tenantId}:${riskResult.vendorId}:${riskResult.riskScore}:${riskResult.severity}`;
    const signatureHmacSha256 = createHmac("sha256", this.webhookSecret)
      .update(rawPayload)
      .digest("hex");

    return {
      eventId,
      timestampIso,
      tenantId,
      vendorId: riskResult.vendorId,
      vendorName: riskResult.vendorName,
      severity: riskResult.severity,
      riskScore: riskResult.riskScore,
      message,
      affectedCloudProviders: cloudProviders,
      signatureHmacSha256,
    };
  }

  public verifyWebhookSignature(payload: MultiCloudWebhookPayload): boolean {
    const rawPayload = `${payload.eventId}:${payload.timestampIso}:${payload.tenantId}:${payload.vendorId}:${payload.riskScore}:${payload.severity}`;
    const expected = createHmac("sha256", this.webhookSecret)
      .update(rawPayload)
      .digest("hex");
    return expected === payload.signatureHmacSha256;
  }
}
