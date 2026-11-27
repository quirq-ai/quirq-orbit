// ==================================================================
// SITE CONTENT
// Everything editable lives here: copy, links, sections, items.
// Items marked `placeholder: true` are stand-ins until the real
// repositories, deliveries and posts are supplied.
// ==================================================================

import { REPOS } from './repos.js';
import { RESEARCH } from './research.js';
import { WRITING } from './writing.js';

export const CONFIG = {
  brand: 'quirq',
  // Where "Send" in the contact window drafts an email to. Confirm before launch.
  contactEmail: 'hello@quirq.dev',
  // A Cal.com / Calendly link. Empty = "Book a Call" opens the contact window.
  bookingUrl: '',
  // YouTube video id for the intro card. Empty = "coming soon" placeholder.
  introVideoId: '',
  socials: [
    { id: 'github', label: 'GitHub', url: 'https://github.com/quirq-ai' },
    { id: 'x', label: 'X', url: 'https://x.com/quirq_ai' },
    { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/company/quirqai' },
  ],
  eyebrow: 'Outcome-based software agency',
  heroLead: 'We sell',
  rotator: [
    'outcomes, not hours.',
    'fixed-price results.',
    'done, by checklist.',
    'signed-off software.',
  ],
  heroSub:
    'Pick a result, like customers tracking their orders online. We fix the price and the date up front, agents do the work, every checklist item is checked on a live preview, and a named engineer signs off before you see it.',
  builtFor: ['Founders', 'Operators', 'E-commerce', 'SaaS teams', 'Agencies'],
  stripLabel: 'The deal',
  strip: [
    'Fixed price', 'Fixed date', 'The checklist is the contract', 'Checks on a live preview',
    'Named engineer sign-off', 'Every question has a default', 'Silence accepts', 'quirq remembers', 'No hourly billing',
  ],
  leadTopics: ['A fixed-price result', 'Something custom', 'Not sure yet'],
};

export const SECTIONS = [
  // ----------------------------------------------------------------
  {
    id: 'work',
    label: 'Work',
    title: 'Work',
    color: '#4d8dff',
    icon: 'code',
    size: 0.62,
    intro:
      'Every public repository in github.com/quirq-ai, grouped the way quirq.dev groups them: what it is, how far it has come, a link to open it, and its README.',
    categories: [
      { id: 'live', label: 'Try it live', color: '#3ddc84', test: 'demo' },
      { id: 'products', label: 'Products', color: '#4d8dff' },
      { id: 'apps', label: 'Apps', color: '#8fb6ff' },
      { id: 'tools', label: 'Tools', color: '#5ec8ff' },
      { id: 'infra', label: 'qq infra', color: '#9fa8ff' },
      { id: 'knowledge', label: 'Knowledge', color: '#c4d6ff' },
      { id: 'other', label: 'Other', color: '#8693ad' },
    ],
    defaultCat: 'live', // open on the apps people can play with
    // Generated from GitHub (tools/import-quirq/repos.py). READMEs load from assets/readmes/.
    items: REPOS,
  },

  // ----------------------------------------------------------------
  {
    id: 'solutions',
    label: 'Solutions',
    title: 'Solutions',
    color: '#3ddbd9',
    icon: 'spark',
    size: 0.5,
    layout: 'tiles',
    intro: 'Results you can buy at a fixed price and date. Each one comes with the checklist that defines done.',
    items: [
      {
        slug: 'order-tracking', icon: 'cart', title: 'Order tracking', sub: 'Customers see where every order is',
        stack: ['Fixed price', 'Fixed date'],
        checks: ['Lookup by order number and email', 'Live status', 'Emails at every change', 'Works on phones'],
        body: ['Fewer "where is my order" emails. Customers check status themselves, and your team updates it in one place.'],
      },
      {
        slug: 'customer-portal', icon: 'portal', title: 'Customer portal', sub: 'Self-serve accounts, invoices and plans',
        stack: ['Fixed price', 'Fixed date'],
        checks: ['Email sign-in', 'Invoice downloads', 'Plan changes', 'Support requests in the portal'],
        body: ['Customers handle their own account. Support handles the questions that need a person.'],
      },
      {
        slug: 'subscriptions', icon: 'repeat', title: 'Subscribe and save', sub: 'Repeat orders on a schedule',
        stack: ['Fixed price', 'Fixed date'],
        checks: ['Subscribe from a product page', 'Choose and change frequency', 'One-click skip or cancel', 'Discount on every repeat'],
        body: ['Turn one-off buyers into regulars, with the controls customers expect.'],
      },
      {
        slug: 'booking', icon: 'calendar', title: 'Booking and scheduling', sub: 'Customers book, reschedule and get reminders',
        stack: ['Fixed price', 'Fixed date'],
        checks: ['Live availability', 'Reschedule without a call', 'Reminders before each booking', 'Staff calendar sync'],
        body: ['Bookings that run themselves, from the first slot to the reminder the day before.'],
      },
      {
        slug: 'reporting', icon: 'chart', title: 'Reporting dashboard', sub: 'The numbers you check, in one place',
        stack: ['Fixed price', 'Fixed date'],
        checks: ['Your sources connected', 'Daily refresh', 'Shareable links', 'Alerts when a number moves'],
        body: ['Stop assembling the weekly report by hand. Agree the numbers, and they arrive on their own.'],
      },
      {
        slug: 'integrations', icon: 'plug', title: 'Integrations', sub: 'Your tools talking to each other',
        stack: ['Fixed price', 'Fixed date'],
        checks: ['Agreed systems connected', 'Errors reported, never dropped', 'A log of every sync'],
        body: ['Connect the systems you already use, with a checklist that says exactly what moves where.'],
      },
      {
        slug: 'custom', icon: 'spark', title: 'Something else', sub: 'Describe the result, we scope the checklist',
        stack: ['Fixed price', 'Fixed date'],
        body: ['Not on the list? Describe the result you want. You get a prototype, a checklist, a price and a date before you commit to anything.'],
      },
    ],
  },

  // ----------------------------------------------------------------
  {
    id: 'process',
    label: 'Process',
    title: 'Process',
    color: '#a78bfa',
    icon: 'checklist',
    size: 0.48,
    layout: 'tiles',
    intro: 'Minutes, not meetings. You are needed at three moments; the rest runs without you.',
    items: [
      {
        slug: 'define', step: '01', title: 'Define', sub: 'About 30 minutes',
        stack: ['Prototype', 'Checklist', 'Price', 'Date'],
        body: ['You see a prototype, a checklist of what done means, a fixed price and a date. You edit the checklist, make one choice and approve. Nothing is charged before that.'],
      },
      {
        slug: 'build', step: '02', title: 'Build', sub: 'Agents work, checks run',
        stack: ['Agents', 'Live preview'],
        body: ['Agents do the work. Progress means checks passing on the live preview, never hours, effort or percent complete.'],
      },
      {
        slug: 'decide', step: '03', title: 'Decide', sub: 'A few minutes a week',
        stack: ['One question at a time'],
        body: ['One question at a time, with quirq’s pick and the date it applies if you don’t choose. Doing nothing is a valid answer.'],
      },
      {
        slug: 'sign-off', step: '04', title: 'Sign-off', sub: 'A named engineer checks it',
        stack: ['Named engineer'],
        body: ['Every item is checked against the agreed checklist, and a named engineer signs off before you see the delivery. Agents are never your contact.'],
      },
      {
        slug: 'accept', step: '05', title: 'Accept', sub: 'About 20 minutes',
        stack: ['Recording per item'],
        body: ['Watch a recording of the check for each checklist item. Accept it, or send items back one by one. A delivery is accepted automatically five working days after it’s ready.'],
      },
    ],
  },

  // ----------------------------------------------------------------
  // Research and Notes are generated from quirq.ai (js/research.js, js/writing.js).
  {
    id: 'research',
    label: 'Research',
    title: 'Research',
    color: '#ffb547',
    icon: 'lens',
    size: 0.46,
    intro: 'A unit of work for intelligence. Experiments, frameworks and field notes from the program behind quirq. Hypotheses ship with falsifiers; results land here as they land.',
    categories: [
      { id: 'speed-trials', label: 'Speed trials', color: '#ffb547' },
      { id: 'from-the-desk', label: 'From the desk', color: '#ffd88f' },
      { id: 'proving-grounds', label: 'Proving grounds', color: '#ff8f5e' },
    ],
    items: RESEARCH,
  },

  // ----------------------------------------------------------------
  {
    id: 'notes',
    label: 'Notes',
    title: 'Notes',
    color: '#ff7aa8',
    icon: 'doc',
    size: 0.44,
    intro: 'The paper, the findings argued, the unit of work explained in order, and the news as it happened.',
    categories: [
      { id: 'paper', label: 'The paper', color: '#ff7aa8' },
      { id: 'thoughts', label: 'Thoughts', color: '#ffa8c6' },
      { id: 'guides', label: 'Guides', color: '#d58bff' },
      { id: 'news', label: 'News', color: '#ff9a8a' },
    ],
    items: WRITING,
  },
];
