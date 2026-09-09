/**
 * SNAP-17: Thermal Infrared Point-to-Point Resistance Temperature Curve Exporter.
 * Analyzes multi-point surface temperature gradients, calculates building envelope R-value
 * degradation and heat flux loss, and generates SVG temperature profile curves.
 */

export interface ThermalPoint {
  id: string;
  distanceMeters: number;
  tempCelsius: number;
  isAnomaly?: boolean;
}

export interface ThermalGradientAnalysis {
  minTempCelsius: number;
  maxTempCelsius: number;
  deltaTCelsius: number;
  meanTempCelsius: number;
  maxGradientCelsiusPerMeter: number;
  thermalBridgingDetected: boolean;
  anomalyCount: number;
  profilePoints: ThermalPoint[];
}

export interface RValueDegradationReport {
  measuredRValue: number; // m²·K/W (or ft²·°F·h/BTU in SI)
  nominalRValue: number;
  heatLossWattsPerSqMeter: number;
  degradationPercentage: number;
  assessment: 'EXCELLENT' | 'ACCEPTABLE' | 'DEGRADED' | 'CRITICAL_THERMAL_BRIDGE';
}

export function analyzeTemperatureProfile(
  points: { distanceMeters: number; tempCelsius: number }[],
  gradientThresholdCelsiusPerMeter: number = 8.0
): ThermalGradientAnalysis {
  if (points.length === 0) {
    return {
      minTempCelsius: 0,
      maxTempCelsius: 0,
      deltaTCelsius: 0,
      meanTempCelsius: 0,
      maxGradientCelsiusPerMeter: 0,
      thermalBridgingDetected: false,
      anomalyCount: 0,
      profilePoints: []
    };
  }

  // Sort points by distance
  const sorted = [...points].sort((a, b) => a.distanceMeters - b.distanceMeters);

  let minT = Infinity, maxT = -Infinity, sumT = 0;
  let maxGrad = 0;
  let anomalyCount = 0;
  const profilePoints: ThermalPoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (p.tempCelsius < minT) minT = p.tempCelsius;
    if (p.tempCelsius > maxT) maxT = p.tempCelsius;
    sumT += p.tempCelsius;

    let isAnomaly = false;
    if (i > 0) {
      const prev = sorted[i - 1];
      const distDelta = Math.max(0.01, p.distanceMeters - prev.distanceMeters);
      const grad = Math.abs(p.tempCelsius - prev.tempCelsius) / distDelta;
      if (grad > maxGrad) maxGrad = grad;
      if (grad >= gradientThresholdCelsiusPerMeter) {
        isAnomaly = true;
        anomalyCount++;
      }
    }

    profilePoints.push({
      id: `pt-${i + 1}`,
      distanceMeters: Math.round(p.distanceMeters * 100) / 100,
      tempCelsius: Math.round(p.tempCelsius * 10) / 10,
      isAnomaly
    });
  }

  return {
    minTempCelsius: Math.round(minT * 10) / 10,
    maxTempCelsius: Math.round(maxT * 10) / 10,
    deltaTCelsius: Math.round((maxT - minT) * 10) / 10,
    meanTempCelsius: Math.round((sumT / sorted.length) * 10) / 10,
    maxGradientCelsiusPerMeter: Math.round(maxGrad * 10) / 10,
    thermalBridgingDetected: anomalyCount > 0,
    anomalyCount,
    profilePoints
  };
}

export function estimateEnvelopeRValue(
  internalTempCelsius: number,
  externalTempCelsius: number,
  heatFluxWattsPerSqMeter: number,
  nominalRValue: number = 3.5
): RValueDegradationReport {
  const deltaT = Math.abs(internalTempCelsius - externalTempCelsius);
  const measuredR = Math.max(0.01, deltaT / Math.max(0.1, heatFluxWattsPerSqMeter));
  const degradation = Math.max(0.0, ((nominalRValue - measuredR) / nominalRValue) * 100.0);

  let assessment: 'EXCELLENT' | 'ACCEPTABLE' | 'DEGRADED' | 'CRITICAL_THERMAL_BRIDGE';
  if (degradation < 10.0) {
    assessment = 'EXCELLENT';
  } else if (degradation < 25.0) {
    assessment = 'ACCEPTABLE';
  } else if (degradation < 50.0) {
    assessment = 'DEGRADED';
  } else {
    assessment = 'CRITICAL_THERMAL_BRIDGE';
  }

  return {
    measuredRValue: Math.round(measuredR * 100) / 100,
    nominalRValue,
    heatLossWattsPerSqMeter: Math.round(heatFluxWattsPerSqMeter * 10) / 10,
    degradationPercentage: Math.round(degradation * 10) / 10,
    assessment
  };
}

export function exportTemperatureCurveSVG(
  analysis: ThermalGradientAnalysis,
  width: number = 600,
  height: number = 200
): string {
  const pts = analysis.profilePoints;
  if (pts.length < 2) return '<svg width="600" height="200"></svg>';

  const pad = 40;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const maxDist = Math.max(1, pts[pts.length - 1].distanceMeters);
  const minT = analysis.minTempCelsius - 1;
  const maxT = analysis.maxTempCelsius + 1;
  const rangeT = Math.max(1, maxT - minT);

  const coords = pts.map(p => {
    const x = pad + (p.distanceMeters / maxDist) * plotW;
    const y = height - pad - ((p.tempCelsius - minT) / rangeT) * plotH;
    return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
  });

  const polylineStr = coords.join(' ');

  return [
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:#111; font-family:sans-serif;">`,
    `  <rect width="100%" height="100%" fill="#18181b"/>`,
    `  <!-- Grid axes -->`,
    `  <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#3f3f46" stroke-width="1"/>`,
    `  <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#3f3f46" stroke-width="1"/>`,
    `  <!-- Thermal profile line -->`,
    `  <polyline fill="none" stroke="#f43f5e" stroke-width="3" points="${polylineStr}"/>`,
    `  <!-- Labels -->`,
    `  <text x="${pad}" y="24" fill="#a1a1aa" font-size="12">Max: ${analysis.maxTempCelsius}°C (ΔT: ${analysis.deltaTCelsius}°C)</text>`,
    `  <text x="${width - pad - 120}" y="24" fill="${analysis.thermalBridgingDetected ? '#ef4444' : '#10b981'}" font-size="12">${analysis.thermalBridgingDetected ? 'BRIDGE DETECTED' : 'NOMINAL'}</text>`,
    `</svg>`
  ].join('\n');
}
