import { describe, it, expect } from 'vitest';
import {
  DataSovereignEscrowGatekeeper,
  CrossBorderTransferRequest,
} from './data-sovereign-escrow-gatekeeper';

describe('DataSovereignEscrowGatekeeper (QA-153)', () => {
  const gatekeeper = new DataSovereignEscrowGatekeeper();

  it('approves transfers within the same adequacy zone immediately', () => {
    const request: CrossBorderTransferRequest = {
      transferId: 'TR-EU-01',
      tenantId: 'TENANT-BERLIN',
      sourceJurisdiction: 'EU',
      destinationJurisdiction: 'EU',
      modelIdentifier: 'mistral-large-eu-west',
      dataClassification: 'HIGHLY_SENSITIVE_PII',
      destinationDpfCertified: false,
      activeSccModule: 'NONE',
      supplementaryEncryptionEnabled: true,
      transferImpactAssessmentScore: 10,
      payloadSizeBytes: 1048576,
    };

    const result = gatekeeper.evaluateTransfer(request);
    expect(result.verdict).toBe('APPROVED');
    expect(result.isCompliant).toBe(true);
    expect(result.requiredRemediations.length).toBe(0);
  });

  it('approves EU->US transfer with valid DPF and supplementary encryption', () => {
    const request: CrossBorderTransferRequest = {
      transferId: 'TR-EU-US-01',
      tenantId: 'TENANT-DUBLIN',
      sourceJurisdiction: 'EU',
      destinationJurisdiction: 'US',
      modelIdentifier: 'claude-3-5-sonnet',
      dataClassification: 'CONFIDENTIAL',
      destinationDpfCertified: true,
      activeSccModule: 'NONE',
      supplementaryEncryptionEnabled: true,
      transferImpactAssessmentScore: 20,
      payloadSizeBytes: 524288,
    };

    const result = gatekeeper.evaluateTransfer(request);
    expect(result.verdict).toBe('APPROVED');
    expect(result.isCompliant).toBe(true);
  });

  it('quarantines EU->US transfer into escrow if supplementary encryption is missing on confidential data', () => {
    const request: CrossBorderTransferRequest = {
      transferId: 'TR-EU-US-02',
      tenantId: 'TENANT-PARIS',
      sourceJurisdiction: 'EU',
      destinationJurisdiction: 'US',
      modelIdentifier: 'gpt-4o',
      dataClassification: 'CONFIDENTIAL',
      destinationDpfCertified: true,
      activeSccModule: 'NONE',
      supplementaryEncryptionEnabled: false, // Violation!
      transferImpactAssessmentScore: 20,
      payloadSizeBytes: 262144,
    };

    const result = gatekeeper.evaluateTransfer(request);
    expect(result.verdict).toBe('QUARANTINED_IN_ESCROW');
    expect(result.isCompliant).toBe(false);
    expect(result.escrowQuarantineId).toBeDefined();
    expect(result.requiredRemediations.some(r => r.includes('KMS HSM'))).toBe(true);
  });

  it('quarantines EU->US transfer if TIA score exceeds threshold', () => {
    const request: CrossBorderTransferRequest = {
      transferId: 'TR-EU-US-03',
      tenantId: 'TENANT-MADRID',
      sourceJurisdiction: 'EU',
      destinationJurisdiction: 'US',
      modelIdentifier: 'gemini-1-5-pro',
      dataClassification: 'INTERNAL',
      destinationDpfCertified: false,
      activeSccModule: 'MODULE_2_C2P',
      supplementaryEncryptionEnabled: true,
      transferImpactAssessmentScore: 55, // Exceeds 30!
      payloadSizeBytes: 1024,
    };

    const result = gatekeeper.evaluateTransfer(request);
    expect(result.verdict).toBe('QUARANTINED_IN_ESCROW');
    expect(result.isCompliant).toBe(false);
    expect(result.requiredRemediations.some(r => r.includes('TIA residual risk'))).toBe(true);
  });
});
