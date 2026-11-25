import { useEffect, useMemo, useState } from 'react'

import { cx } from '../../lib/cx'

/**
 * The welcome wall reads public/wall/manifest.json. A cover is shown only when
 * the manifest records the right to use it:
 *   - permission.type "open-licence": an openly licensed source, with licence,
 *     licence URL, author and source URL (credited on screen), or
 *   - permission.type "written": written permission from the creator, with who
 *     granted it, when, and a reference to the document.
 * Swap covers by editing the manifest; nothing else needs to change.
 */
export type WallCover = {
  id: string
  image: string
  title: string
  source: { title: string; author: string; url: string; license?: string; licenseUrl?: string }
  permission:
    | { type: 'open-licence' }
    | { type: 'written'; grantedBy: string; date: string; reference: string }
}

export type WallManifest = { version: number; covers: WallCover[] }

export function permitted(cover: WallCover) {
  const p = cover.permission
  if (!cover.image || !cover.source?.url || !cover.source?.author) return false
  if (p?.type === 'open-licence') return Boolean(cover.source.license && cover.source.licenseUrl)
  if (p?.type === 'written') return Boolean(p.grantedBy && p.date && p.reference)
  return false
}

export function useWallManifest() {
  const [covers, setCovers] = useState<WallCover[] | null>(null)
  useEffect(() => {
    let live = true
    fetch('/wall/manifest.json')
      .then((response) => (response.ok ? (response.json() as Promise<WallManifest>) : { version: 1, covers: [] }))
      .then((manifest) => live && setCovers((manifest.covers ?? []).filter(permitted)))
      .catch(() => live && setCovers([]))
    return () => {
      live = false
    }
  }, [])
  return covers
}

const ROWS = 4

/** Tilted rows of covers drifting slowly in alternating directions. Static when reduced motion is on. */
export function Wall({ covers }: { covers: WallCover[] }) {
  const rows = useMemo(() => {
    if (!covers.length) return []
    return Array.from({ length: ROWS }, (_, row) => {
      const offset = (row * 3) % covers.length
      const line = Array.from({ length: Math.max(10, covers.length) }, (_, i) => covers[(i + offset) % covers.length])
      return [...line, ...line] // doubled for a seamless loop (marquee moves -50%)
    })
  }, [covers])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 flex w-[190%] -translate-x-1/2 -translate-y-1/2 rotate-[-9deg] flex-col gap-4">
        {rows.map((line, row) => (
          <div
            key={row}
            className={cx('flex w-max gap-4 animate-marquee', row % 2 === 1 && '[animation-direction:reverse]')}
            style={{ animationDuration: `${110 + row * 24}s` }}
          >
            {line.map((cover, index) => (
              <img
                key={`${cover.id}-${index}`}
                src={cover.image}
                alt=""
                width={180}
                height={320}
                loading="eager"
                decoding="async"
                className="h-[300px] w-[169px] shrink-0 rounded-[var(--radius-md)] object-cover opacity-90 shadow-[0_20px_50px_-30px_rgb(0_0_0/0.9)]"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
