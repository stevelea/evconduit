// src/hooks/useCurrency.ts

import { useEffect, useState } from 'react';
import {
  Currency,
  detectUserCurrency,
  convertCurrency,
  formatCurrency,
  convertAndFormatPrice,
  getCurrencyConfig,
} from '@/lib/currency';

export interface UseCurrencyReturn {
  currency: Currency;
  isLoading: boolean;
  convert: (eurAmount: number, isInCents?: boolean) => number;
  format: (amount: number, isInCents?: boolean) => string;
  convertAndFormat: (eurAmount: number, isInCents?: boolean) => string;
  setCurrency: (currency: Currency) => void;
  symbol: string;
  code: Currency;
}

/**
 * Hook to manage user's currency preference with automatic detection
 */
export function useCurrency(): UseCurrencyReturn {
  const [currency, setCurrencyState] = useState<Currency>('EUR');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeCurrency = async () => {
      try {
        const detectedCurrency = await detectUserCurrency();
        setCurrencyState(detectedCurrency);
      } catch (error) {
        console.error('Failed to detect currency:', error);
        setCurrencyState('EUR');
      } finally {
        setIsLoading(false);
      }
    };

    initializeCurrency();
  }, []);

  const convert = (eurAmount: number, isInCents: boolean = false): number => {
    return convertCurrency(eurAmount, currency, isInCents);
  };

  const format = (amount: number, isInCents: boolean = false): string => {
    return formatCurrency(amount, currency, isInCents);
  };

  const convertAndFormat = (eurAmount: number, isInCents: boolean = false): string => {
    return convertAndFormatPrice(eurAmount, currency, isInCents);
  };

  const setCurrency = (newCurrency: Currency): void => {
    setCurrencyState(newCurrency);
    // Update cache when manually set
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_currency', newCurrency);
      localStorage.setItem('user_currency_time', Date.now().toString());
    }
  };

  const config = getCurrencyConfig(currency);

  return {
    currency,
    isLoading,
    convert,
    format,
    convertAndFormat,
    setCurrency,
    symbol: config.symbol,
    code: currency,
  };
}
