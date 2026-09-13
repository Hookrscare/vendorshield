/**
 * Regression Test Suite for QA-164: Enterprise AI Agent Autonomous Tool Access Delegation & OAuth Token Attestation Vault
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentTokenAttestationVault, ToolCapabilityGrant } from './agent-token-attestation-vault';

describe('QA-164: Enterprise AI Agent Autonomous Tool Access Delegation & OAuth Token Attestation Vault', () => {
  let vault: AgentTokenAttestationVault;
  const dummyOAuthToken = 'ghu_bearer_token_enterprise_ai_secret_123456';
  const tools: ToolCapabilityGrant[] = [
    {
      toolName: 'read_resource',
      allowedActions: ['read', 'list'],
      maxInvocationsPerSession: 5,
      dataClassificationLimit: 'CONFIDENTIAL'
    },
    {
      toolName: 'execute_sql',
      allowedActions: ['SELECT'],
      maxInvocationsPerSession: 2,
      dataClassificationLimit: 'INTERNAL'
    }
  ];

  beforeEach(() => {
    vault = new AgentTokenAttestationVault('test_vault_secret_2026');
  });

  it('successfully issues a cryptographically signed attestation and verifies integrity', () => {
    const envelope = vault.issueAttestation(
      'tenant-acme-corp',
      'agent-data-miner',
      'Compliance Data Auditor',
      dummyOAuthToken,
      tools,
      ['https://api.acme.com/v1/data', 'https://api.acme.com/v1/reports'],
      3600,
      'MEDIUM'
    );

    expect(envelope.status).toBe('VALID');
    expect(envelope.claims.attestationId).toMatch(/^attest_/);
    expect(envelope.claims.tenantId).toBe('tenant-acme-corp');
    expect(envelope.invocationsRemaining['read_resource']).toBe(5);
    expect(envelope.invocationsRemaining['execute_sql']).toBe(2);

    const verified = vault.verifyAttestationIntegrity(envelope.claims.attestationId);
    expect(verified).toBe(true);
  });

  it('validates authorized tool execution requests and decrements invocation quota', () => {
    const envelope = vault.issueAttestation(
      'tenant-stripe',
      'agent-risk-detector',
      'Risk Engine',
      dummyOAuthToken,
      tools,
      ['https://api.stripe.com/audit'],
      1800,
      'LOW'
    );

    const res = vault.validateToolExecution(
      envelope.claims.attestationId,
      dummyOAuthToken,
      'read_resource',
      'read',
      'https://api.stripe.com/audit/logs',
      'INTERNAL'
    );

    expect(res.authorized).toBe(true);
    expect(res.remainingInvocations).toBe(4);
    expect(res.auditRecordHash).toBeDefined();
  });

  it('blocks unauthorized tool actions, token mismatches, and data classification violations', () => {
    const envelope = vault.issueAttestation(
      'tenant-fintech',
      'agent-copilot',
      'Copilot',
      dummyOAuthToken,
      tools,
      ['https://api.fintech.com/v1'],
      3600
    );

    // Mismatched token
    const tokenMismatch = vault.validateToolExecution(
      envelope.claims.attestationId,
      'wrong_token_777',
      'read_resource',
      'read',
      'https://api.fintech.com/v1/user',
      'INTERNAL'
    );
    expect(tokenMismatch.authorized).toBe(false);
    expect(tokenMismatch.reason).toBe('OAUTH_TOKEN_HASH_MISMATCH');

    // Disallowed action
    const actionDisallowed = vault.validateToolExecution(
      envelope.claims.attestationId,
      dummyOAuthToken,
      'execute_sql',
      'DROP TABLE',
      'https://api.fintech.com/v1/db',
      'INTERNAL'
    );
    expect(actionDisallowed.authorized).toBe(false);
    expect(actionDisallowed.reason).toBe('ACTION_NOT_PERMITTED_FOR_TOOL');

    // Classification limit exceeded
    const classExceeded = vault.validateToolExecution(
      envelope.claims.attestationId,
      dummyOAuthToken,
      'execute_sql',
      'SELECT',
      'https://api.fintech.com/v1/db',
      'RESTRICTED' // Limit is INTERNAL
    );
    expect(classExceeded.authorized).toBe(false);
    expect(classExceeded.reason).toBe('DATA_CLASSIFICATION_EXCEEDS_ATTESTED_LIMIT');
  });

  it('enforces quota exhaustion and revocation circuit breakers', () => {
    const envelope = vault.issueAttestation(
      'tenant-quota',
      'agent-worker',
      'Worker',
      dummyOAuthToken,
      tools,
      ['*'],
      3600
    );

    // Consume all 2 queries
    vault.validateToolExecution(envelope.claims.attestationId, dummyOAuthToken, 'execute_sql', 'SELECT', 'https://api.com', 'INTERNAL');
    vault.validateToolExecution(envelope.claims.attestationId, dummyOAuthToken, 'execute_sql', 'SELECT', 'https://api.com', 'INTERNAL');

    // 3rd should fail
    const exhausted = vault.validateToolExecution(envelope.claims.attestationId, dummyOAuthToken, 'execute_sql', 'SELECT', 'https://api.com', 'INTERNAL');
    expect(exhausted.authorized).toBe(false);
    expect(exhausted.reason).toBe('TOOL_INVOCATION_QUOTA_EXHAUSTED');

    // Revoke
    const revoked = vault.revokeAttestation(envelope.claims.attestationId, 'SECURITY_BREACH_SUSPICION');
    expect(revoked).toBe(true);

    const postRevocation = vault.validateToolExecution(envelope.claims.attestationId, dummyOAuthToken, 'read_resource', 'read', 'https://api.com', 'PUBLIC');
    expect(postRevocation.authorized).toBe(false);
    expect(postRevocation.reason).toBe('ATTESTATION_REVOKED');
  });
});
