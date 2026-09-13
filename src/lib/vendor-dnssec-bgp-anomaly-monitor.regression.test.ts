/**
 * src/lib/vendor-dnssec-bgp-anomaly-monitor.regression.test.ts
 * Unit tests for QA-172: Automated Sub-Processor DNSSEC & BGP Route Hijacking Anomaly Monitor.
 */

import { describe, it, expect } from 'vitest';
import {
  VendorDnssecBgpAnomalyMonitor,
  DnssecValidationRecord,
  BgpRouteObservation
} from './vendor-dnssec-bgp-anomaly-monitor';

describe('QA-172: VendorDnssecBgpAnomalyMonitor', () => {
  const currentEpoch = 1760000000;

  it('verifies healthy posture for secure DNSSEC and valid RPKI BGP routes', () => {
    const dnssec: DnssecValidationRecord = {
      domain: 'auth.enterprise-subprocessor.com',
      hasDsRecord: true,
      dnskeyAlgorithm: 13, // ECDSA P-256
      rrsigExpirationEpochSeconds: currentEpoch + 86400 * 30, // 30 days valid
      isExpired: false,
      status: 'SECURE'
    };

    const bgp: BgpRouteObservation = {
      prefix: '198.51.100.0/24',
      originAsn: 13335,
      expectedOriginAsn: 13335,
      asPath: [174, 1299, 13335],
      expectedUpstreamAsns: [1299, 3356],
      rpkiStatus: 'VALID'
    };

    const assessment = VendorDnssecBgpAnomalyMonitor.evaluatePosture('VND-001', dnssec, bgp, currentEpoch);

    expect(assessment.hijackingRiskScore).toBe(0);
    expect(assessment.isTrafficInterceptionSuspected).toBe(false);
    expect(assessment.recommendedAction).toBe('MAINTAIN');
    expect(assessment.findings.length).toBe(0);
  });

  it('detects BGP RPKI invalid hijacking announcement and triggers circuit breaker', () => {
    const dnssec: DnssecValidationRecord = {
      domain: 'api.payment-gateway.io',
      hasDsRecord: true,
      dnskeyAlgorithm: 13,
      rrsigExpirationEpochSeconds: currentEpoch + 86400,
      isExpired: false,
      status: 'SECURE'
    };

    // Rogue ASN announcing prefix with RPKI invalid
    const bgp: BgpRouteObservation = {
      prefix: '203.0.113.0/24',
      originAsn: 64496, // Rogue ASN
      expectedOriginAsn: 15169,
      asPath: [701, 64496],
      expectedUpstreamAsns: [1299],
      rpkiStatus: 'INVALID'
    };

    const assessment = VendorDnssecBgpAnomalyMonitor.evaluatePosture('VND-PAY', dnssec, bgp, currentEpoch);

    expect(assessment.hijackingRiskScore).toBeGreaterThanOrEqual(80);
    expect(assessment.isTrafficInterceptionSuspected).toBe(true);
    expect(assessment.recommendedAction).toBe('TRIGGER_CIRCUIT_BREAKER');
    expect(assessment.findings.some(f => f.includes('CRITICAL_BGP_RPKI_INVALID'))).toBe(true);
  });

  it('identifies DNSSEC validation failure (BOGUS) and expired RRSIG signature', () => {
    const dnssec: DnssecValidationRecord = {
      domain: 'cloud-storage.vendor.net',
      hasDsRecord: true,
      dnskeyAlgorithm: 8,
      rrsigExpirationEpochSeconds: currentEpoch - 3600, // Expired 1 hour ago
      isExpired: false,
      status: 'BOGUS'
    };

    const bgp: BgpRouteObservation = {
      prefix: '192.0.2.0/24',
      originAsn: 16509,
      expectedOriginAsn: 16509,
      asPath: [3356, 16509],
      expectedUpstreamAsns: [3356],
      rpkiStatus: 'VALID'
    };

    const assessment = VendorDnssecBgpAnomalyMonitor.evaluatePosture('VND-S3', dnssec, bgp, currentEpoch);

    expect(assessment.dnssec.isExpired).toBe(true);
    expect(assessment.hijackingRiskScore).toBeGreaterThanOrEqual(45);
    expect(assessment.isTrafficInterceptionSuspected).toBe(true);
    expect(assessment.findings.some(f => f.includes('CRITICAL_DNSSEC_FAILURE'))).toBe(true);
  });
});
