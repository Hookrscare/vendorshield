import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import {
  ZkpVendorAuditAttestationPipeline,
  ZkpCommitment,
} from './zkp-vendor-audit-attestation-pipeline';

describe('QA-183: ZkpVendorAuditAttestationPipeline Tests', () => {
  const pipeline = new ZkpVendorAuditAttestationPipeline();

  it('successfully verifies and issues attestation certificate for valid ZKP proof', () => {
    const commitmentHash = createHash('sha256').update('pedersen_c_g0_h1').digest('hex');
    const controlId = 'SOC2-CC6.1-CRITICAL-VULN-COUNT';
    const publicParams = 'secp256k1_bulletproof_v2';
    const bounds = '0:0'; // Proving critical vulnerability count is strictly 0

    const challengeHasher = createHash('sha256');
    challengeHasher.update(commitmentHash);
    challengeHasher.update(controlId);
    challengeHasher.update(bounds);
    challengeHasher.update(publicParams);
    const challengeHex = challengeHasher.digest('hex');

    const validCommitment: ZkpCommitment = {
      commitmentId: 'commit_vend_881',
      vendorId: 'vendor_stripe_data_subprocessor',
      controlId,
      commitmentHashHex: commitmentHash,
      proofType: 'RANGE_PROOF',
      proofPayload: {
        claimLowerBound: 0,
        claimUpperBound: 0,
        proofSignatureHex: `${challengeHex.substring(0, 8)}_sig_valid_zkp_range`,
        publicParamsHex: publicParams,
      },
    };

    const cert = pipeline.verifyAndAttest(validCommitment);

    expect(cert.isProofValid).toBe(true);
    expect(cert.attestationStatus).toBe('VERIFIED_COMPLIANT');
    expect(cert.attestationId).toBe('attest_commit_vend_881');
    expect(cert.verificationDigestHex).toBeDefined();
    expect(cert.verificationDigestHex.length).toBe(64);
  });

  it('rejects tampered or counterfeit proof signature', () => {
    const commitmentHash = createHash('sha256').update('pedersen_c_fake').digest('hex');

    const fakeCommitment: ZkpCommitment = {
      commitmentId: 'commit_fake_001',
      vendorId: 'vendor_untrusted',
      controlId: 'SOC2-CC6.1-CRITICAL-VULN-COUNT',
      commitmentHashHex: commitmentHash,
      proofType: 'RANGE_PROOF',
      proofPayload: {
        claimLowerBound: 0,
        claimUpperBound: 0,
        proofSignatureHex: 'invalid_signature_deadbeef',
        publicParamsHex: 'secp256k1_bulletproof_v2',
      },
    };

    const cert = pipeline.verifyAndAttest(fakeCommitment);

    expect(cert.isProofValid).toBe(false);
    expect(cert.attestationStatus).toBe('CRYPTOGRAPHIC_VERIFICATION_FAILED');
  });
});
