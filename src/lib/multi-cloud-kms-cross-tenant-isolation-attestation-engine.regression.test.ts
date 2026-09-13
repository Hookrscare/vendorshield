/**
 * src/lib/multi-cloud-kms-cross-tenant-isolation-attestation-engine.regression.test.ts
 * Unit tests for QA-191 Multi-Cloud KMS Cross-Tenant Isolation Attestation Engine.
 */

import { describe, it, expect } from 'vitest';
import {
  MultiCloudKmsCrossTenantIsolationAttestationEngine,
  TenantKmsKeyMetadata
} from './multi-cloud-kms-cross-tenant-isolation-attestation-engine';

describe('MultiCloudKmsCrossTenantIsolationAttestationEngine (QA-191)', () => {
  const tenantAKey: TenantKmsKeyMetadata = {
    tenantId: 'TENANT_ALPHA',
    provider: 'AWS_KMS',
    keyArn: 'arn:aws:kms:us-east-1:111122223333:key/alpha-isolated-key',
    keyRingOrVaultId: 'vault-alpha',
    isCustomerManaged: true,
    enforcesEncryptionContext: true,
    allowedPrincipalIds: ['arn:aws:iam::111122223333:role/AlphaAppRole'],
    wildcardAccessDetected: false,
    keyRotationDays: 90
  };

  const tenantBKey: TenantKmsKeyMetadata = {
    tenantId: 'TENANT_BETA',
    provider: 'AWS_KMS',
    keyArn: 'arn:aws:kms:us-east-1:111122223333:key/beta-isolated-key',
    keyRingOrVaultId: 'vault-beta',
    isCustomerManaged: true,
    enforcesEncryptionContext: true,
    allowedPrincipalIds: ['arn:aws:iam::111122223333:role/BetaAppRole'],
    wildcardAccessDetected: false,
    keyRotationDays: 90
  };

  it('verifies complete cryptographic isolation between distinct tenant keys', () => {
    const res = MultiCloudKmsCrossTenantIsolationAttestationEngine.attestTenantIsolation(
      tenantAKey,
      [tenantBKey]
    );

    expect(res.isIsolated).toBe(true);
    expect(res.isolationGrade).toBe('CRYPTOGRAPHICALLY_ISOLATED');
    expect(res.findings).toHaveLength(0);
    expect(res.evidenceDigestSha256).toHaveLength(64);
  });

  it('detects cross-tenant key sharing violation', () => {
    const sharedKey: TenantKmsKeyMetadata = {
      ...tenantBKey,
      keyArn: tenantAKey.keyArn // Accidental shared ARN!
    };

    const res = MultiCloudKmsCrossTenantIsolationAttestationEngine.attestTenantIsolation(
      tenantAKey,
      [sharedKey]
    );

    expect(res.isIsolated).toBe(false);
    expect(res.isolationGrade).toBe('CROSS_TENANT_VIOLATION_CRITICAL');
    expect(res.findings[0]).toContain('Cross-tenant key sharing detected');
  });

  it('flags warning when encryption context is not strictly enforced', () => {
    const nonStrictKey: TenantKmsKeyMetadata = {
      ...tenantAKey,
      enforcesEncryptionContext: false
    };

    const res = MultiCloudKmsCrossTenantIsolationAttestationEngine.attestTenantIsolation(
      nonStrictKey,
      [tenantBKey]
    );

    expect(res.isIsolated).toBe(false);
    expect(res.isolationGrade).toBe('POLICY_DEFICIENCY_WARN');
    expect(res.findings[0]).toContain('kms:EncryptionContext');
  });

  it('flags critical violation on wildcard IAM permissions', () => {
    const wildcardKey: TenantKmsKeyMetadata = {
      ...tenantAKey,
      wildcardAccessDetected: true
    };

    const res = MultiCloudKmsCrossTenantIsolationAttestationEngine.attestTenantIsolation(
      wildcardKey,
      [tenantBKey]
    );

    expect(res.isolationGrade).toBe('CROSS_TENANT_VIOLATION_CRITICAL');
    expect(res.findings.some(f => f.includes('Wildcard IAM'))).toBe(true);
  });
});
