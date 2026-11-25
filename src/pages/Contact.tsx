import { Mail, MessageSquare, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Container } from '../components/Container'
import { controlBase, Notice } from '../components/Field'
import { Eyebrow } from '../components/Pill'
import { SITE } from '../content'
import { usePageTitle } from '../lib/title'

const TOPICS = ['Product question', 'Billing', 'Partnership', 'Rights or takedown', 'Bug report']

export function Contact() {
  usePageTitle('Contact')
  const [topic, setTopic] = useState(TOPICS[0])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !email.trim() || message.trim().length < 10) {
      setError('Add your name, a valid email and at least a sentence about what you need.')
      return
    }
    setError('')
    const subject = encodeURIComponent(`[${topic}] ${name}`)
    const body = encodeURIComponent(`${message}\n\n— ${name}\n${email}`)
    if (SITE.email) window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`
  }

  // No public address yet: say so instead of showing a form that cannot send.
  if (!SITE.email) {
    return (
      <section className="pt-16 pb-20 sm:pt-24">
        <Container className="flex max-w-2xl flex-col gap-5">
          <Eyebrow>Contact</Eyebrow>
          <h1 className="text-[2.4rem] leading-[1.04] font-semibold tracking-[-0.04em] sm:text-[3.1rem]">Contact</h1>
          <Notice tone="info">There is no public contact address yet. It will be listed here as soon as there is one.</Notice>
          <p className="text-[1rem] leading-relaxed text-body">
            Questions about how the product works are answered in the <a href="/resources/faq" className="font-semibold text-ink underline decoration-2 underline-offset-4">FAQ</a> and the{' '}
            <a href="/resources/guides" className="font-semibold text-ink underline decoration-2 underline-offset-4">guides</a>.
          </p>
        </Container>
      </section>
    )
  }

  return (
    <section className="pt-16 pb-20 sm:pt-24">
      <Container className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col gap-5">
          <Eyebrow>Contact</Eyebrow>
          <h1 className="text-[2.4rem] leading-[1.04] font-semibold tracking-[-0.04em] sm:text-[3.1rem]">Tell us what you are clipping</h1>
          <p className="text-[1rem] leading-relaxed text-body">
            Product questions, plan advice, rights issues or a bug in the local pipeline.
          </p>
          <div className="flex flex-col gap-3">
            {[
              { icon: Mail, title: 'Email', text: SITE.email },
              { icon: MessageSquare, title: 'Rights requests', text: 'Include the URL and the clip.' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-sand text-accent-ink">
                  <item.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[0.9rem] font-semibold">{item.title}</p>
                  <p className="text-[0.85rem] text-muted">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="flex flex-col gap-4">
          <h2 className="text-[1.3rem] font-semibold tracking-[-0.025em]">Send a message</h2>
          <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[0.85rem] font-semibold">
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={`${controlBase} h-11 border-line-strong`} placeholder="Your name" />
              </label>
              <label className="flex flex-col gap-1.5 text-[0.85rem] font-semibold">
                Email
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={`${controlBase} h-11 border-line-strong`} placeholder="you@company.com" />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-[0.85rem] font-semibold">
              Topic
              <select value={topic} onChange={(event) => setTopic(event.target.value)} className={`${controlBase} h-11 border-line-strong`}>
                {TOPICS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[0.85rem] font-semibold">
              Message
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} className={`${controlBase} resize-y py-3 border-line-strong`} placeholder="What are you trying to ship, and where is it stuck?" />
            </label>
            {error && <Notice>{error}</Notice>}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" icon={<Send aria-hidden className="size-4" />}>
                Open email draft
              </Button>
              <p className="text-[0.75rem] text-muted">This opens your mail app with the message ready to send. Nothing is uploaded.</p>
            </div>
          </form>
        </Card>
      </Container>
    </section>
  )
}
