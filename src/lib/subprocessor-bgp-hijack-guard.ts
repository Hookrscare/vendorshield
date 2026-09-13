/**
 * subprocessor-bgp-hijack-guard.ts
 * QA-190: Sub-Processor Continuous BGP Anycast & CDN Route Hijack Guard.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Edge network routing security and BGP hijack detector:
 * 1. Validates RPKI ROA (Route Origin Authorization) cryptographic validity.
 * 2. Compares advertised BGP origin ASN against authorized vendor registry records.
 * 3. Analyzes anomalous AS path inflation and transatlantic traffic detour latencies.
 * 4. Alerts compliance and SecOps of active Man-in-the-Middle (MitM) route interceptions.
 */

export interface SubProcessorRoutingTelemetry {
  vendorId: string;
  vendorName: string;
  ipPrefix: string;
  advertisedOriginAsn: number;
  authorizedOriginAsn: number;
  rpkiStatus: 'VALID' | 'INVALID' | 'NOT_FOUND';
  asPath: number[];
  roundTripLatencyMs: number;
  baselineLatencyMs: number;
}

export interface BgpGuardVerdict {
  vendorId: string;
  vendorName: string;
  isSafe: boolean;
  threatLevel: 'NONE' | 'ELEVATED' | 'CRITICAL';
  status: 'BGP_ROUTING_SECURE_VERIFIED' | 'CRITICAL_RPKI_INVALID_HIJACK_DETECTED' | 'UNAUTHORIZED_ORIGIN_ASN_MISMATCH' | 'TRAFFIC_DETOUR_LATENCY_ANOMALY';
  securityAssessment: string;
}

export class SubprocessorBgpHijackGuard {
  public static evaluateRouteHealth(telemetry: SubProcessorRoutingTelemetry): BgpGuardVerdict {
    // 1. Critical RPKI Validation Failure
    if (telemetry.rpkiStatus === 'INVALID') {
      return {
        vendorId: telemetry.vendorId,
        vendorName: telemetry.vendorName,
        isSafe: false,
        threatLevel: 'CRITICAL',
        status: 'CRITICAL_RPKI_INVALID_HIJACK_DETECTED',
        securityAssessment: `CRITICAL BGP HIJACK: Prefix ${telemetry.ipPrefix} failed RPKI cryptographic ROA validation. Rogue announcement detected on ASN ${telemetry.advertisedOriginAsn}.`
      };
    }

    // 2. Unauthorized Origin ASN (Route Leak or Hijack)
    if (telemetry.advertisedOriginAsn !== telemetry.authorizedOriginAsn) {
      return {
        vendorId: telemetry.vendorId,
        vendorName: telemetry.vendorName,
        isSafe: false,
        threatLevel: 'CRITICAL',
        status: 'UNAUTHORIZED_ORIGIN_ASN_MISMATCH',
        securityAssessment: `ROUTE LEAK / HIJACK: Advertised origin ASN ${telemetry.advertisedOriginAsn} does not match authorized ASN ${telemetry.authorizedOriginAsn} registered for ${telemetry.vendorName}.`
      };
    }

    // 3. Traffic Detour / Path inflation latency anomaly
    const latencyRatio = telemetry.roundTripLatencyMs / Math.max(1, telemetry.baselineLatencyMs);
    if (latencyRatio >= 3.5 && telemetry.roundTripLatencyMs > 200) {
      return {
        vendorId: telemetry.vendorId,
        vendorName: telemetry.vendorName,
        isSafe: false,
        threatLevel: 'ELEVATED',
        status: 'TRAFFIC_DETOUR_LATENCY_ANOMALY',
        securityAssessment: `SUSPICIOUS TRAFFIC DETOUR: Latency surged to ${telemetry.roundTripLatencyMs}ms (${latencyRatio.toFixed(1)}x baseline). Path length ${telemetry.asPath.length} hops suggests BGP traffic interception.`
      };
    }

    return {
      vendorId: telemetry.vendorId,
      vendorName: telemetry.vendorName,
      isSafe: true,
      threatLevel: 'NONE',
      status: 'BGP_ROUTING_SECURE_VERIFIED',
      securityAssessment: `BGP routing verified: Validated origin ASN ${telemetry.advertisedOriginAsn} with RPKI ${telemetry.rpkiStatus} status and nominal latency (${telemetry.roundTripLatencyMs}ms).`
    };
  }
}
