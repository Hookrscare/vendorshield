import { describe, it, expect } from 'vitest';
import {
  SubprocessorDataSovereigntyBorderTransitGatekeeper,
  OutboundTransitRequest,
} from './subprocessor-data-sovereignty-border-transit-gatekeeper';

describe('QA-184: SubprocessorDataSovereigntyBorderTransitGatekeeper Tests', () => {
  const gatekeeper = new SubprocessorDataSovereigntyBorderTransitGatekeeper();

  it('permits transit for EU tenant sending to DPF-certified US subprocessor', () => {
    const req: OutboundTransitRequest = {
      requestId: 'req_dpf_001',
      customerTenantId: 'tenant_berlin_fintech',
      customerMandatedJurisdiction: 'EU',
      targetSubprocessorId: 'subproc_aws_bedrock',
      subprocessorHostRegion: 'us-east-1',
      subprocessorCountry: 'UNITED_STATES',
      isDpfCertified: true,
      hasStandardContractualClauses: true,
      isClientSideFieldEncrypted: false,
    };

    const decision = gatekeeper.evaluateTransit(req);

    expect(decision.isTransitPermitted).toBe(true);
    expect(decision.transitAction).toBe('PERMIT_TRANSIT');
    expect(decision.legalTransferBasis).toBe('EU_US_DPF_CERTIFIED');
  });

  it('blocks unencrypted egress to non-DPF US vendor under EU mandate', () => {
    const req: OutboundTransitRequest = {
      requestId: 'req_blocked_002',
      customerTenantId: 'tenant_paris_health',
      customerMandatedJurisdiction: 'EU',
      targetSubprocessorId: 'subproc_unaccredited_analytics',
      subprocessorHostRegion: 'us-west-2',
      subprocessorCountry: 'UNITED_STATES',
      isDpfCertified: false,
      hasStandardContractualClauses: true,
      isClientSideFieldEncrypted: false, // Missing required supplementary encryption
    };

    const decision = gatekeeper.evaluateTransit(req);

    expect(decision.isTransitPermitted).toBe(false);
    expect(decision.transitAction).toBe('BLOCKED_SOVEREIGNTY_VIOLATION');
    expect(decision.legalTransferBasis).toBe('UNLAWFUL_TRANSFER');
  });

  it('permits transit under SCCs when customer-held client-side encryption is active', () => {
    const req: OutboundTransitRequest = {
      requestId: 'req_scc_encrypted_003',
      customerTenantId: 'tenant_paris_health',
      customerMandatedJurisdiction: 'EU',
      targetSubprocessorId: 'subproc_unaccredited_analytics',
      subprocessorHostRegion: 'us-west-2',
      subprocessorCountry: 'UNITED_STATES',
      isDpfCertified: false,
      hasStandardContractualClauses: true,
      isClientSideFieldEncrypted: true,
    };

    const decision = gatekeeper.evaluateTransit(req);

    expect(decision.isTransitPermitted).toBe(true);
    expect(decision.transitAction).toBe('SUPPLEMENTARY_ENCRYPTION_ENFORCED');
    expect(decision.legalTransferBasis).toBe('SCC_WITH_SUPPLEMENTARY_ENCRYPTION');
  });
});
