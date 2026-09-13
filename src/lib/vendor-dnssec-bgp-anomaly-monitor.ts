/**
 * src/lib/vendor-dnssec-bgp-anomaly-monitor.ts
 * QA-172: Automated Sub-Processor DNSSEC & BGP Route Hijacking Anomaly Monitor.
 *
 * Part of VendorShield SOC 2 Type II & ISO 27001 continuous vendor risk telemetry.
 * Monitors third-party sub-processor authoritative DNS records and BGP routing health:
 * - DNSSEC signature chain integrity (DS, DNSKEY, RRSIG validity, algorithm deprecation)
 * - BGP Route Origin Authorization (RPKI ROA validation: VALID, INVALID, NOT_FOUND)
 * - AS-Path deviation anomalies and rogue transit provider detection
 * - Automated threat severity scoring and traffic diversion risk flags
 */

export type DnssecStatus = 'SECURE' | 'INSECURE' | 'BOGUS' | 'INDETERMINATE';
export type RpkiStatus = 'VALID' | 'INVALID' | 'NOT_FOUND';

export interface DnssecValidationRecord {
  domain: string;
  hasDsRecord: boolean;
  dnskeyAlgorithm: number; // e.g. 13 (ECDSA P-256), 15 (Ed25519), 8 (RSA/SHA-256)
  rrsigExpirationEpochSeconds: number;
  isExpired: boolean;
  status: DnssecStatus;
}

export interface BgpRouteObservation {
  prefix: string; // e.g. "198.51.100.0/24"
  originAsn: number;
  expectedOriginAsn: number;
  asPath: number[];
  expectedUpstreamAsns: number[];
  rpkiStatus: RpkiStatus;
}

export interface VendorNetworkPostureAssessment {
  vendorId: string;
  dnssec: DnssecValidationRecord;
  bgp: BgpRouteObservation;
  hijackingRiskScore: number; // 0 (pristine) - 100 (critical risk)
  isTrafficInterceptionSuspected: boolean;
  findings: string[];
  recommendedAction: 'MAINTAIN' | 'WARN_VENDOR' | 'TRIGGER_CIRCUIT_BREAKER';
}

export class VendorDnssecBgpAnomalyMonitor {
  /**
   * Assesses sub-processor DNSSEC chain-of-trust and BGP route integrity.
   */
  public static evaluatePosture(
    vendorId: string,
    dnssec: DnssecValidationRecord,
    bgp: BgpRouteObservation,
    currentTimeEpochSeconds: number = Math.floor(Date.now() / 1000)
  ): VendorNetworkPostureAssessment {
    const findings: string[] = [];
    let riskScore = 0;

    // 1. DNSSEC Validation
    const isExpired = dnssec.rrsigExpirationEpochSeconds < currentTimeEpochSeconds;
    if (dnssec.status === 'BOGUS' || isExpired) {
      riskScore += 45;
      findings.push(
        `CRITICAL_DNSSEC_FAILURE: Domain ${dnssec.domain} returned status ${dnssec.status}${isExpired ? ' (RRSIG expired)' : ''}. Potential DNS cache poisoning or tampering.`
      );
    } else if (dnssec.status === 'INSECURE' || !dnssec.hasDsRecord) {
      riskScore += 20;
      findings.push(`WARN_DNSSEC_MISSING: Domain ${dnssec.domain} does not publish verified DS parent records.`);
    }

    // Deprecated DNSSEC algorithm check (MD5=1, SHA1=3,5,7)
    if ([1, 3, 5, 7].includes(dnssec.dnskeyAlgorithm)) {
      riskScore += 15;
      findings.push(`WARN_WEAK_DNSSEC_ALGO: Algorithm ${dnssec.dnskeyAlgorithm} is cryptographically deprecated.`);
    }

    // 2. BGP RPKI Route Origin Authorization
    if (bgp.rpkiStatus === 'INVALID') {
      riskScore += 50;
      findings.push(
        `CRITICAL_BGP_RPKI_INVALID: Prefix ${bgp.prefix} announced by ASN ${bgp.originAsn} violates RPKI ROA policy (Expected ASN: ${bgp.expectedOriginAsn}). Possible BGP route hijacking.`
      );
    } else if (bgp.rpkiStatus === 'NOT_FOUND') {
      riskScore += 10;
      findings.push(`INFO_RPKI_NOT_FOUND: Prefix ${bgp.prefix} lacks cryptographic RPKI ROA registration.`);
    }

    // 3. Origin ASN Mismatch
    if (bgp.originAsn !== bgp.expectedOriginAsn) {
      riskScore += 35;
      findings.push(
        `CRITICAL_ASN_ORIGIN_MISMATCH: Origin ASN ${bgp.originAsn} does not match expected vendor ASN ${bgp.expectedOriginAsn}.`
      );
    }

    // 4. Rogue Upstream AS-Path Deviation
    if (bgp.asPath.length > 0 && bgp.expectedUpstreamAsns.length > 0) {
      const immediateUpstream = bgp.asPath[bgp.asPath.length - 2];
      if (immediateUpstream && !bgp.expectedUpstreamAsns.includes(immediateUpstream)) {
        riskScore += 25;
        findings.push(
          `WARN_UNEXPECTED_TRANSIT_AS: Upstream AS ${immediateUpstream} not in verified vendor transit peering list.`
        );
      }
    }

    // Cap risk score at 100
    riskScore = Math.min(100, riskScore);

    const isTrafficInterceptionSuspected =
      bgp.rpkiStatus === 'INVALID' ||
      dnssec.status === 'BOGUS' ||
      bgp.originAsn !== bgp.expectedOriginAsn ||
      riskScore >= 70;

    let recommendedAction: 'MAINTAIN' | 'WARN_VENDOR' | 'TRIGGER_CIRCUIT_BREAKER' = 'MAINTAIN';
    if (isTrafficInterceptionSuspected || riskScore >= 75) {
      recommendedAction = 'TRIGGER_CIRCUIT_BREAKER';
    } else if (riskScore >= 25) {
      recommendedAction = 'WARN_VENDOR';
    }

    return {
      vendorId,
      dnssec: {
        ...dnssec,
        isExpired
      },
      bgp,
      hijackingRiskScore: riskScore,
      isTrafficInterceptionSuspected,
      findings,
      recommendedAction
    };
  }
}
