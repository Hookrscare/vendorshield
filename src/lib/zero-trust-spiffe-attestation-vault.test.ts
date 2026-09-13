/**
 * Unit tests for QA-166: Continuous Zero-Trust Workload Identity Federation & Ephemeral SPIFFE/SPIRE Attestation Engine.
 * Part of VendorShield Enterprise Trust Center & SOC 2 Continuous Compliance Vault.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ZeroTrustSpiffeAttestationVault,
  SpiffeWorkloadSelector
} from './zero-trust-spiffe-attestation-vault';

describe('QA-166: Zero-Trust SPIFFE Workload Identity Attestation Vault', () => {
  let vault: ZeroTrustSpiffeAttestationVault;
  const selector: SpiffeWorkloadSelector = {
    trustDomain: 'trust.vendorshield.io',
    namespace: 'compliance-agents',
    serviceAccount: 'evidence-gatherer-01',
    allowedAudiences: ['api.vendorshield.io/v1/vault', 'api.vendorshield.io/v1/soc2']
  };
  const certFingerprint = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  beforeEach(() => {
    vault = new ZeroTrustSpiffeAttestationVault('trust.vendorshield.io', 'super_secret_hmac_key');
  });

  it('correctly formats SPIFFE ID and issues valid ephemeral SVID token', () => {
    const token = vault.issueSvidToken(
      selector,
      certFingerprint,
      'api.vendorshield.io/v1/vault',
      900
    );

    expect(token.spiffeId).toBe('spiffe://trust.vendorshield.io/ns/compliance-agents/sa/evidence-gatherer-01');
    expect(token.tokenId).toMatch(/^svid_/);
    expect(token.expiresAtSec - token.issuedAtSec).toBe(900);

    const verification = vault.verifySvidToken(
      token,
      'api.vendorshield.io/v1/vault',
      certFingerprint
    );

    expect(verification.valid).toBe(true);
    expect(verification.spiffeId).toBe(token.spiffeId);
    expect(verification.timeRemainingSec).toBeGreaterThan(0);
  });

  it('rejects verification if mTLS certificate fingerprint does not match (anti-relay)', () => {
    const token = vault.issueSvidToken(
      selector,
      certFingerprint,
      'api.vendorshield.io/v1/vault'
    );

    const verification = vault.verifySvidToken(
      token,
      'api.vendorshield.io/v1/vault',
      'tampered_or_unauthorized_client_cert_fingerprint'
    );

    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('mTLS certificate fingerprint mismatch');
  });

  it('rejects revoked tokens on CRL', () => {
    const token = vault.issueSvidToken(
      selector,
      certFingerprint,
      'api.vendorshield.io/v1/vault'
    );

    vault.revokeToken(token.tokenId);

    const verification = vault.verifySvidToken(
      token,
      'api.vendorshield.io/v1/vault',
      certFingerprint
    );

    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('revoked on CRL');
  });

  it('rejects token issuance for unauthorized audience', () => {
    expect(() => {
      vault.issueSvidToken(
        selector,
        certFingerprint,
        'unauthorized.thirdparty.external/api'
      );
    }).toThrow(/Audience '.*' not authorized/);
  });
});
