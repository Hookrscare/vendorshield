/**
 * src/lib/vendor-tls-post-quantum-kyber-auditor.regression.test.ts
 * Regression tests for QA-195 Continuous TLS 1.3 / Post-Quantum Kyber-768 Cipher Suite Compliance Auditor.
 */

import { describe, it, expect } from 'vitest';
import {
  VendorTlsPostQuantumKyberAuditor,
  EndpointTlsAuditInput
} from './vendor-tls-post-quantum-kyber-auditor';

describe('VendorTlsPostQuantumKyberAuditor (QA-195)', () => {
  const auditor = new VendorTlsPostQuantumKyberAuditor();

  it('approves fully quantum-resistant TLS 1.3 endpoints with Kyber-768 hybrid groups', () => {
    const input: EndpointTlsAuditInput = {
      vendorId: 'VND-CLOUDFLARE-01',
      fqdn: 'api.enterprise-vendor.com',
      port: 443,
      negotiatedTlsVersion: 'TLSv1.3',
      negotiatedCipherSuite: 'TLS_AES_256_GCM_SHA384',
      supportedGroups: ['X25519Kyber768Draft00', 'X25519', 'secp256r1'],
      alpnProtocols: ['h2', 'http/1.1'],
      hasPerfectForwardSecrecy: true
    };

    const res = auditor.evaluateEndpoint(input);
    expect(res.isCompliantOverall).toBe(true);
    expect(res.isTls13Compliant).toBe(true);
    expect(res.isPostQuantumKyberEnabled).toBe(true);
    expect(res.complianceRating).toBe('QUANTUM_RESISTANT');
    expect(res.violationFlags).toHaveLength(0);
    expect(res.auditDigestSha256).toHaveLength(64);
  });

  it('flags transitional TLS 1.3 endpoints missing post-quantum groups', () => {
    const input: EndpointTlsAuditInput = {
      vendorId: 'VND-LEGACY-CLOUD',
      fqdn: 'auth.legacy-vendor.io',
      port: 443,
      negotiatedTlsVersion: 'TLSv1.3',
      negotiatedCipherSuite: 'TLS_CHACHA20_POLY1305_SHA256',
      supportedGroups: ['X25519', 'secp256r1'],
      alpnProtocols: ['h2'],
      hasPerfectForwardSecrecy: true
    };

    const res = auditor.evaluateEndpoint(input);
    expect(res.isCompliantOverall).toBe(false);
    expect(res.isTls13Compliant).toBe(true);
    expect(res.isPostQuantumKyberEnabled).toBe(false);
    expect(res.complianceRating).toBe('TRANSITIONAL_TLS13');
    expect(res.violationFlags[0]).toContain('POST_QUANTUM_KYBER_UNSUPPORTED');
  });

  it('severely penalizes deprecated TLS 1.0/1.1 with CBC or weak ciphers', () => {
    const input: EndpointTlsAuditInput = {
      vendorId: 'VND-CRITICAL-VULN',
      fqdn: 'old-gateway.insecure-subprocessor.com',
      port: 443,
      negotiatedTlsVersion: 'TLSv1.0',
      negotiatedCipherSuite: 'TLS_RSA_WITH_3DES_EDE_CBC_SHA',
      supportedGroups: [],
      alpnProtocols: ['http/1.1'],
      hasPerfectForwardSecrecy: false
    };

    const res = auditor.evaluateEndpoint(input);
    expect(res.isCompliantOverall).toBe(false);
    expect(res.complianceRating).toBe('CRITICAL_RISK');
    expect(res.violationFlags.some(v => v.includes('NON_COMPLIANT_TLS_VERSION'))).toBe(true);
    expect(res.violationFlags.some(v => v.includes('DEPRECATED_CIPHER_PRIMITIVE'))).toBe(true);
    expect(res.violationFlags.some(v => v.includes('PFS_ABSENT'))).toBe(true);
  });
});
