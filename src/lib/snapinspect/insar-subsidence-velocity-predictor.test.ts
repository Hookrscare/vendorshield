import { describe, it, expect } from 'vitest';
import {
  InSARSubsidenceVelocityPredictor,
  PersistentScattererPoint,
  InSARSensorParameters,
} from './insar-subsidence-velocity-predictor';

describe('SNAP-49: Thermal InSAR Satellite Radar Ground Subsidence & Structural Deformation Velocity Predictor', () => {
  const sentinelSensor: InSARSensorParameters = {
    sensorName: 'Sentinel-1 C-band',
    wavelengthMm: 55.46,
    incidenceAngleDeg: 35.0,
    headingAngleDeg: 345.0,
  };

  it('converts LOS radar displacement to vertical displacement accurately', () => {
    // cos(35 deg) ~= 0.819152
    // -10 mm LOS / cos(35) ~= -12.207 mm
    const vVert = InSARSubsidenceVelocityPredictor.losToVerticalVelocity(-10.0, 35.0);
    expect(vVert).toBeCloseTo(-12.207, 2);
  });

  it('decouples thermal expansion oscillations from secular subsidence trend', () => {
    // Total displacement = -8.0 mm with +10 deg C temp increase and 0.45 mm/deg C
    // Thermal component = 4.5 mm, Secular component = -12.5 mm
    const decoupled = InSARSubsidenceVelocityPredictor.decoupleThermalDeformation(-8.0, 10.0, 0.45);
    expect(decoupled.thermalDisplacementMm).toBe(4.5);
    expect(decoupled.secularDisplacementMm).toBe(-12.5);
  });

  it('correctly classifies angular distortion risk tiers per Eurocode 7', () => {
    // Safe: 2 mm over 10 meters -> 2 / 10000 = 1 / 5000 (< 1/500)
    const safe = InSARSubsidenceVelocityPredictor.evaluateAngularDistortion(10, 2);
    expect(safe.riskTier).toBe('NEGLIGIBLE');

    // Cracking: 25 mm over 10 meters -> 25 / 10000 = 1 / 400 (between 1/500 and 1/300)
    const crack = InSARSubsidenceVelocityPredictor.evaluateAngularDistortion(10, 25);
    expect(crack.riskTier).toBe('ARCHITECTURAL_CRACKING');

    // Failure: 100 mm over 10 meters -> 100 / 10000 = 1 / 100 (>= 1/150)
    const fail = InSARSubsidenceVelocityPredictor.evaluateAngularDistortion(10, 100);
    expect(fail.riskTier).toBe('CRITICAL_FAILURE');
  });

  it('conducts multi-point survey analysis and emits cryptographic audit seal', () => {
    const points: PersistentScattererPoint[] = [
      { id: 'PS-1', xMeters: 0, yMeters: 0, elevationMeters: 25.0, losDisplacementMm: -2.0, coherence: 0.95 },
      { id: 'PS-2', xMeters: 10, yMeters: 0, elevationMeters: 25.0, losDisplacementMm: -8.0, coherence: 0.92 },
      { id: 'PS-3', xMeters: 20, yMeters: 0, elevationMeters: 25.0, losDisplacementMm: -35.0, coherence: 0.88 },
    ];

    const pairs = [
      { nodeAId: 'PS-1', nodeBId: 'PS-2', spanMeters: 10 },
      { nodeAId: 'PS-2', nodeBId: 'PS-3', spanMeters: 10 },
    ];

    const assessment = InSARSubsidenceVelocityPredictor.analyzeSurvey(
      'SURVEY-2026-INSAR-01',
      points,
      sentinelSensor,
      pairs
    );

    expect(assessment.totalPointsAudited).toBe(3);
    expect(assessment.criticalPairs.length).toBe(2);
    expect(assessment.svgContourMap).toContain('<svg');
    expect(assessment.geoJsonFeatures.type).toBe('FeatureCollection');
    expect(assessment.cryptographicSealSha256).toHaveLength(64);
  });
});
