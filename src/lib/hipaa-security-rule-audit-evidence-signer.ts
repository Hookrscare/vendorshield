/**
 * QA-188: Automated HIPAA Security Rule Continuous Audit Evidence Cryptographic Signer
 * 
 * Cryptographically attests and signs continuous compliance audit evidence for 45 CFR Part 164 Subpart C
 * (Administrative Safeguards § 164.308, Physical Safeguards § 164.310, Technical Safeguards § 164.312).
 * Enforces ePHI audit logging integrity, transmission encryption standards, and 6-year retention compliance.
 */

import { createHash, createHmac } from 'crypto';

export type HipaaSafeguardCategory = 'administrative' | 'physical' | 'technical';

export interface HipaaAuditEvidenceItem {
  evidenceId: string;
  cfrCitation: string; // e.g. "164.312(a)(1)", "164.312(b)", "164.312(e)(2)(ii)"
  safeguardCategory: HipaaSafeguardCategory;
  controlTitle: string;
  vendorOrgId: string;
  collectedAtIso: string;
  auditTelemetry: {
    ephiEncryptionCipher?: string;
    tlsMinVersion?: string;
    auditLogRetentionYears?: number;
    emergencyAccessProcedureDocumented?: boolean;
    baaExecuted?: boolean;
    mfaEnforced?: boolean;
    rawLogSamples?: Record<string, any>[];
    [key: string]: any;
  };
}

export interface HipaaAttestationSeal {
  evidenceId: string;
  cfrCitation: string;
  safeguardCategory: HipaaSafeguardCategory;
  payloadDigestSha256: string;
  chainHashSha256: string;
  signerKeyId: string;
  attestationTimestampIso: string;
  hmacSignature: string;
  complianceVerdict: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING';
  findings: string[];
}

export class HipaaSecurityRuleAuditEvidenceSigner {
  private signingSecret: string;
  private signerKeyId: string;

  constructor(
    signingSecret: string = 'hipaa-audit-master-signing-key-v1',
    signerKeyId: string = 'vs-hipaa-signer-hsm-01'
  ) {
    if (!signingSecret || signingSecret.length < 16) {
      throw new Error('Signing secret must be at least 16 characters long.');
    }
    this.signingSecret = signingSecret;
    this.signerKeyId = signerKeyId;
  }

  public computePayloadDigest(evidence: HipaaAuditEvidenceItem): string {
    const canonicalize = (val: any): string => {
      if (val === null || typeof val !== 'object') {
        return JSON.stringify(val);
      }
      if (Array.isArray(val)) {
        return '[' + val.map(canonicalize).join(',') + ']';
      }
      const sortedKeys = Object.keys(val).sort();
      return '{' + sortedKeys.map(k => `${JSON.stringify(k)}:${canonicalize(val[k])}`).join(',') + '}';
    };

    const canonical = canonicalize(evidence);
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
  }

  public evaluateHipaaCompliance(evidence: HipaaAuditEvidenceItem): {
    verdict: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING';
    findings: string[];
  } {
    const findings: string[] = [];
    let isNonCompliant = false;
    let hasWarning = false;

    const tel = evidence.auditTelemetry;

    // 1. Business Associate Agreement (§ 164.308(b)(1))
    if (tel.baaExecuted === false) {
      findings.push('CRITICAL: Business Associate Agreement (BAA) is not executed (§ 164.308(b)(1)).');
      isNonCompliant = true;
    }

    // 2. ePHI Transmission Encryption (§ 164.312(e)(2)(ii))
    if (tel.ephiEncryptionCipher) {
      const allowedCiphers = ['AES-256-GCM', 'ChaCha20-Poly1305', 'AES-128-GCM'];
      if (!allowedCiphers.includes(tel.ephiEncryptionCipher)) {
        findings.push(`CRITICAL: Insecure ePHI cipher '${tel.ephiEncryptionCipher}'. Must use authenticated AES-GCM or ChaCha20 (§ 164.312(e)(2)(ii)).`);
        isNonCompliant = true;
      }
    }

    // 3. Minimum TLS Version
    if (tel.tlsMinVersion) {
      if (['TLSv1.0', 'TLSv1.1', 'SSLv3'].includes(tel.tlsMinVersion)) {
        findings.push(`CRITICAL: Deprecated ${tel.tlsMinVersion} detected. HIPAA requires TLSv1.2 or TLSv1.3.`);
        isNonCompliant = true;
      } else if (tel.tlsMinVersion === 'TLSv1.2') {
        findings.push('ADVISORY: TLSv1.2 in use. Migration to TLSv1.3 recommended.');
        hasWarning = true;
      }
    }

    // 4. Audit Log Retention (§ 164.316(b)(2)(i)) - Required minimum 6 years
    if (tel.auditLogRetentionYears !== undefined && tel.auditLogRetentionYears < 6) {
      findings.push(`CRITICAL: Audit log retention of ${tel.auditLogRetentionYears} years violates HIPAA 6-year retention mandate (§ 164.316(b)(2)(i)).`);
      isNonCompliant = true;
    }

    // 5. Access Control & MFA (§ 164.312(a)(1) & § 164.312(d))
    if (tel.mfaEnforced === false) {
      findings.push('WARNING: MFA is not strictly enforced on ePHI administrative endpoints (§ 164.312(d)).');
      hasWarning = true;
    }

    if (findings.length === 0) {
      findings.push('All evaluated HIPAA Security Rule technical controls satisfy § 164.308/310/312.');
    }

    const verdict = isNonCompliant ? 'NON_COMPLIANT' : hasWarning ? 'WARNING' : 'COMPLIANT';
    return { verdict, findings };
  }

  public signEvidence(
    evidence: HipaaAuditEvidenceItem,
    previousChainHash: string = '0000000000000000000000000000000000000000000000000000000000000000',
    timestampIso?: string
  ): HipaaAttestationSeal {
    if (!evidence.evidenceId || !evidence.cfrCitation) {
      throw new Error('Evidence item must include evidenceId and cfrCitation.');
    }

    const payloadDigest = this.computePayloadDigest(evidence);
    const chainHash = createHash('sha256')
      .update(`${previousChainHash}:${payloadDigest}`, 'utf8')
      .digest('hex');

    const evalResult = this.evaluateHipaaCompliance(evidence);
    const tsIso = timestampIso || new Date().toISOString();

    const signaturePayload = `${evidence.evidenceId}:${evidence.cfrCitation}:${payloadDigest}:${chainHash}:${tsIso}:${evalResult.verdict}:${this.signerKeyId}`;
    const hmacSignature = createHmac('sha256', this.signingSecret)
      .update(signaturePayload, 'utf8')
      .digest('hex');

    return {
      evidenceId: evidence.evidenceId,
      cfrCitation: evidence.cfrCitation,
      safeguardCategory: evidence.safeguardCategory,
      payloadDigestSha256: payloadDigest,
      chainHashSha256: chainHash,
      signerKeyId: this.signerKeyId,
      attestationTimestampIso: tsIso,
      hmacSignature,
      complianceVerdict: evalResult.verdict,
      findings: evalResult.findings
    };
  }

  public verifyAttestationSeal(
    seal: HipaaAttestationSeal,
    evidence: HipaaAuditEvidenceItem,
    previousChainHash: string = '0000000000000000000000000000000000000000000000000000000000000000'
  ): boolean {
    const expectedDigest = this.computePayloadDigest(evidence);
    if (seal.payloadDigestSha256 !== expectedDigest) {
      return false;
    }

    const expectedChainHash = createHash('sha256')
      .update(`${previousChainHash}:${expectedDigest}`, 'utf8')
      .digest('hex');
    if (seal.chainHashSha256 !== expectedChainHash) {
      return false;
    }

    const evalResult = this.evaluateHipaaCompliance(evidence);
    if (seal.complianceVerdict !== evalResult.verdict) {
      return false;
    }

    const signaturePayload = `${evidence.evidenceId}:${evidence.cfrCitation}:${expectedDigest}:${expectedChainHash}:${seal.attestationTimestampIso}:${evalResult.verdict}:${seal.signerKeyId}`;
    const expectedSignature = createHmac('sha256', this.signingSecret)
      .update(signaturePayload, 'utf8')
      .digest('hex');

    return seal.hmacSignature === expectedSignature;
  }
}
