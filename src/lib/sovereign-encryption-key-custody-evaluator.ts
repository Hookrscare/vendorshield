/**
 * QA-178: Cross-Border Cloud Data Residency Sovereign Encryption Key Custody Evaluator
 * Compliance & Data Sovereignty Engine for VendorShield.
 *
 * Evaluates enterprise cloud encryption key architectures against GDPR Art. 48,
 * EU-US Data Privacy Framework, US CLOUD Act extraterritorial subpoena exposure,
 * BSI C5, and ANSSI SecNumCloud sovereign key custody standards.
 */

import { createHash } from 'crypto';

export type KeyCustodyModel =
  | 'CLOUD_MANAGED_KEY'
  | 'CUSTOMER_MANAGED_KEY_CMK'
  | 'BRING_YOUR_OWN_KEY_BYOK'
  | 'HOLD_YOUR_OWN_KEY_HYOK_EKM';

export type SovereignRegion =
  | 'EU_GERMANY'
  | 'EU_FRANCE'
  | 'EU_IRELAND'
  | 'UK'
  | 'SWITZERLAND'
  | 'US_EAST'
  | 'US_WEST'
  | 'APAC_SINGAPORE'
  | 'APAC_JAPAN';

export type CloudProviderJurisdiction =
  | 'US_CLOUD_ACT_SUBJECT'
  | 'EU_SOVEREIGN_INDEPENDENT'
  | 'SWISS_INDEPENDENT';

export interface KeyArchitectureAssessmentInput {
  assessmentId: string;
  vendorId: string;
  vendorName: string;
  custodyModel: KeyCustodyModel;
  dataResidencyRegion: SovereignRegion;
  kmsHsmPhysicalRegion: SovereignRegion;
  providerHeadquartersJurisdiction: CloudProviderJurisdiction;
  hsmFipsLevel: 1 | 2 | 3 | 4;
  kekAlgorithm: 'AES_256_GCM' | 'RSA_4096' | 'ECDSA_P384' | 'POST_QUANTUM_HYBRID_ML_KEM';
  automatedKeyRotationDays: number; // e.g. 90, 180, 365, 0 (no rotation)
  supportsDoubleKeyEncryption: boolean;
  externalKeyAuditLoggingImmutable: boolean;
}

export type ExtraterritorialSubpoenaRisk =
  | 'IMMUNE_SOVEREIGN_CONTAINMENT'
  | 'LOW_MITIGATED_BY_EKM'
  | 'MEDIUM_RESTRICTED_ACCESS'
  | 'HIGH_EXTRATERRITORIAL_CLOUD_ACT_EXPOSED';

export type ResidencyComplianceVerdict =
  | 'FULLY_COMPLIANT'
  | 'CONDITIONAL_APPROVAL_WITH_EXCEPTION'
  | 'REJECTED_NON_COMPLIANT';

export interface SovereignKeyAssessmentReport {
  assessmentId: string;
  vendorId: string;
  sovereigntyScore: number; // 0 - 100
  verdict: ResidencyComplianceVerdict;
  subpoenaRisk: ExtraterritorialSubpoenaRisk;
  crossBorderKeyLeakageDetected: boolean;
  findings: string[];
  remediationDirectives: string[];
  auditDigestSha256: string;
  evaluatedAtIso: string;
}

export class SovereignEncryptionKeyCustodyEvaluator {
  /**
   * Evaluates key custody architecture against sovereign data residency mandates.
   */
  public evaluate(input: KeyArchitectureAssessmentInput): SovereignKeyAssessmentReport {
    const findings: string[] = [];
    const remediations: string[] = [];
    let score = 100;

    // 1. Cross-border key residency vs data residency parity
    const crossBorderKeyLeakage = input.dataResidencyRegion !== input.kmsHsmPhysicalRegion;
    if (crossBorderKeyLeakage) {
      score -= 25;
      findings.push(
        `Cross-border key residency mismatch: Data is resident in ${input.dataResidencyRegion} while KMS HSM keys reside in ${input.kmsHsmPhysicalRegion}.`
      );
      remediations.push(
        `Relocate KMS HSM partition or deploy External Key Manager (EKM) directly in ${input.dataResidencyRegion}.`
      );
    }

    // 2. Custody model & Extraterritorial CLOUD Act exposure
    let subpoenaRisk: ExtraterritorialSubpoenaRisk = 'IMMUNE_SOVEREIGN_CONTAINMENT';

    if (input.providerHeadquartersJurisdiction === 'US_CLOUD_ACT_SUBJECT') {
      if (input.custodyModel === 'CLOUD_MANAGED_KEY') {
        score -= 40;
        subpoenaRisk = 'HIGH_EXTRATERRITORIAL_CLOUD_ACT_EXPOSED';
        findings.push(
          'Cloud-managed keys under a US-headquartered cloud provider expose European customer data to extraterritorial CLOUD Act subpoenas without customer disclosure.'
        );
        remediations.push(
          'Migrate immediately to Hold-Your-Own-Key (HYOK/EKM) or Customer-Managed Keys (CMK) with sovereign HSM boundary.'
        );
      } else if (input.custodyModel === 'CUSTOMER_MANAGED_KEY_CMK') {
        score -= 20;
        subpoenaRisk = 'MEDIUM_RESTRICTED_ACCESS';
        findings.push(
          'Customer-Managed Keys (CMK) within cloud HSM remain vulnerable to cloud operator administrative intervention or compelled disclosure under US CLOUD Act.'
        );
        remediations.push(
          'Upgrade to External Key Management (EKM) with Double Key Encryption (DKE) to maintain exclusive key custody.'
        );
      } else if (input.custodyModel === 'BRING_YOUR_OWN_KEY_BYOK') {
        score -= 10;
        subpoenaRisk = 'MEDIUM_RESTRICTED_ACCESS';
        findings.push(
          'BYOK imported key material resides in cloud provider memory during active cryptographic operations.'
        );
        remediations.push(
          'Enforce confidential computing enclave attestation or external key custody (HYOK).'
        );
      } else if (input.custodyModel === 'HOLD_YOUR_OWN_KEY_HYOK_EKM') {
        if (!crossBorderKeyLeakage) {
          subpoenaRisk = 'IMMUNE_SOVEREIGN_CONTAINMENT';
        } else {
          subpoenaRisk = 'LOW_MITIGATED_BY_EKM';
        }
      }
    } else {
      // Independent EU or Swiss provider
      if (input.custodyModel === 'CLOUD_MANAGED_KEY') {
        score -= 15;
        subpoenaRisk = 'MEDIUM_RESTRICTED_ACCESS';
        findings.push('Cloud-managed keys limit customer operational visibility and root key revocation authority.');
        remediations.push('Adopt Customer-Managed Keys (CMK) to enable sovereign crypto-shredding.');
      }
    }

    // 3. HSM Certification
    if (input.hsmFipsLevel < 3) {
      score -= 15;
      findings.push(`HSM certified at FIPS 140-2/3 Level ${input.hsmFipsLevel}, below enterprise sovereign threshold (Level 3 required).`);
      remediations.push('Provision HSM partitions certified to FIPS 140-2 Level 3 or higher with tamper-responsive zeroization.');
    }

    // 4. Algorithm & Post-Quantum Readiness
    if (input.kekAlgorithm === 'RSA_4096') {
      score -= 5;
      findings.push('RSA-4096 key encryption key exhibits higher quantum-decrypt vulnerability than modern elliptic curves or post-quantum hybrids.');
      remediations.push('Transition KEK hierarchy to AES-256-GCM or Post-Quantum Hybrid ML-KEM.');
    } else if (input.kekAlgorithm === 'POST_QUANTUM_HYBRID_ML_KEM') {
      // Bonus resilience
      score = Math.min(100, score + 5);
    }

    // 5. Automated Key Rotation
    if (input.automatedKeyRotationDays <= 0 || input.automatedKeyRotationDays > 365) {
      score -= 15;
      findings.push(`Key rotation cadence (${input.automatedKeyRotationDays} days) violates BSI C5 / SOC 2 annual rotation mandate.`);
      remediations.push('Configure automated key rotation interval to <= 365 days (recommended: 90 days).');
    }

    // 6. Immutable Audit Logging
    if (!input.externalKeyAuditLoggingImmutable) {
      score -= 10;
      findings.push('External key access audit logging is not marked immutable (WORM storage missing).');
      remediations.push('Enable write-once-read-many (WORM) audit ledger on key invocation access logs.');
    }

    // Final score clamp
    score = Math.max(0, Math.min(100, score));

    // Verdict determination
    let verdict: ResidencyComplianceVerdict;
    if (score >= 80 && subpoenaRisk !== 'HIGH_EXTRATERRITORIAL_CLOUD_ACT_EXPOSED') {
      verdict = 'FULLY_COMPLIANT';
    } else if (score >= 60 && subpoenaRisk !== 'HIGH_EXTRATERRITORIAL_CLOUD_ACT_EXPOSED') {
      verdict = 'CONDITIONAL_APPROVAL_WITH_EXCEPTION';
    } else {
      verdict = 'REJECTED_NON_COMPLIANT';
    }

    const evaluatedAtIso = new Date().toISOString();
    const digestData = `${input.assessmentId}|${input.vendorId}|${score}|${verdict}|${subpoenaRisk}|${evaluatedAtIso}`;
    const auditDigestSha256 = createHash('sha256').update(digestData).digest('hex');

    return {
      assessmentId: input.assessmentId,
      vendorId: input.vendorId,
      sovereigntyScore: score,
      verdict,
      subpoenaRisk,
      crossBorderKeyLeakageDetected: crossBorderKeyLeakage,
      findings,
      remediationDirectives: remediations,
      auditDigestSha256,
      evaluatedAtIso,
    };
  }
}
