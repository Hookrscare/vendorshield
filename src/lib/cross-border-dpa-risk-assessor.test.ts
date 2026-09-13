import { describe, it, expect } from 'vitest';
import {
  CrossBorderDpaRiskAssessor,
  SovereignTransferProfile
} from './cross-border-dpa-risk-assessor';

describe('QA-185: Cross-Border Data Sovereign Transfer Risk Assessor', () => {
  it('approves transfers to EU adequacy jurisdiction with low risk', () => {
    const profile: SovereignTransferProfile = {
      vendorId: 'vend_sap_de',
      vendorName: 'SAP SE',
      destinationCountryIso: 'DE',
      isDpfCertified: false,
      hasSignedSccs: false,
      customerControlsEncryptionKey: false,
      dataPseudonymizedInTransit: false,
      transfersSpecialCategoryData: false
    };

    const res = CrossBorderDpaRiskAssessor.assessTransfer(profile);

    expect(res.transferLegalityStatus).toBe('PERMITTED_ADEQUATE');
    expect(res.transferMechanism).toBe('EU_ADEQUACY_DECISION');
    expect(res.residualRiskScore).toBeLessThan(20);
    expect(res.mandatoryTiaMeasuresRequired.length).toBe(0);
  });

  it('approves US transfer under active EU-US Data Privacy Framework', () => {
    const profile: SovereignTransferProfile = {
      vendorId: 'vend_aws_us',
      vendorName: 'Amazon Web Services',
      destinationCountryIso: 'US',
      isDpfCertified: true,
      hasSignedSccs: true,
      customerControlsEncryptionKey: false,
      dataPseudonymizedInTransit: false,
      transfersSpecialCategoryData: false
    };

    const res = CrossBorderDpaRiskAssessor.assessTransfer(profile);

    expect(res.transferLegalityStatus).toBe('PERMITTED_ADEQUATE');
    expect(res.transferMechanism).toBe('DATA_PRIVACY_FRAMEWORK_DPF');
    expect(res.residualRiskScore).toBe(25);
  });

  it('suspends non-adequate transfer lacking supplementary encryption and pseudonymization', () => {
    const profile: SovereignTransferProfile = {
      vendorId: 'vend_callcenter_in',
      vendorName: 'Global Support Services',
      destinationCountryIso: 'IN',
      isDpfCertified: false,
      hasSignedSccs: true,
      customerControlsEncryptionKey: false, // Lacks CMEK
      dataPseudonymizedInTransit: false,     // Lacks pseudonymization
      transfersSpecialCategoryData: true
    };

    const res = CrossBorderDpaRiskAssessor.assessTransfer(profile);

    expect(res.transferLegalityStatus).toBe('HIGH_RISK_SUSPEND_TRANSFER');
    expect(res.residualRiskScore).toBeGreaterThan(70);
    expect(res.mandatoryTiaMeasuresRequired.length).toBe(2);
    expect(res.dpaAnnexClauseText).toContain('Transfer suspended');
  });
});
