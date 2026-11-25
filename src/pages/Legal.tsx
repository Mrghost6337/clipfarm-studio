import { AlertTriangle, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Container } from '../components/Container'
import { Eyebrow } from '../components/Pill'
import { SITE } from '../content'
import { LEGAL_STATUS, PRIVACY_VERSION, TERMS_VERSION } from '../shared/legal'
import { usePageTitle } from '../lib/title'

// The Terms and Privacy Policy. The same components render on /terms and
// /privacy and inside the desktop app (readable offline). Versions live in
// src/shared/legal.ts; bump them when users must accept a change again.

const prose =
  'flex flex-col gap-7 text-[0.95rem] leading-relaxed text-body [&_h2]:text-[1.25rem] [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:text-ink [&_h3]:font-semibold [&_h3]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5'

const contact = (prefix: string) =>
  SITE.email ? (
    <>
      {prefix} <a href={`mailto:${SITE.email}`} className="font-semibold text-ink underline decoration-2 underline-offset-4">{SITE.email}</a>.
    </>
  ) : (
    'A contact address will be published on this page.'
  )

function DraftNotice() {
  if (LEGAL_STATUS !== 'draft-pending-legal-review') return null
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-line-strong bg-sand p-4 text-[0.85rem] text-ink-2">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-ink" />
      <p>Draft pending legal review. This text describes how the product works today but has not yet been checked by a lawyer.</p>
    </div>
  )
}

function LegalLayout({ title, version, children }: { title: string; version: string; children: ReactNode }) {
  return (
    <section className="pt-16 pb-20 sm:pt-20">
      <Container className="max-w-3xl">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="mt-4 text-[2.3rem] leading-tight font-semibold tracking-[-0.04em] sm:text-[3rem]">{title}</h1>
        <p className="mt-2 text-[0.82rem] text-muted">
          Version {version}. {contact('Questions:')}
        </p>
        <div className={`mt-8 ${prose}`}>{children}</div>
      </Container>
    </section>
  )
}

export function PrivacyContent() {
  return (
    <>
      <DraftNotice />
      <p>This policy describes the data Clipfarm Studio handles on the website, in the browser Studio and in the Clipfarm Studio app for Windows.</p>
      <h2>What we store on our servers</h2>
      <ul>
        <li><b>Account data:</b> name, email, a salted password hash (or your Google account ID and profile picture if you sign in with Google), onboarding preferences, how you want to run Clipfarm, and which version of these terms you accepted and when.</li>
        <li><b>Sessions:</b> hashed session tokens. On the website the token is in an HttpOnly cookie. Each signed-in desktop app has its own token with the device name you see in Settings and the time it was last used; you can sign a device out at any time.</li>
        <li><b>Clip data:</b> source links, titles, thumbnails, transcript text, clip timestamps and captions you submit or that the desktop app syncs to your library.</li>
      </ul>
      <h2>What stays on your computer</h2>
      <ul>
        <li>The desktop app keeps downloaded videos, audio, transcripts, rendered clips, models and logs in <code>%LOCALAPPDATA%\Clipfarm</code> on Windows. These files are not uploaded to Clipfarm. Only the clip details listed above are synced to your account.</li>
        <li>The app’s sign-in token and a copy of your profile (so the app can open offline) are encrypted with Windows (DPAPI) and stored in the same folder.</li>
        <li>Uninstalling the app keeps this folder so a reinstall finds your clips; you can delete it from the app’s Settings or by removing the folder.</li>
      </ul>
      <h2>The PC check</h2>
      <p>
        With your permission, the desktop app reads your Windows version, processor, memory, graphics card and video memory, free disk space and whether your system can encode video, and runs a short speed test. It uses the results to recommend a speech model. The results stay on your computer and are not sent to Clipfarm. You can skip the check and run it later from Settings.
      </p>
      <h2>Downloads the app makes</h2>
      <p>
        The app downloads the speech models you choose from Hugging Face, and checks for app updates from our public release page. These requests reveal your IP address to those services. Videos you clip are downloaded from the platform you link to (for example YouTube or Twitch) by the app on your computer.
      </p>
      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell personal data or use it to train third-party models.</li>
        <li>We do not upload your local videos to a cloud service. Transcription, tracking and rendering run on your computer.</li>
        <li>We do not run advertising trackers.</li>
      </ul>
      <h2>Cookies</h2>
      <p>Essential cookies keep you signed in on the website and remember your cookie choice. Optional analytics cookies are only set after you accept them.</p>
      <h2>Third parties</h2>
      <p>
        Optional integrations are off by default: Google sign-in and YouTube upload use Google OAuth, and platform links open the platform’s own site. Each has its own privacy policy.
      </p>
      <h2>Retention and deletion</h2>
      <p>Account data stays until you delete the account. You can delete sources and clips in the dashboard at any time, and local files from the app.</p>
      <h2>Your rights</h2>
      <p>You can request access, correction, export or deletion of your personal data. {contact('Write to')}</p>
      <h2>Contact</h2>
      <p>
        For content takedowns, see the <Link to="/terms#rights" className="font-semibold text-ink underline decoration-2 underline-offset-4">content rights</Link> section.
      </p>
    </>
  )
}

export function TermsContent() {
  return (
    <>
      <DraftNotice />
      <p>By using the Clipfarm Studio website, the browser Studio or the Clipfarm Studio app, you agree to these terms. If you do not agree, do not use the service.</p>
      <h2>1. The service</h2>
      <p>
        Clipfarm turns long videos into short vertical clips. The website manages accounts, plans and clip details. The heavy processing (download, transcription, face tracking, rendering) runs on your own computer, in the Clipfarm Studio app or the local pipeline. How fast it runs depends on your hardware and network.
      </p>
      <h2>2. Accounts and plans</h2>
      <p>
        You are responsible for the accuracy of your account details and for keeping your credentials and devices safe. Every account starts on the Free plan with the limits shown on the Pricing page. Paid plans are not available yet; when they are, their price and billing period are shown before you pay, and a paid plan starts only after the payment is confirmed. We may suspend an account that abuses the service or violates these terms.
      </p>
      <h2>3. The desktop app</h2>
      <p>
        The app installs a local processing service, the tools it needs (Python, FFmpeg, Deno) and the speech models you choose. It runs only on your computer, listens only on 127.0.0.1, and lets a browser use it only after you approve that browser. The app checks for and installs updates. Third-party components keep their own licences, listed in the app’s install folder.
      </p>
      <h2>4. Content you provide</h2>
      <p>
        You keep ownership of the videos, transcripts and captions you provide. You grant Clipfarm the limited permission needed to process them and show the results back to you. You must not process malware, illegal content or content you do not have the rights to use.
      </p>
      <h2 id="rights">5. Content rights — only clip what you own</h2>
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-peach/60 p-4 text-[0.9rem] text-accent-ink">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>
          <b>You may only process videos you own or have explicit permission to clip.</b> That includes your own channel, an official clipping or affiliate programme, a paid licence, or written permission from the rights holder. Reposting another creator’s footage without permission is not allowed, even if the clip is short, credited or transformed. You are solely responsible for the clips you export and publish.
        </p>
      </div>
      <p>Clipfarm will honour valid takedown requests. {contact('Send the URL, the source video and a description of the rights you hold to')}</p>
      <h2>6. Acceptable use</h2>
      <ul>
        <li>No automated logins, scraping of private data, or bypassing platform protections.</li>
        <li>No using the service to harass, defame or misrepresent a person.</li>
        <li>No reselling the service as your own without a written agreement.</li>
      </ul>
      <h2>7. Third-party platforms</h2>
      <p>
        Downloads and uploads are subject to the terms of YouTube, Twitch, TikTok, Instagram and any other platform you use. Clipfarm does not control those services and is not responsible for their availability, limits or account actions.
      </p>
      <h2>8. Disclaimers and liability</h2>
      <p>
        The service is provided “as is”. Automatic transcription, detection and face tracking can be wrong, and you must review every clip before publishing. To the maximum extent permitted by law, Clipfarm is not liable for indirect or consequential damages, lost revenue or platform account penalties.
      </p>
      <h2>9. Changes and termination</h2>
      <p>
        We may update these terms; the version on this page changes, and the app asks you to accept material changes. You can stop using the service at any time; we may terminate accounts that breach these terms.
      </p>
      <h2>10. Contact</h2>
      <p>{contact('Questions about these terms:')}</p>
    </>
  )
}

export function Privacy() {
  usePageTitle('Privacy policy')
  return (
    <LegalLayout title="Privacy policy" version={PRIVACY_VERSION}>
      <PrivacyContent />
    </LegalLayout>
  )
}

export function Terms() {
  usePageTitle('Terms of service')
  return (
    <LegalLayout title="Terms of service" version={TERMS_VERSION}>
      <TermsContent />
    </LegalLayout>
  )
}

export const LEGAL_PROSE = prose
