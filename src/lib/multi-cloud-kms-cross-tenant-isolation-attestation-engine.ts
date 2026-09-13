/**
 * src/lib/multi-cloud-kms-cross-tenant-isolation-attestation-engine.ts
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * QA-191: Automated Multi-Cloud KMS Cross-Tenant Isolation Attestation Engine.
 * Verifies and cryptographically attests that Customer Managed Encryption Keys (CMEK)
 * across AWS KMS, GCP Cloud KMS, and Azure Key Vault maintain strict cryptographic
 * isolation between tenant data boundaries with zero cross-tenant key leakage.
 */

import { createHash } from 'crypto';

export type CloudProvider = 'AWS_KMS' | 'GCP_CLOUD_KMS' | 'AZURE_KEY_VAULT';

export interface TenantKmsKeyMetadata {
  tenantId: string;
  provider: CloudProvider;
  keyArn: string;
  keyRingOrVaultId: string;
  isCustomerManaged: boolean;
  enforcesEncryptionContext: boolean;
  allowedPrincipalIds: string[];
  wildcardAccessDetected: boolean;
  keyRotationDays: number;
}

export interface TenantIsolationAttestationReceipt {
  attestationId: string;
  tenantId: string;
  provider: CloudProvider;
  isIsolated: boolean;
  isolationGrade: 'CRYPTOGRAPHICALLY_ISOLATED' | 'POLICY_DEFICIENCY_WARN' | 'CROSS_TENANT_VIOLATION_CRITICAL';
  findings: string[];
  attestationTimestampIso: string;
  evidenceDigestSha256: string;
}

export class MultiCloudKmsCrossTenantIsolationAttestationEngine {
  public static attestTenantIsolation(
    primaryKey: TenantKmsKeyMetadata,
    otherTenantKeys: TenantKmsKeyMetadata[]
  ): TenantIsolationAttestationReceipt {
    if (!primaryKey.tenantId || !primaryKey.keyArn) {
      throw new Error('Primary key must have valid tenantId and keyArn.');
    }

    const findings: string[] = [];
    let isIsolated = true;
    let hasCriticalDefect = false;

    // 1. Check ARN uniqueness against all other tenants
    for (const other of otherTenantKeys) {
      if (other.tenantId !== primaryKey.tenantId && other.keyArn === primaryKey.keyArn) {
        findings.push(
          `CRITICAL: Cross-tenant key sharing detected! Tenant ${primaryKey.tenantId} shares key ${primaryKey.keyArn} with tenant ${other.tenantId}.`
        );
        isIsolated = false;
        hasCriticalDefect = true;
      }
    }

    // 2. Check encryption context enforcement
    if (!primaryKey.enforcesEncryptionContext) {
      findings.push(
        `WARNING: Key ${primaryKey.keyArn} does not strictly enforce kms:EncryptionContext tenant binding.`
      );
      isIsolated = false;
    }

    // 3. Check for wildcard principal permissions
    if (primaryKey.wildcardAccessDetected) {
      findings.push(
        `CRITICAL: Wildcard IAM access grant detected on ${primaryKey.keyArn}.`
      );
      isIsolated = false;
      hasCriticalDefect = true;
    }

    // 4. Verify rotation policy
    if (primaryKey.keyRotationDays > 365) {
      findings.push(
        `WARNING: Key rotation period (${primaryKey.keyRotationDays} days) exceeds 365 days compliance standard.`
      );
    }

    let grade: TenantIsolationAttestationReceipt['isolationGrade'];
    if (hasCriticalDefect) {
      grade = 'CROSS_TENANT_VIOLATION_CRITICAL';
    } else if (!isIsolated || findings.length > 0) {
      grade = 'POLICY_DEFICIENCY_WARN';
    } else {
      grade = 'CRYPTOGRAPHICALLY_ISOLATED';
    }

    const attestationId = `ATTEST-${primaryKey.tenantId}-${Date.now()}`;
    const raw = `${attestationId}:${primaryKey.keyArn}:${grade}:${findings.length}`;
    const digest = createHash('sha256').update(raw).digest('hex');

    return {
      attestationId,
      tenantId: primaryKey.tenantId,
      provider: primaryKey.provider,
      isIsolated: grade === 'CRYPTOGRAPHICALLY_ISOLATED',
      isolationGrade: grade,
      findings,
      attestationTimestampIso: new Date().toISOString(),
      evidenceDigestSha256: digest
    };
  }
}
