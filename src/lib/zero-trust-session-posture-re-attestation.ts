/**
 * zero-trust-session-posture-re-attestation.ts
 * QA-198: Zero-Trust Continuous Session Posture Re-Attestation & Dynamic Stepped-Up Auth Engine.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Implements NIST SP 800-207 continuous adaptive session posture evaluation,
 * detecting impossible travel, device integrity degradation, and triggering stepped-up WebAuthn auth.
 */

import { createHmac, createHash } from 'crypto';

export interface DevicePostureTelemetry {
  isDiskEncrypted: boolean;
  isEdrAgentHealthy: boolean;
  isOsPatched: boolean;
  isSecureBootEnabled: boolean;
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  ipAddress: string;
  isKnownProxyOrTor: boolean;
  latitude: number;
  longitude: number;
  timestampEpochMs: number;
  devicePosture: DevicePostureTelemetry;
}

export interface PreviousSessionSnapshot {
  ipAddress: string;
  latitude: number;
  longitude: number;
  timestampEpochMs: number;
}

export interface PostureAttestationResult {
  sessionId: string;
  userId: string;
  compositeRiskScore: number; // 0 (pristine) to 100 (critical threat)
  postureStatus: 'SESSION_POSTURE_VALID_CONTINUE' | 'STEP_UP_AUTH_REQUIRED' | 'SESSION_TERMINATED_IMMEDIATE_QUARANTINE';
  reasons: string[];
  steppedUpAuthToken?: string;
  attestationSignature: string;
}

export class ZeroTrustSessionPostureReAttestationEngine {
  private static readonly SIGNING_KEY = 'vs_zero_trust_posture_signing_secret_2026';

  /**
   * Evaluates session context against previous snapshot and device health signals.
   */
  public static evaluateSessionPosture(
    current: SessionContext,
    previous?: PreviousSessionSnapshot
  ): PostureAttestationResult {
    let riskScore = 0;
    const reasons: string[] = [];

    // 1. Device Posture Evaluation
    if (!current.devicePosture.isDiskEncrypted) {
      riskScore += 25;
      reasons.push('DEVICE_UNENCRYPTED_STORAGE');
    }
    if (!current.devicePosture.isEdrAgentHealthy) {
      riskScore += 35;
      reasons.push('EDR_AGENT_UNHEALTHY_OR_DISABLED');
    }
    if (!current.devicePosture.isOsPatched) {
      riskScore += 15;
      reasons.push('OUTDATED_OS_VULNERABILITY');
    }
    if (!current.devicePosture.isSecureBootEnabled) {
      riskScore += 20;
      reasons.push('SECURE_BOOT_DISABLED');
    }

    // 2. Network & Anomaly Signals
    if (current.isKnownProxyOrTor) {
      riskScore += 45;
      reasons.push('ANONYMOUS_PROXY_OR_TOR_EXIT_NODE');
    }

    // 3. Impossible Travel Anomaly Detection
    if (previous && previous.timestampEpochMs < current.timestampEpochMs) {
      const timeDeltaHours = (current.timestampEpochMs - previous.timestampEpochMs) / 3600000.0;
      const distanceKm = this.haversineDistanceKm(
        previous.latitude,
        previous.longitude,
        current.latitude,
        current.longitude
      );

      // Max commercial air travel velocity threshold ~ 900 km/h
      const speedKmH = timeDeltaHours > 0.001 ? distanceKm / timeDeltaHours : 0;
      if (speedKmH > 900.0 && distanceKm > 300.0) {
        riskScore += 50;
        reasons.push(`IMPOSSIBLE_TRAVEL_DETECTED_${Math.round(speedKmH)}KMH`);
      }
    }

    // Clamp score to 100
    const compositeRiskScore = Math.min(100, riskScore);

    // 4. Determine Posture Status
    let postureStatus: PostureAttestationResult['postureStatus'] = 'SESSION_POSTURE_VALID_CONTINUE';
    let steppedUpAuthToken: string | undefined = undefined;

    if (compositeRiskScore >= 75 || current.isKnownProxyOrTor && !current.devicePosture.isEdrAgentHealthy) {
      postureStatus = 'SESSION_TERMINATED_IMMEDIATE_QUARANTINE';
    } else if (compositeRiskScore >= 35) {
      postureStatus = 'STEP_UP_AUTH_REQUIRED';
      steppedUpAuthToken = createHmac('sha256', this.SIGNING_KEY)
        .update(`STEP_UP:${current.sessionId}:${current.userId}:${current.timestampEpochMs}`)
        .digest('hex');
    }

    // Generate cryptographic attestation signature
    const payload = `${current.sessionId}:${current.userId}:${compositeRiskScore}:${postureStatus}:${current.timestampEpochMs}`;
    const attestationSignature = createHmac('sha256', this.SIGNING_KEY)
      .update(payload)
      .digest('hex');

    return {
      sessionId: current.sessionId,
      userId: current.userId,
      compositeRiskScore,
      postureStatus,
      reasons,
      steppedUpAuthToken,
      attestationSignature,
    };
  }

  private static haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // Earth radius km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
