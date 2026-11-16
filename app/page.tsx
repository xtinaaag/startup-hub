'use client';

import type {
  ClassYear,
  ClubView,
  HubState,
  OpportunityView,
  Relationship,
  StartupView,
} from '@/lib/hub/types';
import {
  Briefcase,
  Building2,
  Handshake,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, btnGhost, btnPrimary, Empty, Field, inputCls, Modal } from './ui';

type Tab = 'opps' | 'directory' | 'intros' | 'clubs';
type Act = (body: Record<string, unknown>) => Promise<boolean>;

export default function StartupHub() {
  const [state, setState] = useState<HubState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [tab, setTab] = useState<Tab>('opps');
  const [directoryQuery, setDirectoryQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/hub', { cache: 'no-store' }).then(async (res) => {
      if (cancelled) return;
      if (res.status === 401) return setAuthError(true);
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to load');
      setState(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const act: Act = useCallback(async (body) => {
    setError(null);
    const res = await fetch('/api/hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Something went wrong');
      return false;
    }
    setState(data);
    return true;
  }, []);

  if (authError)
    return (
      <Centered>
        <p className="text-slate-700 mb-4">The Startup Hub needs you to sign in with your school email.</p>
        <button className={btnPrimary} onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
          Sign in again
        </button>
      </Centered>
    );
  if (!state) return <Centered>Loading…</Centered>;
  if (!state.me) return <ProfileSetup email={state.email} act={act} error={error} />;

  const pendingIncoming = state.intros.filter((i) => i.direction === 'incoming' && i.status === 'pending').length;
  const myClubs = state.clubs.filter((c) => c.status === 'admin' || c.status === 'member');
  const tabs: { id: Tab; label: string; icon: typeof Briefcase; count?: number }[] = [
    { id: 'opps', label: 'Club Opportunities', icon: Briefcase, count: state.opportunities.length },
    { id: 'directory', label: 'Startup Directory', icon: Building2, count: state.startups.length },
    { id: 'intros', label: 'Warm Intros', icon: Handshake, count: pendingIncoming || undefined },
    { id: 'clubs', label: 'My Clubs', icon: Users, count: myClubs.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-800">Startup Hub</h1>
            <p className="text-xs text-slate-500 truncate">
              Club-shared startup roles + classmates who can make a warm intro
            </p>
          </div>
          <div className="hidden sm:block text-right text-xs">
            <div className="font-medium text-slate-700">{state.me.name}</div>
            <div className="text-slate-400">
              {state.me.classYear} · {state.email}
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} className="p-2 hover:bg-slate-100 rounded-lg" title="Sign out">
            <LogOut className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 whitespace-nowrap ${
                tab === t.id ? 'border-columbia-600 text-columbia-700 font-medium' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.count !== undefined && <span className="text-xs bg-slate-100 rounded-full px-1.5">{t.count}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {state.isSuperAdmin && state.storage === 'file' && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Dev mode: data is stored in <code>.data/startup-hub.json</code> and you are a platform admin (set
            SUPER_ADMIN_EMAILS to restrict). Seeded companies and people are fictional.
          </p>
        )}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 flex justify-between">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {tab === 'opps' && (
          <OpportunitiesTab
            state={state}
            act={act}
            onSeeConnections={(name) => {
              setDirectoryQuery(name);
              setTab('directory');
            }}
            goToClubs={() => setTab('clubs')}
          />
        )}
        {tab === 'directory' && <DirectoryTab state={state} act={act} query={directoryQuery} setQuery={setDirectoryQuery} />}
        {tab === 'intros' && <IntrosTab state={state} act={act} />}
        {tab === 'clubs' && <ClubsTab state={state} act={act} />}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-sm text-slate-500">{children}</div>;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

function ProfileSetup({ email, act, error }: { email: string; act: Act; error: string | null }) {
  const [name, setName] = useState('');
  const [classYear, setClassYear] = useState<ClassYear>('1Y');
  return (
    <Centered>
      <form
        className="bg-white rounded-2xl shadow p-6 w-full max-w-sm space-y-4 text-left"
        onSubmit={(e) => {
          e.preventDefault();
          act({ action: 'saveProfile', name, classYear });
        }}
      >
        <h1 className="text-lg font-semibold text-slate-800">Welcome to the Startup Hub</h1>
        <p className="text-xs text-slate-500">Signed in as {email}. Your class year controls which club postings you can see.</p>
        <Field label="Name (shown to classmates)">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Class year">
          <select className={inputCls} value={classYear} onChange={(e) => setClassYear(e.target.value as ClassYear)}>
            <option value="1Y">First-year (1Y)</option>
            <option value="2Y">Second-year (2Y)</option>
            <option value="EMBA">EMBA</option>
            <option value="Alumni">Alumni</option>
          </select>
        </Field>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button className={`${btnPrimary} w-full`}>Continue</button>
      </form>
    </Centered>
  );
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

function OpportunitiesTab({
  state,
  act,
  onSeeConnections,
  goToClubs,
}: {
  state: HubState;
  act: Act;
  onSeeConnections: (company: string) => void;
  goToClubs: () => void;
}) {
  const [q, setQ] = useState('');
  const [club, setClub] = useState('');
  const [type, setType] = useState('');
  const [posting, setPosting] = useState(false);
  const adminClubs = state.clubs.filter((c) => !!c.members); // clubs I can manage
  const myClubs = state.clubs.filter((c) => c.status === 'admin' || c.status === 'member');

  const list = state.opportunities.filter(
    (o) =>
      (!club || o.clubId === club) &&
      (!type || o.type === type) &&
      (!q || `${o.company} ${o.role} ${o.description} ${o.location}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search company, role, location…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={`${inputCls} !w-auto`} value={club} onChange={(e) => setClub(e.target.value)}>
          <option value="">All my clubs</option>
          {myClubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={`${inputCls} !w-auto`} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Any type</option>
          {['Full-time', 'Internship', 'Part-time / In-semester', 'Other'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        {adminClubs.length > 0 && (
          <button className={`${btnPrimary} flex items-center gap-1`} onClick={() => setPosting(true)}>
            <Plus className="w-4 h-4" /> Post
          </button>
        )}
      </div>

      {myClubs.length === 0 ? (
        <Empty>
          You&apos;re not a verified member of any club yet.{' '}
          <button className="text-columbia-600 underline" onClick={goToClubs}>
            Request to join clubs
          </button>{' '}
          to see the startup roles their alumni share.
        </Empty>
      ) : list.length === 0 ? (
        <Empty>No open opportunities match. Postings disappear after their deadline.</Empty>
      ) : (
        list.map((o) => <OpportunityCard key={o.id} o={o} act={act} onSeeConnections={onSeeConnections} />)
      )}

      {posting && <PostOpportunityModal clubs={adminClubs} llmEnabled={state.llmEnabled} act={act} onClose={() => setPosting(false)} />}
    </div>
  );
}

function OpportunityCard({ o, act, onSeeConnections }: { o: OpportunityView; act: Act; onSeeConnections: (c: string) => void }) {
  const audienceLabel = { all: 'All members', '1Y': '1Ys only', '2Y': '2Ys only' }[o.audience];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex flex-wrap items-start gap-2 justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">
            {o.role} · <span className="text-columbia-700">{o.company}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {o.location || 'Location n/a'} · posted {new Date(o.postedAt).toLocaleDateString()}
            {o.deadline && <> · apply by {o.deadline}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge tone="blue">{o.clubName}</Badge>
          <Badge>{o.type}</Badge>
          {o.audience !== 'all' && <Badge tone="amber">{audienceLabel}</Badge>}
        </div>
      </div>
      {o.description && <p className="text-sm text-slate-700 mt-3 whitespace-pre-line">{o.description}</p>}
      <div className="text-sm mt-3 space-y-1">
        {o.howToApply && (
          <p>
            <span className="text-slate-500">How to apply:</span> <Linkify text={o.howToApply} />
          </p>
        )}
        {o.sourceContact && (
          <p>
            <span className="text-slate-500">Shared by:</span> {o.sourceContact}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {o.connectionCount > 0 && (
          <button onClick={() => onSeeConnections(o.company)} className="text-xs">
            <Badge tone="green">
              <Handshake className="w-3 h-3" /> {o.connectionCount} classmate{o.connectionCount > 1 ? 's' : ''} know{o.connectionCount > 1 ? '' : 's'} this company →
            </Badge>
          </button>
        )}
        {o.canDelete && (
          <button
            className="ml-auto text-xs text-red-600 hover:underline"
            onClick={() => confirm('Delete this posting?') && act({ action: 'deleteOpportunity', id: o.id })}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className="text-columbia-600 underline break-all">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

const emptyOpp = {
  company: '',
  role: '',
  description: '',
  location: '',
  type: 'Full-time',
  audience: 'all',
  howToApply: '',
  sourceContact: '',
  deadline: '',
};

function PostOpportunityModal({ clubs, llmEnabled, act, onClose }: { clubs: ClubView[]; llmEnabled: boolean; act: Act; onClose: () => void }) {
  const [clubId, setClubId] = useState(clubs[0]?.id || '');
  const [f, setF] = useState(emptyOpp);
  const [blast, setBlast] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseErr, setParseErr] = useState('');
  const set = (k: keyof typeof emptyOpp) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const autofill = async () => {
    setParsing(true);
    setParseErr('');
    const res = await fetch('/api/hub/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: blast }),
    });
    const data = await res.json();
    setParsing(false);
    if (!res.ok) return setParseErr(data.error);
    setF((prev) => {
      const next = { ...prev };
      (Object.keys(emptyOpp) as (keyof typeof emptyOpp)[]).forEach((k) => {
        if (typeof data[k] === 'string' && data[k]) next[k] = data[k];
      });
      return next;
    });
  };

  return (
    <Modal title="Post a club opportunity" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act({ action: 'postOpportunity', clubId, ...f })) onClose();
        }}
      >
        {llmEnabled && (
          <div className="bg-columbia-50 border border-columbia-100 rounded-lg p-3 space-y-2">
            <p className="text-xs text-columbia-800 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Paste the alum&apos;s email to auto-fill (review before posting)
            </p>
            <textarea className={inputCls} rows={3} value={blast} onChange={(e) => setBlast(e.target.value)} placeholder="Hi VC Club, one of our portfolio companies is hiring…" />
            <button type="button" className={btnGhost} disabled={parsing || blast.length < 30} onClick={autofill}>
              {parsing ? 'Reading…' : 'Auto-fill fields'}
            </button>
            {parseErr && <p className="text-xs text-red-600">{parseErr}</p>}
          </div>
        )}
        <Field label="Club">
          <select className={inputCls} value={clubId} onChange={(e) => setClubId(e.target.value)}>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company *">
            <input className={inputCls} value={f.company} onChange={set('company')} required />
          </Field>
          <Field label="Role *">
            <input className={inputCls} value={f.role} onChange={set('role')} required />
          </Field>
          <Field label="Type">
            <select className={inputCls} value={f.type} onChange={set('type')}>
              {['Full-time', 'Internship', 'Part-time / In-semester', 'Other'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Who can see it">
            <select className={inputCls} value={f.audience} onChange={set('audience')}>
              <option value="all">All club members</option>
              <option value="1Y">1Y members only</option>
              <option value="2Y">2Y members only</option>
            </select>
          </Field>
          <Field label="Location">
            <input className={inputCls} value={f.location} onChange={set('location')} />
          </Field>
          <Field label="Deadline" hint="Hidden from members after this date">
            <input type="date" className={inputCls} value={f.deadline} onChange={set('deadline')} />
          </Field>
        </div>
        <Field label="Description">
          <textarea className={inputCls} rows={3} value={f.description} onChange={set('description')} />
        </Field>
        <Field label="How to apply">
          <input className={inputCls} value={f.howToApply} onChange={set('howToApply')} placeholder="Link, email, or 'reply to officer'" />
        </Field>
        <Field label="Shared by (alum / source)">
          <input className={inputCls} value={f.sourceContact} onChange={set('sourceContact')} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button className={btnPrimary}>Post to club</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Startup directory
// ---------------------------------------------------------------------------

const RELATIONSHIPS: Relationship[] = ['Worked there before MBA', 'Interned there', 'Friend of founder', 'Investor / advisor', 'Other'];

function DirectoryTab({ state, act, query, setQuery }: { state: HubState; act: Act; query: string; setQuery: (q: string) => void }) {
  const [hiringOnly, setHiringOnly] = useState(false);
  const [sector, setSector] = useState('');
  const [adding, setAdding] = useState<string | null>(null); // prefilled startup name, '' = new
  const [introFor, setIntroFor] = useState<{ s: StartupView; connId: string } | null>(null);

  const sectors = useMemo(() => Array.from(new Set(state.startups.map((s) => s.sector).filter(Boolean))).sort(), [state.startups]);
  const list = state.startups.filter(
    (s) =>
      (!hiringOnly || s.hiring) &&
      (!sector || s.sector === sector) &&
      (!query || `${s.name} ${s.sector} ${s.description} ${s.location}`.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Startups classmates have worked at or know well. Every entry is vouched for by at least one verified student — request a warm intro
        instead of a cold application.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search startups…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={`${inputCls} !w-auto`} value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={hiringOnly} onChange={(e) => setHiringOnly(e.target.checked)} /> Hiring now
        </label>
        <button className={`${btnPrimary} flex items-center gap-1`} onClick={() => setAdding('')}>
          <Plus className="w-4 h-4" /> Add a startup I know
        </button>
      </div>

      {list.length === 0 ? (
        <Empty>No startups match. Know one? Add it — your prior employer counts.</Empty>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((s) => (
            <StartupCard key={s.id} s={s} act={act} onIntro={(connId) => setIntroFor({ s, connId })} onAddMe={() => setAdding(s.name)} />
          ))}
        </div>
      )}

      {adding !== null && <AddStartupModal initialName={adding} act={act} onClose={() => setAdding(null)} />}
      {introFor && <IntroModal s={introFor.s} connId={introFor.connId} act={act} onClose={() => setIntroFor(null)} />}
    </div>
  );
}

function StartupCard({ s, act, onIntro, onAddMe }: { s: StartupView; act: Act; onIntro: (connId: string) => void; onAddMe: () => void }) {
  const mine = s.connections.find((c) => c.isMe);
  const [editHiring, setEditHiring] = useState(false);
  const [notes, setNotes] = useState(s.hiringNotes);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800">
            {s.website ? (
              <a href={s.website} target="_blank" rel="noreferrer" className="hover:underline">
                {s.name}
              </a>
            ) : (
              s.name
            )}
          </h3>
          <p className="text-xs text-slate-500">{[s.sector, s.stage, s.location].filter(Boolean).join(' · ')}</p>
        </div>
        {s.hiring && <Badge tone="green">Hiring</Badge>}
      </div>
      {s.description && <p className="text-sm text-slate-700 mt-2">{s.description}</p>}
      {s.hiring && s.hiringNotes && <p className="text-xs text-emerald-800 bg-emerald-50 rounded p-2 mt-2">{s.hiringNotes}</p>}

      <div className="mt-3 space-y-2 flex-1">
        {s.connections.map((c) => (
          <div key={c.id} className="flex items-center gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-slate-700">{c.name}</span>
              {c.classYear && <span className="text-xs text-slate-400"> · {c.classYear}</span>}
              <div className="text-xs text-slate-500 truncate">
                {c.relationship}
                {c.detail && ` — ${c.detail}`}
              </div>
            </div>
            {c.isMe ? (
              <Badge tone="purple">You</Badge>
            ) : c.openToIntros ? (
              <button className={btnGhost} onClick={() => onIntro(c.id)}>
                Request intro
              </button>
            ) : (
              <span className="text-xs text-slate-400">Not taking intros</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
        {!mine && (
          <button className="text-columbia-600 hover:underline" onClick={onAddMe}>
            I know this company too
          </button>
        )}
        {mine && !editHiring && (
          <>
            <button className="text-columbia-600 hover:underline" onClick={() => setEditHiring(true)}>
              Update hiring status
            </button>
            <button
              className="text-slate-500 hover:underline"
              onClick={() => confirm('Remove yourself as a connection?') && act({ action: 'removeMyConnection', startupId: s.id })}
            >
              Remove me
            </button>
          </>
        )}
      </div>
      {editHiring && (
        <div className="mt-2 space-y-2">
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What roles? Who to talk to?" />
          <div className="flex gap-2">
            <button className={btnPrimary} onClick={async () => (await act({ action: 'updateHiring', startupId: s.id, hiring: true, hiringNotes: notes })) && setEditHiring(false)}>
              Mark hiring
            </button>
            <button className={btnGhost} onClick={async () => (await act({ action: 'updateHiring', startupId: s.id, hiring: false, hiringNotes: '' })) && setEditHiring(false)}>
              Not hiring
            </button>
            <button className="text-xs text-slate-500" onClick={() => setEditHiring(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddStartupModal({ initialName, act, onClose }: { initialName: string; act: Act; onClose: () => void }) {
  const existing = !!initialName;
  const [f, setF] = useState({
    name: initialName,
    website: '',
    sector: '',
    stage: '',
    location: '',
    description: '',
    relationship: 'Worked there before MBA' as Relationship,
    detail: '',
    openToIntros: true,
    hiring: false,
    hiringNotes: '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <Modal title={existing ? `Add your connection to ${initialName}` : 'Add a startup you know'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act({ action: 'addStartup', ...f })) onClose();
        }}
      >
        {!existing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Startup name *">
              <input className={inputCls} value={f.name} onChange={set('name')} required />
            </Field>
            <Field label="Website">
              <input className={inputCls} value={f.website} onChange={set('website')} placeholder="https://" />
            </Field>
            <Field label="Sector">
              <input className={inputCls} value={f.sector} onChange={set('sector')} placeholder="Fintech, Consumer…" />
            </Field>
            <Field label="Stage">
              <select className={inputCls} value={f.stage} onChange={set('stage')}>
                <option value="">Unknown</option>
                {['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Bootstrapped'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <input className={inputCls} value={f.location} onChange={set('location')} />
            </Field>
            <Field label="One-liner">
              <input className={inputCls} value={f.description} onChange={set('description')} />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="How do you know it? *">
            <select className={inputCls} value={f.relationship} onChange={set('relationship')}>
              {RELATIONSHIPS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Detail">
            <input className={inputCls} value={f.detail} onChange={set('detail')} placeholder="e.g. PM, 2020–2023" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={f.openToIntros} onChange={(e) => setF({ ...f, openToIntros: e.target.checked })} />
          Classmates can request a warm intro through me
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={f.hiring} onChange={(e) => setF({ ...f, hiring: e.target.checked })} />I know they&apos;re hiring right now
        </label>
        {f.hiring && (
          <Field label="Hiring notes">
            <textarea className={inputCls} rows={2} value={f.hiringNotes} onChange={set('hiringNotes')} placeholder="Roles, timing, who to talk to" />
          </Field>
        )}
        <p className="text-xs text-slate-400">Your name and relationship are visible to signed-in students. Your email is only shared when you accept an intro.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button className={btnPrimary}>Save</button>
        </div>
      </form>
    </Modal>
  );
}

function IntroModal({ s, connId, act, onClose }: { s: StartupView; connId: string; act: Act; onClose: () => void }) {
  const conn = s.connections.find((c) => c.id === connId)!;
  const [message, setMessage] = useState('');
  return (
    <Modal title={`Ask ${conn.name} about ${s.name}`} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act({ action: 'requestIntro', startupId: s.id, connectionId: connId, message })) onClose();
        }}
      >
        <p className="text-sm text-slate-600">
          {conn.name} ({conn.relationship.toLowerCase()}) will see your note and can accept or decline. If they accept, you&apos;ll both see each
          other&apos;s email.
        </p>
        <textarea
          className={inputCls}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Who you are, what role you're interested in, and what you'd like (a quick chat about the team? a referral?)"
          required
        />
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button className={btnPrimary}>Send request</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Intros
// ---------------------------------------------------------------------------

function IntrosTab({ state, act }: { state: HubState; act: Act }) {
  const incoming = state.intros.filter((i) => i.direction === 'incoming');
  const outgoing = state.intros.filter((i) => i.direction === 'outgoing');
  const tone = { pending: 'amber', accepted: 'green', declined: 'slate' } as const;

  const Row = ({ i }: { i: (typeof state.intros)[number] }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex justify-between gap-2">
        <p className="text-sm">
          {i.direction === 'incoming' ? (
            <>
              <b>{i.otherName}</b> wants to talk about <b>{i.startupName}</b>
            </>
          ) : (
            <>
              You asked <b>{i.otherName}</b> about <b>{i.startupName}</b>
            </>
          )}
        </p>
        <Badge tone={tone[i.status]}>{i.status}</Badge>
      </div>
      <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{i.message}</p>
      {i.otherEmail && (
        <p className="text-sm mt-2">
          Contact:{' '}
          <a className="text-columbia-600 underline" href={`mailto:${i.otherEmail}?subject=${encodeURIComponent(i.startupName + ' intro')}`}>
            {i.otherEmail}
          </a>
        </p>
      )}
      {i.direction === 'incoming' && i.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button className={btnPrimary} onClick={() => act({ action: 'respondIntro', id: i.id, accept: true })}>
            Accept &amp; share emails
          </button>
          <button className={btnGhost} onClick={() => act({ action: 'respondIntro', id: i.id, accept: false })}>
            Decline
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Requests to you</h2>
        {incoming.length ? incoming.map((i) => <Row key={i.id} i={i} />) : <Empty>No one has asked you for an intro yet.</Empty>}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Your requests</h2>
        {outgoing.length ? outgoing.map((i) => <Row key={i.id} i={i} />) : <Empty>Find a startup in the directory and request a warm intro.</Empty>}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clubs
// ---------------------------------------------------------------------------

function ClubsTab({ state, act }: { state: HubState; act: Act }) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Club officers verify membership (approve requests or paste their roster). Only verified members see a club&apos;s postings.
      </p>
      {state.clubs.map((c) => (
        <ClubCard key={c.id} c={c} act={act} />
      ))}
      {state.isSuperAdmin && (
        <button className={btnGhost} onClick={() => setCreating(true)}>
          + Create club
        </button>
      )}
      {creating && <CreateClubModal act={act} onClose={() => setCreating(false)} />}
    </div>
  );
}

function ClubCard({ c, act }: { c: ClubView; act: Act }) {
  const [open, setOpen] = useState(false);
  const [roster, setRoster] = useState('');
  const [newAdmin, setNewAdmin] = useState('');
  const manage = !!c.members;
  const statusBadge = {
    admin: <Badge tone="purple">Officer</Badge>,
    member: <Badge tone="green">Verified member</Badge>,
    pending: <Badge tone="amber">Pending approval</Badge>,
    none: null,
  }[c.status];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex flex-wrap items-start gap-2 justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">{c.name}</h3>
          <p className="text-xs text-slate-500">
            {c.description} · {c.memberCount} members
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          {c.status === 'none' && (
            <button className={btnGhost} onClick={() => act({ action: 'requestJoin', clubId: c.id })}>
              Request to join
            </button>
          )}
          {(c.status === 'member' || c.status === 'pending') && (
            <button className="text-xs text-slate-500 hover:underline" onClick={() => act({ action: 'leaveClub', clubId: c.id })}>
              {c.status === 'pending' ? 'Cancel request' : 'Leave'}
            </button>
          )}
          {manage && (
            <button className={btnGhost} onClick={() => setOpen(!open)}>
              Manage{c.pending?.length ? ` (${c.pending.length} pending)` : ''}
            </button>
          )}
        </div>
      </div>

      {manage && open && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium text-slate-700">Pending requests</h4>
            {c.pending!.length === 0 && <p className="text-xs text-slate-400">None</p>}
            {c.pending!.map((e) => (
              <div key={e} className="flex items-center gap-2">
                <span className="flex-1 truncate">{e}</span>
                <button className="text-xs text-emerald-700 hover:underline" onClick={() => act({ action: 'approveMember', clubId: c.id, email: e })}>
                  Approve
                </button>
                <button className="text-xs text-red-600 hover:underline" onClick={() => act({ action: 'rejectMember', clubId: c.id, email: e })}>
                  Reject
                </button>
              </div>
            ))}
            <h4 className="font-medium text-slate-700 pt-2">Bulk-add from roster</h4>
            <textarea className={inputCls} rows={3} value={roster} onChange={(e) => setRoster(e.target.value)} placeholder="Paste emails (comma, space or newline separated)" />
            <button className={btnGhost} disabled={!roster} onClick={async () => (await act({ action: 'addMembers', clubId: c.id, emails: roster })) && setRoster('')}>
              Add members
            </button>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-slate-700">Officers</h4>
            {c.admins!.map((e) => (
              <div key={e} className="text-xs text-slate-600">
                {e}
              </div>
            ))}
            <div className="flex gap-2">
              <input className={inputCls} value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} placeholder="officer email" />
              <button className={btnGhost} disabled={!newAdmin} onClick={async () => (await act({ action: 'addAdmin', clubId: c.id, email: newAdmin })) && setNewAdmin('')}>
                Add
              </button>
            </div>
            <h4 className="font-medium text-slate-700 pt-2">Members ({c.members!.length})</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {c.members!.map((e) => (
                <div key={e} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate text-slate-600">{e}</span>
                  <button className="text-red-600 hover:underline" onClick={() => act({ action: 'removeMember', clubId: c.id, email: e })}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateClubModal({ act, onClose }: { act: Act; onClose: () => void }) {
  const [f, setF] = useState({ name: '', description: '', admins: '' });
  return (
    <Modal title="Create club" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act({ action: 'createClub', ...f })) onClose();
        }}
      >
        <Field label="Name *">
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        </Field>
        <Field label="Description">
          <input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <Field label="Officer emails" hint="These people can post and verify members">
          <input className={inputCls} value={f.admins} onChange={(e) => setF({ ...f, admins: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button className={btnPrimary}>Create</button>
        </div>
      </form>
    </Modal>
  );
}
