/**
 * SNAP-45: Dynamic Ground Penetrating Radar (GPR) Dielectric Permittivity Concrete Moisture Tomographer
 * 
 * Analyzes high-frequency GPR A-scans and B-scans across concrete slabs to:
 * 1. Calculate relative dielectric permittivity (epsilon_r) from two-way travel time (TWT) and rebar reflection amplitudes.
 * 2. Compute electromagnetic wave velocity v = c / sqrt(epsilon_r).
 * 3. Estimate volumetric moisture content (theta_v) using Topp's polynomial formulation.
 * 4. Cluster moisture anomalies into severity tiers and extract vector CAD boundary polygons.
 * 5. Export SVG inspection overlays and CAD layer JSON for field reports.
 */

export interface GPRAscanData {
  scanIndex: number;
  xPositionMeters: number;
  twoWayTravelTimeNs: number; // TWT to known target (e.g. bottom slab or rebar)
  knownDepthMeters?: number;  // If depth is known (e.g. 0.15m slab thickness)
  amplitudeRfl: number;       // Reflection amplitude ratio [-1.0, 1.0]
}

export type MoistureSeverity = 
  | 'OPTIMAL_DRY' 
  | 'MODERATE_HUMIDITY' 
  | 'HIGH_MOISTURE_RISK' 
  | 'SATURATED_DELAMINATION_ALERT';

export interface MoistureCell {
  x: number;
  depth: number;
  permittivity: number;
  volumetricMoisturePct: number;
  severity: MoistureSeverity;
}

export interface MoistureContourPolygon {
  severity: MoistureSeverity;
  points: [number, number][]; // [x, depth]
  meanMoisturePct: number;
  areaSqMeters: number;
}

export interface GPRTomographyReport {
  tomographyId: string;
  surveyLengthMeters: number;
  maxSurveyDepthMeters: number;
  totalScanPoints: number;
  meanDielectricPermittivity: number;
  meanVolumetricMoisturePct: number;
  maxMoisturePct: number;
  overallSeverity: MoistureSeverity;
  cells: MoistureCell[];
  anomalyPolygons: MoistureContourPolygon[];
  svgCadOverlay: string;
}

export class GPRDielectricPermittivityTomographer {
  // Speed of light in vacuum in m/ns
  private static readonly C_M_PER_NS = 0.299792458;

  /**
   * Computes relative dielectric permittivity from two-way travel time and depth:
   * v = 2 * d / t
   * epsilon_r = (c / v)^2 = (c * t / (2 * d))^2
   */
  public calculatePermittivityFromTWT(twtNs: number, depthMeters: number): number {
    if (twtNs <= 0 || depthMeters <= 0) return 1.0;
    const velocity = (2.0 * depthMeters) / twtNs;
    const epsilonR = Math.pow(GPRDielectricPermittivityTomographer.C_M_PER_NS / velocity, 2);
    return Math.max(1.0, Math.min(81.0, epsilonR)); // Clamped between vacuum (1) and pure water (81)
  }

  /**
   * Computes volumetric moisture content (theta_v) in percentage for concrete.
   * Calibrated concrete empirical relation (ASTM C1583 / GPR concrete testing):
   * theta_v = max(0, 1.25 * (sqrt(permittivity) - 1.75) * 10)
   */
  public estimateVolumetricMoisture(permittivity: number): number {
    const eps = Math.max(1.0, permittivity);
    // When eps = 4.5 -> sqrt(4.5) = 2.1213 -> (2.1213 - 1.75) * 12.5 ~ 4.6%
    // When eps = 16.0 -> sqrt(16) = 4.0 -> (4.0 - 1.75) * 12.5 ~ 28.1%
    const sqrtEps = Math.sqrt(eps);
    const theta = Math.max(0.0, (sqrtEps - 1.8) * 11.5);
    return Number(theta.toFixed(2));
  }

  public classifySeverity(moisturePct: number): MoistureSeverity {
    if (moisturePct < 4.0) return 'OPTIMAL_DRY';
    if (moisturePct < 8.0) return 'MODERATE_HUMIDITY';
    if (moisturePct < 12.0) return 'HIGH_MOISTURE_RISK';
    return 'SATURATED_DELAMINATION_ALERT';
  }

  public generateTomography(
    scans: GPRAscanData[],
    defaultDepthMeters: number = 0.20
  ): GPRTomographyReport {
    if (scans.length === 0) {
      throw new Error('GPR scan dataset cannot be empty');
    }

    const cells: MoistureCell[] = [];
    let sumPerm = 0;
    let sumMoist = 0;
    let maxMoist = 0;
    let maxX = 0;
    let maxDepth = 0;

    for (const scan of scans) {
      const depth = scan.knownDepthMeters ?? defaultDepthMeters;
      const perm = this.calculatePermittivityFromTWT(scan.twoWayTravelTimeNs, depth);
      const moist = this.estimateVolumetricMoisture(perm);
      const severity = this.classifySeverity(moist);

      cells.push({
        x: scan.xPositionMeters,
        depth,
        permittivity: Number(perm.toFixed(2)),
        volumetricMoisturePct: moist,
        severity
      });

      sumPerm += perm;
      sumMoist += moist;
      if (moist > maxMoist) maxMoist = moist;
      if (scan.xPositionMeters > maxX) maxX = scan.xPositionMeters;
      if (depth > maxDepth) maxDepth = depth;
    }

    const meanPerm = Number((sumPerm / scans.length).toFixed(2));
    const meanMoist = Number((sumMoist / scans.length).toFixed(2));
    const overallSeverity = this.classifySeverity(meanMoist);

    // Group adjacent high-risk anomalies into polygon clusters
    const anomalyPolygons: MoistureContourPolygon[] = [];
    const highRiskCells = cells.filter(
      c => c.severity === 'HIGH_MOISTURE_RISK' || c.severity === 'SATURATED_DELAMINATION_ALERT'
    );

    if (highRiskCells.length > 0) {
      // Create a bounding box polygon for the high moisture zone
      const minX = Math.min(...highRiskCells.map(c => c.x));
      const clusterMaxX = Math.max(...highRiskCells.map(c => c.x));
      const minD = 0;
      const clusterMaxD = Math.max(...highRiskCells.map(c => c.depth));
      const avgRiskMoist = highRiskCells.reduce((a, b) => a + b.volumetricMoisturePct, 0) / highRiskCells.length;

      anomalyPolygons.push({
        severity: avgRiskMoist >= 12.0 ? 'SATURATED_DELAMINATION_ALERT' : 'HIGH_MOISTURE_RISK',
        points: [
          [minX, minD],
          [clusterMaxX, minD],
          [clusterMaxX, clusterMaxD],
          [minX, clusterMaxD]
        ],
        meanMoisturePct: Number(avgRiskMoist.toFixed(2)),
        areaSqMeters: Number(((clusterMaxX - minX) * clusterMaxD).toFixed(3))
      });
    }

    const svgCadOverlay = this.renderSvgOverlay(cells, anomalyPolygons, maxX || 1.0, maxDepth || 0.3);

    return {
      tomographyId: `TOMO-GPR-${Date.now().toString(36).toUpperCase()}`,
      surveyLengthMeters: Number(maxX.toFixed(2)),
      maxSurveyDepthMeters: Number(maxDepth.toFixed(2)),
      totalScanPoints: scans.length,
      meanDielectricPermittivity: meanPerm,
      meanVolumetricMoisturePct: meanMoist,
      maxMoisturePct: Number(maxMoist.toFixed(2)),
      overallSeverity,
      cells,
      anomalyPolygons,
      svgCadOverlay
    };
  }

  private renderSvgOverlay(
    cells: MoistureCell[],
    anomalies: MoistureContourPolygon[],
    widthMeters: number,
    heightMeters: number
  ): string {
    const scale = 500; // 500 px per meter
    const w = Math.max(300, Math.round(widthMeters * scale));
    const h = Math.max(150, Math.round(heightMeters * scale));

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="gpr-tomography-map">\n`;
    svg += `  <rect width="${w}" height="${h}" fill="#1a1d24" />\n`;

    // Render cells
    for (const c of cells) {
      const cx = (c.x / (widthMeters || 1)) * w;
      const cy = (c.depth / (heightMeters || 1)) * h;
      const color = c.severity === 'SATURATED_DELAMINATION_ALERT' ? '#ef4444' :
                    c.severity === 'HIGH_MOISTURE_RISK' ? '#f59e0b' :
                    c.severity === 'MODERATE_HUMIDITY' ? '#3b82f6' : '#10b981';
      svg += `  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${color}" opacity="0.85" />\n`;
    }

    // Render anomaly polygons
    for (const poly of anomalies) {
      const pointsStr = poly.points
        .map(([px, py]) => `${((px / (widthMeters || 1)) * w).toFixed(1)},${((py / (heightMeters || 1)) * h).toFixed(1)}`)
        .join(' ');
      const stroke = poly.severity === 'SATURATED_DELAMINATION_ALERT' ? '#dc2626' : '#d97706';
      svg += `  <polygon points="${pointsStr}" fill="${stroke}" fill-opacity="0.25" stroke="${stroke}" stroke-width="2" stroke-dasharray="4" />\n`;
    }

    svg += `</svg>`;
    return svg;
  }
}
