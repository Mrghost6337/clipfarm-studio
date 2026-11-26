/** The site's primary domain. The old preview domain answers 409 "Use the primary site domain." to POSTs. */
export const DEFAULT_SITE_ORIGIN = 'https://clipfarm.freebuff.site'

/** Registrable domain (last two labels): a move is only followed inside it. */
const parent = (host: string) => host.split('.').slice(-2).join('.')

/** A redirect to a new site origin is followed only over https, without a port, on the same registrable domain. */
export function allowedMove(from: string, to: string) {
  const a = new URL(from)
  const b = new URL(to)
  return b.protocol === 'https:' && !b.port && parent(a.hostname) === parent(b.hostname)
}
