import { describe, it, expect } from 'vitest';
import { ZkProofSignatureVault } from './zk-proof-signature-vault';

describe('QA-161: ZkProofSignatureVault Regression Tests', () => {
  const vault = new ZkProofSignatureVault();

  it('generates valid zero-knowledge commitment proof and verifies successfully', () => {
    const secretMasterKey = 'prod-hsm-signing-key-991240-classified';
    const metadata = {
      tenantId: 'tenant-enterprise-globex',
      auditControl: 'SOC2_CC6_8_KEY_MANAGEMENT',
    };

    const { proof, blindingNonce } = vault.generateProof(secretMasterKey, metadata);

    expect(proof.proofId).toMatch(/^zkp_[0-9a-f]{16}$/);
    expect(proof.commitmentHash).toHaveLength(64);
    expect(proof.challenge).toHaveLength(64);
    expect(proof.response).toHaveLength(64);

    const verification = vault.verifyProofCommitment(proof, blindingNonce);
    expect(verification.isValid).toBe(true);
    expect(verification.error).toBeUndefined();
  });

  it('detects metadata tampering and rejects invalid proof', () => {
    const secretData = 'confidential-customer-audit-log';
    const metadata = { jurisdiction: 'EU_FRANKFURT' };
    const { proof, blindingNonce } = vault.generateProof(secretData, metadata);

    // Attacker modifies metadata
    const tamperedProof = {
      ...proof,
      metadata: { jurisdiction: 'US_EAST' },
    };

    const result = vault.verifyProofCommitment(tamperedProof, blindingNonce);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('tampering detected');
  });

  it('rejects verification when proof is revoked', () => {
    const secretData = 'deprecated-session-token';
    const { proof, blindingNonce } = vault.generateProof(secretData);

    vault.revokeProof(proof.proofId);

    const result = vault.verifyProofCommitment(proof, blindingNonce);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('revoked');
  });
});
