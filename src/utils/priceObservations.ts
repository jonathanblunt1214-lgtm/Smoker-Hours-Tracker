import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateCostPerLb, costPerLbToKg } from './costUnits';

export type FuelPriceObservationSource = 'manual_entry' | 'receipt' | 'retailer_page';

export interface FuelPriceObservation {
  id: string;
  productKey: string;
  productName: string;
  brand?: string;
  retailerName: string;
  category: 'Wood Pellets' | 'Charcoal' | 'Wood Splits / Chunks' | 'Gas / Propane' | 'Other';
  bagWeightLbs?: number;
  quantityUnits?: number;
  totalPrice: number;
  normalizedCostPerLb?: number;
  normalizedCostPerKg?: number;
  observedAt: string;
  sourceType: FuelPriceObservationSource;
  sourceUrl?: string;
  evidenceNote?: string;
  verificationState: 'account_observation_unverified';
}

export interface FuelPriceTrend {
  status: 'insufficient_data' | 'rising' | 'falling' | 'stable';
  observationCount: number;
  latestPrice: number | null;
  previousPrice: number | null;
  changePct: number | null;
  averagePrice: number | null;
  lowPrice: number | null;
  highPrice: number | null;
  volatilityPct: number | null;
  scopeLabel: string;
}

function finitePositive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeProductKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

export async function saveAccountFuelPriceObservation(uid: string, input: Omit<FuelPriceObservation, 'id' | 'productKey' | 'normalizedCostPerLb' | 'normalizedCostPerKg' | 'verificationState'>): Promise<string> {
  if (!uid) throw new Error('Sign in is required to save a price observation.');
  const productName = input.productName.trim();
  const retailerName = input.retailerName.trim();
  const totalPrice = finitePositive(input.totalPrice);
  const weight = finitePositive(input.bagWeightLbs);
  if (!productName || !retailerName || !totalPrice) throw new Error('Product, retailer, and a positive observed price are required.');
  if (input.sourceType === 'retailer_page' && (!input.sourceUrl || !/^https:\/\//i.test(input.sourceUrl))) throw new Error('Retailer-page observations require an HTTPS source URL.');

  const perLb = weight ? calculateCostPerLb(totalPrice, weight) : null;
  const perKg = perLb === null ? null : costPerLbToKg(perLb);
  const payload = {
    productKey: normalizeProductKey(`${input.brand || ''}-${productName}`),
    productName,
    brand: input.brand?.trim() || null,
    retailerName,
    category: input.category,
    bagWeightLbs: weight,
    quantityUnits: finitePositive(input.quantityUnits),
    totalPrice,
    normalizedCostPerLb: perLb === null ? null : Number(perLb.toFixed(4)),
    normalizedCostPerKg: perKg === null ? null : Number(perKg.toFixed(4)),
    observedAt: input.observedAt || new Date().toISOString(),
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl?.trim() || null,
    evidenceNote: input.evidenceNote?.trim() || null,
    verificationState: 'account_observation_unverified' as const,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'users', uid, 'fuelPriceObservations'), payload);
  return ref.id;
}

export async function loadAccountFuelPriceObservations(uid: string): Promise<FuelPriceObservation[]> {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, 'users', uid, 'fuelPriceObservations'), orderBy('observedAt', 'asc')));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as FuelPriceObservation));
}

export function calculateObservedPriceTrend(observations: FuelPriceObservation[], productKey?: string): FuelPriceTrend {
  const filtered = observations
    .filter((o) => !productKey || o.productKey === productKey)
    .filter((o) => finitePositive(o.totalPrice) !== null)
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));

  if (filtered.length < 2) {
    return {
      status: 'insufficient_data', observationCount: filtered.length,
      latestPrice: filtered.length ? filtered[filtered.length - 1].totalPrice : null,
      previousPrice: null, changePct: null,
      averagePrice: filtered.length ? filtered[0].totalPrice : null,
      lowPrice: filtered.length ? filtered[0].totalPrice : null,
      highPrice: filtered.length ? filtered[0].totalPrice : null,
      volatilityPct: null,
      scopeLabel: 'Your account observations — not a live market feed',
    };
  }

  const prices = filtered.map((o) => o.totalPrice);
  const latest = prices[prices.length - 1];
  const previous = prices[prices.length - 2];
  const changePct = previous > 0 ? ((latest - previous) / previous) * 100 : 0;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) if (prices[i - 1] > 0) returns.push(((prices[i] - prices[i - 1]) / prices[i - 1]) * 100);
  const returnMean = returns.reduce((sum, v) => sum + v, 0) / Math.max(1, returns.length);
  const variance = returns.reduce((sum, v) => sum + Math.pow(v - returnMean, 2), 0) / Math.max(1, returns.length);
  const volatilityPct = Math.sqrt(variance);
  const status: FuelPriceTrend['status'] = Math.abs(changePct) < 1 ? 'stable' : changePct > 0 ? 'rising' : 'falling';

  return {
    status,
    observationCount: filtered.length,
    latestPrice: latest,
    previousPrice: previous,
    changePct: Number(changePct.toFixed(2)),
    averagePrice: Number((prices.reduce((sum, v) => sum + v, 0) / prices.length).toFixed(2)),
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    volatilityPct: Number(volatilityPct.toFixed(2)),
    scopeLabel: 'Your account observations — not a live market feed',
  };
}
