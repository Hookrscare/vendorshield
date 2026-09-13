import { describe, it, expect } from 'vitest';
import {
  MultiCloudTenantIsolationVerifier,
  TenantContext,
  ResourceAccessProbe,
} from './multi-cloud-tenant-isolation-verifier';

describe('QA-159: MultiCloudTenantIsolationVerifier Regression Suite', () => {
  const verifier = new MultiCloudTenantIsolationVerifier();

  const mockTenant: TenantContext = {
    tenantId: 'tenant-enterprise-99',
    organizationName: 'Enterprise Corp',
    allowedCloudAccounts: {
      AWS: ['123456789012'],
      GCP: ['enterprise-gcp-prod'],
      AZURE: ['sub-enterprise-azure'],
      CLOUDFLARE: ['cf-zone-enterprise'],
    },
    kmsKeyArns: ['arn:aws:kms:us-east-1:123456789012:key/mock-kms'],
    storagePrefixes: ['s3://enterprise-bucket/tenants/tenant-enterprise-99/'],
  };

  it('validates compliant AWS access probes with proper tenant conditions', () => {
    const probes: ResourceAccessProbe[] = [
      {
        requestingTenantId: 'tenant-enterprise-99',
        targetCloud: 'AWS',
        targetResourceId: 'arn:aws:s3:123456789012:tenant-enterprise-99-vault/data.json',
        targetResourceTenantId: 'tenant-enterprise-99',
        attemptedAction: 'READ',
        iamConditions: {
          'aws:PrincipalTag/TenantId': 'tenant-enterprise-99',
        },
      },
    ];

    const report = verifier.verifyTenantIsolation(mockTenant, probes);
    expect(report.isIsolated).toBe(true);
    expect(report.isolationScore).toBe(100);
    expect(report.breachBlastRadius).toBe('ZERO');
    expect(report.violations.length).toBe(0);
    expect(report.auditAttestationHashSha256).toBeDefined();
  });

  it('detects cross-tenant direct data access attempts as CRITICAL breach', () => {
    const probes: ResourceAccessProbe[] = [
      {
        requestingTenantId: 'tenant-enterprise-99',
        targetCloud: 'AWS',
        targetResourceId: 'arn:aws:s3:123456789012:competitor-vault/secrets.json',
        targetResourceTenantId: 'tenant-competitor-88', // Cross tenant leak!
        attemptedAction: 'READ',
        iamConditions: {
          'aws:PrincipalTag/TenantId': 'tenant-enterprise-99',
        },
      },
    ];

    const report = verifier.verifyTenantIsolation(mockTenant, probes);
    expect(report.isIsolated).toBe(false);
    expect(report.breachBlastRadius).toBe('CRITICAL');
    expect(report.isolationScore).toBeLessThan(100);
    expect(report.violations.some((v) => v.code === 'CROSS_TENANT_LEAK')).toBe(true);
  });

  it('detects wildcard enumeration and unauthorized cloud accounts', () => {
    const probes: ResourceAccessProbe[] = [
      {
        requestingTenantId: 'tenant-enterprise-99',
        targetCloud: 'AWS',
        targetResourceId: 'arn:aws:s3:999999999999:unknown-bucket/*', // Wildcard & unknown account
        targetResourceTenantId: 'tenant-enterprise-99',
        attemptedAction: 'ENUMERATE',
        iamConditions: {
          'aws:PrincipalTag/TenantId': 'tenant-enterprise-99',
        },
      },
    ];

    const report = verifier.verifyTenantIsolation(mockTenant, probes);
    expect(report.isIsolated).toBe(false);
    expect(report.violations.some((v) => v.code === 'UNAUTHORIZED_CLOUD_ACCOUNT')).toBe(true);
    expect(report.violations.some((v) => v.code === 'WILDCARD_ENUMERATION')).toBe(true);
  });
});
