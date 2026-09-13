import { describe, it, expect } from 'vitest';
import {
  ZeroTrustSessionPostureReAttestationEngine,
  SessionContext,
  PreviousSessionSnapshot,
} from './zero-trust-session-posture-re-attestation';

describe('QA-198: ZeroTrustSessionPostureReAttestationEngine Tests', () => {
  it('validates a compliant session with healthy device posture', () => {
    const current: SessionContext = {
      sessionId: 'sess_clean_123',
      userId: 'usr_corp_alice',
      ipAddress: '198.51.100.42',
      isKnownProxyOrTor: false,
      latitude: 37.7749,
      longitude: -122.4194, // San Francisco
      timestampEpochMs: 1789400000000,
      devicePosture: {
        isDiskEncrypted: true,
        isEdrAgentHealthy: true,
        isOsPatched: true,
        isSecureBootEnabled: true,
      },
    };

    const previous: PreviousSessionSnapshot = {
      ipAddress: '198.51.100.40',
      latitude: 37.7750,
      longitude: -122.4190,
      timestampEpochMs: 1789396400000, // 1 hr earlier
    };

    const result = ZeroTrustSessionPostureReAttestationEngine.evaluateSessionPosture(current, previous);

    expect(result.compositeRiskScore).toBe(0);
    expect(result.postureStatus).toBe('SESSION_POSTURE_VALID_CONTINUE');
    expect(result.reasons).toHaveLength(0);
    expect(result.attestationSignature).toBeDefined();
  });

  it('triggers stepped-up auth when device posture degrades (e.g. disabled secure boot & unencrypted disk)', () => {
    const current: SessionContext = {
      sessionId: 'sess_degraded_456',
      userId: 'usr_corp_bob',
      ipAddress: '198.51.100.55',
      isKnownProxyOrTor: false,
      latitude: 40.7128,
      longitude: -74.0060, // NYC
      timestampEpochMs: 1789400000000,
      devicePosture: {
        isDiskEncrypted: false, // +25
        isEdrAgentHealthy: true,
        isOsPatched: true,
        isSecureBootEnabled: false, // +20 -> Total 45
      },
    };

    const result = ZeroTrustSessionPostureReAttestationEngine.evaluateSessionPosture(current);

    expect(result.compositeRiskScore).toBe(45);
    expect(result.postureStatus).toBe('STEP_UP_AUTH_REQUIRED');
    expect(result.steppedUpAuthToken).toBeDefined();
    expect(result.reasons).toContain('DEVICE_UNENCRYPTED_STORAGE');
    expect(result.reasons).toContain('SECURE_BOOT_DISABLED');
  });

  it('terminates and quarantines session immediately upon impossible travel from Tor exit node', () => {
    const current: SessionContext = {
      sessionId: 'sess_breach_789',
      userId: 'usr_corp_carol',
      ipAddress: '185.220.101.5',
      isKnownProxyOrTor: true, // +45
      latitude: 52.5200,
      longitude: 13.4050, // Berlin
      timestampEpochMs: 1789400000000,
      devicePosture: {
        isDiskEncrypted: true,
        isEdrAgentHealthy: false, // +35 -> Total 80
        isOsPatched: true,
        isSecureBootEnabled: true,
      },
    };

    const previous: PreviousSessionSnapshot = {
      ipAddress: '198.51.100.10',
      latitude: 37.7749,
      longitude: -122.4194, // SF
      timestampEpochMs: 1789398200000, // 30 mins earlier (SF -> Berlin in 30 mins!)
    };

    const result = ZeroTrustSessionPostureReAttestationEngine.evaluateSessionPosture(current, previous);

    expect(result.compositeRiskScore).toBeGreaterThanOrEqual(75);
    expect(result.postureStatus).toBe('SESSION_TERMINATED_IMMEDIATE_QUARANTINE');
    expect(result.reasons.some((r) => r.startsWith('IMPOSSIBLE_TRAVEL_DETECTED'))).toBe(true);
  });
});
