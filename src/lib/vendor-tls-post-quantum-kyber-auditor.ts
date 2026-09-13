/**
 * src/lib/vendor-tls-post-quantum-kyber-auditor.ts
 * Part of VendorShield Third-Party SaaS Security & Compliance Ecosystem.
 *
 * QA-195: Continuous TLS 1.3 / Post-Quantum Kyber-768 Cipher Suite Compliance Auditor.
 * Audits vendor API endpoints and web ingress proxies against post-quantum readiness
 * mandates per NIST FIPS 203 (ML-KEM-768 / Kyber-768) and CNSA 2.0.
 * Enforces TLS 1.3 minimum, rejects legacy weak ciphers (CBC, RC4, 3DES),
 * and verifies quantum-resistant hybrid key exchange groups (X25519Kyber768Draft00 / SecP256r1Kyber768Draft00).
 */

import { createHash } from 'crypto';

export type TlsVersion = 'TLSv1.0' | 'TLSv1.1' | 'TLSv1.2' | 'TLSv1.3';

export interface EndpointTlsAuditInput {
  vendorId: string;
  fqdn: string;
  port: number;
  negotiatedTlsVersion: TlsVersion;
  negotiatedCipherSuite: string;
  supportedGroups: string[];
  alpnProtocols: string[];
  hasPerfectForwardSecrecy: boolean;
}

export interface PostQuantumComplianceEvaluation {
  isTls13Compliant: boolean;
  isPostQuantumKyberEnabled: boolean;
  isCompliantOverall: boolean;
  complianceRating: 'QUANTUM_RESISTANT' | 'TRANSITIONAL_TLS13' | 'LEGACY_NON_COMPLIANT' | 'CRITICAL_RISK';
  violationFlags: string[];
  auditDigestSha256: string;
}

export class VendorTlsPostQuantumKyberAuditor {
  private static readonly APPROVED_PQ_GROUPS = new Set<string>([
    'X25519Kyber768Draft00',
    'SecP256r1Kyber768Draft00',
    'X25519MLKEM768',
    'SecP256r1MLKEM768'
  ]);

  private static readonly WEAK_CIPHERS = [
    'CBC', 'RC4', '3DES', 'DES', 'MD5', 'SHA1', 'NULL', 'EXPORT'
  ];

  public evaluateEndpoint(input: EndpointTlsAuditInput): PostQuantumComplianceEvaluation {
    const violations: string[] = [];

    // 1. Minimum TLS 1.3 enforcement
    const isTls13 = input.negotiatedTlsVersion === 'TLSv1.3';
    if (!isTls13) {
      violations.push(`NON_COMPLIANT_TLS_VERSION: Negotiated ${input.negotiatedTlsVersion}, minimum required is TLSv1.3`);
    }

    // 2. Check for legacy/weak cipher primitives
    const upperCipher = input.negotiatedCipherSuite.toUpperCase();
    for (const weak of VendorTlsPostQuantumKyberAuditor.WEAK_CIPHERS) {
      if (upperCipher.includes(weak)) {
        violations.push(`DEPRECATED_CIPHER_PRIMITIVE: Cipher ${input.negotiatedCipherSuite} contains insecure component ${weak}`);
      }
    }

    // 3. Perfect forward secrecy
    if (!input.hasPerfectForwardSecrecy) {
      violations.push('PFS_ABSENT: Ephemeral Diffie-Hellman / PFS key exchange not negotiated');
    }

    // 4. Post-Quantum Kyber-768 group inspection
    const hasPqGroup = input.supportedGroups.some(g =>
      VendorTlsPostQuantumKyberAuditor.APPROVED_PQ_GROUPS.has(g)
    );
    if (!hasPqGroup) {
      violations.push('POST_QUANTUM_KYBER_UNSUPPORTED: Missing NIST FIPS 203 (ML-KEM / Kyber-768) hybrid key exchange group');
    }

    // 5. Overall compliance rating
    let rating: PostQuantumComplianceEvaluation['complianceRating'] = 'QUANTUM_RESISTANT';
    if (input.negotiatedTlsVersion === 'TLSv1.0' || input.negotiatedTlsVersion === 'TLSv1.1') {
      rating = 'CRITICAL_RISK';
    } else if (!isTls13 || !input.hasPerfectForwardSecrecy) {
      rating = 'LEGACY_NON_COMPLIANT';
    } else if (!hasPqGroup) {
      rating = 'TRANSITIONAL_TLS13';
    }

    const isCompliant = violations.length === 0;

    const raw = `${input.vendorId}:${input.fqdn}:${input.negotiatedTlsVersion}:${input.negotiatedCipherSuite}:${hasPqGroup}:${rating}`;
    const digest = createHash('sha256').update(raw).digest('hex');

    return {
      isTls13Compliant: isTls13,
      isPostQuantumKyberEnabled: hasPqGroup,
      isCompliantOverall: isCompliant,
      complianceRating: rating,
      violationFlags: violations,
      auditDigestSha256: digest
    };
  }
}
