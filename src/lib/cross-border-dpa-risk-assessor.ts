/**
 * cross-border-dpa-risk-assessor.ts
 * QA-185: Multi-Jurisdiction Cross-Border Data Sovereign Transfer Risk Assessor & DPA Synchronizer.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Cross-border sovereign data transfer and Transfer Impact Assessment (TIA) engine:
 * 1. Categorizes vendor destination jurisdiction against EU adequacy lists.
 * 2. Checks EU-US Data Privacy Framework (DPF) certification active status.
 * 3. Audits supplementary technical measures (CMEK key custody, transit pseudonymization).
 * 4. Determines transfer lawfulness and generates compliant Data Processing Agreement (DPA) clauses.
 */

export interface SovereignTransferProfile {
  vendorId: string;
  vendorName: string;
  destinationCountryIso: string;    // e.g. "US", "DE", "IN", "JP"
  isDpfCertified: boolean;          // Active on Data Privacy Framework list
  hasSignedSccs: boolean;           // EU Standard Contractual Clauses executed
  customerControlsEncryptionKey: boolean; // CMEK outside destination country
  dataPseudonymizedInTransit: boolean;
  transfersSpecialCategoryData: boolean; // Article 9 GDPR data
}

export interface SovereignTransferEvaluation {
  vendorId: string;
  transferLegalityStatus: 'PERMITTED_ADEQUATE' | 'PERMITTED_WITH_SUPPLEMENTARY_MEASURES' | 'HIGH_RISK_SUSPEND_TRANSFER';
  transferMechanism: 'EU_ADEQUACY_DECISION' | 'DATA_PRIVACY_FRAMEWORK_DPF' | 'SCCS_WITH_SUPPLEMENTARY_MEASURES' | 'INSUFFICIENT_SAFEGUARDS';
  residualRiskScore: number;         // 0 - 100 (lower is safer)
  mandatoryTiaMeasuresRequired: string[];
  dpaAnnexClauseText: string;
}

export class CrossBorderDpaRiskAssessor {
  private static readonly ADEQUATE_COUNTRIES = new Set<string>([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
    'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
    'GB', 'CH', 'JP', 'CA', 'NZ', 'KR'
  ]);

  public static assessTransfer(profile: SovereignTransferProfile): SovereignTransferEvaluation {
    const isAdequate = this.ADEQUATE_COUNTRIES.has(profile.destinationCountryIso.toUpperCase());
    const requiredMeasures: string[] = [];

    let mechanism: SovereignTransferEvaluation['transferMechanism'] = 'INSUFFICIENT_SAFEGUARDS';
    let status: SovereignTransferEvaluation['transferLegalityStatus'] = 'HIGH_RISK_SUSPEND_TRANSFER';
    let riskScore = 85;

    if (isAdequate) {
      mechanism = 'EU_ADEQUACY_DECISION';
      status = 'PERMITTED_ADEQUATE';
      riskScore = 15;
    } else if (profile.destinationCountryIso.toUpperCase() === 'US' && profile.isDpfCertified) {
      mechanism = 'DATA_PRIVACY_FRAMEWORK_DPF';
      status = 'PERMITTED_ADEQUATE';
      riskScore = 25;
    } else if (profile.hasSignedSccs) {
      mechanism = 'SCCS_WITH_SUPPLEMENTARY_MEASURES';
      
      // Schrems II supplementary measures check
      if (profile.customerControlsEncryptionKey && profile.dataPseudonymizedInTransit) {
        status = 'PERMITTED_WITH_SUPPLEMENTARY_MEASURES';
        riskScore = 35;
      } else {
        status = 'HIGH_RISK_SUSPEND_TRANSFER';
        riskScore = 80;
        if (!profile.customerControlsEncryptionKey) {
          requiredMeasures.push('Implement customer-managed encryption key (CMEK) held outside destination jurisdiction.');
        }
        if (!profile.dataPseudonymizedInTransit) {
          requiredMeasures.push('Enforce upstream cryptographic tokenization/pseudonymization prior to cross-border egress.');
        }
      }
    } else {
      requiredMeasures.push('Execute EU Standard Contractual Clauses (Module 2/3 Controller-to-Processor).');
    }

    if (profile.transfersSpecialCategoryData) {
      riskScore += 15;
    }

    const dpaText = status === 'HIGH_RISK_SUSPEND_TRANSFER'
      ? 'DPA Annex II: Transfer suspended pending implementation of mandatory supplementary technical measures under Schrems II.'
      : `DPA Annex II: Data transfer governed under ${mechanism}. Vendor warrants compliance with Technical and Organizational Measures (TOMs) ensuring equivalent data protection.`;

    return {
      vendorId: profile.vendorId,
      transferLegalityStatus: status,
      transferMechanism: mechanism,
      residualRiskScore: Math.min(100, riskScore),
      mandatoryTiaMeasuresRequired: requiredMeasures,
      dpaAnnexClauseText: dpaText
    };
  }
}
