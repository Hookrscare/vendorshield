/**
 * QA-170: Real-Time SOC 2 Type II Evidence Cryptographic Timestamping Attestation Daemon
 * 
 * Generates RFC 3161 style tamper-evident cryptographic timestamp attestations for SOC 2 Type II
 * audit evidence payloads, creating verifiable proof-of-existence and non-repudiation seals.
 */

import { createHash, createHmac } from 'crypto';

export interface EvidencePayload {
  evidenceId: string;
  controlId: string; // e.g. "CC6.1", "CC7.2"
  collectedBy: string;
  collectedAtIso: string;
  payloadContent: Record<string, any>;
}

export interface TimestampAttestationSeal {
  evidenceId: string;
  controlId: string;
  payloadHashSha256: string;
  attestationTimestampMs: number;
  attestationTimestampIso: string;
  nonce: string;
  attestationSignature: string;
  algorithm: string;
}

export class Soc2EvidenceTimestampingAttestationDaemon {
  private signingSecret: string;

  constructor(signingSecret: string = 'soc2-default-attestation-signing-key') {
    this.signingSecret = signingSecret;
  }

  /**
   * Generates a deterministic SHA-256 digest of the canonicalized evidence payload.
   */
  public computePayloadDigest(payload: EvidencePayload): string {
    const stringifyCanonical = (obj: any): string => {
      if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
      }
      if (Array.isArray(obj)) {
        return '[' + obj.map(stringifyCanonical).join(',') + ']';
      }
      const sortedKeys = Object.keys(obj).sort();
      const parts = sortedKeys.map(k => `${JSON.stringify(k)}:${stringifyCanonical(obj[k])}`);
      return '{' + parts.join(',') + '}';
    };

    const canonicalString = stringifyCanonical(payload);
    return createHash('sha256').update(canonicalString, 'utf8').digest('hex');
  }

  /**
   * Issues an immutable cryptographic timestamp attestation seal over the evidence.
   */
  public createAttestationSeal(
    payload: EvidencePayload,
    overrideTimestampMs?: number,
    overrideNonce?: string
  ): TimestampAttestationSeal {
    const payloadHash = this.computePayloadDigest(payload);
    const timestampMs = overrideTimestampMs ?? Date.now();
    const timestampIso = new Date(timestampMs).toISOString();
    const nonce = overrideNonce ?? createHash('sha256').update(`${payloadHash}-${timestampMs}-${Math.random()}`).digest('hex').substring(0, 16);

    // Signature data: payloadHash | timestampMs | nonce
    const messageToSign = `${payloadHash}:${timestampMs}:${nonce}:${payload.controlId}`;
    const signature = createHmac('sha256', this.signingSecret)
      .update(messageToSign, 'utf8')
      .digest('hex');

    return {
      evidenceId: payload.evidenceId,
      controlId: payload.controlId,
      payloadHashSha256: payloadHash,
      attestationTimestampMs: timestampMs,
      attestationTimestampIso: timestampIso,
      nonce,
      attestationSignature: signature,
      algorithm: 'HMAC-SHA256-RFC3161-ALIGN',
    };
  }

  /**
   * Verifies the integrity of evidence against its attestation seal.
   */
  public verifyAttestationSeal(
    payload: EvidencePayload,
    seal: TimestampAttestationSeal
  ): { isValid: boolean; reason?: string } {
    if (payload.evidenceId !== seal.evidenceId) {
      return { isValid: false, reason: 'Evidence ID mismatch.' };
    }

    const currentHash = this.computePayloadDigest(payload);
    if (currentHash !== seal.payloadHashSha256) {
      return { isValid: false, reason: 'Payload content has been tampered or altered since attestation.' };
    }

    const messageToVerify = `${seal.payloadHashSha256}:${seal.attestationTimestampMs}:${seal.nonce}:${payload.controlId}`;
    const expectedSignature = createHmac('sha256', this.signingSecret)
      .update(messageToVerify, 'utf8')
      .digest('hex');

    if (expectedSignature !== seal.attestationSignature) {
      return { isValid: false, reason: 'Attestation signature validation failed.' };
    }

    return { isValid: true };
  }
}
