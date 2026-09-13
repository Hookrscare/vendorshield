/**
 * src/lib/vendor-cuec-subservice-arbiter.ts
 * QA-174: Enterprise Vendor Fourth-Party Sub-Service Organization SOC 2
 * Complementary User Entity Controls (CUEC) Arbiter & Risk Propagation Engine.
 * Part of VendorShield Third-Party Risk Management (TPRM).
 */

import { createHash } from 'node:crypto';

export type SubserviceCategory =
  | 'CLOUD_IAAS'
  | 'IDENTITY_PROVIDER'
  | 'PAYMENT_GATEWAY'
  | 'DATABASE_PAAS'
  | 'LOGGING_SIEM'
  | 'COMMUNICATION_API';

export type CuecControlDomain =
  | 'ACCESS_CONTROL'
  | 'ENCRYPTION_KEY_MANAGEMENT'
  | 'NETWORK_FIREWALL'
  | 'DATA_RETENTION_BACKUP'
  | 'INCIDENT_RESPONSE'
  | 'TENANT_ISOLATION';

export interface SubserviceOrganization {
  name: string;
  category: SubserviceCategory;
  soc2ReportPeriod: string;
  soc2Auditor: string;
  isMissionCritical: boolean;
}

export interface ComplementaryUserEntityControl {
  cuecId: string;
  subserviceName: string;
  domain: CuecControlDomain;
  description: string;
  isImplementedByVendor: boolean;
  implementationEvidenceRef?: string;
  isMandatoryForIntegrity: boolean;
}

export interface VendorSubserviceEvaluationRequest {
  vendorId: string;
  vendorName: string;
  methodology: 'CARVE_OUT' | 'INCLUSIVE';
  subserviceOrgs: SubserviceOrganization[];
  cuecList: ComplementaryUserEntityControl[];
}

export interface VendorSubserviceEvaluationResult {
  vendorId: string;
  methodology: 'CARVE_OUT' | 'INCLUSIVE';
  totalCuecsAssessed: number;
  implementedCuecsCount: number;
  unimplementedCriticalCuecs: ComplementaryUserEntityControl[];
  supplyChainRiskScore: number; // 0 (pristine) to 100 (critical risk)
  complianceStatus: 'COMPLIANT' | 'NEEDS_REMEDIATION' | 'NON_COMPLIANT_HIGH_RISK';
  auditAttestationHashSha256: string;
  recommendedRemediations: string[];
}

export class VendorCuecSubserviceArbiter {
  /**
   * Evaluates vendor reliance on fourth-party subservice organizations and verifies
   * whether the vendor has fulfilled all mandatory CUEC obligations.
   */
  public evaluateVendorSubservices(
    request: VendorSubserviceEvaluationRequest
  ): VendorSubserviceEvaluationResult {
    const totalCuecs = request.cuecList.length;
    const implementedCuecs = request.cuecList.filter((c) => c.isImplementedByVendor);
    const unimplemented = request.cuecList.filter((c) => !c.isImplementedByVendor);
    const unimplementedCritical = unimplemented.filter((c) => c.isMandatoryForIntegrity);

    // Compute supply chain risk score (0-100)
    let riskScore = 0;

    // Penalty for missing CUECs
    if (totalCuecs > 0) {
      const missingRatio = unimplemented.length / totalCuecs;
      riskScore += missingRatio * 50;
    }

    // Critical penalty for mandatory missing CUECs
    riskScore += unimplementedCritical.length * 15;

    // Check mission-critical subservices without CUEC coverage
    for (const sub of request.subserviceOrgs) {
      if (sub.isMissionCritical) {
        const subCuecs = request.cuecList.filter((c) => c.subserviceName === sub.name);
        if (subCuecs.length === 0) {
          riskScore += 20; // Critical subservice has zero evaluated CUECs
        }
      }
    }

    // Carve-out method requires user entity controls at the customer level too
    if (request.methodology === 'CARVE_OUT' && unimplemented.length > 0) {
      riskScore += 10;
    }

    // Bound risk score between 0 and 100
    riskScore = Math.min(100, Math.max(0, Math.round(riskScore)));

    let complianceStatus: 'COMPLIANT' | 'NEEDS_REMEDIATION' | 'NON_COMPLIANT_HIGH_RISK';
    if (riskScore <= 20 && unimplementedCritical.length === 0) {
      complianceStatus = 'COMPLIANT';
    } else if (riskScore <= 50) {
      complianceStatus = 'NEEDS_REMEDIATION';
    } else {
      complianceStatus = 'NON_COMPLIANT_HIGH_RISK';
    }

    const recommendedRemediations: string[] = [];
    for (const unimp of unimplementedCritical) {
      recommendedRemediations.push(
        `Require vendor ${request.vendorName} to implement mandatory CUEC ${unimp.cuecId} for ${unimp.subserviceName}: ${unimp.description}`
      );
    }

    // Cryptographic audit attestation hash
    const canonicalPayload = JSON.stringify({
      vendorId: request.vendorId,
      methodology: request.methodology,
      subservices: request.subserviceOrgs.map((s) => s.name).sort(),
      unimplementedCritical: unimplementedCritical.map((c) => c.cuecId).sort(),
      riskScore,
    });
    const auditHash = createHash('sha256').update(canonicalPayload).digest('hex');

    return {
      vendorId: request.vendorId,
      methodology: request.methodology,
      totalCuecsAssessed: totalCuecs,
      implementedCuecsCount: implementedCuecs.length,
      unimplementedCriticalCuecs: unimplementedCritical,
      supplyChainRiskScore: riskScore,
      complianceStatus,
      auditAttestationHashSha256: auditHash,
      recommendedRemediations,
    };
  }
}
