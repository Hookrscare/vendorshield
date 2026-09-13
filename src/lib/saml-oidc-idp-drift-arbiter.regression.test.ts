/**
 * src/lib/saml-oidc-idp-drift-arbiter.regression.test.ts
 * Regression tests for QA-169: SamlOidcIdpDriftArbiter.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SamlOidcIdpDriftArbiter,
  IdpCertificateRecord
} from './saml-oidc-idp-drift-arbiter';

describe('QA-169: SamlOidcIdpDriftArbiter', () => {
  let arbiter: SamlOidcIdpDriftArbiter;
  const baseEpoch = 1773000000; // Reference epoch

  beforeEach(() => {
    arbiter = new SamlOidcIdpDriftArbiter();
  });

  it('reports healthy status for modern RSA-2048 SHA-256 certificate with ample validity', () => {
    const cert: IdpCertificateRecord = {
      tenantId: 'tenant_acme',
      idpProvider: 'OKTA',
      protocol: 'SAML_2_0',
      keyId: 'okta_sig_2026',
      fingerprintSha256: 'a1b2c3d4e5f6',
      publicKeyAlgorithm: 'RSA_2048',
      signatureAlgorithm: 'SHA256',
      notBeforeEpoch: baseEpoch - 86400 * 30,
      notAfterEpoch: baseEpoch + 86400 * 180, // 180 days remaining
      isActiveSigningKey: true,
    };

    arbiter.registerCertificate(cert);
    const result = arbiter.auditTenantIdp('tenant_acme', baseEpoch);

    expect(result.overallStatus).toBe('HEALTHY');
    expect(result.daysUntilExpiry).toBe(180);
    expect(result.securityViolations.length).toBe(0);
    expect(result.attestationSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('triggers warning and dual-signing recommendation when expiry is within 30 days', () => {
    const cert: IdpCertificateRecord = {
      tenantId: 'tenant_globex',
      idpProvider: 'ENTRA_ID',
      protocol: 'OIDC_JWKS',
      keyId: 'entra_jwk_01',
      fingerprintSha256: 'b2c3d4e5f6a1',
      publicKeyAlgorithm: 'RSA_2048',
      signatureAlgorithm: 'SHA256',
      notBeforeEpoch: baseEpoch - 86400 * 330,
      notAfterEpoch: baseEpoch + 86400 * 20, // 20 days remaining
      isActiveSigningKey: true,
    };

    arbiter.registerCertificate(cert);
    const result = arbiter.auditTenantIdp('tenant_globex', baseEpoch);

    expect(result.overallStatus).toBe('ROTATION_WARNING');
    expect(result.daysUntilExpiry).toBe(20);
    expect(result.dualSigningConfigured).toBe(false);
    expect(result.recommendedActions.some(a => a.includes('dual-certificate'))).toBe(true);
  });

  it('detects insecure legacy algorithms (RSA 1024-bit and SHA-1)', () => {
    const insecureCert: IdpCertificateRecord = {
      tenantId: 'tenant_legacy',
      idpProvider: 'PING_IDENTITY',
      protocol: 'SAML_2_0',
      keyId: 'legacy_key_99',
      fingerprintSha256: 'c3d4e5f6a1b2',
      publicKeyAlgorithm: 'RSA_1024_INSECURE',
      signatureAlgorithm: 'SHA1_DEPRECATED',
      notBeforeEpoch: baseEpoch - 86400 * 100,
      notAfterEpoch: baseEpoch + 86400 * 200,
      isActiveSigningKey: true,
    };

    arbiter.registerCertificate(insecureCert);
    const result = arbiter.auditTenantIdp('tenant_legacy', baseEpoch);

    expect(result.overallStatus).toBe('INSECURE_CONFIGURATION');
    expect(result.securityViolations.length).toBe(2);
    expect(result.securityViolations.some(v => v.includes('1024-bit'))).toBe(true);
    expect(result.securityViolations.some(v => v.includes('SHA-1'))).toBe(true);
  });
});
