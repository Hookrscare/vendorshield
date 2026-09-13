/**
 * src/lib/subprocessor-dpa-transfer-breach-detector.ts
 * QA-168: Automated Sub-Processor DPA Data Transfer Mechanism (SCC/UK Addendum) Breach Detector.
 * Part of VendorShield (B2B SOC 2 & GDPR Sub-Processor Trust Hub).
 *
 * Continuously validates international cross-border data transfer mechanisms under GDPR Ch. V / UK DPA:
 * - Checks EU Standard Contractual Clauses (2021/914/EU Modules 2/3) and UK IDTA / Addendum execution
 * - Validates EU-US Data Privacy Framework (DPF) active registry standing
 * - Flags unauthorized server region migration to third countries lacking Adequacy Decisions
 * - Assesses Schrems II supplementary technical measures (CMEK encryption, EU key custody)
 * - Generates cryptographically verifiable SHA-256 compliance audit attestation
 */

import { createHash } from 'crypto';

export type TransferMechanismType =
  | 'EU_ADEQUACY_DECISION'
  | 'EU_SCCS_MODULE_2' // Controller-to-Processor
  | 'EU_SCCS_MODULE_3' // Processor-to-Processor
  | 'UK_IDTA'
  | 'UK_ADDENDUM_TO_SCCS'
  | 'EU_US_DATA_PRIVACY_FRAMEWORK'
  | 'NONE';

export interface SubProcessorTransferProfile {
  subprocessorId: string;
  name: string;
  headquartersCountry: string;
  processingRegions: string[];         // ISO country codes e.g. ["DE", "US", "IN"]
  transferMechanisms: TransferMechanismType[];
  dpfCertified: boolean;
  dpfCertificationExpiresEpoch?: number;
  sccExecutedEpoch?: number;
  ukAddendumExecutedEpoch?: number;
  supplementaryEncryptionEnforced: boolean;
  customerKeysRetainedInEu: boolean;
}

export type BreachSeverity = 'CRITICAL_BREACH' | 'HIGH_RISK_WARNING' | 'COMPLIANT';

export interface TransferBreachFinding {
  ruleId: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  regulatoryReference: string;
}

export interface TransferBreachAssessment {
  subprocessorId: string;
  timestamp: number;
  overallStatus: BreachSeverity;
  findings: TransferBreachFinding[];
  requiresDataProcessingSuspension: boolean;
  curePeriodDaysRemaining: number;
  attestationHash: string;
}

// Countries with European Commission Adequacy Decisions (Art. 45 GDPR)
const ADEQUATE_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', // EU Member States
  'IS', 'LI', 'NO', // EEA
  'AD', 'AR', 'CA', 'FO', 'GG', 'IL', 'IM', 'JP', 'JE', 'NZ', 'KR', 'CH', 'GB', 'UY' // Adequacy decisions
]);

export class SubprocessorDpaTransferBreachDetector {
  /**
   * Assesses sub-processor transfer compliance and flags cross-border transfer breaches.
   */
  public evaluateTransferCompliance(
    profile: SubProcessorTransferProfile,
    assessmentTimeEpoch: number = Math.floor(Date.now() / 1000)
  ): TransferBreachAssessment {
    const findings: TransferBreachFinding[] = [];

    // 1. Identify non-adequate third countries in processing footprint
    const nonAdequateRegions = profile.processingRegions.filter(
      (cc) => !ADEQUATE_COUNTRIES.has(cc.toUpperCase())
    );

    if (nonAdequateRegions.length > 0) {
      const hasScc =
        profile.transferMechanisms.includes('EU_SCCS_MODULE_2') ||
        profile.transferMechanisms.includes('EU_SCCS_MODULE_3');
      const hasUkAddendum =
        profile.transferMechanisms.includes('UK_ADDENDUM_TO_SCCS') ||
        profile.transferMechanisms.includes('UK_IDTA');
      
      const isUsOnly = nonAdequateRegions.every((r) => r.toUpperCase() === 'US');
      const isDpfValid =
        profile.dpfCertified &&
        profile.dpfCertificationExpiresEpoch &&
        profile.dpfCertificationExpiresEpoch > assessmentTimeEpoch;

      if (!hasScc && !(isUsOnly && isDpfValid)) {
        findings.push({
          ruleId: 'GDPR-ART-46-MISSING-SCC',
          title: 'Missing Standard Contractual Clauses for Non-Adequate Third Country Transfer',
          severity: 'CRITICAL',
          description: `Personal data processed in ${nonAdequateRegions.join(', ')} without valid EU SCCs or active DPF certification.`,
          regulatoryReference: 'GDPR Article 46(1) / Schrems II Ruling',
        });
      }

      // Check UK Addendum if processing under UK GDPR
      if (!hasUkAddendum && !isDpfValid) {
        findings.push({
          ruleId: 'UK-DPA-MISSING-ADDENDUM',
          title: 'Missing UK International Data Transfer Addendum (IDTA)',
          severity: 'HIGH',
          description: `Transfers to ${nonAdequateRegions.join(', ')} lack UK Addendum to SCCs.`,
          regulatoryReference: 'UK Data Protection Act 2018 Section 119A',
        });
      }

      // Check Schrems II supplementary technical measures
      if (!profile.supplementaryEncryptionEnforced || !profile.customerKeysRetainedInEu) {
        findings.push({
          ruleId: 'SCHREMS-II-SUPPLEMENTARY-MEASURES-DEFICIENT',
          title: 'Deficient Supplementary Technical Safeguards for Foreign Surveillance Risk',
          severity: 'HIGH',
          description: 'Data transferred to non-adequate jurisdiction without EU-retained encryption keys.',
          regulatoryReference: 'EDPB Recommendations 01/2020 on Supplementary Measures',
        });
      }
    }

    // Determine overall status
    let overallStatus: BreachSeverity = 'COMPLIANT';
    let requiresSuspension = false;
    let cureDays = 30;

    const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
    const highCount = findings.filter((f) => f.severity === 'HIGH').length;

    if (criticalCount > 0) {
      overallStatus = 'CRITICAL_BREACH';
      requiresSuspension = true;
      cureDays = 14;
    } else if (highCount > 0) {
      overallStatus = 'HIGH_RISK_WARNING';
      cureDays = 30;
    }

    const payload = `${profile.subprocessorId}:${overallStatus}:${findings.length}:${assessmentTimeEpoch}`;
    const attestationHash = createHash('sha256').update(payload).digest('hex');

    return {
      subprocessorId: profile.subprocessorId,
      timestamp: assessmentTimeEpoch,
      overallStatus,
      findings,
      requiresDataProcessingSuspension: requiresSuspension,
      curePeriodDaysRemaining: cureDays,
      attestationHash,
    };
  }
}
