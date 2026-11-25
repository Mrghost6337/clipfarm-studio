import { RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'

import { Button } from '../components/Button'
import { Checkbox } from '../components/Checkbox'
import { Container } from '../components/Container'
import { CtaBand } from '../components/CtaBand'
import { Modal } from '../components/Overlay'
import { PageHero } from '../components/PageHero'
import { Tag } from '../components/Pill'
import { Reveal } from '../components/Reveal'
import { Segmented } from '../components/Segmented'
import { useToast } from '../components/Toast'
import { PLAN_PAGE, SITE } from '../content'
import { cx } from '../lib/cx'
import { readJson, writeJson } from '../lib/storage'
import { usePageTitle } from '../lib/title'

type StageId = (typeof PLAN_PAGE.stages)[number]['id']
const TICKS_KEY = `${SITE.storagePrefix}.pipeline.ticks`
const STAGE_KEY = `${SITE.storagePrefix}.pipeline.stage`

const allItems = PLAN_PAGE.phases.flatMap((p) => p.weeks.flatMap((w) => w.items.map((item) => `${p.id}:${item}`)))

export function PlanPage() {
  usePageTitle('The pipeline')
  const toast = useToast()
  const [stage, setStage] = useState<StageId>(() => readJson<StageId>(STAGE_KEY, 'growing'))
  const [ticks, setTicks] = useState<string[]>(() => readJson<string[]>(TICKS_KEY, []).filter((t) => allItems.includes(t)))
  const [confirm, setConfirm] = useState(false)
  const current = PLAN_PAGE.stages.find((s) => s.id === stage)!
  const pct = Math.round((ticks.length / allItems.length) * 100)
  const perPhase = useMemo(() => Object.fromEntries(PLAN_PAGE.phases.map((p) => [p.id, ticks.filter((t) => t.startsWith(`${p.id}:`)).length])), [ticks])

  const toggle = (key: string) => {
    setTicks((t) => {
      const next = t.includes(key) ? t.filter((x) => x !== key) : [...t, key]
      writeJson(TICKS_KEY, next)
      return next
    })
  }
  const chooseStage = (s: StageId) => {
    setStage(s)
    writeJson(STAGE_KEY, s)
  }
  const reset = () => {
    setTicks([])
    writeJson(TICKS_KEY, [])
    setConfirm(false)
    toast('Ticks cleared')
  }

  return (
    <>
      <PageHero eyebrow={PLAN_PAGE.eyebrow} title={PLAN_PAGE.title} text={PLAN_PAGE.text}>
        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-4">
          <span className="text-[0.9rem] font-semibold text-ink-2">{PLAN_PAGE.stageLabel}</span>
          <div className="max-w-full overflow-x-auto p-1">
            <Segmented label={PLAN_PAGE.stageLabel} value={stage} onChange={chooseStage} options={PLAN_PAGE.stages.map((s) => ({ value: s.id, label: s.label }))} />
          </div>
          <div className="flex flex-wrap justify-center gap-2" aria-live="polite">
            <span className="sr-only">Focus for {current.label}:</span>
            {current.focus.map((f) => (
              <Tag key={f} tone="ink">
                {f}
              </Tag>
            ))}
          </div>
        </div>
      </PageHero>

      <section className="sticky top-[92px] z-30 sm:top-[106px]">
        <Container>
          <div className="flex items-center gap-4 rounded-full bg-paper/95 py-2 pr-2 pl-5 shadow-[var(--shadow-card)] backdrop-blur">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Pipeline progress">
              <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${pct}%` }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <span className="text-[0.875rem] whitespace-nowrap text-body">
              <b className="font-semibold text-ink tabular-nums">{pct}%</b> <span className="hidden sm:inline">{PLAN_PAGE.progress}</span>
            </span>
            <Button variant="ghost" size="sm" disabled={!ticks.length} onClick={() => setConfirm(true)} icon={<RotateCcw aria-hidden className="size-4" />}>
              <span className="hidden sm:inline">{PLAN_PAGE.reset}</span>
              <span className="sm:hidden">Reset</span>
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <ol className="grid gap-5 lg:grid-cols-3">
            {PLAN_PAGE.phases.map((ph, i) => {
              const count = ph.weeks.reduce((n, w) => n + w.items.length, 0)
              const done = perPhase[ph.id] === count
              return (
                <Reveal as="li" key={ph.id} delay={i * 0.06} className={cx('flex h-full flex-col gap-6 rounded-[var(--radius-xl)] p-7 transition-colors duration-[var(--duration-base)]', done ? 'bg-peach' : 'bg-paper shadow-[var(--shadow-card)]')}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="round grid size-11 place-items-center rounded-full bg-ink font-semibold text-white">{i + 1}</span>
                      <span className="text-[0.875rem] font-semibold text-accent-ink tabular-nums">
                        {perPhase[ph.id]}/{count} done
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-[0.875rem] font-semibold text-muted">{ph.days}</p>
                      <h2 className="text-[2rem] leading-none font-semibold tracking-[-0.04em]">{ph.name}</h2>
                      <p className="text-[0.975rem] leading-relaxed text-body">{ph.goal}</p>
                    </div>
                    <div className="flex flex-col gap-5">
                      {ph.weeks.map((w) => (
                        <fieldset key={w.week} className="flex flex-col gap-1 border-t border-line pt-4">
                          <legend className="sr-only">
                            {w.week}: {w.title}
                          </legend>
                          <p aria-hidden className="flex items-baseline justify-between gap-2 pb-1">
                            <span className="font-semibold">{w.title}</span>
                            <span className="text-[0.8125rem] font-medium text-muted">{w.week}</span>
                          </p>
                          {w.items.map((item) => {
                            const key = `${ph.id}:${item}`
                            return <Checkbox key={key} label={item} checked={ticks.includes(key)} onChange={() => toggle(key)} />
                          })}
                        </fieldset>
                      ))}
                    </div>
                    <div className="mt-auto rounded-[var(--radius-md)] bg-sand p-4 text-[0.9rem]">
                      <span className="font-semibold">Quick win: </span>
                      <span className="text-body">{ph.quickWin}</span>
                    </div>
                </Reveal>
              )
            })}
          </ol>
        </Container>
      </section>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Clear all ticks?" description="This clears your progress on this device. It cannot be undone.">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirm(false)} data-autofocus>
            Keep them
          </Button>
          <Button onClick={reset}>Clear ticks</Button>
        </div>
      </Modal>

      <CtaBand title={PLAN_PAGE.cta.title} text={PLAN_PAGE.cta.text} button={PLAN_PAGE.cta.button} />
    </>
  )
}
