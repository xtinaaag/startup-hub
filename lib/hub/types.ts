// Shared types for the Startup Hub (club opportunities + warm-intro startup directory).

export type ClassYear = '1Y' | '2Y' | 'EMBA' | 'Alumni';
export type Audience = 'all' | '1Y' | '2Y';

export interface UserProfile {
  email: string;
  name: string;
  classYear: ClassYear;
  createdAt: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  admins: string[]; // emails of club officers who can post + manage roster
  members: string[]; // verified member emails (admins are implicitly members)
  pending: string[]; // join requests awaiting officer approval
}

export interface Opportunity {
  id: string;
  clubId: string;
  company: string;
  role: string;
  description: string;
  location: string;
  type: 'Full-time' | 'Internship' | 'Part-time / In-semester' | 'Other';
  audience: Audience; // which class years in the club can see it
  howToApply: string; // link, email, or instructions
  sourceContact: string; // e.g. "Jane Doe '15 (alum, Partner at X)"
  deadline?: string; // YYYY-MM-DD
  postedBy: string;
  postedAt: string;
}

export type Relationship =
  | 'Worked there before MBA'
  | 'Friend of founder'
  | 'Investor / advisor'
  | 'Interned there'
  | 'Other';

export interface Connection {
  id: string;
  email: string;
  name: string;
  relationship: Relationship;
  detail: string; // e.g. "Product Manager, 2019-2022"
  openToIntros: boolean;
  addedAt: string;
}

export interface Startup {
  id: string;
  name: string;
  website: string;
  sector: string;
  stage: string; // Pre-seed, Seed, Series A, ...
  location: string;
  description: string;
  hiring: boolean;
  hiringNotes: string;
  connections: Connection[];
  addedBy: string;
  addedAt: string;
}

export interface IntroRequest {
  id: string;
  startupId: string;
  connectionId: string;
  fromEmail: string;
  toEmail: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt?: string;
}

export interface HubDB {
  version: 1;
  users: UserProfile[];
  clubs: Club[];
  opportunities: Opportunity[];
  startups: Startup[];
  intros: IntroRequest[];
}

// ---------- Shapes returned to the browser (permission-filtered) ----------

export interface ClubView {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  status: 'admin' | 'member' | 'pending' | 'none';
  // Only populated for club admins / super admins:
  members?: string[];
  pending?: string[];
  admins?: string[];
}

export interface ConnectionView {
  id: string;
  name: string;
  classYear?: ClassYear;
  relationship: Relationship;
  detail: string;
  openToIntros: boolean;
  isMe: boolean;
}

export interface StartupView extends Omit<Startup, 'connections' | 'addedBy'> {
  connections: ConnectionView[];
  addedByMe: boolean;
}

export interface OpportunityView extends Opportunity {
  clubName: string;
  canDelete: boolean;
  matchedStartupId?: string; // directory entry with the same company name
  connectionCount: number;
}

export interface IntroView {
  id: string;
  startupId: string;
  startupName: string;
  direction: 'incoming' | 'outgoing';
  otherName: string;
  otherEmail?: string; // revealed only once accepted
  message: string;
  status: IntroRequest['status'];
  createdAt: string;
}

export interface HubState {
  me: UserProfile | null;
  email: string;
  isSuperAdmin: boolean;
  clubs: ClubView[];
  opportunities: OpportunityView[];
  startups: StartupView[];
  intros: IntroView[];
  storage: 'blob' | 'file';
  llmEnabled: boolean;
}
