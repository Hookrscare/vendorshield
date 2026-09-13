/**
 * SNAP-48: Ultrasonic Pulse Velocity (UPV) Concrete Internal Void & Crack Depth Triangulator
 * 
 * Implements non-destructive testing (NDT) analysis adhering to ASTM C597 and BS 1881-203.
 * Analyzes electro-acoustic transducer pulse transit times across direct, semi-direct,
 * and indirect surface propagation pathways to detect internal honeycombing, void voids,
 * and calculate crack depths.
 */

export type TransmissionMode = 'DIRECT' | 'SEMI_DIRECT' | 'INDIRECT';

export type ConcreteQualityRating = 'EXCELLENT' | 'GOOD' | 'MEDIUM' | 'DOUBTFUL';

export interface UpvMeasurement {
  sensorPairId: string;
  mode: TransmissionMode;
  pathLengthMm: number; // distance in mm
  transitTimeUs: number; // transit time in microseconds
  temperatureC?: number;
}

export interface UpvVelocityAnalysis {
  velocityKmS: number; // km/s
  qualityRating: ConcreteQualityRating;
  isVoidSuspected: boolean; // velocity reduction > 15% from solid reference
  estimatedCompressiveStrengthMpa: number;
}

export interface CrackDepthEstimate {
  crackId: string;
  surfaceDistanceMm: number; // spacing x from crack
  directTransitTimeUs: number;
  indirectTransitTimeUs: number;
  calculatedDepthMm: number;
  confidence: number;
}

export class UPVConcreteVoidTriangulator {
  private readonly baselineVelocityKmS: number;

  constructor(baselineVelocityKmS: number = 4.2) {
    this.baselineVelocityKmS = baselineVelocityKmS;
  }

  /**
   * Computes pulse velocity V = d / t (km/s) and classifies concrete quality.
   */
  public analyzeVelocity(measurement: UpvMeasurement): UpvVelocityAnalysis {
    if (measurement.transitTimeUs <= 0) {
      throw new Error('Transit time must be strictly positive.');
    }
    if (measurement.pathLengthMm <= 0) {
      throw new Error('Path length must be strictly positive.');
    }

    // Velocity in km/s: (mm / 1,000,000 km) / (us / 1,000,000 s) = mm / us / 1,000 = (d / t)
    const velocityKmS = measurement.pathLengthMm / measurement.transitTimeUs;

    let qualityRating: ConcreteQualityRating;
    if (velocityKmS >= 4.5) {
      qualityRating = 'EXCELLENT';
    } else if (velocityKmS >= 3.5) {
      qualityRating = 'GOOD';
    } else if (velocityKmS >= 3.0) {
      qualityRating = 'MEDIUM';
    } else {
      qualityRating = 'DOUBTFUL';
    }

    // Void suspected if velocity drops > 15% below baseline reference
    const velocityDropRatio = (this.baselineVelocityKmS - velocityKmS) / this.baselineVelocityKmS;
    const isVoidSuspected = velocityDropRatio >= 0.15;

    // Empirical exponential estimate of compressive strength (BS 1881-203 proxy)
    // fc ≈ 1.15 * exp(0.85 * V)
    const estimatedCompressiveStrengthMpa = Math.min(80, Math.max(10, 1.15 * Math.exp(0.85 * velocityKmS)));

    return {
      velocityKmS: Number(velocityKmS.toFixed(3)),
      qualityRating,
      isVoidSuspected,
      estimatedCompressiveStrengthMpa: Number(estimatedCompressiveStrengthMpa.toFixed(1)),
    };
  }

  /**
   * Calculates surface crack depth according to BS 1881-203 indirect method:
   * h = x * sqrt((tc / ts)^2 - 1)
   * where:
   * x = distance from transducer to crack
   * ts = transit time along uncracked concrete for distance 2x
   * tc = transit time across the crack for distance 2x
   */
  public calculateCrackDepth(
    crackId: string,
    xMm: number,
    uncrackedTransitTimeUs: number,
    crackedTransitTimeUs: number
  ): CrackDepthEstimate {
    if (crackedTransitTimeUs <= uncrackedTransitTimeUs) {
      return {
        crackId,
        surfaceDistanceMm: xMm,
        directTransitTimeUs: uncrackedTransitTimeUs,
        indirectTransitTimeUs: crackedTransitTimeUs,
        calculatedDepthMm: 0,
        confidence: 0.95,
      };
    }

    const ratio = crackedTransitTimeUs / uncrackedTransitTimeUs;
    const depthMm = xMm * Math.sqrt(Math.max(0, Math.pow(ratio, 2) - 1));

    return {
      crackId,
      surfaceDistanceMm: xMm,
      directTransitTimeUs: uncrackedTransitTimeUs,
      indirectTransitTimeUs: crackedTransitTimeUs,
      calculatedDepthMm: Number(depthMm.toFixed(1)),
      confidence: 0.92,
    };
  }
}
