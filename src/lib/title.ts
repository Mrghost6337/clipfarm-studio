import { useEffect } from 'react'

import { SITE } from '../content'

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE.name}` : `${SITE.name}: ${SITE.tagline}`
  }, [title])
}
