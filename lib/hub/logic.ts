// All permission rules live here, server-side. The browser only ever receives
// what buildState() decides the signed-in user is allowed to see.

import { newId, storageMode } from './store';
import type {
  Audience,
  ClassYear,
  Club,
  ClubView,
  HubDB,
  HubState,
  IntroView,
  Opportunity,
  OpportunityView,
  Relationship,
  StartupView,
} from './types';

const norm = (s: string) => s.trim().toLowerCase();
const normCompany = (s: string) => norm(s).replace(/[^a-z0-9]/g, '');

export function isSuperAdmin(email: string): boolean {
  const list = (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map(norm)
    .filter(Boolean);
  // Local dev convenience: with no super admins configured, everyone is one.
  if (list.length === 0) return process.env.NODE_ENV !== 'production';
  return list.includes(norm(email));
}

function clubStatus(club: Club, email: string): ClubView['status'] {
  const e = norm(email);
  if (club.admins.map(norm).includes(e)) return 'admin';
  if (club.members.map(norm).includes(e)) return 'member';
  if (club.pending.map(norm).includes(e)) return 'pending';
  return 'none';
}

const canManage = (club: Club, email: string) =>
  clubStatus(club, email) === 'admin' || isSuperAdmin(email);

const isMember = (club: Club, email: string) =>
  ['admin', 'member'].includes(clubStatus(club, email));

function audienceAllows(audience: Audience, year: ClassYear | undefined) {
  if (audience === 'all') return true;
  return audience === year;
}

export function buildState(db: HubDB, email: string): HubState {
  const me = db.users.find((u) => norm(u.email) === norm(email)) || null;
  const nameOf = (e: string) =>
    db.users.find((u) => norm(u.email) === norm(e))?.name || e.split('@')[0];
  const superAdmin = isSuperAdmin(email);

  const clubs: ClubView[] = db.clubs.map((c) => {
    const status = clubStatus(c, email);
    const manage = canManage(c, email);
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      memberCount: new Set([...c.admins, ...c.members].map(norm)).size,
      status,
      ...(manage ? { members: c.members, pending: c.pending, admins: c.admins } : {}),
    };
  });

  const startupByCompany = new Map(db.startups.map((s) => [normCompany(s.name), s]));
  const today = new Date().toISOString().slice(0, 10);

  const opportunities: OpportunityView[] = db.opportunities
    .filter((o) => {
      const club = db.clubs.find((c) => c.id === o.clubId);
      if (!club) return false;
      // Platform admins can manage any club but only *see* postings of clubs they belong to.
      if (clubStatus(club, email) === 'admin') return true; // officers see all of their club's posts
      if (!isMember(club, email)) return false;
      if (o.deadline && o.deadline < today) return false;
      return audienceAllows(o.audience, me?.classYear);
    })
    .map((o) => {
      const club = db.clubs.find((c) => c.id === o.clubId)!;
      const match = startupByCompany.get(normCompany(o.company));
      return {
        ...o,
        clubName: club.name,
        canDelete: canManage(club, email) || norm(o.postedBy) === norm(email),
        matchedStartupId: match?.id,
        connectionCount: match?.connections.length || 0,
      };
    })
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));

  // Startup directory is visible to every verified student.
  // Connection emails are never sent to the browser.
  const startups: StartupView[] = db.startups
    .map((s) => ({
      id: s.id,
      name: s.name,
      website: s.website,
      sector: s.sector,
      stage: s.stage,
      location: s.location,
      description: s.description,
      hiring: s.hiring,
      hiringNotes: s.hiringNotes,
      addedAt: s.addedAt,
      addedByMe: norm(s.addedBy) === norm(email),
      connections: s.connections.map((c) => ({
        id: c.id,
        name: c.name,
        classYear: db.users.find((u) => norm(u.email) === norm(c.email))?.classYear,
        relationship: c.relationship,
        detail: c.detail,
        openToIntros: c.openToIntros,
        isMe: norm(c.email) === norm(email),
      })),
    }))
    .sort((a, b) => Number(b.hiring) - Number(a.hiring) || a.name.localeCompare(b.name));

  const intros: IntroView[] = db.intros
    .filter((i) => norm(i.fromEmail) === norm(email) || norm(i.toEmail) === norm(email))
    .map((i) => {
      const incoming = norm(i.toEmail) === norm(email);
      const other = incoming ? i.fromEmail : i.toEmail;
      return {
        id: i.id,
        startupId: i.startupId,
        startupName: db.startups.find((s) => s.id === i.startupId)?.name || 'Unknown',
        direction: (incoming ? 'incoming' : 'outgoing') as IntroView['direction'],
        otherName: nameOf(other),
        // Emails are exchanged only after the connector accepts.
        otherEmail: i.status === 'accepted' ? other : undefined,
        message: i.message,
        status: i.status,
        createdAt: i.createdAt,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    me,
    email,
    isSuperAdmin: superAdmin,
    clubs,
    opportunities,
    startups,
    intros,
    storage: storageMode(),
    llmEnabled: !!process.env.OPENAI_API_KEY,
  };
}

// ---------------------------------------------------------------------------
// Mutations. Each returns an error string, or null on success.
// ---------------------------------------------------------------------------

type Body = Record<string, unknown>;
const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const emailList = (v: unknown) =>
  str(v, 20000)
    .split(/[\s,;]+/)
    .map(norm)
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));

const CLASS_YEARS: ClassYear[] = ['1Y', '2Y', 'EMBA', 'Alumni'];
const AUDIENCES: Audience[] = ['all', '1Y', '2Y'];
const OPP_TYPES: Opportunity['type'][] = ['Full-time', 'Internship', 'Part-time / In-semester', 'Other'];
const RELATIONSHIPS: Relationship[] = [
  'Worked there before MBA',
  'Friend of founder',
  'Investor / advisor',
  'Interned there',
  'Other',
];

export function applyAction(db: HubDB, email: string, body: Body): string | null {
  const action = str(body.action);
  const now = new Date().toISOString();
  const me = db.users.find((u) => norm(u.email) === norm(email));

  if (action === 'saveProfile') {
    const name = str(body.name, 100);
    const classYear = body.classYear as ClassYear;
    if (!name || !CLASS_YEARS.includes(classYear)) return 'Name and class year are required.';
    if (me) Object.assign(me, { name, classYear });
    else db.users.push({ email: norm(email), name, classYear, createdAt: now });
    return null;
  }

  if (!me) return 'Please complete your profile first.';

  const club = db.clubs.find((c) => c.id === body.clubId);

  switch (action) {
    case 'createClub': {
      if (!isSuperAdmin(email)) return 'Only platform admins can create clubs.';
      const name = str(body.name, 100);
      if (!name) return 'Club name is required.';
      db.clubs.push({
        id: newId(),
        name,
        description: str(body.description, 500),
        admins: emailList(body.admins),
        members: [],
        pending: [],
      });
      return null;
    }

    case 'requestJoin': {
      if (!club) return 'Club not found.';
      if (clubStatus(club, email) !== 'none') return null;
      club.pending.push(norm(email));
      return null;
    }

    case 'leaveClub': {
      if (!club) return 'Club not found.';
      const e = norm(email);
      club.members = club.members.filter((m) => norm(m) !== e);
      club.pending = club.pending.filter((m) => norm(m) !== e);
      return null;
    }

    case 'approveMember':
    case 'rejectMember':
    case 'removeMember': {
      if (!club || !canManage(club, email)) return 'Not allowed.';
      const target = norm(str(body.email));
      club.pending = club.pending.filter((m) => norm(m) !== target);
      if (action === 'approveMember' && !club.members.map(norm).includes(target))
        club.members.push(target);
      if (action === 'removeMember') club.members = club.members.filter((m) => norm(m) !== target);
      return null;
    }

    case 'addMembers': {
      // Officers paste their existing roster (e.g. from CampusGroups export).
      if (!club || !canManage(club, email)) return 'Not allowed.';
      const emails = emailList(body.emails);
      if (!emails.length) return 'No valid emails found.';
      const existing = new Set(club.members.map(norm));
      emails.forEach((e) => !existing.has(e) && club.members.push(e));
      club.pending = club.pending.filter((p) => !emails.includes(norm(p)));
      return null;
    }

    case 'addAdmin': {
      if (!club || !canManage(club, email)) return 'Not allowed.';
      const target = norm(str(body.email));
      if (!target.includes('@')) return 'Valid email required.';
      if (!club.admins.map(norm).includes(target)) club.admins.push(target);
      return null;
    }

    case 'postOpportunity': {
      if (!club || !canManage(club, email)) return 'Only club officers can post to this club.';
      const company = str(body.company, 150);
      const role = str(body.role, 150);
      if (!company || !role) return 'Company and role are required.';
      db.opportunities.push({
        id: newId(),
        clubId: club.id,
        company,
        role,
        description: str(body.description),
        location: str(body.location, 150),
        type: OPP_TYPES.includes(body.type as Opportunity['type'])
          ? (body.type as Opportunity['type'])
          : 'Other',
        audience: AUDIENCES.includes(body.audience as Audience) ? (body.audience as Audience) : 'all',
        howToApply: str(body.howToApply, 1000),
        sourceContact: str(body.sourceContact, 200),
        deadline: /^\d{4}-\d{2}-\d{2}$/.test(str(body.deadline)) ? str(body.deadline) : undefined,
        postedBy: norm(email),
        postedAt: now,
      });
      return null;
    }

    case 'deleteOpportunity': {
      const opp = db.opportunities.find((o) => o.id === body.id);
      if (!opp) return 'Not found.';
      const oc = db.clubs.find((c) => c.id === opp.clubId);
      if (!(oc && canManage(oc, email)) && norm(opp.postedBy) !== norm(email)) return 'Not allowed.';
      db.opportunities = db.opportunities.filter((o) => o.id !== opp.id);
      return null;
    }

    case 'addStartup': {
      // Adds a startup AND the current user's connection to it. If the startup
      // already exists (same normalized name), only the connection is added.
      const name = str(body.name, 150);
      if (!name) return 'Startup name is required.';
      const relationship = body.relationship as Relationship;
      if (!RELATIONSHIPS.includes(relationship)) return 'Pick how you know this startup.';
      let s = db.startups.find((x) => normCompany(x.name) === normCompany(name));
      if (!s) {
        s = {
          id: newId(),
          name,
          website: str(body.website, 300),
          sector: str(body.sector, 100),
          stage: str(body.stage, 50),
          location: str(body.location, 150),
          description: str(body.description, 1000),
          hiring: !!body.hiring,
          hiringNotes: str(body.hiringNotes, 1000),
          connections: [],
          addedBy: norm(email),
          addedAt: now,
        };
        db.startups.push(s);
      } else if (body.hiring) {
        s.hiring = true;
        if (str(body.hiringNotes)) s.hiringNotes = str(body.hiringNotes, 1000);
      }
      s.connections = s.connections.filter((c) => norm(c.email) !== norm(email));
      s.connections.push({
        id: newId(),
        email: norm(email),
        name: me.name,
        relationship,
        detail: str(body.detail, 200),
        openToIntros: body.openToIntros !== false,
        addedAt: now,
      });
      return null;
    }

    case 'updateHiring': {
      const s = db.startups.find((x) => x.id === body.startupId);
      if (!s) return 'Not found.';
      const connected = s.connections.some((c) => norm(c.email) === norm(email));
      if (!connected && !isSuperAdmin(email)) return 'Only connected students can update hiring status.';
      s.hiring = !!body.hiring;
      s.hiringNotes = str(body.hiringNotes, 1000);
      return null;
    }

    case 'removeMyConnection': {
      const s = db.startups.find((x) => x.id === body.startupId);
      if (!s) return 'Not found.';
      s.connections = s.connections.filter((c) => norm(c.email) !== norm(email));
      return null;
    }

    case 'requestIntro': {
      const s = db.startups.find((x) => x.id === body.startupId);
      const conn = s?.connections.find((c) => c.id === body.connectionId);
      if (!s || !conn) return 'Connection not found.';
      if (!conn.openToIntros) return 'This classmate is not taking intro requests.';
      if (norm(conn.email) === norm(email)) return 'That is you.';
      const message = str(body.message, 1500);
      if (message.length < 20) return 'Add a short note (20+ characters) on why you are interested.';
      const dup = db.intros.find(
        (i) =>
          i.connectionId === conn.id && norm(i.fromEmail) === norm(email) && i.status === 'pending'
      );
      if (dup) return 'You already have a pending request with this classmate.';
      db.intros.push({
        id: newId(),
        startupId: s.id,
        connectionId: conn.id,
        fromEmail: norm(email),
        toEmail: norm(conn.email),
        message,
        status: 'pending',
        createdAt: now,
      });
      return null;
    }

    case 'respondIntro': {
      const intro = db.intros.find((i) => i.id === body.id);
      if (!intro || norm(intro.toEmail) !== norm(email)) return 'Not found.';
      intro.status = body.accept ? 'accepted' : 'declined';
      intro.respondedAt = now;
      return null;
    }

    default:
      return `Unknown action: ${action}`;
  }
}
