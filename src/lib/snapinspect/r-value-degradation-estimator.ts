/**
 * SNAP-21: Drone Thermal Envelope Insulation R-Value Degradation Estimator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Thermal Suite.
 * Adheres to ASTM C1060 / C1153 & ISO 6781-3 thermal envelope inspection standards.
 * Calculates effective measured R-value from infrared aerial Delta-T, evaluates moisture
 * saturation degradation, and projects annual HVAC thermal energy loss penalties.
 */

export type AssemblyType =
  | "ATTIC_BLOWN_FIBERGLASS"
  | "EXTERIOR_WALL_BATT"
  | "ROOF_POLYISO_BOARD"
  | "BASEMENT_RIM_JOIST";

export interface ThermalEnvelopeInspection {
  assemblyId: string;
  assemblyType: AssemblyType;
  areaSquareFeet: number;
  nominalDesignRValue: number; // e.g. R-38 for attic, R-15 for walls
  indoorTempF: number;
  outdoorTempF: number;
  surfaceTempF: number;
  moistureSaturationRatio: number; // 0.0 (bone dry) to 1.0 (saturated)
  convectiveFilmCoefficient?: number; // default ~1.46 BTU/(h*ft^2*degF)
}

export interface RValueDegradationAssessment {
  assemblyId: string;
  nominalDesignRValue: number;
  effectiveMeasuredRValue: number;
  degradationPercentage: number;
  thermalHealthRating: "OPTIMAL_RETENTION" | "MODERATE_DEGRADATION" | "SEVERE_INSULATION_COLLAPSE";
  heatFluxBtuPerHrSqFt: number;
  annualEnergyLossKwh: number;
  annualCostPenaltyUsd: number;
  recommendedAction: string;
}

export class RValueDegradationEstimator {
  public static evaluateAssembly(
    spec: ThermalEnvelopeInspection,
    kwhCostUsd: number = 0.16
  ): RValueDegradationAssessment {
    const deltaTOverall = Math.abs(spec.indoorTempF - spec.outdoorTempF);
    if (deltaTOverall < 5.0) {
      throw new Error("Delta-T between indoor and outdoor must be >= 5.0 degF for reliable thermography.");
    }

    const hc = spec.convectiveFilmCoefficient ?? 1.46; // standard exterior surface film coefficient
    const deltaTSurface = Math.abs(spec.surfaceTempF - spec.outdoorTempF);

    // Heat flux q (BTU/hr*ft^2)
    const rawHeatFlux = Math.max(0.1, hc * deltaTSurface);

    // Effective measured R-value: R_meas = deltaTOverall / q
    let measuredR = deltaTOverall / rawHeatFlux;

    // Moisture penalty factor: moisture in insulation dramatically elevates thermal conductivity k
    // 20% moisture can reduce R-value by 45%, 50%+ moisture reduces R-value by up to 75%
    if (spec.moistureSaturationRatio > 0.05) {
      const moistureLossFactor = Math.min(0.85, spec.moistureSaturationRatio * 1.5);
      measuredR = measuredR * (1.0 - moistureLossFactor);
    }

    measuredR = Math.max(1.0, Math.round(measuredR * 10) / 10);
    const nominalR = spec.nominalDesignRValue;

    const degradation = Math.max(0.0, Math.round(((nominalR - measuredR) / nominalR) * 1000) / 10);

    let healthRating: RValueDegradationAssessment["thermalHealthRating"] = "OPTIMAL_RETENTION";
    let recommendedAction = "Insulation assembly maintains specified thermal barrier performance.";

    if (degradation >= 50.0 || spec.moistureSaturationRatio >= 0.3) {
      healthRating = "SEVERE_INSULATION_COLLAPSE";
      recommendedAction = "Immediate core sampling, moisture barrier remediation, and insulation replacement required.";
    } else if (degradation >= 20.0) {
      healthRating = "MODERATE_DEGRADATION";
      recommendedAction = "Inspect for air infiltration thermal bypasses or settling; schedule top-up blown insulation.";
    }

    // Annual energy loss calculation:
    // Annual heating/cooling degree days approx 4500 HDD/CDD -> 108,000 degF*hours
    const degreeHours = 108000;
    const additionalBtuLossPerSqFt = Math.max(0, (1 / measuredR - 1 / nominalR) * degreeHours);
    const totalAdditionalBtu = additionalBtuLossPerSqFt * spec.areaSquareFeet;

    // 1 kWh = 3412.14 BTU
    const annualEnergyLossKwh = Math.round(totalAdditionalBtu / 3412.14);
    const annualCostPenaltyUsd = Math.round(annualEnergyLossKwh * kwhCostUsd);

    return {
      assemblyId: spec.assemblyId,
      nominalDesignRValue: nominalR,
      effectiveMeasuredRValue: measuredR,
      degradationPercentage: degradation,
      thermalHealthRating: healthRating,
      heatFluxBtuPerHrSqFt: Math.round(rawHeatFlux * 100) / 100,
      annualEnergyLossKwh,
      annualCostPenaltyUsd,
      recommendedAction
    };
  }
}
