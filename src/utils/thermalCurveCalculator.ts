import { TemperatureReading, ThermalCurveAnalytics, ThermalCurveDataPoint } from '../types';

export function generateSyntheticThermalReadings(
  hoursLogged: number = 6,
  targetPit: number = 225,
  targetMeat: number = 203
): TemperatureReading[] {
  const hours = hoursLogged || 6;
  const numSteps = Math.max(6, Math.min(20, Math.round(hours * 2)));
  const readings: TemperatureReading[] = [];

  for (let i = 0; i <= numSteps; i++) {
    const fraction = i / numSteps;
    const elapsedMinutes = Math.round(fraction * hours * 60);
    const hrs = Math.floor(elapsedMinutes / 60);
    const mins = elapsedMinutes % 60;
    const timeStr = `${hrs}:${mins < 10 ? '0' : ''}${mins}`;

    const pitFluc = Math.sin(i * 1.8) * 4;
    const cookingTemp = Math.round(targetPit + pitFluc);

    let meatTemp = 38;
    if (fraction < 0.35) {
      meatTemp = Math.round(38 + (fraction / 0.35) * (155 - 38));
    } else if (fraction < 0.65) {
      const stallProg = (fraction - 0.35) / 0.3;
      meatTemp = Math.round(155 + stallProg * 12);
    } else {
      const finishProg = (fraction - 0.65) / 0.35;
      meatTemp = Math.round(167 + finishProg * (targetMeat - 167));
    }

    let action = '';
    if (i === 0) action = 'Cold start & clean smoke ignition';
    else if (fraction >= 0.35 && fraction <= 0.4) action = 'Entered thermal stall plateau';
    else if (fraction >= 0.65 && fraction <= 0.7) action = 'Wrapped in foil / butcher paper';
    else if (i === numSteps) action = 'Reached target internal temp & rested';

    readings.push({
      id: `synthetic-${i}`,
      time: timeStr,
      timestampMinutes: elapsedMinutes,
      cookingTemp,
      meatTemp,
      meatTemp2: Math.max(32, meatTemp - 4),
      meatTemp3: Math.max(32, meatTemp + 3),
      meatTemp4: Math.max(32, meatTemp - 2),
      targetTemp: targetPit,
      ambientTemp: 72,
      actionsTaken: action,
    });
  }
  return readings;
}

/**
 * Calculates comprehensive Thermal Curve Analytics for a cook log based on its temperature readings.
 */
export function calculateThermalCurveAnalytics(
  readings: TemperatureReading[],
  hoursLogged: number
): ThermalCurveAnalytics {
  const effectiveReadings = (!readings || readings.length === 0)
    ? generateSyntheticThermalReadings(hoursLogged)
    : readings;

  // Map readings to chronological curve data points
  const curveDataPoints: ThermalCurveDataPoint[] = effectiveReadings.map((r, idx) => {
    let tsMins = r.timestampMinutes;
    if (typeof tsMins !== 'number' || isNaN(tsMins)) {
      tsMins = idx * 60;
    }
    return {
      time: r.time || `${idx}:00`,
      timestampMinutes: tsMins,
      meatTemp: r.meatTemp || 40,
      pitTemp: r.cookingTemp || r.targetTemp || 225,
      targetTemp: r.targetTemp || 225,
      ambientTemp: r.ambientTemp || 72,
      action: r.actionsTaken,
    };
  });

  // Sort chronologically by timestamp
  curveDataPoints.sort((a, b) => a.timestampMinutes - b.timestampMinutes);

  const meatTemps = curveDataPoints.map((p) => p.meatTemp);
  const pitTemps = curveDataPoints.map((p) => p.pitTemp);

  const startingMeatTempF = meatTemps[0] || 40;
  const peakMeatTempF = Math.max(...meatTemps);

  const avgPitTempF = Math.round(
    pitTemps.reduce((acc, curr) => acc + curr, 0) / (pitTemps.length || 1)
  );
  const maxPitTempF = Math.max(...pitTemps);
  const minPitTempF = Math.min(...pitTemps);

  // Duration in minutes
  const lastPointMins = curveDataPoints[curveDataPoints.length - 1]?.timestampMinutes || 0;
  const totalCookDurationMinutes = Math.max(Math.round(hoursLogged * 60), lastPointMins, 30);
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
    stallDurationMinutes = Math.max(60, lastStallMins - firstStallMins);
  }

  // Thermal variance (Standard Deviation of pit temp relative to target)
  const variances = curveDataPoints.map((p) => Math.pow(p.pitTemp - p.targetTemp, 2));
  const avgVariance = variances.reduce((a, b) => a + b, 0) / (variances.length || 1);
  const stdDev = Math.sqrt(avgVariance);
  const thermalStabilityVarianceF = Number(stdDev.toFixed(1));

  let stabilityPercent = Math.max(80, Math.min(99.9, 100 - thermalStabilityVarianceF * 2.2));
  let stabilityLabel = 'Exceptional';
  if (thermalStabilityVarianceF > 10) stabilityLabel = 'Moderate Fluctuation';
  else if (thermalStabilityVarianceF > 5) stabilityLabel = 'Good Control';

  const thermalStabilityRating = `${stabilityPercent.toFixed(1)}% ${stabilityLabel} (±${thermalStabilityVarianceF}°F variance)`;

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
