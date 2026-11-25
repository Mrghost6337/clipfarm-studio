// Every string on the site. Edit here first.
// Rule: a sentence stays only if the product does it today, the number comes
// from real data, or it is clearly labelled as coming soon.
import { FREE_PLAN, PLANS } from './shared/account'

/** Every photo goes through this map. Only images Clipfarm may use. */
export const IMAGES = {
  workshop: { src: '/images/desk.jpg', alt: 'A desk with an editing setup' },
  // Hotlinked from Rockstar Games' official YouTube upload, not stored here.
  gtaTrailer2: { src: 'https://i.ytimg.com/vi/VQRLujxTm3c/maxresdefault.jpg', alt: 'Grand Theft Auto VI Trailer 2 key art, from Rockstar Games’ official YouTube channel' },
} as const

export const SITE = {
  name: 'Clipfarm Studio',
  short: 'Clipfarm',
  tagline: 'AI clip farming for Twitch, YouTube and TikTok channels',
  /** No public contact address yet. Set a real one here; pages hide contact links while it is null. */
  email: null as string | null,
  storagePrefix: 'clipfarm',
}

export type NavItem = { label: string; to: string; tag?: string; children?: Array<{ label: string; to: string; text: string }> }

export const NAV: NavItem[] = [
  {
    label: 'Services',
    to: '/services',
    children: [
      { label: 'Highlight mining', to: '/services#highlights', text: 'Every stream scanned for the moment worth clipping' },
      { label: 'Face tracking and punch-ins', to: '/services#face-tracking', text: 'The reaction stays in frame, every time' },
      { label: 'Captions and audio', to: '/services#captions', text: 'Word-perfect subtitles and clean sound' },
      { label: 'Vertical export and delivery', to: '/services#vertical-export', text: '9:16, 1:1 and 16:9, named and ready to post' },
    ],
  },
  { label: 'GTA 6', to: '/gta-6', tag: 'Live' },
  { label: 'Pipeline', to: '/pipeline' },
  { label: 'Toolkit', to: '/toolkit' },
  { label: 'About', to: '/about' },
]

export const NAV_CTA = { label: 'Start free', to: '/signup' }

export const HERO = {
  badge: 'Every VOD already has a clip in it',
  title: ['AI clip farming for', 'Twitch, YouTube & TikTok'],
  text: 'Paste a stream link or drop a file. Clipfarm finds the moments, follows the face, captions every word and renders vertical clips on your computer.',
  cta: { label: 'Start free', to: '/signup' },
  note: 'It’s free!',
  proof: 'Runs on your computer. No API keys, no upload.',
  pills: [
    'Highlights ranked from the transcript',
    'Face tracking keeps the speaker in frame',
    'Word-level captions, language detected automatically',
    '1080×1920 exports for Shorts, Reels and TikTok',
    'SRT, VTT and ASS caption files with every clip',
    'Open-source tools, no paid API',
  ],
  points: [
    'Runs on your own computer: no upload, no API key',
    'You review every clip before it is posted',
    'Clip only footage you own or are cleared to use',
  ],
}

export const HOME = {
  services: {
    eyebrow: 'What it does',
    title: 'The whole clip pipeline in one app',
    text: 'Highlights, face tracking, captions and vertical exports: long VODs in, short-form out.',
    link: 'See all features',
  },
  plan: {
    eyebrow: 'The pipeline',
    title: 'VOD in, vertical clips out',
    text: 'Every video runs through the same steps on your computer, and you see the progress of each one.',
    link: 'Explore the pipeline',
  },
  stack: {
    eyebrow: 'The stack',
    title: 'Open tools, sharpened into one pipeline',
    text: 'Open-source projects do the heavy lifting: download, transcribe, find the face, render the captions and encode the export.',
    link: 'See the toolkit',
  },
  stats: [
    { value: '1080×1920', label: 'H.264 + AAC exports, loudness normalised' },
    { value: '3', label: 'caption files with every clip: SRT, VTT and ASS' },
    { value: '0', label: 'API keys or paid services needed' },
  ],
  faqTitle: 'Questions creators ask',
  cta: {
    title: 'Send one VOD. Take the clips.',
    text: `Create an account and clip on the Free plan: ${FREE_PLAN.limit} clips a month, no card.`,
    button: 'Start free',
  },
}

export type Service = {
  id: string
  title: string
  summary: string
  outcomes: string[]
  deliverables: string[]
  icon: 'scissors' | 'scanface' | 'captions' | 'audio' | 'phone' | 'wallet'
  /** Not built yet: shown with a Coming soon tag. */
  soon?: boolean
}

export const SERVICES: Service[] = [
  {
    id: 'highlights',
    title: 'Highlight finding',
    summary: 'The transcript is scored for hooks, reactions and payoffs, so the strongest moments come first.',
    outcomes: ['The whole video is transcribed, not sampled', 'Moments ranked by score before you edit', 'Cuts snap to sentence boundaries'],
    deliverables: ['A ranked list of clips per video', 'A hook title and hashtags per clip', 'Start and end times you can adjust'],
    icon: 'scissors',
  },
  {
    id: 'face-tracking',
    title: 'Face tracking',
    summary: 'The face is found and followed with smoothing, so the vertical crop keeps the speaker in frame without jitter.',
    outcomes: ['No more crops that cut off faces', 'Smooth camera moves, no jitter', 'A blurred-background layout when no face is found'],
    deliverables: ['Face, centre and blurred layouts', 'Re-render any clip with another layout'],
    icon: 'scanface',
  },
  {
    id: 'captions',
    title: 'Captions and subtitles',
    summary: 'Word-level captions timed to the audio, burned into the video and saved as subtitle files you can edit later.',
    outcomes: ['Captions follow the audio word by word', 'Spoken language detected automatically', 'Editable subtitle files, not baked screenshots'],
    deliverables: ['SRT and WebVTT files', 'Styled ASS subtitles', 'Three caption presets'],
    icon: 'captions',
  },
  {
    id: 'vertical-export',
    title: 'Vertical export',
    summary: '1080×1920 H.264 with AAC audio, loudness normalised and ready for Shorts, Reels and TikTok.',
    outcomes: ['One click from clip to MP4', 'Loudness matched across clips', 'Files you can open in any editor'],
    deliverables: ['1080×1920 MP4 per clip', 'Poster frame per clip', 'EDL and MLT projects for Shotcut and Kdenlive'],
    icon: 'phone',
  },
  {
    id: 'audio',
    title: 'Audio cleanup',
    summary: 'Noise removal and voice separation for clips recorded in noisy rooms.',
    outcomes: ['Mic noise and room hum removed', 'Voice and music separated'],
    deliverables: ['Cleaned per-clip audio'],
    icon: 'audio',
    soon: true,
  },
  {
    id: 'growth',
    title: 'Posting and analytics',
    summary: 'Scheduled posting and per-clip performance across platforms. Today you can upload to YouTube Shorts with your own credentials and copy captions for the rest.',
    outcomes: ['A posting schedule you can keep', 'See which clips earned views'],
    deliverables: ['YouTube Shorts upload (available now, with your own credentials)'],
    icon: 'wallet',
    soon: true,
  },
]

export const ENGAGEMENTS = {
  title: 'Plans',
  text: 'Start on Free. Paid plans open when checkout launches.',
  note: 'Prices are in USD and shown in your currency. Quarterly billing saves 20%.',
  plans: PLANS,
}

export const SERVICES_PAGE = {
  eyebrow: 'Features',
  title: 'Everything between a VOD and a post',
  text: 'What Clipfarm does today, and what is coming next.',
}

export type Phase = {
  id: string
  name: string
  days: string
  goal: string
  weeks: Array<{ week: string; title: string; items: string[] }>
  quickWin: string
}

export const PLAN_PAGE = {
  eyebrow: 'The pipeline',
  title: 'From a link to captioned vertical clips',
  text: 'Every video runs through the same steps on your computer. Pick your channel size to see what to focus on, and tick off the steps you already have covered.',
  stageLabel: 'Your channel',
  progress: 'of the pipeline ticked off on this device',
  reset: 'Reset ticks',
  stages: [
    { id: 'starting', label: 'Starting out, under 10K', focus: ['Highlights', 'Captions', 'Consistency'] },
    { id: 'growing', label: 'Growing, 10K–250K', focus: ['Face tracking', 'Caption style', 'Daily posting'] },
    { id: 'established', label: 'Established, 250K+', focus: ['Channel library', 'Multi-platform', 'Review routine'] },
  ],
  phases: [
    {
      id: 'find',
      name: 'Find',
      days: 'Download and transcribe',
      goal: 'Get the video and every word in it, with timestamps.',
      quickWin: 'A ranked list of moments for every video.',
      weeks: [
        { week: 'Download', title: 'Get the source', items: ['Paste a YouTube, Twitch or TikTok link, or upload a file', 'Download up to 1080p with yt-dlp', 'Long VODs fetch audio first'] },
        { week: 'Transcribe', title: 'Every word, timed', items: ['Detect the spoken language', 'Transcribe with word timestamps', 'Score windows for hooks and payoffs'] },
      ],
    },
    {
      id: 'cut',
      name: 'Cut',
      days: 'Track and caption',
      goal: 'Make every clip watchable at 9:16.',
      quickWin: 'The speaker stays in frame in every clip.',
      weeks: [
        { week: 'Track', title: 'Follow the face', items: ['Find the face in sampled frames', 'Smooth the crop path', 'Fall back to a blurred layout'] },
        { week: 'Caption', title: 'Words on screen', items: ['Group words into short caption lines', 'Pick a caption preset', 'Add the hook title'] },
      ],
    },
    {
      id: 'ship',
      name: 'Ship',
      days: 'Render and export',
      goal: 'Render, review and post.',
      quickWin: 'An MP4 and caption files for every clip.',
      weeks: [
        { week: 'Render', title: 'Encode once', items: ['1080×1920 H.264 + AAC', 'Loudness normalised', 'Poster frame'] },
        { week: 'Post', title: 'You decide what ships', items: ['Review every clip', 'Download or copy the caption', 'Upload to YouTube Shorts with your own credentials'] },
      ],
    },
  ] satisfies Phase[],
  cta: { title: 'Want this for your next VOD?', text: `Start on Free: ${FREE_PLAN.limit} clips a month, no card.`, button: 'Start free' },
}

export const FAQS = [
  { q: 'What is clip farming, exactly?', a: 'Cutting long streams and VODs into short vertical clips that pull new viewers in. Clipfarm transcribes the video, ranks the moments and renders them vertical with captions; you choose which clips to post.' },
  { q: 'Do I need to own the footage?', a: 'You need the rights to it: your own channel, an official clipping or affiliate programme, or written permission from the creator. Do not clip and repost other people’s videos without permission.' },
  { q: 'How fast do clips come back?', a: 'It depends on your computer and the length of the video. Download and transcription take the longest; you see the progress of every step.' },
  { q: 'What do I need?', a: 'A video link or a file, and the Clipfarm pipeline running on your computer. No API keys and no paid services.' },
  { q: 'Who posts the clips?', a: 'You do. Download the MP4 and copy the caption, or upload to YouTube Shorts with your own Google credentials. TikTok and Instagram open their official upload pages.' },
  { q: 'What does it cost?', a: `Free gives you ${FREE_PLAN.limit} clips a month. Paid plans open when checkout launches.` },
  { q: 'What if I do not like a clip?', a: 'Change the start and end, the layout, the caption preset or the hook title, and render it again.' },
]

export const ABOUT = {
  eyebrow: 'About',
  title: 'About Clipfarm Studio',
  intro: [
    'Clipfarm Studio turns long streams and videos into vertical, captioned clips.',
    'The heavy work, from download and transcription to face tracking and rendering, runs on your own computer with open-source tools, so your footage stays with you and there is no API key to buy.',
  ],
  valuesTitle: 'How we build it',
  values: [
    { title: 'Rights first', text: 'Clip only what you own or are cleared to use. Reposting is not farming.' },
    { title: 'You decide what ships', text: 'Detection suggests moments. You review every clip before it is posted.' },
    { title: 'Local by default', text: 'Your videos are processed on your machine, not uploaded to us.' },
    { title: 'Open tools', text: 'Every step uses a project you can inspect.' },
  ],
}

/** The tools the pipeline really uses, and the editors its exports open in. */
export type ToolGroup = 'Pipeline' | 'Exports'

export type Tool = { n: string; name: string; does: string; href: string; group: ToolGroup }

export const TOOLS: Tool[] = [
  { n: '01', name: 'yt-dlp', does: 'Download source videos and list channels', href: 'https://github.com/yt-dlp/yt-dlp', group: 'Pipeline' },
  { n: '02', name: 'faster-whisper', does: 'Transcribe with word timestamps and language detection', href: 'https://github.com/SYSTRAN/faster-whisper', group: 'Pipeline' },
  { n: '03', name: 'whisper.cpp', does: 'Fallback transcription when faster-whisper cannot run', href: 'https://github.com/ggml-org/whisper.cpp', group: 'Pipeline' },
  { n: '04', name: 'OpenCV (YuNet)', does: 'Find and follow the face for the vertical crop', href: 'https://github.com/opencv/opencv', group: 'Pipeline' },
  { n: '05', name: 'FFmpeg', does: 'Cut, crop, normalise loudness and encode', href: 'https://ffmpeg.org', group: 'Pipeline' },
  { n: '06', name: 'libass', does: 'Render styled ASS captions', href: 'https://github.com/libass/libass', group: 'Pipeline' },
  { n: '07', name: 'Mediabunny', does: 'Cut and export MP4 in the browser', href: 'https://github.com/Vanilagy/mediabunny', group: 'Pipeline' },
  { n: '08', name: 'Transformers.js', does: 'Whisper in the browser for the on-device transcriber', href: 'https://github.com/huggingface/transformers.js', group: 'Pipeline' },
  { n: '09', name: 'Shotcut', does: 'Open the MLT project of a clip', href: 'https://github.com/mltframework/shotcut', group: 'Exports' },
  { n: '10', name: 'Kdenlive', does: 'Open the MLT project of a clip', href: 'https://github.com/KDE/kdenlive', group: 'Exports' },
  { n: '11', name: 'Editly', does: 'Render the Editly JSON export with code', href: 'https://github.com/mifi/editly', group: 'Exports' },
]

export const TOOLKIT = {
  eyebrow: 'Toolkit',
  title: 'The stack behind every clip',
  text: 'The open-source projects the pipeline runs, and the editors its exports open in.',
  tagline: 'VOD → transcribe → find the moment → track the face → caption → export.',
  note: 'Each project keeps its own licence. Check it before you ship it commercially.',
  linkLabel: 'Open project',
  groups: ['Pipeline', 'Exports'] as ToolGroup[],
  groupText: {
    Pipeline: 'What runs when you clip a video.',
    Exports: 'Where your exported projects open.',
  },
  cta: { title: 'Want this running on your channel?', text: 'Run it on your own VOD.', button: 'Start free' },
}

/** GTA VI launch hub: the game, the creators and the moments worth clipping. */
export type GtaCreator = { name: string; platform: string; why: string; query: string }
export type GtaClip = {
  id: string
  creator: string
  channel: string
  title: string
  tag: string
  format: 'Short' | 'Clip'
  focus?: 'center' | 'left'
}

export const GTA = {
  eyebrow: 'Launch week',
  badge: 'Out now',
  launched: '19 November 2026',
  title: ['GTA VI is out.', 'Clip the launch before the feed floods.'],
  text: 'Leonida is live and every streamer is in it. Paste a GTA VI VOD and Clipfarm finds the chase, the heist fail and the first reaction, then cuts them vertical with captions and a ready-to-post hook.',
  heroCta: 'Clip a GTA VI VOD',
  secondary: 'See the creators',
  bannerNote: 'Out now on PS5 and Xbox Series X|S',
  pills: [
    'Works on YouTube VODs and Twitch streams',
    'GTA-specific moments score higher',
    'Chapter marks read straight from the description',
    '9:16 cuts with real SRT captions',
    'Share page embeds the video at the cut',
  ],
  heroStats: [
    { value: '9:16', label: 'vertical, captioned exports' },
    { value: '6', label: 'moments every Leonida VOD has' },
  ],
  anchors: [
    { id: 'steps', label: 'How it works' },
    { id: 'creators', label: 'Creators' },
    { id: 'moments', label: 'The moments' },
    { id: 'detection', label: 'Detection' },
    { id: 'faq', label: 'FAQ' },
  ] as Array<{ id: string; label: string }>,
  clipDrop: {
    eyebrow: 'GTA VI · Launch-week clip drop',
    title: ['Real GTA VI clips.', 'Straight from the launch feed.'],
    text: 'Six actual launch-week videos from the creators everyone is watching. Every card opens the original YouTube upload, so the original gets the view and you see the whole clip.',
    hint: 'Swipe or drag to explore',
    note: 'Every card links to the original YouTube upload and credits the creator or clip channel that published it. Clipfarm is not affiliated with these creators or Rockstar Games. Clip only footage you have the rights to use.',
    cta: 'Open the GTA VI hub',
  },
  clips: [
    {
      id: 'nPA55csY5us',
      creator: 'MrBeast Gaming',
      channel: 'YouTube · official upload',
      title: 'How Long Can You Survive 6 Stars In GTA 6?',
      tag: 'Six-star survival',
      format: 'Short',
    },
    {
      id: 'GoVqTZn7kSY',
      creator: 'Kai Cenat',
      channel: 'Kai Cenat Live · official upload',
      title: 'Kai Cenat Says The Reason He’s Streaming GTA VI For His Younger Viewers',
      tag: 'The first reaction',
      format: 'Short',
    },
    {
      id: '5rmHKsFXExs',
      creator: 'IShowSpeed',
      channel: 'GTA VI Clips · clip channel',
      title: '“I Really Show Speed, Bro” — IShowSpeed’s fastest GTA 6 mission',
      tag: 'Fastest mission',
      format: 'Short',
    },
    {
      id: 'pnfc8e04-5M',
      creator: 'Jynxzi',
      channel: 'Vice-City Vinny · clip channel',
      title: 'Jynxzi’s Easter egg off GTA 6’s tallest tower landed IN A CAR',
      tag: 'The easter egg',
      format: 'Short',
    },
    {
      id: 'LphAOQ6wMm4',
      creator: 'xQc',
      channel: 'xQc Clips · clip channel',
      title: 'xQc gets into a FATAL CAR CRASH IN GTA 6',
      tag: 'The crash',
      format: 'Short',
      focus: 'left',
    },
    {
      id: 'BDhu6YgYCvA',
      creator: 'CaseOh',
      channel: 'CaseOh Daily Clips · clip channel',
      title: 'CaseOh snaps at a rude old man in GTA 6',
      tag: 'The rude NPC',
      format: 'Short',
    },
  ] satisfies GtaClip[],
  trailer: {
    id: 'VQRLujxTm3c',
    title: 'Grand Theft Auto VI Trailer 2',
    channel: 'Rockstar Games',
    watch: 'https://www.youtube.com/watch?v=VQRLujxTm3c',
  },
  artCredit: 'Trailer key art © Rockstar Games, embedded from the official Rockstar Games YouTube channel.',
  stepsTitle: 'From a six-hour Leonida stream to clips you can post',
  stepsText: 'The same pipeline as every other VOD, with the detector tuned for the way GTA VI actually sounds.',
  steps: [
    { title: 'Paste the link', text: 'A public YouTube GTA VI VOD or a Twitch stream. Clipfarm reads the real title, duration and creator, not a mock.' },
    { title: 'Let the detector watch', text: 'Captions when the platform serves them, the creator’s own chapter markers when it does not, and a transcript box when neither exists.' },
    { title: 'Cut, caption, ship', text: 'Every moment becomes a start and end stamp with caption cues, an SRT file, a hook score and a share page that embeds the video at the cut.' },
  ],
  creatorsTitle: 'Creators whose GTA VI streams are worth clipping',
  creatorsText: 'These are the channels the clip feeds fill up with. Open their GTA VI videos, paste a link, and the detector does the watching.',
  creators: [
    { name: 'xQc', platform: 'Twitch · YouTube', why: 'Variety streams with unfiltered reactions and no pause button.', query: 'xQc GTA 6' },
    { name: 'Kai Cenat', platform: 'Twitch · YouTube', why: 'Marathon streams where one reaction becomes a week of clips.', query: 'Kai Cenat GTA 6' },
    { name: 'IShowSpeed', platform: 'YouTube', why: 'Loud, fast and built for the first three seconds of a Short.', query: 'IShowSpeed GTA 6' },
    { name: 'Sykkuno', platform: 'Twitch · YouTube', why: 'GTA RP roots and calm chaos that clips beautifully.', query: 'Sykkuno GTA 6' },
    { name: 'Buddha', platform: 'Twitch', why: 'Long-form GTA RP storylines with a built-in cast.', query: 'Buddha GTA 6' },
    { name: 'Ramee', platform: 'Twitch', why: 'Heists, chases and the kind of fail that needs no context.', query: 'Ramee GTA 6' },
    { name: 'CaseOh', platform: 'Twitch · YouTube', why: 'Reacts to everything and lands a one-liner doing it.', query: 'CaseOh GTA 6' },
    { name: 'Pokimane', platform: 'Twitch · YouTube', why: 'Variety streams with an audience that already watches clips.', query: 'Pokimane GTA 6' },
  ] satisfies GtaCreator[],
  creatorsNote: 'Creator names open a YouTube search for their GTA VI videos. Clipfarm is not affiliated with them and clips only footage you have the rights to use.',
  formatsTitle: 'Six moments every GTA VI VOD has',
  formatsText: 'Leonida gives you the same six beats on loop. Know them and the shortlist writes itself.',
  formats: [
    { title: 'The first reaction', text: 'The intro, the title card, the moment the map opens. Pure launch-day nostalgia, and the easiest clip in the VOD.', stamp: '00:04 → 00:26', line: 'LEONIDA. FINALLY.', tone: 'pink' },
    { title: 'The cop chase', text: 'Wanted stars climbing, a stolen car, a corner taken too fast. Start on the siren, end on the busted screen.', stamp: '12:40 → 13:02', line: 'FIVE STARS. NO PLAN.', tone: 'orange' },
    { title: 'The heist fail', text: 'A plan that survives right up until it does not. The setup is short, the payoff is loud, and chat never lets it go.', stamp: '48:15 → 48:41', line: 'THE PLAN LASTED 4 SECONDS', tone: 'gold' },
    { title: 'The map tour', text: 'Beach, swamp, city skyline. Cut the three best views into one vertical tour with the location names as captions.', stamp: '1:02:10 → 1:02:36', line: 'VICE CITY AT GOLDEN HOUR', tone: 'teal' },
    { title: 'The character creator', text: 'Twenty minutes of sliders and one cursed result. Stop the clip on the reveal, not the sliders.', stamp: '2:18:02 → 2:18:24', line: 'I MADE A MONSTER', tone: 'violet' },
    { title: 'The five-star rampage', text: 'Tank, helicopter, wanted level maxed. Keep the escalation and cut everything between the beats.', stamp: '3:44:50 → 3:45:12', line: 'BUSTED? NEVER HEARD OF HER', tone: 'red' },
  ] as Array<{ title: string; text: string; stamp: string; line: string; tone: 'pink' | 'orange' | 'gold' | 'teal' | 'violet' | 'red' }>,
  formatsNote: 'Illustrative timecodes and captions for the kind of moment the detector clips — not a real stream.',
  detectTitle: 'Detection tuned for Leonida',
  detectText: 'The scorer already ranks laughter, shock, claims and questions. GTA VI adds its own vocabulary on top, so a heist fail outranks a quiet drive.',
  detect: [
    'Chases and heat: wanted level, five stars, cops, busted, getaway.',
    'Crime and chaos: heist, carjack, shootout, rampage, explosion.',
    'Place and lore: Vice City, Leonida, shark card, mission passed.',
    'Reactions: the same laughter, shock and “no way” signals as every other VOD.',
  ],
  detectionDemo: {
    label: 'Example transcript window',
    window: '12:40 → 13:04',
    score: 96,
    lines: [
      { time: '12:41', text: 'no way, no way, he actually got in the car' },
      { time: '12:44', text: 'five stars already, chat, five stars' },
      { time: '12:49', text: 'the cops are not letting this go' },
      { time: '12:55', text: 'this is the worst heist I have ever done' },
      { time: '13:01', text: 'busted. unbelievable.' },
    ],
    signals: [
      { label: 'Chase & heat', value: 96 },
      { label: 'Crime & chaos', value: 81 },
      { label: 'Reactions', value: 88 },
      { label: 'Place & lore', value: 64 },
    ],
    note: 'Illustrative scoring of an example window, not a real VOD.',
  },
  analyzerTitle: 'Clip a GTA VI video now',
  analyzerText: 'Paste the link. If the VOD has captions or chapter markers the clips appear straight away; if it has neither, Clipfarm asks for the transcript instead of inventing one.',
  analyzerSignedOut: 'Create an account and the analyzer is the first thing on your dashboard.',
  faqTitle: 'GTA VI clipping questions',
  faq: [
    { q: 'Does Clipfarm work on GTA VI streams?', a: 'Yes. Any public YouTube video or Twitch VOD or clip works the same way. The detector reads the real transcript or chapter list and ranks the moments, with GTA vocabulary scored a little higher.' },
    { q: 'Can I clip a famous creator’s GTA VI video?', a: 'Only with the rights to it: their official clipping programme, an affiliate deal, or written permission. The creator list here is a starting point for finding footage, not a licence to repost it.' },
    { q: 'Why does a GTA VI VOD sometimes ask for a transcript?', a: 'YouTube blocks server-side caption downloads on a lot of videos, and not every streamer writes chapters. When neither is available the source is saved and you paste the transcript, which the same detector turns into clips.' },
    { q: 'Do I get video files back?', a: 'You get the cut: start and end stamps, caption cues, an SRT file and a share page that embeds the source at the cut. Encoding an MP4 happens in the desktop pipeline, not in the browser.' },
  ],
  disclaimer: 'Clipfarm Studio is not affiliated with Rockstar Games, Take-Two Interactive or any creator listed on this page. GTA and GTA VI are trademarks of their respective owners. Clip only footage you own or are cleared to use.',
  cta: { title: 'The launch window does not wait.', text: 'Sign up and paste your first GTA VI link.', button: 'Start clipping GTA VI' },
}

export const FOOTER = {
  blurb: 'AI clip farming for Twitch, YouTube and TikTok channels that want a daily feed without an editing team.',
  legal: 'Clip only what you have the rights to.',
}

export const NOT_FOUND = {
  title: 'This clip got cut',
  text: 'The page you are looking for has moved or never made it out of the VOD.',
  home: 'Back to home',
  cta: 'Start free',
}
