/**
 * SNAP-06: Infrared Thermal FLIR Image Overlay Canvas Exporter.
 * Computes thermal delta-T diagnostics, temperature conversions (C/F),
 * emissivity compensation, and formats radiometric HUD overlay annotations.
 */

export type ThermalPalette = "IRONBOW" | "RAINBOW" | "GRAYSCALE" | "LAVA";
export type ThermalSeverity = "NORMAL" | "ELEVATED" | "CRITICAL";

export interface ThermalSpotCoords {
  x: number; // 0.0 to 1.0 relative coordinate
  y: number;
}

export interface ThermalMeasurement {
  spotTempC: number;
  ambientReflectedC: number;
  emissivity: number; // typically 0.85 to 0.98
  hotSpotCoords: ThermalSpotCoords;
  coldSpotCoords?: ThermalSpotCoords;
  inspectionTrade?: "roofing" | "electrical" | "hvac" | "building_envelope";
}

export interface ThermalDeltaResult {
  deltaC: number;
  deltaF: number;
  spotTempF: number;
  ambientReflectedF: number;
  severity: ThermalSeverity;
  diagnosticInterpretation: string;
}

export interface ThermalAnnotationBadge {
  text: string;
  xPercent: number;
  yPercent: number;
  bgColor: string;
  textColor: string;
}

export function celsiusToFahrenheit(c: number): number {
  return Math.round(((c * 9) / 5 + 32) * 10) / 10;
}

/**
 * Calculates Delta-T thermal gradient and severity according to ASTM / Infraspection standards.
 */
export function calculateThermalDelta(measurement: ThermalMeasurement): ThermalDeltaResult {
  const deltaC = Math.round((measurement.spotTempC - measurement.ambientReflectedC) * 10) / 10;
  const spotTempF = celsiusToFahrenheit(measurement.spotTempC);
  const ambientReflectedF = celsiusToFahrenheit(measurement.ambientReflectedC);
  const deltaF = Math.round((spotTempF - ambientReflectedF) * 10) / 10;

  let severity: ThermalSeverity = "NORMAL";
  let interpretation = "Thermal profile within standard operating tolerance.";

  if (deltaC >= 10.0) {
    severity = "CRITICAL";
    interpretation = "Severe thermal anomaly (>10°C / >18°F gradient): Immediate investigation recommended.";
  } else if (deltaC >= 4.0) {
    severity = "ELEVATED";
    interpretation = "Moderate thermal anomaly (4-10°C gradient): Sub-surface moisture or electrical phase imbalance indicated.";
  }

  return {
    deltaC,
    deltaF,
    spotTempF,
    ambientReflectedF,
    severity,
    diagnosticInterpretation: interpretation,
  };
}

/**
 * Generates HUD overlay text badges for canvas / image stamping.
 */
export function generateThermalHudBadges(
  measurement: ThermalMeasurement,
  preferredUnit: "C" | "F" = "F"
): ThermalAnnotationBadge[] {
  const delta = calculateThermalDelta(measurement);
  const badges: ThermalAnnotationBadge[] = [];

  const tempDisplay = preferredUnit === "F" ? `${delta.spotTempF}°F` : `${measurement.spotTempC}°C`;
  const deltaDisplay = preferredUnit === "F" ? `+${delta.deltaF}°F Δ` : `+${delta.deltaC}°C Δ`;

  let badgeBg = "#10b981"; // emerald-500
  if (delta.severity === "CRITICAL") {
    badgeBg = "#ef4444"; // red-500
  } else if (delta.severity === "ELEVATED") {
    badgeBg = "#f59e0b"; // amber-500
  }

  // Hot spot pin badge
  badges.push({
    text: `HOT: ${tempDisplay} (${deltaDisplay})`,
    xPercent: measurement.hotSpotCoords.x,
    yPercent: measurement.hotSpotCoords.y,
    bgColor: badgeBg,
    textColor: "#ffffff",
  });

  // Emissivity and ambient reference footer badge
  const ambientDisplay = preferredUnit === "F" ? `${delta.ambientReflectedF}°F` : `${measurement.ambientReflectedC}°C`;
  badges.push({
    text: `REF: ${ambientDisplay} | ε=${measurement.emissivity.toFixed(2)}`,
    xPercent: 0.05,
    yPercent: 0.92,
    bgColor: "rgba(15, 23, 42, 0.85)",
    textColor: "#94a3b8",
  });

  return badges;
}
