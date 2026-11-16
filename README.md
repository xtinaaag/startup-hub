# Startup Hub

A second tool in this app for matching MBA students with startup roles:

1. **Club Opportunities**: club officers post the startup roles that alumni send them (they can paste the alum's email and auto-fill the fields with the LLM). Only **verified club members** can see a club's postings. Each posting can be limited to 1Ys or 2Ys and is hidden after its deadline.
2. **Startup Directory**: students list startups they worked at before the MBA or know well (e.g. friends with the founder), and mark whether those startups are hiring. Every entry is vouched for by a verified student.
3. **Warm Intros**: request an intro from a classmate connected to a startup. Emails are exchanged only after the classmate accepts.
4. **My Clubs**: request to join clubs. Officers approve requests or bulk-add members from their roster.

Club postings and the directory are linked: if a posted company is in the directory, the posting shows "N classmates know this company".

**Setup** (see `.env.example`): sign in with a school email (`ALLOWED_EMAIL_DOMAINS`) plus `AUTH_PASSWORD`, or set `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` for real Google (LionMail) verification. Set `SUPER_ADMIN_EMAILS` to choose who can create clubs. Data is stored in `.data/startup-hub.json` locally, or in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set. The seeded demo data is fictional.

**Prototype limits:** the password login does not prove that the user owns the email they type, so turn on Google sign-in before using this for real club-restricted data. Blob storage is a single JSON document (the last write wins), so move to Postgres before real usage.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in AUTH_SECRET and AUTH_PASSWORD
npm run dev                  # http://localhost:3000
```

Demo logins: `priya.demo@gsb.columbia.edu` (officer), `marcus.demo@gsb.columbia.edu` (1Y), plus your AUTH_PASSWORD.
