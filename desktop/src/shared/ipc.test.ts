import { describe, expect, test } from 'bun:test'

import { validateExternalUrl, validateOpenPath, validatePipelineFile, validateStatePatch } from './ipc'

describe('validateStatePatch', () => {
  test('accepts known fields', () => {
    expect(validateStatePatch({ step: 'usage', usage: 'local', sound: { enabled: false, volume: 0.333 } })).toEqual({ step: 'usage', usage: 'local', sound: { enabled: false, volume: 0.33 } })
  })
  test('rejects unknown steps, modes and fields', () => {
    expect(() => validateStatePatch({ step: 'admin' })).toThrow()
    expect(() => validateStatePatch({ workMode: 'gpu' })).toThrow()
    expect(() => validateStatePatch({ termsAccepted: { terms: 'x', privacy: 'y', at: 'z' } })).toThrow('cannot be set from the window')
    expect(() => validateStatePatch({ sound: { enabled: true, volume: 3 } })).toThrow()
    expect(() => validateStatePatch(null)).toThrow()
    expect(() => validateStatePatch(['step'])).toThrow()
  })
})

describe('validateExternalUrl', () => {
  test('allows http and https only', () => {
    expect(validateExternalUrl('https://example.com/a?b=c')).toBe('https://example.com/a?b=c')
    for (const bad of ['file:///C:/Windows/system32/calc.exe', 'javascript:alert(1)', 'clipfarm://auth', 'ms-settings:privacy', 'https://user:pass@example.com', 42]) expect(() => validateExternalUrl(bad)).toThrow()
  })
})

describe('paths', () => {
  test('open-path only knows three folders', () => {
    expect(validateOpenPath('logs')).toBe('logs')
    expect(() => validateOpenPath('../../Windows')).toThrow()
  })
  test('pipeline files cannot escape the jobs folder', () => {
    expect(validatePipelineFile('/files/abc123/clips/01/clip.mp4')).toBe('/files/abc123/clips/01/clip.mp4')
    for (const bad of ['/files/../secrets/x', '/files/abc/clips/01/../../x', 'C:\\x', '/files/abc/clips/01/a/b']) expect(() => validatePipelineFile(bad)).toThrow()
  })
})
