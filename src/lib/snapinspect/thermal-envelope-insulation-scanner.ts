/**
 * SNAP-34: Multi-Spectral Thermal Drone Building Envelope Insulation Loss Heatmap.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile AI.
 *
 * Implements ASTM C1060 Thermographic Inspection of Building Envelope Cavities.
 * Evaluates radiometric infrared surface temperatures, thermal bridges, and missing insulation.
 */

export interface ThermalZoneSample {
  zoneId: string;
  surfaceTempC: number;
  areaSqMeters: number;
}

export interface BuildingThermalParameters {
  indoorTempC: number;
  outdoorAmbientTempC: number;
  wallBaselineRValue?: number; // e.g. R-13, R-20 (hr·ft²·°F/Btu)
}

export interface InsulationAuditResult {
  isInspectionValid: boolean;
  temperatureDifferentialC: number;
  averageSurfaceTempC: number;
  heatLossSeverityScore: number; // 0 to 100
  thermalBridgeZones: string[];
  missingInsulationZones: string[];
  recommendations: string[];
}

export class ThermalEnvelopeInsulationScanner {
  // ASTM C1060 requires at least 10°C delta between interior and exterior
  public static readonly MIN_DELTA_T_CELSIUS = 10.0;

  public static auditEnvelope(
    samples: ThermalZoneSample[],
    params: BuildingThermalParameters
  ): InsulationAuditResult {
    const deltaT = Math.abs(params.indoorTempC - params.outdoorAmbientTempC);
    const isValid = deltaT >= this.MIN_DELTA_T_CELSIUS;

    if (samples.length === 0) {
      const recs: string[] = [];
      if (!isValid) {
        recs.push(
          `Delta T (${deltaT.toFixed(1)}°C) is below ASTM C1060 minimum threshold (${this.MIN_DELTA_T_CELSIUS}°C). Re-test during cooler weather.`
        );
      }
      recs.push("No thermal sample zones provided for analysis.");
      return {
        isInspectionValid: isValid,
        temperatureDifferentialC: Math.round(deltaT * 10) / 10,
        averageSurfaceTempC: 0,
        heatLossSeverityScore: 0,
        thermalBridgeZones: [],
        missingInsulationZones: [],
        recommendations: recs
      };
    }

    const totalTemp = samples.reduce((acc, s) => acc + s.surfaceTempC, 0);
    const avgSurfaceTemp = totalTemp / samples.length;

    const thermalBridges: string[] = [];
    const missingInsulation: string[] = [];

    // Heating condition: indoor > outdoor -> cold exterior spots or hot exterior spots?
    // Exterior aerial drone view:
    // When indoor > outdoor: Heat escaping causes exterior surface to be WARMER than ambient!
    const isHeatingSeason = params.indoorTempC > params.outdoorAmbientTempC;

    for (const sample of samples) {
      if (isHeatingSeason) {
        const tempExceedance = sample.surfaceTempC - params.outdoorAmbientTempC;
        if (tempExceedance >= deltaT * 0.40) {
          missingInsulation.push(sample.zoneId);
        } else if (tempExceedance >= deltaT * 0.20) {
          thermalBridges.push(sample.zoneId);
        }
      } else {
        // Cooling season: outdoor > indoor -> heat ingress makes interior hot or exterior cold
        const tempDeficit = params.outdoorAmbientTempC - sample.surfaceTempC;
        if (tempDeficit >= deltaT * 0.40) {
          missingInsulation.push(sample.zoneId);
        } else if (tempDeficit >= deltaT * 0.20) {
          thermalBridges.push(sample.zoneId);
        }
      }
    }

    // Severity calculation
    const lossPercentage = (missingInsulation.length * 2 + thermalBridges.length) / (samples.length * 2);
    const severityScore = Math.min(100, Math.round(lossPercentage * 100));

    const recommendations: string[] = [];
    if (!isValid) {
      recommendations.push(
        `Delta T (${deltaT.toFixed(1)}°C) is below ASTM C1060 minimum threshold (${this.MIN_DELTA_T_CELSIUS}°C). Re-test during cooler weather.`
      );
    }
    if (missingInsulation.length > 0) {
      recommendations.push(`Detected ${missingInsulation.length} zones with severe insulation voids requiring cavity reinsulation.`);
    }
    if (thermalBridges.length > 0) {
      recommendations.push(`Detected ${thermalBridges.length} thermal bridges at structural framing junctions.`);
    }
    if (recommendations.length === 0) {
      recommendations.push("Building envelope demonstrates continuous thermal barrier integrity.");
    }

    return {
      isInspectionValid: isValid,
      temperatureDifferentialC: Math.round(deltaT * 10) / 10,
      averageSurfaceTempC: Math.round(avgSurfaceTemp * 10) / 10,
      heatLossSeverityScore: severityScore,
      thermalBridgeZones: thermalBridges,
      missingInsulationZones: missingInsulation,
      recommendations
    };
  }
}
