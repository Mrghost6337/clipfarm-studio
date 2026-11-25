import { Bot, Check, Play, X } from 'lucide-react'
import { useState } from 'react'

import { AGENTS, type AgentReport } from '../shared/agents'
import type { Clip } from '../shared/clips'
import { Button } from './Button'
import { cx } from '../lib/cx'

/** Runs the deterministic agents over the selected clip and shows their real findings. */
export function AgentConsole({ clip }: { clip: Clip }) {
  const [reports, setReports] = useState<Record<string, AgentReport>>({})

  function run(id: string) {
    const agent = AGENTS.find((item) => item.id === id)
    if (!agent) return
    setReports((current) => ({ ...current, [id]: agent.run(clip) }))
  }

  function runAll() {
    setReports(Object.fromEntries(AGENTS.map((agent) => [agent.id, agent.run(clip)])))
  }

  const done = AGENTS.filter((agent) => reports[agent.id])
  const failing = done.filter((agent) => !reports[agent.id].passed).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.84rem] text-muted">
          {done.length ? `${done.length}/${AGENTS.length} agents run · ${failing ? `${failing} with findings` : 'all checks pass'}` : 'Idle — nothing has run yet.'}
        </p>
        <Button size="sm" variant="secondary" icon={<Play aria-hidden className="size-3.5" />} onClick={runAll}>
          Run all agents
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {AGENTS.map((agent) => {
          const report = reports[agent.id]
          return (
            <article key={agent.id} className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-sand text-accent-ink">
                    <Bot className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-[0.98rem] font-semibold">{agent.name}</h3>
                    <p className="text-[0.78rem] leading-relaxed text-muted">{agent.description}</p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => run(agent.id)}>
                  {report ? 'Run again' : 'Run'}
                </Button>
              </div>

              {report ? (
                <div className="flex flex-col gap-2">
                  <p className={cx('rounded-[var(--radius-md)] px-3 py-2 text-[0.8rem] font-semibold', report.passed ? 'bg-success-soft text-success' : 'bg-[#fdeee2] text-accent-ink')}>
                    {report.passed ? 'Pass — ' : 'Findings — '}
                    {report.summary}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {report.checks.map((check) => (
                      <li key={check.label} className="flex items-start gap-2 text-[0.8rem]">
                        <span aria-hidden className={cx('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full', check.ok ? 'bg-success-soft text-success' : 'bg-[#fdeee2] text-accent-ink')}>
                          {check.ok ? <Check className="size-3" /> : <X className="size-3" />}
                        </span>
                        <span className="min-w-0">
                          <span className="font-semibold">{check.label}</span>
                          <span className="text-muted"> — {check.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[0.78rem] text-muted">Not run on this clip yet.</p>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
