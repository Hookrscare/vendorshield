import { describe, it, expect } from "vitest";
import {
  VendorSbomDependencyDriftNotifier,
  SbomSnapshot
} from "./vendor-sbom-dependency-drift-notifier";

describe("QA-180: Vendor SBOM Dependency Drift & Cryptographic Tamper Notifier", () => {
  const mockBaseline: SbomSnapshot = {
    vendorId: "vnd-supabase-core",
    vendorName: "Supabase Relational Auth",
    releaseVersion: "2.40.0",
    timestamp: "2026-08-01T00:00:00Z",
    components: [
      {
        name: "@supabase/gotrue-js",
        version: "2.65.0",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        license: "MIT"
      },
      {
        name: "@supabase/postgrest-js",
        version: "1.15.0",
        sha256: "a6c8b9d2e1f4a5c6b7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
        license: "Apache-2.0"
      },
      {
        name: "cross-fetch",
        version: "4.0.0",
        sha256: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
        license: "MIT"
      }
    ]
  };

  it("approves clean patch release with no tamper or license regressions", () => {
    const candidate: SbomSnapshot = {
      vendorId: "vnd-supabase-core",
      vendorName: "Supabase Relational Auth",
      releaseVersion: "2.40.1",
      timestamp: "2026-09-01T00:00:00Z",
      components: [
        {
          name: "@supabase/gotrue-js",
          version: "2.65.1",
          sha256: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          license: "MIT"
        },
        {
          name: "@supabase/postgrest-js",
          version: "1.15.0",
          sha256: "a6c8b9d2e1f4a5c6b7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
          license: "Apache-2.0"
        },
        {
          name: "cross-fetch",
          version: "4.0.0",
          sha256: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
          license: "MIT"
        }
      ]
    };

    const report = VendorSbomDependencyDriftNotifier.evaluateDrift(mockBaseline, candidate);
    expect(report.isApprovedForDeployment).toBe(true);
    expect(report.overallSeverity).toBe("LOW_INFO");
    expect(report.tamperedComponentsCount).toBe(0);
    expect(report.notificationPayload.urgentCisoNotification).toBe(false);
    expect(report.auditHash).toHaveLength(64);
  });

  it("detects cryptographic hash mutation on identical package version (SolarWinds style tamper)", () => {
    const candidateTampered: SbomSnapshot = {
      vendorId: "vnd-supabase-core",
      vendorName: "Supabase Relational Auth",
      releaseVersion: "2.40.0-patched",
      timestamp: "2026-09-02T00:00:00Z",
      components: [
        {
          name: "@supabase/gotrue-js",
          version: "2.65.0", // Identical version, but checksum mutated!
          sha256: "9999999999999999999999999999999999999999999999999999999999999999",
          license: "MIT"
        },
        {
          name: "@supabase/postgrest-js",
          version: "1.15.0",
          sha256: "a6c8b9d2e1f4a5c6b7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
          license: "Apache-2.0"
        },
        {
          name: "cross-fetch",
          version: "4.0.0",
          sha256: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
          license: "MIT"
        }
      ]
    };

    const report = VendorSbomDependencyDriftNotifier.evaluateDrift(mockBaseline, candidateTampered);
    expect(report.isApprovedForDeployment).toBe(false);
    expect(report.overallSeverity).toBe("CRITICAL_QUARANTINE");
    expect(report.tamperedComponentsCount).toBe(1);
    expect(report.notificationPayload.urgentCisoNotification).toBe(true);
    expect(report.notificationPayload.webhookAlert).toBe(true);
    expect(report.driftItems[0].changeType).toBe("HASH_MUTATED");
  });

  it("flags viral copyleft license contamination and unapproved new dependencies", () => {
    const candidateContaminated: SbomSnapshot = {
      vendorId: "vnd-supabase-core",
      vendorName: "Supabase Relational Auth",
      releaseVersion: "2.41.0",
      timestamp: "2026-09-03T00:00:00Z",
      components: [
        {
          name: "@supabase/gotrue-js",
          version: "2.65.0",
          sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          license: "AGPL-3.0" // Regressed license!
        },
        {
          name: "malicious-telemetry-sdk", // Newly introduced unapproved package!
          version: "1.0.0",
          sha256: "abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234",
          license: "MIT",
          cves: [{ cveId: "CVE-2026-9999", cvssScore: 9.8 }] // Critical CVE!
        }
      ]
    };

    const report = VendorSbomDependencyDriftNotifier.evaluateDrift(mockBaseline, candidateContaminated);
    expect(report.isApprovedForDeployment).toBe(false);
    expect(report.overallSeverity).toBe("CRITICAL_QUARANTINE");
    expect(report.licenseRegressionsCount).toBe(1);
    expect(report.newDependenciesCount).toBe(1);
    expect(report.notificationPayload.urgentCisoNotification).toBe(true);
  });
});
