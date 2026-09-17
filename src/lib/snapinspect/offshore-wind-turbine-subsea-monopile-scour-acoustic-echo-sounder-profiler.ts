/**
 * src/lib/snapinspect/offshore-wind-turbine-subsea-monopile-scour-acoustic-echo-sounder-profiler.ts
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * SNAP-91: Offshore Wind Turbine Subsea Monopile Scour & Acoustic Echo-Sounder Profiler.
 *
 * Ingests autonomous surface/underwater vehicle (USV/AUV) dual-frequency acoustic echo-sounder
 * and multibeam sonar bathymetry to evaluate seabed scour hole morphology and rock-armor riprap
 * displacement around offshore wind turbine foundations:
 * 1. Computes 360-degree circumferential azimuthal scour depths across tidal vector quadrants.
 * 2. Uses acoustic backscatter intensity (dB) to distinguish exposed bare sediment from protective rock armor.
 * 3. Estimates lateral foundation geotechnical p-y stiffness degradation factor per DNV-ST-0126.
 * 4. Calculates conical/frustum scour hole void volume (m^3) and maximum depth ratio (S_max / D_pile).
 * 5. Generates cryptographically verifiable inspection digest for CAD/GIS spatial digital twins.
 */

import { createHash } from "crypto";

export interface EchoSounderSounding {
  azimuthDeg: number; // 0 to 360
  radialDistanceMeters: number; // Distance from outer wall of monopile
  measuredDepthMeters: number; // Absolute depth from mean sea level (MSL)
  acousticBackscatterDb: number; // Acoustic return strength, e.g. -12 dB (rock) to -38 dB (silt/mud)
}

export interface MonopileAcousticEchoSounderSurveyRequest {
  turbineAssetId: string;
  surveyId: string;
  monopileDiameterMeters: number; // e.g. 8.5m
  baselineSeabedDepthMeters: number; // e.g. 32.0m
  designEmbedmentDepthMeters: number; // e.g. 36.0m
  rockArmorBackscatterThresholdDb?: number; // threshold distinguishing rock armor from sand (default -20 dB)
  soundings: EchoSounderSounding[];
}

export interface QuadrantScourProfile {
  quadrant: "N_NE" | "E_SE" | "S_SW" | "W_NW";
  soundingCount: number;
  maxScourDepthMeters: number;
  meanScourDepthMeters: number;
  rockArmorCoverageRatio: number; // 0.0 to 1.0
}

export interface MonopileAcousticEchoSounderSurveyResult {
  surveyId: string;
  turbineAssetId: string;
  monopileDiameterMeters: number;
  maxScourDepthMeters: number;
  scourDepthRatio: number; // S_max / D_pile
  estimatedScourVoidVolumeM3: number;
  foundationStiffnessRetentionFactor: number; // 0.0 to 1.0 (1.0 = undamaged foundation)
  overallRockArmorIntegrityRatio: number; // 0.0 to 1.0
  quadrantProfiles: QuadrantScourProfile[];
  structuralRiskClassification: "PASS_STABLE" | "WARNING_SEDIMENT_LOSS" | "CRITICAL_FOUNDATION_UNDERMINED";
  recommendedIntervention: string;
  cryptographicSurveyDigest: string;
}

export class OffshoreWindTurbineSubseaMonopileScourAcousticEchoSounderProfiler {
  /**
   * Analyzes dual-frequency acoustic echo-sounder bathymetry around offshore wind monopile.
   */
  public static processSurvey(
    request: MonopileAcousticEchoSounderSurveyRequest
  ): MonopileAcousticEchoSounderSurveyResult {
    if (request.monopileDiameterMeters <= 0 || request.baselineSeabedDepthMeters <= 0) {
      throw new Error("Monopile diameter and baseline depth must be strictly positive.");
    }
    if (!request.soundings || request.soundings.length < 8) {
      throw new Error("Survey requires at least 8 multi-quadrant acoustic soundings.");
    }

    const rockThreshold = request.rockArmorBackscatterThresholdDb ?? -20.0;
    const D = request.monopileDiameterMeters;
    const baseline = request.baselineSeabedDepthMeters;

    let maxScour = 0.0;
    let maxScourRadialDist = 0.0;
    let rockSoundingsTotal = 0;

    // Quadrant buckets: 0-90, 90-180, 180-270, 270-360
    const quadrantBuckets: Record<string, { scours: number[]; rockCount: number }> = {
      N_NE: { scours: [], rockCount: 0 },
      E_SE: { scours: [], rockCount: 0 },
      S_SW: { scours: [], rockCount: 0 },
      W_NW: { scours: [], rockCount: 0 }
    };

    for (const s of request.soundings) {
      const scour = Math.max(0.0, s.measuredDepthMeters - baseline);
      if (scour > maxScour) {
        maxScour = scour;
        maxScourRadialDist = Math.max(maxScourRadialDist, s.radialDistanceMeters);
      }

      const isRock = s.acousticBackscatterDb >= rockThreshold;
      if (isRock) {
        rockSoundingsTotal++;
      }

      const normAzimuth = ((s.azimuthDeg % 360) + 360) % 360;
      let qKey = "N_NE";
      if (normAzimuth >= 90 && normAzimuth < 180) qKey = "E_SE";
      else if (normAzimuth >= 180 && normAzimuth < 270) qKey = "S_SW";
      else if (normAzimuth >= 270 && normAzimuth < 360) qKey = "W_NW";

      quadrantBuckets[qKey].scours.push(scour);
      if (isRock) quadrantBuckets[qKey].rockCount++;
    }

    const quadrantProfiles: QuadrantScourProfile[] = (["N_NE", "E_SE", "S_SW", "W_NW"] as const).map(q => {
      const data = quadrantBuckets[q];
      const count = data.scours.length;
      const qMax = count > 0 ? Math.max(...data.scours) : 0.0;
      const qMean = count > 0 ? data.scours.reduce((a, b) => a + b, 0) / count : 0.0;
      const qRockRatio = count > 0 ? data.rockCount / count : 0.0;
      return {
        quadrant: q,
        soundingCount: count,
        maxScourDepthMeters: Number(qMax.toFixed(3)),
        meanScourDepthMeters: Number(qMean.toFixed(3)),
        rockArmorCoverageRatio: Number(qRockRatio.toFixed(3))
      };
    });

    const scourDepthRatio = Number((maxScour / D).toFixed(3));
    const overallRockArmorIntegrityRatio = Number((rockSoundingsTotal / request.soundings.length).toFixed(3));

    // Approximate scour hole volume as conical frustum: V = (1/3) * pi * maxScour * (R_hole^2)
    const scourRadius = Math.max(maxScourRadialDist, D * 1.2);
    const estimatedScourVoidVolumeM3 = Number(((1 / 3) * Math.PI * maxScour * Math.pow(scourRadius, 2)).toFixed(2));

    // Geotechnical lateral stiffness degradation factor: k_lat = (1 - (maxScour / EmbedmentDepth))^1.75
    const embedment = request.designEmbedmentDepthMeters > 0 ? request.designEmbedmentDepthMeters : D * 4.0;
    const degradationRatio = Math.min(1.0, maxScour / embedment);
    const foundationStiffnessRetentionFactor = Number(Math.max(0.0, Math.pow(1.0 - degradationRatio, 1.75)).toFixed(3));

    // Classification per DNV-ST-0126 criteria
    let structuralRiskClassification: MonopileAcousticEchoSounderSurveyResult["structuralRiskClassification"] = "PASS_STABLE";
    let recommendedIntervention = "Baseline acoustic monitoring every 12 months; rock armor stable.";

    if (scourDepthRatio >= 0.8 || foundationStiffnessRetentionFactor < 0.70 || overallRockArmorIntegrityRatio < 0.35) {
      structuralRiskClassification = "CRITICAL_FOUNDATION_UNDERMINED";
      recommendedIntervention = "URGENT: Deploy DP2 rock-dumping vessel with dynamic fall-pipe to replenish rock armor within 14 days.";
    } else if (scourDepthRatio >= 0.35 || overallRockArmorIntegrityRatio < 0.65) {
      structuralRiskClassification = "WARNING_SEDIMENT_LOSS";
      recommendedIntervention = "Increase acoustic survey frequency to bi-monthly; prepare secondary rock placement plan.";
    }

    const digestPayload = JSON.stringify({
      surveyId: request.surveyId,
      turbineAssetId: request.turbineAssetId,
      maxScour,
      scourDepthRatio,
      estimatedScourVoidVolumeM3,
      foundationStiffnessRetentionFactor,
      structuralRiskClassification
    });
    const cryptographicSurveyDigest = createHash("sha256").update(digestPayload).digest("hex");

    return {
      surveyId: request.surveyId,
      turbineAssetId: request.turbineAssetId,
      monopileDiameterMeters: D,
      maxScourDepthMeters: Number(maxScour.toFixed(3)),
      scourDepthRatio,
      estimatedScourVoidVolumeM3,
      foundationStiffnessRetentionFactor,
      overallRockArmorIntegrityRatio,
      quadrantProfiles,
      structuralRiskClassification,
      recommendedIntervention,
      cryptographicSurveyDigest
    };
  }
}
