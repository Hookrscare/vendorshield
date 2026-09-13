import { describe, it, expect } from 'vitest';
import {
  PqcMigrationReadinessEvaluator,
  CryptographicAssetInventory,
} from './pqc-migration-readiness-evaluator';

describe('QA-168: PqcMigrationReadinessEvaluator Regression Tests', () => {
  const evaluator = new PqcMigrationReadinessEvaluator();

  it('correctly classifies quantum vulnerability tiers', () => {
    expect(evaluator.classifyAlgorithm('RSA-4096', 4096)).toBe('QUANTUM_VULNERABLE');
    expect(evaluator.classifyAlgorithm('ECDSA-P256', 256)).toBe('QUANTUM_VULNERABLE');
    expect(evaluator.classifyAlgorithm('AES-256-GCM', 256)).toBe('QUANTUM_RESISTANT_SYMMETRIC');
    expect(evaluator.classifyAlgorithm('X25519Kyber768', 768)).toBe('HYBRID_TRANSITIONAL');
    expect(evaluator.classifyAlgorithm('ML-KEM-768', 768)).toBe('POST_QUANTUM_STANDARDIZED');
    expect(evaluator.classifyAlgorithm('ML-DSA-65', 65)).toBe('POST_QUANTUM_STANDARDIZED');
  });

  it('identifies critical Store-Now-Decrypt-Later (SNDL) exposure for sensitive data on legacy RSA TLS', () => {
    const assets: CryptographicAssetInventory[] = [
      {
        assetId: 'CRYPTO-1',
        subprocessorId: 'VENDOR-ALPHA',
        algorithmName: 'RSA-2048',
        keyLengthBits: 2048,
        purpose: 'DATA_IN_TRANSIT_KEY_EXCHANGE',
        dataClassification: 'HIGHLY_SENSITIVE_PII',
      },
      {
        assetId: 'CRYPTO-2',
        subprocessorId: 'VENDOR-ALPHA',
        algorithmName: 'AES-256-GCM',
        keyLengthBits: 256,
        purpose: 'DATA_AT_REST_ENCRYPTION',
        dataClassification: 'HIGHLY_SENSITIVE_PII',
      },
    ];

    const result = evaluator.evaluateSubprocessor('VENDOR-ALPHA', assets);
    expect(result.sndlExposureRisk).toBe('CRITICAL_HIGH');
    expect(result.cnsa2ComplianceEligible).toBe(false);
    expect(result.requiredRemediations[0]).toContain('URGENT: Deploy X25519Kyber768 or ML-KEM-768');
  });

  it('verifies high PQC readiness score and CNSA 2.0 compliance for modern sub-processor', () => {
    const assets: CryptographicAssetInventory[] = [
      {
        assetId: 'CRYPTO-01',
        subprocessorId: 'VENDOR-QUANTUM-SAFE',
        algorithmName: 'ML-KEM-768',
        keyLengthBits: 768,
        purpose: 'DATA_IN_TRANSIT_KEY_EXCHANGE',
        dataClassification: 'REGULATORY_RESTRICTED',
      },
      {
        assetId: 'CRYPTO-02',
        subprocessorId: 'VENDOR-QUANTUM-SAFE',
        algorithmName: 'ML-DSA-87',
        keyLengthBits: 87,
        purpose: 'DIGITAL_SIGNATURE_AUTH',
        dataClassification: 'REGULATORY_RESTRICTED',
      },
      {
        assetId: 'CRYPTO-03',
        subprocessorId: 'VENDOR-QUANTUM-SAFE',
        algorithmName: 'AES-256-GCM',
        keyLengthBits: 256,
        purpose: 'DATA_AT_REST_ENCRYPTION',
        dataClassification: 'REGULATORY_RESTRICTED',
      },
    ];

    const result = evaluator.evaluateSubprocessor('VENDOR-QUANTUM-SAFE', assets);
    expect(result.readinessScore).toBe(100);
    expect(result.sndlExposureRisk).toBe('LOW');
    expect(result.cnsa2ComplianceEligible).toBe(true);
    expect(result.quantumVulnerableCount).toBe(0);
  });
});
