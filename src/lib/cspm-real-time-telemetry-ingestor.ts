/**
 * QA-193: Real-Time Cloud Security Posture Management (CSPM) Telemetry Ingestor.
 * VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Stream-ingests live infrastructure mutation events across AWS, GCP, Azure, and InsForge.
 * Evaluates instantaneous security policy deviations against SOC 2 CC6.1, CC6.6, CC6.8, and GDPR Article 32.
 */

import { createHash } from "crypto";

export type CloudProvider = "AWS" | "GCP" | "AZURE" | "INSFORGE";

export type TelemetrySeverity = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface CloudTelemetryEvent {
  eventId: string;
  timestamp: string;
  provider: CloudProvider;
  accountOrProjectId: string;
  principal: string;
  action: string;
  resourceId: string;
  resourceType: "STORAGE_BUCKET" | "IAM_ROLE_OR_KEY" | "NETWORK_FIREWALL" | "DATABASE_CLUSTER" | "CONTAINER_SERVICE";
  configurationDelta: Record<string, any>;
}

export interface FlaggedPostureViolation {
  ruleId: string;
  description: string;
  frameworkControl: "SOC2_CC6.1" | "SOC2_CC6.6" | "SOC2_CC6.8" | "GDPR_ART_32";
  severity: TelemetrySeverity;
  immediateRemediationAction: string;
}

export interface IngestResult {
  eventId: string;
  resourceId: string;
  provider: CloudProvider;
  isCompliant: boolean;
  postureScoreDelta: number; // e.g. -25 for critical deviation
  highestSeverity: TelemetrySeverity;
  flaggedViolations: FlaggedPostureViolation[];
  requiresIncidentEscalation: boolean;
  eventAuditDigestSha256: string;
}

export interface BatchIngestSummary {
  totalProcessed: number;
  compliantCount: number;
  nonCompliantCount: number;
  criticalEscalationCount: number;
  netPostureScoreImpact: number;
  batchAuditDigestSha256: string;
  results: IngestResult[];
}

export class CspmRealTimeTelemetryIngestor {
  /**
   * Ingests and audits a single real-time infrastructure telemetry event.
   */
  public ingestEvent(event: CloudTelemetryEvent): IngestResult {
    if (!event.eventId || !event.resourceId || !event.action) {
      throw new Error("Invalid telemetry event: eventId, resourceId, and action are required.");
    }

    const violations: FlaggedPostureViolation[] = [];
    const delta = event.configurationDelta || {};

    // 1. Storage Bucket Public Exposure Check
    if (event.resourceType === "STORAGE_BUCKET") {
      if (delta.isPublic === true || delta.acl === "public-read" || delta.publicAccessPrevention === "disabled") {
        violations.push({
          ruleId: "CSPM-RULE-S3-001",
          description: `Storage bucket '${event.resourceId}' made publicly accessible without authentication.`,
          frameworkControl: "SOC2_CC6.1",
          severity: "CRITICAL",
          immediateRemediationAction: "Enforce uniform bucket-level access and enable public access block immediately."
        });
      }
      if (delta.encryptionEnabled === false || delta.sseAlgorithm === "none") {
        violations.push({
          ruleId: "CSPM-RULE-S3-002",
          description: `Encryption at rest disabled on storage bucket '${event.resourceId}'.`,
          frameworkControl: "SOC2_CC6.6",
          severity: "HIGH",
          immediateRemediationAction: "Re-enable KMS or AES-256 server-side encryption."
        });
      }
    }

    // 2. IAM Credential & Privilege Checks
    if (event.resourceType === "IAM_ROLE_OR_KEY") {
      if (event.action.includes("CreateAccessKey") && event.principal.toLowerCase().includes("root")) {
        violations.push({
          ruleId: "CSPM-RULE-IAM-001",
          description: "Long-lived access key created for root account.",
          frameworkControl: "SOC2_CC6.1",
          severity: "CRITICAL",
          immediateRemediationAction: "Delete root access key and enforce SSO / temporary IAM role assumption."
        });
      }
      if (delta.hasWildcardAdministratorAccess === true) {
        violations.push({
          ruleId: "CSPM-RULE-IAM-002",
          description: "Over-permissive policy (Action: '*', Resource: '*') attached to entity.",
          frameworkControl: "SOC2_CC6.1",
          severity: "HIGH",
          immediateRemediationAction: "Scope policy to least-privilege resource ARNs."
        });
      }
    }

    // 3. Network Ingress Exposure Checks
    if (event.resourceType === "NETWORK_FIREWALL") {
      const openPorts: number[] = Array.isArray(delta.openPorts) ? delta.openPorts : [];
      const cidr: string = delta.cidr || "";
      if (cidr === "0.0.0.0/0" || cidr === "::/0") {
        if (openPorts.includes(22) || openPorts.includes(3389)) {
          violations.push({
            ruleId: "CSPM-RULE-NET-001",
            description: "Direct management port (SSH 22 / RDP 3389) exposed to world 0.0.0.0/0.",
            frameworkControl: "SOC2_CC6.6",
            severity: "CRITICAL",
            immediateRemediationAction: "Restrict ingress to corporate VPN CIDR or deploy SSM/IAP bastion."
          });
        }
        if (openPorts.includes(5432) || openPorts.includes(3306) || openPorts.includes(27017)) {
          violations.push({
            ruleId: "CSPM-RULE-NET-002",
            description: "Direct database port exposed to public Internet.",
            frameworkControl: "GDPR_ART_32",
            severity: "CRITICAL",
            immediateRemediationAction: "Isolate database to private subnets with VPC endpoints."
          });
        }
      }
    }

    // 4. Database Exposure Checks
    if (event.resourceType === "DATABASE_CLUSTER") {
      if (delta.publiclyAccessible === true) {
        violations.push({
          ruleId: "CSPM-RULE-DB-001",
          description: `Database cluster '${event.resourceId}' marked publicly accessible.`,
          frameworkControl: "GDPR_ART_32",
          severity: "CRITICAL",
          immediateRemediationAction: "Disable public accessibility and enforce private VPC peering."
        });
      }
      if (delta.tlsEnforced === false) {
        violations.push({
          ruleId: "CSPM-RULE-DB-002",
          description: "Database cluster allows plaintext unencrypted TLS transit connections.",
          frameworkControl: "SOC2_CC6.6",
          severity: "HIGH",
          immediateRemediationAction: "Enforce sslmode=require and upgrade to TLS 1.3."
        });
      }
    }

    // Determine highest severity and score impact
    let highestSeverity: TelemetrySeverity = "NONE";
    let scoreDelta = 0;

    for (const v of violations) {
      if (v.severity === "CRITICAL") {
        highestSeverity = "CRITICAL";
        scoreDelta -= 25;
      } else if (v.severity === "HIGH") {
        if (highestSeverity !== "CRITICAL") highestSeverity = "HIGH";
        scoreDelta -= 15;
      } else if (v.severity === "MEDIUM") {
        if (highestSeverity !== "CRITICAL" && highestSeverity !== "HIGH") highestSeverity = "MEDIUM";
        scoreDelta -= 8;
      } else if (v.severity === "LOW") {
        if (highestSeverity === "NONE") highestSeverity = "LOW";
        scoreDelta -= 3;
      }
    }

    const isCompliant = violations.length === 0;
    const requiresIncidentEscalation = highestSeverity === "CRITICAL";

    // Build tamper-evident SHA-256 digest
    const rawPayload = `${event.eventId}:${event.resourceId}:${event.action}:${violations.length}:${highestSeverity}:${scoreDelta}`;
    const digest = createHash("sha256").update(rawPayload).digest("hex");

    return {
      eventId: event.eventId,
      resourceId: event.resourceId,
      provider: event.provider,
      isCompliant,
      postureScoreDelta: scoreDelta,
      highestSeverity,
      flaggedViolations: violations,
      requiresIncidentEscalation,
      eventAuditDigestSha256: digest
    };
  }

  /**
   * Processes a batch of telemetry events and calculates aggregated impact.
   */
  public batchIngest(events: CloudTelemetryEvent[]): BatchIngestSummary {
    const results: IngestResult[] = [];
    let compliantCount = 0;
    let criticalEscalationCount = 0;
    let netImpact = 0;

    for (const ev of events) {
      const res = this.ingestEvent(ev);
      results.push(res);
      if (res.isCompliant) {
        compliantCount++;
      } else {
        if (res.requiresIncidentEscalation) criticalEscalationCount++;
        netImpact += res.postureScoreDelta;
      }
    }

    const batchDigest = createHash("sha256")
      .update(`${events.length}:${compliantCount}:${criticalEscalationCount}:${netImpact}`)
      .digest("hex");

    return {
      totalProcessed: events.length,
      compliantCount,
      nonCompliantCount: events.length - compliantCount,
      criticalEscalationCount,
      netPostureScoreImpact: netImpact,
      batchAuditDigestSha256: batchDigest,
      results
    };
  }
}
