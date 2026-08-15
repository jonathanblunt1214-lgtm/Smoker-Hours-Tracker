import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateThermalCurveAnalytics } from '../src/utils/thermalCurveCalculator';
import type { TemperatureReading } from '../src/types';

test('empty readings remain empty and are not synthesized', () => {
  const analytics = calculateThermalCurveAnalytics([], 0);
  assert.deepEqual(analytics.curveDataPoints, []);
  assert.equal(analytics.startingMeatTempF, 0);
  assert.equal(analytics.peakMeatTempF, 0);
  assert.equal(analytics.thermalStabilityRating, 'Insufficient observed temperature data');
});

test('meat-only readings do not fabricate pit metrics', () => {
  const readings: TemperatureReading[] = [
    { id: 'one', time: '1:00 PM', timestampMinutes: 0, targetTemp: 0, cookingTemp: 0, meatTemp: 80, ambientTemp: undefined, actionsTaken: '' },
    { id: 'two', time: '2:00 PM', timestampMinutes: 60, targetTemp: 0, cookingTemp: 0, meatTemp: 120, ambientTemp: undefined, actionsTaken: '' },
  ];
  const analytics = calculateThermalCurveAnalytics(readings, 1);
  assert.equal(analytics.startingMeatTempF, 80);
  assert.equal(analytics.peakMeatTempF, 120);
  assert.equal(analytics.avgPitTempF, 0);
  assert.equal(analytics.thermalStabilityRating, 'Insufficient observed pit and target temperature data');
});
