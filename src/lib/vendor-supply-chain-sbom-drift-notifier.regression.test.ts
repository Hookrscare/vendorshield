import { describe, it, expect } from 'vitest';
import {
  VendorSupplyChainSbomDriftNotifier,
  SbomManifest
} from './vendor-supply-chain-sbom-drift-notifier';

describe('QA-180: VendorSupplyChainSbomDriftNotifier', () => {
  const notifier = new VendorSupplyChainSbomDriftNotifier();

  const baselineManifest: SbomManifest = {
    specVersion: 'CycloneDX-1.5',
    vendorId: 'vnd_saas_001',
    vendorName: 'CloudPlatform Inc',
    releaseVersion: '2.4.0',
    timestamp: '2026-09-01T00:00:00Z',
    components: [
      {
        name: 'express',
        version: '4.18.2',
        type: 'framework',
        scope: 'direct',
        license: 'MIT'
      },
      {
        name: 'lodash',
        version: '4.17.21',
        type: 'library',
        scope: 'transitive',
        license: 'MIT'
      },
      {
        name: 'pg',
        version: '8.11.0',
        type: 'library',
        scope: 'direct',
        license: 'MIT'
      }
    ]
  };

  it('detects zero drift between identical manifests', () => {
    const report = notifier.compareManifests(baselineManifest, baselineManifest);
    expect(report.driftCount).toBe(0);
    expect(report.highestSeverity).toBe('LOW');
    expect(report.notificationRequired).toBe(false);
    expect(report.tamperProofHash).toBeDefined();
  });

  it('detects version upgrade as LOW severity', () => {
    const currentManifest: SbomManifest = {
      ...baselineManifest,
      releaseVersion: '2.4.1',
      components: [
        {
          name: 'express',
          version: '4.19.2',
          type: 'framework',
          scope: 'direct',
          license: 'MIT'
        },
        ...baselineManifest.components.slice(1)
      ]
    };

    const report = notifier.compareManifests(baselineManifest, currentManifest);
    expect(report.driftCount).toBe(1);
    expect(report.drifts[0].driftType).toBe('VERSION_UPGRADE');
    expect(report.drifts[0].severity).toBe('LOW');
    expect(report.notificationRequired).toBe(false);
  });

  it('flags newly introduced strong-copyleft component as CRITICAL severity', () => {
    const currentManifest: SbomManifest = {
      ...baselineManifest,
      releaseVersion: '2.5.0',
      components: [
        ...baselineManifest.components,
        {
          name: 'gpl-crypto-module',
          version: '1.0.0',
          type: 'library',
          scope: 'direct',
          license: 'GPL-3.0'
        }
      ]
    };

    const report = notifier.compareManifests(baselineManifest, currentManifest);
    expect(report.driftCount).toBe(1);
    expect(report.highestSeverity).toBe('CRITICAL');
    expect(report.notificationRequired).toBe(true);
    expect(report.drifts[0].severity).toBe('CRITICAL');
  });

  it('flags unexpected version downgrade as HIGH severity', () => {
    const currentManifest: SbomManifest = {
      ...baselineManifest,
      releaseVersion: '2.4.1-patch',
      components: [
        {
          name: 'express',
          version: '4.17.1',
          type: 'framework',
          scope: 'direct',
          license: 'MIT'
        },
        ...baselineManifest.components.slice(1)
      ]
    };

    const report = notifier.compareManifests(baselineManifest, currentManifest);
    expect(report.drifts[0].driftType).toBe('VERSION_DOWNGRADE');
    expect(report.drifts[0].severity).toBe('HIGH');
    expect(report.notificationRequired).toBe(true);
  });
});
