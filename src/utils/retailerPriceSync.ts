import { RetailerFuelItem, CookLog } from '../types';
import { TOP_RETAILER_FUEL_PRICES } from '../data/fuelPriceData';

const RETAILER_PRICES_STORAGE_KEY = 'smoker_retailer_fuel_prices';
const RETAILER_PRICES_LAST_SYNC_KEY = 'smoker_retailer_fuel_prices_last_sync';

/**
 * Loads locally stored/reference retailer price data. These values are not
 * represented as live unless a real price observation integration supplies them.
 */
export function loadRetailerFuelPrices(): RetailerFuelItem[] {
  try {
    const raw = localStorage.getItem(RETAILER_PRICES_STORAGE_KEY);
    if (!raw) return TOP_RETAILER_FUEL_PRICES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (err) {
    console.error('Error loading retailer fuel prices from storage:', err);
  }
  return TOP_RETAILER_FUEL_PRICES;
}

export function saveRetailerFuelPrices(items: RetailerFuelItem[]): void {
  try {
    localStorage.setItem(RETAILER_PRICES_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving retailer fuel prices:', err);
  }
}

export function getLastPriceSyncTimestamp(): number {
  try {
    const raw = localStorage.getItem(RETAILER_PRICES_LAST_SYNC_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * SmokeStack currently has no verified retailer-price API in this client.
 * Never mutate reference prices or claim named retailers were synchronized.
 * A future real integration should write dated PriceObservation records and
 * only then update the last-sync timestamp.
 */
export function checkAndUpdateRetailerPricesOnline(_force: boolean = false): {
  updated: boolean;
  items: RetailerFuelItem[];
  lastSync: number;
  message: string;
} {
  return {
    updated: false,
    items: loadRetailerFuelPrices(),
    lastSync: getLastPriceSyncTimestamp(),
    message: 'Live retailer price data unavailable. Showing saved/reference prices only.',
  };
}

export interface CookHourlyCostAnalysis {
  matchedFuelProduct: string;
  matchedBrand: string;
  retailerName: string;
  matchedCostPerLb: number;
  totalFuelLbs: number;
  totalCookHours: number;
  burnRateLbsPerHr: number;
  hourlyCostDollars: number;
  totalCookFuelCostDollars: number;
  databaseAverageCostPerLb: number;
  costSavingsComparedToAvg: number;
}

/**
 * Cost analysis uses the supplied/saved reference database. It does not imply
 * the prices are current market observations.
 */
export function calculateCookPelletHourlyCost(
  cook: CookLog,
  priceDatabase: RetailerFuelItem[] = loadRetailerFuelPrices()
): CookHourlyCostAnalysis {
  const hours = cook.hoursLogged > 0 ? cook.hoursLogged : 1;
  const lbs = cook.fuelLbsConsumed > 0 ? cook.fuelLbsConsumed : 0;
  const burnRate = lbs / hours;

  const totalDbCost = priceDatabase.reduce((acc, curr) => acc + curr.costPerLb, 0);
  const dbAvgCostPerLb = priceDatabase.length > 0 ? totalDbCost / priceDatabase.length : 0;

  const cookFuelLower = (cook.fuelType || '').toLowerCase();
  const matchedItem = priceDatabase.find((item) =>
    cookFuelLower.includes(item.brand.toLowerCase()) ||
    item.productTitle.toLowerCase().includes(cookFuelLower) ||
    cookFuelLower.includes(item.category.toLowerCase())
  );

  const costPerLb = matchedItem ? matchedItem.costPerLb : dbAvgCostPerLb;
  const matchedBrand = matchedItem ? matchedItem.brand : 'Unknown / unmatched fuel';
  const matchedFuelProduct = matchedItem ? matchedItem.productTitle : (cook.fuelType || 'Unknown fuel');
  const retailerName = matchedItem ? `${matchedItem.retailerName} (saved/reference)` : 'Saved/reference database average';

  const hourlyCostDollars = burnRate * costPerLb;
  const totalCookFuelCostDollars = lbs * costPerLb;
  const costSavingsComparedToAvg = (dbAvgCostPerLb - costPerLb) * lbs;

  return {
    matchedFuelProduct,
    matchedBrand,
    retailerName,
    matchedCostPerLb: Math.round(costPerLb * 100) / 100,
    totalFuelLbs: lbs,
    totalCookHours: hours,
    burnRateLbsPerHr: Math.round(burnRate * 100) / 100,
    hourlyCostDollars: Math.round(hourlyCostDollars * 100) / 100,
    totalCookFuelCostDollars: Math.round(totalCookFuelCostDollars * 100) / 100,
    databaseAverageCostPerLb: Math.round(dbAvgCostPerLb * 100) / 100,
    costSavingsComparedToAvg: Math.round(costSavingsComparedToAvg * 100) / 100,
  };
}
