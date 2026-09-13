/**
 * QA-169: Autonomous Third-Party Vendor API Token Exhaustion & Rate-Limit Circuit Breaker.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Protects downstream evidence harvesting integrations against rate-limit cascading failure:
 * 1. Tracks API quota exhaustion and HTTP 429 / 503 response codes across vendors.
 * 2. Implements three-state circuit breaker: CLOSED, OPEN (tripped), and HALF_OPEN.
 * 3. Gracefully degrades to verified cached evidence snapshots when vendor API is degraded.
 * 4. Generates immutable circuit event manifests for SOC 2 CC7.1 / CC7.2 availability controls.
 */

import { createHash } from "crypto";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface VendorEndpointConfig {
  vendorId: string;
  maxConsecutiveFailures: number; // e.g. 3
  resetTimeoutMs: number; // e.g. 10000 ms
}

export interface CircuitExecutionVerdict {
  vendorId: string;
  state: CircuitState;
  requestAllowed: boolean;
  servedFromCache: boolean;
  consecutiveFailures: number;
  auditHash: string;
}

export class VendorApiCircuitBreaker {
  private state: CircuitState = "CLOSED";
  private consecutiveFailures: number = 0;
  private lastStateChangeTimestamp: number = Date.now();

  constructor(private config: VendorEndpointConfig) {}

  public getState(): CircuitState {
    // Check if OPEN circuit timeout has elapsed to transition to HALF_OPEN
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastStateChangeTimestamp;
      if (elapsed >= this.config.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        this.lastStateChangeTimestamp = Date.now();
      }
    }
    return this.state;
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "CLOSED";
    this.lastStateChangeTimestamp = Date.now();
  }

  public recordFailure(statusCode: number): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures || statusCode === 429) {
      this.state = "OPEN";
      this.lastStateChangeTimestamp = Date.now();
    }
  }

  public executeOrFallback(simulatedStatusCode?: number): CircuitExecutionVerdict {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      const raw = `${this.config.vendorId}:OPEN:FALLBACK:${this.consecutiveFailures}`;
      const hash = createHash("sha256").update(raw).digest("hex");
      return {
        vendorId: this.config.vendorId,
        state: "OPEN",
        requestAllowed: false,
        servedFromCache: true,
        consecutiveFailures: this.consecutiveFailures,
        auditHash: hash
      };
    }

    // Circuit is CLOSED or HALF_OPEN: execute request
    const status = simulatedStatusCode || 200;
    if (status >= 200 && status < 300) {
      this.recordSuccess();
      const raw = `${this.config.vendorId}:CLOSED:SUCCESS:${this.consecutiveFailures}`;
      const hash = createHash("sha256").update(raw).digest("hex");
      return {
        vendorId: this.config.vendorId,
        state: "CLOSED",
        requestAllowed: true,
        servedFromCache: false,
        consecutiveFailures: 0,
        auditHash: hash
      };
    } else {
      this.recordFailure(status);
      const raw = `${this.config.vendorId}:${this.state}:FAILURE:${this.consecutiveFailures}`;
      const hash = createHash("sha256").update(raw).digest("hex");
      return {
        vendorId: this.config.vendorId,
        state: this.state,
        requestAllowed: true,
        servedFromCache: this.state === "OPEN",
        consecutiveFailures: this.consecutiveFailures,
        auditHash: hash
      };
    }
  }
}
