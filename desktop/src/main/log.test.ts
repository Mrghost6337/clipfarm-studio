import { describe, expect, test } from 'bun:test'

import { redact } from './log'

describe('redact', () => {
  test('removes bearer tokens and secrets', () => {
    const line = 'GET /jobs Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789 token=QWERTYUIOPASDFGHJKLZ secret: zxcvbnmasdfghjklqwert'
    const out = redact(line)
    expect(out).not.toContain('abcdefghijklmnopqrstuvwxyz0123456789')
    expect(out).not.toContain('QWERTYUIOPASDFGHJKLZ')
    expect(out).not.toContain('zxcvbnmasdfghjklqwert')
    expect(out).toContain('[redacted]')
  })
  test('keeps normal text', () => {
    expect(redact('pipeline ready on 8787')).toBe('pipeline ready on 8787')
  })
})
