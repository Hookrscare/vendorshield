import { describe, it, expect } from "vitest";
import {
  Iso42001AimsControlVerifier,
  EnterpriseAimsProfile,
  AimsControlEvaluation
} from "./iso-42001-aims-control-verifier";

describe("Iso42001AimsControlVerifier", () => {
  it("certifies a fully mature enterprise AIMS profile covering all Annex A categories with telemetry", () => {
    const controls: AimsControlEvaluation[] = [
      { controlCategory: "A_5_AI_POLICY", controlId: "A.5.2", isImplemented: true, hasAutomatedMonitoring: true, evidenceRefUri: "s3://evidence/policy.pdf" },
      { controlCategory: "A_6_INTERNAL_ORG", controlId: "A.6.1", isImplemented: true, hasAutomatedMonitoring: true, evidenceRefUri: "s3://evidence/roles.pdf" },
      { controlCategory: "A_7_RESOURCES_DATA", controlId: "A.7.3", isImplemented: true, hasAutomatedMonitoring: true, evidenceRefUri: "s3://evidence/data-gov.json" },
      { controlCategory: "A_8_LIFECYCLE_MGMT", controlId: "A.8.4", isImplemented: true, hasAutomatedMonitoring: true, evidenceRefUri: "s3://evidence/mlops.json" },
      { controlCategory: "A_9_THIRD_PARTY_AI", controlId: "A.9.2", isImplemented: true, hasAutomatedMonitoring: true, evidenceRefUri: "s3://evidence/vendor-risk.json" },
      { controlCategory: "A_10_IMPACT_ASSESSMENT", controlId: "A.10.1", isImplemented: true, hasAutomatedMonitoring: true, evidenceRefUri: "s3://evidence/fria.pdf" }
    ];

    const profile: EnterpriseAimsProfile = {
      organizationId: "ORG-ACME-AI",
      scopeOfCertification: "Production LLM Serving & Generative Pipeline",
      controls,
      hasExternalAuditorAttestation: true
    };

    const result = Iso42001AimsControlVerifier.verifyAimsCompliance(profile);
    expect(result.overallMaturityScore).toBe(100);
    expect(result.complianceTier).toBe("CERTIFIABLE");
    expect(result.isCertificationReady).toBe(true);
    expect(result.missingControls.length).toBe(0);
    expect(result.attestationDigest).toHaveLength(64);
  });

  it("identifies critical omission when third-party AI supply chain governance is omitted", () => {
    const controls: AimsControlEvaluation[] = [
      { controlCategory: "A_5_AI_POLICY", controlId: "A.5.2", isImplemented: true, hasAutomatedMonitoring: true, evidenceRefUri: "s3://evidence/policy.pdf" },
      { controlCategory: "A_6_INTERNAL_ORG", controlId: "A.6.1", isImplemented: true, hasAutomatedMonitoring: true, evidenceRefUri: "s3://evidence/roles.pdf" },
      { controlCategory: "A_7_RESOURCES_DATA", controlId: "A.7.3", isImplemented: true, hasAutomatedMonitoring: true, evidenceRefUri: "s3://evidence/data-gov.json" },
      { controlCategory: "A_8_LIFECYCLE_MGMT", controlId: "A.8.4", isImplemented: true, hasAutomatedMonitoring: true, evidenceRefUri: "s3://evidence/mlops.json" },
      { controlCategory: "A_10_IMPACT_ASSESSMENT", controlId: "A.10.1", isImplemented: true, hasAutomatedMonitoring: true, evidenceRefUri: "s3://evidence/fria.pdf" }
    ];

    const profile: EnterpriseAimsProfile = {
      organizationId: "ORG-LEGACY",
      scopeOfCertification: "Internal Classification ML",
      controls,
      hasExternalAuditorAttestation: false
    };

    const result = Iso42001AimsControlVerifier.verifyAimsCompliance(profile);
    expect(result.isCertificationReady).toBe(false);
    expect(result.missingControls.some(m => m.includes("A_9_THIRD_PARTY_AI"))).toBe(true);
  });

  it("throws validation error for invalid profile parameters", () => {
    expect(() => {
      Iso42001AimsControlVerifier.verifyAimsCompliance({
        organizationId: "",
        scopeOfCertification: "Test",
        controls: [],
        hasExternalAuditorAttestation: false
      });
    }).toThrow();
  });
});
