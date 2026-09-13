/**
 * QA-155: Automated Enterprise AI Supply Chain Model Weight Watermark & Provenance Auditor Regression Tests
 */

import { describe, it, expect } from 'vitest';
import {
  AISupplyChainProvenanceAuditor,
  ModelWeightArtifact
} from './ai-supply-chain-provenance-auditor';

describe('QA-155: AISupplyChainProvenanceAuditor', () => {
  const auditor = new AISupplyChainProvenanceAuditor('enterprise-secret-salt-xyz');
  const validSha256 = 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0';

  it('certifies fully compliant SLSA L3 model weights with SynthID watermark', () => {
    const artifact: ModelWeightArtifact = {
      modelId: 'gpt-4o-enterprise-audit',
      vendorName: 'OpenAI',
      modelVersion: '2026-08-01',
      weightSha256: validSha256,
      totalParameters: 175000000000,
      provenanceAttestation: {
        framework: 'SLSA_L3',
        signedBy: 'security-release@openai.com',
        signatureValid: true,
        timestamp: '2026-09-01T00:00:00Z',
        buildHost: 'harden-builder-cluster-04.us-east.aws'
      },
      watermarkManifest: {
        embedded: true,
        watermarkType: 'SYNTHID_SPECTRAL',
        watermarkKeyHash: 'keyhash-synthid-sec-99',
        robustnessScore: 0.95
      },
      trainingDatasetProvenance: {
        datasetName: 'enterprise-clean-corpus-v5',
        licenseType: 'COMMERCIAL_AUDITED',
        copyrightCompliant: true,
        piiScrubbed: true
      }
    };

    const report = auditor.auditModelArtifact(artifact);
    expect(report.compliant).toBe(true);
    expect(report.status).toBe('CERTIFIED');
    expect(report.complianceScore).toBe(100);
    expect(report.tamperEvidenceDetected).toBe(false);
    expect(report.findings.length).toBe(0);

    const verified = auditor.verifyAuditDigest(report);
    expect(verified).toBe(true);
  });

  it('detects invalid cryptographic signature and rejects supply chain artifact', () => {
    const artifact: ModelWeightArtifact = {
      modelId: 'mistral-large-unverified',
      vendorName: 'MistralAI',
      modelVersion: '2407',
      weightSha256: validSha256,
      totalParameters: 123000000000,
      provenanceAttestation: {
        framework: 'SLSA_L3',
        signedBy: 'untrusted-builder@unknown.org',
        signatureValid: false,
        timestamp: '2026-09-02T12:00:00Z',
        buildHost: 'public-node-99.unknown.net'
      },
      trainingDatasetProvenance: {
        datasetName: 'web-scrape-unverified',
        licenseType: 'UNKNOWN',
        copyrightCompliant: true,
        piiScrubbed: true
      }
    };

    const report = auditor.auditModelArtifact(artifact);
    expect(report.compliant).toBe(false);
    expect(report.status).toBe('REJECTED_SUPPLY_CHAIN_RISK');
    expect(report.tamperEvidenceDetected).toBe(true);
    expect(report.findings.some(f => f.includes('signature'))).toBe(true);
  });

  it('flags unscrubbed PII and missing watermark with conditional score reduction', () => {
    const artifact: ModelWeightArtifact = {
      modelId: 'internal-fine-tuned-llama',
      vendorName: 'InternalEngineering',
      modelVersion: '1.2.0',
      weightSha256: validSha256,
      totalParameters: 70000000000,
      provenanceAttestation: {
        framework: 'SLSA_L3',
        signedBy: 'corp-mlops@enterprise.internal',
        signatureValid: true,
        timestamp: '2026-09-05T10:00:00Z',
        buildHost: 'corp-builder-01.internal'
      },
      watermarkManifest: {
        embedded: false
      },
      trainingDatasetProvenance: {
        datasetName: 'raw-support-tickets-2026',
        licenseType: 'PROPRIETARY',
        copyrightCompliant: true,
        piiScrubbed: false
      }
    };

    const report = auditor.auditModelArtifact(artifact);
    expect(report.compliant).toBe(true);
    expect(report.status).toBe('CONDITIONAL_APPROVAL');
    expect(report.complianceScore).toBe(70);
    expect(report.findings.some(f => f.includes('PII scrubbing'))).toBe(true);
    expect(report.findings.some(f => f.includes('watermark'))).toBe(true);
  });

  it('rejects tampered audit digest verification', () => {
    const artifact: ModelWeightArtifact = {
      modelId: 'claude-3-5-sonnet-audit',
      vendorName: 'Anthropic',
      modelVersion: '2026-06-20',
      weightSha256: validSha256,
      totalParameters: 200000000000,
      provenanceAttestation: {
        framework: 'C2PA_V2',
        signedBy: 'release@anthropic.com',
        signatureValid: true,
        timestamp: '2026-09-01T00:00:00Z',
        buildHost: 'cluster-c2pa-01'
      },
      watermarkManifest: {
        embedded: true,
        robustnessScore: 0.88
      },
      trainingDatasetProvenance: {
        datasetName: 'anthropic-clean-corpus',
        licenseType: 'COMMERCIAL',
        copyrightCompliant: true,
        piiScrubbed: true
      }
    };

    const report = auditor.auditModelArtifact(artifact);
    expect(report.status).toBe('CERTIFIED');

    // Simulate tampering with report score
    const tamperedReport = { ...report, complianceScore: 50 };
    expect(auditor.verifyAuditDigest(tamperedReport)).toBe(false);
  });
});
