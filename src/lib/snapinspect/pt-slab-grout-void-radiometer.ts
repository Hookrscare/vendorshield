/**
 * pt-slab-grout-void-radiometer.ts
 * SNAP-81: Post-Tensioned Concrete Slab Tendon Void Grout Density Gamma Radiometer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & 3D Diagnostics.
 *
 * Post-tensioned (PT) structural slab internal tendon duct evaluation (ACI 318 / PTI DC35.1):
 * 1. Measures radiometric gamma backscatter density profiles across PT tendon profiles.
 * 2. Detects grout voids, honeycombing, and bleed water pockets inside metal/plastic ducts.
 * 3. Identifies exposed seven-wire steel strands prone to moisture-induced stress corrosion cracking.
 * 4. Issues structural repair alerts for vacuum grouting intervention.
 */

export interface PtDuctScanMeasurement {
  ductId: string;
  slabElevation: string;
  tendonType: 'MONOSTRAND' | 'MULTI_STRAND_BONDED';
  averageDensityGcm3: number;
  attenuationVariancePct: number;
  voidLengthMm: number;
}

export interface PtDuctIntegrityVerdict {
  ductId: string;
  isAcceptable: boolean;
  status: 'DUCT_GROUT_SOLID_PASS' | 'MINOR_BLEED_WATER_VOID_MONITOR' | 'CRITICAL_TENDON_CORROSION_VOID_FAIL';
  corrosionRiskRating: 'NEGLIGIBLE' | 'MODERATE' | 'HIGH';
  remediationAdvice: string;
}

export class PtSlabGroutVoidRadiometer {
  public static evaluateDuctIntegrity(scan: PtDuctScanMeasurement): PtDuctIntegrityVerdict {
    // Critical void: low density or large void length
    if (scan.averageDensityGcm3 < 1.65 || scan.voidLengthMm > 150 || scan.attenuationVariancePct > 20.0) {
      return {
        ductId: scan.ductId,
        isAcceptable: false,
        status: 'CRITICAL_TENDON_CORROSION_VOID_FAIL',
        corrosionRiskRating: 'HIGH',
        remediationAdvice: `CRITICAL TENDON VOID: Average density ${scan.averageDensityGcm3} g/cm3 with ${scan.voidLengthMm}mm void gap. Strand exposed to atmospheric moisture. Urgent vacuum grout injection required (PTI DC35.1).`
      };
    }

    // Minor bleed water void
    if (scan.averageDensityGcm3 < 2.15 || scan.attenuationVariancePct > 8.0 || scan.voidLengthMm > 30) {
      return {
        ductId: scan.ductId,
        isAcceptable: true,
        status: 'MINOR_BLEED_WATER_VOID_MONITOR',
        corrosionRiskRating: 'MODERATE',
        remediationAdvice: `MINOR VOID DETECTED: Density ${scan.averageDensityGcm3} g/cm3 with ${scan.voidLengthMm}mm air pocket. Non-critical bleed water settlement. Log for annual inspection.`
      };
    }

    // Solidly grouted
    return {
      ductId: scan.ductId,
      isAcceptable: true,
      status: 'DUCT_GROUT_SOLID_PASS',
      corrosionRiskRating: 'NEGLIGIBLE',
      remediationAdvice: `FULLY GROUTED: Tendon duct solidly consolidated (${scan.averageDensityGcm3} g/cm3, variance ${scan.attenuationVariancePct}%). ACI 318 compliant.`
    };
  }
}
