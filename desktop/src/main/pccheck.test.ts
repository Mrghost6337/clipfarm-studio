import { describe, expect, mock, test } from 'bun:test'

mock.module('electron', () => ({ app: { getGPUInfo: async () => ({}) } }))
const { recommend } = await import('./pccheck')
const manifest = (await import('./models.json')).default

describe('recommend', () => {
  test('prefers the light model when anything is tight', () => {
    expect(recommend({ memoryGb: 4, cores: 8, gflops: 200 }).model).toBe('whisper-tiny')
    expect(recommend({ memoryGb: 16, cores: 2, gflops: 200 }).model).toBe('whisper-tiny')
    expect(recommend({ memoryGb: 16, cores: 8, gflops: 10 }).model).toBe('whisper-tiny')
  })
  test('base in the middle, small only with room everywhere', () => {
    expect(recommend({ memoryGb: 8, cores: 4, gflops: 50 }).model).toBe('whisper-base')
    expect(recommend({ memoryGb: 16, cores: 6, gflops: 200 }).model).toBe('whisper-base')
    expect(recommend({ memoryGb: 16, cores: 8, gflops: 80 }).model).toBe('whisper-small')
  })
  test('declined check means the lightest setup', () => {
    expect(recommend({ memoryGb: 64, cores: 32, gflops: 999 }, false).model).toBe('whisper-tiny')
  })
  test('every reason is one sentence of real numbers', () => {
    const reason = recommend({ memoryGb: 15.7, cores: 4, gflops: 57 }).reason
    expect(reason).toContain('15.7 GB')
    expect(reason).toContain('4 cores')
  })
})

describe('model manifest', () => {
  test('every file is pinned with size and SHA-256', () => {
    for (const model of manifest.models) {
      expect(model.revision).toMatch(/^[a-f0-9]{40}$/)
      for (const file of model.files) {
        expect(file.sha256).toMatch(/^[a-f0-9]{64}$/)
        expect(file.size).toBeGreaterThan(0)
      }
      expect(model.bytes).toBe(model.files.reduce((sum, file) => sum + file.size, 0))
    }
  })
})
