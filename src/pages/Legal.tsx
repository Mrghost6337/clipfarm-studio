import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'

import { Container } from '../components/Container'
import { Eyebrow } from '../components/Pill'
import { SITE } from '../content'
import { usePageTitle } from '../lib/title'

function LegalLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <section className="pt-16 pb-20 sm:pt-20">
      <Container className="max-w-3xl">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="mt-4 text-[2.3rem] leading-tight font-semibold tracking-[-0.04em] sm:text-[3rem]">{title}</h1>
        <p className="mt-2 text-[0.82rem] text-muted">Last updated {updated}. Questions: <a href={`mailto:${SITE.email}`} className="underline decoration-2 underline-offset-4">{SITE.email}</a>.</p>
        <div className="mt-8 flex flex-col gap-7 text-[0.95rem] leading-relaxed text-body [&_h2]:text-[1.25rem] [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:text-ink [&_h3]:font-semibold [&_h3]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          {children}
        </div>
      </Container>
    </section>
  )
}

export function Privacy() {
  usePageTitle('Privacy policy')
  return (
    <LegalLayout title="Privacy policy" updated="22 November 2026">
      <p>
        Clipfarm Studio is a fictional product built as a template. This policy describes the data the app actually handles so you can replace it with your own before launch.
      </p>
      <h2>What we store</h2>
      <ul>
        <li><b>Account data:</b> name, email, a salted password hash, onboarding preferences and plan choice, stored in the app database.</li>
        <li><b>Session data:</b> a hashed session token in an HttpOnly, SameSite=Lax cookie. It expires and can be cleared by signing out.</li>
        <li><b>Clip data:</b> source URLs, titles, thumbnails, transcript text, clip timestamps and captions you submit or generate.</li>
        <li><b>Local pipeline data:</b> downloaded media, audio and rendered clips stay in <code>pipeline/data/</code> on your machine. Nothing is uploaded to Clipfarm by the local service.</li>
      </ul>
      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell personal data or use it to train third-party models.</li>
        <li>We do not upload your local media to a cloud API. Transcription, tracking and rendering run locally.</li>
        <li>We do not run advertising trackers. The only optional analytics are the ones you configure yourself.</li>
      </ul>
      <h2>Cookies</h2>
      <p>
        Essential cookies keep you signed in and remember your cookie choice. Optional analytics cookies are only set after you accept them. You can change the choice in Settings or clear it from the cookie banner.
      </p>
      <h2>Third parties</h2>
      <p>
        Optional integrations are off by default: YouTube upload uses Google OAuth, an LLM provider may receive transcript text if you configure one, and platform links open the platform’s own site. Each has its own privacy policy.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        Account data stays until you delete the account. Clip records can be deleted from the Library, which also removes the associated files. Local pipeline files can be removed from the Studio’s cache controls. Backups expire within 30 days.
      </p>
      <h2>Your rights</h2>
      <p>
        You can request access, correction, export or deletion of your personal data by emailing <a href={`mailto:${SITE.email}`} className="font-semibold text-ink underline decoration-2 underline-offset-4">{SITE.email}</a>. We answer within 30 days.
      </p>
      <h2>Contact</h2>
      <p>Questions about this policy go to the same address. For content takedowns, see the <Link to="/terms#rights" className="font-semibold text-ink underline decoration-2 underline-offset-4">content rights</Link> section.</p>
    </LegalLayout>
  )
}

export function Terms() {
  usePageTitle('Terms of service')
  return (
    <LegalLayout title="Terms of service" updated="22 November 2026">
      <p>
        These terms are a template for the Clipfarm Studio product. By using the app or the local pipeline, you agree to them. If you do not agree, do not use the service.
      </p>
      <h2>1. The service</h2>
      <p>
        Clipfarm turns long videos into short vertical clips. The hosted app manages accounts, plans and metadata. The heavy processing (download, transcription, face tracking, rendering) runs in a local service on your machine. Availability of the local service depends on your hardware and network.
      </p>
      <h2>2. Accounts and plans</h2>
      <p>
        You are responsible for the accuracy of your account details and for keeping your credentials safe. Plans are billed monthly or yearly in advance. Limits are shown on the Pricing page and reset each billing period. We may suspend an account that abuses the service, exceeds limits or violates these terms.
      </p>
      <h2>3. Content you provide</h2>
      <p>
        You keep ownership of the videos, transcripts and captions you provide. You grant Clipfarm the limited permission needed to process them and show the results back to you. You must not upload malware, illegal content or content you do not have the rights to use.
      </p>
      <h2 id="rights">4. Content rights — only clip what you own</h2>
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-peach/60 p-4 text-[0.9rem] text-accent-ink">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>
          <b>You may only process videos you own or have explicit permission to clip.</b> That includes your own channel, an official clipping or affiliate programme, a paid licence, or written permission from the rights holder. Reposting another creator’s footage without permission is not allowed, even if the clip is short, credited or transformed. You are solely responsible for the clips you export and publish.
        </p>
      </div>
      <p>
        Clipfarm will honour valid takedown requests. If you believe a clip infringes your rights, email the URL, the source video and a description of the rights you hold. We remove or correct qualifying content promptly.
      </p>
      <h2>5. Acceptable use</h2>
      <ul>
        <li>No automated logins, scraping of private data, or bypassing platform protections.</li>
        <li>No using the service to harass, defame or misrepresent a person.</li>
        <li>No reselling the service as your own without a written agreement.</li>
      </ul>
      <h2>6. Third-party platforms</h2>
      <p>
        Downloads and uploads are subject to the terms of YouTube, Twitch, TikTok, Instagram and any other platform you use. Clipfarm does not control those services and is not responsible for their availability, limits or account actions.
      </p>
      <h2>7. Disclaimers and liability</h2>
      <p>
        The service is provided “as is”. Automatic transcription, detection and face tracking can be wrong, and you must review every clip before publishing. To the maximum extent permitted by law, Clipfarm is not liable for indirect or consequential damages, lost revenue or platform account penalties. Our total liability is limited to the amount you paid in the previous three months.
      </p>
      <h2>8. Changes and termination</h2>
      <p>
        We may update these terms and will post the new date on this page. Material changes are announced in the app. You can stop using the service at any time; we may terminate accounts that breach these terms.
      </p>
      <h2>9. Contact</h2>
      <p>Questions about these terms: <a href={`mailto:${SITE.email}`} className="font-semibold text-ink underline decoration-2 underline-offset-4">{SITE.email}</a>.</p>
    </LegalLayout>
  )
}
