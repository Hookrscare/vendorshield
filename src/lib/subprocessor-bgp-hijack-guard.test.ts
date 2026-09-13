import { describe, it, expect } from 'vitest';
import {
  SubprocessorBgpHijackGuard,
  SubProcessorRoutingTelemetry
} from './subprocessor-bgp-hijack-guard';

describe('QA-190: Sub-Processor Continuous BGP Hijack Guard', () => {
  it('confirms secure verified BGP route under legitimate origin ASN', () => {
    const telemetry: SubProcessorRoutingTelemetry = {
      vendorId: 'vend_fastly_01',
      vendorName: 'Fastly CDN',
      ipPrefix: '151.101.0.0/16',
      advertisedOriginAsn: 54113,
      authorizedOriginAsn: 54113,
      rpkiStatus: 'VALID',
      asPath: [174, 3356, 54113],
      roundTripLatencyMs: 14.5,
      baselineLatencyMs: 12.0
    };

    const res = SubprocessorBgpHijackGuard.evaluateRouteHealth(telemetry);

    expect(res.isSafe).toBe(true);
    expect(res.threatLevel).toBe('NONE');
    expect(res.status).toBe('BGP_ROUTING_SECURE_VERIFIED');
  });

  it('triggers critical alert on RPKI invalid crypto failure', () => {
    const telemetry: SubProcessorRoutingTelemetry = {
      vendorId: 'vend_cloudflare_02',
      vendorName: 'Cloudflare Edge',
      ipPrefix: '104.16.0.0/12',
      advertisedOriginAsn: 13335,
      authorizedOriginAsn: 13335,
      rpkiStatus: 'INVALID', // Cryptographic ROA violation
      asPath: [1299, 13335],
      roundTripLatencyMs: 25.0,
      baselineLatencyMs: 20.0
    };

    const res = SubprocessorBgpHijackGuard.evaluateRouteHealth(telemetry);

    expect(res.isSafe).toBe(false);
    expect(res.threatLevel).toBe('CRITICAL');
    expect(res.status).toBe('CRITICAL_RPKI_INVALID_HIJACK_DETECTED');
    expect(res.securityAssessment).toContain('CRITICAL BGP HIJACK');
  });

  it('detects unauthorized origin ASN spoofing and route leak', () => {
    const telemetry: SubProcessorRoutingTelemetry = {
      vendorId: 'vend_stripe_03',
      vendorName: 'Stripe Payments',
      ipPrefix: '54.187.0.0/16',
      advertisedOriginAsn: 64512, // Rogue ASN claiming ownership
      authorizedOriginAsn: 16509, // Legitimate AWS / Stripe ASN
      rpkiStatus: 'VALID',
      asPath: [3356, 64512],
      roundTripLatencyMs: 40.0,
      baselineLatencyMs: 35.0
    };

    const res = SubprocessorBgpHijackGuard.evaluateRouteHealth(telemetry);

    expect(res.isSafe).toBe(false);
    expect(res.threatLevel).toBe('CRITICAL');
    expect(res.status).toBe('UNAUTHORIZED_ORIGIN_ASN_MISMATCH');
  });
});
