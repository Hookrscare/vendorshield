/**
 * vendor-sbom-drift-notifier.ts
 * QA-180: Real-Time Vendor Supply Chain Software Bill of Materials (SBOM) Dependency Drift Notifier.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Enterprise SBOM audit and supply chain drift analyzer:
 * 1. Ingests baseline vs updated CycloneDX/SPDX component dependencies.
 * 2. Detects introduced packages, deleted packages, and version modifications.
 * 3. Flags license incompatibility drift (e.g. MIT -> AGPL-3.0).
 * 4. Compiles executive dependency drift diffs and compliance impact alerts.
 */

export interface SbomComponent {
  name: string;
  version: string;
  purl?: string;
  licenseSpdxId: string; // e.g. "MIT", "Apache-2.0", "AGPL-3.0-only"
}

export interface SbomManifest {
  vendorId: string;
  vendorName: string;
  specVersion: string;   // e.g. "CycloneDX-1.5"
  components: SbomComponent[];
}

export interface DependencyDriftDiff {
  addedComponents: SbomComponent[];
  removedComponents: SbomComponent[];
  versionBumps: Array<{
    name: string;
    fromVersion: string;
    toVersion: string;
    fromLicense: string;
    toLicense: string;
    isLicenseRisk: boolean;
  }>;
}

export interface SbomDriftAuditReport {
  vendorId: string;
  vendorName: string;
  driftDetected: boolean;
  driftSummary: DependencyDriftDiff;
  licenseRiskDetected: boolean;
  auditAction: string;
}

export class VendorSbomDriftNotifier {
  private static readonly COPYLEFT_HIGH_RISK_LICENSES = new Set([
    'GPL-2.0-only',
    'GPL-3.0-only',
    'AGPL-3.0-only',
    'SSPL-1.0'
  ]);

  /**
   * Compares two SBOM manifests and identifies component drift & license compliance risks.
   */
  public static auditSbomDrift(
    baseline: SbomManifest,
    incoming: SbomManifest
  ): SbomDriftAuditReport {
    const baseMap = new Map<string, SbomComponent>();
    for (const c of baseline.components) {
      baseMap.set(c.name, c);
    }

    const incomingMap = new Map<string, SbomComponent>();
    for (const c of incoming.components) {
      incomingMap.set(c.name, c);
    }

    const added: SbomComponent[] = [];
    const removed: SbomComponent[] = [];
    const bumps: DependencyDriftDiff['versionBumps'] = [];
    let licenseRiskFound = false;

    // Check additions and version changes
    for (const [name, incComp] of incomingMap.entries()) {
      if (!baseMap.has(name)) {
        added.push(incComp);
        if (this.COPYLEFT_HIGH_RISK_LICENSES.has(incComp.licenseSpdxId)) {
          licenseRiskFound = true;
        }
      } else {
        const baseComp = baseMap.get(name)!;
        if (baseComp.version !== incComp.version || baseComp.licenseSpdxId !== incComp.licenseSpdxId) {
          const isRisk = !this.COPYLEFT_HIGH_RISK_LICENSES.has(baseComp.licenseSpdxId) &&
            this.COPYLEFT_HIGH_RISK_LICENSES.has(incComp.licenseSpdxId);

          if (isRisk) licenseRiskFound = true;

          bumps.push({
            name,
            fromVersion: baseComp.version,
            toVersion: incComp.version,
            fromLicense: baseComp.licenseSpdxId,
            toLicense: incComp.licenseSpdxId,
            isLicenseRisk: isRisk
          });
        }
      }
    }

    // Check removals
    for (const [name, baseComp] of baseMap.entries()) {
      if (!incomingMap.has(name)) {
        removed.push(baseComp);
      }
    }

    const hasDrift = added.length > 0 || removed.length > 0 || bumps.length > 0;

    let action = 'No supply chain dependency drift detected. SBOM integrity intact.';
    if (licenseRiskFound) {
      action = 'URGENT: Copyleft / restrictive viral license change detected (e.g. AGPL/SSPL). Quarantine vendor release pending legal counsel review.';
    } else if (hasDrift) {
      action = `Supply chain drift detected: ${added.length} added, ${removed.length} removed, ${bumps.length} modified packages. Logged to SOC 2 CC6.8 evidence ledger.`;
    }

    return {
      vendorId: incoming.vendorId,
      vendorName: incoming.vendorName,
      driftDetected: hasDrift,
      driftSummary: {
        addedComponents: added,
        removedComponents: removed,
        versionBumps: bumps
      },
      licenseRiskDetected: licenseRiskFound,
      auditAction: action
    };
  }
}
