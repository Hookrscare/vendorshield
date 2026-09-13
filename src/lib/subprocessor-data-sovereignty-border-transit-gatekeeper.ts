/**
 * QA-184: Real-Time B2B SaaS Subprocessor Data Sovereignty Border Transit Gatekeeper
 * 
 * Intercepts outbound subprocessor API calls to evaluate GDPR Chapter V / Schrems II
 * cross-border data transfer adequacy, enforcing supplementary encryption or hard blocking.
 */

export type DataJurisdiction = 'EU' | 'EEA' | 'SWITZERLAND' | 'UNITED_STATES' | 'UNITED_KINGDOM' | 'THIRD_COUNTRY_UNRESTRICTED';

export interface OutboundTransitRequest {
  requestId: string;
  customerTenantId: string;
  customerMandatedJurisdiction: DataJurisdiction;
  targetSubprocessorId: string;
  subprocessorHostRegion: string; // e.g. 'us-east-1', 'eu-central-1'
  subprocessorCountry: DataJurisdiction;
  isDpfCertified: boolean; // Data Privacy Framework certified
  hasStandardContractualClauses: boolean;
  isClientSideFieldEncrypted: boolean;
}

export interface BorderTransitDecision {
  requestId: string;
  isTransitPermitted: boolean;
  transitAction: 'PERMIT_TRANSIT' | 'SUPPLEMENTARY_ENCRYPTION_ENFORCED' | 'BLOCKED_SOVEREIGNTY_VIOLATION';
  legalTransferBasis: 'ADEQUATE_INTERNAL_JURISDICTION' | 'EU_US_DPF_CERTIFIED' | 'SCC_WITH_SUPPLEMENTARY_ENCRYPTION' | 'UNLAWFUL_TRANSFER';
  auditReason: string;
  timestampIso: string;
}

export class SubprocessorDataSovereigntyBorderTransitGatekeeper {
  /**
   * Evaluates cross-border transfer compliance and yields a binding transit decision.
   */
  public evaluateTransit(request: OutboundTransitRequest): BorderTransitDecision {
    const {
      customerMandatedJurisdiction,
      subprocessorCountry,
      isDpfCertified,
      hasStandardContractualClauses,
      isClientSideFieldEncrypted,
    } = request;

    // 1. Same-jurisdiction transit is inherently compliant
    if (customerMandatedJurisdiction === subprocessorCountry) {
      return {
        requestId: request.requestId,
        isTransitPermitted: true,
        transitAction: 'PERMIT_TRANSIT',
        legalTransferBasis: 'ADEQUATE_INTERNAL_JURISDICTION',
        auditReason: 'Transit occurs entirely within customer mandated legal jurisdiction.',
        timestampIso: new Date().toISOString(),
      };
    }

    // 2. EU/EEA -> US under EU-US Data Privacy Framework
    if (
      (customerMandatedJurisdiction === 'EU' || customerMandatedJurisdiction === 'EEA') &&
      subprocessorCountry === 'UNITED_STATES'
    ) {
      if (isDpfCertified) {
        return {
          requestId: request.requestId,
          isTransitPermitted: true,
          transitAction: 'PERMIT_TRANSIT',
          legalTransferBasis: 'EU_US_DPF_CERTIFIED',
          auditReason: 'Subprocessor holds valid active EU-US Data Privacy Framework certification.',
          timestampIso: new Date().toISOString(),
        };
      }

      // If not DPF certified, requires SCCs + Client-Side Field-Level Encryption
      if (hasStandardContractualClauses && isClientSideFieldEncrypted) {
        return {
          requestId: request.requestId,
          isTransitPermitted: true,
          transitAction: 'SUPPLEMENTARY_ENCRYPTION_ENFORCED',
          legalTransferBasis: 'SCC_WITH_SUPPLEMENTARY_ENCRYPTION',
          auditReason: 'Transfer allowed under GDPR Article 46 SCCs with technical supplementary encryption.',
          timestampIso: new Date().toISOString(),
        };
      }

      return {
        requestId: request.requestId,
        isTransitPermitted: false,
        transitAction: 'BLOCKED_SOVEREIGNTY_VIOLATION',
        legalTransferBasis: 'UNLAWFUL_TRANSFER',
        auditReason: 'Egress to US blocked: Subprocessor lacks DPF certification and supplementary client encryption.',
        timestampIso: new Date().toISOString(),
      };
    }

    // Default block for non-adequate third countries without supplementary measures
    if (!hasStandardContractualClauses || !isClientSideFieldEncrypted) {
      return {
        requestId: request.requestId,
        isTransitPermitted: false,
        transitAction: 'BLOCKED_SOVEREIGNTY_VIOLATION',
        legalTransferBasis: 'UNLAWFUL_TRANSFER',
        auditReason: 'Non-adequate cross-border transit lacks required contractual and cryptographic safeguards.',
        timestampIso: new Date().toISOString(),
      };
    }

    return {
      requestId: request.requestId,
      isTransitPermitted: true,
      transitAction: 'SUPPLEMENTARY_ENCRYPTION_ENFORCED',
      legalTransferBasis: 'SCC_WITH_SUPPLEMENTARY_ENCRYPTION',
      auditReason: 'Cross-border transfer permitted under verified SCCs and client-side encryption.',
      timestampIso: new Date().toISOString(),
    };
  }
}
