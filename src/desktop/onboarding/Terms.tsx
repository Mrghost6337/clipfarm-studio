import { useState } from 'react'

import { Button } from '../../components/Button'
import { Checkbox } from '../../components/Checkbox'
import { Notice } from '../../components/Field'
import { Segmented } from '../../components/Segmented'
import { postJson } from '../../lib/api'
import { LEGAL_PROSE, PrivacyContent, TermsContent } from '../../pages/Legal'
import { PRIVACY_VERSION, TERMS_VERSION } from '../../shared/legal'
import { invoke } from '../bridge'
import { Frame } from './Frame'

/**
 * Step 8: Terms of Use and Privacy Policy, bundled with the app so they read
 * offline. Accepting stores the versions and the time on the account first,
 * then on this PC.
 */
export function Terms({ onDone, onBack }: { onDone: () => void; onBack?: () => void }) {
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms')
  const [accepted, setAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function accept() {
    setSaving(true)
    setError('')
    const res = await postJson<{ user: unknown }>('/api/auth/terms', { terms: TERMS_VERSION, privacy: PRIVACY_VERSION })
    if (!res.ok) {
      setSaving(false)
      setError(res.status === 0 || res.status === 503 ? 'You need to be online once to accept the terms. Check your connection and try again.' : res.error)
      return
    }
    try {
      await invoke('terms:record', { terms: TERMS_VERSION, privacy: PRIVACY_VERSION })
      onDone()
    } catch {
      setError('Your acceptance was saved on your account, but the app could not confirm it. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Frame onBack={onBack} wide>
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-[2.4rem] leading-[1.06] font-semibold tracking-[-0.04em]">Terms and privacy</h1>
        <p className="max-w-xl text-[1rem] text-body">Please read how Clipfarm works with your account, your PC and your files.</p>
        <Segmented<'terms' | 'privacy'>
          label="Document"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'terms', label: 'Terms of Use' },
            { value: 'privacy', label: 'Privacy Policy' },
          ]}
        />
      </div>
      <div tabIndex={0} role="region" aria-label={tab === 'terms' ? 'Terms of Use' : 'Privacy Policy'} className="mt-6 h-[38vh] min-h-[240px] overflow-y-auto rounded-[var(--radius-xl)] bg-paper p-7 shadow-[var(--shadow-card)]">
        <p className="mb-5 text-[0.8rem] font-semibold text-muted">Version {tab === 'terms' ? TERMS_VERSION : PRIVACY_VERSION}</p>
        <div className={LEGAL_PROSE}>{tab === 'terms' ? <TermsContent /> : <PrivacyContent />}</div>
      </div>
      <div className="mt-6 flex flex-col items-center gap-4">
        <Checkbox
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          label="I have read and accept the Terms of Use and the Privacy Policy"
          className="[&>span:last-child]:!text-ink-2 [&>span:last-child]:!no-underline"
        />
        {error && <Notice className="max-w-xl">{error}</Notice>}
        <Button size="lg" onClick={() => void accept()} disabled={!accepted} loading={saving}>
          Accept and continue
        </Button>
      </div>
    </Frame>
  )
}
