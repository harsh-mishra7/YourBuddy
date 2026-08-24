# YourBuddy

A personal space to capture whatever's in your head — journal entries, stray
thoughts, trackers, voice notes, images — **without forcing everything to live
under a date.**

See [IDEA.md](./IDEA.md) for the reasoning behind every decision here. This
README covers only how to run it.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions) + React 19 |
| Styling | Tailwind CSS 4, Radix primitives, Lucide icons |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Accounts | Email + password, hashed with Node's `scrypt`; sessions in Postgres |
| Files | Local disk behind a storage adapter (`src/lib/storage.ts`) |
| Transcription | Pluggable provider, optional (`src/lib/transcription.ts`) |
| Charts | Recharts |

## Setup

### 1. Database

Create the role and database once:

```bash
sudo -u postgres psql \
  -c "CREATE ROLE harsh LOGIN PASSWORD 'yourbuddy' CREATEDB;" \
  -c "CREATE DATABASE yourbuddy OWNER harsh;"
```

### 2. Environment

Copy the example and adjust if your credentials differ:

```bash
cp .env.example .env
```

### 3. Install, migrate, seed

```bash
npm install
npx prisma migrate deploy   # applies prisma/migrations
npm run dev
```

Open http://localhost:3000 and create an account at `/signup`. Signup is open —
anyone who can reach the URL can register, which is worth knowing before you
put this on a public address.

### 4. If you have entries from before the login screen

The original account survived the migration but has no password, so it can't
sign in yet. Give it one:

```bash
npm run db:set-password -- your@email.com 'a long passphrase'
```

`npm run db:seed` does the same thing from `APP_USER_EMAIL` /
`APP_USER_PASSWORD` in `.env`. There is no reset-by-email — that needs a mail
provider — so this script is the recovery path, and it deliberately requires
access to the server rather than access to an inbox.

## Voice transcription

Voice notes record, play back, and save with **no configuration**. Without a
provider their transcript is parked as `PENDING`, and the entry page offers a
"Transcribe now" button that picks it up later.

To enable it, set in `.env`:

```
TRANSCRIPTION_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
```

Adding another provider means one branch in `src/lib/transcription.ts`.

## How it's organised

```
prisma/schema.prisma       Data model — read the header comment first
prisma/set-password.ts     Set or reset an account's password from the terminal
src/proxy.ts               Route guard: has a session cookie, or go to /login
src/lib/
  prisma.ts                Client singleton
  user.ts                  The one place that answers "who am I"
  session.ts               Issue, read, and destroy sessions
  session-cookie.ts        Cookie name/lifetime/flags, shared with the proxy
  password.ts              scrypt hashing and verification
  rate-limit.ts            In-memory throttle for the login form
  quota.ts                 Per-account storage ceiling
  storage.ts               Storage adapter (swap this for S3/Cloudinary)
  transcription.ts         Speech-to-text provider
  queries.ts               Every read the pages perform
  validation.ts            Zod schemas shared by the actions
src/app/actions/           Server actions: auth, entries, trackers, reminders
src/app/(auth)/            Signed-out routes: /login, /signup
src/app/(app)/             Signed-in routes: / (dated), /undated, /entry/[id],
                           /trackers, /settings
src/components/            UI
```

## Things worth knowing before you change anything

- **Two dates per entry, and they are not interchangeable.** `createdAt` is
  when you wrote it; `entryDate` is what day it's *about*. The dated timeline
  orders by `entryDate` — order it by `createdAt` and a backdated entry appears
  at today's position, which makes the timeline lie.
- **`entryDate IS NULL` *is* the undated shelf.** There's no separate flag, so
  the database enforces the split rather than every query remembering it.
  `priorEntryDate` remembers the removed date so the gesture is reversible.
  There is also **no entry type** — a `journal`/`thought` field existed briefly
  and was cut, because it encoded the same distinction as the shelf and could
  contradict it. If you're tempted to add one back, the shelf is the answer.
- **Date-only columns are read and written in UTC.** Prisma hands back
  `@db.Date` values pinned to UTC midnight; formatting them with local-time
  getters shifts them a day for anyone west of UTC. Use the helpers in
  `src/lib/utils.ts`.
- **Accounts are fully private, and `userId` is the only thing making them so.**
  There is no sharing, no membership table, no row two users can both reach —
  so a query added to `src/lib/queries.ts` without a `userId` in its `where` is
  a data leak, not a bug. Everything reads its user through `src/lib/user.ts`.
- **`src/proxy.ts` is a bouncer, not the lock.** It only sees whether a session
  cookie exists — it never queries the database, because it also runs on
  prefetches. The real check lives next to the data, where a Server Action
  called directly can't route around it.
- **Media is served through `/api/media`, never straight off disk.** The
  attachment row is looked up by `storageKey` *and* the requesting user, so
  someone else's key returns 404 even when the file is right there.
- **Sessions live in Postgres**, which is what makes "sign out" and "sign out
  everywhere" actually end them. Changing a password ends every other session.
- **`USER_STORAGE_QUOTA_MB` caps each account** (500 MB by default, `0`
  disables). With open signup and 25 MB voice notes, filling the disk would
  otherwise be a chore rather than an attack.
- **`UPLOADS_ENABLED` fails closed.** `src/lib/storage.ts` needs a real,
  writable, *persistent* disk, which serverless hosts don't have. Unless an
  environment sets this to `"true"`, the photo and voice controls are hidden
  and the actions refuse files with a clear message — instead of throwing
  `EROFS` *after* the entry row was written, which left the writer looking at
  an error for something that had actually saved. `GET /api/health` reports the
  current value.

## Deploying

Runs on Vercel today with uploads off — text, both shelves, search, trackers,
reminders, and auth all work; photos and voice notes wait for object storage.

1. **Postgres:** [Neon](https://neon.tech) free tier. Two connection strings,
   and they are not interchangeable — the **pooled** one (`-pooler` in the host)
   for the app, the **direct** one for migrations, because Prisma's migration
   engine takes advisory locks that PgBouncer breaks in transaction mode.
2. **Migrations** run from your machine, not the build:
   ```bash
   DATABASE_URL="<direct connection string>" npx prisma migrate deploy
   ```
3. **Vercel env vars** — `DATABASE_URL` (pooled) and `TRANSCRIPTION_PROVIDER`.
   `DATABASE_URL` must be available at **build** time, not just runtime:
   `src/lib/prisma.ts` throws on import and Next imports every route while
   building. Leave `UPLOADS_ENABLED` unset.
4. Sign up at `/signup`. Local entries stay local unless you `pg_dump` them.

**Two things Vercel costs you, worth knowing before they surprise you.** The
login throttle in `src/lib/rate-limit.ts` is an in-memory `Map`, so it resets on
every cold start and doesn't span instances — weak, and signup is open (Upstash
Redis is the fix). And when uploads come back, Vercel's ~4.5 MB function body
cap means voice notes need presigned direct-to-storage uploads, not just a new
storage adapter; images are fine with the adapter plus a client-side downscale.

A container host with a persistent volume avoids both, and keeps
`src/lib/storage.ts` exactly as it is.
- **A tracker's log type locks once it has check-ins.** Switching binary to
  number partway would leave the history holding two incompatible value shapes.
- **Reminders are in-app only.** Nothing is scheduled or sent; due reminders are
  resolved in `src/app/(app)/layout.tsx` on every load.

## Not in v1

Video upload, and the AI features — ask-your-past, retrospectives, consistency
analysis. Entries are stored as text throughout (voice included) specifically so
those can be added without reshaping the data.

On the account side: **no password reset by email** (needs a mail provider),
**no email verification** — so signup does reveal whether an address is already
registered — and **no OAuth**. The rate limiter is per-process, so it stops
password grinding on one instance and would need Redis behind two.
