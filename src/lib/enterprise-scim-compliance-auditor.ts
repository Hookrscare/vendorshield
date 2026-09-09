/**
 * QA-141: Zero-Trust Enterprise SCIM 2.0 & SAML JIT Provisioning Compliance Auditor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Enforces SOC 2 Common Criteria CC6.2, CC6.3 (Access Deprovisioning & Least Privilege)
 * and ISO 27001:2022 Annex A.9.2.6 (Removal or adjustment of access rights).
 * Monitors SCIM 2.0 / SAML identity provider directory synchronization across third-party SaaS tools,
 * flags lingering rogue accounts, measures deprovisioning SLA latency, and exports compliance audit dossiers.
 */

import { createHash } from "crypto";

export type IdPProvider = "OKTA" | "MICROSOFT_ENTRA" | "PING_IDENTITY" | "GOOGLE_WORKSPACE" | "ONE_LOGIN";

export type AccountSyncState =
  | "ACTIVE_MATCHED"
  | "PROVISIONED_PENDING_SYNC"
  | "ORPHANED_ROGUE_ACCOUNT"   // Present in SaaS sub-processor, missing in corporate IdP
  | "DEPROVISIONED_COMPLIANT"
  | "DEPROVISION_SLA_BREACHED"; // Revoked in IdP, still active in SaaS after SLA threshold

export interface SCIMUserRecord {
  id: string;
  userName: string;
  email: string;
  roles: string[];
  department?: string;
  suspendedInIdP: boolean;
  suspendedAtTimestamp?: number; // Epoch ms
  lastActiveInSaaS?: number;     // Epoch ms
  activeInSaaS: boolean;
}

export interface DeprovisioningSLAConfig {
  maxDeprovisioningLatencyHours: number; // Default 4 hours for SOC 2 high-severity systems
  alertOnPrivilegeDrift: boolean;
}

export interface RogueAccountAlert {
  userId: string;
  email: string;
  saasVendorId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  reason: string;
  detectedAt: string;
}

export interface SCIMComplianceAuditReport {
  tenantId: string;
  saasVendorId: string;
  idpProvider: IdPProvider;
  totalEvaluatedUsers: number;
  activeMatchedUsers: number;
  rogueAccountsCount: number;
  deprovisioningBreachesCount: number;
  isSoc2Compliant: boolean;
  alerts: RogueAccountAlert[];
  auditHash: string;
  generatedAt: string;
}

export class EnterpriseSCIMComplianceAuditor {
  private slaConfig: DeprovisioningSLAConfig;

  constructor(config?: Partial<DeprovisioningSLAConfig>) {
    this.slaConfig = {
      maxDeprovisioningLatencyHours: config?.maxDeprovisioningLatencyHours ?? 4,
      alertOnPrivilegeDrift: config?.alertOnPrivilegeDrift ?? true,
    };
  }

  public evaluateUserSync(
    user: SCIMUserRecord,
    currentTimestampMs: number = Date.now()
  ): { state: AccountSyncState; alert?: RogueAccountAlert } {
    // Case 1: Suspended/Deleted in IdP but still active in SaaS
    if (user.suspendedInIdP && user.activeInSaaS) {
      const suspensionTime = user.suspendedAtTimestamp || currentTimestampMs;
      const hoursSinceSuspension = (currentTimestampMs - suspensionTime) / (1000 * 60 * 60);

      if (hoursSinceSuspension > this.slaConfig.maxDeprovisioningLatencyHours) {
        return {
          state: "DEPROVISION_SLA_BREACHED",
          alert: {
            userId: user.id,
            email: user.email,
            saasVendorId: "TARGET_SUBPROCESSOR",
            severity: "CRITICAL",
            reason: `Deprovisioning SLA breached: user suspended in IdP ${hoursSinceSuspension.toFixed(1)}h ago but remains active in sub-processor (Threshold: ${this.slaConfig.maxDeprovisioningLatencyHours}h).`,
            detectedAt: new Date(currentTimestampMs).toISOString(),
          },
        };
      } else {
        return { state: "PROVISIONED_PENDING_SYNC" };
      }
    }

    // Case 2: Active in SaaS without IdP suspension, but marked as orphan/rogue (no corporate email match)
    if (user.activeInSaaS && (!user.email || !user.email.includes("@"))) {
      return {
        state: "ORPHANED_ROGUE_ACCOUNT",
        alert: {
          userId: user.id,
          email: user.email || "unknown",
          saasVendorId: "TARGET_SUBPROCESSOR",
          severity: "HIGH",
          reason: "Active sub-processor account lacks valid corporate directory binding.",
          detectedAt: new Date(currentTimestampMs).toISOString(),
        },
      };
    }

    // Case 3: Compliantly deprovisioned
    if (user.suspendedInIdP && !user.activeInSaaS) {
      return { state: "DEPROVISIONED_COMPLIANT" };
    }

    // Case 4: Normal active synchronized account
    return { state: "ACTIVE_MATCHED" };
  }

  public auditSubprocessorDirectory(
    tenantId: string,
    saasVendorId: string,
    idpProvider: IdPProvider,
    users: SCIMUserRecord[],
    currentTimestampMs: number = Date.now()
  ): SCIMComplianceAuditReport {
    let activeMatched = 0;
    let rogueCount = 0;
    let breachCount = 0;
    const alerts: RogueAccountAlert[] = [];

    for (const user of users) {
      const { state, alert } = this.evaluateUserSync(user, currentTimestampMs);
      if (state === "ACTIVE_MATCHED") activeMatched++;
      if (state === "ORPHANED_ROGUE_ACCOUNT") rogueCount++;
      if (state === "DEPROVISION_SLA_BREACHED") breachCount++;

      if (alert) {
        alerts.push({ ...alert, saasVendorId });
      }
    }

    const isSoc2Compliant = rogueCount === 0 && breachCount === 0;

    const signaturePayload = `${tenantId}:${saasVendorId}:${idpProvider}:${users.length}:${isSoc2Compliant}:${breachCount}`;
    const auditHash = createHash("sha256").update(signaturePayload).digest("hex").slice(0, 24);

    return {
      tenantId,
      saasVendorId,
      idpProvider,
      totalEvaluatedUsers: users.length,
      activeMatchedUsers: activeMatched,
      rogueAccountsCount: rogueCount,
      deprovisioningBreachesCount: breachCount,
      isSoc2Compliant,
      alerts,
      auditHash: `AUDIT-SCIM-${auditHash.toUpperCase()}`,
      generatedAt: new Date(currentTimestampMs).toISOString(),
    };
  }
}
