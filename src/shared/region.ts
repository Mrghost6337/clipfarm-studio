// Country, language and currency. Detection happens in the browser from the
// visitor's locale and time zone; prices are stored in USD and shown in the
// chosen currency with indicative rates. The worker always charges plan limits
// in USD, so nothing here can change what an account is allowed to do.

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'CHF' | 'SEK' | 'NOK' | 'DKK' | 'PLN' | 'BRL' | 'MXN' | 'INR' | 'JPY' | 'KRW' | 'SGD' | 'ZAR' | 'AED' | 'SAR'

export type Country = { code: string; name: string; currency: CurrencyCode }

export const COUNTRIES: readonly Country[] = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'NZ', name: 'New Zealand', currency: 'AUD' },
  { code: 'IE', name: 'Ireland', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'AT', name: 'Austria', currency: 'EUR' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'SE', name: 'Sweden', currency: 'SEK' },
  { code: 'NO', name: 'Norway', currency: 'NOK' },
  { code: 'DK', name: 'Denmark', currency: 'DKK' },
  { code: 'PL', name: 'Poland', currency: 'PLN' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'KR', name: 'South Korea', currency: 'KRW' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
]

export const CURRENCIES: readonly { code: CurrencyCode; name: string }[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
]

export const LANGUAGES: readonly { code: string; label: string; locale: string }[] = [
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'nl', label: 'Nederlands', locale: 'nl-NL' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
  { code: 'fr', label: 'Français', locale: 'fr-FR' },
  { code: 'es', label: 'Español', locale: 'es-ES' },
  { code: 'pt', label: 'Português', locale: 'pt-BR' },
]

/** Indicative rates from USD. Update when you wire a real FX feed. */
export const RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.37,
  AUD: 1.52,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.9,
  PLN: 4,
  BRL: 5.4,
  MXN: 18.2,
  INR: 83.5,
  JPY: 152,
  KRW: 1340,
  SGD: 1.34,
  ZAR: 18.4,
  AED: 3.67,
  SAR: 3.75,
}

export const RATES_NOTE = 'Indicative rates, updated November 2026. Plans are billed in USD and your bank converts at checkout.'

export type LocaleSettings = { country: string; language: string; currency: CurrencyCode }

export const DEFAULT_LOCALE: LocaleSettings = { country: 'US', language: 'en', currency: 'USD' }

export const countryByCode = (code: string) => COUNTRIES.find((country) => country.code === code) ?? null

export const currencyByCode = (code: string) => CURRENCIES.find((currency) => currency.code === code) ?? null

export const localeFor = (language: string) => LANGUAGES.find((entry) => entry.code === language)?.locale ?? 'en-US'

const TZ_COUNTRIES: Record<string, string> = {
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Madrid': 'ES',
  'Europe/Lisbon': 'PT',
  'Europe/Rome': 'IT',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Warsaw': 'PL',
  'Europe/Dublin': 'IE',
  'Europe/London': 'GB',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Mexico_City': 'MX',
  'America/Sao_Paulo': 'BR',
  'Asia/Kolkata': 'IN',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Singapore': 'SG',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Africa/Johannesburg': 'ZA',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Pacific/Auckland': 'NZ',
}

/** Best-effort country from the visitor's languages and time zone. Pure. */
export function detectCountry(languages: readonly string[] = [], timeZone = ''): Country {
  for (const tag of languages) {
    try {
      const region = new Intl.Locale(tag).maximize().region
      const match = region ? countryByCode(region) : null
      if (match) return match
    } catch {
      /* unusable language tag */
    }
  }
  const fromZone = TZ_COUNTRIES[timeZone]
  return (fromZone ? countryByCode(fromZone) : null) ?? COUNTRIES[0]
}

/** Converts USD to the chosen currency, rounded for display. */
export function priceInCurrency(usd: number, currency: CurrencyCode) {
  const value = usd * RATES[currency]
  if (currency === 'JPY' || currency === 'KRW') return Math.round(value)
  return value >= 10 ? Math.round(value) : Math.round(value * 100) / 100
}

export function formatPrice(usd: number, currency: CurrencyCode, language: string) {
  const digits = currency === 'JPY' || currency === 'KRW' ? 0 : priceInCurrency(usd, currency) >= 10 ? 0 : 2
  return new Intl.NumberFormat(localeFor(language), {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(priceInCurrency(usd, currency))
}

export function formatLongDate(iso: string, language: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString(localeFor(language), options)
}
