/**
 * src/lib/nis2-supply-chain-risk-assessor.regression.test.ts
 * Regression tests for QA-150: Automated EU NIS2 Directive Critical Entity Supply Chain Cybersecurity Risk Assessor.
 */

import { describe, it, expect } from 'vitest';
import {
  NIS2SupplyChainRiskAssessor,
  NIS2SupplierPosture
} from './nis2-supply-chain-risk-assessor';

describe('QA-150: NIS2SupplyChainRiskAssessor', () => {
  const assessor = new NIS2SupplyChainRiskAssessor();

  const fullyCompliantEssentialSupplier: NIS2SupplierPosture = {
    vendorId: 'VEND_CLOUD_EU_001',
    vendorName: 'EuroCloud Secure Datacenters SAS',
    annualTurnoverEur: 250_000_000,
    entityCategory: 'ESSENTIAL_ENTITY',
    sector: 'DIGITAL_INFRASTRUCTURE',
    hasRiskAnalysisPolicy: true,
    hasIncidentHandling24hSla: true,
    hasBusinessContinuityDrPlan: true,
    hasCoordinatedVulnerabilityDisclosure: true,
    hasCyberHygieneAndTraining: true,
    hasEncryptionAndPki: true,
    hasAccessControlAndAssetManagement: true,
    hasPhishingResistantMfa: true,
    hasSecuredVoiceVideoComms: true
  };

  it('should validate fully compliant Essential Entity supplier with 100/100 score', () => {
    const report = assessor.assessVendor(fullyCompliantEssentialSupplier);

    expect(report.vendorId).toBe('VEND_CLOUD_EU_001');
    expect(report.complianceScore).toBe(100);
    expect(report.isCompliant).toBe(true);
    expect(report.deficientArticles).toHaveLength(0);
    expect(report.executiveLiabilityWarning).toBe(false);
    expect(report.attestationToken).toMatch(/^NIS2-ART21-[A-F0-9]{16}$/);
  });

  it('should flag 24h early warning deficiency and calculate 2% turnover penalty for Essential Entity', () => {
    const deficientSupplier: NIS2SupplierPosture = {
      ...fullyCompliantEssentialSupplier,
      vendorId: 'VEND_DEFICIENT_01',
      hasIncidentHandling24hSla: false,
      hasPhishingResistantMfa: false
    };

    const report = assessor.assessVendor(deficientSupplier);

    expect(report.complianceScore).toBe(70);
    expect(report.isCompliant).toBe(false);
    expect(report.executiveLiabilityWarning).toBe(true);
    expect(report.maxRegulatoryFineEur).toBe(10_000_000); // Statutory minimum €10M applies when 2% is lower
    expect(report.deficientArticles.some(a => a.includes('21(2)(b)'))).toBe(true);
    expect(report.deficientArticles.some(a => a.includes('21(2)(h)'))).toBe(true);
  });

  it('should enforce €7,000,000 minimum fine baseline for Important Entities', () => {
    const smallImportantSupplier: NIS2SupplierPosture = {
      ...fullyCompliantEssentialSupplier,
      vendorId: 'VEND_SMALL_IMPORTANT',
      annualTurnoverEur: 10_000_000, // 1.4% would be 140,000, so statutory minimum €7,000,000 applies
      entityCategory: 'IMPORTANT_ENTITY',
      sector: 'DIGITAL_PROVIDER',
      hasRiskAnalysisPolicy: false
    };

    const report = assessor.assessVendor(smallImportantSupplier);

    expect(report.isCompliant).toBe(false);
    expect(report.maxRegulatoryFineEur).toBe(7_000_000);
    expect(report.executiveLiabilityWarning).toBe(false); // Only Essential Entities trigger automatic executive liability
  });
});
