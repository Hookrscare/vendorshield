import { describe, it, expect } from 'vitest';
import {
  HsmKeyQuorumAttestationVerifier,
  HsmHardwareState,
  HsmCustodianSession
} from './hsm-key-quorum-attestation-verifier';

describe('QA-193: HSM PKCS#11 Key Quorum & M-of-N Attestation Verifier', () => {
  const healthyHsm: HsmHardwareState = {
    hsmSerial: 'LUNA-PCIe-78820',
    firmwareVersion: '7.8.2-FIPS',
    pkcs11SlotId: 1,
    isTamperSealIntact: true,
    requiredQuorumThreshold: 3
  };

  it('validates quorum when 3 of 5 custodians authenticate successfully', () => {
    const custodians: HsmCustodianSession[] = [
      {
        custodianId: 'sec_officer_1',
        role: 'SECURITY_OFFICER',
        smartcardSerial: 'SC-88910',
        certDaysRemaining: 180,
        biometricVerificationConfirmed: true
      },
      {
        custodianId: 'crypto_admin_2',
        role: 'CRYPTO_ADMIN',
        smartcardSerial: 'SC-88911',
        certDaysRemaining: 95,
        biometricVerificationConfirmed: true
      },
      {
        custodianId: 'auditor_3',
        role: 'COMPLIANCE_AUDITOR',
        smartcardSerial: 'SC-88912',
        certDaysRemaining: 210,
        biometricVerificationConfirmed: true
      }
    ];

    const res = HsmKeyQuorumAttestationVerifier.verifyQuorum(healthyHsm, custodians);

    expect(res.isQuorumValid).toBe(true);
    expect(res.status).toBe('HSM_KEY_QUORUM_ATTESTED_VALID');
    expect(res.activeCustodianCount).toBe(3);
    expect(res.auditMessage).toContain('FIPS 140-3 Level 3 quorum satisfied');
  });

  it('blocks unwrap when custodian quorum threshold is deficit', () => {
    const custodians: HsmCustodianSession[] = [
      {
        custodianId: 'sec_officer_1',
        role: 'SECURITY_OFFICER',
        smartcardSerial: 'SC-88910',
        certDaysRemaining: 180,
        biometricVerificationConfirmed: true
      },
      {
        custodianId: 'crypto_admin_2',
        role: 'CRYPTO_ADMIN',
        smartcardSerial: 'SC-88911',
        certDaysRemaining: 95,
        biometricVerificationConfirmed: false // Failed biometric!
      }
    ];

    const res = HsmKeyQuorumAttestationVerifier.verifyQuorum(healthyHsm, custodians);

    expect(res.isQuorumValid).toBe(false);
    expect(res.status).toBe('INSUFFICIENT_QUORUM_THRESHOLD_BLOCKED');
    expect(res.activeCustodianCount).toBe(1);
  });

  it('detects tripped tamper circuit and activates zeroization block', () => {
    const tamperedHsm: HsmHardwareState = {
      ...healthyHsm,
      isTamperSealIntact: false
    };

    const custodians: HsmCustodianSession[] = [
      {
        custodianId: 'sec_officer_1',
        role: 'SECURITY_OFFICER',
        smartcardSerial: 'SC-88910',
        certDaysRemaining: 180,
        biometricVerificationConfirmed: true
      }
    ];

    const res = HsmKeyQuorumAttestationVerifier.verifyQuorum(tamperedHsm, custodians);

    expect(res.isQuorumValid).toBe(false);
    expect(res.status).toBe('CRITICAL_HSM_TAMPER_ZEROIZATION_TRIGGERED');
    expect(res.auditMessage).toContain('zeroization activated');
  });
});
