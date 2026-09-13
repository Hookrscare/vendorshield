/**
 * QA-153: Cross-Border Model Transfer Data Sovereign Escrow Gatekeeper Regression Tests
 */

import { describe, it, expect } from 'vitest';
import {
  CrossBorderModelTransferEscrowGatekeeper,
  ModelTransferRequest
} from './cross-border-model-transfer-escrow-gatekeeper';

describe('QA-153: CrossBorderModelTransferEscrowGatekeeper', () => {
  const gatekeeper = new CrossBorderModelTransferEscrowGatekeeper('test-secret-key-12345');
  const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  it('permits intra-jurisdiction model transfer within EU_EEA', () => {
    const request: ModelTransferRequest = {
      transferId: 'TR-INTRA-001',
      assetName: 'llama-3-finetune-eu',
      assetType: 'FINE_TUNING_CHECKPOINT',
      classification: 'ENTERPRISE_CONFIDENTIAL',
      sourceJurisdiction: 'EU_EEA',
      destinationJurisdiction: 'EU_EEA',
      assetSizeBytes: 1024 * 1024 * 500,
      assetSha256Checksum: validSha256,
      transferMechanism: 'EU_ADEQUACY_DECISION',
      dataProtectionOfficerSigned: true,
      escrowCustodyKeyId: 'kms-key-eu-central-1'
    };

    const manifest = gatekeeper.evaluateTransfer(request);
    expect(manifest.verdict).toBe('PERMITTED');
    expect(manifest.allowed).toBe(true);
    expect(manifest.escrowToken).not.toBeNull();
    expect(manifest.riskScore).toBeLessThan(20);

    const verification = gatekeeper.verifyEscrowToken(manifest.escrowToken!);
    expect(verification.valid).toBe(true);
    expect(verification.transferId).toBe('TR-INTRA-001');
  });

  it('blocks model egress to restricted third countries', () => {
    const request: ModelTransferRequest = {
      transferId: 'TR-RESTRICTED-002',
      assetName: 'defense-satellite-vision-v2',
      assetType: 'FOUNDATION_MODEL_WEIGHTS',
      classification: 'ENTERPRISE_CONFIDENTIAL',
      sourceJurisdiction: 'UNITED_STATES',
      destinationJurisdiction: 'RESTRICTED_THIRD_COUNTRY',
      assetSizeBytes: 1024 * 1024 * 1024 * 10,
      assetSha256Checksum: validSha256,
      transferMechanism: 'NONE',
      dataProtectionOfficerSigned: false
    };

    const manifest = gatekeeper.evaluateTransfer(request);
    expect(manifest.verdict).toBe('BLOCKED_SOVEREIGNTY_BREACH');
    expect(manifest.allowed).toBe(false);
    expect(manifest.riskScore).toBe(100);
    expect(manifest.escrowToken).toBeNull();
    expect(manifest.reasons.some(r => r.includes('Restricted Third Country'))).toBe(true);
  });

  it('blocks critical national infrastructure from cross-border egress', () => {
    const request: ModelTransferRequest = {
      transferId: 'TR-CNI-003',
      assetName: 'powergrid-load-dispatch-model',
      assetType: 'FOUNDATION_MODEL_WEIGHTS',
      classification: 'CRITICAL_NATIONAL_INFRASTRUCTURE',
      sourceJurisdiction: 'EU_EEA',
      destinationJurisdiction: 'UNITED_STATES',
      assetSizeBytes: 1024 * 1024 * 100,
      assetSha256Checksum: validSha256,
      transferMechanism: 'STANDARD_CONTRACTUAL_CLAUSES_MOD2',
      dataProtectionOfficerSigned: true,
      escrowCustodyKeyId: 'kms-hsm-001'
    };

    const manifest = gatekeeper.evaluateTransfer(request);
    expect(manifest.verdict).toBe('BLOCKED_SOVEREIGNTY_BREACH');
    expect(manifest.allowed).toBe(false);
    expect(manifest.reasons.some(r => r.includes('Critical National Infrastructure'))).toBe(true);
  });

  it('places raw training datasets with PII on escrow hold when DPO or SCC missing', () => {
    const request: ModelTransferRequest = {
      transferId: 'TR-PII-004',
      assetName: 'customer-chat-transcripts-v1',
      assetType: 'RAW_TRAINING_DATASET',
      classification: 'HIGH_RISK_PII_PROTECTED',
      sourceJurisdiction: 'EU_EEA',
      destinationJurisdiction: 'UNITED_STATES',
      assetSizeBytes: 1024 * 1024 * 50,
      assetSha256Checksum: validSha256,
      transferMechanism: 'NONE',
      dataProtectionOfficerSigned: false
    };

    const manifest = gatekeeper.evaluateTransfer(request);
    expect(manifest.allowed).toBe(false);
    expect(manifest.verdict).toBe('BLOCKED_SOVEREIGNTY_BREACH'); // High score (50 + 45 + 25 = 120 -> 100)
    expect(manifest.reasons.some(r => r.includes('No SCC, BCR, or Adequacy'))).toBe(true);
    expect(manifest.remediationSteps.some(r => r.includes('differential privacy'))).toBe(true);
  });

  it('detects tampered escrow tokens', () => {
    const request: ModelTransferRequest = {
      transferId: 'TR-TAMPER-005',
      assetName: 'safe-embeddings',
      assetType: 'EMBEDDING_VECTORS',
      classification: 'PUBLIC_COMMERCIAL_OPEN',
      sourceJurisdiction: 'EU_EEA',
      destinationJurisdiction: 'UNITED_KINGDOM',
      assetSizeBytes: 1024 * 50,
      assetSha256Checksum: validSha256,
      transferMechanism: 'EU_ADEQUACY_DECISION',
      dataProtectionOfficerSigned: true
    };

    const manifest = gatekeeper.evaluateTransfer(request);
    expect(manifest.escrowToken).not.toBeNull();

    // Tamper with the token
    const tampered = manifest.escrowToken! + 'bad';
    const check = gatekeeper.verifyEscrowToken(tampered);
    expect(check.valid).toBe(false);
    expect(check.error).toContain('Cryptographic signature mismatch');
  });
});
