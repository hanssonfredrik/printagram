import {
  currencyForLang,
  fmtMoney,
  priceList,
  type Currency,
  type PriceList,
} from '@printagram/shared';
import { useLang } from '@/i18n';
import { useConfig } from './session';

/** The currency of the current UI language: kronor in Swedish, euros otherwise. */
export function useCurrency(): Currency {
  return currencyForLang(useLang((x) => x.lang));
}

/** Prices in the current UI language's currency. */
export function usePriceList(): PriceList {
  return priceList(useConfig().pricing, useCurrency());
}

/** Formats cents in the UI language; the currency defaults to that language's (pass an order's own). */
export function useMoney(): (cents: number, currency?: Currency) => string {
  const lang = useLang((x) => x.lang);
  return (cents, currency = currencyForLang(lang)) => fmtMoney(cents, currency, lang);
}
