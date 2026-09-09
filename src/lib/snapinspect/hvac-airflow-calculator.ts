/**
 * SNAP-15: Multi-Sensor HVAC Static Pressure & Airflow Balancing Loss Calculator.
 * Computes Total External Static Pressure (TESP), blower fan CFM delivery,
 * CFM per ton ratios, and duct restriction airflow losses according to ACCA Manual D and ASHRAE standards.
 */

export type UnitOfPressure = "IN_WC" | "PASCALS"; // Inches of water column vs Pascals

export interface StaticPressureReadings {
  returnStaticPressureInWc: number; // typically negative, e.g. -0.28
  supplyStaticPressureInWc: number; // typically positive, e.g. +0.32
  filterPressureDropInWc?: number; // across filter
  coilPressureDropInWc?: number; // across indoor coil
}

export interface HVACSystemSpec {
  ratedCoolingTons: number; // e.g. 3.5 tons
  ratedCfmAtDesignTesp: number; // e.g. 1400 CFM
  maxDesignTespInWc: number; // e.g. 0.50 in. w.c.
  systemType: "RESIDENTIAL_SPLIT" | "COMMERCIAL_RTU" | "HEAT_PUMP";
}

export interface AirflowAssessmentResult {
  tespInWc: number;
  tespStatus: "NORMAL" | "ELEVATED_RESTRICTION" | "CRITICAL_OVERPRESSURE";
  deliveredCfm: number;
  cfmDeficit: number;
  airflowLossPercentage: number;
  cfmPerTon: number;
  cfmPerTonStatus: "NORMAL_BALANCED" | "LOW_FREEZE_RISK" | "CRITICAL_INSUFFICIENT" | "HIGH_EXCESSIVE";
  primaryRestrictionLocation: "RETURN_DUCT" | "SUPPLY_DUCT" | "FILTER_MEDIA" | "EVAPORATOR_COIL" | "BALANCED";
  inspectorRecommendations: string[];
}

/**
 * Calculates Total External Static Pressure (TESP) = |P_return| + |P_supply|.
 */
export function calculateTESP(readings: StaticPressureReadings): number {
  const absReturn = Math.abs(readings.returnStaticPressureInWc);
  const absSupply = Math.abs(readings.supplyStaticPressureInWc);
  return Math.round((absReturn + absSupply) * 100) / 100;
}

/**
 * Estimates delivered CFM based on fan law approximation across static pressure differential.
 */
export function estimateDeliveredCfm(
  ratedCfm: number,
  ratedTesp: number,
  actualTesp: number
): number {
  if (actualTesp <= 0) return ratedCfm;
  if (ratedTesp <= 0) return ratedCfm;

  // Real-world centrifugal forward-curved blower curve approximation:
  // CFM drops approximately linearly with excessive static pressure beyond design
  const pressureRatio = actualTesp / ratedTesp;
  let cfmMultiplier = 1.0;

  if (pressureRatio <= 1.0) {
    cfmMultiplier = 1.0 + (1.0 - pressureRatio) * 0.1;
  } else {
    // Each 20% increase in static pressure over design typically reduces airflow by ~10%
    cfmMultiplier = Math.max(0.4, 1.0 - (pressureRatio - 1.0) * 0.5);
  }

  return Math.round(ratedCfm * cfmMultiplier);
}

/**
 * Analyzes static pressure readings against system specifications to identify restrictions and airflow losses.
 */
export function assessHVACAirflow(
  readings: StaticPressureReadings,
  specs: HVACSystemSpec
): AirflowAssessmentResult {
  const tesp = calculateTESP(readings);
  const deliveredCfm = estimateDeliveredCfm(specs.ratedCfmAtDesignTesp, specs.maxDesignTespInWc, tesp);
  const cfmDeficit = Math.max(0, specs.ratedCfmAtDesignTesp - deliveredCfm);
  const airflowLossPct = Math.round((cfmDeficit / specs.ratedCfmAtDesignTesp) * 1000) / 10;

  const cfmPerTon = Math.round((deliveredCfm / Math.max(0.5, specs.ratedCoolingTons)) * 10) / 10;

  // Status heuristics
  let tespStatus: AirflowAssessmentResult["tespStatus"] = "NORMAL";
  if (tesp > specs.maxDesignTespInWc * 1.5) {
    tespStatus = "CRITICAL_OVERPRESSURE";
  } else if (tesp > specs.maxDesignTespInWc) {
    tespStatus = "ELEVATED_RESTRICTION";
  }

  // CFM/ton guidelines (Nominal: 350-450 CFM/ton)
  let cfmPerTonStatus: AirflowAssessmentResult["cfmPerTonStatus"] = "NORMAL_BALANCED";
  if (cfmPerTon < 300) {
    cfmPerTonStatus = "CRITICAL_INSUFFICIENT";
  } else if (cfmPerTon < 350) {
    cfmPerTonStatus = "LOW_FREEZE_RISK";
  } else if (cfmPerTon > 450) {
    cfmPerTonStatus = "HIGH_EXCESSIVE";
  }

  // Determine primary bottleneck location
  const absReturn = Math.abs(readings.returnStaticPressureInWc);
  const absSupply = Math.abs(readings.supplyStaticPressureInWc);
  let primaryRestriction: AirflowAssessmentResult["primaryRestrictionLocation"] = "BALANCED";

  if (readings.filterPressureDropInWc && readings.filterPressureDropInWc > 0.20) {
    primaryRestriction = "FILTER_MEDIA";
  } else if (readings.coilPressureDropInWc && readings.coilPressureDropInWc > 0.35) {
    primaryRestriction = "EVAPORATOR_COIL";
  } else if (absReturn > absSupply * 1.4) {
    primaryRestriction = "RETURN_DUCT";
  } else if (absSupply > absReturn * 1.4) {
    primaryRestriction = "SUPPLY_DUCT";
  }

  const recs: string[] = [];
  if (tespStatus !== "NORMAL") {
    recs.push(`Total External Static Pressure (${tesp.toFixed(2)} in. w.c.) exceeds maximum manufacturer design rating (${specs.maxDesignTespInWc.toFixed(2)} in. w.c.).`);
  }
  if (cfmPerTonStatus === "CRITICAL_INSUFFICIENT" || cfmPerTonStatus === "LOW_FREEZE_RISK") {
    recs.push(`Delivered airflow of ${cfmPerTon} CFM/ton is below the minimum 350 CFM/ton threshold, risking evaporator coil freeze-up and compressor liquid floodback.`);
  }
  if (primaryRestriction === "RETURN_DUCT") {
    recs.push("Return side restriction detected. Enlarge return air drops/grilles or install additional return duct run.");
  } else if (primaryRestriction === "FILTER_MEDIA") {
    recs.push(`Excessive filter pressure drop (${readings.filterPressureDropInWc} in. w.c.) across filter media. Replace high-resistance media or upgrade to 4-inch deep pleat filter cabinet.`);
  } else if (primaryRestriction === "SUPPLY_DUCT") {
    recs.push("Supply plenum constriction detected. Verify balancing dampers and supply trunk duct sizing.");
  }

  return {
    tespInWc: tesp,
    tespStatus,
    deliveredCfm,
    cfmDeficit,
    airflowLossPercentage: airflowLossPct,
    cfmPerTon,
    cfmPerTonStatus,
    primaryRestrictionLocation: primaryRestriction,
    inspectorRecommendations: recs
  };
}
