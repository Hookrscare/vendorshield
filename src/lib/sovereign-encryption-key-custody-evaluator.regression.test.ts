/**
 * Regression Test Suite for QA-178: Sovereign Encryption Key Custody Evaluator
 */

import { describe, it, expect } from 'vitest';
import {
  SovereignEncryptionKeyCustodyEvaluator,
  type KeyArchitectureAssessmentInput,
} from './sovereign-encryption-key-custody-evaluator';

describe('QA-178: Sovereign Encryption Key Custody Evaluator', () => {
  const evaluator = new SovereignEncryptionKeyCustodyEvaluator();

  it('approves a fully sovereign European external key manager architecture', () => {
    const input: KeyArchitectureAssessmentInput = {
      assessmentId: 'ASSESS-EU-SOV-001',
      vendorId: 'VEND-FRA-491',
      vendorName: 'Sovereign Cloud SAS',
      custodyModel: 'HOLD_YOUR_OWN_KEY_HYOK_EKM',
      dataResidencyRegion: 'EU_FRANCE',
      kmsHsmPhysicalRegion: 'EU_FRANCE',
      providerHeadquartersJurisdiction: 'EU_SOVEREIGN_INDEPENDENT',
      hsmFipsLevel: 3,
      kekAlgorithm: 'POST_QUANTUM_HYBRID_ML_KEM',
      automatedKeyRotationDays: 90,
      supportsDoubleKeyEncryption: true,
      externalKeyAuditLoggingImmutable: true,
    };

    const report = evaluator.evaluate(input);

    expect(report.sovereigntyScore).toBeGreaterThanOrEqual(95);
    expect(report.verdict).toBe('FULLY_COMPLIANT');
    expect(report.subpoenaRisk).toBe('IMMUNE_SOVEREIGN_CONTAINMENT');
    expect(report.crossBorderKeyLeakageDetected).toBe(false);
    expect(report.findings.length).toBe(0);
    expect(report.auditDigestSha256).toHaveLength(64);
  });

  it('rejects cloud-managed keys on US cloud provider storing EU data due to CLOUD Act exposure', () => {
    const input: KeyArchitectureAssessmentInput = {
      assessmentId: 'ASSESS-US-CMK-002',
      vendorId: 'VEND-US-HYPERSCALER',
      vendorName: 'Global Hyperscaler Inc.',
      custodyModel: 'CLOUD_MANAGED_KEY',
      dataResidencyRegion: 'EU_GERMANY',
      kmsHsmPhysicalRegion: 'EU_GERMANY',
      providerHeadquartersJurisdiction: 'US_CLOUD_ACT_SUBJECT',
      hsmFipsLevel: 2,
      kekAlgorithm: 'RSA_4096',
      automatedKeyRotationDays: 0,
      supportsDoubleKeyEncryption: false,
      externalKeyAuditLoggingImmutable: false,
    };

    const report = evaluator.evaluate(input);

    expect(report.verdict).toBe('REJECTED_NON_COMPLIANT');
    expect(report.subpoenaRisk).toBe('HIGH_EXTRATERRITORIAL_CLOUD_ACT_EXPOSED');
    expect(report.sovereigntyScore).toBeLessThan(50);
    expect(report.findings.some(f => f.includes('CLOUD Act'))).toBe(true);
    expect(report.findings.some(f => f.includes('FIPS 140-2/3 Level 2'))).toBe(true);
    expect(report.remediationDirectives.length).toBeGreaterThan(2);
  });

  it('flags cross-border key residency mismatch when HSM is outside data boundary', () => {
    const input: KeyArchitectureAssessmentInput = {
      assessmentId: 'ASSESS-MISMATCH-003',
      vendorId: 'VEND-SPLIT-992',
      vendorName: 'Split-Boundary Corp',
      custodyModel: 'HOLD_YOUR_OWN_KEY_HYOK_EKM',
      dataResidencyRegion: 'EU_GERMANY',
      kmsHsmPhysicalRegion: 'US_EAST',
      providerHeadquartersJurisdiction: 'US_CLOUD_ACT_SUBJECT',
      hsmFipsLevel: 3,
      kekAlgorithm: 'AES_256_GCM',
      automatedKeyRotationDays: 180,
      supportsDoubleKeyEncryption: true,
      externalKeyAuditLoggingImmutable: true,
    };

    const report = evaluator.evaluate(input);

    expect(report.crossBorderKeyLeakageDetected).toBe(true);
    expect(report.subpoenaRisk).toBe('LOW_MITIGATED_BY_EKM');
    expect(report.findings.some(f => f.includes('Cross-border key residency mismatch'))).toBe(true);
    expect(report.verdict).toBe('CONDITIONAL_APPROVAL_WITH_EXCEPTION');
  });
});
