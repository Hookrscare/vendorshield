/**
 * src/lib/dora-ict-risk-assessor.regression.test.ts
 * Regression tests for QA-151: Automated DORA Financial ICT Third-Party Risk Assessor.
 */

import { describe, it, expect } from 'vitest';
import { DORAICTRiskAssessor, DORAAssessmentInput } from './dora-ict-risk-assessor';

describe('DORAICTRiskAssessor', () => {
  it('certifies a fully compliant critical ICT cloud hosting provider', () => {
    const input: DORAAssessmentInput = {
      vendor_id: 'cloud_eu_001',
      vendor_name: 'Sovereign Cloud Europe',
      service_category: 'cloud_hosting',
      supports_critical_economic_function: true,
      substitutability: 'difficult',
      annual_contract_spend_eur: 2_500_000,
      contract_terms: {
        unrestricted_audit_rights: true,
        incident_reporting_sla_hours: 2,
        data_location_disclosed: true,
        data_residency_in_eea: true,
        mandatory_exit_strategy_clause: true,
        sub_contracting_prior_approval: true,
        continuity_disaster_recovery_testing: true,
      },
    };

    const result = DORAICTRiskAssessor.evaluateVendor(input);

    expect(result.is_critical_ict_provider).toBe(true);
    expect(result.overall_compliance_score).toBe(100);
    expect(result.article_30_contract_compliant).toBe(true);
    expect(result.deficiencies.length).toBe(0);
    expect(result.dora_certification_token).toMatch(/^DORA-ICT-[A-F0-9]{16}$/);
  });

  it('detects critical compliance gaps for non-compliant vendor contracts', () => {
    const input: DORAAssessmentInput = {
      vendor_id: 'legacy_saas_002',
      vendor_name: 'Legacy Analytics Corp',
      service_category: 'analytics',
      supports_critical_economic_function: false,
      substitutability: 'easy',
      annual_contract_spend_eur: 50_000,
      contract_terms: {
        unrestricted_audit_rights: false, // -25
        incident_reporting_sla_hours: 24, // -20
        data_location_disclosed: false, // -10
        data_residency_in_eea: false,
        mandatory_exit_strategy_clause: false, // -20
        sub_contracting_prior_approval: false, // -15
        continuity_disaster_recovery_testing: false, // -10
      },
    };

    const result = DORAICTRiskAssessor.evaluateVendor(input);

    expect(result.is_critical_ict_provider).toBe(false);
    expect(result.overall_compliance_score).toBe(0);
    expect(result.article_30_contract_compliant).toBe(false);
    expect(result.deficiencies.length).toBe(6);
    expect(result.recommended_actions.length).toBe(6);
  });
});
