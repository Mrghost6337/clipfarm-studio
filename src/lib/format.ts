export const formatMoney = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

/** "Mon 16 Nov" in the viewer's locale. */
export const formatDay = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
export const formatDayLong = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
export const timeZoneName = () => Intl.DateTimeFormat().resolvedOptions().timeZone
