import type { ReactNode } from 'react'

import { cx } from '../lib/cx'

export function Container({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cx('mx-auto w-full px-5 sm:px-8', wide ? 'max-w-[1360px]' : 'max-w-[1240px]', className)}>{children}</div>
}
