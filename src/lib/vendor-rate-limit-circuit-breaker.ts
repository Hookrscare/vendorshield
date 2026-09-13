/**
 * QA-169: Autonomous Third-Party Vendor API Token Exhaustion & Rate-Limit Circuit Breaker
 * 
 * Protects downstream enterprise integrations against sub-processor rate-limit cascade (HTTP 429)
 * and token quota exhaustion through stateful circuit-breaking and automated failover routing.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface VendorCircuitConfig {
  vendorId: string;
  failureThreshold: number;       // Number of consecutive 429/failures to trip circuit
  cooldownPeriodMs: number;       // Time in OPEN state before transitioning to HALF_OPEN
  fallbackVendorId?: string;      // Alternative sub-processor route
}

export interface CircuitBreakerTelemetry {
  vendorId: string;
  state: CircuitState;
  consecutiveFailures: number;
  totalTrips: number;
  lastStateChangeTimestamp: number;
  activeRoutedVendorId: string;
}

export class VendorRateLimitCircuitBreaker {
  private config: VendorCircuitConfig;
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures: number = 0;
  private totalTrips: number = 0;
  private lastStateChangeTimestamp: number = Date.now();

  constructor(config: VendorCircuitConfig) {
    this.config = config;
  }

  public getState(): CircuitState {
    return this.state;
  }

  public getTelemetry(): CircuitBreakerTelemetry {
    return {
      vendorId: this.config.vendorId,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      totalTrips: this.totalTrips,
      lastStateChangeTimestamp: this.lastStateChangeTimestamp,
      activeRoutedVendorId: this.state === 'OPEN' && this.config.fallbackVendorId ? this.config.fallbackVendorId : this.config.vendorId,
    };
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('CLOSED');
      this.consecutiveFailures = 0;
    } else if (this.state === 'CLOSED') {
      this.consecutiveFailures = 0;
    }
  }

  public recordFailure(httpStatusCode: number, nowMs: number = Date.now()): void {
    const isRateLimitOrExhaustion = httpStatusCode === 429 || httpStatusCode === 503;
    if (!isRateLimitOrExhaustion) return;

    this.consecutiveFailures++;

    if (this.state === 'CLOSED' && this.consecutiveFailures >= this.config.failureThreshold) {
      this.transitionTo('OPEN', nowMs);
      this.totalTrips++;
    } else if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN', nowMs);
    }
  }

  public canExecute(nowMs: number = Date.now()): { allowed: boolean; routedVendorId: string } {
    if (this.state === 'OPEN') {
      if (nowMs - this.lastStateChangeTimestamp >= this.config.cooldownPeriodMs) {
        this.transitionTo('HALF_OPEN', nowMs);
        return { allowed: true, routedVendorId: this.config.vendorId };
      }
      // If fallback vendor is configured, allow request routed to fallback
      if (this.config.fallbackVendorId) {
        return { allowed: true, routedVendorId: this.config.fallbackVendorId };
      }
      return { allowed: false, routedVendorId: this.config.vendorId };
    }

    return { allowed: true, routedVendorId: this.config.vendorId };
  }

  private transitionTo(newState: CircuitState, nowMs: number = Date.now()): void {
    this.state = newState;
    this.lastStateChangeTimestamp = nowMs;
  }
}
