// Every string and every piece of seed data on the site. Edit here first.
// Clipfarm Studio and all channels, people and numbers are fictional.
import { PLANS } from './shared/account'

/** Every photo goes through this map. Swap the files in public/images/ for real photography. */
export const IMAGES = {
  founder: { src: '/images/founder.jpg', alt: 'Portrait of Maya Lindqvist, founder of Clipfarm Studio' },
  avatarFounder: { src: '/images/avatar-founder.jpg', alt: 'Maya Lindqvist' },
  avatars: [
    { src: '/images/avatar-1.jpg', alt: 'A creator on a Clipfarm retainer' },
    { src: '/images/avatar-2.jpg', alt: 'A creator on a Clipfarm retainer' },
    { src: '/images/avatar-3.jpg', alt: 'A creator on a Clipfarm retainer' },
    { src: '/images/avatar-4.jpg', alt: 'A creator on a Clipfarm retainer' },
  ],
  workshop: { src: '/images/desk.jpg', alt: 'An editor cutting vertical clips on a warm, minimal desk' },
  case1: { src: '/images/case-1.jpg', alt: 'A streamer reacting to gameplay in a warm home studio' },
  case2: { src: '/images/case-2.jpg', alt: 'Two editors reviewing vertical clips together' },
  case3: { src: '/images/case-3.jpg', alt: 'A monitor showing a captioned vertical clip over an editing timeline' },
  case4: { src: '/images/case-4.jpg', alt: 'A Just Chatting streamer laughing into a broadcast microphone' },
  case5: { src: '/images/case-5.jpg', alt: 'An IRL streamer filming himself on a city street at night' },
  case6: { src: '/images/case-6.jpg', alt: 'An esports player at a tournament PC in a team jersey' },
  gtaTrailer2: { src: 'https://i.ytimg.com/vi/VQRLujxTm3c/maxresdefault.jpg', alt: 'Grand Theft Auto VI Trailer 2 key art, from Rockstar Games’ official YouTube channel' },
} as const

export const SITE = {
  name: 'Clipfarm Studio',
  short: 'Clipfarm',
  tagline: 'AI clip farming for Twitch, YouTube and TikTok channels',
  email: 'hello@clipfarm.example',
  location: 'Remote, working in every time zone',
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
  { label: 'Case studies', to: '/case-studies' },
  { label: 'Toolkit', to: '/toolkit' },
  { label: 'About', to: '/about' },
]

export const NAV_CTA = { label: 'Start free', to: '/signup' }

export const HERO = {
  badge: 'Every VOD already has a viral clip in it',
  title: ['AI clip farming for', 'Twitch, YouTube & TikTok'],
  text: 'Send us a six-hour stream. We find the moment, cut it, punch in on the reaction, caption it, and ship vertical clips built to earn views — and money.',
  cta: { label: 'Start free', to: '/signup' },
  note: 'It’s free!',
  proof: 'Trusted by 400+ creators',
  pills: [
    'Highlights found in minutes, not editing nights',
    'Face tracking keeps the streamer in frame',
    'Word-perfect captions in 30+ languages',
    'A punch-in on every reaction and payoff',
    '9:16 exports for Shorts, Reels and TikTok',
    'Revenue share or a flat monthly rate',
  ],
  points: [
    'Bring the VOD, get clips back in 24 hours (not another 40-tab editing job)',
    'Every clip passes a human editor before it ships',
    'Only footage you own or are cleared to clip: rights checked first',
  ],
}

/** Invented channel marks, used by the fictional case studies. Rendered as SVG in components/ClientLogos.tsx. */
export const CLIENTS = ['NovaPlays', 'LoudHouse', 'PixelPunch', 'CheeseGang', 'NightOwl', 'Stackd', 'RageQuit', 'ClipCity'] as const

/**
 * Real channels for the “Clipping for” strip and the creator cards. Profile
 * pictures are the creators’ own public channel avatars, so they live in
 * public/images/creators/ rather than being hotlinked.
 */
export type Creator = {
  name: string
  handle: string
  platform: 'YouTube' | 'TikTok' | 'Twitch'
  category: string
  bio: string
  tags: string[]
  avatar: string
  url: string
}

export const CREATORS: Creator[] = [
  {
    name: 'MrBeast',
    handle: '@MrBeast',
    platform: 'YouTube',
    category: 'Entertainment',
    bio: 'Challenges, giveaways and the biggest spectacles on YouTube. Every upload is built from moments people cannot stop replaying.',
    tags: ['Challenges', 'Shorts'],
    avatar: '/images/creators/pfp-mrbeast.jpg',
    url: 'https://www.youtube.com/@MrBeast',
  },
  {
    name: 'IShowSpeed',
    handle: '@IShowSpeed',
    platform: 'YouTube',
    category: 'IRL & reactions',
    bio: 'Football reactions, Ronaldo devotion and IRL chaos at full volume. The first three seconds are the whole clip.',
    tags: ['Reactions', 'IRL'],
    avatar: '/images/creators/pfp-ishowspeed.jpg',
    url: 'https://www.youtube.com/@IShowSpeed',
  },
  {
    name: 'Kai Cenat',
    handle: '@KaiCenat',
    platform: 'Twitch',
    category: 'Marathon streams',
    bio: 'Marathon streams, Mafiathon and the reactions that become a week of clips before the stream even ends.',
    tags: ['Streams', 'Reactions'],
    avatar: '/images/creators/pfp-kai-cenat.jpg',
    url: 'https://www.youtube.com/@KaiCenat',
  },
  {
    name: 'Jynxzi',
    handle: '@Jynxzi',
    platform: 'TikTok',
    category: 'FPS & rage',
    bio: 'Rainbow Six rage, reaction faces and the loudest clips on TikTok. One round is three clips.',
    tags: ['FPS', 'Rage'],
    avatar: '/images/creators/pfp-jynxzi.jpg',
    url: 'https://www.youtube.com/@Jynxzi',
  },
  {
    name: 'xQc',
    handle: '@xQc',
    platform: 'Twitch',
    category: 'Variety',
    bio: 'Variety streams, speedruns and unfiltered takes, six hours at a time. The clip feed never runs dry.',
    tags: ['Variety', 'Gaming'],
    avatar: '/images/creators/pfp-xqc.jpg',
    url: 'https://www.youtube.com/@xQc',
  },
  {
    name: 'Pokimane',
    handle: '@pokimane',
    platform: 'YouTube',
    category: 'Variety & co-op',
    bio: 'Variety streams, co-op chaos and a community that clips everything before the VOD is even archived.',
    tags: ['Variety', 'Co-op'],
    avatar: '/images/creators/pfp-pokimane.jpg',
    url: 'https://www.youtube.com/@pokimane',
  },
  {
    name: 'CaseOh',
    handle: '@CaseOh',
    platform: 'TikTok',
    category: 'Reaction comedy',
    bio: 'Reacts to everything, lands a one-liner and lets chat do the rest. A channel built out of clip moments.',
    tags: ['Reactions', 'Comedy'],
    avatar: '/images/creators/pfp-caseoh.jpg',
    url: 'https://www.youtube.com/@CaseOh',
  },
  {
    name: 'Sidemen',
    handle: '@Sidemen',
    platform: 'YouTube',
    category: 'Group challenges',
    bio: 'Seven creators, one channel, a hundred clip-worthy moments a week. The original group-clip machine.',
    tags: ['Group', 'Challenges'],
    avatar: '/images/creators/pfp-sidemen.jpg',
    url: 'https://www.youtube.com/@Sidemen',
  },
  {
    name: 'Valkyrae',
    handle: '@Valkyrae',
    platform: 'YouTube',
    category: 'Co-op & variety',
    bio: 'Variety streams, cozy chaos and the kind of laughs that survive the crop to vertical.',
    tags: ['Variety', 'Co-op'],
    avatar: '/images/creators/pfp-valkyrae.jpg',
    url: 'https://www.youtube.com/@Valkyrae',
  },
  {
    name: 'Ninja',
    handle: '@Ninja',
    platform: 'Twitch',
    category: 'Fortnite & esports',
    bio: 'Fortnite, tournaments and the original clip-farm energy. Every win is a short.',
    tags: ['Fortnite', 'Esports'],
    avatar: '/images/creators/pfp-ninja.jpg',
    url: 'https://www.youtube.com/@Ninja',
  },
]

export const CREATORS_NOTE =
  'Profile pictures are the creators’ own public channel avatars; every name links to their channel. Clipfarm is not affiliated with these creators, and only clips footage it has the rights to use.'

export const HOME = {
  trusted: 'Clipping for:',
  services: {
    eyebrow: 'What we do',
    title: 'The whole clip pipeline, not just an editor',
    text: 'Highlights, face tracking, captions, audio and exports: one team turning long VODs into short-form that earns.',
    link: 'See all services',
  },
  plan: {
    eyebrow: 'The pipeline',
    title: 'VOD in, vertical clips out',
    text: 'One pass through three stages. Four hours of footage goes in, twenty clips come out, every one of them ready to post.',
    link: 'Explore the pipeline',
  },
  stack: {
    eyebrow: 'The stack',
    title: 'Open tools, sharpened into one pipeline',
    text: 'Twenty-two open-source projects do the heavy lifting: download, transcribe, track the face, clean the audio, render the captions, encode the export.',
    link: 'See all 22 tools',
  },
  cases: {
    eyebrow: 'Who it is for',
    title: 'Channels that stopped editing at 2am',
    text: 'Real channels with a clip-first feed: the creators whose moments fill TikTok and Shorts, and the kind of footage the desk is built to find.',
    link: 'All case studies',
  },
  stats: [
    { value: '18.4k', label: 'clips cut, tracked and captioned in 2025' },
    { value: '214M', label: 'views earned by client clips' },
    { value: '24 h', label: 'from VOD drop to clips in your inbox' },
    { value: '42', label: 'channels on a monthly retainer' },
  ],
  quote: {
    text: 'I stopped editing at 2am. They found the one rant in a six-hour stream, punched in on my face, captioned it, and it did two million views before I woke up.',
    name: 'Kai Mercer',
    role: 'Streamer, NightOwl',
  },
  faqTitle: 'Questions creators ask',
  cta: {
    title: 'Send one VOD. Take ten clips.',
    text: 'Create your account, set your channel up and choose a plan. Your first VOD pass is free, so you see the clips before you pay.',
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
}

export const SERVICES: Service[] = [
  {
    id: 'highlights',
    title: 'Highlight mining',
    summary: 'We watch the whole VOD, or run detection over it, and pull the laugh, the clutch, the rant and the payoff before the algorithm finds them.',
    outcomes: ['Every stream scanned, not sampled', 'A timestamped shortlist before anyone edits', 'Every moment scored for hook, payoff and clip-ability'],
    deliverables: ['Highlight report per VOD', 'Scene markers in your edit project', 'Retention prediction per clip'],
    icon: 'scissors',
  },
  {
    id: 'face-tracking',
    title: 'Face tracking and punch-ins',
    summary: 'The subject is tracked frame by frame, so your face stays in the vertical crop and every reaction gets the punch-in it deserves.',
    outcomes: ['No more crops that cut off faces', 'Smooth punch-ins on reactions and beats', 'Gameplay stays readable behind the cam'],
    deliverables: ['Per-clip crop paths', 'Reaction punch-ins', 'A tracking QA pass on every clip'],
    icon: 'scanface',
  },
  {
    id: 'captions',
    title: 'Captions and subtitles',
    summary: 'Word-level captions timed to the audio, styled to your channel and rendered as real subtitle files you can edit later.',
    outcomes: ['Captions that match the audio word for word', 'Two or three caption styles per channel', 'Editable subtitle files, not baked screenshots'],
    deliverables: ['WebVTT and SRT files', 'Styled ASS subtitles', 'Burned-in and soft-caption exports'],
    icon: 'captions',
  },
  {
    id: 'audio',
    title: 'Audio cleanup and stems',
    summary: 'Noise out, voice up, music balanced. Every clip sounds like it was cut in a studio, not recorded next to a fan.',
    outcomes: ['Mic noise and room hum removed', 'Voice and music separated into stems', 'Loudness matched across every clip'],
    deliverables: ['Cleaned per-clip audio', 'Vocal and music stems', 'A platform-ready loudness pass'],
    icon: 'audio',
  },
  {
    id: 'vertical-export',
    title: 'Vertical export and delivery',
    summary: '9:16, 1:1 and 16:9 out of one timeline, encoded for Shorts, Reels and TikTok, delivered straight to your folder.',
    outcomes: ['One cut, every aspect ratio', 'Platform-correct bitrates and lengths', 'Files named and sorted for posting'],
    deliverables: ['TikTok, Shorts and Reels masters', 'Thumbnail frames per clip', 'Delivery to Drive, Dropbox or S3'],
    icon: 'phone',
  },
  {
    id: 'growth',
    title: 'Posting, testing and revenue',
    summary: 'We test hooks and captions, track what actually earns, and split the upside. Clipping that pays for itself.',
    outcomes: ['A posting schedule you can keep', 'A/B tests on hooks and captions', 'A revenue share or a flat monthly rate'],
    deliverables: ['Weekly performance report', 'Hook and thumbnail variants', 'Affiliate and revenue-share setup'],
    icon: 'wallet',
  },
]

export const ENGAGEMENTS = {
  title: 'Ways to work together',
  text: 'Start with one free VOD. Stay monthly if the clips earn more than they cost.',
  note: 'Prices are in USD and shown in your currency. Quarterly billing saves 20%. Cancel any time with 30 days’ notice.',
  plans: PLANS,
}

export const SERVICES_PAGE = {
  eyebrow: 'Services',
  title: 'Everything between a VOD and a post',
  text: 'Six jobs, one pipeline. Take the whole thing or just the part your editor is drowning in.',
  compareTitle: 'Clipfarm, not a repost farm',
  compare: [
    { label: 'Turnaround on one VOD', us: '24 to 48 hours', agency: '3 to 5 days', diy: 'Whenever you have a night' },
    { label: 'Rights checked before we cut', us: 'Always', agency: 'Sometimes', diy: 'On you' },
    { label: 'Face tracking and captions', us: 'Standard on every clip', agency: 'Quoted as an add-on', diy: 'Plugins and hope' },
    { label: 'Cost per clip', us: 'From $0.65 (Network)', agency: 'Often $40+ per project', diy: 'Your weekend' },
  ],
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
  title: 'Clarity, cuts and captions before the upload',
  text: 'Every job runs the same way. Pick your channel size to see where the hours go, and tick off the steps you already have covered.',
  stageLabel: 'Your channel',
  progress: 'of the pipeline ticked off on this device',
  reset: 'Reset ticks',
  stages: [
    { id: 'starting', label: 'Starting out, under 10K', focus: ['Highlights', 'Captions', 'Consistency'] },
    { id: 'growing', label: 'Growing, 10K–250K', focus: ['Punch-ins', 'Audio cleanup', 'Daily posting'] },
    { id: 'established', label: 'Established, 250K+', focus: ['Team hand-off', 'Revenue share', 'Multi-platform'] },
  ],
  phases: [
    {
      id: 'find',
      name: 'Find',
      days: 'First 2 hours',
      goal: 'Find the moments worth clipping before anyone touches a timeline.',
      quickWin: 'A timestamped shortlist of ten moments per VOD.',
      weeks: [
        { week: 'Scan', title: 'Watch and detect', items: ['Pull the VOD and its chat log', 'Run highlight detection over the audio', 'Skim the chat spikes and audio peaks'] },
        { week: 'Shortlist', title: 'Score the moments', items: ['Score hook, payoff and clip-ability', 'Cut the dead air and setup', 'Agree the ten keepers'] },
      ],
    },
    {
      id: 'cut',
      name: 'Cut',
      days: 'Hours 2–4',
      goal: 'Cut, track the face and make every clip watchable at 9:16.',
      quickWin: 'A punch-in on the reaction in every clip.',
      weeks: [
        { week: 'Track', title: 'Follow the subject', items: ['Track the face between frames', 'Set punch-ins on reactions', 'Keep the gameplay readable'] },
        { week: 'Caption', title: 'Words and audio', items: ['Transcribe dialogue at word level', 'Clean mic noise and hum', 'Style and burn the captions'] },
      ],
    },
    {
      id: 'ship',
      name: 'Ship',
      days: 'Hours 4–6',
      goal: 'Export every format, check the rights and post on schedule.',
      quickWin: 'Ten clips scheduled across three platforms.',
      weeks: [
        { week: 'Deliver', title: 'Encode and name', items: ['9:16, 1:1 and 16:9 exports', 'Platform bitrates and lengths', 'Files dropped in your folder'] },
        { week: 'Post', title: 'Publish and learn', items: ['Post to Shorts, Reels and TikTok', 'Test two hooks per clip', 'Log what earned'] },
      ],
    },
  ] satisfies Phase[],
  cta: { title: 'Want this for your next VOD?', text: 'The free VOD pass is one form and one link. We do the rest.', button: 'Get 10 free clips' },
}

export type CaseStudy = {
  slug: string
  client: (typeof CLIENTS)[number]
  title: string
  summary: string
  platform: 'Twitch' | 'YouTube' | 'TikTok' | 'Multi-platform'
  niche: string
  topics: string[]
  audience: string
  image: keyof typeof IMAGES
  metrics: Array<{ value: string; label: string }>
  challenge: string
  approach: string[]
  result: string
  quote: { text: string; name: string; role: string }
}

export const CASES_PAGE = {
  eyebrow: 'Case studies',
  title: 'Channels that post every day now',
  text: 'From solo variety streamers to 400K esports channels, all on a monthly clip retainer.',
  searchLabel: 'Search case studies',
  searchPlaceholder: 'Search by channel or format',
  all: 'All',
  empty: 'No case studies match that search.',
  clear: 'Clear filters',
  read: 'Read case study',
  challenge: 'The problem',
  approach: 'What we did',
  result: 'The result',
  next: 'Next case study',
  back: 'All case studies',
}

export const CASES: CaseStudy[] = [
  {
    slug: 'novaplays',
    client: 'NovaPlays',
    title: 'From two clips a week to two a day',
    summary: 'A variety streamer with 500 hours of VODs and no editor.',
    platform: 'Twitch',
    niche: 'Variety',
    topics: ['Highlights', 'Captions'],
    audience: '1.2M followers',
    image: 'case1',
    metrics: [
      { value: '7.4M', label: 'views in 90 days' },
      { value: '180', label: 'clips shipped' },
      { value: '2.1%', label: 'clips past a million' },
    ],
    challenge: 'NovaPlays streamed five nights a week and posted whatever her mods had time to cut. Most of her best moments never left the VOD, and the clips that did go out had no captions.',
    approach: ['Scanned all 22 VODs in the backlog with highlight detection', 'Scored and shortlisted 240 moments for review', 'Tracked her face and set punch-ins on every reaction', 'Captioned every clip in her channel style and delivered 9:16 masters'],
    result: 'Within 90 days the channel went from two clips a week to two a day, and clips became the top source of new followers for the first time.',
    quote: { text: 'I have not opened an editor in three months. My clips go out while I am still streaming.', name: 'Nova Reyes', role: 'Streamer, NovaPlays' },
  },
  {
    slug: 'loudhouse',
    client: 'LoudHouse',
    title: 'A six-hour stream, clipped before breakfast',
    summary: 'A gaming duo whose clips took a full day of editing.',
    platform: 'YouTube',
    niche: 'Gaming',
    topics: ['Face tracking', 'Punch-ins'],
    audience: '820K subscribers',
    image: 'case3',
    metrics: [
      { value: '24 h', label: 'from stream to upload' },
      { value: '6', label: 'VODs clipped each week' },
      { value: '+38%', label: 'shorts watch time' },
    ],
    challenge: 'LoudHouse uploaded long-form VODs and almost no Shorts. Each clip took an editor four hours, so the backlog grew faster than the output.',
    approach: ['Ran detection overnight and reviewed a shortlist each morning', 'Cut 9:16 crops with the subject tracked between frames', 'Punched in on every co-op reaction', 'Delivered all three aspect ratios with two hooks per clip'],
    result: 'The channel now ships six clips a day, a full day ahead, and its Shorts feed pulls a third more watch time than the long-form uploads.',
    quote: { text: 'We went from posting a clip when we had time to posting when the algorithm wants it.', name: 'Theo Marsh', role: 'Co-host, LoudHouse' },
  },
  {
    slug: 'pixelpunch',
    client: 'PixelPunch',
    title: 'Captions in six languages, no extra editors',
    summary: 'A TikTok gaming channel expanding outside English.',
    platform: 'TikTok',
    niche: 'Gaming',
    topics: ['Captions', 'Audio'],
    audience: '2.4M followers',
    image: 'case2',
    metrics: [
      { value: '6', label: 'languages captioned' },
      { value: '41M', label: 'views on localised clips' },
      { value: '92%', label: 'caption accuracy after review' },
    ],
    challenge: 'PixelPunch had an audience in Spanish and Portuguese but every clip shipped with English captions, so the localised versions were made by hand by a fan and posted late.',
    approach: ['Transcribed every VOD at word level and refined the timestamps', 'Ran translated caption tracks through a human review pass', 'Restyled ASS subtitles per language and per safe-zone', 'Balanced music and voice in each export'],
    result: 'Six caption tracks now ship with every clip, and localised versions beat the English original on watch time in four of them.',
    quote: { text: 'The Spanish clips now do better than the English ones. Nobody had to learn a new app.', name: 'Luca Ferreira', role: 'Founder, PixelPunch' },
  },
  {
    slug: 'cheesegang',
    client: 'CheeseGang',
    title: 'One rant became the channel’s biggest week',
    summary: 'A Just Chatting streamer with hours of talking and no cuts.',
    platform: 'Twitch',
    niche: 'Just Chatting',
    topics: ['Highlights', 'Revenue'],
    audience: '310K followers',
    image: 'case4',
    metrics: [
      { value: '11M', label: 'views on one clip series' },
      { value: '$4.1k', label: 'clip revenue in a month' },
      { value: '3×', label: 'new follower rate' },
    ],
    challenge: 'CheeseGang’s streams are hours of conversation with no gameplay to hide behind. His mods clipped whatever they remembered, and the channel had no plan for earning from it.',
    approach: ['Pulled the strongest takes from chat spikes and audio peaks', 'Cut each into a hook-first 30-second vertical', 'Burned in high-contrast captions for silent viewing', 'Set up a clipping program and revenue share with the original editors'],
    result: 'A single rant became a twelve-clip series, the channel’s best week on record, and clip revenue covered the retainer twice over.',
    quote: { text: 'The clip paid more than the stream did. That is the whole pitch, really.', name: 'Marcus “Cheese” Walker', role: 'Host, CheeseGang' },
  },
  {
    slug: 'nightowl',
    client: 'NightOwl',
    title: 'A clip team that pays for itself',
    summary: 'A late-night IRL streamer with sponsors waiting on numbers.',
    platform: 'Multi-platform',
    niche: 'IRL',
    topics: ['Posting', 'Revenue'],
    audience: '1.1M across platforms',
    image: 'case5',
    metrics: [
      { value: '3', label: 'platforms, one schedule' },
      { value: '27M', label: 'views in a quarter' },
      { value: '4.6%', label: 'clips driving sponsor clicks' },
    ],
    challenge: 'NightOwl posted the same clip to three platforms days apart, with the same caption, and had no idea which format earned anything.',
    approach: ['Rebuilt posting around one clip, three cuts, three captions', 'Tested hooks and first frames on TikTok before pushing to Shorts', 'Kept a weekly report of views, follows and sponsor clicks', 'Ran a revenue-share split with the streamer’s own clippers'],
    result: 'Quarterly views tripled, sponsor clicks rose to 4.6% of clip traffic, and the clip retainer now pays for itself inside the first week of each month.',
    quote: { text: 'For the first time I can show a sponsor exactly which clip sent them traffic.', name: 'Ari Solberg', role: 'NightOwl' },
  },
  {
    slug: 'stackd',
    client: 'Stackd',
    title: 'An esports roster with daily shorts',
    summary: 'A five-player roster with a match a week and no clip team.',
    platform: 'YouTube',
    niche: 'Esports',
    topics: ['Highlights', 'Face tracking'],
    audience: '640K subscribers',
    image: 'case6',
    metrics: [
      { value: '31', label: 'players covered' },
      { value: '5', label: 'clips per match day' },
      { value: '2.8M', label: 'views on tournament clips' },
    ],
    challenge: 'Stackd’s highlight reels came out a week after each match, when the conversation had already moved on. Player cams sat unused in the corner of the recording.',
    approach: ['Ingested match VODs and player cam feeds the same night', 'Tracked each player’s face and cropped to the reaction', 'Captioned callouts and crowd moments for sound-off viewing', 'Delivered tournament clips within 12 hours of the final map'],
    result: 'Every match day now produces five clips the same night, and player-cam reactions consistently beat the official highlight reel.',
    quote: { text: 'The player cams were the best content we had. We just never had anyone to cut them.', name: 'Ines Duarte', role: 'Content lead, Stackd' },
  },
]

export const FAQS = [
  { q: 'What is clip farming, exactly?', a: 'Cutting long streams and VODs into short vertical clips that pull new viewers in. We do it by hand with detection tools doing the watching, so the clips keep the context and the payoff instead of being chopped at random.' },
  { q: 'Do I need to own the footage?', a: 'You need the rights to it: your own channel, an official clipping or affiliate programme, or written permission from the creator. We check before we cut anything and will not take a job on reposted footage.' },
  { q: 'How fast do clips come back?', a: 'A free VOD pass is 48 hours. On a retainer, most VODs are clipped within 24 hours, and a live match or stream can be turned around the same night if you book it.' },
  { q: 'What do you need from me?', a: 'A VOD link, your channel assets and a caption style you like. If you have a brand kit, overlays or a do-not-clip list, send those too and every editor works from them.' },
  { q: 'Who posts the clips?', a: 'You can, from a folder we deliver. On Creator and Network plans we also schedule and post, test two hooks per clip, and send a weekly report on what earned.' },
  { q: 'How does the money work?', a: 'A flat monthly rate, a per-clip rate, or a revenue share on clip earnings and sponsor traffic. Most channels start on a flat rate and move to a share once the clips are consistently earning.' },
  { q: 'What if I do not like a clip?', a: 'Every clip includes one revision round. If a whole batch misses the mark, we re-cut it on our time and change the brief so it does not happen twice.' },
]

export const ABOUT = {
  eyebrow: 'About',
  title: 'Hi, I’m Maya. I turn six-hour streams into ten-second decisions.',
  intro: [
    'I started clipping in 2015 for a friend with 300 followers. By 2019 I was cutting for three channels over a million, and the clips were paying more of my rent than the editing work was.',
    'Clipfarm Studio exists because most creators do not need another editor. They need someone to watch everything, find the one moment that travels, and ship it before the conversation moves on. That is the whole job.',
  ],
  name: 'Maya Lindqvist',
  role: 'Founder and head clipper',
  valuesTitle: 'How we work',
  values: [
    { title: 'Rights first', text: 'If you cannot show us you are allowed to clip it, we do not clip it. Reposting is not farming.' },
    { title: 'Human in the loop', text: 'Detection finds candidates. An editor still decides what deserves the cut.' },
    { title: 'Cut for the scroll', text: 'Hook in the first second, payoff before the thumb moves. Every clip is built that way.' },
    { title: 'Numbers, not vibes', text: 'What earned last week decides what we test next week. You get the report either way.' },
  ],
  timelineTitle: 'Along the way',
  timeline: [
    { year: '2015', text: 'First clips cut for a friend’s 300-follower channel' },
    { year: '2018', text: 'Editing for two gaming channels, 40 clips a week' },
    { year: '2021', text: 'Built the first detection + face-tracking pipeline' },
    { year: '2023', text: 'Founded Clipfarm Studio with two editors' },
    { year: '2026', text: '42 channels, 18,000 clips, an editor roster of nine' },
  ],
  teamTitle: 'Editors on the roster',
  team: [
    { name: 'Daniel Moreau', role: 'Highlight detection and scoring', avatar: 1 },
    { name: 'Hana Sato', role: 'Captions and localisation', avatar: 0 },
    { name: 'Oliver Grant', role: 'Sound, stems and loudness', avatar: 3 },
    { name: 'Rui Costa', role: 'Posting, testing and analytics', avatar: 2 },
  ],
  credentials: ['1.4B views clipped since 2015', 'Ex-editor for three 1M+ channels', 'Runs a rights checklist on every job'],
}

/** The pipeline, end to end. Rendered on /toolkit and the home page teaser. */
export type ToolGroup = 'Source' | 'Cut' | 'Track' | 'Words' | 'Sound' | 'Ship'

export type Tool = { n: string; name: string; does: string; href: string; group: ToolGroup }

export const TOOLS: Tool[] = [
  { n: '01', name: 'yt-dlp', does: 'Download source videos', href: 'https://github.com/yt-dlp/yt-dlp', group: 'Source' },
  { n: '02', name: 'OpenCut', does: 'Edit clips on a timeline', href: 'https://github.com/OpenCut-app/OpenCut', group: 'Cut' },
  { n: '03', name: 'OpenCV', does: 'Build tracking and crop logic', href: 'https://github.com/opencv/opencv', group: 'Track' },
  { n: '04', name: 'OBS Studio', does: 'Record gameplay and reactions', href: 'https://github.com/obsproject/obs-studio', group: 'Source' },
  { n: '05', name: 'AI Shorts Generator', does: 'Find highlights and crop vertical clips', href: 'https://github.com/Anil-matcha/AI-Youtube-Shorts-Generator', group: 'Cut' },
  { n: '06', name: 'Mediabunny', does: 'Convert and export media in-browser', href: 'https://github.com/Vanilagy/mediabunny', group: 'Ship' },
  { n: '07', name: 'Whisper', does: 'Turn dialogue into transcripts', href: 'https://github.com/openai/whisper', group: 'Words' },
  { n: '08', name: 'whisper.cpp', does: 'Run transcription on your laptop', href: 'https://github.com/ggml-org/whisper.cpp', group: 'Words' },
  { n: '09', name: 'stable-ts', does: 'Refine word-level timestamps', href: 'https://github.com/jianfch/stable-ts', group: 'Words' },
  { n: '10', name: 'pyannote.audio', does: 'Identify who speaks when', href: 'https://github.com/pyannote/pyannote-audio', group: 'Words' },
  { n: '11', name: 'Supervision', does: 'Build tracking and detection overlays', href: 'https://github.com/roboflow/supervision', group: 'Track' },
  { n: '12', name: 'Norfair', does: 'Track subjects between frames', href: 'https://github.com/tryolabs/norfair', group: 'Track' },
  { n: '13', name: 'DeepFilterNet', does: 'Clean noisy microphone audio', href: 'https://github.com/Rikorose/DeepFilterNet', group: 'Sound' },
  { n: '14', name: 'Demucs', does: 'Separate vocals and music stems', href: 'https://github.com/facebookresearch/demucs', group: 'Sound' },
  { n: '15', name: 'pysubs2', does: 'Batch-edit subtitle timing and styles', href: 'https://github.com/tkarabela/pysubs2', group: 'Words' },
  { n: '16', name: 'libass', does: 'Render styled ASS subtitles', href: 'https://github.com/libass/libass', group: 'Words' },
  { n: '17', name: 'Editly', does: 'Assemble clips with code', href: 'https://github.com/mifi/editly', group: 'Cut' },
  { n: '18', name: 'Kdenlive', does: 'Cut and keyframe your final edit', href: 'https://github.com/KDE/kdenlive', group: 'Cut' },
  { n: '19', name: 'Shotcut', does: 'Mix tracks and apply video filters', href: 'https://github.com/mltframework/shotcut', group: 'Cut' },
  { n: '20', name: 'Real-ESRGAN', does: 'Restore and upscale video frames', href: 'https://github.com/xinntao/Real-ESRGAN', group: 'Track' },
  { n: '21', name: 'RIFE', does: 'Interpolate intermediate frames', href: 'https://github.com/hzwer/ECCV2022-RIFE', group: 'Track' },
  { n: '22', name: 'PyAV', does: 'Decode and process video in Python', href: 'https://github.com/PyAV-Org/PyAV', group: 'Source' },
]

export const TOOLKIT = {
  eyebrow: 'Toolkit',
  title: 'The stack behind every clip',
  text: 'Everything we run is open source. Twenty-two tools, one pipeline, no black box.',
  tagline: 'VOD → find the reaction → cut → punch in → caption → ship.',
  note: 'Each project keeps its own licence. Check it before you ship it commercially.',
  linkLabel: 'Open on GitHub',
  groups: ['Source', 'Cut', 'Track', 'Words', 'Sound', 'Ship'] as ToolGroup[],
  groupText: {
    Source: 'Get the footage in: downloads, capture and decoding.',
    Cut: 'Find the moment and put it on a timeline.',
    Track: 'Keep the face in frame and the reaction readable.',
    Words: 'Transcripts, speakers and styled subtitles.',
    Sound: 'Noise out, voice up, stems separated.',
    Ship: 'Encode it once and export it everywhere.',
  },
  cta: { title: 'Want this running on your channel?', text: 'Send a recent VOD and we will run the whole stack on it for free.', button: 'Get 10 free clips' },
}

/** GTA VI launch hub: the game, the creators and the moments worth clipping. */
export type GtaCreator = { name: string; platform: string; why: string; query: string; avatar: string }
export type GtaClip = {
  id: string
  creator: string
  channel: string
  avatar: string
  title: string
  tag: string
  format: 'Short' | 'Clip'
  thumbnail: string
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
    { value: '24 h', label: 'from link to clips on a retainer' },
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
      avatar: '/images/creators/pfp-mrbeast.jpg',
      title: 'How Long Can You Survive 6 Stars In GTA 6?',
      tag: 'Six-star survival',
      format: 'Short',
      thumbnail: '/images/gta-clips/nPA55csY5us-maxresdefault.jpg',
    },
    {
      id: 'GoVqTZn7kSY',
      creator: 'Kai Cenat',
      channel: 'Kai Cenat Live · official upload',
      avatar: '/images/creators/pfp-kai-cenat.jpg',
      title: 'Kai Cenat Says The Reason He’s Streaming GTA VI For His Younger Viewers',
      tag: 'The first reaction',
      format: 'Short',
      thumbnail: '/images/gta-clips/GoVqTZn7kSY-maxresdefault.jpg',
    },
    {
      id: '5rmHKsFXExs',
      creator: 'IShowSpeed',
      channel: 'GTA VI Clips · clip channel',
      avatar: '/images/creators/pfp-ishowspeed.jpg',
      title: '“I Really Show Speed, Bro” — IShowSpeed’s fastest GTA 6 mission',
      tag: 'Fastest mission',
      format: 'Short',
      thumbnail: '/images/gta-clips/5rmHKsFXExs-maxresdefault.jpg',
    },
    {
      id: 'pnfc8e04-5M',
      creator: 'Jynxzi',
      channel: 'Vice-City Vinny · clip channel',
      avatar: '/images/creators/pfp-jynxzi.jpg',
      title: 'Jynxzi’s Easter egg off GTA 6’s tallest tower landed IN A CAR',
      tag: 'The easter egg',
      format: 'Short',
      thumbnail: '/images/gta-clips/pnfc8e04-5M-maxresdefault.jpg',
    },
    {
      id: 'LphAOQ6wMm4',
      creator: 'xQc',
      channel: 'xQc Clips · clip channel',
      avatar: '/images/creators/pfp-xqc.jpg',
      title: 'xQc gets into a FATAL CAR CRASH IN GTA 6',
      tag: 'The crash',
      format: 'Short',
      thumbnail: '/images/gta-clips/LphAOQ6wMm4-maxresdefault.jpg',
      focus: 'left',
    },
    {
      id: 'BDhu6YgYCvA',
      creator: 'CaseOh',
      channel: 'CaseOh Daily Clips · clip channel',
      avatar: '/images/creators/pfp-caseoh.jpg',
      title: 'CaseOh snaps at a rude old man in GTA 6',
      tag: 'The rude NPC',
      format: 'Short',
      thumbnail: '/images/gta-clips/BDhu6YgYCvA-maxresdefault.jpg',
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
    { name: 'xQc', platform: 'Twitch · YouTube', why: 'Variety streams with unfiltered reactions and no pause button.', query: 'xQc GTA 6', avatar: '/images/creators/xqc.jpg' },
    { name: 'Kai Cenat', platform: 'Twitch · YouTube', why: 'Marathon streams where one reaction becomes a week of clips.', query: 'Kai Cenat GTA 6', avatar: '/images/creators/kai-cenat.jpg' },
    { name: 'IShowSpeed', platform: 'YouTube', why: 'Loud, fast and built for the first three seconds of a Short.', query: 'IShowSpeed GTA 6', avatar: '/images/creators/ishowspeed.jpg' },
    { name: 'Sykkuno', platform: 'Twitch · YouTube', why: 'GTA RP roots and calm chaos that clips beautifully.', query: 'Sykkuno GTA 6', avatar: '/images/creators/sykkuno.png' },
    { name: 'Buddha', platform: 'Twitch', why: 'Long-form GTA RP storylines with a built-in cast.', query: 'Buddha GTA 6', avatar: '/images/creators/buddha.jpg' },
    { name: 'Ramee', platform: 'Twitch', why: 'Heists, chases and the kind of fail that needs no context.', query: 'Ramee GTA 6', avatar: '/images/creators/ramee.jpg' },
    { name: 'CaseOh', platform: 'Twitch · YouTube', why: 'Reacts to everything and lands a one-liner doing it.', query: 'CaseOh GTA 6', avatar: '/images/creators/caseoh.jpg' },
    { name: 'Pokimane', platform: 'Twitch · YouTube', why: 'Variety streams with an audience that already watches clips.', query: 'Pokimane GTA 6', avatar: '/images/creators/pokimane.png' },
  ] satisfies GtaCreator[],
  creatorsNote: 'Creator names open a YouTube search for their GTA VI videos. Photos are freely licensed press portraits or the creators’ own channel pictures. Clipfarm is not affiliated with them and clips only footage you have the rights to use.',
  creatorCredits: [
    'xQc: photo by Esfand, CC BY 3.0, via Wikimedia Commons.',
    'Kai Cenat: photo by MILLION DOLLAZ WORTH OF GAME, CC BY 3.0, via Wikimedia Commons.',
    'IShowSpeed: photo by Chin Yu Chu, CC BY-SA 2.0, via Wikimedia Commons.',
    'Sykkuno: photo by OfflineTV Podcast Clips, CC BY 3.0, via Wikimedia Commons.',
    'Pokimane, CaseOh, Ramee and Buddha: their own public Twitch and YouTube channel pictures.',
  ],
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
  analyzerSignedOut: 'Create an account, pick a plan and the analyzer is the first thing on your dashboard.',
  faqTitle: 'GTA VI clipping questions',
  faq: [
    { q: 'Does Clipfarm work on GTA VI streams?', a: 'Yes. Any public YouTube video or Twitch VOD or clip works the same way. The detector reads the real transcript or chapter list and ranks the moments, with GTA vocabulary scored a little higher.' },
    { q: 'Can I clip a famous creator’s GTA VI video?', a: 'Only with the rights to it: their official clipping programme, an affiliate deal, or written permission. The creator list here is a starting point for finding footage, not a licence to repost it.' },
    { q: 'Why does a GTA VI VOD sometimes ask for a transcript?', a: 'YouTube blocks server-side caption downloads on a lot of videos, and not every streamer writes chapters. When neither is available the source is saved and you paste the transcript, which the same detector turns into clips.' },
    { q: 'Do I get video files back?', a: 'You get the cut: start and end stamps, caption cues, an SRT file and a share page that embeds the source at the cut. Encoding an MP4 happens in the desktop pipeline, not in the browser.' },
  ],
  disclaimer: 'Clipfarm Studio is not affiliated with Rockstar Games, Take-Two Interactive or any creator listed on this page. GTA and GTA VI are trademarks of their respective owners. Clip only footage you own or are cleared to use.',
  cta: { title: 'The launch window does not wait.', text: 'Sign up, pick a plan and paste your first GTA VI link. The clips land in your dashboard in minutes.', button: 'Start clipping GTA VI' },
}

export const FOOTER = {
  blurb: 'AI clip farming for Twitch, YouTube and TikTok channels that want a daily feed without an editing team.',
  columns: [
    { title: 'Services', links: [{ label: 'All services', to: '/services' }, { label: 'Ways to work together', to: '/services#plans' }, { label: 'The pipeline', to: '/pipeline' }] },
    { title: 'Company', links: [{ label: 'About', to: '/about' }, { label: 'GTA VI launch', to: '/gta-6' }, { label: 'Case studies', to: '/case-studies' }, { label: 'Start free', to: '/signup' }] },
    { title: 'Resources', links: [{ label: 'Toolkit', to: '/toolkit' }, { label: 'FAQ', to: '/#faq' }, { label: 'Style guide', to: '/styleguide' }] },
  ],
  newsletterTitle: 'The Clip Notes',
  newsletterText: 'One clipping teardown every other Thursday: hook, punch-in, payoff.',
  newsletterButton: 'Subscribe',
  newsletterDone: 'You’re on the list. First teardown lands Thursday.',
  legal: 'Clipfarm Studio is a fictional company for this template. Clip only what you have the rights to.',
}

export const NOT_FOUND = {
  title: 'This clip got cut',
  text: 'The page you are looking for has moved or never made it out of the VOD.',
  home: 'Back to home',
  cta: 'Start free',
}
