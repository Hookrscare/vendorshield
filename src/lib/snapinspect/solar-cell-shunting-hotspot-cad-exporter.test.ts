import { describe, it, expect } from 'vitest';
import {
  SolarCellShuntingHotspotCadExporter,
  SolarModuleGeometry,
  ThermalPixel,
} from './solar-cell-shunting-hotspot-cad-exporter';

describe('SNAP-46: Infrared Thermography Solar Cell Shunting Hotspot CAD Polygon Exporter', () => {
  const mockGeometry: SolarModuleGeometry = {
    moduleId: 'MOD-ARRAY-WEST-042',
    stringId: 'STR-INV2-01',
    widthMm: 1040,
    heightMm: 2080,
    columnsCount: 6,
    rowsCount: 12,
    ratedWatts: 450,
    irradianceWm2: 880,
    ambientTempC: 22.0,
  };

  it('detects localized solar cell shunts, classifies severity, and computes power degradation', () => {
    const exporter = new SolarCellShuntingHotspotCadExporter();

    // Generate normal baseline thermal matrix (approx 45°C under 880 W/m2 sun)
    const thermalGrid: ThermalPixel[] = [];
    for (let x = 50; x < 1040; x += 100) {
      for (let y = 50; y < 2080; y += 150) {
        thermalGrid.push({ x, y, temperatureCelsius: 44.5 + Math.random() * 2 });
      }
    }

    // Inject severe shunt hotspot on Cell (Col 1, Row 3) -> ~78°C (Delta-T > 32K -> CLASS_III_CRITICAL)
    const cellW = 1040 / 6;
    const cellH = 2080 / 12;
    thermalGrid.push(
      { x: 1 * cellW + 30, y: 3 * cellH + 40, temperatureCelsius: 78.5 },
      { x: 1 * cellW + 35, y: 3 * cellH + 45, temperatureCelsius: 82.0 },
      { x: 1 * cellW + 40, y: 3 * cellH + 50, temperatureCelsius: 88.0 } // > 85°C backsheet danger
    );

    // Inject moderate micro-crack shunt on Cell (Col 4, Row 8) -> ~58°C (Delta-T ~13K -> CLASS_II_MODERATE)
    thermalGrid.push(
      { x: 4 * cellW + 20, y: 8 * cellH + 20, temperatureCelsius: 58.0 },
      { x: 4 * cellW + 25, y: 8 * cellH + 25, temperatureCelsius: 59.2 }
    );

    const result = exporter.analyzeAndExport(mockGeometry, thermalGrid, 'INSP-SOLAR-001');

    expect(result.inspectionId).toBe('INSP-SOLAR-001');
    expect(result.moduleId).toBe('MOD-ARRAY-WEST-042');
    expect(result.totalHotspotsCount).toBe(2);
    expect(result.criticalClass3Count).toBe(1);
    expect(result.totalPowerLossWatts).toBeGreaterThan(0);
    expect(result.maxTemperatureCelsius).toBeGreaterThanOrEqual(88.0);

    const criticalHotspot = result.hotspots.find(h => h.severity === 'CLASS_III_CRITICAL');
    expect(criticalHotspot).toBeDefined();
    expect(criticalHotspot?.cellColIndex).toBe(1);
    expect(criticalHotspot?.cellRowIndex).toBe(3);
    expect(criticalHotspot?.fireHazardRiskScore).toBeGreaterThanOrEqual(90);

    const moderateHotspot = result.hotspots.find(h => h.severity === 'CLASS_II_MODERATE');
    expect(moderateHotspot).toBeDefined();
    expect(moderateHotspot?.cellColIndex).toBe(4);
    expect(moderateHotspot?.cellRowIndex).toBe(8);
  });

  it('exports valid AutoCAD DXF entities and layers for CAD integration', () => {
    const exporter = new SolarCellShuntingHotspotCadExporter();
    const cellW = 1040 / 6;
    const cellH = 2080 / 12;

    const thermalGrid: ThermalPixel[] = [
      { x: 100, y: 100, temperatureCelsius: 40.0 },
      { x: 200, y: 200, temperatureCelsius: 41.0 },
      { x: 300, y: 300, temperatureCelsius: 40.5 },
      // Shunt hotspot
      { x: 0 * cellW + 20, y: 0 * cellH + 20, temperatureCelsius: 65.0 },
      { x: 0 * cellW + 30, y: 0 * cellH + 30, temperatureCelsius: 67.5 },
    ];

    const result = exporter.analyzeAndExport(mockGeometry, thermalGrid);
    const dxf = result.dxfString;

    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('ENTITIES');
    expect(dxf).toContain('PV_MODULE_OUTLINE');
    expect(dxf).toContain('THERMAL_SHUNT_HOTSPOTS');
    expect(dxf).toContain('POLYLINE');
    expect(dxf).toContain('EOF');
  });

  it('exports SVG vector overlay with polygons, centroids, and temperature labels', () => {
    const exporter = new SolarCellShuntingHotspotCadExporter();
    const cellW = 1040 / 6;
    const cellH = 2080 / 12;

    const thermalGrid: ThermalPixel[] = [
      { x: 50, y: 50, temperatureCelsius: 42.0 },
      { x: 2 * cellW + 20, y: 5 * cellH + 20, temperatureCelsius: 75.0 },
    ];

    const result = exporter.analyzeAndExport(mockGeometry, thermalGrid);
    const svg = result.svgOverlayString;

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 1040 2080"');
    expect(svg).toContain('polygon');
    expect(svg).toContain('75°C');
    expect(svg).toContain('hotspot-polygon');
  });

  it('exports GeoJSON FeatureCollection with polygon coordinates and properties', () => {
    const exporter = new SolarCellShuntingHotspotCadExporter();
    const cellW = 1040 / 6;
    const cellH = 2080 / 12;

    const thermalGrid: ThermalPixel[] = [
      { x: 50, y: 50, temperatureCelsius: 42.0 },
      { x: 3 * cellW + 10, y: 2 * cellH + 10, temperatureCelsius: 70.0 },
    ];

    const result = exporter.analyzeAndExport(mockGeometry, thermalGrid);
    const geoJson = result.geoJson;

    expect(geoJson.type).toBe('FeatureCollection');
    expect(geoJson.properties.moduleId).toBe('MOD-ARRAY-WEST-042');
    expect(geoJson.features.length).toBe(1);
    expect(geoJson.features[0].geometry.type).toBe('Polygon');
    expect(geoJson.features[0].properties.severity).toBe('CLASS_II_MODERATE');
    expect(result.auditHashSha256).toHaveLength(64);
  });
});
