/**
 * bridge-deck-gpr-velocity-analyzer.ts
 * SNAP-82: Bridge Deck Reinforcing Steel Cover Depth GPR Wave Velocity Analyzer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & 3D Diagnostics.
 *
 * Ground Penetrating Radar (GPR) bridge deck assessment (ASTM D6087 / AASHTO):
 * 1. Computes electromagnetic wave velocity from concrete dielectric permittivity: v = c / sqrt(er).
 * 2. Calculates top rebar mat cover depth from two-way travel time: d = (v * t) / 2.
 * 3. Identifies shallow reinforcement (< design cover) vulnerable to freeze-thaw cracking.
 * 4. Detects high dielectric chloride intrusion and asphalt-concrete interface delaminations.
 */

export interface GprBridgeDeckScan {
  scanId: string;
  bridgeComponent: string;
  dielectricPermittivity: number; // Er (typical dry concrete: 6-9, wet/saline: > 10)
  twoWayTravelTimeNs: number;     // TWTT in nanoseconds
  minDesignCoverMm: number;       // AASHTO design cover (e.g., 50mm / 2.0 in)
  reflectionAmplitudeDb: number;  // Relative top rebar reflection amplitude
}

export interface GprDeckAnalysisVerdict {
  scanId: string;
  calculatedVelocityMmPerNs: number;
  calculatedCoverDepthMm: number;
  isCompliant: boolean;
  status: 'REBAR_COVER_DEPTH_AASHTO_COMPLIANT' | 'INADEQUATE_COVER_CORROSION_RISK' | 'CHLORIDE_INTRUSION_DELAMINATION_ALERT';
  structuralAssessment: string;
}

export class BridgeDeckGprVelocityAnalyzer {
  private static SPEED_OF_LIGHT_MM_NS = 300.0; // 300 mm/ns (0.3 m/ns)

  public static analyzeDeckScan(scan: GprBridgeDeckScan): GprDeckAnalysisVerdict {
    // 1. Radar propagation velocity: v = c / sqrt(Er)
    const er = Math.max(1.0, scan.dielectricPermittivity);
    const velocity = clsRound(this.SPEED_OF_LIGHT_MM_NS / Math.sqrt(er), 1);

    // 2. Cover depth: d = (v * t) / 2
    const depthMm = clsRound((velocity * scan.twoWayTravelTimeNs) / 2.0, 1);

    // 3. Delamination / Chloride Salt Intrusion check (ASTM D6087)
    // Saturated saline concrete has Er >= 12 or severe attenuation (reflection < -14 dB)
    if (er >= 11.5 || scan.reflectionAmplitudeDb < -14.0) {
      return {
        scanId: scan.scanId,
        calculatedVelocityMmPerNs: velocity,
        calculatedCoverDepthMm: depthMm,
        isCompliant: false,
        status: 'CHLORIDE_INTRUSION_DELAMINATION_ALERT',
        structuralAssessment: `DELAMINATION RISK: High dielectric permittivity (${er}) or severe radar attenuation (${scan.reflectionAmplitudeDb} dB) indicates moisture/chloride salt intrusion and rebar oxidation (ASTM D6087).`
      };
    }

    // 4. Inadequate cover check
    if (depthMm < scan.minDesignCoverMm * 0.90) {
      return {
        scanId: scan.scanId,
        calculatedVelocityMmPerNs: velocity,
        calculatedCoverDepthMm: depthMm,
        isCompliant: false,
        status: 'INADEQUATE_COVER_CORROSION_RISK',
        structuralAssessment: `INSUFFICIENT COVER: Measured rebar cover (${depthMm}mm) is below AASHTO minimum (${scan.minDesignCoverMm}mm). High carbonation and deicing salt penetration risk.`
      };
    }

    return {
      scanId: scan.scanId,
      calculatedVelocityMmPerNs: velocity,
      calculatedCoverDepthMm: depthMm,
      isCompliant: true,
      status: 'REBAR_COVER_DEPTH_AASHTO_COMPLIANT',
      structuralAssessment: `AASHTO COMPLIANT: Measured cover of ${depthMm}mm meets design specifications (${scan.minDesignCoverMm}mm) with sound dielectric baseline (${er}).`
    };
  }
}

function clsRound(num: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(num * f) / f;
}
