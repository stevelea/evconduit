// src/lib/currency.ts

/**
 * Currency utility for multi-currency support
 * Base currency is EUR, with conversions to AUD and GBP
 */

export type Currency = 'EUR' | 'GBP' | 'AUD';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  rate: number; // Conversion rate from EUR
}

// Exchange rates (EUR as base = 1.0)
// NOTE: These are approximate rates as of December 2025
// TODO: In production, fetch live rates from an API like:
// - https://api.exchangerate-api.com/v4/latest/EUR (free, no API key)
// - https://api.currencyapi.com/v3/latest?base_currency=EUR (requires API key)
// - Update rates daily or cache for 24 hours
const CURRENCY_RATES: Record<Currency, CurrencyConfig> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rate: 1.0,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rate: 0.85, // Approximate: 1 EUR ≈ 0.85 GBP
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    rate: 1.65, // Approximate: 1 EUR ≈ 1.65 AUD
  },
};

// Map country codes to currencies
const COUNTRY_TO_CURRENCY: Record<string, Currency> = {
  // Europe - EUR
  AT: 'EUR', BE: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR',
  FR: 'EUR', DE: 'EUR', GR: 'EUR', IE: 'EUR', IT: 'EUR',
  LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR', NL: 'EUR',
  PT: 'EUR', SK: 'EUR', SI: 'EUR', ES: 'EUR', HR: 'EUR',
  // Non-Euro EU countries
  BG: 'EUR', CZ: 'EUR', DK: 'EUR', HU: 'EUR', PL: 'EUR',
  RO: 'EUR', SE: 'EUR', NO: 'EUR', CH: 'EUR', IS: 'EUR',
  // UK
  GB: 'GBP',
  // Australia & NZ
  AU: 'AUD', NZ: 'AUD',
  // Asia - default to EUR for now
  CN: 'EUR', JP: 'EUR', KR: 'EUR', SG: 'EUR', HK: 'EUR',
  IN: 'EUR', TH: 'EUR', VN: 'EUR', MY: 'EUR', PH: 'EUR',
};

const CACHE_KEY = 'user_currency';
const CACHE_TIME_KEY = 'user_currency_time';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Detect user's currency based on IP geolocation
 */
export async function detectUserCurrency(): Promise<Currency> {
  // Check cache first
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const sevenDaysAgo = Date.now() - CACHE_DURATION;

    if (cached && cachedTime && parseInt(cachedTime) > sevenDaysAgo) {
      return cached as Currency;
    }
  }

  try {
    // Use ipapi.co to detect country
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    const countryCode = data.country_code;
    const currency = COUNTRY_TO_CURRENCY[countryCode] || 'EUR';

    // Cache the result
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, currency);
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    }

    return currency;
  } catch (error) {
    console.log('Could not detect currency from IP, using default EUR:', error);
    return 'EUR';
  }
}

/**
 * Convert amount from EUR to target currency
 * @param amountInEUR Amount in EUR (can be in cents or whole units)
 * @param targetCurrency Target currency code
 * @param isInCents Whether the amount is in cents (default: false)
 * @returns Converted amount in the same unit (cents or whole)
 */
export function convertCurrency(
  amountInEUR: number,
  targetCurrency: Currency,
  isInCents: boolean = false
): number {
  const config = CURRENCY_RATES[targetCurrency];
  if (!config) {
    console.warn(`Unknown currency: ${targetCurrency}, using EUR`);
    return amountInEUR;
  }

  const converted = amountInEUR * config.rate;

  // Round to 2 decimal places if not in cents, or to nearest cent if in cents
  if (isInCents) {
    return Math.round(converted);
  } else {
    return Math.round(converted * 100) / 100;
  }
}

/**
 * Format amount with currency symbol
 * @param amount Amount to format
 * @param currency Currency code
 * @param isInCents Whether the amount is in cents (default: false)
 * @returns Formatted string like "€4.99" or "£4.25"
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  isInCents: boolean = false
): string {
  const config = CURRENCY_RATES[currency];
  if (!config) {
    return `${amount}`;
  }

  const actualAmount = isInCents ? amount / 100 : amount;
  const formatted = actualAmount.toFixed(2);

  return `${config.symbol}${formatted}`;
}

/**
 * Convert EUR price to user's currency and format it
 * @param eurAmount Amount in EUR
 * @param targetCurrency Target currency
 * @param isInCents Whether the EUR amount is in cents
 * @returns Formatted price string
 */
export function convertAndFormatPrice(
  eurAmount: number,
  targetCurrency: Currency,
  isInCents: boolean = false
): string {
  const converted = convertCurrency(eurAmount, targetCurrency, isInCents);
  return formatCurrency(converted, targetCurrency, isInCents);
}

/**
 * Get currency configuration
 */
export function getCurrencyConfig(currency: Currency): CurrencyConfig {
  return CURRENCY_RATES[currency];
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies(): Currency[] {
  return Object.keys(CURRENCY_RATES) as Currency[];
}

/**
 * Format using browser's Intl API (alternative method)
 */
export function formatCurrencyIntl(
  amount: number,
  currency: Currency,
  isInCents: boolean = false
): string {
  const actualAmount = isInCents ? amount / 100 : amount;

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(actualAmount);
  } catch {
    // Fallback to manual formatting if Intl.NumberFormat fails
    return formatCurrency(amount, currency, isInCents);
  }
}
