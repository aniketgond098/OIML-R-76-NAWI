import Decimal from 'decimal.js';
import { MassUnit } from '../../types/metrology';

// Configure Decimal.js for metrological precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Unit conversion multipliers to grams (base reference unit for conversion)
 */
const UNIT_TO_GRAM: Record<MassUnit, Decimal> = {
  mg: new Decimal('0.001'),
  g: new Decimal('1'),
  kg: new Decimal('1000'),
  t: new Decimal('1000000'),
  lb: new Decimal('453.59237'),
  oz: new Decimal('28.349523125'),
};

/**
 * Convert value from source unit to target unit with exact decimal arithmetic
 */
export function convertMass(value: number | string | Decimal, from: MassUnit, to: MassUnit): Decimal {
  const dVal = new Decimal(value);
  if (from === to) return dVal;
  
  const inGrams = dVal.times(UNIT_TO_GRAM[from]);
  return inGrams.dividedBy(UNIT_TO_GRAM[to]);
}

/**
 * Format a number to fixed decimal places, trimming unnecessary trailing zeros if requested
 */
export function formatDecimal(value: number | Decimal, decimalPlaces = 4): string {
  const d = new Decimal(value);
  return d.toFixed(decimalPlaces);
}

/**
 * Clean display string for mass value with unit
 */
export function formatMass(value: number | Decimal, unit: MassUnit, decimals = 4): string {
  const d = new Decimal(value);
  return `${d.toFixed(decimals)} ${unit}`;
}

/**
 * Metrological decimal comparator
 */
export function decimalCompare(a: number | Decimal, b: number | Decimal, tolerance = 1e-9): number {
  const da = new Decimal(a);
  const db = new Decimal(b);
  const diff = da.minus(db);
  if (diff.abs().lessThan(tolerance)) return 0;
  return da.greaterThan(db) ? 1 : -1;
}

/**
 * Rounding according to OIML convention (half-up)
 */
export function roundToPrecision(value: number | Decimal, step: number | Decimal): Decimal {
  const dVal = new Decimal(value);
  const dStep = new Decimal(step);
  return dVal.dividedBy(dStep).round().times(dStep);
}

/**
 * Standard metrological round-half-up to specified decimal places
 */
export function roundMetrological(value: number | Decimal, decimalPlaces = 4): number {
  const dVal = new Decimal(value);
  return dVal.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toNumber();
}

export { Decimal };
