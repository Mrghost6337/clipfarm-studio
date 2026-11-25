import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  countryByCode,
  currencyByCode,
  DEFAULT_LOCALE,
  detectCountry,
  formatLongDate,
  formatPrice,
  LANGUAGES,
  type Country,
  type CurrencyCode,
  type LocaleSettings,
} from '../shared/region'
import { readJson, writeJson } from './storage'

const KEY = 'clipfarm.region'

type RegionValue = Omit<LocaleSettings, 'country'> & {
  country: Country
  detected: Country
  detectedLanguage: string
  setCountry: (code: string) => void
  setCurrency: (code: CurrencyCode) => void
  setLanguage: (code: string) => void
  useDetected: () => void
  format: (usd: number) => string
  formatDate: (iso: string, options?: Intl.DateTimeFormatOptions) => string
}

const RegionContext = createContext<RegionValue | null>(null)

/** What the browser says about this visitor, before any choice is stored. */
export function browserRegion() {
  if (typeof navigator === 'undefined') return { country: detectCountry(), language: 'en' }
  const languages = [...(navigator.languages ?? []), navigator.language].filter(Boolean)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const country = detectCountry(languages, timeZone)
  const tag = (languages[0] ?? 'en').toLowerCase()
  const language = LANGUAGES.find((entry) => tag.startsWith(entry.code))?.code ?? 'en'
  return { country, language }
}

export function RegionProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LocaleSettings>(() => {
    const stored = readJson<LocaleSettings | null>(KEY, null)
    if (stored) {
      const country = countryByCode(stored.country)
      const currency = currencyByCode(stored.currency)
      const language = LANGUAGES.find((entry) => entry.code === stored.language)
      if (country && currency && language) return stored
    }
    const detected = browserRegion()
    return { country: detected.country.code, language: detected.language, currency: detected.country.currency }
  })

  const detected = useMemo(() => browserRegion(), [])
  const country = countryByCode(settings.country) ?? detectCountry()

  const update = useCallback((next: Partial<LocaleSettings>) => {
    setSettings((current) => {
      const merged = { ...current, ...next }
      writeJson(KEY, merged)
      return merged
    })
  }, [])

  const setCountry = useCallback(
    (code: string) => {
      const match = countryByCode(code)
      if (!match) return
      update({ country: match.code, currency: match.currency })
    },
    [update],
  )

  const setCurrency = useCallback((code: CurrencyCode) => update({ currency: code }), [update])
  const setLanguage = useCallback((code: string) => (LANGUAGES.some((entry) => entry.code === code) ? update({ language: code }) : undefined), [update])
  const useDetected = useCallback(() => {
    update({ country: detected.country.code, language: detected.language, currency: detected.country.currency })
  }, [detected, update])

  useEffect(() => {
    document.documentElement.lang = settings.language
  }, [settings.language])

  const value = useMemo<RegionValue>(
    () => ({
      ...settings,
      country,
      detected: detected.country,
      detectedLanguage: detected.language,
      setCountry,
      setCurrency,
      setLanguage,
      useDetected,
      format: (usd: number) => formatPrice(usd, settings.currency, settings.language),
      formatDate: (iso: string, options?: Intl.DateTimeFormatOptions) => formatLongDate(iso, settings.language, options),
    }),
    [settings, country, detected, setCountry, setCurrency, setLanguage, useDetected],
  )

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
}

export function useRegion() {
  const context = useContext(RegionContext)
  if (!context) throw new Error('useRegion must be used inside RegionProvider')
  return context
}

export { DEFAULT_LOCALE }
