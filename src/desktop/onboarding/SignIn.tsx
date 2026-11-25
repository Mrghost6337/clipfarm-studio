import { Check, Copy, ExternalLink, Loader2, RotateCcw, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ArrowButton, Button } from '../../components/Button'
import { Notice } from '../../components/Field'
import { LogoMark } from '../../components/Logo'
import { invoke } from '../bridge'
import { useAuthStatus } from '../hooks'
import { Frame } from './Frame'

/** Step 4: sign in through the system browser (PKCE code back to the app). */
export function SignIn({ onDone, onBack }: { onDone: () => void; onBack?: () => void }) {
  const status = useAuthStatus()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (status?.state === 'signed-in') onDone()
  }, [status?.state, onDone])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const start = () => void invoke('auth:start')
  const waiting = status?.state === 'waiting'
  const exchanging = status?.state === 'exchanging'

  return (
    <Frame onBack={waiting || exchanging ? undefined : onBack}>
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="grid size-16 place-items-center rounded-[var(--radius-lg)] bg-ink text-apricot shadow-[var(--shadow-button)]">
          <LogoMark className="size-9" />
        </span>
        <h1 className="text-[2.2rem] leading-[1.08] font-semibold tracking-[-0.04em] text-balance">Log in or sign up with your account to continue</h1>

        {status?.state === 'expired' && <Notice tone="info">Your session ended. Log in again to continue.</Notice>}
        {status?.state === 'error' && <Notice>{status.message}</Notice>}

        {waiting || exchanging ? (
          <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-[var(--radius-xl)] bg-paper p-7 shadow-[var(--shadow-card)]" role="status" aria-live="polite">
            <span className="flex items-center gap-2.5 text-[1.05rem] font-semibold">
              <Loader2 aria-hidden className="size-5 animate-spin text-accent-ink" />
              {exchanging ? 'Finishing sign-in…' : 'Waiting for your browser…'}
            </span>
            <p className="text-[0.9rem] leading-relaxed text-body">
              {exchanging ? 'Checking the one-time code with Clipfarm.' : 'Log in or create your account in the browser window that just opened. This app comes back to the front when you are done.'}
            </p>
            {waiting && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" size="sm" icon={<ExternalLink aria-hidden className="size-4" />} onClick={() => void invoke('shell:open-external', status.url)}>
                  Open the page again
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={copied ? <Check aria-hidden className="size-4 text-success" /> : <Copy aria-hidden className="size-4" />}
                  onClick={() => void navigator.clipboard.writeText(status.url).then(() => setCopied(true))}
                >
                  {copied ? 'Link copied' : 'Copy link'}
                </Button>
                <Button variant="ghost" size="sm" icon={<RotateCcw aria-hidden className="size-4" />} onClick={start}>
                  Start again
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void invoke('auth:cancel')}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ArrowButton size="lg" onClick={start}>
            Log in or sign up via browser
          </ArrowButton>
        )}

        <p className="flex max-w-md items-start gap-2 text-left text-[0.8rem] leading-relaxed text-muted">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          Your password stays in the browser. The app receives a one-time code and keeps its own sign-in encrypted by Windows on this PC.
        </p>
      </div>
    </Frame>
  )
}
