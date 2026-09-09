/**
 * SNAP-41: Structural Fire-Damaged Concrete Residual Compressive Strength Estimator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Structural Forensics Engine.
 *
 * Implements combined Non-Destructive Testing (NDT) co-evaluation (ASTM C597 Ultrasonic
 * Pulse Velocity + ASTM C805 Rebound Schmidt Hammer) to calculate in-situ residual compressive
 * strength (MPa) and structural load safety after high-temperature building fire events.
 */

export interface ConcreteInspectionPoint {
  pointId: string;
  transducerDistanceMeters: number;
  transitTimeMicroseconds: number;
  reboundNumber: number; // Schmidt hammer rebound index (10 - 60)
  visibleSpallingSeverity: "NONE" | "HAIRLINE_CRACKING" | "MODERATE_SPALLING" | "EXPOSED_REBAR";
}

export interface ConcreteStrengthAssessment {
  overallStructuralIntegrity: "SOUND" | "REPAIRABLE_SURFACE_DAMAGE" | "CRITICAL_COLLAPSE_RISK";
  averagePulseVelocityKmPerSec: number;
  averageEstimatedStrengthMpa: number;
  severelyDamagedLocations: string[];
  recommendedActions: string[];
}

export class FireDamagedConcreteStrengthEstimator {
  /**
   * Computes pulse velocity V = (d / t) * 10^3 km/s
   */
  public static computePulseVelocity(distanceMeters: number, timeMicroseconds: number): number {
    if (timeMicroseconds <= 0 || distanceMeters <= 0) return 0.0;
    return (distanceMeters / timeMicroseconds) * 1000.0; // km/s
  }

  /**
   * Calculates SonReb estimated compressive strength:
   * f'c (MPa) = 1.2 * (V)^1.4 * (R)^1.05
   */
  public static calculateSonRebStrength(velocityKmPerSec: number, reboundNumber: number): number {
    if (velocityKmPerSec <= 0 || reboundNumber <= 0) return 0.0;
    const est = 0.12 * Math.pow(velocityKmPerSec, 1.4) * Math.pow(reboundNumber, 1.05);
    return Math.round(est * 10) / 10;
  }

  public static assessStructuralDamage(points: ConcreteInspectionPoint[]): ConcreteStrengthAssessment {
    if (points.length === 0) {
      return {
        overallStructuralIntegrity: "SOUND",
        averagePulseVelocityKmPerSec: 0,
        averageEstimatedStrengthMpa: 0,
        severelyDamagedLocations: [],
        recommendedActions: ["No inspection sample points provided."]
      };
    }

    let totalVelocity = 0;
    let totalStrength = 0;
    const criticalLocations: string[] = [];
    const recommendations: string[] = [];

    for (const pt of points) {
      const v = this.computePulseVelocity(pt.transducerDistanceMeters, pt.transitTimeMicroseconds);
      const fc = this.calculateSonRebStrength(v, pt.reboundNumber);

      totalVelocity += v;
      totalStrength += fc;

      // ASTM C597 classification: V < 3.0 km/s indicates severe micro-cracking / dehydration
      if (v < 3.0 || fc < 15.0 || pt.visibleSpallingSeverity === "EXPOSED_REBAR") {
        criticalLocations.push(pt.pointId);
      }
    }

    const avgV = Math.round((totalVelocity / points.length) * 100) / 100;
    const avgFc = Math.round((totalStrength / points.length) * 10) / 10;

    let integrity: "SOUND" | "REPAIRABLE_SURFACE_DAMAGE" | "CRITICAL_COLLAPSE_RISK" = "SOUND";

    if (criticalLocations.length > points.length * 0.3 || avgFc < 18.0) {
      integrity = "CRITICAL_COLLAPSE_RISK";
      recommendations.push("IMMEDIATE SHORING REQUIRED: Residual compressive strength below structural safety factor.");
      recommendations.push("Prohibit occupancy until destructive core pull-out validation (ASTM C42) is performed.");
    } else if (criticalLocations.length > 0 || avgFc < 25.0) {
      integrity = "REPAIRABLE_SURFACE_DAMAGE";
      recommendations.push("Epoxy crack pressure injection and carbon fiber reinforced polymer (CFRP) jacketing recommended.");
    } else {
      recommendations.push("Concrete core matrix exhibits sound acoustic velocity. Clean soot and reapply fireproofing.");
    }

    return {
      overallStructuralIntegrity: integrity,
      averagePulseVelocityKmPerSec: avgV,
      averageEstimatedStrengthMpa: avgFc,
      severelyDamagedLocations: criticalLocations,
      recommendedActions: recommendations
    };
  }
}
