import { Download } from 'lucide-react'

import { exportHref } from '../lib/clipData'
import { EXPORT_FORMATS } from '../shared/exports'

/** Real download links for one clip: captions plus editor project hand-offs. */
export function ClipExports({ clipId, captionOnly = false }: { clipId: string; captionOnly?: boolean }) {
  const formats = captionOnly ? EXPORT_FORMATS.filter((format) => format.group === 'Captions') : EXPORT_FORMATS
  return (
    <div className="flex flex-wrap gap-2">
      {formats.map((format) => (
        <a
          key={format.id}
          href={exportHref(clipId, format.id)}
          title={`${format.label} — ${format.tool}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-paper px-3 text-[0.8rem] font-semibold transition-colors hover:border-ink focus-visible:outline-[2.5px] focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Download aria-hidden className="size-3.5" />
          {format.label}
        </a>
      ))}
    </div>
  )
}
