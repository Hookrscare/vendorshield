import { describe, it, expect, beforeEach } from "vitest";
import {
  SubProcessorDifferentialPrivacyBudgetLedger,
  PrivacyBudgetPolicy
} from "./subprocessor-differential-privacy-budget-ledger";

describe("QA-188: SubProcessorDifferentialPrivacyBudgetLedger", () => {
  let policy: PrivacyBudgetPolicy;
  let ledger: SubProcessorDifferentialPrivacyBudgetLedger;

  beforeEach(() => {
    policy = {
      subProcessorId: "sub_proc_openai_synthetic",
      maxEpsilon: 5.0,
      maxDelta: 1e-4,
      enforceZeroExhaustion: true
    };
    ledger = new SubProcessorDifferentialPrivacyBudgetLedger(policy);
  });

  it("initializes with zero expenditure and full remaining budget", () => {
    expect(ledger.getCurrentEpsilon()).toBe(0);
    expect(ledger.getCurrentDelta()).toBe(0);
    const remaining = ledger.getRemainingBudget();
    expect(remaining.remainingEpsilon).toBe(5.0);
    expect(remaining.isExhausted).toBe(false);
  });

  it("records privacy consumption and updates cumulative metrics", () => {
    const entry1 = ledger.recordConsumption({
      eventId: "ev_001",
      subProcessorId: "sub_proc_openai_synthetic",
      modelIdentifier: "gpt-4o-finetune-v2",
      datasetName: "customer_support_embeddings",
      epsilonConsumed: 1.25,
      deltaConsumed: 1e-5,
      mechanism: "GAUSSIAN",
      authorizedBy: "dpo@company.internal"
    });

    expect(entry1.cumulativeEpsilon).toBe(1.25);
    expect(entry1.cumulativeDelta).toBe(1e-5);
    expect(ledger.getCurrentEpsilon()).toBe(1.25);

    const entry2 = ledger.recordConsumption({
      eventId: "ev_002",
      subProcessorId: "sub_proc_openai_synthetic",
      modelIdentifier: "gpt-4o-eval-suite",
      datasetName: "crm_synthetic_eval",
      epsilonConsumed: 0.75,
      deltaConsumed: 2e-5,
      mechanism: "LAPLACE",
      authorizedBy: "sec-eng@company.internal"
    });

    expect(entry2.cumulativeEpsilon).toBe(2.0);
    expect(entry2.previousHash).toBe(entry1.entryHash);

    const integrity = ledger.verifyLedgerIntegrity();
    expect(integrity.valid).toBe(true);
  });

  it("blocks consumption when exceeding maximum epsilon under enforceZeroExhaustion", () => {
    ledger.recordConsumption({
      eventId: "ev_001",
      subProcessorId: "sub_proc_openai_synthetic",
      modelIdentifier: "m1",
      datasetName: "d1",
      epsilonConsumed: 4.5,
      deltaConsumed: 1e-5,
      mechanism: "GAUSSIAN",
      authorizedBy: "admin"
    });

    expect(() => {
      ledger.recordConsumption({
        eventId: "ev_002",
        subProcessorId: "sub_proc_openai_synthetic",
        modelIdentifier: "m1",
        datasetName: "d1",
        epsilonConsumed: 1.0, // 4.5 + 1.0 = 5.5 > 5.0
        deltaConsumed: 1e-6,
        mechanism: "GAUSSIAN",
        authorizedBy: "admin"
      });
    }).toThrow(/Privacy budget exceeded/);
  });

  it("detects tampering when an entry hash is modified", () => {
    ledger.recordConsumption({
      eventId: "ev_001",
      subProcessorId: "sub_proc_openai_synthetic",
      modelIdentifier: "m1",
      datasetName: "d1",
      epsilonConsumed: 1.0,
      deltaConsumed: 1e-6,
      mechanism: "GAUSSIAN",
      authorizedBy: "admin"
    });

    const entries = ledger.getEntries() as any[];
    entries[0].entryHash = "tampered_fake_hash_1234567890abcdef";

    const integrity = ledger.verifyLedgerIntegrity();
    expect(integrity.valid).toBe(false);
    expect(integrity.reason).toContain("Tampered");
  });
});
