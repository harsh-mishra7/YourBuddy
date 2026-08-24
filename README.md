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
npm run db:seed             # creates the single user
npm run dev
```

Open http://localhost:3000.

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
src/lib/
  prisma.ts                Client singleton
  user.ts                  The one place that answers "who am I"
  storage.ts               Storage adapter (swap this for S3/Cloudinary)
  transcription.ts         Speech-to-text provider
  queries.ts               Every read the pages perform
  validation.ts            Zod schemas shared by the actions
src/app/actions/           Server actions: entries, trackers, reminders
src/app/                   Routes: / (dated), /undated, /entry/[id], /trackers
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
- **Date-only columns are read and written in UTC.** Prisma hands back
  `@db.Date` values pinned to UTC midnight; formatting them with local-time
  getters shifts them a day for anyone west of UTC. Use the helpers in
  `src/lib/utils.ts`.
- **Every row carries a `userId`** even though v1 is one person. Swapping
  `getCurrentUser()` for a real session lookup is the entire cost of adding
  auth later.
- **A tracker's log type locks once it has check-ins.** Switching binary to
  number partway would leave the history holding two incompatible value shapes.
- **Reminders are in-app only.** Nothing is scheduled or sent; due reminders are
  resolved in the root layout on every load.

## Not in v1

Video upload, and the AI features — ask-your-past, retrospectives, consistency
analysis. Entries are stored as text throughout (voice included) specifically so
those can be added without reshaping the data.
