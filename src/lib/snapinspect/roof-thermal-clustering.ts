/**
 * SNAP-24: Drone Orthophoto Building Envelope Roof Thermal Anomaly Clustering Engine.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Thermal Suite.
 * Standards: ASTM C1153 (Location of Wet Insulation in Roofing Systems Using Infrared Imaging).
 * Performs spatial clustering (DBSCAN-based) across drone thermal orthophoto grid points,
 * classifies thermal anomaly etiologies (moisture entrapment, thermal bridging, air leaks),
 * calculates affected square footage, and evaluates patch vs. full-tear-off thresholds.
 */

import { createHash } from 'crypto';

export type AnomalyClassification =
  | 'MOISTURE_ENTRAPMENT'
  | 'AIR_EXFILTRATION_LEAK'
  | 'INSULATION_DEGRADATION'
  | 'HVAC_PLUME_INTERFERENCE'
  | 'NORMAL_SURFACE';

export type AnomalySeverity = 'NEGLIGIBLE' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export interface ThermalPoint {
  id: string;
  xMeters: number;
  yMeters: number;
  temperatureCelsius: number;
}

export interface ThermalCluster {
  clusterId: number;
  classification: AnomalyClassification;
  severity: AnomalySeverity;
  pointCount: number;
  centroid: { xMeters: number; yMeters: number };
  boundingBox: { minX: number; maxX: number; minY: number; maxY: number };
  estimatedAreaSqMeters: number;
  peakDeltaTCelsius: number;
  avgDeltaTCelsius: number;
  points: ThermalPoint[];
}

export interface ThermalSurveyInput {
  surveyId: string;
  roofTotalAreaSqMeters: number;
  ambientTemperatureCelsius: number;
  dryRoofBaselineCelsius: number;
  points: ThermalPoint[];
  spatialResolutionMeters?: number; // spacing per grid point, e.g. 0.5m -> 0.25 m^2 per point
  clusterDistanceEpsilonMeters?: number; // clustering radius
  minPointsPerCluster?: number;
}

export interface RoofThermalSurveyReport {
  surveyId: string;
  generatedAt: string;
  totalPointsAudited: number;
  ambientTemperatureCelsius: number;
  dryRoofBaselineCelsius: number;
  clusters: ThermalCluster[];
  totalCompromisedAreaSqMeters: number;
  percentRoofCompromised: number;
  astmC1153ReplacementRecommended: boolean; // >= 25% compromised triggers full roof replacement
  recommendedAction: string;
  immutableManifestHash: string;
}

export class RoofThermalClusteringEngine {
  public static analyzeSurvey(input: ThermalSurveyInput): RoofThermalSurveyReport {
    const {
      surveyId,
      roofTotalAreaSqMeters,
      ambientTemperatureCelsius,
      dryRoofBaselineCelsius,
      points,
      spatialResolutionMeters = 0.5,
      clusterDistanceEpsilonMeters = 1.2,
      minPointsPerCluster = 3,
    } = input;

    if (roofTotalAreaSqMeters <= 0) {
      throw new Error('Roof total area must be greater than zero.');
    }

    if (points.length === 0) {
      return {
        surveyId,
        generatedAt: new Date().toISOString(),
        totalPointsAudited: 0,
        ambientTemperatureCelsius,
        dryRoofBaselineCelsius,
        clusters: [],
        totalCompromisedAreaSqMeters: 0,
        percentRoofCompromised: 0,
        astmC1153ReplacementRecommended: false,
        recommendedAction: 'No thermal data provided for analysis.',
        immutableManifestHash: createHash('sha256').update('EMPTY_SURVEY').digest('hex'),
      };
    }

    const areaPerPoint = spatialResolutionMeters * spatialResolutionMeters;

    // Filter points exhibiting significant thermal Delta-T (>= 2.0 C above baseline)
    const anomalyPoints = points.filter((p) => p.temperatureCelsius - dryRoofBaselineCelsius >= 2.0);

    // DBSCAN clustering over anomalyPoints
    const visited = new Set<string>();
    const assigned = new Set<string>();
    const clusters: ThermalCluster[] = [];
    let currentClusterId = 1;

    const getDistance = (p1: ThermalPoint, p2: ThermalPoint) => {
      const dx = p1.xMeters - p2.xMeters;
      const dy = p1.yMeters - p2.yMeters;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getNeighbors = (point: ThermalPoint) => {
      return anomalyPoints.filter((other) => getDistance(point, other) <= clusterDistanceEpsilonMeters);
    };

    for (const point of anomalyPoints) {
      if (visited.has(point.id)) continue;
      visited.add(point.id);

      const neighbors = getNeighbors(point);
      if (neighbors.length < minPointsPerCluster) {
        // Noise point (isolated slight hot-spot)
        continue;
      }

      // Start new cluster
      const clusterPoints: ThermalPoint[] = [point];
      assigned.add(point.id);

      const queue = [...neighbors.filter((n) => n.id !== point.id)];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (!visited.has(current.id)) {
          visited.add(current.id);
          const currentNeighbors = getNeighbors(current);
          if (currentNeighbors.length >= minPointsPerCluster) {
            queue.push(...currentNeighbors.filter((n) => !visited.has(n.id) && !queue.includes(n)));
          }
        }
        if (!assigned.has(current.id)) {
          assigned.add(current.id);
          clusterPoints.push(current);
        }
      }

      // Compute cluster metrics
      let sumX = 0;
      let sumY = 0;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let maxDeltaT = 0;
      let sumDeltaT = 0;

      for (const cp of clusterPoints) {
        sumX += cp.xMeters;
        sumY += cp.yMeters;
        if (cp.xMeters < minX) minX = cp.xMeters;
        if (cp.xMeters > maxX) maxX = cp.xMeters;
        if (cp.yMeters < minY) minY = cp.yMeters;
        if (cp.yMeters > maxY) maxY = cp.yMeters;

        const delta = cp.temperatureCelsius - dryRoofBaselineCelsius;
        if (delta > maxDeltaT) maxDeltaT = delta;
        sumDeltaT += delta;
      }

      const pointCount = clusterPoints.length;
      const avgDeltaT = sumDeltaT / pointCount;
      const estArea = Math.max(pointCount * areaPerPoint, (maxX - minX + 0.5) * (maxY - minY + 0.5));

      // Classify anomaly
      let classification: AnomalyClassification = 'INSULATION_DEGRADATION';
      if (avgDeltaT >= 5.0) {
        classification = 'AIR_EXFILTRATION_LEAK';
      } else if (avgDeltaT >= 3.0) {
        classification = 'MOISTURE_ENTRAPMENT';
      }

      // Severity rating
      let severity: AnomalySeverity = 'MODERATE';
      if (maxDeltaT >= 6.0 || estArea >= 50) {
        severity = 'CRITICAL';
      } else if (maxDeltaT >= 4.0 || estArea >= 20) {
        severity = 'SEVERE';
      }

      clusters.push({
        clusterId: currentClusterId++,
        classification,
        severity,
        pointCount,
        centroid: {
          xMeters: Number((sumX / pointCount).toFixed(2)),
          yMeters: Number((sumY / pointCount).toFixed(2)),
        },
        boundingBox: {
          minX: Number(minX.toFixed(2)),
          maxX: Number(maxX.toFixed(2)),
          minY: Number(minY.toFixed(2)),
          maxY: Number(maxY.toFixed(2)),
        },
        estimatedAreaSqMeters: Number(estArea.toFixed(2)),
        peakDeltaTCelsius: Number(maxDeltaT.toFixed(2)),
        avgDeltaTCelsius: Number(avgDeltaT.toFixed(2)),
        points: clusterPoints,
      });
    }

    // Sort clusters descending by severity / area
    clusters.sort((a, b) => b.estimatedAreaSqMeters - a.estimatedAreaSqMeters);

    const totalCompromisedAreaSqMeters = Number(
      clusters.reduce((acc, c) => acc + c.estimatedAreaSqMeters, 0).toFixed(2)
    );
    const percentRoofCompromised = Number(
      Math.min(100, (totalCompromisedAreaSqMeters / roofTotalAreaSqMeters) * 100).toFixed(2)
    );

    const astmC1153ReplacementRecommended = percentRoofCompromised >= 25.0;

    let recommendedAction = 'Envelope within acceptable thermal performance thresholds. No action required.';
    if (astmC1153ReplacementRecommended) {
      recommendedAction = `CRITICAL: ${percentRoofCompromised}% of roof envelope exceeds ASTM C1153 wet insulation threshold. Complete roof tear-off and re-cover recommended.`;
    } else if (clusters.length > 0) {
      recommendedAction = `Localized thermal anomalies detected (${clusters.length} clusters, ${totalCompromisedAreaSqMeters} m²). Target invasive core moisture sampling and patch membrane seams.`;
    }

    const manifestData = `${surveyId}:${totalCompromisedAreaSqMeters}:${percentRoofCompromised}:${clusters.length}`;
    const immutableManifestHash = createHash('sha256').update(manifestData).digest('hex');

    return {
      surveyId,
      generatedAt: new Date().toISOString(),
      totalPointsAudited: points.length,
      ambientTemperatureCelsius,
      dryRoofBaselineCelsius,
      clusters,
      totalCompromisedAreaSqMeters,
      percentRoofCompromised,
      astmC1153ReplacementRecommended,
      recommendedAction,
      immutableManifestHash,
    };
  }
}
