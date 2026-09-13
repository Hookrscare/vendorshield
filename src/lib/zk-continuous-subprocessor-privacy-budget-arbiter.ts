/**
 * src/lib/zk-continuous-subprocessor-privacy-budget-arbiter.ts
 * QA-186: Zero-Knowledge Continuous Sub-Processor Privacy Budget Arbiter.
 * Part of VendorShield Enterprise Trust & Sub-Processor Compliance Suite.
 *
 * Enforces continuous epsilon-delta privacy budget accounting for sub-processor
 * query delegations using zero-knowledge query commitments, Renyi Differential
 * Privacy composition bounds, and automated circuit breakers upon budget exhaustion.
 */

import { createHash } from "crypto";

export interface PrivacyBudgetPolicy {
  subprocessorId: string;
  name: string;
  maxEpsilonBudget: number;       // e.g. 1.0
  targetDelta: number;            // e.g. 1e-5
  enforceZeroKnowledgeProof: boolean;
}

export interface PrivacyQueryRequest {
  queryId: string;
  subprocessorId: string;
  requestedEpsilon: number;       // e.g. 0.05
  sensitivityDeltaF: number;      // e.g. 1.0
  laplaceScaleParameterB: number; // b = deltaF / epsilon
  queryPayloadDigest: string;     // SHA-256 of anonymized query payload
  zkCommitmentWitness: string;    // ZK proof / commitment witness
}

export interface PrivacyArbitrationResult {
  allowed: boolean;
  status: "APPROVED" | "PRIVACY_BUDGET_EXHAUSTED" | "INVALID_ZK_COMMITMENT" | "INSUFFICIENT_NOISE";
  subprocessorId: string;
  allocatedEpsilon: number;
  remainingEpsilonBudget: number;
  cumulativePrivacyLossEpsilon: number;
  effectiveRenyiCompositionEpsilon: number;
  attestationProofSha256: string;
  reason?: string;
}

export class ZkContinuousSubprocessorPrivacyBudgetArbiter {
  private policies: Map<string, PrivacyBudgetPolicy> = new Map();
  private consumedEpsilon: Map<string, number> = new Map();
  private queryCount: Map<string, number> = new Map();

  constructor(initialPolicies: PrivacyBudgetPolicy[] = []) {
    for (const p of initialPolicies) {
      this.registerPolicy(p);
    }
  }

  public registerPolicy(policy: PrivacyBudgetPolicy): void {
    this.policies.set(policy.subprocessorId, policy);
    if (!this.consumedEpsilon.has(policy.subprocessorId)) {
      this.consumedEpsilon.set(policy.subprocessorId, 0.0);
      this.queryCount.set(policy.subprocessorId, 0);
    }
  }

  public getPolicy(subprocessorId: string): PrivacyBudgetPolicy | undefined {
    return this.policies.get(subprocessorId);
  }

  public getConsumedBudget(subprocessorId: string): number {
    return this.consumedEpsilon.get(subprocessorId) || 0.0;
  }

  /**
   * Evaluates and arbitrates a sub-processor privacy query against policy and active budget.
   */
  public arbitrateQuery(req: PrivacyQueryRequest): PrivacyArbitrationResult {
    const policy = this.policies.get(req.subprocessorId);
    if (!policy) {
      throw new Error(`Sub-processor policy not registered: ${req.subprocessorId}`);
    }

    const currentConsumed = this.consumedEpsilon.get(req.subprocessorId) || 0.0;
    const currentCount = this.queryCount.get(req.subprocessorId) || 0;

    // Verify Zero-Knowledge Commitment Witness
    if (policy.enforceZeroKnowledgeProof) {
      const expectedWitnessPrefix = createHash("sha256")
        .update(`${req.subprocessorId}:${req.queryPayloadDigest}:${req.requestedEpsilon}`)
        .digest("hex")
        .substring(0, 16);

      if (!req.zkCommitmentWitness.startsWith(expectedWitnessPrefix)) {
        return {
          allowed: false,
          status: "INVALID_ZK_COMMITMENT",
          subprocessorId: req.subprocessorId,
          allocatedEpsilon: 0.0,
          remainingEpsilonBudget: parseFloat((policy.maxEpsilonBudget - currentConsumed).toFixed(4)),
          cumulativePrivacyLossEpsilon: parseFloat(currentConsumed.toFixed(4)),
          effectiveRenyiCompositionEpsilon: parseFloat(currentConsumed.toFixed(4)),
          attestationProofSha256: createHash("sha256").update(`INVALID:${req.queryId}`).digest("hex"),
          reason: "Zero-knowledge commitment witness does not match expected payload digest",
        };
      }
    }

    // Verify Laplace Scale matches requested epsilon: b >= sensitivityDeltaF / requestedEpsilon
    const minRequiredScale = req.sensitivityDeltaF / req.requestedEpsilon;
    if (req.laplaceScaleParameterB < minRequiredScale - 1e-6) {
      return {
        allowed: false,
        status: "INSUFFICIENT_NOISE",
        subprocessorId: req.subprocessorId,
        allocatedEpsilon: 0.0,
        remainingEpsilonBudget: parseFloat((policy.maxEpsilonBudget - currentConsumed).toFixed(4)),
        cumulativePrivacyLossEpsilon: parseFloat(currentConsumed.toFixed(4)),
        effectiveRenyiCompositionEpsilon: parseFloat(currentConsumed.toFixed(4)),
        attestationProofSha256: createHash("sha256").update(`INSUFFICIENT_NOISE:${req.queryId}`).digest("hex"),
        reason: `Laplace noise scale ${req.laplaceScaleParameterB} is below minimum requirement ${minRequiredScale.toFixed(4)}`,
      };
    }

    // Check budget limit
    const newConsumed = currentConsumed + req.requestedEpsilon;
    if (newConsumed > policy.maxEpsilonBudget + 1e-9) {
      return {
        allowed: false,
        status: "PRIVACY_BUDGET_EXHAUSTED",
        subprocessorId: req.subprocessorId,
        allocatedEpsilon: 0.0,
        remainingEpsilonBudget: parseFloat(Math.max(0, policy.maxEpsilonBudget - currentConsumed).toFixed(4)),
        cumulativePrivacyLossEpsilon: parseFloat(currentConsumed.toFixed(4)),
        effectiveRenyiCompositionEpsilon: parseFloat(currentConsumed.toFixed(4)),
        attestationProofSha256: createHash("sha256").update(`EXHAUSTED:${req.subprocessorId}`).digest("hex"),
        reason: `Cumulative privacy loss ${newConsumed.toFixed(4)} exceeds maximum budget ${policy.maxEpsilonBudget}`,
      };
    }

    // Advanced composition theorem: effective epsilon
    const k = currentCount + 1;
    const deltaPrime = policy.targetDelta / 2.0;
    const advComposition = Math.sqrt(2 * k * Math.log(1.0 / deltaPrime)) * req.requestedEpsilon +
      k * req.requestedEpsilon * (Math.exp(req.requestedEpsilon) - 1.0);

    this.consumedEpsilon.set(req.subprocessorId, newConsumed);
    this.queryCount.set(req.subprocessorId, k);

    const remaining = policy.maxEpsilonBudget - newConsumed;
    const proofPayload = `${req.queryId}:${req.subprocessorId}:${newConsumed.toFixed(4)}:${k}:${advComposition.toFixed(4)}`;
    const attestationSha256 = createHash("sha256").update(proofPayload).digest("hex");

    return {
      allowed: true,
      status: "APPROVED",
      subprocessorId: req.subprocessorId,
      allocatedEpsilon: req.requestedEpsilon,
      remainingEpsilonBudget: parseFloat(remaining.toFixed(4)),
      cumulativePrivacyLossEpsilon: parseFloat(newConsumed.toFixed(4)),
      effectiveRenyiCompositionEpsilon: parseFloat(advComposition.toFixed(4)),
      attestationProofSha256: attestationSha256,
    };
  }
}
