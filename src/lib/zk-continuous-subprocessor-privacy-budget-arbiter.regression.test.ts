/**
 * src/lib/zk-continuous-subprocessor-privacy-budget-arbiter.regression.test.ts
 * Regression tests for QA-186: Zero-Knowledge Continuous Sub-Processor Privacy Budget Arbiter.
 */

import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import {
  ZkContinuousSubprocessorPrivacyBudgetArbiter,
  PrivacyBudgetPolicy,
  PrivacyQueryRequest,
} from "./zk-continuous-subprocessor-privacy-budget-arbiter";

describe("QA-186: Zero-Knowledge Continuous Sub-Processor Privacy Budget Arbiter", () => {
  const policy: PrivacyBudgetPolicy = {
    subprocessorId: "sp_openai_analytics",
    name: "OpenAI Analytics Privacy Enclave",
    maxEpsilonBudget: 0.5,
    targetDelta: 1e-5,
    enforceZeroKnowledgeProof: true,
  };

  const createWitness = (subId: string, digest: string, eps: number) => {
    return createHash("sha256").update(`${subId}:${digest}:${eps}`).digest("hex");
  };

  it("should approve valid privacy query with sufficient noise and valid ZK commitment", () => {
    const arbiter = new ZkContinuousSubprocessorPrivacyBudgetArbiter([policy]);
    const digest = createHash("sha256").update("query_payload_anonymized_telemetry").digest("hex");
    const witness = createWitness(policy.subprocessorId, digest, 0.1);

    const req: PrivacyQueryRequest = {
      queryId: "qry_001",
      subprocessorId: policy.subprocessorId,
      requestedEpsilon: 0.1,
      sensitivityDeltaF: 1.0,
      laplaceScaleParameterB: 10.0, // b = 1.0 / 0.1 = 10.0
      queryPayloadDigest: digest,
      zkCommitmentWitness: witness,
    };

    const res = arbiter.arbitrateQuery(req);
    expect(res.allowed).toBe(true);
    expect(res.status).toBe("APPROVED");
    expect(res.allocatedEpsilon).toBe(0.1);
    expect(res.remainingEpsilonBudget).toBe(0.4);
    expect(res.cumulativePrivacyLossEpsilon).toBe(0.1);
    expect(res.attestationProofSha256).toHaveLength(64);
  });

  it("should reject query with insufficient noise or invalid ZK commitment", () => {
    const arbiter = new ZkContinuousSubprocessorPrivacyBudgetArbiter([policy]);
    const digest = createHash("sha256").update("sample_payload").digest("hex");

    // Invalid witness
    const reqInvalidWitness: PrivacyQueryRequest = {
      queryId: "qry_bad_witness",
      subprocessorId: policy.subprocessorId,
      requestedEpsilon: 0.1,
      sensitivityDeltaF: 1.0,
      laplaceScaleParameterB: 10.0,
      queryPayloadDigest: digest,
      zkCommitmentWitness: "invalid_witness_token",
    };

    const resWitness = arbiter.arbitrateQuery(reqInvalidWitness);
    expect(resWitness.allowed).toBe(false);
    expect(resWitness.status).toBe("INVALID_ZK_COMMITMENT");

    // Insufficient noise
    const validWitness = createWitness(policy.subprocessorId, digest, 0.1);
    const reqInsufficientNoise: PrivacyQueryRequest = {
      queryId: "qry_low_noise",
      subprocessorId: policy.subprocessorId,
      requestedEpsilon: 0.1,
      sensitivityDeltaF: 1.0,
      laplaceScaleParameterB: 5.0, // Minimum required is 1.0 / 0.1 = 10.0
      queryPayloadDigest: digest,
      zkCommitmentWitness: validWitness,
    };

    const resNoise = arbiter.arbitrateQuery(reqInsufficientNoise);
    expect(resNoise.allowed).toBe(false);
    expect(resNoise.status).toBe("INSUFFICIENT_NOISE");
  });

  it("should enforce privacy budget ceiling and reject queries exceeding max epsilon", () => {
    const arbiter = new ZkContinuousSubprocessorPrivacyBudgetArbiter([policy]);
    const digest = createHash("sha256").update("sample_chunk").digest("hex");

    // Consume 0.4 epsilon (policy max is 0.5)
    const witness1 = createWitness(policy.subprocessorId, digest, 0.4);
    const res1 = arbiter.arbitrateQuery({
      queryId: "qry_large_1",
      subprocessorId: policy.subprocessorId,
      requestedEpsilon: 0.4,
      sensitivityDeltaF: 1.0,
      laplaceScaleParameterB: 2.5,
      queryPayloadDigest: digest,
      zkCommitmentWitness: witness1,
    });
    expect(res1.allowed).toBe(true);

    // Attempt to consume 0.2 epsilon (0.4 + 0.2 = 0.6 > 0.5)
    const witness2 = createWitness(policy.subprocessorId, digest, 0.2);
    const res2 = arbiter.arbitrateQuery({
      queryId: "qry_large_2",
      subprocessorId: policy.subprocessorId,
      requestedEpsilon: 0.2,
      sensitivityDeltaF: 1.0,
      laplaceScaleParameterB: 5.0,
      queryPayloadDigest: digest,
      zkCommitmentWitness: witness2,
    });
    expect(res2.allowed).toBe(false);
    expect(res2.status).toBe("PRIVACY_BUDGET_EXHAUSTED");
    expect(res2.remainingEpsilonBudget).toBe(0.1);
  });
});
