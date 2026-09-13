/**
 * QA-153: Cross-Border Model Transfer Data Sovereign Escrow Gatekeeper
 * 
 * Enforces cross-border AI model, weights, and fine-tuning dataset data sovereignty rules.
 * Inspects source/destination sovereign jurisdictions, transfer mechanisms (SCCs, Adequacy, BCRs),
 * cryptographic escrow lock hashes, and verifies compliance with GDPR Chapter V, EU AI Act Art 53,
 * and regional data localization mandates.
 */

import { createHash, createHmac } from 'crypto';

export type SovereignJurisdiction =
  | 'EU_EEA'
  | 'UNITED_KINGDOM'
  | 'SWITZERLAND'
  | 'UNITED_STATES'
  | 'CANADA'
  | 'JAPAN'
  | 'SINGAPORE'
  | 'RESTRICTED_THIRD_COUNTRY';

export type ModelAssetType =
  | 'RAW_TRAINING_DATASET'
  | 'FINE_TUNING_CHECKPOINT'
  | 'FOUNDATION_MODEL_WEIGHTS'
  | 'EMBEDDING_VECTORS'
  | 'INFERENCE_CACHE'
  | 'PROMPT_COMPLETION_LOGS';

export type DataSovereigntyClassification =
  | 'CRITICAL_NATIONAL_INFRASTRUCTURE'
  | 'HIGH_RISK_PII_PROTECTED'
  | 'ENTERPRISE_CONFIDENTIAL'
  | 'PUBLIC_COMMERCIAL_OPEN';

export type TransferMechanism =
  | 'EU_ADEQUACY_DECISION'
  | 'STANDARD_CONTRACTUAL_CLAUSES_MOD2'
  | 'STANDARD_CONTRACTUAL_CLAUSES_MOD3'
  | 'BINDING_CORPORATE_RULES'
  | 'SOVEREIGN_ESCROW_VAULT'
  | 'EXPLICIT_USER_DEROGATION'
  | 'NONE';

export type GatekeeperVerdict =
  | 'PERMITTED'
  | 'ESCROW_HOLD_PENDING_APPROVAL'
  | 'QUARANTINED'
  | 'BLOCKED_SOVEREIGNTY_BREACH';

export interface ModelTransferRequest {
  transferId: string;
  assetName: string;
  assetType: ModelAssetType;
  classification: DataSovereigntyClassification;
  sourceJurisdiction: SovereignJurisdiction;
  destinationJurisdiction: SovereignJurisdiction;
  assetSizeBytes: number;
  assetSha256Checksum: string;
  transferMechanism: TransferMechanism;
  dataProtectionOfficerSigned: boolean;
  escrowCustodyKeyId?: string;
  legalBasisNotes?: string;
  metadata?: Record<string, unknown>;
}

export interface EscrowManifest {
  manifestId: string;
  transferId: string;
  verdict: GatekeeperVerdict;
  allowed: boolean;
  sourceJurisdiction: SovereignJurisdiction;
  destinationJurisdiction: SovereignJurisdiction;
  riskScore: number; // 0 - 100
  escrowToken: string | null;
  reasons: string[];
  remediationSteps: string[];
  evaluationTimestamp: string;
}

const ADEQUATE_JURISDICTIONS_FOR_EU = new Set<SovereignJurisdiction>([
  'EU_EEA',
  'UNITED_KINGDOM',
  'SWITZERLAND',
  'CANADA',
  'JAPAN'
]);

export class CrossBorderModelTransferEscrowGatekeeper {
  private readonly hmacSecret: string;

  constructor(secret: string = 'vendorshield-sovereign-escrow-default-secret') {
    this.hmacSecret = secret;
  }

  /**
   * Evaluates an inbound or outbound AI model transfer request against sovereign boundary policies.
   */
  public evaluateTransfer(request: ModelTransferRequest): EscrowManifest {
    const reasons: string[] = [];
    const remediationSteps: string[] = [];
    let riskScore = 0;
    const now = new Date().toISOString();
    const manifestId = `ESCROW-MAN-${createHash('sha256').update(request.transferId + now).digest('hex').substring(0, 16).toUpperCase()}`;

    // 1. Check for missing or invalid cryptographic checksum
    if (!request.assetSha256Checksum || !/^[a-fA-F0-9]{64}$/.test(request.assetSha256Checksum)) {
      reasons.push('Invalid or missing SHA-256 asset payload checksum.');
      remediationSteps.push('Generate a valid 64-character SHA-256 checksum of the model asset or checkpoint archive.');
      riskScore += 40;
    }

    // 2. Intra-jurisdiction transfers (e.g. EU -> EU) are intrinsically low risk
    const isIntraJurisdiction = request.sourceJurisdiction === request.destinationJurisdiction;
    if (isIntraJurisdiction) {
      riskScore = Math.max(0, riskScore + 5);
      return {
        manifestId,
        transferId: request.transferId,
        verdict: 'PERMITTED',
        allowed: true,
        sourceJurisdiction: request.sourceJurisdiction,
        destinationJurisdiction: request.destinationJurisdiction,
        riskScore,
        escrowToken: this.generateEscrowToken(request, manifestId),
        reasons: ['Intra-jurisdiction transfer complies with local sovereign residency policy.'],
        remediationSteps: [],
        evaluationTimestamp: now
      };
    }

    // 3. Evaluate Destination Jurisdiction & Restricted Third Countries
    if (request.destinationJurisdiction === 'RESTRICTED_THIRD_COUNTRY') {
      reasons.push('Target destination is classified as a Restricted Third Country under sovereign export controls.');
      remediationSteps.push('Transfer of AI model weights or datasets to restricted third countries requires sovereign state department license.');
      riskScore = 100;
      return {
        manifestId,
        transferId: request.transferId,
        verdict: 'BLOCKED_SOVEREIGNTY_BREACH',
        allowed: false,
        sourceJurisdiction: request.sourceJurisdiction,
        destinationJurisdiction: request.destinationJurisdiction,
        riskScore,
        escrowToken: null,
        reasons,
        remediationSteps,
        evaluationTimestamp: now
      };
    }

    // 4. Evaluate CNI (Critical National Infrastructure)
    if (request.classification === 'CRITICAL_NATIONAL_INFRASTRUCTURE') {
      reasons.push('Assets classified as Critical National Infrastructure are prohibited from cross-border egress without ministerial exception.');
      remediationSteps.push('Migrate processing to on-premise or sovereign isolated local cloud enclave.');
      riskScore = 100;
      return {
        manifestId,
        transferId: request.transferId,
        verdict: 'BLOCKED_SOVEREIGNTY_BREACH',
        allowed: false,
        sourceJurisdiction: request.sourceJurisdiction,
        destinationJurisdiction: request.destinationJurisdiction,
        riskScore,
        escrowToken: null,
        reasons,
        remediationSteps,
        evaluationTimestamp: now
      };
    }

    // 5. Check High-Risk PII or Raw Training Datasets exiting EU/EEA
    if (request.sourceJurisdiction === 'EU_EEA' || request.sourceJurisdiction === 'SWITZERLAND' || request.sourceJurisdiction === 'UNITED_KINGDOM') {
      const isAdequate = ADEQUATE_JURISDICTIONS_FOR_EU.has(request.destinationJurisdiction);
      
      if (!isAdequate) {
        // Transfer to non-adequate jurisdiction (e.g. US, Singapore)
        if (request.transferMechanism === 'NONE') {
          reasons.push(`Cross-border transfer from ${request.sourceJurisdiction} to ${request.destinationJurisdiction} lacks legal transfer mechanism (No SCC, BCR, or Adequacy).`);
          remediationSteps.push('Execute Standard Contractual Clauses (SCC 2021/914 Module 2/3) and conduct Transfer Impact Assessment (TIA).');
          riskScore += 50;
        }

        if (request.classification === 'HIGH_RISK_PII_PROTECTED' && request.assetType === 'RAW_TRAINING_DATASET') {
          reasons.push('Raw un-anonymized training dataset with High Risk PII crossing sovereign boundary requires Escrow Quarantine.');
          remediationSteps.push('Apply zero-knowledge differential privacy or synthetic anonymization tokenization prior to release.');
          riskScore += 45;
        }

        if (!request.dataProtectionOfficerSigned) {
          reasons.push('Mandatory DPO (Data Protection Officer) cryptographic sign-off is absent.');
          remediationSteps.push('Obtain formal sign-off from designated corporate DPO in compliance audit register.');
          riskScore += 25;
        }
      }
    }

    // 6. Check Escrow Custody Key Requirement for High-Capacity Weights
    if (request.assetType === 'FOUNDATION_MODEL_WEIGHTS' || request.assetType === 'FINE_TUNING_CHECKPOINT') {
      if (!request.escrowCustodyKeyId) {
        reasons.push('Model weights or checkpoints exceed 1B parameter threshold without hardware HSM Escrow Custody Key.');
        remediationSteps.push('Provision KMS Cloud HSM escrow custody key and link key ID in transfer manifest.');
        riskScore += 20;
      }
    }

    // 7. Determine Final Gatekeeper Verdict
    let verdict: GatekeeperVerdict = 'PERMITTED';
    let allowed = true;
    let token: string | null = null;

    if (riskScore >= 70) {
      verdict = 'BLOCKED_SOVEREIGNTY_BREACH';
      allowed = false;
    } else if (riskScore >= 35) {
      verdict = 'ESCROW_HOLD_PENDING_APPROVAL';
      allowed = false;
      reasons.push('Asset locked in cryptographic sovereign escrow pending required attestations.');
    } else if (riskScore > 0) {
      verdict = 'PERMITTED';
      allowed = true;
      reasons.push('Transfer permitted subject to continuous audit logging and active SCC governance.');
      token = this.generateEscrowToken(request, manifestId);
    } else {
      verdict = 'PERMITTED';
      allowed = true;
      reasons.push('Full data sovereignty compliance validated.');
      token = this.generateEscrowToken(request, manifestId);
    }

    return {
      manifestId,
      transferId: request.transferId,
      verdict,
      allowed,
      sourceJurisdiction: request.sourceJurisdiction,
      destinationJurisdiction: request.destinationJurisdiction,
      riskScore: Math.min(100, riskScore),
      escrowToken: token,
      reasons,
      remediationSteps,
      evaluationTimestamp: now
    };
  }

  /**
   * Generates a tamper-proof HMAC authorization token certifying escrow clearance.
   */
  private generateEscrowToken(request: ModelTransferRequest, manifestId: string): string {
    const payload = `${manifestId}|${request.transferId}|${request.sourceJurisdiction}|${request.destinationJurisdiction}|${request.assetSha256Checksum}`;
    const hmac = createHmac('sha256', this.hmacSecret).update(payload).digest('hex');
    return `VS-ESCROW-${Buffer.from(payload).toString('base64url')}.${hmac}`;
  }

  /**
   * Validates an emitted escrow release token for downstream model deployment ingress.
   */
  public verifyEscrowToken(token: string): { valid: boolean; manifestId?: string; transferId?: string; error?: string } {
    if (!token.startsWith('VS-ESCROW-')) {
      return { valid: false, error: 'Malformed token prefix' };
    }

    const raw = token.slice('VS-ESCROW-'.length);
    const parts = raw.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid token structure' };
    }

    const [payloadB64, signature] = parts;
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const expectedSig = createHmac('sha256', this.hmacSecret).update(payload).digest('hex');

    if (expectedSig !== signature) {
      return { valid: false, error: 'Cryptographic signature mismatch or token tampering detected' };
    }

    const [manifestId, transferId] = payload.split('|');
    return { valid: true, manifestId, transferId };
  }
}
