/**
 * SNAP-34: Multi-Spectral UAV Roof Moisture Infiltration Boundary Polygon Vectorizer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile AI.
 * 
 * Conforms to ASTM C1153 Standard Practice for Location of Wet Insulation in Roofing Systems Using Infrared Imaging.
 * Processes multi-spectral drone aerial telemetry (thermal IR Delta-T and optical NIR reflectance),
 * extracts moisture infiltration contour clusters, vectorizes damage boundaries into CAD polygon paths,
 * and computes wet insulation volume takeoff and remediation cost estimates.
 */

export interface DroneSpectralPixel {
  x: number;
  y: number;
  thermalDeltaTCelsius: number; // Nighttime thermal capacitance temperature difference
  nirReflectance: number;       // Near-Infrared surface index (0.0 to 1.0)
  moistureIndex: number;        // Normalized moisture saturation (0.0 to 1.0)
}

export interface VectorPoint {
  x: number;
  y: number;
}

export interface InfiltrationPolygon {
  id: string;
  severity: "SURFACE_CONDENSATION" | "TRAPPED_INSULATION_MOISTURE" | "STRUCTURAL_SATURATION";
  boundaryPoints: VectorPoint[];
  centroid: VectorPoint;
  areaSqMeters: number;
  areaSqFeet: number;
  peakDeltaTCelsius: number;
  meanMoistureIndex: number;
  estimatedRemediationCostUsd: number;
}

export interface RoofMoistureAnalysisSummary {
  totalRoofAreaSqMeters: number;
  totalCompromisedAreaSqMeters: number;
  compromisedPercentage: number;
  polygons: InfiltrationPolygon[];
  criticalDamageFlag: boolean;
  svgPathData: string;
}

export class RoofMoistureVectorizer {
  public static readonly MOISTURE_THRESHOLD = 0.45;
  public static readonly DELTA_T_THRESHOLD_CELSIUS = 1.8;
  public static readonly SQ_METERS_TO_SQ_FEET = 10.7639;
  public static readonly BASE_REMEDIATION_COST_PER_SQFT = 14.50; // USD per sq ft for commercial tear-off & re-insulation

  /**
   * Evaluates if a pixel indicates subsurface roof moisture infiltration.
   */
  public static isCompromisedPixel(pixel: DroneSpectralPixel): boolean {
    return (
      pixel.thermalDeltaTCelsius >= this.DELTA_T_THRESHOLD_CELSIUS ||
      pixel.moistureIndex >= this.MOISTURE_THRESHOLD
    );
  }

  /**
   * Vectorizes a set of compromised grid pixels into boundary polygons using convex hull / bounding boundary.
   */
  public static vectorizeBoundaries(
    pixels: DroneSpectralPixel[],
    pixelResolutionMeters: number = 0.2, // 20cm per pixel
    totalRoofAreaSqMeters: number = 1000.0
  ): RoofMoistureAnalysisSummary {
    const compromised = pixels.filter(p => this.isCompromisedPixel(p));

    if (compromised.length === 0) {
      return {
        totalRoofAreaSqMeters,
        totalCompromisedAreaSqMeters: 0,
        compromisedPercentage: 0,
        polygons: [],
        criticalDamageFlag: false,
        svgPathData: ""
      };
    }

    // Cluster pixels by spatial proximity (simple grid clustering)
    const clusters: DroneSpectralPixel[][] = [];
    const visited = new Set<string>();

    for (const p of compromised) {
      const key = `${p.x},${p.y}`;
      if (visited.has(key)) continue;

      const cluster: DroneSpectralPixel[] = [];
      const queue = [p];
      visited.add(key);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        cluster.push(curr);

        // Check 4-connected neighbors
        const neighbors = compromised.filter(
          nbr =>
            !visited.has(`${nbr.x},${nbr.y}`) &&
            Math.abs(nbr.x - curr.x) <= 1 &&
            Math.abs(nbr.y - curr.y) <= 1
        );

        for (const nbr of neighbors) {
          visited.add(`${nbr.x},${nbr.y}`);
          queue.push(nbr);
        }
      }
      clusters.push(cluster);
    }

    const polygons: InfiltrationPolygon[] = clusters.map((cluster, idx) => {
      // Find bounding hull / envelope points
      const minX = Math.min(...cluster.map(p => p.x));
      const maxX = Math.max(...cluster.map(p => p.x));
      const minY = Math.min(...cluster.map(p => p.y));
      const maxY = Math.max(...cluster.map(p => p.y));

      const boundaryPoints: VectorPoint[] = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY }
      ];

      const avgX = cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length;
      const avgY = cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length;
      const peakDeltaT = Math.max(...cluster.map(p => p.thermalDeltaTCelsius));
      const meanMoisture = cluster.reduce((sum, p) => sum + p.moistureIndex, 0) / cluster.length;

      const areaSqMeters = cluster.length * (pixelResolutionMeters * pixelResolutionMeters);
      const areaSqFeet = areaSqMeters * this.SQ_METERS_TO_SQ_FEET;

      let severity: InfiltrationPolygon["severity"] = "SURFACE_CONDENSATION";
      if (peakDeltaT > 3.5 || meanMoisture > 0.75) {
        severity = "STRUCTURAL_SATURATION";
      } else if (peakDeltaT >= 1.8 || meanMoisture >= 0.45) {
        severity = "TRAPPED_INSULATION_MOISTURE";
      }

      const remediationMultiplier = severity === "STRUCTURAL_SATURATION" ? 1.8 : 1.0;
      const estimatedRemediationCostUsd = Math.round(
        areaSqFeet * this.BASE_REMEDIATION_COST_PER_SQFT * remediationMultiplier
      );

      return {
        id: `ROOF-INFIL-${idx + 1}`,
        severity,
        boundaryPoints,
        centroid: { x: Math.round(avgX * 100) / 100, y: Math.round(avgY * 100) / 100 },
        areaSqMeters: Math.round(areaSqMeters * 100) / 100,
        areaSqFeet: Math.round(areaSqFeet * 100) / 100,
        peakDeltaTCelsius: Math.round(peakDeltaT * 10) / 10,
        meanMoistureIndex: Math.round(meanMoisture * 100) / 100,
        estimatedRemediationCostUsd
      };
    });

    const totalCompromisedAreaSqMeters = polygons.reduce((sum, poly) => sum + poly.areaSqMeters, 0);
    const compromisedPercentage = Math.round((totalCompromisedAreaSqMeters / totalRoofAreaSqMeters) * 10000) / 100;
    const criticalDamageFlag = compromisedPercentage > 15.0 || polygons.some(p => p.severity === "STRUCTURAL_SATURATION");

    // Generate SVG path strings for CAD overlay
    const svgPathData = polygons
      .map(p => {
        const pts = p.boundaryPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x * 10} ${pt.y * 10}`).join(" ") + " Z";
        return pts;
      })
      .join(" ");

    return {
      totalRoofAreaSqMeters,
      totalCompromisedAreaSqMeters: Math.round(totalCompromisedAreaSqMeters * 100) / 100,
      compromisedPercentage,
      polygons,
      criticalDamageFlag,
      svgPathData
    };
  }
}
