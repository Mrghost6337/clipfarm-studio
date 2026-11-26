/** Release notes from GitHub come as HTML (or a list per version); the prompt shows plain text. */
export function notesText(notes: unknown): string | null {
  const raw = Array.isArray(notes) ? notes.map((entry) => (entry as { note?: string }).note ?? '').join('\n') : typeof notes === 'string' ? notes : ''
  const text = raw
    .replace(/<\/(p|li|h\d)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text ? text.slice(0, 1200) : null
}
