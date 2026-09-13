/**
 * QA-153: Cross-Border Model Transfer Data Sovereign Escrow Gatekeeper
 * Compliance & Data Sovereignty Engine for VendorShield.
 *
 * Enforces GDPR Chapter V & EU AI Act Art. 53 jurisdictional transfer guardrails,
 * SCC Module 2/3 validity, supplementary technical encryption measures,
 * and sovereign quarantine escrow for disallowed cross-border model workloads.
 */

export type JurisdictionCode = 'EU' | 'US' | 'UK' | 'CH' | 'APAC' | 'GLOBAL_DISALLOWED';

export type SccModuleType = 'MODULE_1_C2C' | 'MODULE_2_C2P' | 'MODULE_3_P2P' | 'MODULE_4_P2C' | 'NONE';

export interface CrossBorderTransferRequest {
  transferId: string;
  tenantId: string;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  modelIdentifier: string;
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'HIGHLY_SENSITIVE_PII';
  destinationDpfCertified: boolean; // EU-US Data Privacy Framework certification
  activeSccModule: SccModuleType;
  supplementaryEncryptionEnabled: boolean; // Hardware KMS HSM zero-knowledge envelope
  transferImpactAssessmentScore: number; // 0 to 100 (<= 30 is acceptable risk)
  payloadSizeBytes: number;
}

export type TransferVerdict = 'APPROVED' | 'QUARANTINED_IN_ESCROW' | 'REJECTED_DISALLOWED';

export interface SovereignEscrowResult {
  transferId: string;
  tenantId: string;
  verdict: TransferVerdict;
  isCompliant: boolean;
  blockReason?: string;
  escrowQuarantineId?: string;
  requiredRemediations: string[];
  auditHash: string;
}

export class DataSovereignEscrowGatekeeper {
  private allowedDirectAdequacyPairs: Set<string> = new Set([
    'EU->EU',
    'EU->CH',
    'CH->EU',
    'UK->EU',
    'EU->UK',
    'US->US',
    'APAC->APAC',
  ]);

  private hashPayload(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  public evaluateTransfer(request: CrossBorderTransferRequest): SovereignEscrowResult {
    const routeKey = `${request.sourceJurisdiction}->${request.destinationJurisdiction}`;
    const remediations: string[] = [];

    // Check if within same adequacy zone
    if (this.allowedDirectAdequacyPairs.has(routeKey)) {
      return {
        transferId: request.transferId,
        tenantId: request.tenantId,
        verdict: 'APPROVED',
        isCompliant: true,
        requiredRemediations: [],
        auditHash: this.hashPayload(`APPROVED-${request.transferId}`),
      };
    }

    // EU -> US Cross-border transfer requirements
    if (request.sourceJurisdiction === 'EU' && request.destinationJurisdiction === 'US') {
      let isEligible = false;

      // Path A: Destination has valid EU-US Data Privacy Framework (DPF)
      if (request.destinationDpfCertified) {
        isEligible = true;
      } else if (
        request.activeSccModule === 'MODULE_2_C2P' ||
        request.activeSccModule === 'MODULE_3_P2P'
      ) {
        // Path B: Standard Contractual Clauses (SCC)
        isEligible = true;
      } else {
        remediations.push('Execute valid EU Standard Contractual Clauses (SCC Module 2 or 3) or complete DPF certification.');
      }

      // Mandatory supplementary encryption for sensitive data
      if (
        (request.dataClassification === 'CONFIDENTIAL' || request.dataClassification === 'HIGHLY_SENSITIVE_PII') &&
        !request.supplementaryEncryptionEnabled
      ) {
        isEligible = false;
        remediations.push('Mandatory Supplementary Technical Measure: Enable KMS HSM Zero-Knowledge client-side envelope encryption.');
      }

      // Transfer Impact Assessment (TIA) risk ceiling
      if (request.transferImpactAssessmentScore > 30) {
        isEligible = false;
        remediations.push(`TIA residual risk score of ${request.transferImpactAssessmentScore}/100 exceeds maximum allowable threshold of 30.`);
      }

      if (isEligible) {
        return {
          transferId: request.transferId,
          tenantId: request.tenantId,
          verdict: 'APPROVED',
          isCompliant: true,
          requiredRemediations: [],
          auditHash: this.hashPayload(`APPROVED-EU-US-${request.transferId}`),
        };
      }
    } else if (request.destinationJurisdiction === 'GLOBAL_DISALLOWED') {
      return {
        transferId: request.transferId,
        tenantId: request.tenantId,
        verdict: 'REJECTED_DISALLOWED',
        isCompliant: false,
        blockReason: 'Destination jurisdiction is blacklisted under corporate data export policy.',
        requiredRemediations: ['Route model workload through approved localized sovereign enclave.'],
        auditHash: this.hashPayload(`REJECTED-${request.transferId}`),
      };
    } else {
      remediations.push(`Unsupported cross-border sovereign route: ${routeKey}. Adequacy or bilateral SCCs missing.`);
    }

    // Non-compliant transfer is held in Sovereign Quarantine Escrow
    const escrowId = `ESCROW-Q-${request.transferId.slice(0, 8)}-${Date.now()}`;
    return {
      transferId: request.transferId,
      tenantId: request.tenantId,
      verdict: 'QUARANTINED_IN_ESCROW',
      isCompliant: false,
      blockReason: `Cross-border transfer failed compliance criteria: ${remediations.join(' ')}`,
      escrowQuarantineId: escrowId,
      requiredRemediations: remediations,
      auditHash: this.hashPayload(`QUARANTINED-${request.transferId}-${escrowId}`),
    };
  }
}
