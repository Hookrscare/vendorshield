/**
 * QA-164: Enterprise AI Agent Autonomous Tool Access Delegation & OAuth Token Attestation Vault
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Cryptographically binds autonomous AI agent tool execution permissions with verifiable
 * OAuth token attestations, providing hardware/cryptographic proof of delegated authority,
 * zero-trust tool execution policies, and tamper-evident audit chains for SOC 2 CC6.1/6.3 & ISO 42001.
 */

import { createHash, createHmac, randomBytes } from 'crypto';

export type AttestationVaultStatus = 'VALID' | 'REVOKED' | 'EXPIRED' | 'QUARANTINED';

export interface ToolCapabilityGrant {
  toolName: string;
  allowedActions: string[];
  maxInvocationsPerSession: number;
  dataClassificationLimit: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  requireApprovalAboveRiskScore?: number;
}

export interface AgentAttestationClaims {
  attestationId: string;
  tenantId: string;
  agentId: string;
  agentRole: string;
  parentSessionId: string;
  authorizedTools: ToolCapabilityGrant[];
  allowedResourceUris: string[];
  oauthTokenHash: string; // SHA-256 of the downstream OAuth bearer token
  issuedAt: string;
  expiresAt: string;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ephemeralKeyFingerprint: string;
}

export interface SignedAttestationEnvelope {
  claims: AgentAttestationClaims;
  status: AttestationVaultStatus;
  claimsSha256: string;
  vaultSignature: string;
  invocationsRemaining: Record<string, number>;
  auditChainHash: string;
}

export interface ToolExecutionValidationResult {
  authorized: boolean;
  reason: string;
  attestationId: string;
  toolName: string;
  actionRequested: string;
  remainingInvocations: number;
  auditRecordHash: string;
}

export class AgentTokenAttestationVault {
  private vaultSecret: string;
  private attestations: Map<string, SignedAttestationEnvelope> = new Map();
  private auditLogHashes: string[] = [];

  constructor(vaultSecret: string = 'vshield_sec_attestation_vault_2026') {
    this.vaultSecret = vaultSecret;
    // Initial genesis hash
    this.auditLogHashes.push(
      createHash('sha256').update('GENESIS_AGENT_ATTESTATION_VAULT_ROOT').digest('hex')
    );
  }

  /**
   * Generates and cryptographically seals a new agent token attestation envelope.
   */
  public issueAttestation(
    tenantId: string,
    agentId: string,
    agentRole: string,
    rawOAuthToken: string,
    authorizedTools: ToolCapabilityGrant[],
    allowedResourceUris: string[],
    ttlSeconds: number = 3600,
    riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
  ): SignedAttestationEnvelope {
    const attestationId = `attest_${randomBytes(12).toString('hex')}`;
    const now = new Date();
    const expires = new Date(now.getTime() + ttlSeconds * 1000);

    const tokenHash = createHash('sha256').update(rawOAuthToken).digest('hex');
    const keyFingerprint = createHash('sha256').update(`${agentId}:${tenantId}:${now.toISOString()}`).digest('hex').substring(0, 16);

    const claims: AgentAttestationClaims = {
      attestationId,
      tenantId,
      agentId,
      agentRole,
      parentSessionId: `sess_${randomBytes(8).toString('hex')}`,
      authorizedTools,
      allowedResourceUris,
      oauthTokenHash: tokenHash,
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      riskTier,
      ephemeralKeyFingerprint: keyFingerprint
    };

    const claimsJson = JSON.stringify(claims, Object.keys(claims).sort());
    const claimsSha256 = createHash('sha256').update(claimsJson).digest('hex');
    const vaultSignature = createHmac('sha256', this.vaultSecret).update(claimsSha256).digest('hex');

    const invocations: Record<string, number> = {};
    for (const tool of authorizedTools) {
      invocations[tool.toolName] = tool.maxInvocationsPerSession;
    }

    const prevAuditHash = this.auditLogHashes[this.auditLogHashes.length - 1];
    const auditChainHash = createHash('sha256')
      .update(`${prevAuditHash}:${attestationId}:${claimsSha256}:ISSUED`)
      .digest('hex');
    this.auditLogHashes.push(auditChainHash);

    const envelope: SignedAttestationEnvelope = {
      claims,
      status: 'VALID',
      claimsSha256,
      vaultSignature,
      invocationsRemaining: invocations,
      auditChainHash
    };

    this.attestations.set(attestationId, envelope);
    return envelope;
  }

  /**
   * Verifies the cryptographic integrity of an attestation envelope.
   */
  public verifyAttestationIntegrity(attestationId: string): boolean {
    const envelope = this.attestations.get(attestationId);
    if (!envelope) return false;

    const claimsJson = JSON.stringify(envelope.claims, Object.keys(envelope.claims).sort());
    const computedSha = createHash('sha256').update(claimsJson).digest('hex');
    if (computedSha !== envelope.claimsSha256) return false;

    const computedSig = createHmac('sha256', this.vaultSecret).update(computedSha).digest('hex');
    return computedSig === envelope.vaultSignature;
  }

  /**
   * Validates whether an autonomous agent tool invocation request is permitted by the attested token.
   */
  public validateToolExecution(
    attestationId: string,
    rawOAuthToken: string,
    toolName: string,
    actionRequested: string,
    targetResourceUri: string,
    dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' = 'INTERNAL'
  ): ToolExecutionValidationResult {
    const envelope = this.attestations.get(attestationId);
    if (!envelope) {
      return {
        authorized: false,
        reason: 'ATTESTATION_NOT_FOUND',
        attestationId,
        toolName,
        actionRequested,
        remainingInvocations: 0,
        auditRecordHash: ''
      };
    }

    // Check status
    if (envelope.status !== 'VALID') {
      return {
        authorized: false,
        reason: `ATTESTATION_${envelope.status}`,
        attestationId,
        toolName,
        actionRequested,
        remainingInvocations: 0,
        auditRecordHash: ''
      };
    }

    // Check expiration
    if (new Date() > new Date(envelope.claims.expiresAt)) {
      envelope.status = 'EXPIRED';
      return {
        authorized: false,
        reason: 'TOKEN_ATTESTATION_EXPIRED',
        attestationId,
        toolName,
        actionRequested,
        remainingInvocations: 0,
        auditRecordHash: ''
      };
    }

    // Check bearer token hash match
    const givenTokenHash = createHash('sha256').update(rawOAuthToken).digest('hex');
    if (givenTokenHash !== envelope.claims.oauthTokenHash) {
      return {
        authorized: false,
        reason: 'OAUTH_TOKEN_HASH_MISMATCH',
        attestationId,
        toolName,
        actionRequested,
        remainingInvocations: 0,
        auditRecordHash: ''
      };
    }

    // Check resource URI prefix
    const resourceAllowed = envelope.claims.allowedResourceUris.some(
      uri => uri === '*' || targetResourceUri.startsWith(uri)
    );
    if (!resourceAllowed) {
      return {
        authorized: false,
        reason: 'TARGET_RESOURCE_URI_DISALLOWED',
        attestationId,
        toolName,
        actionRequested,
        remainingInvocations: envelope.invocationsRemaining[toolName] || 0,
        auditRecordHash: ''
      };
    }

    // Check tool grant
    const toolGrant = envelope.claims.authorizedTools.find(t => t.toolName === toolName);
    if (!toolGrant) {
      return {
        authorized: false,
        reason: 'TOOL_NOT_AUTHORIZED_IN_ATTESTATION',
        attestationId,
        toolName,
        actionRequested,
        remainingInvocations: 0,
        auditRecordHash: ''
      };
    }

    // Check action
    if (!toolGrant.allowedActions.includes('*') && !toolGrant.allowedActions.includes(actionRequested)) {
      return {
        authorized: false,
        reason: 'ACTION_NOT_PERMITTED_FOR_TOOL',
        attestationId,
        toolName,
        actionRequested,
        remainingInvocations: envelope.invocationsRemaining[toolName] || 0,
        auditRecordHash: ''
      };
    }

    // Check quota
    const remaining = envelope.invocationsRemaining[toolName] ?? 0;
    if (remaining <= 0) {
      return {
        authorized: false,
        reason: 'TOOL_INVOCATION_QUOTA_EXHAUSTED',
        attestationId,
        toolName,
        actionRequested,
        remainingInvocations: 0,
        auditRecordHash: ''
      };
    }

    // Check data classification hierarchy
    const levels = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];
    const limitIndex = levels.indexOf(toolGrant.dataClassificationLimit);
    const requestedIndex = levels.indexOf(dataClassification);
    if (requestedIndex > limitIndex) {
      return {
        authorized: false,
        reason: 'DATA_CLASSIFICATION_EXCEEDS_ATTESTED_LIMIT',
        attestationId,
        toolName,
        actionRequested,
        remainingInvocations: remaining,
        auditRecordHash: ''
      };
    }

    // Decrement remaining invocations
    envelope.invocationsRemaining[toolName] = remaining - 1;

    // Record audit event
    const prevAuditHash = this.auditLogHashes[this.auditLogHashes.length - 1];
    const auditRecordHash = createHash('sha256')
      .update(`${prevAuditHash}:${attestationId}:${toolName}:${actionRequested}:AUTHORIZED`)
      .digest('hex');
    this.auditLogHashes.push(auditRecordHash);
    envelope.auditChainHash = auditRecordHash;

    return {
      authorized: true,
      reason: 'AUTHORIZED',
      attestationId,
      toolName,
      actionRequested,
      remainingInvocations: envelope.invocationsRemaining[toolName],
      auditRecordHash
    };
  }

  /**
   * Explicitly revokes an active attestation across the enterprise vault.
   */
  public revokeAttestation(attestationId: string, reason: string): boolean {
    const envelope = this.attestations.get(attestationId);
    if (!envelope) return false;

    envelope.status = 'REVOKED';
    const prevAuditHash = this.auditLogHashes[this.auditLogHashes.length - 1];
    const auditRecordHash = createHash('sha256')
      .update(`${prevAuditHash}:${attestationId}:REVOKED:${reason}`)
      .digest('hex');
    this.auditLogHashes.push(auditRecordHash);
    envelope.auditChainHash = auditRecordHash;
    return true;
  }

  /**
   * Retrieves audit trail verification metrics for SOC 2 Type II attestation reporting.
   */
  public getVaultAuditReport(): { totalAttestations: number; chainLength: number; rootHash: string } {
    return {
      totalAttestations: this.attestations.size,
      chainLength: this.auditLogHashes.length,
      rootHash: this.auditLogHashes[this.auditLogHashes.length - 1]
    };
  }
}
