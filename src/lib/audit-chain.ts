/**
 * QA-115: Multi-Tenant SOC 2 Audit Log Immutable Hash Chain Engine.
 * Implements cryptographically verifiable, tamper-evident audit logging for SOC 2 CC6.8.
 * Each entry links to the previous entry via SHA-256 hash chaining.
 */

import crypto from "crypto";

export const GENESIS_HASH = "0".repeat(64);

export interface AuditLogEntry {
  sequence: number;
  id: string;
  tenantId: string;
  timestampIso: string;
  actor: string;
  action: string;
  target: string;
  details?: Record<string, any>;
  previousHash: string;
  hash: string;
}

export interface ChainVerificationResult {
  isValid: boolean;
  totalEntries: number;
  brokenSequence?: number;
  brokenEntryId?: string;
  error?: string;
}

export function computeEntryHash(
  entry: Omit<AuditLogEntry, "hash">
): string {
  const canonicalPayload = [
    entry.sequence.toString(),
    entry.id,
    entry.tenantId,
    entry.timestampIso,
    entry.actor,
    entry.action,
    entry.target,
    JSON.stringify(entry.details || {}),
    entry.previousHash,
  ].join("|");

  return crypto.createHash("sha256").update(canonicalPayload).digest("hex");
}

export function createAuditLogEntry(
  previousEntry: AuditLogEntry | null,
  data: {
    id: string;
    tenantId: string;
    actor: string;
    action: string;
    target: string;
    details?: Record<string, any>;
    timestampIso?: string;
  }
): AuditLogEntry {
  const sequence = previousEntry ? previousEntry.sequence + 1 : 1;
  const previousHash = previousEntry ? previousEntry.hash : GENESIS_HASH;
  const timestampIso = data.timestampIso || new Date().toISOString();

  const partial: Omit<AuditLogEntry, "hash"> = {
    sequence,
    id: data.id,
    tenantId: data.tenantId,
    timestampIso,
    actor: data.actor,
    action: data.action,
    target: data.target,
    details: data.details || {},
    previousHash,
  };

  return {
    ...partial,
    hash: computeEntryHash(partial),
  };
}

export function verifyAuditChain(chain: AuditLogEntry[]): ChainVerificationResult {
  if (!chain || chain.length === 0) {
    return { isValid: true, totalEntries: 0 };
  }

  for (let i = 0; i < chain.length; i++) {
    const current = chain[i];
    const expectedSequence = i + 1;

    if (current.sequence !== expectedSequence) {
      return {
        isValid: false,
        totalEntries: chain.length,
        brokenSequence: current.sequence,
        brokenEntryId: current.id,
        error: `Sequence mismatch: expected ${expectedSequence}, found ${current.sequence}`,
      };
    }

    const expectedPreviousHash = i === 0 ? GENESIS_HASH : chain[i - 1].hash;
    if (current.previousHash !== expectedPreviousHash) {
      return {
        isValid: false,
        totalEntries: chain.length,
        brokenSequence: current.sequence,
        brokenEntryId: current.id,
        error: `Previous hash broken at sequence ${current.sequence}`,
      };
    }

    const recalculatedHash = computeEntryHash(current);
    if (current.hash !== recalculatedHash) {
      return {
        isValid: false,
        totalEntries: chain.length,
        brokenSequence: current.sequence,
        brokenEntryId: current.id,
        error: `Hash integrity corrupted for entry ${current.id} (sequence ${current.sequence})`,
      };
    }
  }

  return {
    isValid: true,
    totalEntries: chain.length,
  };
}
