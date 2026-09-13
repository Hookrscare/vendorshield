/**
 * SNAP-75: Subsea Pipeline Flexible Riser Annulus Hydrogen Induced Cracking (HIC) Ultrasonic Profiler
 * 
 * Analyzes ultrasonic phased-array shear wave reflections across subsea flexible riser tensile armor wires
 * to detect sour gas (H2S) hydrogen induced micro-delamination cracking according to NACE TM0284 standards.
 */

export interface ArmorWireUltrasonicScan {
  riserSectionId: string;
  waterDepthMeters: number; // e.g. 1400m
  nominalWireThicknessMm: number; // e.g. 6.0 mm
  wireWidthMm: number; // e.g. 12.0 mm
  h2sPartialPressureKpa: number; // e.g. 15 kPa
  ultrasonicEchoesMm: number[]; // Flaw echo depths detected within wire body
  flawLengthsMm: number[]; // Measured length of each delamination flaw
}

export interface HicAssessmentResult {
  crackLengthRatioPct: number; // CLR = sum(a) / W * 100%
  crackThicknessRatioPct: number; // CTR = sum(b) / T * 100%
  maxSingleCrackLengthMm: number;
  naceTm0284Compliance: 'PASS' | 'MARGINAL_ACCEPTANCE' | 'NON_COMPLIANT_FAILURE';
  tensileIntegrityStatus: 'INTACT' | 'DEGRADED_LOAD_CAPACITY' | 'CRITICAL_RUPTURE_RISK';
  recommendedAction: string;
}

export class SubseaFlexibleRiserAnnulusHicUltrasonicProfiler {
  /**
   * Assesses HIC / SSC damage severity in flexible riser armor wires from PAUT ultrasonic telemetry.
   */
  public evaluateArmorWireHic(scan: ArmorWireUltrasonicScan): HicAssessmentResult {
    if (scan.nominalWireThicknessMm <= 0 || scan.wireWidthMm <= 0) {
      throw new Error('Invalid wire geometry: thickness and width must be strictly positive.');
    }

    const flaws = scan.flawLengthsMm || [];
    const totalCrackLength = flaws.reduce((acc, len) => acc + len, 0);
    const maxCrackLength = flaws.length > 0 ? Math.max(...flaws) : 0.0;

    // In NACE TM0284:
    // CLR = (sum(crack lengths) / Section Width) * 100%
    const clr = Math.min(100.0, (totalCrackLength / scan.wireWidthMm) * 100.0);

    // CTR = (flaw depth span / Thickness) * 100%
    let ctr = 0.0;
    if (scan.ultrasonicEchoesMm.length > 0) {
      const minDepth = Math.min(...scan.ultrasonicEchoesMm);
      const maxDepth = Math.max(...scan.ultrasonicEchoesMm);
      const crackThicknessSpan = Math.max(0.1, maxDepth - minDepth);
      ctr = Math.min(100.0, (crackThicknessSpan / scan.nominalWireThicknessMm) * 100.0);
    }

    let compliance: 'PASS' | 'MARGINAL_ACCEPTANCE' | 'NON_COMPLIANT_FAILURE' = 'PASS';
    let integrity: 'INTACT' | 'DEGRADED_LOAD_CAPACITY' | 'CRITICAL_RUPTURE_RISK' = 'INTACT';
    let action = 'Nominal riser condition. Retain standard 12-month inspection interval.';

    // NACE TM0284 threshold criteria: CLR <= 15%, CTR <= 5%
    if (clr > 15.0 || ctr > 5.0 || maxCrackLength > 2.0) {
      if (clr > 30.0 || maxCrackLength > 4.0) {
        compliance = 'NON_COMPLIANT_FAILURE';
        integrity = 'CRITICAL_RUPTURE_RISK';
        action = 'Immediate riser depressurization and emergency annulus vacuum de-watering required.';
      } else {
        compliance = 'MARGINAL_ACCEPTANCE';
        integrity = 'DEGRADED_LOAD_CAPACITY';
        action = 'Shorten inspection interval to 3 months; inject corrosion inhibitor into riser annulus.';
      }
    }

    return {
      crackLengthRatioPct: Math.round(clr * 10) / 10,
      crackThicknessRatioPct: Math.round(ctr * 10) / 10,
      maxSingleCrackLengthMm: Math.round(maxCrackLength * 10) / 10,
      naceTm0284Compliance: compliance,
      tensileIntegrityStatus: integrity,
      recommendedAction: action,
    };
  }
}
