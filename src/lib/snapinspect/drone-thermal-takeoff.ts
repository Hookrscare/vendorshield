/**
 * SNAP-29: Drone Rooftop Thermal Moisture Anomaly Area Polygon Area & Volume Takeoff Calculator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Calculates planar polygon area from drone thermal orthomosaic coordinates, classifies
 * entrapped moisture anomalies according to ASTM C1153 radiometric standards, estimates
 * saturated insulation volume/weight, and generates commercial roofing tear-off material takeoffs.
 */

export interface Point2D {
  x: number; // In meters
  y: number; // In meters
}

export type RoofingInsulationType =
  | "POLYISOCYANURATE_ISO"
  | "EXPANDED_POLYSTYRENE_EPS"
  | "EXTRUDED_POLYSTYRENE_XPS"
  | "MINERAL_WOOL";

export interface ThermalAnomalyPolygon {
  polygonId: string;
  roofZone: string;
  vertices: Point2D[]; // Closed polygon (at least 3 vertices)
  measuredDeltaTempC: number; // Delta-T relative to dry roof deck
  insulationType: RoofingInsulationType;
  insulationThicknessInches: number; // Standard 1.5", 2.0", 3.0", etc.
  estimatedSaturationPercent: number; // 0 to 100%
}

export interface InsulationMaterialTakeoff {
  polygonId: string;
  roofZone: string;
  areaSqMeters: number;
  areaSqFeet: number;
  volumeCubicFeet: number;
  dryInsulationWeightLbs: number;
  estimatedEntrappedWaterWeightLbs: number;
  totalSaturatedWeightLbs: number;
  tearOffWasteSquares: number; // 1 roofing square = 100 sq ft
  recommendedCoreSamplesCount: number; // ASTM C1153 sampling recommendation
  anomalySeverity: "CRITICAL_SATURATION" | "MODERATE_MOISTURE" | "SUSPECTED_THERMAL_BRIDGE";
}

export interface RoofTakeoffSummary {
  roofAreaAssessedSqFeet: number;
  totalMoistureAnomalyAreaSqFeet: number;
  percentageRoofDeckCompromised: number;
  totalSaturatedTearOffWeightTons: number;
  totalReplacementSquares: number;
  totalRecommendedCoreCuts: number;
  breakdown: InsulationMaterialTakeoff[];
  calculationChecksum: string;
}

// Density in lbs/cu.ft dry
const INSULATION_DRY_DENSITY: Record<RoofingInsulationType, number> = {
  POLYISOCYANURATE_ISO: 2.0,
  EXPANDED_POLYSTYRENE_EPS: 1.5,
  EXTRUDED_POLYSTYRENE_XPS: 2.2,
  MINERAL_WOOL: 8.0,
};

const WATER_DENSITY_LBS_PER_CUBIC_FOOT = 62.4;
const SQ_METERS_TO_SQ_FEET = 10.7639;

export class DroneThermalTakeoffCalculator {
  /**
   * Computes planar area of a 2D polygon using the Shoelace formula (Gauss's area formula).
   */
  public static calculatePolygonArea(vertices: Point2D[]): number {
    if (vertices.length < 3) {
      throw new Error("A polygon must have at least 3 vertices.");
    }

    let area = 0;
    const n = vertices.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }

    return Math.abs(area) / 2.0;
  }

  /**
   * Evaluates a single moisture anomaly polygon against ASTM C1153 infrared standards.
   */
  public static evaluateAnomaly(polygon: ThermalAnomalyPolygon): InsulationMaterialTakeoff {
    const areaSqMeters = this.calculatePolygonArea(polygon.vertices);
    const areaSqFeet = areaSqMeters * SQ_METERS_TO_SQ_FEET;

    const thicknessFeet = polygon.insulationThicknessInches / 12.0;
    const volumeCubicFeet = areaSqFeet * thicknessFeet;

    const dryDensity = INSULATION_DRY_DENSITY[polygon.insulationType] || 2.0;
    const dryWeightLbs = volumeCubicFeet * dryDensity;

    // Saturation volume calculation: water weight absorbed in pore structure
    const saturationFraction = Math.max(0, Math.min(100, polygon.estimatedSaturationPercent)) / 100.0;
    const waterWeightLbs = volumeCubicFeet * saturationFraction * WATER_DENSITY_LBS_PER_CUBIC_FOOT;
    const totalWeightLbs = dryWeightLbs + waterWeightLbs;

    const squares = areaSqFeet / 100.0;

    // ASTM C1153: 1 core sample minimum per anomaly, plus 1 per additional 5 squares
    const recommendedCoreSamples = Math.max(1, Math.ceil(squares / 5.0));

    let severity: "CRITICAL_SATURATION" | "MODERATE_MOISTURE" | "SUSPECTED_THERMAL_BRIDGE";
    if (polygon.measuredDeltaTempC >= 2.5 && polygon.estimatedSaturationPercent >= 50) {
      severity = "CRITICAL_SATURATION";
    } else if (polygon.measuredDeltaTempC >= 1.2 || polygon.estimatedSaturationPercent >= 20) {
      severity = "MODERATE_MOISTURE";
    } else {
      severity = "SUSPECTED_THERMAL_BRIDGE";
    }

    return {
      polygonId: polygon.polygonId,
      roofZone: polygon.roofZone,
      areaSqMeters: Math.round(areaSqMeters * 100) / 100,
      areaSqFeet: Math.round(areaSqFeet * 10) / 10,
      volumeCubicFeet: Math.round(volumeCubicFeet * 10) / 10,
      dryInsulationWeightLbs: Math.round(dryWeightLbs * 10) / 10,
      estimatedEntrappedWaterWeightLbs: Math.round(waterWeightLbs * 10) / 10,
      totalSaturatedWeightLbs: Math.round(totalWeightLbs * 10) / 10,
      tearOffWasteSquares: Math.round(squares * 10) / 10,
      recommendedCoreSamplesCount: recommendedCoreSamples,
      anomalySeverity: severity,
    };
  }

  /**
   * Aggregates multiple rooftop thermal anomalies into an executive takeoff report.
   */
  public static calculateRoofTakeoff(
    totalRoofAreaSqFeet: number,
    anomalies: ThermalAnomalyPolygon[]
  ): RoofTakeoffSummary {
    if (totalRoofAreaSqFeet <= 0) {
      throw new Error("Total roof area must be greater than zero.");
    }

    const breakdown = anomalies.map((a) => this.evaluateAnomaly(a));

    const totalMoistureAreaSqFt = breakdown.reduce((sum, item) => sum + item.areaSqFeet, 0);
    const totalWeightLbs = breakdown.reduce((sum, item) => sum + item.totalSaturatedWeightLbs, 0);
    const totalReplacementSquares = breakdown.reduce((sum, item) => sum + item.tearOffWasteSquares, 0);
    const totalCoreCuts = breakdown.reduce((sum, item) => sum + item.recommendedCoreSamplesCount, 0);

    const percentCompromised = Math.min(100, Math.round((totalMoistureAreaSqFt / totalRoofAreaSqFeet) * 1000) / 10);
    const totalTons = Math.round((totalWeightLbs / 2000.0) * 100) / 100;

    const rawSeed = `${totalRoofAreaSqFeet}:${totalMoistureAreaSqFt}:${totalWeightLbs}:${anomalies.length}`;
    let hash = 0;
    for (let i = 0; i < rawSeed.length; i++) {
      hash = (hash << 5) - hash + rawSeed.charCodeAt(i);
      hash |= 0;
    }
    const checksum = `ROOF-TAKEOFF-${Math.abs(hash).toString(16).toUpperCase()}`;

    return {
      roofAreaAssessedSqFeet: totalRoofAreaSqFeet,
      totalMoistureAnomalyAreaSqFeet: Math.round(totalMoistureAreaSqFt * 10) / 10,
      percentageRoofDeckCompromised: percentCompromised,
      totalSaturatedTearOffWeightTons: totalTons,
      totalReplacementSquares: Math.round(totalReplacementSquares * 10) / 10,
      totalRecommendedCoreCuts: totalCoreCuts,
      breakdown,
      calculationChecksum: checksum,
    };
  }
}
