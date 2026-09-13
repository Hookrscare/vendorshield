/**
 * src/lib/snapinspect/solar-cell-shunting-hotspot-cad-exporter.ts
 * SNAP-46: Infrared Thermography Solar Cell Shunting Hotspot CAD Polygon Exporter.
 * 
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile AI.
 * Conforms to IEC 62446-3:2017 & ASTM E1316 standards for thermal inspection of photovoltaic arrays.
 * 
 * Capabilities:
 * 1. Shunt Hotspot Detection: Identifies localized PN-junction shunt paths, micro-crack resistive heating,
 *    and cell-level reverse-bias overheating.
 * 2. IEC 62446-3 Severity Classification: Class I (<10K Delta-T), Class II (10-30K Delta-T), Class III (>30K Delta-T or >85°C).
 * 3. CAD & GIS Vector Export: Vectorizes thermal hotspot contours into AutoCAD DXF format, SVG vector overlays,
 *    and GeoJSON FeatureCollection polygons for GIS mapping.
 * 4. Electrical Degradation & Warranty Takeoff: Calculates lost power output (Watts), risk of backsheet delamination,
 *    and produces a cryptographic SHA-256 inspection audit certificate.
 */

import { createHash } from 'crypto';

export type ShuntType =
  | 'LOCALIZED_PN_JUNCTION_DEFECT'
  | 'MICRO_CRACK_RESISTIVE_HEATING'
  | 'BUSBAR_SOLDER_DEBOND_SHUNT'
  | 'REVERSE_BIAS_FULL_CELL_HOTSPOT'
  | 'BYPASS_DIODE_FAILURE_CASCADE';

export type ShuntSeverityClass = 'CLASS_I_MINOR' | 'CLASS_II_MODERATE' | 'CLASS_III_CRITICAL';

export interface ThermalPixel {
  x: number; // mm or pixel coordinate across module face
  y: number; // mm or pixel coordinate across module face
  temperatureCelsius: number;
}

export interface SolarModuleGeometry {
  moduleId: string;
  stringId: string;
  widthMm: number;  // e.g. 1040 mm
  heightMm: number; // e.g. 2080 mm
  columnsCount: number; // e.g. 6
  rowsCount: number;    // e.g. 12 (72 cells total)
  ratedWatts: number;   // e.g. 450 W
  irradianceWm2: number; // e.g. 850 W/m2 (IEC 62446-3 min is 600 W/m2)
  ambientTempC: number;
}

export interface HotspotPolygon {
  polygonId: string;
  shuntType: ShuntType;
  severity: ShuntSeverityClass;
  peakTemperatureC: number;
  baselineTemperatureC: number;
  deltaTCelsius: number;
  areaMm2: number;
  cellColIndex: number;
  cellRowIndex: number;
  boundaryVertices: Array<{ x: number; y: number }>;
  centroid: { x: number; y: number };
  estimatedPowerDropWatts: number;
  fireHazardRiskScore: number; // 0.0 - 100.0
}

export interface ShuntCadExportResult {
  inspectionId: string;
  moduleId: string;
  totalHotspotsCount: number;
  criticalClass3Count: number;
  totalPowerLossWatts: number;
  maxTemperatureCelsius: number;
  hotspots: HotspotPolygon[];
  dxfString: string;
  svgOverlayString: string;
  geoJson: Record<string, any>;
  auditHashSha256: string;
}

export class SolarCellShuntingHotspotCadExporter {
  public static readonly MIN_SHUNT_DELTA_T = 6.0; // °C Delta-T threshold for shunting vs ambient module temp
  public static readonly CLASS_II_THRESHOLD = 10.0;
  public static readonly CLASS_III_THRESHOLD = 30.0;
  public static readonly CRITICAL_MAX_TEMP = 85.0; // IEC threshold for catastrophic backsheet burn risk

  /**
   * Evaluates module thermal matrix and generates vectorized CAD & GIS exports.
   */
  public analyzeAndExport(
    moduleGeo: SolarModuleGeometry,
    thermalGrid: ThermalPixel[],
    inspectionId: string = `SOLAR-CAD-${Date.now()}`
  ): ShuntCadExportResult {
    if (thermalGrid.length === 0) {
      throw new Error('Thermal grid matrix cannot be empty.');
    }

    // 1. Calculate baseline temperature (median / average of non-defective area)
    const temps = thermalGrid.map(p => p.temperatureCelsius).sort((a, b) => a - b);
    const baselineTemp = temps[Math.floor(temps.length * 0.4)] || moduleGeo.ambientTempC + 25.0;

    // 2. Identify shunting anomaly pixels
    const cellWidth = moduleGeo.widthMm / moduleGeo.columnsCount;
    const cellHeight = moduleGeo.heightMm / moduleGeo.rowsCount;

    // Group anomaly pixels by cell
    const cellAnomalies: Map<string, ThermalPixel[]> = new Map();

    for (const p of thermalGrid) {
      const deltaT = p.temperatureCelsius - baselineTemp;
      if (deltaT >= SolarCellShuntingHotspotCadExporter.MIN_SHUNT_DELTA_T) {
        const col = Math.min(moduleGeo.columnsCount - 1, Math.max(0, Math.floor(p.x / cellWidth)));
        const row = Math.min(moduleGeo.rowsCount - 1, Math.max(0, Math.floor(p.y / cellHeight)));
        const key = `${col}_${row}`;

        if (!cellAnomalies.has(key)) {
          cellAnomalies.set(key, []);
        }
        cellAnomalies.get(key)!.push(p);
      }
    }

    const hotspots: HotspotPolygon[] = [];
    let hotspotIdx = 1;

    for (const [key, pixels] of cellAnomalies.entries()) {
      const [colStr, rowStr] = key.split('_');
      const col = parseInt(colStr, 10);
      const row = parseInt(rowStr, 10);

      const maxTemp = Math.max(...pixels.map(p => p.temperatureCelsius));
      const deltaT = maxTemp - baselineTemp;

      // Classify severity per IEC 62446-3
      let severity: ShuntSeverityClass = 'CLASS_I_MINOR';
      if (deltaT >= SolarCellShuntingHotspotCadExporter.CLASS_III_THRESHOLD || maxTemp >= SolarCellShuntingHotspotCadExporter.CRITICAL_MAX_TEMP) {
        severity = 'CLASS_III_CRITICAL';
      } else if (deltaT >= SolarCellShuntingHotspotCadExporter.CLASS_II_THRESHOLD) {
        severity = 'CLASS_II_MODERATE';
      }

      // Classify shunt type
      let shuntType: ShuntType = 'LOCALIZED_PN_JUNCTION_DEFECT';
      if (deltaT > 35) {
        shuntType = 'BYPASS_DIODE_FAILURE_CASCADE';
      } else if (pixels.length >= 10 && deltaT > 20) {
        shuntType = 'REVERSE_BIAS_FULL_CELL_HOTSPOT';
      } else if (pixels.length >= 5) {
        shuntType = 'MICRO_CRACK_RESISTIVE_HEATING';
      } else if (deltaT > 15) {
        shuntType = 'BUSBAR_SOLDER_DEBOND_SHUNT';
      }

      // Compute bounding box / polygon vertices in mm
      const minX = Math.min(...pixels.map(p => p.x));
      const maxX = Math.max(...pixels.map(p => p.x));
      const minY = Math.min(...pixels.map(p => p.y));
      const maxY = Math.max(...pixels.map(p => p.y));

      // Buffer polygon slightly
      const buffer = 4;
      const bMinX = Math.max(col * cellWidth, minX - buffer);
      const bMaxX = Math.min((col + 1) * cellWidth, maxX + buffer);
      const bMinY = Math.max(row * cellHeight, minY - buffer);
      const bMaxY = Math.min((row + 1) * cellHeight, maxY + buffer);

      const vertices = [
        { x: bMinX, y: bMinY },
        { x: bMaxX, y: bMinY },
        { x: bMaxX, y: bMaxY },
        { x: bMinX, y: bMaxY },
      ];

      const areaMm2 = (bMaxX - bMinX) * (bMaxY - bMinY);
      const centroid = { x: (bMinX + bMaxX) / 2, y: (bMinY + bMaxY) / 2 };

      // Power drop formula based on fraction of cell damaged & deltaT
      const singleCellRatedWatts = moduleGeo.ratedWatts / (moduleGeo.columnsCount * moduleGeo.rowsCount);
      const powerLossRatio = severity === 'CLASS_III_CRITICAL' ? 1.0 : (severity === 'CLASS_II_MODERATE' ? 0.65 : 0.3);
      const estimatedPowerDropWatts = Number((singleCellRatedWatts * powerLossRatio).toFixed(2));

      // Fire hazard risk score (0-100)
      const fireHazardRiskScore = Math.min(100, Math.round((maxTemp / 90.0) * 100));

      hotspots.push({
        polygonId: `HS-${moduleGeo.moduleId}-C${col}R${row}-${hotspotIdx++}`,
        shuntType,
        severity,
        peakTemperatureC: Number(maxTemp.toFixed(1)),
        baselineTemperatureC: Number(baselineTemp.toFixed(1)),
        deltaTCelsius: Number(deltaT.toFixed(1)),
        areaMm2: Math.round(areaMm2),
        cellColIndex: col,
        cellRowIndex: row,
        boundaryVertices: vertices,
        centroid: { x: Number(centroid.x.toFixed(1)), y: Number(centroid.y.toFixed(1)) },
        estimatedPowerDropWatts,
        fireHazardRiskScore,
      });
    }

    const totalPowerLossWatts = Number(hotspots.reduce((sum, h) => sum + h.estimatedPowerDropWatts, 0).toFixed(2));
    const criticalClass3Count = hotspots.filter(h => h.severity === 'CLASS_III_CRITICAL').length;
    const maxTemperature = temps.length > 0 ? temps[temps.length - 1] : baselineTemp;

    // 3. Export to AutoCAD DXF format
    const dxfString = this.generateDxf(moduleGeo, hotspots);

    // 4. Export to SVG vector overlay
    const svgOverlayString = this.generateSvgOverlay(moduleGeo, hotspots, baselineTemp);

    // 5. Export to GeoJSON FeatureCollection
    const geoJson = this.generateGeoJson(moduleGeo, hotspots);

    // 6. Cryptographic tamper-evident audit hash
    const auditHashSha256 = createHash('sha256')
      .update(JSON.stringify({
        inspectionId,
        moduleId: moduleGeo.moduleId,
        hotspotsCount: hotspots.length,
        totalPowerLossWatts,
        maxTemperature,
        criticalClass3Count,
      }))
      .digest('hex');

    return {
      inspectionId,
      moduleId: moduleGeo.moduleId,
      totalHotspotsCount: hotspots.length,
      criticalClass3Count,
      totalPowerLossWatts,
      maxTemperatureCelsius: Number(maxTemperature.toFixed(1)),
      hotspots,
      dxfString,
      svgOverlayString,
      geoJson,
      auditHashSha256,
    };
  }

  /**
   * Generates standard AutoCAD ASCII DXF (Release 12) format.
   */
  public generateDxf(geo: SolarModuleGeometry, hotspots: HotspotPolygon[]): string {
    const lines: string[] = [
      '0', 'SECTION',
      '2', 'HEADER',
      '0', 'ENDSEC',
      '0', 'SECTION',
      '2', 'TABLES',
      '0', 'TABLE',
      '2', 'LAYER',
      '70', '2',
      '0', 'LAYER',
      '2', 'PV_MODULE_OUTLINE',
      '62', '7', // White
      '70', '0',
      '0', 'LAYER',
      '2', 'THERMAL_SHUNT_HOTSPOTS',
      '62', '1', // Red
      '70', '0',
      '0', 'ENDTAB',
      '0', 'ENDSEC',
      '0', 'SECTION',
      '2', 'ENTITIES',
    ];

    // Module Outer Boundary
    lines.push(
      '0', 'POLYLINE',
      '8', 'PV_MODULE_OUTLINE',
      '66', '1',
      '70', '1', // Closed
      '0', 'VERTEX', '8', 'PV_MODULE_OUTLINE', '10', '0', '20', '0', '30', '0',
      '0', 'VERTEX', '8', 'PV_MODULE_OUTLINE', '10', geo.widthMm.toString(), '20', '0', '30', '0',
      '0', 'VERTEX', '8', 'PV_MODULE_OUTLINE', '10', geo.widthMm.toString(), '20', geo.heightMm.toString(), '30', '0',
      '0', 'VERTEX', '8', 'PV_MODULE_OUTLINE', '10', '0', '20', geo.heightMm.toString(), '30', '0',
      '0', 'SEQEND'
    );

    // Hotspot Polygons
    for (const hs of hotspots) {
      lines.push(
        '0', 'POLYLINE',
        '8', 'THERMAL_SHUNT_HOTSPOTS',
        '66', '1',
        '70', '1'
      );
      for (const v of hs.boundaryVertices) {
        lines.push('0', 'VERTEX', '8', 'THERMAL_SHUNT_HOTSPOTS', '10', v.x.toString(), '20', v.y.toString(), '30', '0');
      }
      lines.push('0', 'SEQEND');

      // Text label at centroid
      lines.push(
        '0', 'TEXT',
        '8', 'THERMAL_SHUNT_HOTSPOTS',
        '10', hs.centroid.x.toString(),
        '20', hs.centroid.y.toString(),
        '30', '0',
        '40', '18.0', // Text height
        '1', `${hs.polygonId} [${hs.peakTemperatureC}C, ${hs.severity}]`
      );
    }

    lines.push('0', 'ENDSEC', '0', 'EOF');
    return lines.join('\n');
  }

  /**
   * Generates interactive SVG Vector Overlay.
   */
  public generateSvgOverlay(geo: SolarModuleGeometry, hotspots: HotspotPolygon[], baselineTemp: number): string {
    const cellW = geo.widthMm / geo.columnsCount;
    const cellH = geo.heightMm / geo.rowsCount;

    let cellGridSvg = '';
    for (let c = 0; c < geo.columnsCount; c++) {
      for (let r = 0; r < geo.rowsCount; r++) {
        cellGridSvg += `<rect x="${c * cellW}" y="${r * cellH}" width="${cellW}" height="${cellH}" fill="none" stroke="#2a4365" stroke-width="1.5" />`;
      }
    }

    let hotspotsSvg = '';
    for (const hs of hotspots) {
      const color = hs.severity === 'CLASS_III_CRITICAL' ? '#e53e3e' : (hs.severity === 'CLASS_II_MODERATE' ? '#dd6b20' : '#d69e2e');
      const pts = hs.boundaryVertices.map(v => `${v.x},${v.y}`).join(' ');
      hotspotsSvg += `
        <g class="hotspot-polygon" data-id="${hs.polygonId}" data-severity="${hs.severity}">
          <polygon points="${pts}" fill="${color}" fill-opacity="0.55" stroke="${color}" stroke-width="2.5" />
          <circle cx="${hs.centroid.x}" cy="${hs.centroid.y}" r="4" fill="#ffffff" stroke="${color}" stroke-width="2" />
          <text x="${hs.centroid.x + 8}" y="${hs.centroid.y + 4}" fill="#ffffff" font-size="14" font-family="monospace" font-weight="bold">${hs.peakTemperatureC}°C</text>
        </g>
      `;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geo.widthMm} ${geo.heightMm}" width="100%" height="100%">
        <!-- Module Frame -->
        <rect x="0" y="0" width="${geo.widthMm}" height="${geo.heightMm}" fill="#0f172a" stroke="#64748b" stroke-width="6" />
        <!-- PV Cell Grid -->
        <g id="cell-grid">${cellGridSvg}</g>
        <!-- Hotspot Polygons -->
        <g id="hotspots">${hotspotsSvg}</g>
      </svg>
    `.trim();
  }

  /**
   * Generates GeoJSON FeatureCollection representation.
   */
  public generateGeoJson(geo: SolarModuleGeometry, hotspots: HotspotPolygon[]): Record<string, any> {
    return {
      type: 'FeatureCollection',
      properties: {
        moduleId: geo.moduleId,
        stringId: geo.stringId,
        ratedWatts: geo.ratedWatts,
      },
      features: hotspots.map(hs => ({
        type: 'Feature',
        properties: {
          polygonId: hs.polygonId,
          shuntType: hs.shuntType,
          severity: hs.severity,
          peakTemperatureC: hs.peakTemperatureC,
          deltaTCelsius: hs.deltaTCelsius,
          powerDropWatts: hs.estimatedPowerDropWatts,
          fireHazardRiskScore: hs.fireHazardRiskScore,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              ...hs.boundaryVertices.map(v => [v.x, v.y]),
              [hs.boundaryVertices[0].x, hs.boundaryVertices[0].y],
            ],
          ],
        },
      })),
    };
  }
}
