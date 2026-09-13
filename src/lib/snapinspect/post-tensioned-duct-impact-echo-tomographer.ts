/**
 * SNAP-56: Post-Tensioned Concrete Tendon Duct Grout Void Impact-Echo Tomographer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile NDE Suite.
 *
 * Implements ASTM C1383 Impact-Echo resonance frequency analysis to detect
 * grout voids in post-tensioned (PT) concrete tendon ducts:
 * - Apparent P-wave thickness resonance: f = (beta * Cp) / (2 * H)
 * - Frequency shift & acoustic impedance mismatch detection over hollow vs grouted ducts
 * - Tendon duct void classification: FULLY_GROUTED, PARTIAL_BLEED_VOID, EXTENSIVE_UNGROUTED, STRAND_EXPOSED
 * - Grout cavity volume estimation for remediation injection
 * - Structural integrity and corrosion vulnerability scoring
 */

export interface ConcreteProperties {
  pWaveVelocityMps: number; // typical 3800 - 4500 m/s
  slabThicknessM: number;    // nominal member depth (e.g. 0.35 m)
  shapeCorrectionBeta?: number; // default 0.96 for large slabs
}

export interface TendonDuctGeometry {
  ductId: string;
  ductDiameterMm: number; // e.g., 75 mm to 120 mm
  coverDepthM: number;    // concrete cover to top of duct, e.g. 0.12 m
  lengthM: number;        // duct segment length, e.g. 15.0 m
  material: "GALVANIZED_STEEL" | "HIGH_DENSITY_POLYETHYLENE";
}

export interface ImpactEchoProbeReading {
  stationOffsetM: number; // linear station along tendon axis
  dominantFrequencyKhz: number;
  secondaryPeakKhz?: number;
  spectralAmplitudeDb: number;
}

export interface DuctStationEvaluation {
  stationOffsetM: number;
  expectedSolidResonanceKhz: number;
  measuredFrequencyKhz: number;
  frequencyShiftPercent: number;
  voidDetected: boolean;
  estimatedReflectorDepthM: number;
  status: "FULLY_GROUTED" | "PARTIAL_BLEED_VOID" | "EXTENSIVE_UNGROUTED" | "STRAND_EXPOSED";
}

export interface TendonInspectionReport {
  ductId: string;
  totalStationsChecked: number;
  voidStationsCount: number;
  voidPercentage: number;
  estimatedRemedialGroutVolumeLiters: number;
  maxVoidContinuousLengthM: number;
  structuralRiskRating: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  stationEvaluations: DuctStationEvaluation[];
}

export class PostTensionedDuctImpactEchoTomographer {
  private concrete: ConcreteProperties;
  private duct: TendonDuctGeometry;

  constructor(concrete: ConcreteProperties, duct: TendonDuctGeometry) {
    this.concrete = {
      ...concrete,
      shapeCorrectionBeta: concrete.shapeCorrectionBeta ?? 0.96,
    };
    this.duct = duct;
  }

  /**
   * Calculates theoretical ASTM C1383 solid plate thickness resonance (kHz).
   * f = (beta * Cp) / (2 * H)
   */
  public calculateNominalSolidResonanceKhz(): number {
    const beta = this.concrete.shapeCorrectionBeta!;
    const cp = this.concrete.pWaveVelocityMps;
    const h = this.concrete.slabThicknessM;
    const freqHz = (beta * cp) / (2 * h);
    return Number((freqHz / 1000).toFixed(2));
  }

  /**
   * Calculates apparent depth of an acoustic reflector from observed frequency.
   * d = (beta * Cp) / (2 * f)
   */
  public calculateApparentReflectorDepthM(frequencyKhz: number): number {
    if (frequencyKhz <= 0) return 0;
    const beta = this.concrete.shapeCorrectionBeta!;
    const cp = this.concrete.pWaveVelocityMps;
    const freqHz = frequencyKhz * 1000;
    const depth = (beta * cp) / (2 * freqHz);
    return Number(depth.toFixed(3));
  }

  /**
   * Evaluates a single impact-echo probe reading taken directly over the tendon duct.
   */
  public evaluateStation(reading: ImpactEchoProbeReading): DuctStationEvaluation {
    const solidFreqKhz = this.calculateNominalSolidResonanceKhz();
    const measuredFreqKhz = reading.dominantFrequencyKhz;
    const reflectorDepthM = this.calculateApparentReflectorDepthM(measuredFreqKhz);

    // If there is an air void in the duct, the acoustic wave reflects early from the duct boundary,
    // causing a higher resonance frequency corresponding to the cover depth rather than full slab thickness.
    const freqShiftPercent = ((measuredFreqKhz - solidFreqKhz) / solidFreqKhz) * 100;

    let voidDetected = false;
    let status: DuctStationEvaluation["status"] = "FULLY_GROUTED";

    // Expected depth to top of duct
    const ductTopDepth = this.duct.coverDepthM;
    const ductBottomDepth = this.duct.coverDepthM + this.duct.ductDiameterMm / 1000;

    // A shift > 25% towards duct depth indicates a void reflection
    if (freqShiftPercent > 20) {
      voidDetected = true;
      if (Math.abs(reflectorDepthM - ductTopDepth) <= 0.04) {
        status = "EXTENSIVE_UNGROUTED";
      } else if (reflectorDepthM > ductTopDepth && reflectorDepthM < ductBottomDepth) {
        status = "PARTIAL_BLEED_VOID";
      } else {
        status = "PARTIAL_BLEED_VOID";
      }

      // If high amplitude high-frequency resonance matches the bare steel strands
      if (reading.spectralAmplitudeDb > 45 && freqShiftPercent > 60) {
        status = "STRAND_EXPOSED";
      }
    }

    return {
      stationOffsetM: reading.stationOffsetM,
      expectedSolidResonanceKhz: solidFreqKhz,
      measuredFrequencyKhz: measuredFreqKhz,
      frequencyShiftPercent: Number(freqShiftPercent.toFixed(1)),
      voidDetected,
      estimatedReflectorDepthM: reflectorDepthM,
      status,
    };
  }

  /**
   * Analyzes an entire scanline of probe readings along the tendon duct length.
   */
  public generateTendonReport(readings: ImpactEchoProbeReading[]): TendonInspectionReport {
    if (readings.length === 0) {
      return {
        ductId: this.duct.ductId,
        totalStationsChecked: 0,
        voidStationsCount: 0,
        voidPercentage: 0,
        estimatedRemedialGroutVolumeLiters: 0,
        maxVoidContinuousLengthM: 0,
        structuralRiskRating: "LOW",
        stationEvaluations: [],
      };
    }

    const evaluations = readings.map((r) => this.evaluateStation(r));
    const voidStations = evaluations.filter((e) => e.voidDetected);
    const voidPercentage = Number(((voidStations.length / evaluations.length) * 100).toFixed(1));

    // Calculate maximum continuous void length
    let maxVoidLength = 0;
    let currentVoidSpan = 0;
    const sorted = [...evaluations].sort((a, b) => a.stationOffsetM - b.stationOffsetM);

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].voidDetected) {
        const step = i > 0 ? sorted[i].stationOffsetM - sorted[i - 1].stationOffsetM : 0.5;
        currentVoidSpan += step > 0 ? step : 0.5;
        if (currentVoidSpan > maxVoidLength) {
          maxVoidLength = currentVoidSpan;
        }
      } else {
        currentVoidSpan = 0;
      }
    }

    // Estimate remedial grout volume:
    // Void volume = (PI * (ductRadius)^2) * voidLength * voidFillFactor
    const ductRadiusM = this.duct.ductDiameterMm / 2000;
    const ductAreaM2 = Math.PI * Math.pow(ductRadiusM, 2);
    
    // Average station spacing or segment proportion
    const stationSpacing = this.duct.lengthM / evaluations.length;
    let estimatedVoidM3 = 0;

    for (const v of voidStations) {
      let voidFillFactor = 0.5; // partial bleed void
      if (v.status === "EXTENSIVE_UNGROUTED" || v.status === "STRAND_EXPOSED") {
        voidFillFactor = 0.85; // 85% cross-section voided (strands take up ~15%)
      }
      estimatedVoidM3 += ductAreaM2 * stationSpacing * voidFillFactor;
    }

    const estimatedGroutLiters = Number((estimatedVoidM3 * 1000).toFixed(2));

    let riskRating: TendonInspectionReport["structuralRiskRating"] = "LOW";
    if (voidPercentage >= 35 || maxVoidLength >= 2.0 || evaluations.some((e) => e.status === "STRAND_EXPOSED")) {
      riskRating = "CRITICAL";
    } else if (voidPercentage >= 15 || maxVoidLength >= 1.0) {
      riskRating = "HIGH";
    } else if (voidPercentage > 0) {
      riskRating = "MODERATE";
    }

    return {
      ductId: this.duct.ductId,
      totalStationsChecked: evaluations.length,
      voidStationsCount: voidStations.length,
      voidPercentage,
      estimatedRemedialGroutVolumeLiters: estimatedGroutLiters,
      maxVoidContinuousLengthM: Number(maxVoidLength.toFixed(2)),
      structuralRiskRating: riskRating,
      stationEvaluations: evaluations,
    };
  }
}
