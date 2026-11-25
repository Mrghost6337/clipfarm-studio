import { Check, Cloud, Download, FolderOpen, Laptop, Layers, Loader2, Pause, RotateCcw, Trash2, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Notice } from '../components/Field'
import { Tag } from '../components/Pill'
import { requestJson } from '../lib/api'
import { useAuth } from '../lib/auth'
import { cx } from '../lib/cx'
import { pipelineApi } from '../lib/pipeline'
import { invoke, on, type AppInfo, type AppState, type ModelInfo, type ModelProgress, type Pairing, type PcItem, type UpdateStatus } from './bridge'
import { formatBytes, formatDuration, useAuthStatus } from './hooks'
import { Avatar } from './onboarding/Avatar'
import { configureSound, playSound } from './sound'

type Device = { id: string; name: string; createdAt: string | null; lastUsedAt: string | null; current: boolean }

const when = (value: string | null | undefined) => (value ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never')
const message = (error: unknown) => (error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(error))

function Section({ id, title, text, children }: { id: string; title: string; text?: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-8">
      <h2 className="text-[1.25rem] font-semibold tracking-[-0.025em]">{title}</h2>
      {text && <p className="mt-1 text-[0.9rem] text-muted">{text}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  )
}

function Account() {
  const { user, signOut } = useAuth()
  const status = useAuthStatus()
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [error, setError] = useState('')
  const profile = user ?? (status?.state === 'signed-in' ? status.user : null)

  const load = useCallback(async () => {
    const res = await requestJson<{ devices: Device[] }>('/api/auth/devices')
    if (res.ok) setDevices(res.devices)
    else setError(res.error)
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  async function revoke(id: string) {
    const res = await requestJson(`/api/auth/devices/${id}`, { method: 'DELETE' })
    if (!res.ok) setError(res.error)
    await load()
  }

  return (
    <Section id="account" title="Account">
      {profile && (
        <div className="flex items-center gap-4">
          <Avatar name={profile.name} email={profile.email} url={profile.avatarUrl} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1.05rem] font-semibold">{profile.name}</p>
            <p className="truncate text-[0.9rem] text-muted">{profile.email}</p>
          </div>
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      )}
      <h3 className="mt-6 text-[0.95rem] font-semibold">Signed-in apps</h3>
      {error && <Notice className="mt-2">{error}</Notice>}
      <ul className="mt-2 divide-y divide-line">
        {(devices ?? []).map((device) => (
          <li key={device.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-[0.92rem] font-semibold">
                {device.name} {device.current && <Tag tone="peach">This PC</Tag>}
              </span>
              <span className="text-[0.8rem] text-muted">Last used {when(device.lastUsedAt)}</span>
            </span>
            {!device.current && (
              <Button size="sm" variant="secondary" onClick={() => void revoke(device.id)}>
                Sign out
              </Button>
            )}
          </li>
        ))}
        {devices && devices.length === 0 && <li className="py-2.5 text-[0.9rem] text-muted">No signed-in apps.</li>}
      </ul>
    </Section>
  )
}

function Mode({ state }: { state: AppState }) {
  const modes = [
    { id: 'local', title: 'Local', text: 'Runs on this PC. Free.', icon: Laptop, available: true },
    { id: 'cloud', title: 'Cloud', text: 'Premium models on a paid plan.', icon: Cloud, available: false },
    { id: 'both', title: 'Both', text: 'Cloud for long VODs, this PC for the rest.', icon: Layers, available: false },
  ]
  return (
    <Section id="mode" title="How Clipfarm runs">
      <div className="grid grid-cols-3 gap-3">
        {modes.map((mode) => {
          const active = mode.available && (state.workMode ?? 'local') === mode.id
          return (
            <div key={mode.id} className={cx('flex flex-col gap-1 rounded-[var(--radius-md)] border p-4', active ? 'border-ink' : 'border-line opacity-70')}>
              <span className="flex items-center gap-2 font-semibold">
                <mode.icon aria-hidden className="size-4" /> {mode.title}
                {active ? <Tag tone="peach">In use</Tag> : !mode.available && <Tag>Coming soon</Tag>}
              </span>
              <span className="text-[0.85rem] text-muted">{mode.text}</span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function Models({ state, onChanged }: { state: AppState; onChanged: () => void }) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async () => setModels(await invoke('models:list')), [])
  useEffect(() => {
    void load()
    return on('models:progress', (update: ModelProgress) => setModels((list) => list.map((item) => (item.id === update.id ? { ...item, installed: update.state === 'installed', progress: update } : item))))
  }, [load])

  async function use(id: string) {
    setBusy(id)
    setError('')
    try {
      const result = await invoke('models:test', id)
      if (!result.ok) setError('The test transcription did not work with this model.')
      onChanged()
    } catch (failure) {
      setError(message(failure))
    } finally {
      setBusy('')
    }
  }

  async function remove(id: string) {
    setError('')
    try {
      setModels(await invoke('models:remove', id))
    } catch (failure) {
      setError(message(failure))
    }
  }

  return (
    <Section id="models" title="Speech models" text="Models run on this PC. Each file is checked with SHA-256 before it is installed.">
      {error && <Notice className="mb-3">{error}</Notice>}
      <ul className="flex flex-col gap-3">
        {models.map((model) => {
          const progress = model.progress
          const downloading = progress?.state === 'downloading' || progress?.state === 'verifying'
          const active = state.selectedModel === model.id
          return (
            <li key={model.id} className="rounded-[var(--radius-md)] border border-line p-4">
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="flex items-center gap-2 font-semibold">
                    Whisper {model.label} {active && <Tag tone="peach">In use</Tag>} {state.pcCheck.recommendedModel === model.id && !active && <Tag>Recommended</Tag>}
                  </span>
                  <span className="text-[0.82rem] text-muted">
                    {formatBytes(model.bytes)} · {model.installed ? 'Installed' : progress && progress.received > 0 ? `${Math.round((progress.received / model.bytes) * 100)}% downloaded` : 'Not downloaded'}
                    {downloading && progress && progress.speed > 0 ? ` · ${formatBytes(progress.speed)}/s · ${formatDuration(progress.eta)} left` : ''}
                  </span>
                </span>
                <span className="flex gap-2">
                  {!model.installed && !downloading && (
                    <Button size="sm" variant="secondary" icon={<Download aria-hidden className="size-4" />} onClick={() => void invoke('models:download', model.id)}>
                      {progress && progress.received > 0 ? 'Resume' : 'Download'}
                    </Button>
                  )}
                  {downloading && (
                    <Button size="sm" variant="secondary" icon={<Pause aria-hidden className="size-4" />} onClick={() => void invoke('models:pause', model.id)}>
                      Pause
                    </Button>
                  )}
                  {model.installed && !active && (
                    <>
                      <Button size="sm" loading={busy === model.id} onClick={() => void use(model.id)}>
                        Test and use
                      </Button>
                      <Button size="sm" variant="ghost" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => void remove(model.id)}>
                        Remove
                      </Button>
                    </>
                  )}
                </span>
              </div>
              {progress?.state === 'error' && <Notice className="mt-3">{progress.error}</Notice>}
              {downloading && progress && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sand">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((progress.received / progress.total) * 100)}%` }} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

function PcCheckAgain({ state, onChanged }: { state: AppState; onChanged: () => void }) {
  const [items, setItems] = useState<PcItem[]>([])
  const [running, setRunning] = useState(false)
  const [reason, setReason] = useState('')
  useEffect(() => on('pccheck:item', (item) => setItems((current) => [...current.filter((entry) => entry.id !== item.id), item])), [])

  async function run() {
    setRunning(true)
    setItems([])
    try {
      const result = await invoke('pccheck:run')
      setReason(`Recommended: Whisper ${result.recommendation.model.replace('whisper-', '')}. ${result.recommendation.reason}`)
      void playSound('check')
      onChanged()
    } catch (failure) {
      setReason(message(failure))
    } finally {
      setRunning(false)
    }
  }

  return (
    <Section id="pccheck" title="PC check" text={state.pcCheck.completedAt ? `Last run ${when(state.pcCheck.completedAt)}. Nothing from the check leaves this PC.` : 'Not run yet. Nothing from the check leaves this PC.'}>
      <Button variant="secondary" loading={running} icon={<RotateCcw aria-hidden className="size-4" />} onClick={() => void run()}>
        Run the PC check
      </Button>
      {items.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-2 text-[0.85rem]">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              {item.state === 'done' ? <Check aria-hidden className="mt-0.5 size-4 text-success" /> : <Loader2 aria-hidden className="mt-0.5 size-4 animate-spin text-muted" />}
              <span>
                <b className="font-semibold">{item.label}</b> {item.state === 'running' ? `${Math.round(item.progress * 100)}%` : ''}
                {item.detail && <span className="block text-muted">{item.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {reason && <p className="mt-4 text-[0.9rem] text-body">{reason}</p>}
    </Section>
  )
}

function Storage({ info }: { info: AppInfo }) {
  const [usage, setUsage] = useState<{ bytes: number; files: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const load = useCallback(async () => setUsage(await pipelineApi<{ bytes: number; files: number }>('/cache').catch(() => null)), [])
  useEffect(() => {
    void load()
  }, [load])

  return (
    <Section id="storage" title="Storage" text={`Everything Clipfarm keeps on this PC is in ${info.dataDir}.`}>
      <p className="text-[0.95rem]">{usage ? `Clips, downloads and jobs use ${formatBytes(usage.bytes)} in ${usage.files.toLocaleString()} files.` : 'Usage appears when the pipeline runs.'}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          loading={busy}
          onClick={async () => {
            setBusy(true)
            const result = await pipelineApi<{ removed: number }>('/cache', { method: 'DELETE' }).catch(() => null)
            setNote(result ? `Removed ${result.removed} downloaded video${result.removed === 1 ? '' : 's'}. Finished clips were kept.` : 'The pipeline is not running.')
            setBusy(false)
            await load()
          }}
        >
          Clear downloaded videos
        </Button>
        <Button variant="secondary" icon={<FolderOpen aria-hidden className="size-4" />} onClick={() => void invoke('shell:open-path', 'data')}>
          Open folder
        </Button>
        <Button variant="danger-ghost" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => void invoke('data:delete-local')}>
          Delete local data
        </Button>
      </div>
      {note && <p className="mt-3 text-[0.85rem] text-muted">{note}</p>}
    </Section>
  )
}

function Sound({ state, onChanged }: { state: AppState; onChanged: () => void }) {
  const save = async (sound: AppState['sound']) => {
    configureSound(sound)
    await invoke('state:update', { sound })
    onChanged()
  }
  return (
    <Section id="sound" title="Sound" text="A short sound plays when the app starts, when the PC check and models are done, and when you press Start.">
      <div className="flex flex-wrap items-center gap-5">
        <label className="flex min-h-11 items-center gap-3 font-semibold">
          <input type="checkbox" className="size-5 accent-[var(--color-ink)]" checked={state.sound.enabled} onChange={(event) => void save({ ...state.sound, enabled: event.target.checked })} />
          Sounds on
        </label>
        <label className="flex min-h-11 flex-1 items-center gap-3 font-semibold">
          Volume
          <input type="range" min={0} max={1} step={0.05} value={state.sound.volume} disabled={!state.sound.enabled} onChange={(event) => void save({ ...state.sound, volume: Number(event.target.value) })} className="h-11 flex-1 accent-[var(--color-ink)]" aria-valuetext={`${Math.round(state.sound.volume * 100)}%`} />
          <span className="w-12 text-right tabular-nums">{Math.round(state.sound.volume * 100)}%</span>
        </label>
        <Button variant="secondary" size="sm" disabled={!state.sound.enabled} icon={<Volume2 aria-hidden className="size-4" />} onClick={() => void playSound('intro')}>
          Play
        </Button>
      </div>
    </Section>
  )
}

function Browsers() {
  const [pairings, setPairings] = useState<Pairing[] | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      setPairings(await invoke('pairing:list'))
    } catch (failure) {
      setError(message(failure))
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  return (
    <Section id="browsers" title="Connected browsers" text="Browsers you allowed to use the Clipfarm pipeline on this PC, for the Studio on the website.">
      {error && <Notice className="mb-3">{error}</Notice>}
      <ul className="divide-y divide-line">
        {(pairings ?? []).map((pairing) => (
          <li key={pairing.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{pairing.name}</span>
              <span className="text-[0.8rem] text-muted">
                {pairing.origin} · last used {when(pairing.last_used_at)}
              </span>
            </span>
            <Button size="sm" variant="secondary" onClick={async () => setPairings(await invoke('pairing:revoke', pairing.id))}>
              Disconnect
            </Button>
          </li>
        ))}
        {pairings && pairings.length === 0 && <li className="py-2.5 text-[0.9rem] text-muted">No browsers connected. Open the Studio on the website and choose “Connect this browser”.</li>}
      </ul>
    </Section>
  )
}

function Updates({ info }: { info: AppInfo }) {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  useEffect(() => {
    void invoke('update:status').then(setStatus)
    return on('update:status', setStatus)
  }, [])
  const label =
    status?.state === 'checking'
      ? 'Checking for updates…'
      : status?.state === 'downloading'
        ? `Downloading ${status.version ?? 'the update'}${status.progress !== null ? ` · ${Math.round(status.progress * 100)}%` : ''}`
        : status?.state === 'ready'
          ? `Version ${status.version} is ready to install.`
          : status?.state === 'none'
            ? 'You have the latest version.'
            : status?.error ?? ''
  return (
    <Section id="updates" title="Updates" text={`Version ${info.version}. Updates download in the background and install when you restart.`}>
      <p className="text-[0.95rem]">{label}</p>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" disabled={status?.state === 'unavailable' || status?.state === 'checking'} onClick={async () => setStatus(await invoke('update:check'))}>
          Check for updates
        </Button>
        {status?.state === 'ready' && <Button onClick={() => void invoke('update:install')}>Restart to update</Button>}
      </div>
    </Section>
  )
}

/** Desktop settings: account, mode, models, PC check, storage, sound, browsers, updates and logs. */
export function DesktopSettings() {
  const [state, setState] = useState<AppState | null>(null)
  const [info, setInfo] = useState<AppInfo | null>(null)
  const reload = useCallback(async () => setState(await invoke('state:get')), [])
  useEffect(() => {
    void reload()
    void invoke('app:info').then(setInfo)
  }, [reload])

  if (!state || !info) return <div role="status" className="p-8 text-muted">Loading settings…</div>

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-5">
      <h1 className="text-[2.2rem] font-semibold tracking-[-0.04em]">Settings</h1>
      <Account />
      <Mode state={state} />
      <Models state={state} onChanged={reload} />
      <PcCheckAgain state={state} onChanged={reload} />
      <Storage info={info} />
      <Sound state={state} onChanged={reload} />
      <Browsers />
      <Updates info={info} />
      <Section id="logs" title="Logs" text="The app and the pipeline write logs on this PC. Tokens and secrets are removed before anything is written.">
        <Button variant="secondary" icon={<FolderOpen aria-hidden className="size-4" />} onClick={() => void invoke('shell:open-path', 'logs')}>
          Open logs folder
        </Button>
      </Section>
    </div>
  )
}
