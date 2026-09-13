/**
 * SNAP-43: Subsurface Cavity & Ground Subsidence Volumetric Radar Tomography Exporter
 * Complies with ASTM D6432 standards for ground-penetrating radar subsurface investigations.
 * Detects underground voids, sinkholes, and structural soil subsidence zones.
 * Exports 3D Wavefront OBJ isosurfaces, GeoJSON depth contours, and geotechnical CAD ASCII XYZ.
 */

export interface VoxelSample {
  x: number; // meters from origin
  y: number; // meters from origin
  z: number; // depth below surface (positive downwards in meters)
  relativePermittivity: number; // dielectric constant (air ~1.0, water ~80, dry sand ~3-5, saturated soil ~20-30)
  signalAmplitude: number; // dB reflection amplitude
}

export interface SubsurfaceTomographySurvey {
  surveyId: string;
  locationName: string;
  gridDimensions: {
    lengthMeters: number;
    widthMeters: number;
    maxDepthMeters: number;
  };
  foundationDepthMeters: number; // depth of building footing or pavement sub-base
  voxels: VoxelSample[];
}

export type SubsidenceRiskTier =
  | 'CRITICAL_COLLAPSE_IMMINENT'
  | 'HIGH_RISK_SUBSIDENCE'
  | 'MODERATE_SETTLEMENT'
  | 'STABLE_ACCEPTABLE';

export interface DetectedCavity {
  cavityId: string;
  centroid: [number, number, number]; // [x, y, depth_z]
  volumeCubicMeters: number;
  minDepthMeters: number;
  maxDepthMeters: number;
  apparentDielectric: number;
  riskTier: SubsidenceRiskTier;
  recommendedRemediation: string;
}

export interface TomographyAnalysisReport {
  surveyId: string;
  totalVolumeScannedM3: number;
  detectedCavities: DetectedCavity[];
  overallRiskTier: SubsidenceRiskTier;
  structuralUnderpinningRequired: boolean;
  exportedObjMesh: string;
  exportedGeoJson: Record<string, any>;
  exportedAsciiXyz: string;
}

export class SubsurfaceCavityTomographyExporter {
  public static analyzeAndExport(survey: SubsurfaceTomographySurvey): TomographyAnalysisReport {
    const { lengthMeters, widthMeters, maxDepthMeters } = survey.gridDimensions;
    const totalVolume = lengthMeters * widthMeters * maxDepthMeters;

    // Filter voxels matching air-filled or decompressed void profile:
    // Air has relativePermittivity <= 2.2 with high-amplitude negative impedance reflection
    const voidVoxels = survey.voxels.filter(
      v => v.relativePermittivity <= 2.2 && Math.abs(v.signalAmplitude) >= 15.0
    );

    // Group adjacent void voxels into cavities (simple spatial clustering within 0.5m radius)
    const clusters: VoxelSample[][] = [];
    const visited = new Set<number>();

    for (let i = 0; i < voidVoxels.length; i++) {
      if (visited.has(i)) continue;
      const cluster: VoxelSample[] = [voidVoxels[i]];
      visited.add(i);

      for (let j = i + 1; j < voidVoxels.length; j++) {
        if (visited.has(j)) continue;
        const v1 = voidVoxels[i];
        const v2 = voidVoxels[j];
        const dist = Math.hypot(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
        if (dist <= 0.6) {
          cluster.push(v2);
          visited.add(j);
        }
      }
      clusters.push(cluster);
    }

    const detectedCavities: DetectedCavity[] = clusters.map((cluster, idx) => {
      const n = cluster.length;
      const sumX = cluster.reduce((acc, v) => acc + v.x, 0);
      const sumY = cluster.reduce((acc, v) => acc + v.y, 0);
      const sumZ = cluster.reduce((acc, v) => acc + v.z, 0);
      const sumPerm = cluster.reduce((acc, v) => acc + v.relativePermittivity, 0);

      const centroid: [number, number, number] = [
        Number((sumX / n).toFixed(2)),
        Number((sumY / n).toFixed(2)),
        Number((sumZ / n).toFixed(2)),
      ];

      const minZ = Math.min(...cluster.map(v => v.z));
      const maxZ = Math.max(...cluster.map(v => v.z));

      // Approximate volume: each sampled voxel represents roughly 0.05m^3
      const volumeM3 = Number(Math.max(0.05, cluster.length * 0.05).toFixed(3));
      const avgPerm = Number((sumPerm / n).toFixed(2));

      // Risk determination:
      // Distance from foundation footing
      const footingClearance = minZ - survey.foundationDepthMeters;

      let risk: SubsidenceRiskTier = 'STABLE_ACCEPTABLE';
      let remediation = 'Routine monitoring per ASTM D6432 biennial schedule.';

      if (footingClearance <= 0.8 && volumeM3 >= 1.0) {
        risk = 'CRITICAL_COLLAPSE_IMMINENT';
        remediation = 'Emergency pressure-grouting and micro-pile underpinning required immediately.';
      } else if (footingClearance <= 2.0 && volumeM3 >= 0.3) {
        risk = 'HIGH_RISK_SUBSIDENCE';
        remediation = 'Polyurethane void foam injection and soil compaction grouting within 30 days.';
      } else if (volumeM3 >= 0.1) {
        risk = 'MODERATE_SETTLEMENT';
        remediation = 'Install surface settlement tiltmeters and re-scan post-heavy precipitation.';
      }

      return {
        cavityId: `VOID-${String(idx + 1).padStart(3, '0')}`,
        centroid,
        volumeCubicMeters: volumeM3,
        minDepthMeters: minZ,
        maxDepthMeters: maxZ,
        apparentDielectric: avgPerm,
        riskTier: risk,
        recommendedRemediation: remediation,
      };
    });

    // Determine overall project risk
    let overallRisk: SubsidenceRiskTier = 'STABLE_ACCEPTABLE';
    if (detectedCavities.some(c => c.riskTier === 'CRITICAL_COLLAPSE_IMMINENT')) {
      overallRisk = 'CRITICAL_COLLAPSE_IMMINENT';
    } else if (detectedCavities.some(c => c.riskTier === 'HIGH_RISK_SUBSIDENCE')) {
      overallRisk = 'HIGH_RISK_SUBSIDENCE';
    } else if (detectedCavities.some(c => c.riskTier === 'MODERATE_SETTLEMENT')) {
      overallRisk = 'MODERATE_SETTLEMENT';
    }

    const underpinning = overallRisk === 'CRITICAL_COLLAPSE_IMMINENT' || overallRisk === 'HIGH_RISK_SUBSIDENCE';

    // Export 3D Wavefront OBJ
    const objLines = [
      `# SnapInspect Subsurface Cavity Tomography Mesh`,
      `# Survey: ${survey.surveyId}`,
      `# Cavities Found: ${detectedCavities.length}`,
      `o Subsurface_Cavities`,
    ];

    let vertexOffset = 1;
    for (const cavity of detectedCavities) {
      const [cx, cy, cz] = cavity.centroid;
      const r = Math.cbrt((3 * cavity.volumeCubicMeters) / (4 * Math.PI));

      // 8 cube bounding vertices around centroid
      objLines.push(`v ${cx - r} ${cy - r} ${-cz}`);
      objLines.push(`v ${cx + r} ${cy - r} ${-cz}`);
      objLines.push(`v ${cx + r} ${cy + r} ${-cz}`);
      objLines.push(`v ${cx - r} ${cy + r} ${-cz}`);
      objLines.push(`v ${cx - r} ${cy - r} ${-cz - r}`);
      objLines.push(`v ${cx + r} ${cy - r} ${-cz - r}`);
      objLines.push(`v ${cx + r} ${cy + r} ${-cz - r}`);
      objLines.push(`v ${cx - r} ${cy + r} ${-cz - r}`);

      // 6 faces
      const v = vertexOffset;
      objLines.push(`f ${v} ${v + 1} ${v + 2} ${v + 3}`);
      objLines.push(`f ${v + 4} ${v + 5} ${v + 6} ${v + 7}`);
      objLines.push(`f ${v} ${v + 1} ${v + 5} ${v + 4}`);
      objLines.push(`f ${v + 2} ${v + 3} ${v + 7} ${v + 6}`);
      objLines.push(`f ${v + 1} ${v + 2} ${v + 6} ${v + 5}`);
      objLines.push(`f ${v + 3} ${v} ${v + 4} ${v + 7}`);

      vertexOffset += 8;
    }

    // Export GeoJSON
    const geoJson = {
      type: 'FeatureCollection',
      features: detectedCavities.map(c => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [c.centroid[0], c.centroid[1], -c.centroid[2]],
        },
        properties: {
          cavityId: c.cavityId,
          volumeM3: c.volumeCubicMeters,
          depthMeters: c.centroid[2],
          riskTier: c.riskTier,
          remediation: c.recommendedRemediation,
        },
      })),
    };

    // Export ASCII XYZ (for Civil3D / AutoCAD geotechnical import)
    const asciiXyz = voidVoxels
      .map(v => `${v.x.toFixed(3)} ${v.y.toFixed(3)} ${(-v.z).toFixed(3)} ${v.relativePermittivity.toFixed(2)}`)
      .join('\n');

    return {
      surveyId: survey.surveyId,
      totalVolumeScannedM3: totalVolume,
      detectedCavities,
      overallRiskTier: overallRisk,
      structuralUnderpinningRequired: underpinning,
      exportedObjMesh: objLines.join('\n'),
      exportedGeoJson: geoJson,
      exportedAsciiXyz: asciiXyz,
    };
  }
}
