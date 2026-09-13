import { describe, it, expect } from 'vitest';
import {
  BoreholeStratigraphyInterpolator,
  BoreholeLog
} from './borehole-stratigraphy-interpolator';

describe('BoreholeStratigraphyInterpolator (SNAP-47)', () => {
  const mockBoreholes: BoreholeLog[] = [
    {
      boreholeId: 'BH-01',
      eastingM: 100.0,
      northingM: 200.0,
      surfaceElevationM: 45.0,
      groundwaterDepthM: 3.0,
      totalDepthM: 20.0,
      layers: [
        {
          layerId: 'L1',
          uscsClass: 'CL_LEAN_CLAY',
          description: 'Stiff Brown Silty Clay',
          topDepthM: 0.0,
          bottomDepthM: 4.0,
          sptNValue: 12,
          moistureContentPercent: 22.0,
          unitWeightKNm3: 18.5,
        },
        {
          layerId: 'L2',
          uscsClass: 'SM_SILTY_SAND',
          description: 'Loose Saturated Silty Sand',
          topDepthM: 4.0,
          bottomDepthM: 12.0,
          sptNValue: 7, // Low blow count, saturated
          moistureContentPercent: 28.0,
          unitWeightKNm3: 17.8,
        },
        {
          layerId: 'L3',
          uscsClass: 'BEDROCK',
          description: 'Competent Granitic Bedrock',
          topDepthM: 12.0,
          bottomDepthM: 20.0,
          sptNValue: 50,
          moistureContentPercent: 2.0,
          unitWeightKNm3: 25.0,
        },
      ],
    },
    {
      boreholeId: 'BH-02',
      eastingM: 150.0,
      northingM: 200.0,
      surfaceElevationM: 46.5,
      groundwaterDepthM: 3.5,
      totalDepthM: 22.0,
      layers: [
        {
          layerId: 'L1',
          uscsClass: 'CL_LEAN_CLAY',
          description: 'Stiff Brown Silty Clay',
          topDepthM: 0.0,
          bottomDepthM: 5.0,
          sptNValue: 14,
          moistureContentPercent: 20.0,
          unitWeightKNm3: 19.0,
        },
        {
          layerId: 'L2',
          uscsClass: 'SM_SILTY_SAND',
          description: 'Loose Saturated Silty Sand',
          topDepthM: 5.0,
          bottomDepthM: 13.0,
          sptNValue: 8,
          moistureContentPercent: 27.0,
          unitWeightKNm3: 18.0,
        },
        {
          layerId: 'L3',
          uscsClass: 'BEDROCK',
          description: 'Competent Granitic Bedrock',
          topDepthM: 13.0,
          bottomDepthM: 22.0,
          sptNValue: 50,
          moistureContentPercent: 2.0,
          unitWeightKNm3: 25.0,
        },
      ],
    },
  ];

  it('interpolates stratigraphy horizons accurately across site boreholes', () => {
    const interpolator = new BoreholeStratigraphyInterpolator();
    const result = interpolator.interpolateSite(
      'Harbor Waterfront Development Site A',
      mockBoreholes,
      [
        { x: 100.0, y: 200.0 }, // Exact BH-01
        { x: 125.0, y: 200.0 }, // Midpoint between BH-01 & BH-02
        { x: 150.0, y: 200.0 }, // Exact BH-02
      ]
    );

    expect(result.siteName).toBe('Harbor Waterfront Development Site A');
    expect(result.boreholesAnalyzed).toBe(2);
    expect(result.interpolatedGridPoints.length).toBe(3);

    // Exact match test at BH-01
    const pt1 = result.interpolatedGridPoints[0];
    expect(pt1.surfaceElevationM).toBe(45.0);
    expect(pt1.groundwaterElevationM).toBe(42.0); // 45 - 3
    expect(pt1.bedrockElevationM).toBe(33.0); // 45 - 12

    // Midpoint interpolation
    const ptMid = result.interpolatedGridPoints[1];
    expect(ptMid.surfaceElevationM).toBeCloseTo(45.75, 1);
    expect(ptMid.allowableBearingCapacityKPa).toBeGreaterThan(100);
  });

  it('detects critical seismic liquefaction risk in saturated loose sand strata', () => {
    const interpolator = new BoreholeStratigraphyInterpolator();
    const result = interpolator.interpolateSite(
      'Seismic Wharf Terminal B',
      mockBoreholes,
      [{ x: 110.0, y: 200.0 }]
    );

    const pt = result.interpolatedGridPoints[0];
    expect(pt.liquefactionHazard).toBe('CRITICAL_LIQUEFACTION_RISK');
    expect(pt.factorOfSafetyLiquefaction).toBeLessThan(1.0);
    expect(result.criticalLiquefactionZonesCount).toBe(1);
  });

  it('generates valid AutoCAD DXF with 3D borehole vertical shafts', () => {
    const interpolator = new BoreholeStratigraphyInterpolator();
    const result = interpolator.interpolateSite('Downtown Highrise', mockBoreholes, [{ x: 120, y: 200 }]);

    expect(result.dxfString).toContain('SECTION');
    expect(result.dxfString).toContain('BOREHOLE_SHAFTS');
    expect(result.dxfString).toContain('BH-01 (El. 45.0m)');
    expect(result.dxfString).toContain('BH-02 (El. 46.5m)');
    expect(result.dxfString).toContain('BEDROCK_HORIZON');
    expect(result.dxfString).toContain('EOF');
  });

  it('generates compliant SVG geotechnical fence diagram and GeoJSON', () => {
    const interpolator = new BoreholeStratigraphyInterpolator();
    const result = interpolator.interpolateSite('Civic Center Campus', mockBoreholes, [{ x: 120, y: 200 }]);

    expect(result.svgFenceDiagramString).toContain('<svg');
    expect(result.svgFenceDiagramString).toContain('Geotechnical Fence Diagram: Civic Center Campus');
    expect(result.svgFenceDiagramString).toContain('BH-01');
    expect(result.svgFenceDiagramString).toContain('BH-02');

    expect(result.geoJson.type).toBe('FeatureCollection');
    expect(result.geoJson.features.length).toBe(3); // 2 boreholes + 1 grid point
    expect(result.auditHashSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects empty inputs with defensive errors', () => {
    const interpolator = new BoreholeStratigraphyInterpolator();
    expect(() => interpolator.interpolateSite('Empty Site', [], [{ x: 10, y: 10 }]))
      .toThrow('At least one borehole log is required');
    expect(() => interpolator.interpolateSite('Empty Grid', mockBoreholes, []))
      .toThrow('Target grid coordinate points cannot be empty');
  });
});
