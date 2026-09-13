import { describe, it, expect } from 'vitest';
import {
  VendorSbomDriftNotifier,
  SbomManifest
} from './vendor-sbom-drift-notifier';

describe('QA-180: Vendor SBOM Supply Chain Dependency Drift Notifier', () => {
  const v1Manifest: SbomManifest = {
    vendorId: 'vend_supabase',
    vendorName: 'Supabase Inc',
    specVersion: 'CycloneDX-1.5',
    components: [
      { name: 'postgrest-js', version: '1.8.0', licenseSpdxId: 'MIT' },
      { name: 'gotrue-js', version: '2.4.0', licenseSpdxId: 'MIT' },
      { name: 'legacy-crypto-util', version: '0.9.1', licenseSpdxId: 'Apache-2.0' }
    ]
  };

  it('detects package additions, removals, and upgrades in SBOM manifests', () => {
    const v2Manifest: SbomManifest = {
      vendorId: 'vend_supabase',
      vendorName: 'Supabase Inc',
      specVersion: 'CycloneDX-1.5',
      components: [
        { name: 'postgrest-js', version: '1.9.0', licenseSpdxId: 'MIT' }, // Bump
        { name: 'gotrue-js', version: '2.4.0', licenseSpdxId: 'MIT' },    // Unchanged
        { name: 'realtime-js', version: '2.10.0', licenseSpdxId: 'MIT' }  // Added (legacy-crypto-util removed)
      ]
    };

    const report = VendorSbomDriftNotifier.auditSbomDrift(v1Manifest, v2Manifest);

    expect(report.driftDetected).toBe(true);
    expect(report.driftSummary.addedComponents).toHaveLength(1);
    expect(report.driftSummary.addedComponents[0].name).toBe('realtime-js');
    expect(report.driftSummary.removedComponents).toHaveLength(1);
    expect(report.driftSummary.removedComponents[0].name).toBe('legacy-crypto-util');
    expect(report.driftSummary.versionBumps).toHaveLength(1);
    expect(report.driftSummary.versionBumps[0].name).toBe('postgrest-js');
    expect(report.licenseRiskDetected).toBe(false);
  });

  it('flags viral AGPL copyleft license relicensing as high legal risk', () => {
    const v3ManifestWithAgpl: SbomManifest = {
      vendorId: 'vend_supabase',
      vendorName: 'Supabase Inc',
      specVersion: 'CycloneDX-1.5',
      components: [
        { name: 'postgrest-js', version: '2.0.0', licenseSpdxId: 'AGPL-3.0-only' }, // Viral relicensing!
        { name: 'gotrue-js', version: '2.4.0', licenseSpdxId: 'MIT' },
        { name: 'legacy-crypto-util', version: '0.9.1', licenseSpdxId: 'Apache-2.0' }
      ]
    };

    const report = VendorSbomDriftNotifier.auditSbomDrift(v1Manifest, v3ManifestWithAgpl);

    expect(report.licenseRiskDetected).toBe(true);
    expect(report.auditAction).toContain('URGENT: Copyleft / restrictive viral license change detected');
  });
});
