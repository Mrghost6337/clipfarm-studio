import { describe, expect, test } from 'bun:test'

import { allowedMove, DEFAULT_SITE_ORIGIN } from './siteRules'

describe('site origin moves', () => {
  test('the default is the primary domain', () => {
    expect(DEFAULT_SITE_ORIGIN).toBe('https://clipfarm.freebuff.site')
  })
  test('follows a move inside the same registrable domain over https', () => {
    expect(allowedMove('https://fractional-hr-34cett.freebuff.site', 'https://clipfarm.freebuff.site')).toBe(true)
  })
  test('never follows a move to another domain, http or a port', () => {
    expect(allowedMove('https://clipfarm.freebuff.site', 'https://evil.example')).toBe(false)
    expect(allowedMove('https://clipfarm.freebuff.site', 'http://other.freebuff.site')).toBe(false)
    expect(allowedMove('https://clipfarm.freebuff.site', 'https://other.freebuff.site:8443')).toBe(false)
    expect(allowedMove('https://clipfarm.freebuff.site', 'https://freebuff.site.evil.example')).toBe(false)
  })
})
