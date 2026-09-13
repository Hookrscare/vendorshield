/**
 * QA-179: Automated Vendor PCI-DSS 4.0 Scope Reduction & Network Tokenization Auditor
 * 
 * Audits third-party payment vendor integrations, verifying network tokenization, hosted fields encapsulation,
 * and CSP script integrity to determine minimum SAQ classification under PCI-DSS v4.0 requirements 6.4.3 and 11.6.1.
 */

export interface PaymentVendorIntegrationConfig {
  vendorName: string;
  integrationPattern: 'IFRAME_HOSTED_FIELDS' | 'DIRECT_API_TRANSMISSION' | 'REVERSE_PROXY_TOKENIZER';
  usesNetworkTokenization: boolean; // EMVCo Network Tokens vs raw PAN
  hasStrictCspScriptSrc: boolean; // Requirement 6.4.3
  hasSubresourceIntegritySri: boolean;
  hasTamperDetectionHeader: boolean; // Requirement 11.6.1
  panStoredInVendorDatabase: boolean;
}

export interface PciDssScopeAssessment {
  vendorName: string;
  applicableSaqType: 'SAQ_A' | 'SAQ_A_EP' | 'SAQ_D_SERVICE_PROVIDER';
  isPciScopeMinimized: boolean;
  isCompliantWithV4Mandate: boolean;
  identifiedComplianceRisks: string[];
  recommendedMitigations: string[];
}

export class VendorPciDssScopeReductionAuditor {
  /**
   * Evaluates integration pattern and security controls against PCI-DSS v4.0.
   */
  public auditVendorIntegration(config: PaymentVendorIntegrationConfig): PciDssScopeAssessment {
    const risks: string[] = [];
    const mitigations: string[] = [];

    let saqType: PciDssScopeAssessment['applicableSaqType'] = 'SAQ_A';
    let isMinimized = true;

    // Direct API transmission pulls entire application infrastructure into SAQ D scope
    if (config.integrationPattern === 'DIRECT_API_TRANSMISSION' || config.panStoredInVendorDatabase) {
      saqType = 'SAQ_D_SERVICE_PROVIDER';
      isMinimized = false;
      risks.push('CRITICAL: Direct PAN transmission/storage expands Cardholder Data Environment (CDE) to full SAQ-D scope.');
      mitigations.push('Migrate to client-side tokenized iframe hosted fields (Stripe Elements / Adyen Drop-in).');
    } else if (config.integrationPattern === 'REVERSE_PROXY_TOKENIZER') {
      saqType = 'SAQ_A_EP';
      isMinimized = false;
      risks.push('WARNING: Reverse proxy tokenization requires SAQ A-EP vulnerability scanning.');
    } else {
      saqType = 'SAQ_A';
      isMinimized = true;
    }

    // PCI-DSS v4.0 Mandates (6.4.3 & 11.6.1)
    let v4Compliant = true;
    if (!config.hasStrictCspScriptSrc || !config.hasSubresourceIntegritySri) {
      v4Compliant = false;
      risks.push('PCI 6.4.3 VIOLATION: Payment page lacks strict CSP or SRI script integrity validation.');
      mitigations.push('Deploy CSP headers with cryptographic nonces and SRI sha384 hashes for payment scripts.');
    }

    if (!config.hasTamperDetectionHeader) {
      v4Compliant = false;
      risks.push('PCI 11.6.1 VIOLATION: Lacks automated HTTP header tamper-detection alerting.');
      mitigations.push('Implement synthetic synthetic crawler to monitor payment page DOM mutations and script insertions.');
    }

    if (!config.usesNetworkTokenization) {
      risks.push('ADVISORY: Legacy card numbers used instead of EMVCo Network Tokens, increasing decline rates.');
      mitigations.push('Enable network tokenization with Visa/Mastercard digital enablement.');
    }

    return {
      vendorName: config.vendorName,
      applicableSaqType: saqType,
      isPciScopeMinimized: isMinimized,
      isCompliantWithV4Mandate: v4Compliant && (saqType === 'SAQ_A'),
      identifiedComplianceRisks: risks,
      recommendedMitigations: mitigations,
    };
  }
}
