/**
 * src/lib/vendor-cuec-subservice-arbiter.regression.test.ts
 * Vitest regression tests for QA-174: VendorCuecSubserviceArbiter.
 */

import { describe, it, expect } from 'vitest';
import {
  VendorCuecSubserviceArbiter,
  VendorSubserviceEvaluationRequest,
} from './vendor-cuec-subservice-arbiter';

describe('QA-174: VendorCuecSubserviceArbiter', () => {
  const arbiter = new VendorCuecSubserviceArbiter();

  it('evaluates a pristine vendor with all critical CUECs implemented as COMPLIANT', () => {
    const request: VendorSubserviceEvaluationRequest = {
      vendorId: 'vend-supabase-ent',
      vendorName: 'Supabase Enterprise',
      methodology: 'CARVE_OUT',
      subserviceOrgs: [
        {
          name: 'Amazon Web Services (AWS)',
          category: 'CLOUD_IAAS',
          soc2ReportPeriod: '2025-10-01 to 2026-09-30',
          soc2Auditor: 'Ernst & Young LLP',
          isMissionCritical: true,
        },
      ],
      cuecList: [
        {
          cuecId: 'AWS-CUEC-01',
          subserviceName: 'Amazon Web Services (AWS)',
          domain: 'ENCRYPTION_KEY_MANAGEMENT',
          description: 'Customer must configure KMS customer-managed key rotation annually.',
          isImplementedByVendor: true,
          implementationEvidenceRef: 'EVID-KMS-ROTATION-2026',
          isMandatoryForIntegrity: true,
        },
        {
          cuecId: 'AWS-CUEC-02',
          subserviceName: 'Amazon Web Services (AWS)',
          domain: 'ACCESS_CONTROL',
          description: 'Customer must enforce MFA on root and IAM administrative accounts.',
          isImplementedByVendor: true,
          implementationEvidenceRef: 'EVID-IAM-MFA-ENFORCED',
          isMandatoryForIntegrity: true,
        },
      ],
    };

    const result = arbiter.evaluateVendorSubservices(request);

    expect(result.complianceStatus).toBe('COMPLIANT');
    expect(result.supplyChainRiskScore).toBeLessThanOrEqual(20);
    expect(result.unimplementedCriticalCuecs).toHaveLength(0);
    expect(result.auditAttestationHashSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('flags NON_COMPLIANT_HIGH_RISK when mandatory subservice CUECs are neglected', () => {
    const request: VendorSubserviceEvaluationRequest = {
      vendorId: 'vend-sloppy-analytics',
      vendorName: 'Sloppy Analytics Co',
      methodology: 'CARVE_OUT',
      subserviceOrgs: [
        {
          name: 'Google Cloud Platform (GCP)',
          category: 'CLOUD_IAAS',
          soc2ReportPeriod: '2025-05-01 to 2026-04-30',
          soc2Auditor: 'PwC LLP',
          isMissionCritical: true,
        },
      ],
      cuecList: [
        {
          cuecId: 'GCP-CUEC-01',
          subserviceName: 'Google Cloud Platform (GCP)',
          domain: 'NETWORK_FIREWALL',
          description: 'Customer must configure VPC Service Controls to prevent exfiltration.',
          isImplementedByVendor: false,
          isMandatoryForIntegrity: true,
        },
        {
          cuecId: 'GCP-CUEC-02',
          subserviceName: 'Google Cloud Platform (GCP)',
          domain: 'ACCESS_CONTROL',
          description: 'Customer must revoke terminated employee IAM permissions within 24h.',
          isImplementedByVendor: false,
          isMandatoryForIntegrity: true,
        },
      ],
    };

    const result = arbiter.evaluateVendorSubservices(request);

    expect(result.complianceStatus).toBe('NON_COMPLIANT_HIGH_RISK');
    expect(result.supplyChainRiskScore).toBeGreaterThan(60);
    expect(result.unimplementedCriticalCuecs).toHaveLength(2);
    expect(result.recommendedRemediations.length).toBeGreaterThan(0);
  });
});
