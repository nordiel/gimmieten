# Workflow

How work gets tracked and done on GimmieFive. GitHub Issues hold the record; the **GimmieFive** project board holds the order.

## The board

| Status | Meaning |
| --- | --- |
| **Backlog** | Captured. Might be vague. Not ready to start. |
| **Ready** | Has clear "Done when" criteria and no open questions. Anyone (including Claude) can pick it up. |
| **In progress** | Someone is on it. One or two at a time. |
| **In review** | A PR is open, or Nordiel needs to check something. |
| **Done** | Merged, deployed, or otherwise finished. Closing an issue moves it here automatically. |

**Priority:** P0 = now, P1 = next, P2 = later. **Size:** XS (under an hour) · S (an afternoon) · M (a day or two) · L (several days) · XL (split it).

**Milestones** are the roadmap phases in [`ROADMAP.md`](ROADMAP.md).

## Who does what: the `mode:` labels

| Label | Meaning |
| --- | --- |
| `mode: claude-solo` | Claude can take it from start to PR without input: the "Done when" list is the spec. |
| `mode: duo` | Needs decisions, taste, or review along the way. Work on it together. |
| `mode: nordiel-only` | Needs Nordiel's accounts, dashboards, money, or judgment (DNS, billing, native-speaker review). |

Other labels: `type: …` (feature, bug, chore, docs, security, content), `area: …` (which part of the app), `epic` (a phase-sized tracking issue), `needs-decision` (blocked on a product call).

## Working with Claude

- **"Work on #12"**: Claude reads the issue, branches, implements, runs the checks, and opens a PR that closes the issue.
- **"Pick the next ready issue"**: Claude takes the highest-priority `mode: claude-solo` issue in **Ready**.
- **"Add an issue for …"**: Claude files it with labels, priority, and size, and puts it in Backlog.
- Claude never merges to `main` or touches accounts and dashboards without being asked.

## Conventions

- Branch: `<issue-number>-<short-slug>`, e.g. `12-timer-sound`.
- PR description starts with `Closes #12` so merging closes the issue.
- Every PR passes `npm run typecheck`, `npm test`, and `npm run build`.
- New UI text goes in both `src/i18n/en.ts` and `src/i18n/es.ts`.

## Capturing ideas fast

Open a blank issue with just a title. Triage later: add labels, priority, size, and move it to Ready once "Done when" is clear.
