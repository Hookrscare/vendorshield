/**
 * QA-198: Zero-Trust Continuous Session Posture Re-Attestation & Dynamic Stepped-Up Auth Engine.
 * Part of VendorShield Continuous Compliance & Third-Party Risk SaaS.
 *
 * Implements continuous zero-trust session posture re-attestation:
 * - Real-time device health verification (EDR telemetry, disk encryption, OS patch status)
 * - Geo-velocity & impossible travel detection (km/h thresholding)
 * - Dynamic risk scoring determining stepped-up authentication (WebAuthn/FIDO2 hardware challenge or session revocation)
 * - Emits cryptographic SHA-256 session posture audit attestations.
 */

import { createHash } from "crypto";

export interface DeviceTelemetry {
  deviceId: string;
  edrAgentHealthy: boolean;
  diskEncryptionActive: boolean;
  osPatchDaysBehind: number;
}

export interface GeoLocationStamp {
  latitude: number;
  longitude: number;
  timestampEpochMs: number;
}

export interface SessionPostureInput {
  sessionId: string;
  userId: string;
  device: DeviceTelemetry;
  currentGeo: GeoLocationStamp;
  previousGeo?: GeoLocationStamp;
  sessionAgeMinutes: number;
  privilegeLevel: "STANDARD" | "ADMIN" | "SUPERADMIN";
}

export interface SessionPostureEvaluationResult {
  sessionId: string;
  userId: string;
  cumulativeRiskScore: number; // 0 (pristine) - 100 (critical threat)
  postureStatus: "HEALTHY" | "STEPPED_UP_AUTH_REQUIRED" | "IMMEDIATE_REVOCATION_REQUIRED";
  requiresWebAuthnChallenge: boolean;
  isSessionTerminated: boolean;
  riskFactors: string[];
  postureAttestationToken: string;
}

export class ZeroTrustSessionPostureReAttestor {
  // Speed of sound/commercial flight cap: 900 km/h
  public static readonly MAX_FEASIBLE_TRAVEL_SPEED_KMH = 950.0;

  public static evaluateSessionPosture(input: SessionPostureInput): SessionPostureEvaluationResult {
    if (!input.sessionId || !input.userId) {
      throw new Error("sessionId and userId are required.");
    }
    if (input.sessionAgeMinutes < 0) {
      throw new Error("sessionAgeMinutes cannot be negative.");
    }

    let riskScore = 0;
    const riskFactors: string[] = [];

    // 1. Device Security Checks
    if (!input.device.edrAgentHealthy) {
      riskScore += 45;
      riskFactors.push("EDR_AGENT_UNHEALTHY_OR_INACTIVE");
    }
    if (!input.device.diskEncryptionActive) {
      riskScore += 25;
      riskFactors.push("DEVICE_DISK_ENCRYPTION_DISABLED");
    }
    if (input.device.osPatchDaysBehind > 30) {
      riskScore += 20;
      riskFactors.push("OS_CRITICAL_PATCH_OUTDATED");
    }

    // 2. Impossible Travel / Geo-velocity analysis
    if (input.previousGeo) {
      const deltaHours = (input.currentGeo.timestampEpochMs - input.previousGeo.timestampEpochMs) / (1000 * 3600);
      if (deltaHours > 0) {
        const distanceKm = this.calculateHaversineDistanceKm(
          input.previousGeo.latitude,
          input.previousGeo.longitude,
          input.currentGeo.latitude,
          input.currentGeo.longitude
        );
        const speedKmh = distanceKm / deltaHours;
        if (speedKmh > this.MAX_FEASIBLE_TRAVEL_SPEED_KMH) {
          riskScore += 60;
          riskFactors.push(`IMPOSSIBLE_TRAVEL_DETECTED_${Math.round(speedKmh)}_KMH`);
        }
      }
    }

    // 3. Privilege creep & session age
    if (input.privilegeLevel === "SUPERADMIN" && input.sessionAgeMinutes > 240) {
      riskScore += 25;
      riskFactors.push("SUPERADMIN_SESSION_AGE_EXCEEDED");
    }

    // Cap score at 100
    riskScore = Math.min(100, Math.max(0, riskScore));

    let postureStatus: "HEALTHY" | "STEPPED_UP_AUTH_REQUIRED" | "IMMEDIATE_REVOCATION_REQUIRED" = "HEALTHY";
    let requiresWebAuthnChallenge = false;
    let isSessionTerminated = false;

    if (riskScore >= 75) {
      postureStatus = "IMMEDIATE_REVOCATION_REQUIRED";
      isSessionTerminated = true;
    } else if (riskScore >= 35) {
      postureStatus = "STEPPED_UP_AUTH_REQUIRED";
      requiresWebAuthnChallenge = true;
    }

    const digestRaw = `${input.sessionId}:${input.userId}:${riskScore}:${postureStatus}:${riskFactors.join(",")}`;
    const token = createHash("sha256").update(digestRaw).digest("hex");

    return {
      sessionId: input.sessionId,
      userId: input.userId,
      cumulativeRiskScore: riskScore,
      postureStatus,
      requiresWebAuthnChallenge,
      isSessionTerminated,
      riskFactors,
      postureAttestationToken: token
    };
  }

  private static calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
