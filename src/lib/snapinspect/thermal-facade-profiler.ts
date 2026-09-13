/**
 * thermal-facade-profiler.ts
 * SNAP-78: Thermal Drone Heat-Loss Facade Infiltration Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & 3D Point Cloud Diagnostics.
 *
 * Aerial infrared thermography building envelope diagnostics (ASTM C1060 / C1153):
 * 1. Analyzes radiometric surface temperatures against ambient exterior and interior temperatures.
 * 2. Computes dimensionless thermal index (I_T) and thermal delta anomalies.
 * 3. Identifies missing insulation, convective air infiltration, and structural thermal bridges.
 * 4. Outputs ASHRAE 90.1 energy envelope compliance and remedial punch-list items.
 */

export interface FacadeThermalProbe {
  locationId: string;
  surfaceTempC: number;
  outdoorAmbientTempC: number;
  indoorConditionedTempC: number;
  isWinterHeatingMode?: boolean; // Default true
}

export interface ThermalEnvelopeAudit {
  locationId: string;
  isCompliant: boolean;
  temperatureIndex: number;
  surfaceDeltaC: number;
  defectClassification: 'COMPLIANT_BUILDING_ENVELOPE' | 'THERMAL_BRIDGING_ANOMALY' | 'CRITICAL_AIR_INFILTRATION_LEAK' | 'MISSING_CAVITY_INSULATION';
  estimatedHeatLossSeverity: 'NEGLIGIBLE' | 'MODERATE' | 'SEVERE';
  remedialRecommendation: string;
}

export class ThermalFacadeProfiler {
  public static auditThermalProfile(probe: FacadeThermalProbe): ThermalEnvelopeAudit {
    const isHeating = probe.isWinterHeatingMode ?? true;
    const tSurf = probe.surfaceTempC;
    const tOut = probe.outdoorAmbientTempC;
    const tIn = probe.indoorConditionedTempC;

    const totalDelta = Math.abs(tIn - tOut);
    if (totalDelta < 5.0) {
      throw new Error("Insufficient thermal gradient (< 5°C delta T) for reliable ASTM C1060 infrared thermography.");
    }

    // Dimensionless temperature index I_T
    // During heating: higher exterior surface temp indicates heat escaping from interior
    const surfaceDelta = isHeating ? (tSurf - tOut) : (tSurf - tIn);
    const it = Math.round((surfaceDelta / totalDelta) * 100) / 100;

    let classification: ThermalEnvelopeAudit['defectClassification'] = 'COMPLIANT_BUILDING_ENVELOPE';
    let severity: ThermalEnvelopeAudit['estimatedHeatLossSeverity'] = 'NEGLIGIBLE';
    let recommendation = "Envelope insulation and air barrier satisfy thermal performance standards.";

    if (surfaceDelta >= 5.5) {
      // Massive thermal leakage: convective air breach or complete missing insulation
      classification = 'CRITICAL_AIR_INFILTRATION_LEAK';
      severity = 'SEVERE';
      recommendation = `CRITICAL: Major exterior heat plume (+${surfaceDelta.toFixed(1)}°C). Immediate inspection of window fenestration seals and air barriers required.`;
    } else if (surfaceDelta >= 3.5) {
      classification = 'MISSING_CAVITY_INSULATION';
      severity = 'SEVERE';
      recommendation = `Thermal anomaly (+${surfaceDelta.toFixed(1)}°C) suggests missing or slumped fiberglass/mineral wool cavity insulation. Bore-scope inspection recommended.`;
    } else if (surfaceDelta >= 2.0 || it >= 0.25) {
      classification = 'THERMAL_BRIDGING_ANOMALY';
      severity = 'MODERATE';
      recommendation = `Thermal bridging detected along structural slab edge/mullion (+${surfaceDelta.toFixed(1)}°C). Evaluate installation of exterior continuous insulation (ci).`;
    }

    return {
      locationId: probe.locationId,
      isCompliant: classification === 'COMPLIANT_BUILDING_ENVELOPE',
      temperatureIndex: it,
      surfaceDeltaC: Math.round(surfaceDelta * 10) / 10,
      defectClassification: classification,
      estimatedHeatLossSeverity: severity,
      remedialRecommendation: recommendation
    };
  }
}
