// Demo data so the app isn't empty on first run.
// Every company, person and email here is FICTIONAL.

import type { HubDB } from './types';

const now = new Date();
const daysFromNow = (d: number) =>
  new Date(now.getTime() + d * 86400000).toISOString().slice(0, 10);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

export function seedData(): HubDB {
  return {
    version: 1,
    users: [
      { email: 'priya.demo@gsb.columbia.edu', name: 'Priya S. (demo)', classYear: '2Y', createdAt: daysAgo(30) },
      { email: 'marcus.demo@gsb.columbia.edu', name: 'Marcus L. (demo)', classYear: '1Y', createdAt: daysAgo(30) },
      { email: 'elena.demo@gsb.columbia.edu', name: 'Elena R. (demo)', classYear: '2Y', createdAt: daysAgo(30) },
    ],
    clubs: [
      {
        id: 'vc',
        name: 'Venture Capital Club',
        description: 'Alumni-sourced roles at venture-backed startups and VC funds.',
        admins: ['priya.demo@gsb.columbia.edu'],
        members: ['marcus.demo@gsb.columbia.edu', 'elena.demo@gsb.columbia.edu'],
        pending: [],
      },
      {
        id: 'rlg',
        name: 'Retail & Luxury Goods Club',
        description: 'DTC, consumer and luxury brand opportunities shared by alumni.',
        admins: ['elena.demo@gsb.columbia.edu'],
        members: [],
        pending: [],
      },
      {
        id: 'tech',
        name: 'Technology Business Group',
        description: 'Product, strategy and BizOps roles at tech startups.',
        admins: ['marcus.demo@gsb.columbia.edu'],
        members: [],
        pending: [],
      },
    ],
    opportunities: [
      {
        id: 'o1',
        clubId: 'vc',
        company: 'Ledgerleaf',
        role: 'Chief of Staff to CEO',
        description:
          'Series A fintech automating accounts payable for mid-market companies. CEO looking for an MBA to run strategic projects and fundraising prep.',
        location: 'New York, NY (hybrid)',
        type: 'Full-time',
        audience: '2Y',
        howToApply: 'Email resume to the alum contact; mention the VC Club.',
        sourceContact: "Alum '14, Partner at a seed fund (fictional)",
        deadline: daysFromNow(14),
        postedBy: 'priya.demo@gsb.columbia.edu',
        postedAt: daysAgo(2),
      },
      {
        id: 'o2',
        clubId: 'vc',
        company: 'Brightwell Health',
        role: 'Spring In-Semester Strategy Intern',
        description: '10 hrs/week helping the founding team size a new employer-benefits market.',
        location: 'Remote',
        type: 'Part-time / In-semester',
        audience: 'all',
        howToApply: 'Apply via the founder’s form (link shared in club email).',
        sourceContact: "Founder, CBS '19 (fictional)",
        deadline: daysFromNow(21),
        postedBy: 'priya.demo@gsb.columbia.edu',
        postedAt: daysAgo(5),
      },
      {
        id: 'o3',
        clubId: 'rlg',
        company: 'Maison Ondine',
        role: 'Summer MBA Associate, Growth',
        description: 'DTC fragrance brand post-seed; owning retention and wholesale expansion analysis.',
        location: 'New York, NY',
        type: 'Internship',
        audience: '1Y',
        howToApply: 'Send a short note + resume to the club officer, who will forward.',
        sourceContact: "Alum '17, COO (fictional)",
        postedBy: 'elena.demo@gsb.columbia.edu',
        postedAt: daysAgo(1),
      },
    ],
    startups: [
      {
        id: 's1',
        name: 'Ledgerleaf',
        website: 'https://example.com/ledgerleaf',
        sector: 'Fintech',
        stage: 'Series A',
        location: 'New York, NY',
        description: 'AP automation for mid-market finance teams.',
        hiring: true,
        hiringNotes: 'Chief of Staff + BizOps. Founder likes MBAs with ops backgrounds.',
        connections: [
          {
            id: 'c1',
            email: 'marcus.demo@gsb.columbia.edu',
            name: 'Marcus L. (demo)',
            relationship: 'Worked there before MBA',
            detail: 'Senior Analyst, BizOps, 2021-2024',
            openToIntros: true,
            addedAt: daysAgo(20),
          },
        ],
        addedBy: 'marcus.demo@gsb.columbia.edu',
        addedAt: daysAgo(20),
      },
      {
        id: 's2',
        name: 'Fieldnote AI',
        website: 'https://example.com/fieldnote',
        sector: 'Enterprise SaaS / AI',
        stage: 'Seed',
        location: 'San Francisco, CA',
        description: 'AI note-taking for field sales reps.',
        hiring: true,
        hiringNotes: 'First GTM hire; open to a summer MBA intern.',
        connections: [
          {
            id: 'c2',
            email: 'elena.demo@gsb.columbia.edu',
            name: 'Elena R. (demo)',
            relationship: 'Friend of founder',
            detail: 'College roommate of the CEO',
            openToIntros: true,
            addedAt: daysAgo(10),
          },
        ],
        addedBy: 'elena.demo@gsb.columbia.edu',
        addedAt: daysAgo(10),
      },
      {
        id: 's3',
        name: 'Harbor & Pine',
        website: 'https://example.com/harborpine',
        sector: 'Consumer / DTC',
        stage: 'Series B',
        location: 'Brooklyn, NY',
        description: 'Sustainable home goods brand.',
        hiring: false,
        hiringNotes: '',
        connections: [
          {
            id: 'c3',
            email: 'priya.demo@gsb.columbia.edu',
            name: 'Priya S. (demo)',
            relationship: 'Worked there before MBA',
            detail: 'Merchandising Manager, 2019-2023',
            openToIntros: false,
            addedAt: daysAgo(25),
          },
        ],
        addedBy: 'priya.demo@gsb.columbia.edu',
        addedAt: daysAgo(25),
      },
    ],
    intros: [],
  };
}
