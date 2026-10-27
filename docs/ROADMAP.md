# GimmieFive Roadmap: Accounts, Multiplayer, Security, Languages

_Drafted 2026-10-26. Effort estimates assume one full-stack developer and are rough._

## TL;DR

| Question | Recommendation |
| --- | --- |
| Is login worth it? | **Yes, but never as a gate.** Start everyone as an invisible anonymous user. Offer "save your progress" (magic link / Google / Apple) once they have something worth keeping. Multiplayer, cross-device sync, and leaderboards all need an identity. Solo play doesn't. |
| Backend | **Supabase**: Postgres, Auth (including anonymous sign-in), Realtime, Row Level Security, and Edge Functions from one vendor. The Vite SPA stays as it is; no Next.js needed. |
| Multiplayer shape | **Party mode first.** Players are in the same room or already on a call (Discord, Zoom, FaceTime). The app runs the shared topic, timers, turn order, and peer ratings. Built-in voice comes later, if ever. |
| Who rates? | **Humans.** Self-rating in solo, peer rating in multiplayer. AI is at most an opt-in post-round coach that never produces a score. |
| Languages | **English and Spanish ship today** (a typed dictionary in `src/i18n/`, Spanish text on every topic, a Settings page). Next: carry the locale into accounts, rooms, and the topics table. |
| Topics | Move from the bundled `src/data/topics.ts` to a curated Postgres table, keep a bundled fallback, add human-written key points per topic, and add a daily topic. AI may draft topic candidates offline; a human approves every one. |

---

## 1. Where we are today

- A client-only React 18 + TypeScript + Vite 6 + Tailwind 3 SPA. No backend.
- State: `useGameState` reads and writes `localStorage` directly through `lib/storage.ts`.
- Game logic is already pure and portable: `lib/timer.ts`, `lib/session.ts` (phase-guarded reducer), `lib/streak.ts`, `lib/score.ts`, `lib/random.ts`.
- Session and history ids are already UUIDs. That makes deduplication during a later cloud sync trivial.
- Topics: 108 hand-curated entries hardcoded in `src/data/topics.ts`, each with English and Spanish text. Ids come from the English title, so they never change with translation.
- i18n: `src/i18n/en.ts` is the source dictionary; `es.ts` must match it key for key (enforced by the type checker). The locale is saved in prefs and defaults to the browser language.

Two existing design choices carry straight into multiplayer:

1. **Timestamp-based timers.** A server only has to publish `phase_ends_at`, and every client renders the same countdown.
2. **Idempotent, phase-guarded transitions.** "Advance only if the phase is still X" is exactly the compare-and-set a multi-client server needs.

---

## 2. Target architecture

```
┌──────────────────────────── Browser (Vite SPA) ────────────────────────────┐
│  Routes: /  /play  /progress  /room/:code  /account                         │
│                                                                             │
│  Solo flow (works offline)          Party flow (online only)                │
│  useSoloChallenge ─┐                useRoom(code) ── subscribes, never      │
│                    │                     │            mutates state directly │
│  ProgressRepository (interface)          │                                  │
│   ├─ LocalProgressRepo  (today)          │                                  │
│   └─ RemoteProgressRepo (+ offline queue)│                                  │
└────────────┬─────────────────────────────┼──────────────────────────────────┘
             │ HTTPS (supabase-js)         │ WebSocket (Realtime)
┌────────────▼─────────────────────────────▼──────────────────────────────────┐
│ Supabase                                                                     │
│  Auth: anonymous → linked (email magic link, Google, Apple)                  │
│  Postgres + RLS: profiles, topics, challenge_results, rooms, room_players,   │
│                  peer_ratings                                                │
│  RPC (SQL functions, SECURITY DEFINER): create_room, join_room, set_ready,   │
│      advance_room, submit_peer_rating, server_time                           │
│  Realtime: Postgres Changes (room state), Presence (who's online),           │
│            Broadcast (emoji reactions)                                       │
│  Edge Functions (Deno/TS): rate-limited room creation, Turnstile check,      │
│      account export/delete, topic admin                                      │
└──────────────────────────────────────────────────────────────────────────────┘
Static hosting: Cloudflare Pages / Vercel / Netlify (with CSP headers)
```

### Why Supabase

- **Fits the stack.** It's a plain TypeScript client, so the SPA stays a SPA.
- **Anonymous sign-in with account linking.** Every guest gets a real `auth.uid()`, so RLS protects data from day one. Upgrading to a permanent account keeps the same user id and all their data.
- **Postgres functions are a natural home for game rules.** Transitions are atomic, run inside a transaction, and are race-free when six clients press "next" at once.
- **Realtime is built in**, both for room state and for presence.

**Alternative worth knowing:** Cloudflare Durable Objects (via PartyKit/partyserver) give one stateful, authoritative process per room. That's ideal for tight real-time games. It would mean a second vendor next to an auth/database provider, and 4–6 player rooms with timers measured in minutes don't need that latency profile. Revisit only if Realtime proves too slow or too costly.

### Client changes

1. **Router** (`react-router`): shareable `/room/:code` links, a working back button, and deep links from the account email.
2. **Repository seam.** Put `ProgressRepository` (`listHistory`, `saveResult`, `getStreak`) between `useGameState` and storage. Local stays the default; the remote version wraps local plus an upload queue so solo play still works offline.
3. **Server data cache**: TanStack Query, added only once the backend exists.
4. **Shared logic.** Move `lib/score.ts`, `lib/streak.ts`, and the topic types into a `shared/` folder that Edge Functions (Deno) can import too, so client and server can't disagree on scoring.

---

## 3. Login: worth it, done the low-friction way

**Verdict:** worth it once multiplayer or cross-device progress exists, and not before. The current solo game is better without it.

**Approach: anonymous-first, progressive upgrade.**

1. First visit: silent `signInAnonymously()`. There's no UI, and the player is playing within seconds.
2. A prompt appears only at moments of value: after the 3rd saved challenge, when a streak reaches 3+ days, or when they try to host a room. "Save your streak across devices."
3. Upgrade by linking: magic link, Google, Apple. We never store passwords, and no password reset flow is needed.
4. On first link, import the localStorage history. Rows are deduplicated by session UUID and the streak is recomputed on the server.
5. Account page: display name, linked providers, **export my data**, **delete my account**.

**Not doing:** usernames and passwords, mandatory sign-up, social profiles, or follower graphs.

---

## 4. Multiplayer (4–6 players)

### 4.1 Game design: "Party mode"

> **The detailed, decided spec is [`PARTY_MODE.md`](PARTY_MODE.md)** (2026-10-27). Where this section and the spec differ, the spec wins.

The core loop stays the same; the explaining just has an audience.

1. **Lobby.** The host creates a room and shares a 6-character code, link, or QR. Players join with a nickname, 4–6 per room (2–3 allowed as "small party"). Everyone readies up.
2. **Topic reveal.** The host chooses per game: every player gets their own topic (default), or everyone shares one.
3. **Research: 5 minutes, all players at once.** Notes stay on each player's device and are never uploaded. The "no AI" ethos holds, and so does privacy.
4. **Explain rounds.** Turn order is random. The current explainer is spotlighted on every screen with a shared countdown, while everyone else listens.
5. **Peer rating.** After each explanation, listeners rate Clarity, Confidence, and "I learned something" within a 30-second window. The explainer self-rates the same criteria. Ratings stay hidden until everyone has submitted or the window closes.
6. **Round results.** Per player: peer score and self score, with the **self-vs-peer gap** shown as an insight ("You underrated yourself by 15%"). Fun awards follow: Best Teacher, Most Confident, Taught Us the Most, Humble Genius.
7. **Play again** with the same room.

**Explain duration.** Solo play uses a fixed 1 minute, and party mode does too by default: six players come to 5 + 6 × 1.5 ≈ **14 minutes** including rating windows. The host may raise it to 2 minutes for groups that want depth (≈ 20 minutes for six). Everyone gets the same duration, which keeps peer comparison fair.

**Voice.** Party mode assumes players can already hear each other (same room, or an existing call). Building in-app audio means WebRTC, TURN servers, recording consent, moderation, and cost. That's a separate project (Phase 5, LiveKit or Daily) and only worth it if remote groups without a call turn out to be common.

### 4.2 Server-authoritative state

The room's phase, deadlines, and turn live **only on the server**. Clients render them and request changes; they never set them.

```sql
rooms(
  id uuid pk, code text unique, host_id uuid,
  status text check (status in ('lobby','playing','finished')),
  settings jsonb,              -- category, explain_minutes (1 or 2), max_players
  topic_id text,
  phase text,                  -- lobby | reveal | research | explain | rate | results
  phase_started_at timestamptz,
  phase_ends_at timestamptz,
  turn_order uuid[], current_turn int,
  version int,                 -- bumped on every transition
  created_at timestamptz
)
```

- **Transitions** go through `advance_room(room_id, expected_phase, expected_version)`. It's a compare-and-set: if the phase or version doesn't match, or `now() < phase_ends_at` when the caller isn't the host, it does nothing. Any client may call it the moment a deadline passes, so no cron or game server is needed. This mirrors `lib/session.ts`.
- **Clock skew.** Each client calls `server_time()` on join, estimates its offset (an NTP-style round-trip midpoint), and renders `phase_ends_at - (Date.now() + offset)`.
- **Pause** is host-only and stored as `paused_remaining_ms`. This is the existing `TimerState` banking model, moved to the server.
- **Reconnects.** Rejoining `/room/:code` restores everything from the row. Presence marks a player as away, and a player away for their whole turn is skipped automatically.
- **Host migration.** If the host leaves for more than 60 seconds, the longest-present player becomes host.

### 4.3 Data model (full)

```sql
profiles(id uuid pk references auth.users, display_name text, time_zone text,
         locale text default 'en', created_at timestamptz)

topics(id text pk, category text, difficulty smallint,
       status text check (status in ('draft','approved','retired')),
       created_by uuid, approved_by uuid, created_at timestamptz)

topic_translations(topic_id text references topics, locale text,
       title text, hint text,
       key_points jsonb,        -- 3–5 human-written facts, shown after rating
       reviewed_by uuid,        -- a native speaker signed off
       primary key (topic_id, locale))

challenge_results(id uuid pk,   -- the existing session UUID: idempotent upload
       user_id uuid, topic_id text, mode text check (mode in ('solo','party')),
       room_id uuid null, explain_minutes smallint,
       self_ratings jsonb, self_score smallint,
       peer_score smallint null,
       completed_at timestamptz, day date, time_zone text)

room_players(room_id uuid, user_id uuid, nickname text, joined_at timestamptz,
       ready bool, kicked bool, primary key (room_id, user_id))

peer_ratings(room_id uuid, target_id uuid, rater_id uuid, ratings jsonb,
       created_at timestamptz,
       primary key (room_id, target_id, rater_id),
       check (rater_id <> target_id))
```

**Peer score:** the mean of peer ratings. With 4 or more raters, the single highest and lowest are dropped (a trimmed mean), which blunts one friend inflating or one rival sinking a score.

**Streaks:** the client sends its local `day` plus `time_zone` with each result, and the server computes streaks per user with the same rules as `lib/streak.ts`. Party games count toward streaks.

---

## 5. Security plan

### Identity and access
- Auth is provider-managed (Supabase). We store no passwords.
- **RLS is on for every table, deny by default.** Players read their own results. Room data is readable only by members of that room (`exists (select 1 from room_players …)`). Peer ratings are readable only after the room's rating window closes.
- **All writes to rooms, players, and ratings go through RPC functions** that validate the caller, phase, deadline, and membership. Clients get no direct `insert` or `update` on game tables.
- The service-role key lives only in Edge Functions, never in the bundle. The anon key is public by design; RLS is what protects the data.

### Game integrity
- Server-owned deadlines: ratings submitted after `phase_ends_at` are rejected, and self-rating is forbidden by a check constraint.
- Rooms are capped at 6 players inside `join_room`, in the same transaction as the insert.
- Room codes use 6 characters from a 31-symbol alphabet with no confusables (about 887M combinations). Joining is rate-limited, and a host can **lock** the room and **kick** players.
- **Leaderboards never rank self-assessed scores.** They're subjective and trivially gamed. Rank streaks, completions, and (optionally) trimmed peer scores.

### Abuse and content
- Cloudflare Turnstile on room creation and account linking.
- Rate limits (Edge Function plus a Postgres counter): room creation per user per hour, join attempts per IP per minute, rating submissions per phase.
- Nicknames: 2–20 characters, a restricted character set, a profanity filter, and host kick.
- Research notes never leave the device.

### Web app hardening
- A strict **Content Security Policy** via hosting headers: `default-src 'self'`, Supabase and Google Fonts in `connect-src`/`font-src`, no inline script, `frame-ancestors 'none'`.
- HTTPS only, HSTS, `Referrer-Policy: strict-origin-when-cross-origin`.
- React escaping stays the only rendering path, with no `dangerouslySetInnerHTML`.
- Supabase sessions use the SDK defaults, refresh-token rotation stays on, and sign-out revokes sessions.

### Supply chain and operations
- CI on every PR: typecheck, unit tests, build, `npm audit --audit-level=high`, and Dependabot or Renovate.
- **Move to Node 20+ LTS** so we can take Vite 7, Tailwind 4, and Vitest 4. That clears the current audit warning.
- Error monitoring (Sentry) with PII scrubbing; privacy-friendly analytics (Plausible or PostHog with IP anonymization).
- Database backups (Supabase PITR on a paid tier) before public multiplayer launch.

### Privacy and compliance
- Collect as little as possible: display name, provider email, and results. No audio.
- Account **export** and **delete** (GDPR/CCPA) in Phase 2.
- **Decide the minimum age.** If under-13s are an audience (classrooms!), COPPA applies. The simplest route is a 13+ policy for accounts, with a separate teacher-managed classroom product later if wanted.

---

## 6. Topics

**Today:** 108 curated topics in `src/data/topics.ts`, each with an id, title, category, and hint.

**Plan:**
1. **Move them to the `topics` table.** The client fetches approved topics, caches them, and falls back to a bundled snapshot so solo play works offline. Multiplayer gets its topic from the server, so all players share it.
2. **Add `key_points`.** Three to five human-written facts per topic, revealed _after_ the player rates themselves. This makes the Accuracy rating meaningful ("Did I cover these?") without any AI. It's the single best quality upgrade for the rating step.
3. **Add a daily topic.** One shared topic per day for everyone, Wordle-style. It gives people something to talk about and makes a fair daily leaderboard possible (by completion and streak, not self-score).
4. **Grow the catalog with a moderated pipeline:**
   - Player suggestions go in as `draft`, and an admin approves them.
   - AI may be used **offline, by us**, to draft candidate topics and key points in bulk. Every item is human-reviewed before it becomes `approved`. This doesn't conflict with the product's "no AI for the learner" promise.
   - Retire weak topics using data: a high skip rate, or many low "could I find sources?" signals.
5. Add a `difficulty` column now, even if it goes unused at first.
6. **Translations are per row** (`topic_translations`). A topic is playable in a language only once its translation is reviewed. The picker filters by the player's locale, so Spanish players never see a half-translated topic.

---

## 7. AI rating: keep it human

**Recommendation:** human ratings are the product. No AI scoring.

Why:
- **Thesis.** GimmieFive is about learning without AI and explaining to people. An AI judge undercuts both.
- **It needs recording.** AI rating means capturing and transcribing voice, which brings consent from everyone in the room, storage, breach risk, and per-minute cost. It also breaks the MVP's "no paid APIs" principle.
- **Accuracy is the hard part.** Grading factual accuracy of a 2-minute spoken summary is unreliable on nuance, and a confident wrong grade feels worse than an honest self-rating.
- **It changes the vibe** from reflection and play into an exam, and it invites people to optimize for the grader rather than the listener.
- **Peers already solve it.** In multiplayer, peer ratings plus the self-vs-peer gap give a social, human signal. In solo, key points give a grounded accuracy check.

**If we ever add AI**, it would be an opt-in **"Coach"** for solo play only:
- Off by default, with explicit per-session consent to record.
- Transcription on the device where possible.
- Produces qualitative feedback (structure, filler words, missing key points), **never a number**, and never touches streaks or leaderboards.
- Treated as a possible paid feature, evaluated after multiplayer has proven itself.

---

## 8. Languages (English + Spanish)

**Shipped in the MVP:**
- A dependency-free, typed i18n layer (`src/i18n/`). Adding a key to `en.ts` without adding it to `es.ts` fails the type check.
- A Settings page with a language switch. The choice is saved, defaults to the browser language, and updates `<html lang>` and the page title.
- Spanish title and hint on all 108 topics, enforced by a unit test. History stores topic ids, so past results show in the current language.

**Next steps by phase:**
- **Phase 0:** add a Spanish copy check to CI (no `en` strings leaking into `es`), localized `<meta>` descriptions, and `hreflang` once there are routes (`/es/...` or `?lang=es`) for search engines.
- **Phase 1:** move topic text to `topic_translations`, and keep the bundled snapshot for offline play.
- **Phase 2:** save `locale` on the profile so it follows the account across devices.
- **Phase 3 (party mode):** each **room has a language set by the host**, which decides the topic language. Each player's UI follows their own setting, so a bilingual room works: the topic is in the room's language, and the buttons are in each player's.
- **Content process:** any new topic needs both languages before it's approved. AI may draft the Spanish, but a native speaker reviews it. Neutral Latin American Spanish with "tú" is the house style.
- **More languages later** (Portuguese is the natural third): add `pt.ts`, a `pt` value in `Locale`, and translation rows. No architecture change.

---

## 9. Phased roadmap

### Phase 0: Foundations (≈1–2 weeks)
- [ ] Commit the MVP and set up CI (typecheck, tests, build, audit).
- [ ] Upgrade to Node 20 LTS, Vite 7, Tailwind 4, Vitest 4. Port the `node:test` suite.
- [ ] Add `react-router`: `/`, `/play`, `/progress`.
- [ ] Introduce the `ProgressRepository` interface (local implementation only). Move `score`/`streak`/types into `shared/`.
- [ ] Deploy to static hosting with CSP and security headers; add Sentry and privacy-friendly analytics.
- [ ] Add `keyPoints` to bundled topics and show them after rating.
- **Exit:** same app, deployed, CI green, ready for a backend.

### Phase 1: Backend and invisible identity (≈2 weeks)
- [ ] Supabase project, migrations in the repo (`supabase/migrations`), RLS on every table, policy tests.
- [ ] Anonymous sign-in on first load.
- [ ] `topics` table seeded from `topics.ts`, client fetch with bundled fallback, plus the daily topic.
- [ ] `RemoteProgressRepo` with an offline queue; results upload idempotently by session UUID; server-side streaks.
- **Exit:** every visitor has a uid, results sync silently, and solo still works offline.

### Phase 2: Accounts (≈1–2 weeks)
- [ ] Link magic link, Google, and Apple to the anonymous user; prompts at moments of value.
- [ ] Merge localStorage history on first link.
- [ ] Account page: display name, providers, export, delete.
- [ ] Turnstile on linking; age and privacy policy pages.
- **Exit:** progress follows the user across devices; GDPR basics are covered.

### Phase 3: Party mode MVP (≈3–4 weeks)

**Priority change (2026-10-27):** party mode comes right after launch. It needs only the slice of Phase 1 that gives a backend and anonymous identity (#25, #26); solo sync and accounts (Phase 2) wait. Tickets #25–#37 under epic #20.
- [ ] Schema: `rooms`, `room_players`, `peer_ratings`; RPCs `create_room`, `join_room`, `set_ready`, `advance_room`, `submit_peer_rating`, `server_time`.
- [ ] `/room/:code`: lobby (code, link, QR, ready states), reveal, research, spotlight explain, rating window, results with self-vs-peer gap and awards.
- [ ] Clock-offset sync, reconnects, presence, host migration, kick and lock.
- [ ] Realtime: Postgres Changes for room rows, Presence for connection state.
- [ ] Playtest with real groups of 4–6, in person and over a call.
- **Exit:** a 6-player game runs start to finish with players dropping and rejoining, and nobody can change the phase or rate outside the window.

### Phase 4: Hardening before public launch (≈1–2 weeks, then ongoing)
- [ ] Rate limits on create, join, and rate; Turnstile on room creation.
- [ ] Nickname filtering and abuse reporting.
- [ ] RLS and RPC penetration pass: try every table and function as anon, non-member, kicked player, and expired phase.
- [ ] Load test with about 200 concurrent rooms on Realtime; check Supabase tier limits.
- [ ] Backups/PITR, an incident runbook, and dependency update automation.
- **Exit:** a security checklist signed off and multiplayer opened publicly.

### Phase 5: Optional, driven by data
- Leaderboards (streaks, completions, daily topic) and friends or private groups.
- Built-in voice for remote rooms (LiveKit or Daily), only if usage shows demand.
- An opt-in AI Coach (qualitative only), possibly paid.
- Classroom mode: teacher-hosted rooms with larger audiences and a separate privacy model.

---

## 10. Open decisions (need product input)

1. ~~**Primary multiplayer setting**~~ **Decided 2026-10-27:** players are in person or on their own call; no in-app voice.
2. **Minimum age / classroom audience:** this decides the compliance scope (COPPA).
3. ~~**Room visibility**~~ **Decided 2026-10-27:** invite-only codes and links, guest nicknames, no public matchmaking.
4. **Monetization:** if there will be a paid tier, the AI Coach and classroom mode are the natural candidates; core play stays free.
