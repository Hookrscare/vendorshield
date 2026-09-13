import { describe, it, expect } from 'vitest';
import {
  RealtimeDeepfakeDetectionIntegrator,
  ForensicSignalPayload,
} from './realtime-deepfake-detection-integrator';

describe('QA-154: RealtimeDeepfakeDetectionIntegrator (Enterprise Vendor Deepfake Forensic Gateway)', () => {
  const integrator = new RealtimeDeepfakeDetectionIntegrator('test-secret-salt-772');

  it('approves authentic biometric vendor streams with high rPPG coherence', () => {
    const payload: ForensicSignalPayload = {
      inspectionId: 'INSP-101',
      vendorId: 'VEND-ZOOM-KYC',
      vendorName: 'Zoom Video Communications',
      modality: 'FACIAL_VIDEO',
      rppgBilateralCoherence: 0.88,
      detectedBpm: 74,
      mcgurkIncongruityScore: 0.12,
      c2paManifestValid: true,
      c2paSignedByApprovedIssuer: true,
      disclosedAsSyntheticByVendor: false,
      timestamp: '2026-09-13T02:00:00Z',
    };

    const attestation = integrator.evaluateVendorMediaStream(payload);
    expect(attestation.verdict).toBe('AUTHENTIC_VERIFIED');
    expect(attestation.syntheticRiskScore).toBe(0);
    expect(attestation.euAiActArticle50Compliant).toBe(true);
    expect(attestation.quarantineRequired).toBe(false);
    expect(integrator.verifyAttestationSignature(attestation)).toBe(true);
  });

  it('blocks and quarantines undisclosed synthetic deepfakes', () => {
    const payload: ForensicSignalPayload = {
      inspectionId: 'INSP-102',
      vendorId: 'VEND-ROGUE-AVATAR',
      vendorName: 'Anonymous Freelancer',
      modality: 'FACIAL_VIDEO',
      rppgBilateralCoherence: 0.18, // Incoherent synthetic pulse
      detectedBpm: 210, // Unphysiological
      mcgurkIncongruityScore: 0.82, // Severe desync
      c2paManifestValid: false,
      c2paSignedByApprovedIssuer: false,
      disclosedAsSyntheticByVendor: false, // Undisclosed!
      timestamp: '2026-09-13T02:05:00Z',
    };

    const attestation = integrator.evaluateVendorMediaStream(payload);
    expect(attestation.verdict).toBe('UNDISCLOSED_DEEPFAKE_PROHIBITED');
    expect(attestation.syntheticRiskScore).toBeGreaterThanOrEqual(80);
    expect(attestation.euAiActArticle50Compliant).toBe(false);
    expect(attestation.quarantineRequired).toBe(true);
    expect(attestation.remediationAction).toContain('Immediate quarantine');
  });

  it('allows transparently disclosed synthetic AI avatars under EU AI Act Art 50', () => {
    const payload: ForensicSignalPayload = {
      inspectionId: 'INSP-103',
      vendorId: 'VEND-SYNTHESIA-SUPPORT',
      vendorName: 'Synthesia Enterprise Avatar Service',
      modality: 'FACIAL_VIDEO',
      rppgBilateralCoherence: 0.10,
      mcgurkIncongruityScore: 0.70,
      c2paManifestValid: true,
      c2paSignedByApprovedIssuer: true,
      disclosedAsSyntheticByVendor: true, // Transparently disclosed!
      timestamp: '2026-09-13T02:10:00Z',
    };

    const attestation = integrator.evaluateVendorMediaStream(payload);
    expect(attestation.verdict).toBe('DISCLOSED_SYNTHETIC_COMPLIANT');
    expect(attestation.euAiActArticle50Compliant).toBe(true);
    expect(attestation.quarantineRequired).toBe(false);
    expect(attestation.remediationAction).toContain('transparently disclosed');
  });

  it('rejects tampered or forged attestation signatures', () => {
    const payload: ForensicSignalPayload = {
      inspectionId: 'INSP-104',
      vendorId: 'VEND-TEST',
      vendorName: 'Test Vendor',
      modality: 'C2PA_DOCUMENT',
      c2paManifestValid: true,
      c2paSignedByApprovedIssuer: true,
      disclosedAsSyntheticByVendor: false,
      timestamp: '2026-09-13T02:15:00Z',
    };

    const attestation = integrator.evaluateVendorMediaStream(payload);
    expect(integrator.verifyAttestationSignature(attestation)).toBe(true);

    // Tamper with verdict
    const forgedAttestation = { ...attestation, verdict: 'AUTHENTIC_VERIFIED' as const, syntheticRiskScore: 0 };
    forgedAttestation.auditTrailHash = '0000000000000000000000000000000000000000000000000000000000000000';
    expect(integrator.verifyAttestationSignature(forgedAttestation)).toBe(false);
  });
});
