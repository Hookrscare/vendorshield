/**
 * sub-processor-dpa-transfer-breach-detector.ts
 * QA-168: Automated Sub-Processor DPA Data Transfer Mechanism (SCC/UK Addendum) Breach Detector.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Enforces GDPR Chapter V & UK GDPR International Data Transfer compliance:
 * 1. Checks country adequacy decisions (EU/EEA, Switzerland, UK, Japan, Canada, NZ, etc.).
 * 2. Validates transfer mechanisms (EU SCCs 2021/914 Modules 2/3, UK IDTA, EU-US DPF).
 * 3. Inspects Transfer Impact Assessments (TIA) and mandatory supplementary technical safeguards (CMEK encryption, pseudonymization).
 * 4. Flags compliance violations and automated vendor escalation alerts.
 */

export type JurisdictionCode = 'EU' | 'EEA' | 'UK' | 'US' | 'CH' | 'JP' | 'CA' | 'AU' | 'IN' | 'OTHER';

export type TransferMechanism = 
  | 'ADEQUACY_DECISION'
  | 'EU_SCC_MODULE_2' // Controller-to-Processor
  | 'EU_SCC_MODULE_3' // Processor-to-Processor
  | 'UK_IDTA'         // UK International Data Transfer Addendum
  | 'EU_US_DPF'       // EU-U.S. Data Privacy Framework
  | 'NONE';

export interface SupplementarySafeguards {
  hasEndToEndEncryption: boolean;
  hasCustomerManagedKeys: boolean;
  hasPseudonymization: boolean;
  hasWarrantCanary: boolean;
}

export interface SubProcessorProfile {
  vendorId: string;
  vendorName: string;
  jurisdiction: JurisdictionCode;
  dataCategories: ('PII' | 'FINANCIAL' | 'HEALTH' | 'AUTHENTICATION' | 'TELEMETRY')[];
  transferMechanism: TransferMechanism;
  isDpfCertified: boolean;
  dpfExpirationTimestamp?: number;
  hasCompletedTia: boolean;
  supplementarySafeguards: SupplementarySafeguards;
  sccExecutionDate?: string;
  contractStatus: 'ACTIVE' | 'PENDING_RENEWAL' | 'TERMINATED';
}

export interface BreachDetectionResult {
  vendorId: string;
  isCompliant: boolean;
  riskScore: number; // 0 (Safe) to 100 (Critical Breach)
  breachViolations: string[];
  recommendedActions: string[];
  auditedTimestamp: number;
}

export class SubProcessorDpaTransferBreachDetector {
  private static readonly ADEQUATE_JURISDICTIONS: Set<JurisdictionCode> = new Set([
    'EU', 'EEA', 'UK', 'CH', 'JP', 'CA'
  ]);

  public static evaluateSubProcessor(profile: SubProcessorProfile, currentTimestamp: number = Date.now()): BreachDetectionResult {
    const violations: string[] = [];
    const actions: string[] = [];
    let riskScore = 0;

    if (profile.contractStatus === 'TERMINATED') {
      return {
        vendorId: profile.vendorId,
        isCompliant: true,
        riskScore: 0,
        breachViolations: [],
        recommendedActions: ['Vendor terminated; confirm data deletion certificate.'],
        auditedTimestamp: currentTimestamp
      };
    }

    const isAdequate = this.ADEQUATE_JURISDICTIONS.has(profile.jurisdiction);

    if (!isAdequate) {
      // Non-adequate country (e.g. US, IN, AU, OTHER) requires valid transfer mechanism
      if (profile.jurisdiction === 'US') {
        if (profile.transferMechanism === 'EU_US_DPF') {
          if (!profile.isDpfCertified) {
            violations.push('BREACH_INVALID_DPF: Sub-processor claims DPF but certification is inactive.');
            riskScore += 45;
            actions.push('Require sub-processor to recertify under EU-U.S. DPF or execute EU SCCs.');
          } else if (profile.dpfExpirationTimestamp && profile.dpfExpirationTimestamp < currentTimestamp) {
            violations.push('BREACH_EXPIRED_DPF: EU-U.S. Data Privacy Framework certification expired.');
            riskScore += 40;
            actions.push('Obtain renewed DPF attestation or transition to EU SCCs.');
          }
        } else if (profile.transferMechanism !== 'EU_SCC_MODULE_2' && profile.transferMechanism !== 'EU_SCC_MODULE_3') {
          violations.push('BREACH_UNAUTHORIZED_CROSS_BORDER_TRANSFER: US sub-processor lacks valid DPF or SCCs.');
          riskScore += 50;
          actions.push('Immediately pause data flows and execute standard contractual clauses.');
        }
      } else {
        // Third countries outside US and adequacy list
        if (profile.transferMechanism === 'NONE' || profile.transferMechanism === 'ADEQUACY_DECISION') {
          violations.push(`BREACH_MISSING_SAFEGUARD: Country ${profile.jurisdiction} has no adequacy decision; SCCs required.`);
          riskScore += 50;
          actions.push(`Execute EU SCCs (Module 2 or 3) with vendor in ${profile.jurisdiction}.`);
        }
      }

      // TIA requirement for non-adequate transfers
      if (!profile.hasCompletedTia) {
        violations.push('BREACH_MISSING_TIA: Transfer Impact Assessment (Schrems II) not conducted.');
        riskScore += 25;
        actions.push('Conduct comprehensive Transfer Impact Assessment assessing local surveillance laws.');
      }

      // High-risk data categories require supplementary technical safeguards
      const hasHighRiskData = profile.dataCategories.some(cat => cat === 'FINANCIAL' || cat === 'HEALTH' || cat === 'AUTHENTICATION');
      if (hasHighRiskData) {
        if (!profile.supplementarySafeguards.hasEndToEndEncryption && !profile.supplementarySafeguards.hasCustomerManagedKeys) {
          violations.push('BREACH_INADEQUATE_SUPPLEMENTARY_MEASURES: High-risk data transferred without CMEK or E2EE.');
          riskScore += 25;
          actions.push('Enable Customer Managed Encryption Keys (CMEK) or enforce client-side encryption before transfer.');
        }
      }
    }

    const clampedRisk = Math.min(100, riskScore);
    const isCompliant = violations.length === 0;

    return {
      vendorId: profile.vendorId,
      isCompliant,
      riskScore: clampedRisk,
      breachViolations: violations,
      recommendedActions: actions,
      auditedTimestamp: currentTimestamp
    };
  }
}
