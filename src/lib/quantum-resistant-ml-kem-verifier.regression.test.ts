/**
 * src/lib/quantum-resistant-ml-kem-verifier.regression.test.ts
 * Tests for QA-184 Quantum-Resistant ML-KEM Verifier.
 */

import { describe, it, expect } from 'vitest';
import {
  QuantumResistantMLKEMVerifier,
  ML_KEM_SPECS,
  type MLKEMExchangeInput
} from './quantum-resistant-ml-kem-verifier';

describe('QuantumResistantMLKEMVerifier (QA-184)', () => {
  it('should successfully verify valid ML-KEM-768 key encapsulation exchange', () => {
    const spec = ML_KEM_SPECS['ML-KEM-768'];
    const dummyPubKeyHex = Buffer.alloc(spec.publicKeyBytes, 0xaa).toString('hex');
    const dummyCtHex = Buffer.alloc(spec.cipherTextBytes, 0xbb).toString('hex');
    const dummySsHex = Buffer.alloc(spec.sharedSecretBytes, 0xcc).toString('hex');

    const input: MLKEMExchangeInput = {
      parameterSet: 'ML-KEM-768',
      publicKeyHex: dummyPubKeyHex,
      cipherTextHex: dummyCtHex,
      sharedSecretHex: dummySsHex,
      clientIdentity: 'sp-acme-corp',
      serverIdentity: 'vendorshield-gateway',
      sessionNonceHex: '0123456789abcdef0123456789abcdef',
      timestamp: new Date().toISOString()
    };

    const result = QuantumResistantMLKEMVerifier.verifyExchange(input);
    expect(result.isValid).toBe(true);
    expect(result.nistSecurityCategory).toBe(3);
    expect(result.auditReceipt.receiptId).toMatch(/^PQC-RCPT-[0-9A-F]{16}$/);
    expect(result.auditReceipt.complianceStandard).toContain('NIST FIPS 203');
  });

  it('should reject exchange with truncated ciphertext', () => {
    const spec = ML_KEM_SPECS['ML-KEM-1024'];
    const dummyPubKeyHex = Buffer.alloc(spec.publicKeyBytes, 0x11).toString('hex');
    const truncatedCtHex = Buffer.alloc(spec.cipherTextBytes - 10, 0x22).toString('hex');
    const dummySsHex = Buffer.alloc(spec.sharedSecretBytes, 0x33).toString('hex');

    const input: MLKEMExchangeInput = {
      parameterSet: 'ML-KEM-1024',
      publicKeyHex: dummyPubKeyHex,
      cipherTextHex: truncatedCtHex,
      sharedSecretHex: dummySsHex,
      clientIdentity: 'sp-tenant-x',
      serverIdentity: 'vendorshield-auth',
      sessionNonceHex: 'fedcba9876543210fedcba9876543210',
      timestamp: new Date().toISOString()
    };

    const result = QuantumResistantMLKEMVerifier.verifyExchange(input);
    expect(result.isValid).toBe(false);
    expect(result.cipherTextValid).toBe(false);
    expect(result.failureReason).toContain('Buffer size mismatch');
  });
});
