// Every string and every piece of seed data on the site. Edit here first.
// Peoplefirst Partners and all clients, people and numbers are fictional.

/** Every photo goes through this map. Swap the files in public/images/ for real photography. */
export const IMAGES = {
  founder: { src: '/images/founder.webp', alt: 'Maya Lindqvist, founder of Peoplefirst Partners, in a bright office' },
  avatarFounder: { src: '/images/avatar-founder.webp', alt: 'Maya Lindqvist' },
  avatars: [
    { src: '/images/avatar-1.webp', alt: 'Founder of a client company' },
    { src: '/images/avatar-2.webp', alt: 'Founder of a client company' },
    { src: '/images/avatar-3.webp', alt: 'Founder of a client company' },
    { src: '/images/avatar-4.webp', alt: 'Founder of a client company' },
  ],
  workshop: { src: '/images/workshop.webp', alt: 'A people workshop with cards on a whiteboard' },
  case1: { src: '/images/case-1.webp', alt: 'A small startup team around a table with laptops' },
  case2: { src: '/images/case-2.webp', alt: 'Two colleagues in a one-to-one conversation' },
  case3: { src: '/images/case-3.webp', alt: 'An engineering team standup in a bright office' },
} as const

export const SITE = {
  name: 'Peoplefirst Partners',
  short: 'Peoplefirst',
  tagline: 'Fractional Head of People for startups and scaleups',
  email: 'hello@peoplefirst.example',
  location: 'Remote across Europe and North America',
  storagePrefix: 'pfp',
}

export type NavItem = { label: string; to: string; children?: Array<{ label: string; to: string; text: string }> }

export const NAV: NavItem[] = [
  {
    label: 'Services',
    to: '/services',
    children: [
      { label: 'Fractional Head of People', to: '/services#fractional-head', text: 'Senior people leadership, two to eight days a month' },
      { label: 'Hiring and onboarding', to: '/services#hiring', text: 'Repeatable recruiting and a first week that works' },
      { label: 'Performance and pay', to: '/services#performance', text: 'Levels, reviews and compensation people trust' },
      { label: 'Policy and compliance', to: '/services#compliance', text: 'Handbooks, contracts and multi-country basics' },
    ],
  },
  { label: 'How it works', to: '/90-day-plan' },
  { label: 'Case studies', to: '/case-studies' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/audit' },
]

export const NAV_CTA = { label: 'Book a call', to: '/audit' }

export const HERO = {
  badge: 'She built the people function from scratch',
  title: ['A Fractional Head of People', 'For Startups & Scaleups'],
  text: 'Scale your team without the HR overhead. Get a fractional Head of People who builds systems that grow with you.',
  cta: { label: 'Book Free HR Audit', to: '/audit' },
  note: 'It’s free!',
  proof: 'Loved by founders globally',
  pills: [
    'Hire faster with repeatable recruiting + onboarding',
    'Make performance + compensation clear, fair, and motivating',
    'Stay ahead of policies, compliance, and multi-country basics',
    'Build a culture people talk about (for the right reasons)',
    'Give managers the tools to lead, not guess',
    'Set up people ops that run themselves (not chaos)',
  ],
  points: [
    'Senior people leadership (not junior admin support)',
    '90-day plan first: clarity + quick wins before heavy lifting',
    'Human-first, execution-driven (systems you’ll actually use)',
  ],
}

/** Invented client marks. Rendered as SVG in components/ClientLogos.tsx. */
export const CLIENTS = ['Halden', 'Northloop', 'Kestrel', 'Brightwater', 'Oakfield', 'Tidecraft', 'Lumen&Co', 'Fernway'] as const

export const HOME = {
  trusted: 'Trusted by:',
  services: {
    eyebrow: 'What I do',
    title: 'People operations, without the people overhead',
    text: 'One senior partner who sets up the systems a 20 to 300 person company needs, then hands them to your team.',
    link: 'See all services',
  },
  plan: {
    eyebrow: 'How it works',
    title: 'It starts with a 90-day plan',
    text: 'No 40-page strategy deck. We listen, fix what hurts, then build the foundations in the order your growth needs them.',
    link: 'Explore the 90-day plan',
  },
  cases: {
    eyebrow: 'Case studies',
    title: 'Founders who got their time back',
    link: 'All case studies',
  },
  stats: [
    { value: '60+', label: 'startups supported since 2019' },
    { value: '38%', label: 'faster time to hire, on average' },
    { value: '4.9/5', label: 'average founder rating' },
    { value: '11', label: 'countries with teams we have set up' },
  ],
  quote: {
    text: 'Maya did in three months what we had been putting off for two years. Our managers finally know what good looks like, and I stopped being the HR department at midnight.',
    name: 'Priya Natarajan',
    role: 'CEO, Northloop',
  },
  faqTitle: 'Questions founders ask',
  cta: {
    title: 'Not sure where to start?',
    text: 'Book a free 45-minute HR audit. You leave with a short list of what to fix first, whether or not we work together.',
    button: 'Book Free HR Audit',
  },
}

export type Service = {
  id: string
  title: string
  summary: string
  outcomes: string[]
  deliverables: string[]
  icon: 'compass' | 'users' | 'scale' | 'shield' | 'sparkles' | 'graduation'
}

export const SERVICES: Service[] = [
  {
    id: 'fractional-head',
    title: 'Fractional Head of People',
    summary: 'A senior people leader in your leadership team, two to eight days a month, for as long as you need one.',
    outcomes: ['A people roadmap tied to your hiring plan', 'One owner for every people question', 'Leadership team coaching on hard calls'],
    deliverables: ['Monthly people review', 'Board-ready headcount reporting', 'On-call support for sensitive issues'],
    icon: 'compass',
  },
  {
    id: 'hiring',
    title: 'Hiring and onboarding',
    summary: 'A recruiting process your managers can run without you, and a first 30 days new joiners rave about.',
    outcomes: ['Scorecards for every open role', 'Structured interviews that cut bias', 'Onboarding that gets people productive in weeks'],
    deliverables: ['Interview kits per role', 'Offer and close playbook', 'Onboarding checklist in your tools'],
    icon: 'users',
  },
  {
    id: 'performance',
    title: 'Performance and pay',
    summary: 'Career levels, reviews and compensation bands that are clear, fair and simple enough to actually use.',
    outcomes: ['Levels people can read in five minutes', 'Pay bands benchmarked to your market', 'Reviews that take hours, not weeks'],
    deliverables: ['Career framework', 'Compensation bands and policy', 'Twice-yearly review cycle'],
    icon: 'scale',
  },
  {
    id: 'compliance',
    title: 'Policy and compliance',
    summary: 'The handbook, contracts and country basics that keep you safe as you hire across borders.',
    outcomes: ['A handbook people read', 'Contracts that match how you work', 'Multi-country hiring without surprises'],
    deliverables: ['Employee handbook', 'Contract and policy templates', 'Employer-of-record setup guide'],
    icon: 'shield',
  },
  {
    id: 'culture',
    title: 'Culture and engagement',
    summary: 'Values you can hire and fire by, rituals that scale, and an engagement pulse you can act on.',
    outcomes: ['Values written by your team', 'Quarterly engagement pulse', 'Rituals that survive the next 50 hires'],
    deliverables: ['Values workshop', 'Pulse survey and action plan', 'Recognition and feedback rituals'],
    icon: 'sparkles',
  },
  {
    id: 'managers',
    title: 'Manager development',
    summary: 'Practical training for first-time managers: one-to-ones, feedback, hiring and the conversations nobody enjoys.',
    outcomes: ['Confident first-time managers', 'Consistent one-to-ones', 'Fewer escalations to founders'],
    deliverables: ['Six-session manager programme', 'Manager handbook', 'Monthly manager circle'],
    icon: 'graduation',
  },
]

export type Plan = {
  id: string
  name: string
  days: string
  monthly: number
  text: string
  features: string[]
  featured?: boolean
}

export const ENGAGEMENTS: { title: string; text: string; plans: Plan[]; note: string } = {
  title: 'Ways to work together',
  text: 'Month to month after the first 90 days. Pause or change level with 30 days’ notice.',
  note: 'Prices exclude VAT. Quarterly billing saves 10%.',
  plans: [
    {
      id: 'advisor',
      name: 'Advisor',
      days: '2 days a month',
      monthly: 2400,
      text: 'For teams of 10 to 30 who need a senior sounding board and the basics in place.',
      features: ['Monthly people review', 'Async support on Slack', 'Templates and policies', 'Hiring plan review'],
    },
    {
      id: 'partner',
      name: 'Partner',
      days: '4 days a month',
      monthly: 4200,
      text: 'For teams of 30 to 120 building performance, pay and manager habits.',
      features: ['Everything in Advisor', 'Weekly leadership check-in', 'Performance and pay design', 'Manager programme'],
      featured: true,
    },
    {
      id: 'embedded',
      name: 'Embedded',
      days: '8 days a month',
      monthly: 7600,
      text: 'For scaleups of 120 to 300 who need a Head of People in the room.',
      features: ['Everything in Partner', 'Leadership team member', 'People team hiring and coaching', 'Board reporting'],
    },
  ],
}

export const SERVICES_PAGE = {
  eyebrow: 'Services',
  title: 'Senior people leadership, sized to your stage',
  text: 'Pick the work you need now. Most clients start with a 90-day plan and two or three of these areas.',
  compareTitle: 'Fractional, not junior',
  compare: [
    { label: 'Experience', fractional: '15+ years, Head of People level', agency: 'Varies by consultant', hire: 'Depends on budget' },
    { label: 'Time to start', fractional: 'Within two weeks', agency: '2 to 4 weeks', hire: '3 to 6 months' },
    { label: 'Monthly cost', fractional: 'From €2,400', agency: 'Per project', hire: '€12k+ fully loaded' },
    { label: 'Builds your systems', fractional: 'Yes, and hands them over', agency: 'Often advice only', hire: 'Yes' },
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
  eyebrow: 'The 90-day plan',
  title: 'Clarity and quick wins before the heavy lifting',
  text: 'Every engagement starts the same way. Pick your stage to see what the first 90 days usually focus on, and tick things off as you go.',
  stageLabel: 'Your stage',
  progress: 'of the plan ticked off on this device',
  reset: 'Reset ticks',
  stages: [
    { id: 'seed', label: 'Seed, 10–30 people', focus: ['First hiring process', 'Contracts and handbook', 'Founder time back'] },
    { id: 'series-a', label: 'Series A, 30–120', focus: ['Career levels', 'Manager habits', 'Pay bands'] },
    { id: 'series-b', label: 'Series B+, 120–300', focus: ['People team', 'Multi-country', 'Board reporting'] },
  ],
  phases: [
    {
      id: 'listen',
      name: 'Listen',
      days: 'Days 1–30',
      goal: 'Understand how the company really works and fix what hurts most.',
      quickWin: 'A one-page people roadmap your leadership team agrees on.',
      weeks: [
        { week: 'Week 1', title: 'Interviews', items: ['Founder and leadership interviews', 'Eight to twelve team conversations', 'Review contracts, policies and tools'] },
        { week: 'Week 2', title: 'People audit', items: ['Score the twelve audit areas', 'Map legal and compliance risks', 'Benchmark headcount plan'] },
        { week: 'Weeks 3–4', title: 'Quick wins', items: ['Fix the top three pain points', 'Share findings with the team', 'Agree the roadmap'] },
      ],
    },
    {
      id: 'build',
      name: 'Build',
      days: 'Days 31–60',
      goal: 'Put the foundations in place in the order your growth needs them.',
      quickWin: 'A hiring process managers can run without the founders.',
      weeks: [
        { week: 'Weeks 5–6', title: 'Hiring engine', items: ['Scorecards for open roles', 'Interview kits and training', 'Offer and close playbook'] },
        { week: 'Weeks 7–8', title: 'Onboarding', items: ['30-day onboarding plan', 'Buddy and manager checklists', 'Automate it in your tools'] },
      ],
    },
    {
      id: 'scale',
      name: 'Scale',
      days: 'Days 61–90',
      goal: 'Make performance and growth clear, then hand the systems over.',
      quickWin: 'Career levels and a review cycle ready to launch.',
      weeks: [
        { week: 'Weeks 9–10', title: 'Performance', items: ['Draft career levels', 'Design the review cycle', 'Calibrate with managers'] },
        { week: 'Weeks 11–12', title: 'Hand-over', items: ['Manager training sessions', 'People metrics dashboard', 'Plan for the next 90 days'] },
      ],
    },
  ] satisfies Phase[],
  cta: { title: 'Want this plan for your company?', text: 'The free HR audit is week two of the plan, done in 45 minutes.', button: 'Book Free HR Audit' },
}

export type CaseStudy = {
  slug: string
  client: (typeof CLIENTS)[number]
  title: string
  summary: string
  stage: 'Seed' | 'Series A' | 'Series B'
  sector: string
  topics: string[]
  headcount: string
  image: keyof typeof IMAGES
  metrics: Array<{ value: string; label: string }>
  challenge: string
  approach: string[]
  result: string
  quote: { text: string; name: string; role: string }
}

export const CASES_PAGE = {
  eyebrow: 'Case studies',
  title: 'What changes when someone owns people',
  text: 'Three to twelve month engagements with startups from 15 to 280 people.',
  searchLabel: 'Search case studies',
  searchPlaceholder: 'Search by company, sector or topic',
  all: 'All',
  empty: 'No case studies match that search.',
  clear: 'Clear filters',
  read: 'Read case study',
  challenge: 'The challenge',
  approach: 'What we did',
  result: 'The result',
  next: 'Next case study',
  back: 'All case studies',
}

export const CASES: CaseStudy[] = [
  {
    slug: 'northloop',
    client: 'Northloop',
    title: 'From founder-run HR to a people function in 90 days',
    summary: 'A 45-person fintech where the CEO was still writing every offer letter.',
    stage: 'Series A',
    sector: 'Fintech',
    topics: ['Hiring', 'Performance'],
    headcount: '45 → 110',
    image: 'case1',
    metrics: [
      { value: '−41%', label: 'time to hire' },
      { value: '92%', label: 'offer acceptance' },
      { value: '6 h', label: 'founder time back each week' },
    ],
    challenge: 'Northloop had raised its Series A and planned to more than double in a year, but hiring ran through the CEO’s inbox and nobody knew how promotions worked.',
    approach: ['Interviewed every manager and a third of the team in two weeks', 'Built scorecards and interview kits for 14 open roles', 'Launched a four-level career framework with clear examples', 'Trained eight first-time managers over six sessions'],
    result: 'Northloop grew from 45 to 110 people in eleven months with a hiring process the managers run themselves, and hired its first full-time People Partner in month eight.',
    quote: { text: 'Maya did in three months what we had been putting off for two years.', name: 'Priya Natarajan', role: 'CEO, Northloop' },
  },
  {
    slug: 'kestrel',
    client: 'Kestrel',
    title: 'Fair pay bands across four countries',
    summary: 'A climate-tech scaleup with pay set one negotiation at a time.',
    stage: 'Series B',
    sector: 'Climate tech',
    topics: ['Compensation', 'Compliance'],
    headcount: '180 → 240',
    image: 'case3',
    metrics: [
      { value: '4', label: 'countries on one framework' },
      { value: '−70%', label: 'pay-related escalations' },
      { value: '+18', label: 'eNPS points in two quarters' },
    ],
    challenge: 'Kestrel employed people in Germany, Spain, Portugal and the UK, and every salary had been negotiated separately. Two engineers on the same team were €30k apart.',
    approach: ['Benchmarked every role against market data in each country', 'Designed bands and a transparent pay policy', 'Ran a one-time equity adjustment for 23 people', 'Set up employer-of-record contracts for the two smallest countries'],
    result: 'Every Kestrel employee can now see their band and the path to the next one, and pay questions dropped from the top of the engagement survey.',
    quote: { text: 'For the first time I can explain any salary in the company in one sentence.', name: 'Jonas Albrecht', role: 'COO, Kestrel' },
  },
  {
    slug: 'brightwater',
    client: 'Brightwater',
    title: 'A first-time management team that leads with confidence',
    summary: 'Twelve engineers promoted to managers in a single year.',
    stage: 'Series A',
    sector: 'Developer tools',
    topics: ['Managers', 'Culture'],
    headcount: '70 → 95',
    image: 'case2',
    metrics: [
      { value: '12', label: 'new managers trained' },
      { value: '100%', label: 'weekly one-to-ones' },
      { value: '−55%', label: 'regretted attrition' },
    ],
    challenge: 'Brightwater promoted its best engineers into management, then watched two of them burn out. One-to-ones were skipped and feedback only happened at exit interviews.',
    approach: ['Ran a six-session manager programme in cohorts of six', 'Wrote a short manager handbook with real scripts', 'Started a monthly manager circle', 'Added a quarterly engagement pulse with team-level actions'],
    result: 'A year on, every manager holds weekly one-to-ones and regretted attrition is less than half of what it was.',
    quote: { text: 'Our managers stopped guessing. That changed everything downstream.', name: 'Sam Okafor', role: 'CTO, Brightwater' },
  },
  {
    slug: 'oakfield',
    client: 'Oakfield',
    title: 'Contracts, handbook and hiring from zero',
    summary: 'A 15-person health startup making its first ten hires.',
    stage: 'Seed',
    sector: 'Health',
    topics: ['Compliance', 'Hiring'],
    headcount: '15 → 32',
    image: 'workshop',
    metrics: [
      { value: '10', label: 'hires in four months' },
      { value: '2 wk', label: 'to a complete handbook' },
      { value: '0', label: 'contract gaps at due diligence' },
    ],
    challenge: 'Oakfield was hiring fast after its seed round with contracts copied from a template site and no handbook at all.',
    approach: ['Replaced contracts and added the missing policies', 'Wrote a 20-page handbook in the team’s own voice', 'Built a lightweight hiring process for the founders', 'Prepared a people data room for the next round'],
    result: 'Oakfield passed Series A due diligence with no people findings and doubled the team without a single bad hire.',
    quote: { text: 'Due diligence asked for our people documents and we had them in an hour.', name: 'Leah Brandt', role: 'Co-founder, Oakfield' },
  },
  {
    slug: 'tidecraft',
    client: 'Tidecraft',
    title: 'Reviews that take hours, not weeks',
    summary: 'A marketplace whose review cycle had stalled for a year.',
    stage: 'Series B',
    sector: 'Marketplace',
    topics: ['Performance', 'Culture'],
    headcount: '260',
    image: 'case1',
    metrics: [
      { value: '6 h', label: 'per manager per cycle' },
      { value: '97%', label: 'reviews completed on time' },
      { value: '+22', label: 'points on “I know how I’m doing”' },
    ],
    challenge: 'Tidecraft’s annual review took six weeks, so it was skipped entirely in its busiest year. People had no idea where they stood.',
    approach: ['Replaced the annual review with two light cycles a year', 'Cut the form from 14 questions to 4', 'Ran calibration sessions with every department', 'Linked outcomes to the career framework and pay bands'],
    result: 'The first new cycle finished in nine days with 97% completion, and managers now ask when the next one starts.',
    quote: { text: 'I did not think anyone would ever say they liked our reviews.', name: 'Ana Ribeiro', role: 'VP People Operations, Tidecraft' },
  },
  {
    slug: 'fernway',
    client: 'Fernway',
    title: 'Hiring a people team to take over',
    summary: 'Building and coaching an in-house team, then stepping back.',
    stage: 'Series B',
    sector: 'Logistics',
    topics: ['Hiring', 'Managers'],
    headcount: '150 → 280',
    image: 'case3',
    metrics: [
      { value: '3', label: 'people team hires' },
      { value: '9 mo', label: 'to a full hand-over' },
      { value: '4.8/5', label: 'new joiner onboarding score' },
    ],
    challenge: 'Fernway needed a full people team but did not know which roles to hire first or what good looked like.',
    approach: ['Designed the people team structure for the next two years', 'Hired a Head of People, a recruiter and a People Partner', 'Coached the new Head of People for six months', 'Handed over every system with documentation'],
    result: 'Fernway now runs a three-person people team that owns everything we built together, and the founders stay in touch quarterly.',
    quote: { text: 'The best sign of a fractional leader is that you stop needing them. We did.', name: 'Tom Reyes', role: 'CEO, Fernway' },
  },
]

export const FAQS = [
  { q: 'What is a fractional Head of People?', a: 'A senior people leader who works with you part time, usually two to eight days a month. You get the experience of a full-time Head of People at a fraction of the cost, without the six-month search.' },
  { q: 'When is the right time to bring one in?', a: 'Usually between 15 and 50 people, or just after a funding round when hiring speeds up. If the founders are still the HR department, it is probably time.' },
  { q: 'How is this different from an HR agency?', a: 'Agencies tend to deliver projects or advice. A fractional Head of People sits in your leadership team, owns the outcomes, and builds systems your team keeps using after we step back.' },
  { q: 'Do you work with teams outside Europe?', a: 'Yes. Most clients are in Europe and North America, and many hire across several countries. We work with employer-of-record partners where it makes sense.' },
  { q: 'What happens after the 90 days?', a: 'You choose: continue month to month at the level you need, hand over to an in-house hire we help you find, or pause. There is no long contract.' },
  { q: 'What does the free HR audit cover?', a: 'In 45 minutes we score twelve areas, from hiring and contracts to performance and pay, and send you a short list of what to fix first. No pitch deck.' },
]

export const ABOUT = {
  eyebrow: 'About',
  title: 'Hi, I’m Maya. I build people teams that outlast me.',
  intro: [
    'I spent fifteen years in people leadership at startups and scaleups, from employee number nine to a 1,200-person company across six countries.',
    'In 2019 I started Peoplefirst Partners because most early-stage companies do not need a full-time Head of People yet. They need someone senior for a few days a month who builds the right systems, then teaches the team to run them.',
  ],
  name: 'Maya Lindqvist',
  role: 'Founder and Fractional Head of People',
  valuesTitle: 'How I work',
  values: [
    { title: 'Human first', text: 'Policies exist to help people do their best work, not to protect the company from them.' },
    { title: 'Execution over decks', text: 'Every engagement ships working systems in your tools in the first month.' },
    { title: 'Teach, then step back', text: 'Success is the day you do not need me any more. Everything is documented and handed over.' },
    { title: 'Plain language', text: 'If a policy needs a lawyer to read, it gets rewritten until it does not.' },
  ],
  timelineTitle: 'Along the way',
  timeline: [
    { year: '2011', text: 'First people hire at a 9-person design startup' },
    { year: '2014', text: 'Head of People through Series B, 40 to 260 people' },
    { year: '2017', text: 'VP People at a 1,200-person scaleup in six countries' },
    { year: '2019', text: 'Founded Peoplefirst Partners' },
    { year: '2026', text: '60+ startups supported, a network of five associates' },
  ],
  teamTitle: 'Associates I bring in',
  team: [
    { name: 'Daniel Moreau', role: 'Compensation and equity', avatar: 1 },
    { name: 'Hana Sato', role: 'Talent acquisition', avatar: 0 },
    { name: 'Oliver Grant', role: 'Employment law partner', avatar: 3 },
    { name: 'Rui Costa', role: 'Learning and managers', avatar: 2 },
  ],
  credentials: ['CIPD Chartered Fellow', 'Certified executive coach', 'Guest lecturer on people strategy'],
}

export const AUDIT = {
  eyebrow: 'Free HR audit',
  title: 'Book your free HR audit',
  text: 'Forty-five minutes on video. We score twelve areas of your people operations and send you a short list of what to fix first.',
  steps: ['Your company', 'Focus areas', 'Pick a time'],
  includes: ['A score across twelve people areas', 'Your top three risks, in plain language', 'A suggested first 90 days', 'No pitch deck, no obligation'],
  timezoneNote: 'Times are shown in your time zone',
  noSlots: 'No times left on this day. Try another day.',
  loadingSlots: 'Loading available times',
  slotsError: 'Could not load times. Check your connection and try again.',
  retry: 'Try again',
  draftSaved: 'Draft saved on this device',
  successTitle: 'You’re booked in',
  successText: 'A calendar invite is on its way. Bring your org chart if you have one; we will do the rest.',
  addToCalendar: 'Add to calendar',
  cancel: 'Cancel booking',
  cancelled: 'Booking cancelled',
  bookAnother: 'Change time',
  existingTitle: 'Your booking',
}

export const FOOTER = {
  blurb: 'Fractional Head of People for startups and scaleups from 10 to 300 people.',
  columns: [
    { title: 'Services', links: [{ label: 'All services', to: '/services' }, { label: 'Ways to work together', to: '/services#plans' }, { label: '90-day plan', to: '/90-day-plan' }] },
    { title: 'Company', links: [{ label: 'About', to: '/about' }, { label: 'Case studies', to: '/case-studies' }, { label: 'Book a call', to: '/audit' }] },
    { title: 'Resources', links: [{ label: 'FAQ', to: '/#faq' }, { label: 'Style guide', to: '/styleguide' }] },
  ],
  newsletterTitle: 'The People Notes',
  newsletterText: 'One practical people idea for founders, every other Thursday.',
  newsletterButton: 'Subscribe',
  newsletterDone: 'You’re on the list. See you on Thursday.',
  legal: 'Peoplefirst Partners is a fictional company for this template.',
}

export const NOT_FOUND = {
  title: 'This page took a sabbatical',
  text: 'The page you are looking for has moved or never existed.',
  home: 'Back to home',
  audit: 'Book Free HR Audit',
}
