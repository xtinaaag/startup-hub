// "Paste the club email blast" -> structured opportunity fields.
// Uses the same OpenAI-compatible endpoint the copilot already uses
// (OPENAI_API_KEY + OPENAI_BASE_URL, e.g. the CBS endpoint).

import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PROMPT = `You extract job/startup opportunities from emails that MBA club officers forward to members.
Return ONLY a JSON object with these string keys (use "" if unknown, never invent facts):
company, role, description (2-4 sentences, plain text), location,
type (one of "Full-time","Internship","Part-time / In-semester","Other"),
howToApply (link, email, or instructions exactly as written),
sourceContact (who shared it, e.g. "Alum '15, Partner at X"),
deadline (YYYY-MM-DD or "").
If the email contains several opportunities, return the first one.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 400 });

  const { text } = await req.json().catch(() => ({ text: '' }));
  if (typeof text !== 'string' || text.trim().length < 30)
    return NextResponse.json({ error: 'Paste the email text first.' }, { status: 400 });

  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.HUB_PARSE_MODEL || 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: `Today is ${new Date().toISOString().slice(0, 10)}.\n\n${text.slice(0, 12000)}` },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: `LLM request failed (${res.status}): ${detail.slice(0, 200)}` }, { status: 502 });
  }
  const data = await res.json();
  try {
    return NextResponse.json(JSON.parse(data.choices?.[0]?.message?.content || '{}'));
  } catch {
    return NextResponse.json({ error: 'Could not parse the model response.' }, { status: 502 });
  }
}
