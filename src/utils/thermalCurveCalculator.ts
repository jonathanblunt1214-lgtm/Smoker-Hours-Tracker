import { TemperatureReading, ThermalCurveAnalytics, ThermalCurveDataPoint } from '../types';

/**
 * Calculates comprehensive Thermal Curve Analytics for a cook log based on its temperature readings.
 */
export function calculateThermalCurveAnalytics(
  readings: TemperatureReading[],
  hoursLogged: number
): ThermalCurveAnalytics {
  const effectiveReadings = (readings || []).filter((reading) =>
    [reading.meatTemp, reading.cookingTemp, reading.targetTemp].some((value) => Number.isFinite(value) && value > 0)
  );

  if (effectiveReadings.length === 0) {
    return {
      startingMeatTempF: 0,
      peakMeatTempF: 0,
      avgPitTempF: 0,
      maxPitTempF: 0,
      minPitTempF: 0,
      totalCookDurationMinutes: Math.max(0, Math.round((Number(hoursLogged) || 0) * 60)),
      tempRiseRateFPerHr: 0,
      stallDetected: false,
      thermalStabilityVarianceF: 0,
      thermalStabilityRating: 'Insufficient observed temperature data',
      curveDataPoints: [],
      generatedAt: new Date().toISOString(),
    };
  }

  // Map readings to chronological curve data points
  const curveDataPoints: ThermalCurveDataPoint[] = effectiveReadings.map((r, idx) => {
    let tsMins = r.timestampMinutes;
    if (typeof tsMins !== 'number' || isNaN(tsMins)) {
      tsMins = idx * 60;
    }
    return {
      time: r.time || `${idx}:00`,
      timestampMinutes: tsMins,
      meatTemp: Number.isFinite(r.meatTemp) ? r.meatTemp : 0,
      pitTemp: Number.isFinite(r.cookingTemp) ? r.cookingTemp : 0,
      targetTemp: Number.isFinite(r.targetTemp) ? r.targetTemp : 0,
      ambientTemp: Number.isFinite(r.ambientTemp) ? r.ambientTemp : undefined,
      action: r.actionsTaken,
    };
  });

  // Sort chronologically by timestamp
  curveDataPoints.sort((a, b) => a.timestampMinutes - b.timestampMinutes);

  const meatTemps = curveDataPoints.map((p) => p.meatTemp).filter((value) => value > 0);
  const pitTemps = curveDataPoints.map((p) => p.pitTemp).filter((value) => value > 0);

  const startingMeatTempF = meatTemps[0] || 0;
  const peakMeatTempF = meatTemps.length ? Math.max(...meatTemps) : 0;

  const avgPitTempF = Math.round(
    pitTemps.reduce((acc, curr) => acc + curr, 0) / (pitTemps.length || 1)
  );
  const maxPitTempF = pitTemps.length ? Math.max(...pitTemps) : 0;
  const minPitTempF = pitTemps.length ? Math.min(...pitTemps) : 0;

  // Duration in minutes
  const lastPointMins = curveDataPoints[curveDataPoints.length - 1]?.timestampMinutes || 0;
  const totalCookDurationMinutes = Math.max(Math.round((Number(hoursLogged) || 0) * 60), lastPointMins, 0);
  const durationHours = totalCookDurationMinutes / 60;

  // Temperature rise rate (°F / hour)
  const tempDelta = Math.max(0, peakMeatTempF - startingMeatTempF);
  const tempRiseRateFPerHr = Number((tempDelta / (durationHours || 1)).toFixed(1));

  // Stall detection logic: meat temp plateau between 150°F and 175°F for at least 2 readings
  const stallPoints = curveDataPoints.filter(
    (p) => p.meatTemp >= 148 && p.meatTemp <= 175
  );
  const stallDetected = stallPoints.length >= 2;
  let stallRangeF: string | undefined;
  let stallDurationMinutes: number | undefined;

  if (stallDetected) {
    const minStall = Math.min(...stallPoints.map((p) => p.meatTemp));
    const maxStall = Math.max(...stallPoints.map((p) => p.meatTemp));
    stallRangeF = `${minStall}°F - ${maxStall}°F`;

    const firstStallMins = stallPoints[0].timestampMinutes;
    const lastStallMins = stallPoints[stallPoints.length - 1].timestampMinutes;
    stallDurationMinutes = Math.max(0, lastStallMins - firstStallMins);
  }

  // Thermal variance (Standard Deviation of pit temp relative to target)
  const comparablePitPoints = curveDataPoints.filter((point) => point.pitTemp > 0 && point.targetTemp > 0);
  const variances = comparablePitPoints.map((p) => Math.pow(p.pitTemp - p.targetTemp, 2));
  const avgVariance = variances.reduce((a, b) => a + b, 0) / (variances.length || 1);
  const stdDev = Math.sqrt(avgVariance);
  const thermalStabilityVarianceF = Number(stdDev.toFixed(1));

  const stabilityPercent = Math.max(0, Math.min(100, 100 - thermalStabilityVarianceF * 2.2));
  let stabilityLabel = 'Exceptional';
  if (thermalStabilityVarianceF > 10) stabilityLabel = 'Moderate Fluctuation';
  else if (thermalStabilityVarianceF > 5) stabilityLabel = 'Good Control';

  const thermalStabilityRating = comparablePitPoints.length
    ? `${stabilityPercent.toFixed(1)}% ${stabilityLabel} (±${thermalStabilityVarianceF}°F variance)`
    : 'Insufficient observed pit and target temperature data';

  return {
    startingMeatTempF,
    peakMeatTempF,
    avgPitTempF,
    maxPitTempF,
    minPitTempF,
    totalCookDurationMinutes,
    tempRiseRateFPerHr,
    stallDetected,
    stallRangeF,
    stallDurationMinutes,
    thermalStabilityVarianceF,
    thermalStabilityRating,
    curveDataPoints,
    generatedAt: new Date().toISOString(),
  };
}
