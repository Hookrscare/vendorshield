/**
 * QA-180: Real-Time Vendor Supply Chain Software Bill of Materials (SBOM) Dependency Drift & Cryptographic Tamper Notifier.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Compares vendor baseline SBOMs against newly released candidate SBOMs to detect:
 * 1. Cryptographic binary hash mutation (upstream tampering / supply chain backdoor).
 * 2. Unapproved new direct/transitive dependency additions.
 * 3. Restrictive copyleft license contamination (e.g., AGPL-3.0, SSPL).
 * 4. Critical CVSS v4.0 vulnerability injection into production dependencies.
 * 5. Issues automated SOC 2 supply chain quarantine alerts and audit hashes.
 */

import { createHash } from "crypto";

export interface SbomItem {
  name: string;
  version: string;
  sha256: string;
  license: string;
  purl?: string;
  cves?: Array<{
    cveId: string;
    cvssScore: number;
  }>;
}

export interface SbomSnapshot {
  vendorId: string;
  vendorName: string;
  releaseVersion: string;
  timestamp: string;
  components: SbomItem[];
}

export type DriftAlertSeverity = "CRITICAL_QUARANTINE" | "HIGH_REVIEW_REQUIRED" | "MEDIUM_WARNING" | "LOW_INFO";

export interface ComponentDrift {
  name: string;
  changeType: "ADDED" | "REMOVED" | "VERSION_CHANGED" | "HASH_MUTATED" | "LICENSE_REGRESSED";
  oldVersion?: string;
  newVersion?: string;
  oldHash?: string;
  newHash?: string;
  oldLicense?: string;
  newLicense?: string;
  severity: DriftAlertSeverity;
  reason: string;
}

export interface SbomDriftReport {
  vendorId: string;
  vendorName: string;
  baselineRelease: string;
  candidateRelease: string;
  overallSeverity: DriftAlertSeverity;
  isApprovedForDeployment: boolean;
  totalBaselineComponents: number;
  totalCandidateComponents: number;
  tamperedComponentsCount: number;
  newDependenciesCount: number;
  licenseRegressionsCount: number;
  driftItems: ComponentDrift[];
  notificationPayload: {
    webhookAlert: boolean;
    urgentCisoNotification: boolean;
    recommendedActions: string[];
  };
  auditHash: string;
}

export class VendorSbomDependencyDriftNotifier {
  private static readonly COPYLEFT_PROHIBITED = new Set([
    "AGPL-3.0",
    "AGPL-3.0-only",
    "GPL-3.0",
    "GPL-3.0-only",
    "SSPL-1.0",
    "Commons-Clause",
    "BUSL-1.1"
  ]);

  public static evaluateDrift(
    baseline: SbomSnapshot,
    candidate: SbomSnapshot
  ): SbomDriftReport {
    const baseMap = new Map<string, SbomItem>();
    for (const item of baseline.components) {
      baseMap.set(item.name, item);
    }

    const candMap = new Map<string, SbomItem>();
    for (const item of candidate.components) {
      candMap.set(item.name, item);
    }

    const driftItems: ComponentDrift[] = [];
    let tamperedCount = 0;
    let newDepsCount = 0;
    let licenseRegressionsCount = 0;

    // Check candidate components against baseline
    for (const [name, candItem] of candMap.entries()) {
      const baseItem = baseMap.get(name);

      if (!baseItem) {
        // Newly added dependency
        newDepsCount++;
        const isProhibited = this.COPYLEFT_PROHIBITED.has(candItem.license);
        const hasCriticalCve = (candItem.cves || []).some(c => c.cvssScore >= 9.0);

        let sev: DriftAlertSeverity = "HIGH_REVIEW_REQUIRED";
        let reason = `New unreviewed dependency added to vendor bill of materials (${candItem.name}@${candItem.version}).`;

        if (isProhibited || hasCriticalCve) {
          sev = "CRITICAL_QUARANTINE";
          if (isProhibited) reason += ` Violates license policy with ${candItem.license}.`;
          if (hasCriticalCve) reason += ` Introduces Critical CVSS 9.0+ vulnerability.`;
        }

        driftItems.push({
          name,
          changeType: "ADDED",
          newVersion: candItem.version,
          newHash: candItem.sha256,
          newLicense: candItem.license,
          severity: sev,
          reason
        });
        continue;
      }

      // Check for cryptographic hash mutation on identical version (Supply Chain Backdoor Indicator!)
      if (baseItem.version === candItem.version && baseItem.sha256.toLowerCase() !== candItem.sha256.toLowerCase()) {
        tamperedCount++;
        driftItems.push({
          name,
          changeType: "HASH_MUTATED",
          oldVersion: baseItem.version,
          newVersion: candItem.version,
          oldHash: baseItem.sha256,
          newHash: candItem.sha256,
          severity: "CRITICAL_QUARANTINE",
          reason: `SECURITY ALERT: Cryptographic hash mutated without version bump (${baseItem.sha256.substring(0, 10)} -> ${candItem.sha256.substring(0, 10)}). High probability of upstream supply-chain compromise or malicious build injection.`
        });
        continue;
      }

      // Check for license regressions
      const baseIsPermissive = !this.COPYLEFT_PROHIBITED.has(baseItem.license);
      const candIsProhibited = this.COPYLEFT_PROHIBITED.has(candItem.license);
      if (baseIsPermissive && candIsProhibited) {
        licenseRegressionsCount++;
        driftItems.push({
          name,
          changeType: "LICENSE_REGRESSED",
          oldVersion: baseItem.version,
          newVersion: candItem.version,
          oldLicense: baseItem.license,
          newLicense: candItem.license,
          severity: "CRITICAL_QUARANTINE",
          reason: `License regressed from permissive '${baseItem.license}' to copyleft/viral '${candItem.license}'. Threatens SaaS proprietary IP boundary.`
        });
        continue;
      }

      // Check version change
      if (baseItem.version !== candItem.version) {
        const isMajorJump = baseItem.version.split(".")[0] !== candItem.version.split(".")[0];
        const newCves = (candItem.cves || []).filter(c => c.cvssScore >= 7.0);

        let sev: DriftAlertSeverity = isMajorJump ? "HIGH_REVIEW_REQUIRED" : "LOW_INFO";
        if (newCves.some(c => c.cvssScore >= 9.0)) {
          sev = "CRITICAL_QUARANTINE";
        }

        driftItems.push({
          name,
          changeType: "VERSION_CHANGED",
          oldVersion: baseItem.version,
          newVersion: candItem.version,
          oldHash: baseItem.sha256,
          newHash: candItem.sha256,
          severity: sev,
          reason: `Version shifted from ${baseItem.version} to ${candItem.version}${isMajorJump ? " (Major SemVer increment)" : " (Patch/Minor update)"}.`
        });
      }
    }

    // Check removed components
    for (const [name, baseItem] of baseMap.entries()) {
      if (!candMap.has(name)) {
        driftItems.push({
          name,
          changeType: "REMOVED",
          oldVersion: baseItem.version,
          oldHash: baseItem.sha256,
          oldLicense: baseItem.license,
          severity: "LOW_INFO",
          reason: `Component ${name}@${baseItem.version} was pruned from release.`
        });
      }
    }

    // Determine overall severity
    let overallSeverity: DriftAlertSeverity = "LOW_INFO";
    if (driftItems.some(d => d.severity === "CRITICAL_QUARANTINE")) {
      overallSeverity = "CRITICAL_QUARANTINE";
    } else if (driftItems.some(d => d.severity === "HIGH_REVIEW_REQUIRED")) {
      overallSeverity = "HIGH_REVIEW_REQUIRED";
    } else if (driftItems.some(d => d.severity === "MEDIUM_WARNING")) {
      overallSeverity = "MEDIUM_WARNING";
    }

    const isApproved = overallSeverity !== "CRITICAL_QUARANTINE";

    const recommendedActions: string[] = [];
    if (tamperedCount > 0) {
      recommendedActions.push("IMMEDIATE ISOLATION: Revoke vendor production API credentials and investigate artifact origin.");
    }
    if (licenseRegressionsCount > 0) {
      recommendedActions.push("LEGAL REVIEW: Flag license regression to legal counsel before allowing code promotion.");
    }
    if (newDepsCount > 0) {
      recommendedActions.push("VENDOR RISK ASSESSMENT: Submit new third-party components to VendorShield security registry.");
    }
    if (recommendedActions.length === 0) {
      recommendedActions.push("PROCEED: No critical supply-chain drift detected. Safe for automated CI/CD deployment.");
    }

    // Generate SHA-256 audit digest
    const hash = createHash("sha256");
    hash.update(`${baseline.vendorId}:${baseline.releaseVersion}:${candidate.releaseVersion}:${overallSeverity}:${tamperedCount}`);
    const auditHash = hash.digest("hex");

    return {
      vendorId: candidate.vendorId,
      vendorName: candidate.vendorName,
      baselineRelease: baseline.releaseVersion,
      candidateRelease: candidate.releaseVersion,
      overallSeverity,
      isApprovedForDeployment: isApproved,
      totalBaselineComponents: baseline.components.length,
      totalCandidateComponents: candidate.components.length,
      tamperedComponentsCount: tamperedCount,
      newDependenciesCount: newDepsCount,
      licenseRegressionsCount,
      driftItems,
      notificationPayload: {
        webhookAlert: overallSeverity === "CRITICAL_QUARANTINE" || overallSeverity === "HIGH_REVIEW_REQUIRED",
        urgentCisoNotification: overallSeverity === "CRITICAL_QUARANTINE",
        recommendedActions
      },
      auditHash
    };
  }
}
