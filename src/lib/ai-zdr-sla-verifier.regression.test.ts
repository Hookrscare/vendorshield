import { describe, it, expect } from "vitest";
import {
  AiSubprocessorZdrVerifier,
  AiInferenceTelemetry
} from "./ai-zdr-sla-verifier";

describe("QA-140: Multi-Tenant AI Sub-Processor Zero-Data Retention SLA Verifier", () => {
  const verifier = new AiSubprocessorZdrVerifier();

  it("successfully verifies compliant OpenAI enterprise inference transaction", () => {
    const telemetry: AiInferenceTelemetry = {
      transactionId: "tx_openai_001",
      tenantId: "tenant_fintech_acme",
      provider: "OPENAI_ENTERPRISE",
      modelIdentifier: "gpt-4o-enterprise",
      timestampIso: new Date().toISOString(),
      requestHeaders: {
        "x-openai-organization": "enterprise-approved",
        "x-zdr-policy": "enforced"
      },
      promptHash: "hash_p_991823",
      completionHash: "hash_c_481023",
      retentionWindowObservedHours: 0
    };

    const result = verifier.verifyInferenceTransaction(telemetry);
    expect(result.verified).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.riskScore).toBe(0);
    expect(result.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("detects missing security headers and data retention violations", () => {
    const telemetry: AiInferenceTelemetry = {
      transactionId: "tx_bedrock_bad_002",
      tenantId: "tenant_health_plus",
      provider: "AWS_BEDROCK",
      modelIdentifier: "anthropic.claude-3-5-sonnet",
      timestampIso: new Date().toISOString(),
      requestHeaders: {
        // Missing "x-amzn-bedrock-save-data": "false"
      },
      promptHash: "hash_p_7741",
      completionHash: "hash_c_2291",
      retentionWindowObservedHours: 24 // Exceeds 0 hours contractual limit
    };

    const result = verifier.verifyInferenceTransaction(telemetry);
    expect(result.verified).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
  });

  it("identifies unapproved AI provider as high risk", () => {
    const telemetry: AiInferenceTelemetry = {
      transactionId: "tx_rogue_003",
      tenantId: "tenant_bank_co",
      provider: "CUSTOM_SELF_HOSTED",
      modelIdentifier: "untrusted-open-weights",
      timestampIso: new Date().toISOString(),
      requestHeaders: {},
      promptHash: "hash_p_000",
      completionHash: "hash_c_000",
      retentionWindowObservedHours: 0
    };

    const result = verifier.verifyInferenceTransaction(telemetry);
    expect(result.verified).toBe(false);
    expect(result.riskScore).toBeGreaterThanOrEqual(80);
    expect(result.violations[0]).toContain("Unregistered AI sub-processor provider");
  });

  it("generates tamper-evident CISO audit compliance certificate", () => {
    const compliantTelemetry: AiInferenceTelemetry = {
      transactionId: "tx_ok_10",
      tenantId: "tenant_enterprise_corp",
      provider: "ANTHROPIC_COMMERCIAL",
      modelIdentifier: "claude-3-5-haiku",
      timestampIso: new Date().toISOString(),
      requestHeaders: {
        "anthropic-version": "2023-06-01"
      },
      promptHash: "h1",
      completionHash: "h2",
      retentionWindowObservedHours: 0
    };

    const res1 = verifier.verifyInferenceTransaction(compliantTelemetry);
    const cert = verifier.generateComplianceCertificate("tenant_enterprise_corp", [res1]);

    expect(cert.certificateId).toMatch(/^CERT-AI-ZDR-[A-F0-9]{12}$/);
    expect(cert.complianceRatePct).toBe(100);
    expect(cert.status).toBe("FULLY_COMPLIANT");
    expect(cert.tamperSeal).toMatch(/^[a-f0-9]{64}$/);
  });
});
