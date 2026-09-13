/**
 * concrete-slab-rh-profiler.ts
 * SNAP-76: High-Precision Multi-Sensor Concrete Slab Relative Humidity Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Forensic Building Sciences.
 *
 * ASTM F2170 in-situ probe concrete moisture diagnostic engine:
 * 1. Validates depth placement criteria (40% depth for single-side drying, 20% for elevated pan deck).
 * 2. Enforces probe thermal and moisture equilibration hold periods (min 24h).
 * 3. Profiles internal slab RH vs flooring adhesive tolerance thresholds (typically <= 80-85%).
 * 4. Predicts adhesive emulsification and vapor blistering risk.
 */

export interface ConcreteProbeReading {
  probeId: string;
  slabThicknessInches: number;
  probeDepthInches: number;
  isElevatedPanDeck: boolean;       // Drying from bottom and top?
  equilibrationHours: number;       // Hours since probe sleeve sealed
  measuredInternalRhPercent: number; // e.g. 78.5%
  slabTempCelsius: number;
  adhesiveMaxToleranceRhPercent: number; // e.g. 80% or 85%
}

export interface SlabMoistureEvaluation {
  probeId: string;
  installationClearance: 'CLEARED_FOR_INSTALLATION' | 'EXCESS_MOISTURE_DELAMINATION_RISK' | 'HOLD_EQUILIBRATION_INCOMPLETE';
  depthRatioPercent: number;
  targetDepthRatioPercent: number;
  isDepthPlacementCompliant: boolean;
  moistureVaporSeverityIndex: number; // 0 - 100
  mitigationRecommendation: string;
}

export class ConcreteSlabRhProfiler {
  public static profileSlabMoisture(reading: ConcreteProbeReading): SlabMoistureEvaluation {
    const targetRatio = reading.isElevatedPanDeck ? 20.0 : 40.0;
    const actualRatio = Math.round((reading.probeDepthInches / reading.slabThicknessInches) * 1000) / 10;
    const isCompliant = Math.abs(actualRatio - targetRatio) <= 5.0;

    // 1. Check Equilibration Hold Time
    if (reading.equilibrationHours < 24.0) {
      return {
        probeId: reading.probeId,
        installationClearance: 'HOLD_EQUILIBRATION_INCOMPLETE',
        depthRatioPercent: actualRatio,
        targetDepthRatioPercent: targetRatio,
        isDepthPlacementCompliant: isCompliant,
        moistureVaporSeverityIndex: 50,
        mitigationRecommendation: `ASTM F2170 requires 24h equilibration before final reading. Probe has only soaked for ${reading.equilibrationHours}h.`
      };
    }

    // 2. Check RH against adhesive threshold
    const rh = reading.measuredInternalRhPercent;
    const limit = reading.adhesiveMaxToleranceRhPercent;

    if (rh > limit) {
      const severity = Math.min(100, Math.round(((rh - limit) / (100 - limit)) * 100 + 40));
      return {
        probeId: reading.probeId,
        installationClearance: 'EXCESS_MOISTURE_DELAMINATION_RISK',
        depthRatioPercent: actualRatio,
        targetDepthRatioPercent: targetRatio,
        isDepthPlacementCompliant: isCompliant,
        moistureVaporSeverityIndex: severity,
        mitigationRecommendation: `CRITICAL: Internal RH of ${rh}% exceeds adhesive limit (${limit}%). Apply epoxy moisture mitigation barrier prior to flooring installation.`
      };
    }

    return {
      probeId: reading.probeId,
      installationClearance: 'CLEARED_FOR_INSTALLATION',
      depthRatioPercent: actualRatio,
      targetDepthRatioPercent: targetRatio,
      isDepthPlacementCompliant: isCompliant,
      moistureVaporSeverityIndex: Math.round((rh / limit) * 35),
      mitigationRecommendation: `Subfloor RH (${rh}%) satisfies manufacturer adhesive requirements (${limit}%). Cleared for immediate vinyl/wood flooring installation.`
    };
  }
}
