/**
 * QA-171: Multi-Region Vendor Sub-Processor High-Availability Regional Failover Evaluator
 * 
 * Evaluates real-time multi-region vendor sub-processor availability metrics, enforces GDPR / SOC 2
 * data residency boundaries during regional outage events, and computes compliant failover routing.
 */

export interface SubProcessorRegionHealth {
  regionId: string;
  geographicJurisdiction: 'EU' | 'US' | 'APAC' | 'GLOBAL';
  latencyMs: number;
  errorRatePct: number;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  isAvailable: boolean;
}

export interface DataResidencyPolicy {
  policyId: string;
  allowedJurisdictions: ('EU' | 'US' | 'APAC' | 'GLOBAL')[];
  maxAcceptableLatencyMs: number;
  maxAcceptableErrorRatePct: number;
}

export interface FailoverDecision {
  primaryRegionId: string;
  isFailoverTriggered: boolean;
  selectedTargetRegionId: string | null;
  failoverReason: string;
  isDataResidencyCompliant: boolean;
  activeJurisdiction: string;
}

export class VendorSubProcessorRegionalFailoverEvaluator {
  /**
   * Evaluates regional telemetry against data sovereignty policies and routes traffic.
   */
  public evaluateRegionalRouting(
    primaryRegion: SubProcessorRegionHealth,
    availableStandbyRegions: SubProcessorRegionHealth[],
    policy: DataResidencyPolicy
  ): FailoverDecision {
    // Check if primary is degraded or unavailable
    const isPrimaryDegraded =
      !primaryRegion.isAvailable ||
      primaryRegion.circuitState === 'OPEN' ||
      primaryRegion.errorRatePct > policy.maxAcceptableErrorRatePct ||
      primaryRegion.latencyMs > policy.maxAcceptableLatencyMs;

    if (!isPrimaryDegraded) {
      return {
        primaryRegionId: primaryRegion.regionId,
        isFailoverTriggered: false,
        selectedTargetRegionId: primaryRegion.regionId,
        failoverReason: 'Primary region operating within nominal SLA and compliance thresholds.',
        isDataResidencyCompliant: policy.allowedJurisdictions.includes(primaryRegion.geographicJurisdiction),
        activeJurisdiction: primaryRegion.geographicJurisdiction,
      };
    }

    // Filter standby regions by allowed data residency jurisdictions
    const sovereignStandbys = availableStandbyRegions.filter((r) =>
      policy.allowedJurisdictions.includes(r.geographicJurisdiction)
    );

    if (sovereignStandbys.length === 0) {
      return {
        primaryRegionId: primaryRegion.regionId,
        isFailoverTriggered: true,
        selectedTargetRegionId: null,
        failoverReason: 'Primary degraded, but NO failover regions satisfy GDPR/Sovereignty jurisdiction policy.',
        isDataResidencyCompliant: false,
        activeJurisdiction: 'NONE',
      };
    }

    // Filter by health and availability
    const healthyStandbys = sovereignStandbys.filter(
      (r) =>
        r.isAvailable &&
        r.circuitState !== 'OPEN' &&
        r.errorRatePct <= policy.maxAcceptableErrorRatePct
    );

    if (healthyStandbys.length === 0) {
      return {
        primaryRegionId: primaryRegion.regionId,
        isFailoverTriggered: true,
        selectedTargetRegionId: null,
        failoverReason: 'All compliant standby regions are currently degraded or offline.',
        isDataResidencyCompliant: true,
        activeJurisdiction: 'NONE',
      };
    }

    // Sort by lowest latency
    healthyStandbys.sort((a, b) => a.latencyMs - b.latencyMs);
    const bestTarget = healthyStandbys[0];

    return {
      primaryRegionId: primaryRegion.regionId,
      isFailoverTriggered: true,
      selectedTargetRegionId: bestTarget.regionId,
      failoverReason: `Primary region degraded (Error: ${primaryRegion.errorRatePct}%, Latency: ${primaryRegion.latencyMs}ms). Routed to ${bestTarget.regionId}.`,
      isDataResidencyCompliant: true,
      activeJurisdiction: bestTarget.geographicJurisdiction,
    };
  }
}
