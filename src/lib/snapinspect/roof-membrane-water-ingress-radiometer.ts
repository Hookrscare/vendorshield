/**
 * roof-membrane-water-ingress-radiometer.ts
 * SNAP-79: Multi-Spectral Roof Ponding & Membrane Water Ingress Microwave Radiometer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & 3D Diagnostics.
 *
 * Low-slope commercial roofing moisture and ponding analyzer (ASTM D7954 / NRCA Guidelines):
 * 1. Analyzes subsurface microwave radiometric moisture readings and standing ponding depths.
 * 2. Identifies chronic ponding exceeding NRCA 48-hour drain thresholds.
 * 3. Quantifies polyisocyanurate / mineral wool insulation core saturation.
 * 4. Flags structural substrate delamination and water entrapment risks.
 */

export interface RoofMoistureProbe {
  roofSectionId: string;
  membraneType: 'EPDM' | 'TPO' | 'PVC' | 'MOD_BIT' | 'BUILT_UP';
  moistureIndex: number; // 0 - 100
  pondingDepthMm: number;
  pondingDurationHours: number;
}

export interface RoofIngressVerdict {
  roofSectionId: string;
  isAcceptable: boolean;
  ingressSeverity: 'NOMINAL' | 'MODERATE' | 'CRITICAL';
  status: 'ROOF_MEMBRANE_DRY_COMPLIANT' | 'CHRONIC_PONDING_WATER_DEFECT' | 'SUBSTRATE_INSULATION_SATURATED_INGRESS' | 'CRITICAL_DELAMINATION_STRUCTURAL_RISK';
  remedialAction: string;
}

export class RoofMembraneWaterIngressRadiometer {
  public static evaluateRoofMoisture(probe: RoofMoistureProbe): RoofIngressVerdict {
    const isPondingExceeded = probe.pondingDepthMm > 10.0 && probe.pondingDurationHours > 48.0;
    const isSubstrateSaturated = probe.moistureIndex >= 65.0;

    if (isPondingExceeded && isSubstrateSaturated) {
      return {
        roofSectionId: probe.roofSectionId,
        isAcceptable: false,
        ingressSeverity: 'CRITICAL',
        status: 'CRITICAL_DELAMINATION_STRUCTURAL_RISK',
        remedialAction: 'CRITICAL: Severe ponding water combined with substrate insulation saturation. Immediate core sampling, vacuum dewatering, and drain installation required.'
      };
    }

    if (isSubstrateSaturated) {
      return {
        roofSectionId: probe.roofSectionId,
        isAcceptable: false,
        ingressSeverity: 'CRITICAL',
        status: 'SUBSTRATE_INSULATION_SATURATED_INGRESS',
        remedialAction: 'Subsurface insulation core saturated (>65% moisture index). Membrane breach detected; replace damaged wet polyiso insulation boards.'
      };
    }

    if (isPondingExceeded) {
      return {
        roofSectionId: probe.roofSectionId,
        isAcceptable: false,
        ingressSeverity: 'MODERATE',
        status: 'CHRONIC_PONDING_WATER_DEFECT',
        remedialAction: `Chronic ponding water (${probe.pondingDepthMm}mm lasting ${probe.pondingDurationHours}h) violates NRCA 48-hour drain rule. Install tapered insulation crickets or auxiliary scupper drains.`
      };
    }

    return {
      roofSectionId: probe.roofSectionId,
      isAcceptable: true,
      ingressSeverity: 'NOMINAL',
      status: 'ROOF_MEMBRANE_DRY_COMPLIANT',
      remedialAction: 'Roof membrane and substrate demonstrate acceptable dryness levels.'
    };
  }
}
