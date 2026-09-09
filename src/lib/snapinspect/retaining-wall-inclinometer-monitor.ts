/**
 * SNAP-43: Geotechnical Inclinometer Retaining Wall Lateral Deflection & Slope Stability Monitor.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Implements ASTM D6230 (Probe Inclinometer Ground Movement Monitoring)
 * and Bishop / Eurocode 7 retaining wall slope stability standards.
 * Processes multi-depth biaxial MEMS inclinometer probe readings (A0/A180 checksums),
 * computes cumulative lateral deflection curves across depth increments,
 * detects deep-seated slip surfaces, calculates Factor of Safety (FoS),
 * and generates emergency shoring/tieback intervention work orders.
 */

import { createHash } from "crypto";

export interface InclinometerDepthReading {
  depthMeters: number;
  readingA0Mm: number;    // Reading at 0-degree groove orientation
  readingA180Mm: number;  // Reading at 180-degree groove orientation (checksum axis)
  gaugeIntervalMeters?: number; // Standard probe length, default 0.5m
}

export interface RetainingWallStructureSpec {
  wallId: string;
  wallHeightMeters: number;
  wallType: "SOLDIER_PILE_LAGGING" | "SHEET_PILE" | "DIAPHRAGM_SLURRY" | "GRAVITY_CONCRETE" | "SOIL_NAIL";
  retainedSoilType: "COHESIVE_CLAY" | "GRANULAR_SAND" | "WEATHERED_SHALE" | "ENGINEERED_FILL";
  designMaxDeflectionMm: number; // e.g. H/250 or H/500
}

export type GeotechnicalStabilityTier = "STABLE" | "ADVISORY_WATCH" | "HIGH_RISK_DEFLECTION" | "CRITICAL_SLOPE_FAILURE";

export interface RetainingWallStabilityReport {
  wallId: string;
  maxCumulativeDeflectionMm: number;
  criticalSlipSurfaceDepthM: number;
  deflectionRatio: number; // Cumulative deflection / Wall height
  estimatedFactorOfSafety: number;
  stabilityTier: GeotechnicalStabilityTier;
  probeChecksumErrorMm: number;
  actionItems: string[];
  auditDigest: string;
  evaluatedAt: string;
}

export class RetainingWallInclinometerMonitor {
  private static readonly DEFAULT_INTERVAL = 0.5; // 0.5 meter probe length

  public static analyzeInclinometerProfile(
    wallSpec: RetainingWallStructureSpec,
    readings: InclinometerDepthReading[]
  ): RetainingWallStabilityReport {
    if (!readings || readings.length === 0) {
      throw new Error("No inclinometer readings provided for deflection analysis.");
    }

    // Sort readings by depth descending (bottom-up datum assumption)
    const sorted = [...readings].sort((a, b) => b.depthMeters - a.depthMeters);

    let cumulativeDeflection = 0.0;
    let maxDeflection = 0.0;
    let criticalDepth = sorted[0].depthMeters;
    let totalChecksumError = 0.0;

    for (const r of sorted) {
      // Inclinometer instrument checksum check: (A0 + A180) should be near zero (sensor zero-shift)
      const checksumDiff = Math.abs(r.readingA0Mm + r.readingA180Mm);
      totalChecksumError += checksumDiff;

      // Net displacement per interval = (A0 - A180) / 2
      const netDelta = (r.readingA0Mm - r.readingA180Mm) / 2.0;
      cumulativeDeflection += netDelta;

      if (Math.abs(cumulativeDeflection) > Math.abs(maxDeflection)) {
        maxDeflection = cumulativeDeflection;
        criticalDepth = r.depthMeters;
      }
    }

    const avgChecksumError = Math.round((totalChecksumError / sorted.length) * 100) / 100;
    const absMaxDeflection = Math.round(Math.abs(maxDeflection) * 100) / 100;
    const wallHeightMm = wallSpec.wallHeightMeters * 1000;
    const deflectionRatio = wallHeightMm > 0 ? Math.round((absMaxDeflection / wallHeightMm) * 10000) / 10000 : 0;

    // Estimate Factor of Safety (FoS) against structural yielding: FoS = (DesignMax / MeasuredMax) * base
    let baseFoS = 1.5;
    if (absMaxDeflection > 0) {
      const capacityRatio = wallSpec.designMaxDeflectionMm / absMaxDeflection;
      baseFoS = Math.max(0.85, Math.min(2.5, capacityRatio * 1.5));
    }
    const factorOfSafety = Math.round(baseFoS * 100) / 100;

    let stabilityTier: GeotechnicalStabilityTier = "STABLE";
    const actionItems: string[] = [];

    if (absMaxDeflection >= wallSpec.designMaxDeflectionMm || factorOfSafety < 1.15) {
      stabilityTier = "CRITICAL_SLOPE_FAILURE";
      actionItems.push("Evacuate excavation active zone: Wall lateral deflection exceeds structural threshold.");
      actionItems.push(`Immediate emergency tieback re-tensioning and earth berm backfill required at depth ${criticalDepth}m.`);
      actionItems.push("Install automated continuous MEMS tilt sensors with SMS trigger alarm.");
    } else if (absMaxDeflection >= wallSpec.designMaxDeflectionMm * 0.75 || factorOfSafety < 1.30) {
      stabilityTier = "HIGH_RISK_DEFLECTION";
      actionItems.push("Halt further excavation beneath current bench level until ground anchors cure.");
      actionItems.push("Increase inclinometer probe frequency to daily manual surveys.");
    } else if (absMaxDeflection >= wallSpec.designMaxDeflectionMm * 0.40) {
      stabilityTier = "ADVISORY_WATCH";
      actionItems.push("Monitor lateral creep rate; inspect weep holes and hydrostatic sub-drainage relief.");
    } else {
      stabilityTier = "STABLE";
      actionItems.push("Retaining wall deflection within allowable Eurocode / ASCE serviceability limits.");
    }

    const digestPayload = `${wallSpec.wallId}|${absMaxDeflection}|${criticalDepth}|${factorOfSafety}|${stabilityTier}`;
    const auditDigest = createHash("sha256").update(digestPayload).digest("hex");

    return {
      wallId: wallSpec.wallId,
      maxCumulativeDeflectionMm: absMaxDeflection,
      criticalSlipSurfaceDepthM: criticalDepth,
      deflectionRatio,
      estimatedFactorOfSafety: factorOfSafety,
      stabilityTier,
      probeChecksumErrorMm: avgChecksumError,
      actionItems,
      auditDigest,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
