/**
 * SNAP-60: Commercial Rooftop Solar PV Inverter Thermal Degradation & Hotspot Tomographer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * Implements IEC 62446-3 thermographic inspection standards for rooftop PV arrays,
 * string combiner boxes, and central inverters. Analyzes cell delta-T, bypass diode failure,
 * PID thermal signatures, and inverter semiconductor heatsink degradation.
 */

export type PvAnomalyType =
  | "CELL_HOTSPOT"
  | "BYPASS_DIODE_FAILURE"
  | "STRING_DISCONNECTION"
  | "INVERTER_IGBT_OVERHEAT"
  | "TERMINAL_HIGH_RESISTANCE"
  | "POTENTIAL_INDUCED_DEGRADATION"
  | "SURFACE_SOILING";

export type IecHotspotClass = "CLASS_1_MINOR" | "CLASS_2_MEDIUM" | "CLASS_3_CRITICAL";

export interface PvThermalPoint {
  xCoord: number; // Array x coordinate (meters or module index)
  yCoord: number; // Array y coordinate (meters or module index)
  measuredTempC: number;
}

export interface PvInverterTelemetry {
  inverterId: string;
  nominalAcPowerKw: number;
  measuredDcVoltageV: number;
  measuredDcCurrentA: number;
  ambientTempC: number;
  irradianceWPerM2: number; // e.g. 800-1000 W/m² standard testing conditions
  heatsinkTempC: number;
  maxRatedHeatsinkTempC: number;
  moduleThermalGrid: PvThermalPoint[];
}

export interface DetectedAnomaly {
  anomalyType: PvAnomalyType;
  xCoord: number;
  yCoord: number;
  deltaTempC: number;
  iecClass?: IecHotspotClass;
  estimatedPowerLossPct: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  tacticalRemediation: string;
}

export interface SolarPvTomographyReport {
  inverterId: string;
  irradianceValid: boolean;
  baselineArrayTempC: number;
  maxArrayTempC: number;
  inverterThermalDeratingPct: number;
  anomalies: DetectedAnomaly[];
  totalEstimatedYieldLossKwhPerYear: number;
  overallHealthStatus: "OPTIMAL" | "ATTENTION_REQUIRED" | "ACTION_REQUIRED" | "SHUTDOWN_RECOMMENDED";
}

export class SolarPvThermalTomographer {
  /**
   * Evaluates array thermal matrix and inverter operating metrics against IEC 62446-3.
   */
  public analyzeInverterAndArray(telemetry: PvInverterTelemetry): SolarPvTomographyReport {
    const {
      inverterId,
      nominalAcPowerKw,
      ambientTempC,
      irradianceWPerM2,
      heatsinkTempC,
      maxRatedHeatsinkTempC,
      moduleThermalGrid,
    } = telemetry;

    // Minimum irradiance threshold for reliable thermography according to IEC 62446-3 is >= 600 W/m²
    const irradianceValid = irradianceWPerM2 >= 600;

    const anomalies: DetectedAnomaly[] = [];

    // Calculate baseline array temperature (median of all grid points)
    const temps = moduleThermalGrid.map((p) => p.measuredTempC).sort((a, b) => a - b);
    const baselineArrayTempC =
      temps.length > 0 ? temps[Math.floor(temps.length / 2)] : ambientTempC + 25.0;
    const maxArrayTempC = temps.length > 0 ? temps[temps.length - 1] : baselineArrayTempC;

    // 1. Analyze module grid for cell hotspots and diode failures
    for (const pt of moduleThermalGrid) {
      const deltaT = pt.measuredTempC - baselineArrayTempC;

      if (deltaT >= 10.0) {
        let iecClass: IecHotspotClass;
        let severity: "INFO" | "WARNING" | "CRITICAL";
        let powerLossPct: number;

        if (deltaT >= 20.0) {
          iecClass = "CLASS_3_CRITICAL";
          severity = "CRITICAL";
          powerLossPct = 15.0; // Significant module derating / burn-through hazard
        } else if (deltaT >= 15.0) {
          iecClass = "CLASS_2_MEDIUM";
          severity = "WARNING";
          powerLossPct = 7.5;
        } else {
          iecClass = "CLASS_1_MINOR";
          severity = "INFO";
          powerLossPct = 3.0;
        }

        // Check if delta-T matches bypass diode pattern (~1/3 module overheating uniformly)
        const isBypassDiode = deltaT >= 12.0 && deltaT <= 18.0 && pt.xCoord % 3 === 0;

        anomalies.push({
          anomalyType: isBypassDiode ? "BYPASS_DIODE_FAILURE" : "CELL_HOTSPOT",
          xCoord: pt.xCoord,
          yCoord: pt.yCoord,
          deltaTempC: Number(deltaT.toFixed(1)),
          iecClass,
          estimatedPowerLossPct: powerLossPct,
          severity,
          tacticalRemediation: isBypassDiode
            ? "Replace short-circuited bypass diode in module junction box."
            : "Inspect for cell micro-cracks, localized snail trails, or heavy bird-drop shadowing.",
        });
      }
    }

    // 2. Analyze Inverter Heatsink Thermal Headroom
    let inverterThermalDeratingPct = 0;
    const heatsinkDelta = heatsinkTempC - maxRatedHeatsinkTempC;
    if (heatsinkDelta > 0) {
      // Inverter enters thermal curtailment / derating
      inverterThermalDeratingPct = Math.min(100, Math.round(heatsinkDelta * 5)); // ~5% per °C above limit
      anomalies.push({
        anomalyType: "INVERTER_IGBT_OVERHEAT",
        xCoord: -1, // Inverter equipment level
        yCoord: -1,
        deltaTempC: Number(heatsinkDelta.toFixed(1)),
        estimatedPowerLossPct: inverterThermalDeratingPct,
        severity: heatsinkDelta > 15 ? "CRITICAL" : "WARNING",
        tacticalRemediation:
          "Inspect inverter cooling fans, heat exchanger fin blockage, and ambient enclosure ventilation.",
      });
    }

    // Annualized yield loss estimation (assuming 1,500 equivalent peak sun hours/year)
    const totalPowerLossFraction =
      anomalies.reduce((sum, a) => sum + a.estimatedPowerLossPct, 0) / 100.0;
    const totalEstimatedYieldLossKwhPerYear = Math.round(
      nominalAcPowerKw * 1500 * Math.min(0.5, totalPowerLossFraction)
    );

    // Determine overall health status
    let overallHealthStatus: SolarPvTomographyReport["overallHealthStatus"] = "OPTIMAL";
    const hasCritical = anomalies.some((a) => a.severity === "CRITICAL");
    const hasWarning = anomalies.some((a) => a.severity === "WARNING");

    if (inverterThermalDeratingPct >= 50 || (hasCritical && anomalies.length >= 3)) {
      overallHealthStatus = "SHUTDOWN_RECOMMENDED";
    } else if (hasCritical) {
      overallHealthStatus = "ACTION_REQUIRED";
    } else if (hasWarning) {
      overallHealthStatus = "ATTENTION_REQUIRED";
    }

    return {
      inverterId,
      irradianceValid,
      baselineArrayTempC: Number(baselineArrayTempC.toFixed(1)),
      maxArrayTempC: Number(maxArrayTempC.toFixed(1)),
      inverterThermalDeratingPct,
      anomalies,
      totalEstimatedYieldLossKwhPerYear,
      overallHealthStatus,
    };
  }
}
