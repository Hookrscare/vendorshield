/**
 * QA-188: Sub-Processor AI Synthetic Training Data Differential Privacy Epsilon-Delta Budget Ledger.
 * 
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Enforces EU AI Act Article 53 & GDPR Article 28 mathematical privacy guarantees.
 * Tracks (epsilon, delta) differential privacy expenditure per sub-processor model training / evaluation session.
 */

import { createHash } from "crypto";

export interface PrivacyBudgetPolicy {
  subProcessorId: string;
  maxEpsilon: number;       // Upper bound on cumulative epsilon (e.g. 8.0)
  maxDelta: number;         // Upper bound on cumulative delta (e.g. 1e-5)
  enforceZeroExhaustion: boolean;
}

export interface PrivacyConsumptionEvent {
  eventId: string;
  subProcessorId: string;
  modelIdentifier: string;
  datasetName: string;
  epsilonConsumed: number;
  deltaConsumed: number;
  mechanism: "GAUSSIAN" | "LAPLACE" | "EXPONENTIAL" | "RENYI_ACCOUNTANT";
  timestamp: string;
  authorizedBy: string;
}

export interface LedgerEntry extends PrivacyConsumptionEvent {
  previousHash: string;
  cumulativeEpsilon: number;
  cumulativeDelta: number;
  entryHash: string;
}

export class SubProcessorDifferentialPrivacyBudgetLedger {
  private ledger: LedgerEntry[] = [];
  private policy: PrivacyBudgetPolicy;

  constructor(policy: PrivacyBudgetPolicy) {
    if (policy.maxEpsilon <= 0 || policy.maxDelta <= 0) {
      throw new Error("Epsilon and delta thresholds must be strictly positive numbers.");
    }
    this.policy = policy;
  }

  private computeHash(
    event: PrivacyConsumptionEvent,
    previousHash: string,
    cumEps: number,
    cumDelta: number
  ): string {
    const raw = `${previousHash}:${event.eventId}:${event.subProcessorId}:${event.modelIdentifier}:${event.epsilonConsumed}:${event.deltaConsumed}:${cumEps}:${cumDelta}:${event.timestamp}`;
    return createHash("sha256").update(raw).digest("hex");
  }

  public recordConsumption(event: Omit<PrivacyConsumptionEvent, "timestamp">): LedgerEntry {
    if (event.epsilonConsumed <= 0 || event.deltaConsumed < 0) {
      throw new Error("Consumption values must be valid non-negative numbers (epsilon > 0).");
    }

    const currentCumEps = this.getCurrentEpsilon();
    const currentCumDelta = this.getCurrentDelta();

    // Standard composition: eps_total = eps_prev + eps_new; delta_total = delta_prev + delta_new
    const nextCumEps = Number((currentCumEps + event.epsilonConsumed).toFixed(6));
    const nextCumDelta = Number((currentCumDelta + event.deltaConsumed).toExponential(6));

    if (this.policy.enforceZeroExhaustion) {
      if (nextCumEps > this.policy.maxEpsilon || nextCumDelta > this.policy.maxDelta) {
        throw new Error(
          `Privacy budget exceeded for sub-processor ${this.policy.subProcessorId}. Next epsilon: ${nextCumEps} (max: ${this.policy.maxEpsilon}), next delta: ${nextCumDelta} (max: ${this.policy.maxDelta}).`
        );
      }
    }

    const previousHash = this.ledger.length > 0 
      ? this.ledger[this.ledger.length - 1].entryHash 
      : "0".repeat(64);

    const fullEvent: PrivacyConsumptionEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    const entryHash = this.computeHash(fullEvent, previousHash, nextCumEps, nextCumDelta);

    const entry: LedgerEntry = {
      ...fullEvent,
      previousHash,
      cumulativeEpsilon: nextCumEps,
      cumulativeDelta: nextCumDelta,
      entryHash
    };

    this.ledger.push(entry);
    return entry;
  }

  public getCurrentEpsilon(): number {
    if (this.ledger.length === 0) return 0;
    return this.ledger[this.ledger.length - 1].cumulativeEpsilon;
  }

  public getCurrentDelta(): number {
    if (this.ledger.length === 0) return 0;
    return this.ledger[this.ledger.length - 1].cumulativeDelta;
  }

  public getRemainingBudget(): { remainingEpsilon: number; remainingDelta: number; isExhausted: boolean } {
    const curEps = this.getCurrentEpsilon();
    const curDelta = this.getCurrentDelta();
    const remainingEps = Math.max(0, Number((this.policy.maxEpsilon - curEps).toFixed(6)));
    const remainingDelta = Math.max(0, this.policy.maxDelta - curDelta);

    return {
      remainingEpsilon: remainingEps,
      remainingDelta: remainingDelta,
      isExhausted: remainingEps <= 0 || remainingDelta <= 0
    };
  }

  public verifyLedgerIntegrity(): { valid: boolean; invalidIndex?: number; reason?: string } {
    for (let i = 0; i < this.ledger.length; i++) {
      const current = this.ledger[i];
      const expectedPrevHash = i === 0 ? "0".repeat(64) : this.ledger[i - 1].entryHash;

      if (current.previousHash !== expectedPrevHash) {
        return { valid: false, invalidIndex: i, reason: "Previous hash mismatch in chain" };
      }

      const recomputedHash = this.computeHash(
        current,
        current.previousHash,
        current.cumulativeEpsilon,
        current.cumulativeDelta
      );

      if (recomputedHash !== current.entryHash) {
        return { valid: false, invalidIndex: i, reason: "Tampered entry hash detected" };
      }
    }
    return { valid: true };
  }

  public getEntries(): ReadonlyArray<LedgerEntry> {
    return [...this.ledger];
  }
}
