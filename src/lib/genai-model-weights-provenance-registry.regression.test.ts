import { describe, it, expect } from "vitest";
import {
  GenAiModelWeightsProvenanceRegistry,
  GenAiModelProvenanceInput
} from "./genai-model-weights-provenance-registry";

describe("GenAiModelWeightsProvenanceRegistry (QA-182)", () => {
  const validSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  it("verifies enterprise secure model with full signatures and SLSA 3", () => {
    const input: GenAiModelProvenanceInput = {
      modelIdentifier: "anthropic/claude-3-5-sonnet",
      vendorProvider: "AWS Bedrock",
      modelWeightSha256: validSha256,
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

  it("classifies unsigned and unindemnified model as elevated risk or prohibited", () => {
    const input: GenAiModelProvenanceInput = {
      modelIdentifier: "unverified-huggingface-model/deepseek-quant",
      vendorProvider: "Hugging Face Community",
      modelWeightSha256: validSha256,
      hasCosignSignature: false,
      slsaProvenanceLevel: 1,
      hasTrainingDataIndemnity: false,
      euAiActTransparencyCompliant: false
    };

    const res = GenAiModelWeightsProvenanceRegistry.auditModelProvenance(input);

    expect(res.provenanceTier).toBe("PROHIBITED_SHADOW_AI");
    expect(res.trustScore).toBeLessThan(50);
    expect(res.complianceFindings.length).toBeGreaterThanOrEqual(3);
  });

  it("enforces valid SHA-256 weight hash input", () => {
    expect(() => {
      GenAiModelWeightsProvenanceRegistry.auditModelProvenance({
        modelIdentifier: "test-model",
        vendorProvider: "OpenAI",
        modelWeightSha256: "short-hash",
        hasCosignSignature: true,
        slsaProvenanceLevel: 2,
        hasTrainingDataIndemnity: true,
        euAiActTransparencyCompliant: true
      });
    }).toThrow("Valid 64-character SHA-256 weight digest is required.");
  });
});
