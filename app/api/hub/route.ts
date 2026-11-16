import { auth } from '@/auth';
import { applyAction, buildState } from '@/lib/hub/logic';
import { load, save } from '@/lib/hub/store';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function currentEmail(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  // The legacy shared-password login has no real identity; require an email.
  if (!email || email === 'user@mba-copilot') return null;
  return email.toLowerCase();
}

export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: 'Sign in with your school email.' }, { status: 401 });
  const db = await load();
  return NextResponse.json(buildState(db, email));
}

export async function POST(req: NextRequest) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: 'Sign in with your school email.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const db = await load();
  const error = applyAction(db, email, body);
  if (error) return NextResponse.json({ error }, { status: 400 });
  await save(db);
  return NextResponse.json(buildState(db, email));
}
