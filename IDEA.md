# YourBuddy

> **Status:** Idea phase — nothing built yet. We fill this in first, then build.

---

## 1. One-liner

A personal space to capture whatever's in your head — journal entries, stray thoughts, things worth remembering, trackers, voice notes, media — **without forcing everything to live under a date.**

## 2. The problem

Journal apps make **the date the primary index**. Every piece of writing has to be filed under a day. Three things break because of that:

1. **Not everything is daily.** Some days you want to write, most days you don't. A date-first app quietly turns into a streak you're failing.
2. **Not everything is a journal entry.** A random thought, an idea, something you want your future self to see — these don't belong to "24 Aug 2026." Filing them under a date is the wrong shape, so they end up scattered in Notes, WhatsApp-to-self, screenshots, or nowhere.
3. **Repetition.** Habits happen every day. Re-writing "went to the gym" inside every daily entry is noise, and it buries the actual thinking.

Net effect: the tool fights the way thoughts actually arrive. You end up either journaling out of obligation, or abandoning it.

## 3. Who it's for

**Primary user: you.** Someone who:
- Writes in bursts, not on a schedule
- Has thoughts worth keeping that aren't tied to a day
- Has habits — and other things worth tracking — and wants them logged, not narrated
- Sometimes doesn't want to type at all

**What they do today instead:** a journal app for the dated stuff, plus notes app / WhatsApp-to-self / camera roll / a separate habit tracker for everything else. Fragmented, so none of it is searchable or reviewable together.

> **Answered:** built for you alone for now, with an eye on opening it up if it proves good.
>
> **One cheap precaution that keeps that door open:** even though v1 has a single user, the data model should carry a **user identity from day one.** Adding that column later means migrating every table and rewriting every query. Adding it now costs essentially nothing.

## 4. The core idea

Two structural moves:

**A. Date becomes metadata, not the index.** Everything still records *when* it was created — you just don't have to navigate by it, and nothing has to belong to a day.

**B. Different kinds of capture get different homes — inside one app.**

| Entry type | What it is | Is it dated? |
| --- | --- | --- |
| **Journal entry** | Reflective writing about a day / period | Yes — date is meaningful here |
| **Thought** | A stray idea, observation, one-liner | Timestamped, but date is incidental |
| ~~**For future me**~~ | **Not a separate type** — folded into reminders, since *any* entry can carry one (see below) | — |
| **Tracker** | Something you log over time — a daily habit, or an occasional thing like gym performance | A series of check-ins, not an entry |

And **formats cut across all of them** — any entry can be text, voice, image, or video. Voice isn't a separate section; it's just another way to write a thought when you don't feel like typing. *(Video is deferred past v1 — see §5.)*

### How you browse: two shelves

Everything you write **starts dated by default** — no decision to make at capture time, you just write. But any entry can have its **date removed**, and that moves it to a different shelf:

- **Dated shelf** — journal entries, anything where *when* is part of the meaning. Browsed as a timeline.
- **Undated shelf** — stray thoughts, ideas, things for future you. Doesn't belong to a day, so it isn't filed under one.

The two never mix in the same view. **Removing the date is the single gesture that says "this isn't about a day."**

Why default-to-dated: capture stays frictionless. You never have to categorize before writing — you write first, and reclassify later only if it turns out to matter.

### How "for future me" comes back

Writing something down for future-you is pointless if future-you never sees it again. So the app **actively brings it back**, through three channels:

1. **A reminder you set while writing** — optional, per entry. If you know future-you should see this again, you set when. Nothing is scheduled unless you ask for it.
2. **On demand, via AI** — when you ask the AI something related, it pulls up what you wrote before. You don't need to remember the note exists, or what words you used in it.
3. **Search** — a search bar over title and body text, for when you already know what you're looking for.

> **Two different search mechanisms here, worth not conflating.** The **search bar** is keyword matching: you type "gym," it finds entries containing the word "gym." The **AI channel** is semantic: you ask *"was I happier when I was exercising?"* and it surfaces the right entries even if none of them contain the words "happier" or "exercising." v1 needs the first. The second arrives with the AI features — and it's why entries need vector indexing, not just a text index.

**Reminders are opt-in by design.** The app never decides on its own that you should be shown something. You choose, at the moment of writing, when it matters.

> **This collapses a concept.** "For future me" stops being a separate entry *type* and becomes an optional reminder that **any** entry can carry — a journal entry, a stray thought, anything. One less thing to decide while writing, one less thing to build.

> **The trade-off, stated plainly:** entries you *didn't* set a reminder on will never come back on their own — they're reachable only by search or by asking the AI. That's a fair price for predictability (no surprise nostalgia notifications), and channel 2 covers the gap well. Just worth knowing it's the deal being made.

Channel 2 is the significant one. It means past entries aren't just *stored*, they're **context the AI reasons with.** Ask *"should I take on this new project?"* and it can answer already knowing you wrote *"don't say yes when you're exhausted"* eight months ago.

> **Architectural consequence — worth noting early:** for the AI to find entries by *meaning* rather than exact keyword match, entries need to be indexed for semantic search, and **every entry must exist as text.** That's precisely why voice transcription (below) isn't optional.

### Why one app instead of two (the actual thesis)

A journal app and a habit tracker as separate tools each give you half the picture:
- The tracker knows **what you did**.
- The journal knows **how it went**.

Neither can tell you whether the effort was worth it. Put them in the same place and you can ask: *"I hit the gym 5×/week for two months — did I actually feel any better?"* That correlation between **effort and outcome** is the thing no existing tool gives you, and it's only possible because habits and reflections share one home.

This is also where the name earns itself: a buddy isn't a filing cabinet, it's something that notices patterns and tells you what it sees.

> **Why the optional note on a check-in matters more than it looks:** a bare "done ✓" records *that* you went to the gym. A check-in with *"felt strong today"* or *"dragged myself there"* records **how it went.** Those small optional notes are the exact raw material the effort-vs-outcome analysis runs on — they're what connects tracker data to the felt experience.

### Trackers: two choices, made once at creation

A tracker is defined by two independent settings, both picked when you create it.

**1. Cadence — how often it's expected**

- **Daily** (default) — something you intend to do each day.
- **Occasional** — logged only when it happens, like gym performance. No daily expectation, so no gaps to feel bad about.

**2. Log type — what a single check-in records**

- **Binary** — done / not done. One tap.
- **Number** — a value. Reps, minutes, pages, kg.
- **Text** — a free-form note.

Any log, whatever its type, can *additionally* carry a note or media.

**The two settings are independent** — daily + binary is the classic habit, occasional + number is gym performance, daily + text is a one-line mood log. Six combinations, no special cases.

**This is the same principle as the two shelves, applied a second time.** The app exists because a journal shouldn't impose a daily cadence on your thinking. A tracker shouldn't impose one on your activities — nor impose a single shape on what "logging" even means. Daily is a *default*, never a requirement.

> **Log type drives the history view** — more than cadence does:
> - **Binary** → a grid of days
> - **Number** → a line chart over time
> - **Text** → a chronological list

> **A number tracker needs a unit.** "80" alone is meaningless — kilos, minutes, or pages? Set a unit label when creating the tracker. It costs one text field, and without it the chart axis is unlabelled and the AI can't interpret the numbers it's reading.

> **Consequence for the AI consistency analysis:** a daily tracker has a denominator — *"you did this 22 of 30 days."* An occasional tracker has none; there's no total to divide by. For those, the AI can report frequency and trend (*"about twice a week, tapering off through July"*) but not a consistency percentage. Two different kinds of analysis, not one.

## 5. What it does — core features

### Must have (v1) — *proposed, confirm or cut*

- [ ] **Capture, fast.** Open app → write → save. No mandatory title, no mandatory date, no mandatory type.
- [ ] **Entry types** — journal entry vs. free thought. ("For future me" is *not* a type — it's a reminder flag any entry can carry, §4.)
- [ ] **Two-shelf browsing.** Dated and undated entries live in separate places (§4). The core differentiator.
- [ ] **Remove-date action.** One gesture on any entry; moves it between shelves. Presumably reversible.
- [ ] **Backdating.** A journal entry can be written for a past date you missed (§7).
- [ ] **Search bar.** Keyword match on title or body text. Titles are optional, so body text is the primary target.
- [ ] **Sort control** — by date created. **Newest first by default**, toggleable to oldest first.
- [ ] **Trackers.** Create a tracker, choosing two things up front: **cadence** (daily / occasional) and **log type** (binary / number / text) — §4. Log check-ins, see the history. Any log can optionally carry a note or media — see §4 for why those notes are worth more than they look.
- [ ] **Image upload** attached to entries.
- [ ] **Voice notes** — record, play back, and **transcribe to text on save.** Audio and transcript stored together.
- [ ] **Reminders on entries** — while writing, optionally set when this should come back to you (§4). Works on any entry type.

### Later (not v1)

- **Ask-your-past AI** — ask a question, get an answer informed by everything you've written (§4, channel 2). ⚠️ *Scope tension: this is listed as "later," but it's one of the three ways "for future me" comes back. If v1 ships without it, resurfacing leans entirely on channels 1 and 3 — which is workable, just weaker. Worth a deliberate call rather than letting it drift.*
- **AI period retrospective** — "how were the last 3 months for me?" Reads journal + tracker data, summarizes what was going on.
- **AI reflection / advice** — reads entries and offers perspective or counselling-style feedback on patterns.
- **AI consistency analysis** — how consistent were you with a tracker, and how does that compare to the results you actually got. *(Works differently for daily vs. occasional trackers — see §4.)* *(The effort-vs-outcome idea from §4 — the most distinctive feature here, and worth protecting from scope cuts.)*
- **Video upload** — direct file upload as an entry attachment. ⚠️ *Cut from v1 (see §7). At 50–500 MB per clip it was the single most expensive item on the list, and because video is never transcribed it contributes nothing to the AI features that are the point of the app. Images and voice cover capture until it lands.*
- Reminders / nudges
- Mood or energy tagging
- Export / backup

### Explicitly NOT doing

- **Not a streak-guilt app.** No punishing you for missing days. That's the failure mode we're fixing.
- **Not social.** No sharing, no feed, no friends. This is private by nature.
- **Not a to-do / task manager.** "For future me" is a message, not a task with a due date.
- **Not a note-taking app with folders and backlinks.** Not building Notion or Obsidian.

## 6. A day in the life

> **Draft based on your description — correct anything that's wrong, this is where gaps show up.**

1. **Tuesday, 11pm.** Something happened at work worth thinking through. Opens app → writes a proper journal entry → it files under today, because here the date genuinely matters.
2. **Wednesday, on the bus.** Random thought about a project idea. Opens app → dumps two lines as a **thought**. Doesn't want it buried in "Wednesday" — it isn't about Wednesday.
3. **Wednesday evening.** Gym done. Opens his **daily** tracker → taps it done. Doesn't write about it. It's just data now. Separately, he logs squat numbers against an **occasional** "gym performance" tracker — which has no daily expectation, so the days he doesn't lift aren't holes.
4. **Thursday.** Too tired to type, but something's on his mind. Records a **voice note** instead.
5. **Saturday.** Wants to remember something for his future self — a realization, a promise, a piece of advice. Saves it as **for future me**. ← *What happens next? Does it just sit there until searched, or does the app bring it back to him? See §7.*
6. **Three months later.** Asks for a retrospective. AI reads the journals + tracker history and tells him what the period actually looked like — including whether the things he kept up with matched how he was feeling.

## 7. Open questions

*Mostly resolved — kept as a record of what was asked and why each call was made, so we don't relitigate mid-build. One minor item remains.*

- [x] ~~**If not by date, then by what?**~~ → **Answered:** two shelves, dated by default, date removable. See §4.
- [x] ~~**How is the undated shelf ordered?**~~ → **Answered:** creation order, **descending by default** (newest first), plus a sort toggle (asc/desc) and a keyword search bar over title + body. No tags, no pinning. *Originally recorded as ascending; **flipped 2026-08-24.** Ascending meant the thing you just wrote landed at the bottom of a list that grows forever — every capture tool defaults to newest-first for exactly that reason. The toggle still covers the times you want to read forward from the beginning.*
- [x] ~~**Is "for future me" passive or active?**~~ → **Answered: active**, plus AI can surface it on demand. See §4.
- [x] ~~**Are voice notes transcribed?**~~ → **Answered: yes**, speech to text on save.
- [x] ~~**What triggers scheduled resurfacing?**~~ → **Answered:** an optional reminder you set while writing. Opt-in per entry, never automatic.
- [x] ~~**How does a reminder reach you?**~~ → **Answered: in-app only.** No email, no push. *Consequence worth knowing: a reminder set for six months out fires whenever you next open the app after that date — it can't pull you back in. Reminders nudge you while you're already there. Fine for a personal tool; just not the same feature as a notification.*
- [x] ~~**Privacy vs. AI**~~ → **Answered: AI wins.** Journal content, including transcribed voice, gets sent to a model provider to power analysis and ask-your-past. *Reading this as "the AI features are worth it, don't cripple them for strict local-only privacy" — say so if that's not what you meant.* Escape hatches if it ever matters more: run a local model, or scope what gets sent. Both are additive later; neither needs to shape v1.
- [x] ~~**Just you, or a real product?**~~ → **Answered: just you for now,** possibly opening up later. See §3 for the one cheap precaution that keeps that door open.
- [x] ~~**Habit granularity**~~ → **Answered: binary by default,** with optional text/media per check-in. *(See the two follow-ups directly below — the occasional-tracker idea reopens part of this.)*
- [x] ~~**Does binary apply to occasional trackers?**~~ → **Dissolved by the log-type choice.** Pick number or text for those; binary is no longer forced onto anything it doesn't suit.
- [x] ~~**Should tracker logs have a number field?**~~ → **Answered: yes** — `number` is a first-class log type, not a bolt-on. Chartable data gets captured from day one, so there's nothing to backfill later.
- [ ] **Minor: can a tracker's log type change after creation?** Switching binary → number partway leaves a history holding two incompatible value shapes. Simplest answer is to lock the type once logs exist. Not urgent, but the data model should know which way it's going.
- [x] ~~**Video: links or uploads?**~~ → **Answered: direct upload** when it ships — but ⚠️ **video is cut from v1 entirely** (revised 2026-08-24). Phone video runs 50–500 MB per clip, which brings real storage cost, large-file upload handling (progress, failure, retry), and browser playback/format issues. None of it is *hard* — it's just disproportionate work next to everything else on the list. **The deciding argument:** video is never transcribed (next item), so it's invisible to the AI — meaning the priciest thing in v1 contributed nothing to the features that make the app worth building. v1 ships **image upload and voice notes**; video follows once the rest works.
- [x] ~~**Is audio from uploaded video transcribed?**~~ → **Answered: no.** Video is purely an attachment on an entry. *Consequence, noted once so it isn't a surprise: anything you say out loud in a video is invisible to the AI — it won't show up in retrospectives or ask-your-past answers. The entry's own text still counts normally.* **This answer is what justified cutting video from v1** (previous item) — highest cost on the list, zero contribution to the AI.
- [x] ~~**Can a journal entry be written for a past date?**~~ → **Answered: yes.** ⚠️ **This requires two separate timestamps per entry, and they're easy to conflate:**
  - `created_at` — when you actually wrote it
  - `entry_date` — what date it's *about*

  The dated shelf's timeline must order by **entry_date**, or a backdated entry about last week shows up at today's position and the timeline quietly lies to you. The sort control in §5 sorts by **created_at**. Both fields are needed; they are not interchangeable.
- [x] ~~**Web-only or phone?**~~ → **Answered: web only for now,** phone later if it proves out. ⚠️ **Recommendation: build the web UI mobile-responsive from day one regardless.** §6's bus scenario is a phone moment, and "expand to phone later" is nearly free if the UI is already responsive (installable as a PWA) and a rewrite if it isn't. Costs little now, saves a lot later.
- [x] ~~**Relationship to `attend-buddy`**~~ → **Answered: none.** Entirely separate project.

## 8. Success

**TBD** — but the honest bar for a personal tool: *you actually use it for a month, and stop reaching for the old journal app + notes app + WhatsApp-to-self.*

If the AI retrospective ever tells you something about yourself you hadn't noticed, that's the real win.

---

## Decisions log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-08-24 | ~~Category: habit & accountability buddy~~ **Revised:** personal capture app *with* habit tracking inside | Once described, the center of gravity is unstructured thought capture — habits are a major component, not the core |
| 2026-08-24 | Date is metadata, not the organizing principle | The specific pain that motivated the whole project |
| 2026-08-24 | Journal + habits in one app, not two | Enables effort-vs-outcome analysis (§4) — the differentiating feature |
| 2026-08-24 | Private, non-social | Follows from the nature of the content |
| 2026-08-24 | Two shelves: dated (default) + undated (date removed) | Keeps capture frictionless while still freeing thoughts from the calendar |
| 2026-08-24 | "For future me" is actively resurfaced, not passively stored | A note you never see again is barely worth writing |
| 2026-08-24 | Past entries are context the AI can retrieve and surface on demand | Turns a static archive into something that answers questions |
| 2026-08-24 | Voice notes are transcribed to text on save | Otherwise they're invisible to both search and AI analysis |
| 2026-08-24 | Resurfacing = an opt-in reminder set while writing, never automatic | Predictable and user-controlled; also collapses "for future me" from an entry type into a flag on any entry |
| 2026-08-24 | v1 is single-user (just you), possibly opened up later | Keeps scope small — but schema carries a user identity so scaling isn't a rewrite |
| 2026-08-24 | AI features take priority over strict local-only privacy | Content goes to a model provider; local models stay an additive option |
| 2026-08-24 | Web only for v1; reminders in-app only | Removes notification infrastructure entirely — the biggest scope win so far |
| 2026-08-24 | Habits are binary, with optional note/media per check-in | Daily logging stays one tap, while still capturing the "how it went" the AI needs |
| 2026-08-24 | Feature is named **Tracker**, not "habit tracker" | Not everything tracked is a habit — gym performance isn't |
| 2026-08-24 | Trackers have a cadence chosen at creation: daily (default) or occasional | Same principle as the shelves — daily is a default, never a requirement |
| 2026-08-24 | Log type chosen per tracker: binary, number, or text | Different things want different shapes; also solves "prose can't be charted" |
| 2026-08-24 | Undated shelf: creation order ~~ascending~~ **descending (newest first)**, sort toggle, keyword search bar | Simple — no tagging or pinning system needed in v1. **Revised:** ascending buried the newest entry at the bottom of an ever-growing list; the toggle still covers reading forward |
| 2026-08-24 | Photos and video are uploaded directly, not linked — but ~~video ships in v1~~ **video is cut from v1** | You want your own footage in the app. **Revised:** priciest item on the list (50–500 MB/clip) and, being untranscribed, it contributes nothing to the AI — images + voice ship first |
| 2026-08-24 | Journal entries can be backdated | Needs distinct `created_at` and `entry_date` fields — see §7 |
| 2026-08-24 | Video is an attachment only — not transcribed, not AI-readable | Keeps scope down; accepted that spoken video content is invisible to analysis — and this is precisely what justified cutting it from v1 |
| 2026-08-24 | No relationship to `attend-buddy` | Separate project |

---

## Tech (deferred)

**Now unblocked** — §1–6 are settled and the privacy question is answered. Constraints that fall out of the decisions above:

- **Single user**, but the schema carries a user identity from day one (§3)
- **Two date fields per entry** — `created_at` vs. `entry_date`, since entries can be backdated (§7)
- **Trackers carry a cadence** (daily / occasional) **and a log type** (binary / number / text) — logs are polymorphic, and the history view is driven by log type (§4)
- **Web only** — but mobile-responsive from the start, so phone is a PWA install rather than a rewrite
- **No notification infrastructure** — reminders are in-app, resolved on load
- **Semantic search over entries** (§4, channel 2) — some form of vector storage
- **Everything must exist as text** — so a speech-to-text service for voice notes
- **File storage** for **images and audio** in v1 — but pick something that can take video later without a migration, since video is the eventual sizing driver
- **Cloud AI** — content is sent to a model provider

**Stack: TBD** — next conversation.
