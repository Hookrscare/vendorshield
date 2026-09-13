/**
 * QA-159: Automated Multi-Cloud Tenant Isolation & IAM Boundary Verification Engine.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Verifies cross-tenant data boundary fences across AWS, GCP, and Azure. Evaluates
 * ABAC attribute conditions, detects cross-tenant data access attempts, and issues
 * cryptographic SOC 2 CC6.1 / CC6.3 boundary verification attestations.
 */

import { createHash } from 'crypto';

export type CloudProvider = 'AWS' | 'GCP' | 'AZURE' | 'CLOUDFLARE';

export interface TenantContext {
  tenantId: string;
  organizationName: string;
  allowedCloudAccounts: Record<CloudProvider, string[]>;
  kmsKeyArns: string[];
  storagePrefixes: string[];
}

export interface ResourceAccessProbe {
  requestingTenantId: string;
  targetCloud: CloudProvider;
  targetResourceId: string;
  targetResourceTenantId: string;
  attemptedAction: 'READ' | 'WRITE' | 'DELETE' | 'ENUMERATE';
  iamConditions?: Record<string, string>;
}

export interface TenantIsolationViolation {
  code: 'CROSS_TENANT_LEAK' | 'MISSING_BOUNDARY_CONDITION' | 'UNAUTHORIZED_CLOUD_ACCOUNT' | 'WILDCARD_ENUMERATION';
  severity: 'CRITICAL' | 'HIGH';
  details: string;
  probe: ResourceAccessProbe;
}

export interface TenantIsolationVerificationReport {
  timestamp: string;
  tenantId: string;
  isIsolated: boolean;
  isolationScore: number; // 0 - 100
  totalProbesEvaluated: number;
  breachBlastRadius: 'ZERO' | 'LOW' | 'CRITICAL';
  violations: TenantIsolationViolation[];
  auditAttestationHashSha256: string;
}

export class MultiCloudTenantIsolationVerifier {
  public verifyTenantIsolation(
    tenant: TenantContext,
    probes: ResourceAccessProbe[]
  ): TenantIsolationVerificationReport {
    const violations: TenantIsolationViolation[] = [];

    for (const probe of probes) {
      // 1. Cross-Tenant Direct Access Check
      if (probe.targetResourceTenantId !== tenant.tenantId) {
        violations.push({
          code: 'CROSS_TENANT_LEAK',
          severity: 'CRITICAL',
          details: `Tenant '${tenant.tenantId}' attempted to perform ${probe.attemptedAction} on resource '${probe.targetResourceId}' belonging to external tenant '${probe.targetResourceTenantId}'.`,
          probe,
        });
        continue;
      }

      // 2. Cloud Account Boundary Validation
      const allowedAccounts = tenant.allowedCloudAccounts[probe.targetCloud] || [];
      const resourceAccountMatch = allowedAccounts.some(acc => probe.targetResourceId.includes(acc));
      if (!resourceAccountMatch && allowedAccounts.length > 0) {
        violations.push({
          code: 'UNAUTHORIZED_CLOUD_ACCOUNT',
          severity: 'HIGH',
          details: `Resource '${probe.targetResourceId}' resides in a cloud account not registered for tenant '${tenant.tenantId}'.`,
          probe,
        });
      }

      // 3. ABAC / IAM Boundary Condition Check
      if (!probe.iamConditions || Object.keys(probe.iamConditions).length === 0) {
        violations.push({
          code: 'MISSING_BOUNDARY_CONDITION',
          severity: 'HIGH',
          details: `Resource access attempt on '${probe.targetResourceId}' lacks multi-tenant ABAC / Tag scoping conditions.`,
          probe,
        });
      } else {
        // Verify tenant tag condition enforcement
        const tenantConditionVal =
          probe.iamConditions['aws:PrincipalTag/TenantId'] ||
          probe.iamConditions['resource.labels.tenant_id'] ||
          probe.iamConditions['azure:attributes/TenantId'];

        if (!tenantConditionVal || tenantConditionVal !== tenant.tenantId) {
          violations.push({
            code: 'MISSING_BOUNDARY_CONDITION',
            severity: 'CRITICAL',
            details: `IAM boundary condition tag mismatch: expected '${tenant.tenantId}', got '${tenantConditionVal}'.`,
            probe,
          });
        }
      }

      // 4. Wildcard Enumeration Prevention
      if (probe.attemptedAction === 'ENUMERATE' && (probe.targetResourceId.endsWith('/*') || probe.targetResourceId === '*')) {
        violations.push({
          code: 'WILDCARD_ENUMERATION',
          severity: 'CRITICAL',
          details: `Wildcard enumeration on '${probe.targetResourceId}' violates zero-trust tenant microsegmentation.`,
          probe,
        });
      }
    }

    const totalProbes = probes.length;
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL').length;
    const highViolations = violations.filter(v => v.severity === 'HIGH').length;

    const rawScore = 100 - (criticalViolations * 35) - (highViolations * 15);
    const isolationScore = Math.max(0, Math.min(100, rawScore));
    const isIsolated = violations.length === 0;

    let breachBlastRadius: 'ZERO' | 'LOW' | 'CRITICAL' = 'ZERO';
    if (criticalViolations > 0) {
      breachBlastRadius = 'CRITICAL';
    } else if (highViolations > 0) {
      breachBlastRadius = 'LOW';
    }

    const timestamp = new Date().toISOString();
    const attestationPayload = JSON.stringify({
      timestamp,
      tenantId: tenant.tenantId,
      isIsolated,
      isolationScore,
      violationsCount: violations.length,
    });
    const auditAttestationHashSha256 = createHash('sha256').update(attestationPayload).digest('hex');

    return {
      timestamp,
      tenantId: tenant.tenantId,
      isIsolated,
      isolationScore,
      totalProbesEvaluated: totalProbes,
      breachBlastRadius,
      violations,
      auditAttestationHashSha256,
    };
  }
}
