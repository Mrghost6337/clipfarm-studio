import { describe, expect, test } from 'bun:test'

import { notesText } from './releaseNotes'

describe('release notes', () => {
  test('turns GitHub HTML into plain text', () => {
    expect(notesText('<p>Fixes sign-in.</p><ul><li>Faster &amp; smaller</li></ul>')).toBe('Fixes sign-in.\nFaster & smaller')
  })
  test('empty notes give null', () => {
    expect(notesText(null)).toBeNull()
    expect(notesText('<p></p>')).toBeNull()
  })
})
