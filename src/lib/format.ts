/** 12400 -> "12.4K", 1200000 -> "1.2M". */
export const formatCompact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n)

/** "Mon 16 Nov" in the viewer's locale. */
export const formatDay = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
export const formatDayLong = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
export const timeZoneName = () => Intl.DateTimeFormat().resolvedOptions().timeZone

/** "12 Nov" for chart axes. */
export const formatDayShort = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** "2 h ago" for the activity feed. */
export function formatAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(1, Math.round((now - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} d ago`
}
