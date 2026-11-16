// Tiny persistence layer: the whole hub is one JSON document.
//
// - Local dev (no BLOB_READ_WRITE_TOKEN): stored in .data/startup-hub.json
// - Vercel (BLOB_READ_WRITE_TOKEN set): stored in Vercel Blob. Every write
//   creates a new blob with an unguessable random suffix and deletes the old
//   one, which sidesteps CDN caching of overwritten blobs.
//
// Good enough for a class prototype with tens of users. It is NOT safe for
// heavy concurrent writes (last write wins). Swap for Postgres (Neon/Supabase)
// before real launch — only load()/save() need to change.

import { promises as fs } from 'fs';
import path from 'path';
import { seedData } from './seed';
import type { HubDB } from './types';

const BLOB_PREFIX = 'startup-hub/db-';
const LOCAL_PATH = path.join(process.cwd(), '.data', 'startup-hub.json');

export const storageMode = (): 'blob' | 'file' =>
  process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'file';

export async function load(): Promise<HubDB> {
  if (storageMode() === 'blob') {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    if (blobs.length === 0) return seedData();
    const latest = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];
    const res = await fetch(latest.url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to read hub data: ${res.status}`);
    return (await res.json()) as HubDB;
  }

  try {
    return JSON.parse(await fs.readFile(LOCAL_PATH, 'utf8')) as HubDB;
  } catch {
    return seedData();
  }
}

export async function save(db: HubDB): Promise<void> {
  if (storageMode() === 'blob') {
    const { put, list, del } = await import('@vercel/blob');
    const { blobs: old } = await list({ prefix: BLOB_PREFIX });
    await put(`${BLOB_PREFIX}${Date.now()}.json`, JSON.stringify(db), {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'application/json',
    });
    if (old.length) await del(old.map((b) => b.url));
    return;
  }

  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, JSON.stringify(db, null, 2));
}

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
