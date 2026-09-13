/**
 * QA-180: Real-Time Vendor Supply Chain Software Bill of Materials (SBOM) Dependency Drift Notifier
 * Part of VendorShield B2B Enterprise Compliance Platform
 *
 * Continuously ingests CycloneDX and SPDX SBOM component manifests, detects version drift,
 * flags unannounced transitive dependencies, evaluates license policy compliance drift,
 * and emits real-time alert notifications to enterprise risk engineering teams.
 */

import { createHash } from 'crypto';

export type ComponentType = 'application' | 'framework' | 'library' | 'container' | 'operating-system';
export type DependencyScope = 'direct' | 'transitive';
export type LicenseCategory = 'permissive' | 'weak-copyleft' | 'strong-copyleft' | 'proprietary' | 'unknown';
export type DriftSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SbomComponent {
  name: string;
  version: string;
  purl?: string;
  type: ComponentType;
  scope: DependencyScope;
  license: string;
  licenseCategory?: LicenseCategory;
  integrityHash?: string;
}

export interface SbomManifest {
  specVersion: 'CycloneDX-1.5' | 'SPDX-2.3' | 'SPDX-3.0';
  vendorId: string;
  vendorName: string;
  releaseVersion: string;
  timestamp: string;
  components: SbomComponent[];
}

export interface ComponentDrift {
  componentName: string;
  driftType: 'VERSION_UPGRADE' | 'VERSION_DOWNGRADE' | 'NEW_DEPENDENCY' | 'REMOVED_DEPENDENCY' | 'LICENSE_CHANGE';
  previousVersion?: string;
  currentVersion?: string;
  previousLicense?: string;
  currentLicense?: string;
  scope: DependencyScope;
  severity: DriftSeverity;
  details: string;
}

export interface SbomDriftReport {
  vendorId: string;
  vendorName: string;
  baselineRelease: string;
  currentRelease: string;
  generatedAt: string;
  totalComponentsBaseline: number;
  totalComponentsCurrent: number;
  driftCount: number;
  highestSeverity: DriftSeverity;
  drifts: ComponentDrift[];
  notificationRequired: boolean;
  tamperProofHash: string;
}

export class VendorSupplyChainSbomDriftNotifier {
  private allowedLicenses: Set<string>;

  constructor(allowedLicenses: string[] = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC']) {
    this.allowedLicenses = new Set(allowedLicenses);
  }

  public compareManifests(baseline: SbomManifest, current: SbomManifest): SbomDriftReport {
    const baseMap = new Map<string, SbomComponent>();
    for (const comp of baseline.components) {
      baseMap.set(comp.name, comp);
    }

    const currentMap = new Map<string, SbomComponent>();
    for (const comp of current.components) {
      currentMap.set(comp.name, comp);
    }

    const drifts: ComponentDrift[] = [];

    // Check for changes and new additions
    for (const [name, currComp] of currentMap.entries()) {
      const baseComp = baseMap.get(name);
      if (!baseComp) {
        // New dependency introduced
        const isStrongCopyleft = this.isCopyleft(currComp.license);
        const severity: DriftSeverity = isStrongCopyleft
          ? 'CRITICAL'
          : currComp.scope === 'direct'
          ? 'MEDIUM'
          : 'LOW';

        drifts.push({
          componentName: name,
          driftType: 'NEW_DEPENDENCY',
          currentVersion: currComp.version,
          currentLicense: currComp.license,
          scope: currComp.scope,
          severity,
          details: `Newly introduced ${currComp.scope} component (${currComp.license}) in release ${current.releaseVersion}`
        });
      } else {
        // Check version change
        if (baseComp.version !== currComp.version) {
          const isDowngrade = this.isVersionLower(currComp.version, baseComp.version);
          drifts.push({
            componentName: name,
            driftType: isDowngrade ? 'VERSION_DOWNGRADE' : 'VERSION_UPGRADE',
            previousVersion: baseComp.version,
            currentVersion: currComp.version,
            scope: currComp.scope,
            severity: isDowngrade ? 'HIGH' : 'LOW',
            details: `Version shifted from ${baseComp.version} to ${currComp.version}`
          });
        }

        // Check license change
        if (baseComp.license !== currComp.license) {
          const isNowCopyleft = this.isCopyleft(currComp.license);
          const severity: DriftSeverity = isNowCopyleft ? 'CRITICAL' : 'HIGH';

          drifts.push({
            componentName: name,
            driftType: 'LICENSE_CHANGE',
            previousLicense: baseComp.license,
            currentLicense: currComp.license,
            scope: currComp.scope,
            severity,
            details: `License changed from ${baseComp.license} to ${currComp.license}`
          });
        }
      }
    }

    // Check for removed dependencies
    for (const [name, baseComp] of baseMap.entries()) {
      if (!currentMap.has(name)) {
        drifts.push({
          componentName: name,
          driftType: 'REMOVED_DEPENDENCY',
          previousVersion: baseComp.version,
          previousLicense: baseComp.license,
          scope: baseComp.scope,
          severity: 'LOW',
          details: `Component removed in release ${current.releaseVersion}`
        });
      }
    }

    // Determine highest severity
    let highestSeverity: DriftSeverity = 'LOW';
    const severityRanks: Record<DriftSeverity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

    for (const d of drifts) {
      if (severityRanks[d.severity] > severityRanks[highestSeverity]) {
        highestSeverity = d.severity;
      }
    }

    const notificationRequired = severityRanks[highestSeverity] >= severityRanks.HIGH;

    const reportData = {
      vendorId: current.vendorId,
      vendorName: current.vendorName,
      baselineRelease: baseline.releaseVersion,
      currentRelease: current.releaseVersion,
      totalComponentsBaseline: baseline.components.length,
      totalComponentsCurrent: current.components.length,
      driftCount: drifts.length,
      highestSeverity
    };

    const hash = createHash('sha256')
      .update(JSON.stringify(reportData))
      .digest('hex');

    return {
      ...reportData,
      generatedAt: new Date().toISOString(),
      drifts,
      notificationRequired,
      tamperProofHash: hash
    };
  }

  private isCopyleft(license: string): boolean {
    const copyleftLicenses = ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-3.0', 'SSPL'];
    return copyleftLicenses.some((cl) => license.toUpperCase().includes(cl));
  }

  private isVersionLower(vCurrent: string, vPrevious: string): boolean {
    const curParts = vCurrent.split('.').map(Number);
    const prevParts = vPrevious.split('.').map(Number);
    for (let i = 0; i < Math.max(curParts.length, prevParts.length); i++) {
      const c = curParts[i] || 0;
      const p = prevParts[i] || 0;
      if (c < p) return true;
      if (c > p) return false;
    }
    return false;
  }
}
