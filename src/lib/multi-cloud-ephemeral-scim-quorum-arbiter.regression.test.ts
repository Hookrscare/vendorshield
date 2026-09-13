/**
 * src/lib/multi-cloud-ephemeral-scim-quorum-arbiter.regression.test.ts
 * Regression tests for QA-185 Multi-Cloud Ephemeral SCIM Directory Quorum Arbiter.
 */

import { describe, it, expect } from 'vitest';
import {
  MultiCloudEphemeralScimQuorumArbiter,
  type ScimDirectoryEvent
} from './multi-cloud-ephemeral-scim-quorum-arbiter';

describe('MultiCloudEphemeralScimQuorumArbiter (QA-185)', () => {
  const baseEvent: ScimDirectoryEvent = {
    eventId: 'EVT-SCIM-2026-991',
    timestamp: Date.now() - 5000, // 5 seconds ago
    userId: 'usr_882910',
    email: 'secops@enterprise.internal',
    action: 'UPDATE_ROLE',
    targetRole: 'ADMIN',
    targetClouds: ['AWS_IAM_IDENTITY_CENTER', 'AZURE_ENTRA_ID'],
    idpSignatures: [
      { idpName: 'Okta-Production', signatureHex: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' },
      { idpName: 'AzureAD-ConditionalAccess', signatureHex: 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3' }
    ]
  };

  it('approves high-privilege directory changes when quorum is achieved', () => {
    const result = MultiCloudEphemeralScimQuorumArbiter.arbitrateProvisioningEvent(baseEvent, 2);
    expect(result.approved).toBe(true);
    expect(result.quorumAchieved).toBe(true);
    expect(result.validSignaturesCount).toBe(2);
    expect(result.replicatedClouds).toContain('AWS_IAM_IDENTITY_CENTER');
    expect(result.complianceReceiptSha256.length).toBe(64);
  });

  it('rejects high-privilege escalation when only 1 signature is provided', () => {
    const singleSigEvent: ScimDirectoryEvent = {
      ...baseEvent,
      idpSignatures: [baseEvent.idpSignatures[0]]
    };

    const result = MultiCloudEphemeralScimQuorumArbiter.arbitrateProvisioningEvent(singleSigEvent, 2);
    expect(result.approved).toBe(false);
    expect(result.reason).toBe('INSUFFICIENT_IDP_QUORUM_APPROVALS');
    expect(result.complianceReceiptSha256).toBe('');
  });

  it('rejects stale replay events older than 5 minutes', () => {
    const staleEvent: ScimDirectoryEvent = {
      ...baseEvent,
      timestamp: Date.now() - 400000 // 400 seconds ago (> 300s limit)
    };

    const result = MultiCloudEphemeralScimQuorumArbiter.arbitrateProvisioningEvent(staleEvent, 2);
    expect(result.approved).toBe(false);
    expect(result.reason).toBe('EVENT_TIMESTAMP_EXPIRED_OR_CLOCK_DRIFT');
  });
});
