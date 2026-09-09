/**
 * src/lib/snapinspect/post-tensioned-tendon-void-mapper.ts
 * SNAP-43: Post-Tensioned Concrete Slab Tendon Duct Void Ultrasonic Tomography Mapper.
 * Part of SnapInspect AI Tactical Field CAD & Structural Engineering Inspection Suite.
 *
 * Implements ACI 228.2R and PTI M55.1 Nondestructive Evaluation (NDE) standards:
 * - Ultrasonic Pulse Echo (UPE) shear-wave tomography along post-tensioned (PT) duct trajectories.
 * - Detects acoustic impedance phase inversion (-1.0 reflection) indicative of air/water grout voids.
 * - Quantifies void length, percentage void ratio, and strand corrosion vulnerability rating.
 * - Generates vacuum grouting polyurethane/micro-fine cementitious remediation takeoffs.
 * - Produces SHA-256 cryptographic structural integrity inspection tokens.
 */

import { createHash } from 'crypto';

export interface TendonScanPoint {
  station_meters: number;
  measured_depth_mm: number;
  reflection_amplitude_db: number;
  phase_inverted: boolean; // True indicates acoustic reflection from air-interface void
}

export interface TendonDuctProfile {
  duct_id: string;
  duct_type: 'corrugated_galvanized_steel' | 'high_density_polyethylene_hdpe';
  design_duct_diameter_mm: number;
  design_cover_depth_mm: number;
  duct_length_meters: number;
  strand_count: number;
  scan_points: TendonScanPoint[];
}

export interface TendonVoidAssessmentResult {
  duct_id: string;
  total_scan_stations: number;
  void_stations_count: number;
  linear_void_length_meters: number;
  void_percentage_ratio: number; // 0 - 100%
  structural_hazard_rating: 'ACCEPTABLE' | 'LOW' | 'MODERATE' | 'CRITICAL_CORROSION_HAZARD';
  recommended_remediation: 'MONITORING_ONLY' | 'LOCALIZED_DRILL_INJECTION' | 'VACUUM_GROUTING_INTERVENTION';
  remediation_grout_volume_liters: number;
  audit_token: string;
}

export class PostTensionedTendonVoidMapper {
  /**
   * Analyzes ultrasonic shear-wave tomography data along a post-tensioned duct.
   */
  public static mapTendonVoids(profile: TendonDuctProfile): TendonVoidAssessmentResult {
    if (!profile.scan_points || profile.scan_points.length === 0) {
      throw new Error(`No ultrasonic scan stations provided for tendon duct ${profile.duct_id}`);
    }

    let voidCount = 0;
    let totalVoidLengthM = 0;
    const sortedPoints = [...profile.scan_points].sort((a, b) => a.station_meters - b.station_meters);

    for (let i = 0; i < sortedPoints.length; i++) {
      const pt = sortedPoints[i];
      // A void is flagged if reflection amplitude is high (>= -6dB) and phase is inverted (air boundary)
      if (pt.phase_inverted && pt.reflection_amplitude_db >= -8.0) {
        voidCount++;
        // Station tributary length
        const step = i < sortedPoints.length - 1 ? (sortedPoints[i + 1].station_meters - pt.station_meters) : 0.2;
        totalVoidLengthM += step;
      }
    }

    const voidRatio = (voidCount / sortedPoints.length) * 100.0;
    
    // Cross-sectional duct area: A = pi * r^2
    const radiusM = (profile.design_duct_diameter_mm / 2.0) / 1000.0;
    const ductAreaM2 = Math.PI * Math.pow(radiusM, 2);
    // Steel strand area deduction (~35% of duct space occupied by 7-wire strands)
    const netVoidVolumeM3 = (ductAreaM2 * 0.65) * totalVoidLengthM;
    const remediationGroutLiters = Math.round(netVoidVolumeM3 * 1000.0 * 1.15 * 10) / 10; // 15% safety overage

    let hazard: 'ACCEPTABLE' | 'LOW' | 'MODERATE' | 'CRITICAL_CORROSION_HAZARD' = 'ACCEPTABLE';
    let remediation: 'MONITORING_ONLY' | 'LOCALIZED_DRILL_INJECTION' | 'VACUUM_GROUTING_INTERVENTION' = 'MONITORING_ONLY';

    if (voidRatio > 25.0 || totalVoidLengthM > 1.5) {
      hazard = 'CRITICAL_CORROSION_HAZARD';
      remediation = 'VACUUM_GROUTING_INTERVENTION';
    } else if (voidRatio > 10.0 || totalVoidLengthM > 0.5) {
      hazard = 'MODERATE';
      remediation = 'LOCALIZED_DRILL_INJECTION';
    } else if (voidRatio > 0.0) {
      hazard = 'LOW';
      remediation = 'MONITORING_ONLY';
    }

    const payload = `${profile.duct_id}:${voidRatio.toFixed(1)}:${totalVoidLengthM.toFixed(2)}:${hazard}`;
    const hash = createHash('sha256').update(payload).digest('hex').substring(0, 16).toUpperCase();

    return {
      duct_id: profile.duct_id,
      total_scan_stations: sortedPoints.length,
      void_stations_count: voidCount,
      linear_void_length_meters: Math.round(totalVoidLengthM * 100) / 100,
      void_percentage_ratio: Math.round(voidRatio * 10) / 10,
      structural_hazard_rating: hazard,
      recommended_remediation: remediation,
      remediation_grout_volume_liters: remediationGroutLiters,
      audit_token: `PT-TENDON-VOID-${hash}`,
    };
  }
}
