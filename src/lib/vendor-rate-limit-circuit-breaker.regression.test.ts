import { describe, it, expect } from 'vitest';
import {
  VendorRateLimitCircuitBreaker,
  VendorCircuitConfig,
} from './vendor-rate-limit-circuit-breaker';

describe('QA-169: VendorRateLimitCircuitBreaker Regression Tests', () => {
  const baseConfig: VendorCircuitConfig = {
    vendorId: 'openai-primary',
    failureThreshold: 3,
    cooldownPeriodMs: 5000,
    fallbackVendorId: 'anthropic-fallback',
  };

  it('remains CLOSED and routes to primary under normal conditions', () => {
    const breaker = new VendorRateLimitCircuitBreaker(baseConfig);
    expect(breaker.getState()).toBe('CLOSED');
    const check = breaker.canExecute();
    expect(check.allowed).toBe(true);
    expect(check.routedVendorId).toBe('openai-primary');
  });

  it('trips to OPEN after threshold 429 errors and diverts traffic to fallback vendor', () => {
    const breaker = new VendorRateLimitCircuitBreaker(baseConfig);
    const now = 100000;

    breaker.recordFailure(429, now);
    breaker.recordFailure(429, now);
    expect(breaker.getState()).toBe('CLOSED');

    breaker.recordFailure(429, now);
    expect(breaker.getState()).toBe('OPEN');

    const check = breaker.canExecute(now + 1000);
    expect(check.allowed).toBe(true);
    expect(check.routedVendorId).toBe('anthropic-fallback');
    expect(breaker.getTelemetry().totalTrips).toBe(1);
  });

  it('transitions to HALF_OPEN after cooldown and recovers to CLOSED upon successful probe', () => {
    const breaker = new VendorRateLimitCircuitBreaker(baseConfig);
    const start = 100000;

    // Trip the circuit
    breaker.recordFailure(429, start);
    breaker.recordFailure(429, start);
    breaker.recordFailure(429, start);
    expect(breaker.getState()).toBe('OPEN');

    // After cooldown
    const probeTime = start + 5001;
    const probeCheck = breaker.canExecute(probeTime);
    expect(breaker.getState()).toBe('HALF_OPEN');
    expect(probeCheck.allowed).toBe(true);
    expect(probeCheck.routedVendorId).toBe('openai-primary');

    // Successful probe restores CLOSED state
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.getTelemetry().consecutiveFailures).toBe(0);
  });
});
