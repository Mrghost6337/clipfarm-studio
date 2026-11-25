import { Menu, Plus, RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import { useState, type ReactNode } from 'react'

import { Accordion } from '../components/Accordion'
import { ArrowButton, ArrowLink, Button, IconButton, type Force, type Variant } from '../components/Button'
import { Card, Stat } from '../components/Card'
import { ServiceCard } from '../components/Cards'
import { Checkbox } from '../components/Checkbox'
import { CheckList, CheckPoint } from '../components/CheckItem'
import { Container } from '../components/Container'
import { Notice, SelectField, TextArea, TextField } from '../components/Field'
import { Logo } from '../components/Logo'
import { Marquee } from '../components/Marquee'
import { Drawer, Modal } from '../components/Overlay'
import { Badge, CheckPill, Chip, Eyebrow, Tag } from '../components/Pill'
import { Scribble } from '../components/Scribble'
import { Segmented } from '../components/Segmented'
import { Stepper } from '../components/Stepper'
import { ToastPreview, useToast } from '../components/Toast'
import { FAQS, HERO, SERVICES } from '../content'
import { usePageTitle } from '../lib/title'

const COLORS = [
  ['page', '#f2f2f0', 'Page background'],
  ['paper', '#ffffff', 'Cards, nav, fields'],
  ['sand', '#f7f3ec', 'Inset panels'],
  ['ink', '#1c1a14', 'Text, primary buttons'],
  ['ink-2', '#2b2820', 'Secondary text, hover'],
  ['body', '#4a463e', 'Paragraphs'],
  ['muted', '#625d53', 'Captions, hints'],
  ['line', '#e3e0da', 'Hairlines'],
  ['line-strong', '#cfcac1', 'Control borders'],
  ['disc', '#57534b', 'Button arrow disc'],
  ['peach', '#fbe4c6', 'Tint fills'],
  ['apricot', '#f5b765', 'Hero glow'],
  ['accent', '#f0a24b', 'Check dots, fills (not text)'],
  ['accent-ink', '#94510b', 'Accent text on light'],
  ['success', '#1f7a4a', 'Success text'],
  ['danger', '#b4232f', 'Error text'],
  ['star', '#f5b324', 'Rating stars'],
]
const TYPE = [
  ['Display', 'text-[4.15rem] leading-[1.13] font-semibold tracking-[-0.022em]', '66 / 600'],
  ['H1', 'text-[3.5rem] leading-[1.04] font-semibold tracking-[-0.04em]', '56 / 600'],
  ['H2', 'text-[2.9rem] leading-[1.06] font-semibold tracking-[-0.04em]', '46 / 600'],
  ['H3', 'text-[1.3rem] font-semibold tracking-[-0.025em]', '21 / 600'],
  ['Statement', 'text-[1.1875rem] leading-[1.32] font-medium tracking-[-0.018em]', '19 / 500'],
  ['Body', 'text-[1.0625rem] leading-[1.6] text-body', '17 / 400'],
  ['Small', 'text-[0.875rem] text-muted', '14 / 400'],
  ['Hand', 'font-hand text-[1.6rem] font-semibold', 'Caveat 26'],
]
const SPACING = [4, 8, 12, 16, 20, 24, 32, 48, 64, 96]
const RADII = [['sm', 12], ['md', 18], ['lg', 26], ['xl', 34], ['full', 9999]] as const
const SHADOWS = ['nav', 'card', 'raise', 'button']
const MOTION = [
  ['fast', '160ms', 'ease-out-soft'],
  ['base', '280ms', 'ease-out-soft'],
  ['slow', '600ms', 'ease-out-soft'],
  ['spring', '280ms', 'ease-spring'],
]
const STATES: Array<[string, Force | undefined, boolean?, boolean?]> = [
  ['Default', undefined],
  ['Hover', 'hover'],
  ['Focus', 'focus'],
  ['Pressed', 'pressed'],
  ['Disabled', undefined, true],
  ['Loading', undefined, false, true],
]
const VARIANTS: Variant[] = ['primary', 'secondary', 'ghost', 'light']

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28 border-t border-line py-14">
      <h2 id={`${id}-h`} className="mb-8 text-[1.75rem] font-semibold tracking-[-0.03em]">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <span className="text-[0.8125rem] font-medium text-muted">{children}</span>
}

export function Styleguide() {
  usePageTitle('Style guide')
  const toast = useToast()
  const [replay, setReplay] = useState(0)
  const [modal, setModal] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a')
  const [chips, setChips] = useState<string[]>(['Highlights'])
  return (
    <Container className="pt-12 pb-20">
      <Eyebrow>Design system</Eyebrow>
      <h1 className="mt-4 text-[2.8rem] leading-tight font-semibold tracking-[-0.04em] sm:text-[3.5rem]">Style guide</h1>
      <p className="mt-3 max-w-2xl text-[1.0625rem] text-body">Tokens live in src/styles.css under @theme. Every example below is the real component; hover, focus and pressed are pinned with data-force.</p>
      <nav aria-label="Style guide sections" className="mt-8 flex flex-wrap gap-2">
        {['colours', 'type', 'spacing', 'radii', 'shadows', 'motion', 'buttons', 'pills', 'fields', 'controls', 'feedback', 'cards', 'brand'].map((s) => (
          <a key={s} href={`#${s}`} className="inline-flex h-10 items-center rounded-full border border-line-strong bg-paper px-4 text-[0.875rem] font-medium capitalize hover:border-ink">
            {s}
          </a>
        ))}
      </nav>

      <Section id="colours" title="Colour">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {COLORS.map(([name, hex, use]) => (
            <li key={name} className="flex flex-col gap-2">
              <span className="h-20 rounded-[var(--radius-md)] border border-line" style={{ background: hex }} />
              <span className="text-[0.9rem] font-semibold">{name}</span>
              <span className="text-[0.8125rem] text-muted tabular-nums">{hex}</span>
              <span className="text-[0.8125rem] text-muted">{use}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="type" title="Type">
        <p className="mb-6 text-body">Inter Tight for everything, Caveat for the one hand-written note.</p>
        <div className="flex flex-col gap-6">
          {TYPE.map(([name, cls, spec]) => (
            <div key={name} className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-baseline">
              <Label>
                {name} <span className="tabular-nums">{spec}</span>
              </Label>
              <p className={`${cls} break-words`}>Clip farming</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="spacing" title="Spacing">
        <div className="flex flex-wrap items-end gap-4">
          {SPACING.map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <span className="block rounded-[4px] bg-accent" style={{ width: s, height: s }} />
              <Label>{s}</Label>
            </div>
          ))}
        </div>
      </Section>

      <Section id="radii" title="Radii">
        <p className="mb-6 text-body">Everything rounded is a squircle; pills and circles (rounded-full) keep round ends.</p>
        <div className="flex flex-wrap gap-6">
          {RADII.map(([n, r]) => (
            <div key={n} className="flex flex-col items-center gap-2">
              <span className="block size-24 border-2 border-ink bg-paper" style={{ borderRadius: r === 9999 ? 9999 : `var(--radius-${n})` }} />
              <Label>
                {n} {r === 9999 ? '' : `${r}px`}
              </Label>
            </div>
          ))}
        </div>
      </Section>

      <Section id="shadows" title="Shadows">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {SHADOWS.map((s) => (
            <div key={s} className="flex h-28 items-end rounded-[var(--radius-lg)] bg-paper p-4" style={{ boxShadow: `var(--shadow-${s})` }}>
              <Label>shadow-{s}</Label>
            </div>
          ))}
        </div>
      </Section>

      <Section id="motion" title="Motion">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => setReplay((n) => n + 1)} icon={<RotateCcw aria-hidden className="size-4" />}>
            Replay
          </Button>
          <p className="text-[0.9rem] text-muted">Reduced motion turns these into instant changes, stops the marquees and the glow.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {MOTION.map(([n, d, e]) => (
            <div key={n} className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-paper p-5 shadow-[var(--shadow-card)]">
              <Label>
                duration-{n} {d}, {e}
              </Label>
              <div className="h-10 rounded-full bg-sand p-1">
                <motion.span key={replay} className="round block size-8 rounded-full bg-ink" initial={{ x: 0 }} animate={{ x: 200 }} transition={n === 'spring' ? { type: 'spring', stiffness: 260, damping: 14 } : { duration: parseInt(d) / 1000, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-paper p-5 shadow-[var(--shadow-card)]">
            <Label>animate-draw + animate-wiggle (hero note)</Label>
            <div key={replay}>
              <Scribble note={HERO.note} />
            </div>
          </div>
          <div className="flex flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] bg-paper p-5 shadow-[var(--shadow-card)]">
            <Label>animate-marquee (pauses on hover)</Label>
            <Marquee className="[--gap:10px]">
              {HERO.pills.slice(0, 3).map((p) => (
                <CheckPill key={p}>{p}</CheckPill>
              ))}
            </Marquee>
          </div>
        </div>
      </Section>

      <Section id="buttons" title="Buttons">
        <div role="region" aria-label="Button states" tabIndex={0} className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-3 text-left">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Variant</span>
                </th>
                {STATES.map(([s]) => (
                  <th key={s} scope="col">
                    <Label>{s}</Label>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VARIANTS.map((v) => (
                <tr key={v}>
                  <th scope="row">
                    <Label>{v}</Label>
                  </th>
                  {STATES.map(([s, force, disabled, loading]) => (
                    <td key={s}>
                      <Button variant={v} force={force} disabled={disabled} loading={loading} size="sm" tabIndex={-1}>
                        Button
                      </Button>
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">
                  <Label>arrow</Label>
                </th>
                {STATES.map(([s, force, disabled, loading]) => (
                  <td key={s}>
                    <ArrowButton force={force} disabled={disabled} loading={loading} tabIndex={-1}>
                      Book
                    </ArrowButton>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">
                  <Label>icon</Label>
                </th>
                {STATES.map(([s, force, disabled]) => (
                  <td key={s}>
                    <IconButton aria-label="Add" force={force} disabled={disabled} tabIndex={-1}>
                      <Plus className="size-5" />
                    </IconButton>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Label>Sizes</Label>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <ArrowLink to="/signup">Start free</ArrowLink>
          <ArrowLink to="/signup" size="lg">
            Start free
          </ArrowLink>
        </div>
      </Section>

      <Section id="pills" title="Pills, chips and tags">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{HERO.badge}</Badge>
            <Badge tone="white">White badge</Badge>
            <Badge tone="peach">Peach badge</Badge>
            <Eyebrow>Eyebrow</Eyebrow>
          </div>
          <div className="flex flex-wrap gap-3">
            <CheckPill wrap>{HERO.pills[0]}</CheckPill>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Label>Chip</Label>
            <Chip tabIndex={-1}>Default</Chip>
            <Chip selected tabIndex={-1}>
              Selected
            </Chip>
            <Chip force="hover" tabIndex={-1}>
              Hover
            </Chip>
            <Chip force="focus" tabIndex={-1}>
              Focus
            </Chip>
            <Chip force="pressed" tabIndex={-1}>
              Pressed
            </Chip>
            <Chip disabled>Disabled</Chip>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Label>Live</Label>
            {['Highlights', 'Captions', 'Audio'].map((c) => (
              <Chip key={c} selected={chips.includes(c)} onClick={() => setChips((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}>
                {c}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Label>Tag</Label>
            <Tag>Line</Tag>
            <Tag tone="peach">Peach</Tag>
            <Tag tone="ink">Ink</Tag>
          </div>
        </div>
      </Section>

      <Section id="fields" title="Fields">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Empty" placeholder="you@company.com" />
          <TextField label="Filled" defaultValue="Maya Lindqvist" />
          <TextField label="Hover" defaultValue="Hover" force="hover" tabIndex={-1} />
          <TextField label="Focus" defaultValue="Focus" force="focus" tabIndex={-1} />
          <TextField label="Error" defaultValue="maya@" error="Enter a valid work email." />
          <TextField label="Disabled" defaultValue="Disabled" disabled />
          <TextField label="With hint" optional hint="We only use this to send the invite." />
          <SelectField label="Select" options={['Twitch', 'YouTube', 'TikTok']} placeholder="Choose" />
          <SelectField label="Select error" options={['Twitch']} placeholder="Choose" error="Choose your platform." />
          <TextArea label="Text area" placeholder="Anything we should know?" className="sm:col-span-2 lg:col-span-3" />
        </div>
      </Section>

      <Section id="controls" title="Controls">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Checkbox label="Unchecked" />
            <Checkbox label="Checked" defaultChecked />
            <Checkbox label="Hover" force="hover" tabIndex={-1} />
            <Checkbox label="Focus" force="focus" tabIndex={-1} />
            <Checkbox label="Disabled" disabled />
          </div>
          <div className="flex flex-col gap-6">
            <Segmented
              label="Example toggle"
              value={seg}
              onChange={setSeg}
              options={[
                { value: 'a', label: 'Monthly' },
                { value: 'b', label: 'Quarterly' },
                { value: 'c', label: 'Yearly' },
              ]}
            />
            <Stepper steps={['Your channel', 'What to clip', 'Pick a time']} current={1} />
            <Stepper steps={['Your channel', 'What to clip', 'Pick a time']} current={2} />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setModal(true)}>
                Open modal
              </Button>
              <Button variant="secondary" onClick={() => setDrawer(true)} icon={<Menu aria-hidden className="size-4" />}>
                Open drawer
              </Button>
            </div>
          </div>
        </div>
        <Accordion items={FAQS.slice(0, 3)} className="mt-8" />
        <Modal open={modal} onClose={() => setModal(false)} title="Modal title" description="Focus is trapped here; Escape closes and focus returns to the trigger.">
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModal(false)}>Confirm</Button>
          </div>
        </Modal>
        <Drawer open={drawer} onClose={() => setDrawer(false)} title="Drawer">
          <p className="text-body">The mobile menu uses this drawer.</p>
        </Drawer>
      </Section>

      <Section id="feedback" title="Feedback, empty and loading">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Notice>Check the highlighted fields.</Notice>
            <Notice tone="success">Your booking is confirmed.</Notice>
            <Notice tone="info">No times left on this day. Try another day.</Notice>
          </div>
          <div className="flex flex-col items-start gap-4">
            <ToastPreview>Ticks cleared</ToastPreview>
            <Button variant="secondary" size="sm" onClick={() => toast('This is a live toast')}>
              Show a toast
            </Button>
            <div role="status" aria-label="Loading example" className="grid w-full grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-11 animate-pulse rounded-full bg-ink/6" />
              ))}
            </div>
            <div className="flex w-full flex-col items-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-line-strong px-6 py-8 text-center">
              <p className="font-semibold">No clips match that search.</p>
              <Button variant="secondary" size="sm">
                Clear filters
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section id="cards" title="Cards">
        <div className="grid gap-5 md:grid-cols-3">
          <ServiceCard service={SERVICES[0]} />
          <ServiceCard service={SERVICES[SERVICES.length - 1]} />
          <div className="flex flex-col gap-5">
            <Card>
              <Stat value="1080×1920" label="vertical exports" />
            </Card>
            <Card tone="ink">
              <Stat value="3" label="caption files per clip" tone="white" />
            </Card>
            <Card tone="sand">
              <CheckList items={['Sand card', 'With a check list']} size="sm" />
            </Card>
          </div>
        </div>
      </Section>

      <Section id="brand" title="Brand">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-8">
            <Logo />
            <span className="rounded-[var(--radius-md)] bg-ink p-4">
              <Logo tone="white" />
            </span>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {HERO.points.map((p) => (
              <CheckPoint key={p}>{p}</CheckPoint>
            ))}
          </div>
        </div>
      </Section>
    </Container>
  )
}
