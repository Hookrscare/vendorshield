import { describe, it, expect } from 'vitest';
import {
  MultiCloudTenantIsolationVerifier,
  TenantContext,
  ResourceAccessProbe,
} from './multi-cloud-tenant-isolation-verifier';

describe('QA-159: Automated Multi-Cloud Tenant Isolation & IAM Boundary Verification Engine', () => {
  const verifier = new MultiCloudTenantIsolationVerifier();

  const mockTenant: TenantContext = {
    tenantId: 'tenant-acme-corp',
    organizationName: 'Acme Corporation',
    allowedCloudAccounts: {
      AWS: ['123456789012'],
      GCP: ['acme-corp-prod'],
      AZURE: ['sub-acme-prod-01'],
      CLOUDFLARE: ['cf-zone-acme'],
    },
    kmsKeyArns: ['arn:aws:kms:us-east-1:123456789012:key/mrk-acme'],
    storagePrefixes: ['s3://acme-vault/tenant-acme-corp/'],
  };

  it('validates compliant probes with perfect isolation score and zero blast radius', () => {
    const validProbes: ResourceAccessProbe[] = [
      {
        requestingTenantId: 'tenant-acme-corp',
        targetCloud: 'AWS',
        targetResourceId: 'arn:aws:s3:::123456789012-vault/tenant-acme-corp/data.parquet',
        targetResourceTenantId: 'tenant-acme-corp',
        attemptedAction: 'READ',
        iamConditions: {
          'aws:PrincipalTag/TenantId': 'tenant-acme-corp',
        },
      },
      {
        requestingTenantId: 'tenant-acme-corp',
        targetCloud: 'GCP',
        targetResourceId: 'projects/acme-corp-prod/buckets/acme-vault/objects/data.json',
        targetResourceTenantId: 'tenant-acme-corp',
        attemptedAction: 'WRITE',
        iamConditions: {
          'resource.labels.tenant_id': 'tenant-acme-corp',
        },
      },
    ];

    const report = verifier.verifyTenantIsolation(mockTenant, validProbes);

    expect(report.isIsolated).toBe(true);
    expect(report.isolationScore).toBe(100);
    expect(report.breachBlastRadius).toBe('ZERO');
    expect(report.violations).toHaveLength(0);
    expect(report.auditAttestationHashSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('detects critical cross-tenant data access attempts', () => {
    const crossTenantProbe: ResourceAccessProbe[] = [
      {
        requestingTenantId: 'tenant-acme-corp',
        targetCloud: 'AWS',
        targetResourceId: 'arn:aws:s3:::123456789012-vault/tenant-competitor-inc/secrets.json',
        targetResourceTenantId: 'tenant-competitor-inc',
        attemptedAction: 'READ',
        iamConditions: {
          'aws:PrincipalTag/TenantId': 'tenant-acme-corp',
        },
      },
    ];

    const report = verifier.verifyTenantIsolation(mockTenant, crossTenantProbe);

    expect(report.isIsolated).toBe(false);
    expect(report.isolationScore).toBeLessThan(70);
    expect(report.breachBlastRadius).toBe('CRITICAL');
    expect(report.violations[0].code).toBe('CROSS_TENANT_LEAK');
  });

  it('flags missing IAM boundary condition tags and wildcard enumeration', () => {
    const flawedProbes: ResourceAccessProbe[] = [
      {
        requestingTenantId: 'tenant-acme-corp',
        targetCloud: 'AWS',
        targetResourceId: 'arn:aws:s3:::123456789012-vault/*',
        targetResourceTenantId: 'tenant-acme-corp',
        attemptedAction: 'ENUMERATE',
        iamConditions: {}, // Missing conditions
      },
    ];

    const report = verifier.verifyTenantIsolation(mockTenant, flawedProbes);

    expect(report.isIsolated).toBe(false);
    expect(report.violations.some(v => v.code === 'MISSING_BOUNDARY_CONDITION')).toBe(true);
    expect(report.violations.some(v => v.code === 'WILDCARD_ENUMERATION')).toBe(true);
  });
});
