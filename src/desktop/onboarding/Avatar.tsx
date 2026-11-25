import { useState } from 'react'

import { cx } from '../../lib/cx'

const initials = (name: string, email = '') =>
  (name.trim() || email)
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** Account picture from the account (Google), or initials when there is none or it fails to load. */
export function Avatar({ name, email, url, size = 96, className }: { name: string; email?: string; url: string | null | undefined; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }
  if (url && !failed) {
    return <img src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => setFailed(true)} style={style} className={cx('round rounded-full object-cover', className)} />
  }
  return (
    <span aria-hidden style={{ ...style, fontSize: size * 0.36 }} className={cx('round grid place-items-center rounded-full bg-ink font-semibold tracking-[-0.03em] text-white', className)}>
      {initials(name, email)}
    </span>
  )
}
