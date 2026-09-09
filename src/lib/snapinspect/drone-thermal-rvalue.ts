/**
 * SNAP-21: Drone Thermal Envelope Insulation R-Value Degradation Estimator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Computes apparent thermal resistance (R-value) from drone radiometric FLIR thermography,
 * models convective and radiative exterior surface heat flux (ASHRAE / ASTM C1153),
 * evaluates effective insulation degradation vs design nominal specifications,
 * and identifies moisture entrapment risks and annual energy loss penalties.
 */

export type EnvelopeComponentType =
  | "ATTIC_ROOF"
  | "EXTERIOR_WALL_WOOD_FRAME"
  | "EXTERIOR_WALL_MASONRY"
  | "COMMERCIAL_FLAT_ROOF"
  | "WINDOW_GLAZING";

export type DegradationSeverity = "NEGLIGIBLE" | "MODERATE" | "SIGNIFICANT" | "CRITICAL";

export interface DroneRadiometricInput {
  componentType: EnvelopeComponentType;
  nominalDesignRValueImperial: number; // e.g. R-38 for roof, R-20 for wall
  surfaceTempCelsius: number; // Measured external surface radiometric temp
  ambientOutdoorTempCelsius: number;
  interiorTempCelsius: number;
  windSpeedMetersPerSec?: number; // Drone anemometer reading, default 2.0 m/s
  surfaceEmissivity?: number; // Radiometric emissivity, default 0.90 for building materials
  relativeHumidityPct?: number; // For dew point calculation, default 50%
}

export interface HeatFluxComponents {
  convectiveCoeffHc: number; // W/(m²·K)
  radiativeCoeffHr: number; // W/(m²·K)
  totalSurfaceCoeffH: number; // W/(m²·K)
  heatFluxWattsPerSqMeter: number; // q (W/m²)
  heatFluxBtuPerHourSqFt: number; // q (BTU/(h·ft²))
}

export interface ThermalRValueAssessment {
  componentType: EnvelopeComponentType;
  nominalRValueImperial: number;
  effectiveRSI: number; // m²·K/W
  effectiveRValueImperial: number; // h·ft²·°F/BTU
  degradationPct: number;
  severity: DegradationSeverity;
  heatFlux: HeatFluxComponents;
  dewPointCelsius: number;
  moistureIntrusionRisk: boolean;
  estimatedAnnualEnergyLossKwhPerSqMeter: number;
  remediationRecommendation: string;
}

export class DroneThermalRValueEstimator {
  private static STEFAN_BOLTZMANN = 5.670374419e-8; // W/(m²·K⁴)

  /**
   * Calculates Dew Point in Celsius using the Magnus-Tetens formula.
   */
  public static calculateDewPoint(tempC: number, rhPct: number): number {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * tempC) / (b + tempC)) + Math.log(Math.max(1, Math.min(100, rhPct)) / 100);
    const dewPoint = (b * alpha) / (a - alpha);
    return Number(dewPoint.toFixed(1));
  }

  /**
   * Computes ASHRAE windward/leeward convective surface coefficient (hc)
   * hc = 5.7 + 3.8 * v (W/(m²·K))
   */
  public static calculateConvectiveCoeff(windSpeedMps: number): number {
    const hc = 5.7 + 3.8 * Math.max(0, windSpeedMps);
    return Number(hc.toFixed(2));
  }

  /**
   * Computes linearized radiative heat transfer coefficient (hr)
   * hr = 4 * epsilon * sigma * Tmean³
   */
  public static calculateRadiativeCoeff(surfaceTempC: number, ambientTempC: number, emissivity: number): number {
    const tSurfK = surfaceTempC + 273.15;
    const tAmbK = ambientTempC + 273.15;
    const tMeanK = (tSurfK + tAmbK) / 2;
    const hr = 4 * emissivity * this.STEFAN_BOLTZMANN * Math.pow(tMeanK, 3);
    return Number(hr.toFixed(2));
  }

  /**
   * Converts Metric RSI to Imperial R-Value (1 RSI ≈ 5.678263 h·ft²·°F/BTU)
   */
  public static rsiToImperial(rsi: number): number {
    return Number((rsi * 5.678263).toFixed(2));
  }

  /**
   * Converts Imperial R-Value to Metric RSI
   */
  public static imperialToRsi(rImperial: number): number {
    return Number((rImperial / 5.678263).toFixed(3));
  }

  /**
   * Assesses thermal envelope R-Value degradation and heat flux from drone radiometric thermography.
   */
  public static assessEnvelopeDegradation(input: DroneRadiometricInput): ThermalRValueAssessment {
    const windSpeed = input.windSpeedMetersPerSec ?? 2.0;
    const emissivity = input.surfaceEmissivity ?? 0.90;
    const rh = input.relativeHumidityPct ?? 50.0;

    const deltaTOverall = Math.abs(input.interiorTempCelsius - input.ambientOutdoorTempCelsius);
    const deltaTSurface = Math.abs(input.surfaceTempCelsius - input.ambientOutdoorTempCelsius);

    // Convective & Radiative heat transfer coefficients
    const hc = this.calculateConvectiveCoeff(windSpeed);
    const hr = this.calculateRadiativeCoeff(input.surfaceTempCelsius, input.ambientOutdoorTempCelsius, emissivity);
    const hTotal = Number((hc + hr).toFixed(2));

    // Heat flux q = hTotal * |Tsurf - Tamb|
    // Minimum boundary to prevent division by zero in perfect thermal equilibrium
    const qWattsPerSqMeter = Math.max(0.5, Number((hTotal * deltaTSurface).toFixed(2)));
    const qBtuPerHourSqFt = Number((qWattsPerSqMeter * 0.316998).toFixed(2));

    // Effective RSI = DeltaT_overall / q
    const safeDeltaT = Math.max(1.0, deltaTOverall);
    const effectiveRsi = Number((safeDeltaT / qWattsPerSqMeter).toFixed(3));
    const effectiveRImperial = this.rsiToImperial(effectiveRsi);

    // Calculate degradation percentage against nominal R-value
    const nominalR = Math.max(1.0, input.nominalDesignRValueImperial);
    const degradationRaw = ((nominalR - effectiveRImperial) / nominalR) * 100;
    const degradationPct = Number(Math.max(0, Math.min(100, degradationRaw)).toFixed(1));

    // Categorize severity
    let severity: DegradationSeverity = "NEGLIGIBLE";
    if (degradationPct >= 45) {
      severity = "CRITICAL";
    } else if (degradationPct >= 25) {
      severity = "SIGNIFICANT";
    } else if (degradationPct >= 10) {
      severity = "MODERATE";
    }

    // Check moisture condensation / wet insulation entrapment risk (ASTM C1153)
    const dewPoint = this.calculateDewPoint(input.ambientOutdoorTempCelsius, rh);
    // ASTM C1153: Elevated surface temperature anomalies during night radiational cooling
    // combined with significant degradation (>45%) and high ambient humidity (>65%) indicate wet insulation
    const moistureRisk =
      (degradationPct >= 45 && rh >= 65) ||
      Math.abs(input.surfaceTempCelsius - dewPoint) <= 3.0;

    // Estimate Annual Energy Loss in kWh/m² based on 2500 Heating/Cooling Degree Days (HDD/CDD)
    // Energy (kWh/m²) ≈ (HDD * 24) / (RSI * 1000)
    const baseDegreeDays = 2500;
    const annualEnergyLoss = Number(((baseDegreeDays * 24) / (effectiveRsi * 1000)).toFixed(1));

    // Recommendation
    let recommendation = "Envelope thermal resistance is within acceptable operating tolerance.";
    if (severity === "CRITICAL") {
      recommendation = moistureRisk
        ? "URGENT: Probable wet insulation or saturated substrate detected. Conduct core sample test and replace affected insulation batts."
        : "URGENT: Severe thermal bypass or missing insulation envelope detected. Re-insulate to design R-value specifications.";
    } else if (severity === "SIGNIFICANT") {
      recommendation = "Noticeable thermal bridging or settling identified. Apply continuous exterior insulation or dense-pack cellulose retrofit.";
    } else if (severity === "MODERATE") {
      recommendation = "Minor thermal anomalies observed. Re-inspect during subsequent seasonal heating/cooling cycle.";
    }

    return {
      componentType: input.componentType,
      nominalRValueImperial: nominalR,
      effectiveRSI: effectiveRsi,
      effectiveRValueImperial: effectiveRImperial,
      degradationPct,
      severity,
      heatFlux: {
        convectiveCoeffHc: hc,
        radiativeCoeffHr: hr,
        totalSurfaceCoeffH: hTotal,
        heatFluxWattsPerSqMeter: qWattsPerSqMeter,
        heatFluxBtuPerHourSqFt: qBtuPerHourSqFt,
      },
      dewPointCelsius: dewPoint,
      moistureIntrusionRisk: moistureRisk,
      estimatedAnnualEnergyLossKwhPerSqMeter: annualEnergyLoss,
      remediationRecommendation: recommendation,
    };
  }
}
