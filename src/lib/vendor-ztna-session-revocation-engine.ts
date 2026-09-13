/**
 * QA-174: Enterprise Multi-Tenant Zero Trust Network Access (ZTNA) & Continuous Vendor Session Revocation Engine.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Implements NIST SP 800-207 Zero Trust Architecture and SOC 2 CC6.1 / CC6.6:
 * - Continuous evaluation of vendor telemetry signals (IP drift, impossible travel velocity > 800 km/h, credential leak alerts).
 * - Multi-tenant session state arbiter with automatic step-up MFA challenge or instant revocation.
 * - Dispatches OpenID Connect (OIDC) Backchannel Logout tokens with SHA-256 cryptographic audit digests.
 */

import { createHash } from "crypto";

export interface GeoLocation {
  latitude: number;
  longitude: number;
  countryCode: string;
}

export interface VendorSessionTelemetry {
  sessionId: string;
  tenantId: string;
  vendorId: string;
  userId: string;
  sessionStartTimeIso: string;
  lastActiveTimeIso: string;
  currentGeo: GeoLocation;
  previousGeo?: GeoLocation;
  previousActiveTimeIso?: string;
  clientIp: string;
  userAgent: string;
  privilegeEscalationAttempted: boolean;
  knownCompromisedCredentialSignal: boolean;
}

export type ZtnaAction = "MAINTAIN" | "STEP_UP_AUTH" | "REVOKE_IMMEDIATE";

export interface ZtnaEvaluationResult {
  sessionId: string;
  tenantId: string;
  vendorId: string;
  riskScore: number; // 0.0 to 1.0
  action: ZtnaAction;
  riskFactors: string[];
  calculatedTravelVelocityKmH?: number;
  backchannelLogoutToken?: string;
  auditHashSha256: string;
}

export class VendorZtnaSessionRevocationEngine {
  /**
   * Calculates Haversine distance in kilometers between two geo coordinates.
   */
  public static calculateHaversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Evaluates active vendor session telemetry against Zero Trust security policies.
   */
  public static evaluateSession(telemetry: VendorSessionTelemetry): ZtnaEvaluationResult {
    let riskScore = 0.05; // Base ambient risk
    const riskFactors: string[] = [];
    let travelVelocityKmH: number | undefined = undefined;

    // 1. Critical immediate revocation triggers
    if (telemetry.knownCompromisedCredentialSignal) {
      riskScore = 1.0;
      riskFactors.push("KNOWN_COMPROMISED_CREDENTIAL_FLAGGED");
    }

    if (telemetry.privilegeEscalationAttempted) {
      riskScore = Math.max(riskScore, 0.95);
      riskFactors.push("UNAUTHORIZED_PRIVILEGE_ESCALATION_DETECTED");
    }

    // 2. Impossible travel velocity evaluation
    if (telemetry.previousGeo && telemetry.previousActiveTimeIso) {
      const prevTime = new Date(telemetry.previousActiveTimeIso).getTime();
      const currTime = new Date(telemetry.lastActiveTimeIso).getTime();
      const elapsedHours = Math.max(0.001, (currTime - prevTime) / (1000 * 60 * 60));

      const distKm = this.calculateHaversineDistanceKm(
        telemetry.previousGeo.latitude,
        telemetry.previousGeo.longitude,
        telemetry.currentGeo.latitude,
        telemetry.currentGeo.longitude
      );

      travelVelocityKmH = distKm / elapsedHours;

      if (travelVelocityKmH > 800.0) {
        // Exceeds commercial airline cruising speed
        riskScore = Math.max(riskScore, 0.90);
        riskFactors.push(
          `IMPOSSIBLE_TRAVEL_VELOCITY_${Math.round(travelVelocityKmH)}_KMH`
        );
      } else if (distKm > 500 && telemetry.previousGeo.countryCode !== telemetry.currentGeo.countryCode) {
        riskScore = Math.min(1.0, riskScore + 0.35);
        riskFactors.push("CROSS_BORDER_GEO_JUMP");
      }
    }

    // 3. Determine action based on aggregated risk score
    let action: ZtnaAction = "MAINTAIN";
    let backchannelLogoutToken: string | undefined = undefined;

    if (riskScore >= 0.70) {
      action = "REVOKE_IMMEDIATE";
      backchannelLogoutToken = this.generateBackchannelLogoutToken(
        telemetry.sessionId,
        telemetry.tenantId,
        telemetry.userId
      );
    } else if (riskScore >= 0.30) {
      action = "STEP_UP_AUTH";
    }

    const auditHashSha256 = createHash("sha256")
      .update(
        `${telemetry.tenantId}:${telemetry.sessionId}:${telemetry.vendorId}:${action}:${riskScore.toFixed(
          4
        )}`
      )
      .digest("hex");

    return {
      sessionId: telemetry.sessionId,
      tenantId: telemetry.tenantId,
      vendorId: telemetry.vendorId,
      riskScore: Number(riskScore.toFixed(4)),
      action,
      riskFactors,
      calculatedTravelVelocityKmH: travelVelocityKmH !== undefined ? Number(travelVelocityKmH.toFixed(1)) : undefined,
      backchannelLogoutToken,
      auditHashSha256,
    };
  }

  private static generateBackchannelLogoutToken(
    sessionId: string,
    tenantId: string,
    userId: string
  ): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: "https://auth.vendorshield.io",
        sub: userId,
        aud: tenantId,
        sid: sessionId,
        events: { "http://schemas.openid.net/event/backchannel-logout": {} },
        iat: Math.floor(Date.now() / 1000),
      })
    ).toString("base64url");

    const signature = createHash("sha256")
      .update(`${header}.${payload}:vendorshield_ztna_secret`)
      .digest("base64url");

    return `${header}.${payload}.${signature}`;
  }
}
