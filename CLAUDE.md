# GimmieFive

Gamified learning: random topic → 5 minutes of research (no AI) → explain it aloud in 1 minute → self-rate. The brand is GimmieFive; the domain (gimmieten.com) and repo keep the old name. React 18 + TypeScript + Vite 6 + Tailwind 3, client-only, `localStorage` persistence. English and Spanish.

## Commands

- `npm run dev`: dev server
- `npm run typecheck` · `npm test` · `npm run build`: all three must pass before a PR

## Where things live

- Game logic is pure and tested: `src/lib/` (timer, session reducer, streak, score, random topic picking, validated storage).
- `src/hooks/useGameState.ts` connects that logic to React and persistence.
- Screens: `src/pages/` (challenge phases in `src/pages/challenge/`). Shared UI: `src/components/`.
- Topics: `src/data/topics.ts`. Ids are derived from the English title, so never rename an English title of a topic people may have played.
- UI text: `src/i18n/en.ts` (source) and `src/i18n/es.ts` (type-checked to match). No hardcoded strings in components.

## Rules of the game logic

- Timings live only in `src/lib/rules.ts`; i18n copy interpolates them, so never hardcode a duration in text.
- Timers are timestamp-based (`runningSince` + `accumulatedMs`), never tick-decremented.
- Session transitions are guarded by phase in `sessionReducer`; keep them idempotent.
- Time's-up alerts (tab title, chime, notification) live in `src/components/SessionAlerts.tsx` + `src/lib/alerts.ts`, mounted at app level so they survive page switches. Browsers only allow sound after a click, so call `unlockAudio()` from click handlers that start timers.
- Research notes are wiped when research ends and must never render after that.
- Self-assessment scores are labelled as such and never ranked against other players.

## Workflow

Party mode (multiplayer) is specified in `docs/PARTY_MODE.md`; follow it over the roadmap where they differ.

Work is tracked in GitHub Issues and the GimmieFive project board. See `docs/WORKFLOW.md` for statuses, labels, and conventions. `docs/ROADMAP.md` has the plan.

- Branch as `<issue>-<slug>`, open a PR whose body starts with `Closes #<issue>`.
- Don't merge to `main`, deploy, or change GitHub/Cloudflare/Namecheap settings unless asked.
- `gh` is installed at `/opt/homebrew/bin/gh`.
