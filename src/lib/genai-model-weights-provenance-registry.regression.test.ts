import { describe, it, expect } from "vitest";
import {
  GenAiModelWeightsProvenanceRegistry,
  GenAiModelProvenanceInput
} from "./genai-model-weights-provenance-registry";

describe("QA-182: GenAiModelWeightsProvenanceRegistry Regression Suite", () => {
  const dummySha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  it("classifies compliant model with Cosign, SLSA L3, and EU AI Act transparency as VERIFIED_ENTERPRISE_SECURE", () => {
    const input: GenAiModelProvenanceInput = {
      modelIdentifier: "meta-llama/Llama-3.3-70B-Instruct",
      vendorProvider: "AWS Bedrock",
      modelWeightSha256: dummySha256,
      hasCosignSignature: true,
      slsaProvenanceLevel: 3,
      hasTrainingDataIndemnity: true,
      euAiActTransparencyCompliant: true
    };

    const res = GenAiModelWeightsProvenanceRegistry.auditModelProvenance(input);
    expect(res.provenanceTier).toBe("VERIFIED_ENTERPRISE_SECURE");
    expect(res.trustScore).toBe(100);
    expect(res.complianceFindings).toHaveLength(0);
    expect(res.attestationDigest).toHaveLength(64);
  });

  it("downgrades tier to ELEVATED_SUPPLY_CHAIN_RISK when SLSA level is 1 and indemnity is missing", () => {
    const input: GenAiModelProvenanceInput = {
      modelIdentifier: "mistralai/Mistral-Small-24B-Instruct-2501",
      vendorProvider: "Together AI",
      modelWeightSha256: dummySha256,
      hasCosignSignature: true,
      slsaProvenanceLevel: 1, // -30
      hasTrainingDataIndemnity: false, // -25
      euAiActTransparencyCompliant: true
    };

    const res = GenAiModelWeightsProvenanceRegistry.auditModelProvenance(input);
    // Score = 100 - 30 - 25 = 45 -> score < 50 triggers PROHIBITED_SHADOW_AI
    expect(res.trustScore).toBe(45);
    expect(res.provenanceTier).toBe("PROHIBITED_SHADOW_AI");
    expect(res.complianceFindings).toContain("Vendor agreement lacks enterprise IP copyright indemnification clause.");
  });

  it("marks unsigned weights without Cosign as non-enterprise", () => {
    const input: GenAiModelProvenanceInput = {
      modelIdentifier: "unverified-org/shadow-rag-model",
      vendorProvider: "Unknown Community Hub",
      modelWeightSha256: dummySha256,
      hasCosignSignature: false,
      slsaProvenanceLevel: 2,
      hasTrainingDataIndemnity: true,
      euAiActTransparencyCompliant: false
    };

    const res = GenAiModelWeightsProvenanceRegistry.auditModelProvenance(input);
    // Score = 100 - 30 - 15 - 20 = 35
    expect(res.provenanceTier).toBe("PROHIBITED_SHADOW_AI");
    expect(res.complianceFindings).toContain("Missing cryptographic Cosign signature on model checkpoint weights.");
  });

  it("validates 64-character SHA-256 weight hash requirement", () => {
    const invalidInput: GenAiModelProvenanceInput = {
      modelIdentifier: "test/model",
      vendorProvider: "Hugging Face",
      modelWeightSha256: "short_hash",
      hasCosignSignature: true,
      slsaProvenanceLevel: 3,
      hasTrainingDataIndemnity: true,
      euAiActTransparencyCompliant: true
    };

    expect(() => GenAiModelWeightsProvenanceRegistry.auditModelProvenance(invalidInput)).toThrow(
      "Valid 64-character SHA-256 weight digest is required."
    );
  });
});
