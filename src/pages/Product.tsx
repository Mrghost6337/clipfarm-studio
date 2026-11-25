import { ArrowRight, Captions, Check, Crop, Download, Link2, ScanFace, Sparkles, Upload, Wand2 } from 'lucide-react'
import { Link } from 'react-router'

import { ButtonLink } from '../components/Button'
import { Card } from '../components/Card'
import { Container } from '../components/Container'
import { CtaBand } from '../components/CtaBand'
import { Eyebrow, Tag } from '../components/Pill'
import { usePageTitle } from '../lib/title'

const STEPS = [
  {
    number: '01',
    icon: Link2,
    title: 'Paste a channel or video link',
    text: 'YouTube channels and videos, Twitch VODs and clips, TikTok profiles and videos. Clipfarm lists the channel’s videos with thumbnails, duration and date, or reads the single link you pasted.',
    points: ['Channel grid with search and load more', 'Cached downloads, up to 1080p', 'Clear messages for private or blocked videos'],
  },
  {
    number: '02',
    icon: Wand2,
    title: 'The pipeline finds the moments',
    text: 'Audio is transcribed locally with word timestamps. Sentence boundaries, loudness, signal words and optional free LLM ranking pick 15–60 second windows, then a YuNet face tracker builds a stable 9:16 crop.',
    points: ['Language detected automatically', 'Clips start and end on words', 'Word-by-word karaoke captions burned in'],
  },
  {
    number: '03',
    icon: Download,
    title: 'Review, style and export',
    text: 'Preview each clip in the 9:16 frame, switch caption or layout presets, edit the hook title and caption, then download MP4 plus SRT/VTT or publish to YouTube Shorts with your own credentials.',
    points: ['1080×1920, 30 fps, H.264/AAC', 'Safe-zone captions and hook title', 'MP4, SRT, VTT and ASS exports'],
  },
]

const FEATURES = [
  {
    icon: ScanFace,
    title: 'Face tracking that does not jitter',
    text: 'YuNet samples the frame five times a second, then an EMA, dead zone and maximum pan speed keep the speaker centred. Several faces? The largest, most stable one wins.',
  },
  {
    icon: Captions,
    title: 'Captions built word by word',
    text: 'Two to four words per line, active-word highlight, thick outline and a safe zone above the platform UI. Bundled OFL fonts and SRT/VTT exports.',
  },
  {
    icon: Crop,
    title: 'Three layouts, chosen automatically',
    text: 'Talking head fills the frame. Gameplay plus facecam keeps the action readable. No face? A blurred background sits behind a fit-to-width foreground.',
  },
  {
    icon: Sparkles,
    title: 'Hooks and hashtags in the video’s language',
    text: 'Every clip gets a six-word hook title and three to five hashtags. Optional Ollama or a free OpenAI-compatible endpoint improves ranking; heuristics work with no model at all.',
  },
  {
    icon: Upload,
    title: 'Publish without automations',
    text: 'Download and copy-caption always work. YouTube Shorts uses the official Data API. TikTok and Instagram open their official upload pages rather than automating a login.',
  },
  {
    icon: Download,
    title: 'One encode, every file',
    text: 'One ffmpeg pass per clip with loudness normalisation and faststart, plus poster, ASS, SRT and VTT. Nothing is re-encoded twice.',
  },
]

const PLATFORMS = [
  { name: 'YouTube', kinds: 'Channels, videos, Shorts', note: 'Cookies supported for bot checks' },
  { name: 'Twitch', kinds: 'Channels, VODs, clips', note: 'Long VODs download audio first' },
  { name: 'TikTok', kinds: 'Profiles, videos', note: 'Dates and durations from the profile' },
]

export function Product() {
  usePageTitle('How it works')
  return (
    <>
      <section className="relative overflow-hidden pt-16 pb-16 sm:pt-24">
        <div aria-hidden className="page-grid absolute inset-0" />
        <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-[55%] opacity-55" />
        <Container className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <Eyebrow>The product</Eyebrow>
            <h1 className="text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-[3.6rem]">A link in. Three post-ready vertical clips out.</h1>
            <p className="max-w-xl text-[1.05rem] leading-relaxed text-body">
              Clipfarm runs the whole job: download, transcribe, find the moment, track the face, caption it and render 1080×1920. You review, adjust the hook and export — in one Studio, not five tabs.
            </p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink to="/studio" icon={<ArrowRight aria-hidden className="size-4" />}>
                Open the Studio
              </ButtonLink>
              <ButtonLink to="/pricing" variant="secondary">
                See pricing
              </ButtonLink>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[0.82rem] text-muted">
              {['No credit card', 'Local pipeline', 'Free and open-source tools'].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check aria-hidden className="size-3.5 text-success" strokeWidth={3} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-[420px]">
            <div aria-hidden className="absolute -inset-8 rounded-[50%] bg-apricot/25 blur-3xl" />
            <div className="relative rounded-[38px] border border-line bg-ink p-2.5 shadow-[var(--shadow-raise)]">
              <div className="overflow-hidden rounded-[30px] bg-black">
                <img src="/images/studio-clip.jpg" alt="A rendered 9:16 clip with word-synced captions and a hook title" width={1080} height={1920} className="aspect-[9/16] w-full object-cover" />
              </div>
              <div className="absolute top-6 left-6 rounded-full bg-black/75 px-3 py-1.5 text-[0.7rem] font-semibold text-white backdrop-blur">1080 × 1920 · 30 fps</div>
              <div className="absolute right-5 bottom-7 left-5 flex items-center justify-between gap-2 rounded-2xl bg-paper/95 p-3 shadow-lg backdrop-blur">
                <div>
                  <p className="text-[0.72rem] font-semibold text-muted">Clip 2 of 3</p>
                  <p className="text-[0.86rem] font-semibold">De achtervolging werd alleen maar erger</p>
                </div>
                <span className="rounded-full bg-success-soft px-2.5 py-1 text-[0.7rem] font-semibold text-success">Ready</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section id="steps" className="py-16">
        <Container>
          <div className="mb-10 flex flex-col gap-3">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="max-w-2xl text-[2rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[2.6rem]">Three steps, one workspace</h2>
          </div>
          <ol className="grid gap-5 lg:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.number}>
                <Card className="flex h-full flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.8rem] font-semibold tracking-[0.08em] text-accent-ink tabular-nums">{step.number}</span>
                    <span aria-hidden className="grid size-10 place-items-center rounded-full bg-sand text-accent-ink">
                      <step.icon className="size-5" />
                    </span>
                  </div>
                  <h3 className="text-[1.25rem] tracking-[-0.025em] font-semibold">{step.title}</h3>
                  <p className="text-[0.92rem] leading-relaxed text-body">{step.text}</p>
                  <ul className="mt-auto flex flex-col gap-1.5">
                    {step.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-[0.82rem] text-muted">
                        <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={3} />
                        {point}
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section id="features" className="py-16">
        <Container>
          <div className="mb-10 flex flex-col gap-3">
            <Eyebrow>Features</Eyebrow>
            <h2 className="max-w-2xl text-[2rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[2.6rem]">The details that make a clip watchable</h2>
            <p className="max-w-2xl text-[0.98rem] leading-relaxed text-body">Everything below runs in the local pipeline. The Studio is the surface; the heavy work never leaves your machine.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="flex flex-col gap-3">
                <span aria-hidden className="grid size-10 place-items-center rounded-[12px] bg-sand text-accent-ink">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="text-[1.08rem] font-semibold tracking-[-0.02em]">{feature.title}</h3>
                <p className="text-[0.9rem] leading-relaxed text-body">{feature.text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col gap-3">
            <Eyebrow>Supported platforms</Eyebrow>
            <h2 className="text-[2rem] leading-tight font-semibold tracking-[-0.035em]">Where your source videos can come from</h2>
            <p className="text-[0.95rem] leading-relaxed text-body">Public links only. Private, age-restricted or geo-blocked videos return a clear message instead of failing silently.</p>
            <Tag tone="peach">YouTube bot checks: add cookies in .env</Tag>
          </div>
          <div className="flex flex-col gap-3">
            {PLATFORMS.map((platform) => (
              <Card key={platform.name} className="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <p className="text-[1rem] font-semibold">{platform.name}</p>
                  <p className="text-[0.82rem] text-muted">{platform.kinds}</p>
                </div>
                <p className="text-[0.8rem] text-ink-2">{platform.note}</p>
              </Card>
            ))}
            <p className="text-[0.8rem] text-muted">
              Need Instagram or a scheduler? The Studio links to official upload pages and exports caption files; see <Link to="/resources/guides" className="font-semibold underline decoration-2 underline-offset-4">the publishing guide</Link>.
            </p>
          </div>
        </Container>
      </section>

      <CtaBand title="Open the Studio and paste a link" text="Three clips are free. The full pipeline runs locally, so you can see the output before paying anything." button="Start free" />
    </>
  )
}
