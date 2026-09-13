import { describe, it, expect } from "vitest";
import {
  CspmRealTimeTelemetryIngestor,
  CloudTelemetryEvent
} from "./cspm-real-time-telemetry-ingestor";

describe("QA-193: CspmRealTimeTelemetryIngestor", () => {
  const ingestor = new CspmRealTimeTelemetryIngestor();

  it("passes compliant storage bucket event without violations", () => {
    const event: CloudTelemetryEvent = {
      eventId: "ev-001",
      timestamp: new Date().toISOString(),
      provider: "AWS",
      accountOrProjectId: "123456789012",
      principal: "arn:aws:iam::123456789012:role/TerraformDeployer",
      action: "s3:CreateBucket",
      resourceId: "arn:aws:s3:::secure-audit-logs",
      resourceType: "STORAGE_BUCKET",
      configurationDelta: {
        isPublic: false,
        encryptionEnabled: true,
        sseAlgorithm: "aws:kms"
      }
    };

    const res = ingestor.ingestEvent(event);
    expect(res.isCompliant).toBe(true);
    expect(res.highestSeverity).toBe("NONE");
    expect(res.postureScoreDelta).toBe(0);
    expect(res.requiresIncidentEscalation).toBe(false);
    expect(res.eventAuditDigestSha256).toHaveLength(64);
  });

  it("detects critical public S3 bucket exposure and escalates", () => {
    const event: CloudTelemetryEvent = {
      eventId: "ev-002",
      timestamp: new Date().toISOString(),
      provider: "AWS",
      accountOrProjectId: "123456789012",
      principal: "arn:aws:iam::123456789012:user/DevAdmin",
      action: "s3:PutBucketPolicy",
      resourceId: "arn:aws:s3:::customer-pii-vault",
      resourceType: "STORAGE_BUCKET",
      configurationDelta: {
        isPublic: true,
        encryptionEnabled: false
      }
    };

    const res = ingestor.ingestEvent(event);
    expect(res.isCompliant).toBe(false);
    expect(res.highestSeverity).toBe("CRITICAL");
    expect(res.postureScoreDelta).toBeLessThanOrEqual(-40); // -25 (critical) + -15 (high)
    expect(res.requiresIncidentEscalation).toBe(true);
    expect(res.flaggedViolations.length).toBe(2);
    expect(res.flaggedViolations[0].ruleId).toBe("CSPM-RULE-S3-001");
  });

  it("flags SSH open to 0.0.0.0/0 on security group changes", () => {
    const event: CloudTelemetryEvent = {
      eventId: "ev-003",
      timestamp: new Date().toISOString(),
      provider: "GCP",
      accountOrProjectId: "enterprise-prod-992",
      principal: "user:ops@example.com",
      action: "compute.firewalls.insert",
      resourceId: "projects/enterprise-prod-992/global/firewalls/allow-ssh",
      resourceType: "NETWORK_FIREWALL",
      configurationDelta: {
        cidr: "0.0.0.0/0",
        openPorts: [22, 80]
      }
    };

    const res = ingestor.ingestEvent(event);
    expect(res.isCompliant).toBe(false);
    expect(res.highestSeverity).toBe("CRITICAL");
    expect(res.requiresIncidentEscalation).toBe(true);
  });

  it("processes batch telemetry stream and computes aggregated metrics", () => {
    const events: CloudTelemetryEvent[] = [
      {
        eventId: "b-01",
        timestamp: new Date().toISOString(),
        provider: "AZURE",
        accountOrProjectId: "sub-1234",
        principal: "sp:azure-devops",
        action: "Microsoft.Storage/storageAccounts/write",
        resourceId: "azure-storage-account-1",
        resourceType: "STORAGE_BUCKET",
        configurationDelta: { isPublic: false, encryptionEnabled: true }
      },
      {
        eventId: "b-02",
        timestamp: new Date().toISOString(),
        provider: "INSFORGE",
        accountOrProjectId: "proj-abc",
        principal: "service_role",
        action: "insforge:database:alter_user",
        resourceId: "db-main-cluster",
        resourceType: "DATABASE_CLUSTER",
        configurationDelta: { publiclyAccessible: true, tlsEnforced: true }
      }
    ];

    const summary = ingestor.batchIngest(events);
    expect(summary.totalProcessed).toBe(2);
    expect(summary.compliantCount).toBe(1);
    expect(summary.nonCompliantCount).toBe(1);
    expect(summary.criticalEscalationCount).toBe(1);
    expect(summary.netPostureScoreImpact).toBe(-25);
    expect(summary.batchAuditDigestSha256).toHaveLength(64);
  });

  it("throws validation error for malformed telemetry events", () => {
    expect(() => {
      ingestor.ingestEvent({
        eventId: "",
        resourceId: "",
        action: "",
        timestamp: "",
        provider: "AWS",
        accountOrProjectId: "",
        principal: "",
        resourceType: "STORAGE_BUCKET",
        configurationDelta: {}
      });
    }).toThrow("Invalid telemetry event");
  });
});
