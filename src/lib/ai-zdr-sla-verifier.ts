/**
 * QA-140: Multi-Tenant AI Sub-Processor Zero-Data Retention (ZDR) SLA Verifier.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Verifies and enforces Zero-Data Retention agreements across third-party LLM providers:
 * - Validates provider compliance against enterprise contractual commitments (OpenAI, Anthropic, AWS Bedrock, Google Vertex).
 * - Analyzes API telemetry headers for active ZDR flags and retention-bypass risks.
 * - Cryptographically audits prompt/completion transactions with ephemeral proof hashes.
 * - Produces CISO-ready SOC 2 & GDPR Art. 28 AI Sub-Processor Compliance Certificates.
 */

import { createHash } from "crypto";

export type AiProvider = "OPENAI_ENTERPRISE" | "ANTHROPIC_COMMERCIAL" | "AWS_BEDROCK" | "GOOGLE_VERTEX_AI" | "CUSTOM_SELF_HOSTED";

export interface ZdrPolicy {
  provider: AiProvider;
  contractualZdrActive: boolean;
  maxRetentionWindowHours: number; // 0 for strict ephemeral ZDR
  modelTrainingAllowed: boolean; // Must be false for compliance
  enforceAuditLogging: boolean;
  requiredHeaders: Record<string, string>;
}

export interface AiInferenceTelemetry {
  transactionId: string;
  tenantId: string;
  provider: AiProvider;
  modelIdentifier: string;
  timestampIso: string;
  requestHeaders: Record<string, string>;
  promptHash: string;
  completionHash: string;
  retentionWindowObservedHours: number;
}

export interface ZdrVerificationResult {
  verified: boolean;
  transactionId: string;
  tenantId: string;
  provider: AiProvider;
  violations: string[];
  riskScore: number; // 0 (perfect compliance) to 100 (critical breach)
  evidenceHash: string;
}

export interface AiZdrComplianceCertificate {
  certificateId: string;
  tenantId: string;
  generatedAtIso: string;
  totalTransactionsAudited: number;
  complianceRatePct: number;
  nonCompliantCount: number;
  status: "FULLY_COMPLIANT" | "FLAGGED_FOR_REVIEW" | "CRITICAL_BREACH";
  tamperSeal: string;
}

export class AiSubprocessorZdrVerifier {
  private registeredPolicies: Map<AiProvider, ZdrPolicy> = new Map();

  constructor() {
    this.registerDefaultPolicies();
  }

  private registerDefaultPolicies(): void {
    this.registeredPolicies.set("OPENAI_ENTERPRISE", {
      provider: "OPENAI_ENTERPRISE",
      contractualZdrActive: true,
      maxRetentionWindowHours: 0,
      modelTrainingAllowed: false,
      enforceAuditLogging: true,
      requiredHeaders: {
        "x-openai-organization": "enterprise-approved",
        "x-zdr-policy": "enforced"
      }
    });

    this.registeredPolicies.set("ANTHROPIC_COMMERCIAL", {
      provider: "ANTHROPIC_COMMERCIAL",
      contractualZdrActive: true,
      maxRetentionWindowHours: 0,
      modelTrainingAllowed: false,
      enforceAuditLogging: true,
      requiredHeaders: {
        "anthropic-version": "2023-06-01"
      }
    });

    this.registeredPolicies.set("AWS_BEDROCK", {
      provider: "AWS_BEDROCK",
      contractualZdrActive: true,
      maxRetentionWindowHours: 0,
      modelTrainingAllowed: false,
      enforceAuditLogging: true,
      requiredHeaders: {
        "x-amzn-bedrock-save-data": "false"
      }
    });

    this.registeredPolicies.set("GOOGLE_VERTEX_AI", {
      provider: "GOOGLE_VERTEX_AI",
      contractualZdrActive: true,
      maxRetentionWindowHours: 0,
      modelTrainingAllowed: false,
      enforceAuditLogging: true,
      requiredHeaders: {
        "x-goog-user-project": "enterprise-compliance"
      }
    });
  }

  public registerCustomPolicy(policy: ZdrPolicy): void {
    this.registeredPolicies.set(policy.provider, policy);
  }

  /**
   * Verifies a single AI inference invocation against contractual ZDR rules.
   */
  public verifyInferenceTransaction(telemetry: AiInferenceTelemetry): ZdrVerificationResult {
    const violations: string[] = [];
    let riskScore = 0;

    const policy = this.registeredPolicies.get(telemetry.provider);

    if (!policy) {
      violations.push(`Unregistered AI sub-processor provider: ${telemetry.provider}`);
      riskScore = 80;
    } else {
      if (!policy.contractualZdrActive) {
        violations.push(`Vendor ${telemetry.provider} does not have an active Zero-Data Retention agreement.`);
        riskScore += 50;
      }

      if (policy.modelTrainingAllowed) {
        violations.push(`Contractual terms allow customer prompt training for ${telemetry.provider}. Critical GDPR Art. 28 violation.`);
        riskScore += 50;
      }

      if (telemetry.retentionWindowObservedHours > policy.maxRetentionWindowHours) {
        violations.push(`Observed retention window (${telemetry.retentionWindowObservedHours}h) exceeds contractual limit (${policy.maxRetentionWindowHours}h).`);
        riskScore += 40;
      }

      // Check required compliance headers
      for (const [headerKey, expectedValue] of Object.entries(policy.requiredHeaders)) {
        const observedValue = telemetry.requestHeaders[headerKey.toLowerCase()] || telemetry.requestHeaders[headerKey];
        if (!observedValue) {
          violations.push(`Missing mandatory security header: '${headerKey}'`);
          riskScore += 20;
        } else if (observedValue.toLowerCase() !== expectedValue.toLowerCase()) {
          violations.push(`Header '${headerKey}' value mismatch: expected '${expectedValue}', found '${observedValue}'`);
          riskScore += 25;
        }
      }
    }

    const verified = violations.length === 0;
    const finalRiskScore = Math.min(100, Math.max(0, riskScore));

    const evidencePayload = `${telemetry.transactionId}:${telemetry.tenantId}:${telemetry.provider}:${telemetry.promptHash}:${telemetry.completionHash}:${verified}:${finalRiskScore}`;
    const evidenceHash = createHash("sha256").update(evidencePayload).digest("hex");

    return {
      verified,
      transactionId: telemetry.transactionId,
      tenantId: telemetry.tenantId,
      provider: telemetry.provider,
      violations,
      riskScore: finalRiskScore,
      evidenceHash
    };
  }

  /**
   * Aggregates multiple transaction evaluations into an enterprise audit certificate.
   */
  public generateComplianceCertificate(
    tenantId: string,
    results: ZdrVerificationResult[]
  ): AiZdrComplianceCertificate {
    if (results.length === 0) {
      throw new Error("Cannot generate certificate without transaction audit results.");
    }

    const total = results.length;
    const nonCompliant = results.filter((r) => !r.verified).length;
    const complianceRatePct = Math.round(((total - nonCompliant) / total) * 10000) / 100;

    let status: "FULLY_COMPLIANT" | "FLAGGED_FOR_REVIEW" | "CRITICAL_BREACH" = "FULLY_COMPLIANT";
    if (complianceRatePct < 90) {
      status = "CRITICAL_BREACH";
    } else if (complianceRatePct < 100) {
      status = "FLAGGED_FOR_REVIEW";
    }

    const generatedAtIso = new Date().toISOString();
    const certId = `CERT-AI-ZDR-${createHash("sha256").update(`${tenantId}:${generatedAtIso}`).digest("hex").slice(0, 12).toUpperCase()}`;

    const summaryPayload = `${certId}:${tenantId}:${complianceRatePct}:${status}:${results.map((r) => r.evidenceHash).join(",")}`;
    const tamperSeal = createHash("sha256").update(summaryPayload).digest("hex");

    return {
      certificateId: certId,
      tenantId,
      generatedAtIso,
      totalTransactionsAudited: total,
      complianceRatePct,
      nonCompliantCount: nonCompliant,
      status,
      tamperSeal
    };
  }
}
