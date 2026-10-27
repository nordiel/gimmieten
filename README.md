# GimmieFive

**5 minutes to learn. Can you explain it?**

GimmieFive is a gamified learning challenge:

1. Get a random topic.
2. Research it for 5 minutes — no AI.
3. Explain it out loud in 1 minute, without notes.
4. Rate yourself, save the result, and keep your daily streak alive.

It's available in **English and Spanish** (Settings → Language). The app runs entirely in the browser. It has no backend, no accounts, and no AI. Progress is stored in `localStorage`.

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script              | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Start the Vite dev server                      |
| `npm run build`     | Type-check and build to `dist/`                |
| `npm run preview`   | Serve the production build locally             |
| `npm run typecheck` | TypeScript only                                |
| `npm test`          | Unit tests for timers, streaks, topics, scoring, and session flow |

Tests use Node's built-in `node:test` runner. `scripts/test.mjs` bundles them with esbuild first, so Node 18 works without an extra test framework.

## Stack

React 18 · TypeScript · Vite 6 · Tailwind CSS 3 · lucide-react

## Project structure

```
src/
  App.tsx                 View switching (home / challenge / progress) and header
  types/                  Topic, ChallengeSession, TimerState, Ratings, HistoryEntry…
  data/topics.ts          108 curated topics across 9 categories, in English and Spanish
  i18n/                   en.ts (source dictionary), es.ts (type-checked to match), context hook
  lib/
    timer.ts              Timestamp-based, pausable countdown (pure functions)
    session.ts            Challenge state machine (pure reducer, phase-guarded)
    streak.ts             Calendar-day streak logic
    rules.ts              Timing rules (5 min research, 1 min explanation); UI copy reads from here
    random.ts             Topic picking that avoids repeats
    score.ts              Self-assessment scoring
    storage.ts            Validated localStorage read/write
  hooks/
    useGameState.ts       Session, history, streak, and prefs, with persistence
    useNow.ts             Clock tick for rendering timers (re-syncs on tab focus)
  components/             Button, Card, CountdownTimer, ProgressBar, RatingControl,
                          ChallengeCard, StatTile, PhaseSteps, Celebration…
  pages/
    HomePage.tsx
    ProgressPage.tsx
    SettingsPage.tsx      Language switch
    ChallengePage.tsx     Renders the screen for the current phase
    challenge/            ChallengeSetup, ResearchPhase, ExplanationPhase, ChallengeResults
tests/                    Logic unit tests
```

## How it works

- **Timers** store a duration, the time already banked, and a `runningSince` timestamp. Remaining time is always worked out from `Date.now()`, so timers don't drift in background tabs. They also survive refreshes, and pausing simply banks the elapsed time.
- **Time's-up alerts**: the tab title counts down, a synthesized chime is scheduled on the Web Audio clock (accurate even in throttled background tabs), and an opt-in browser notification fires if the tab is hidden. Alerts are mounted at app level (`components/SessionAlerts.tsx`), so they work even after switching pages mid-challenge.
- **Session state** is a pure reducer where every transition checks the current phase. That makes double clicks, an expiry racing a button press, and late dispatches harmless.
- **Notes** exist only during research. They are erased from the session when research ends, and the explanation and results screens have no way to display them.
- **Refresh safety**: the active session is saved to `localStorage`. If research ran out while the tab was closed, the app goes straight to the explanation phase on reload.
- **No duplicate saves**: each history entry uses its session's id, and saving is idempotent.
- **Streaks** count consecutive local calendar days with at least one saved challenge. Several saves on one day count once, and a streak stays alive until a full day is missed. If the stored streak is corrupt, it is rebuilt from history.
- **Topic selection** prefers topics you haven't completed or skipped in the chosen category, and only repeats a topic once fresh ones run out.
- **Bad storage data** (malformed JSON, wrong shapes) is ignored row by row instead of crashing the app.

## Adding or changing text

All UI text lives in `src/i18n/en.ts` and `src/i18n/es.ts`; components read it with `useI18n()`. `es.ts` is typed against `en.ts`, so a missing Spanish string fails `npm run typecheck`. Topics carry both languages inline in `src/data/topics.ts`. Ids are derived from the English title, so don't edit an English title once people have played it — it would orphan their history entries (they'd fall back to the stored English title).

## Limitations

- Progress lives in one browser on one device. Clearing site data erases it, and it doesn't sync anywhere.
- Scores are self-reported. There is no recording or speech recognition (deliberately left out of the MVP).
- Two tabs open at once each keep their own in-memory state. The last tab to write wins for the active session, though history never gets duplicate entries.
- `npm audit` reports a moderate, build-time-only advisory in Tailwind 3's `postcss-selector-parser`. Fixing it means moving to Tailwind 4.
