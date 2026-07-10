# Case Study: An AI Operating System for a Real Agency

**The problem:** a two-founder agency where both founders work limited hours around W-2 jobs.
Context lived in two heads and a group chat. Follow-ups slipped, decisions got re-litigated,
and every AI session started from zero.

**What I built:** a git-versioned "shared brain" plus three named AI teammates, all running on
Claude Code. It's not a demo — it runs the agency day to day.

## Architecture: markdown as the database, git as the sync layer

The repo carries a `brain/` directory — the shared source of truth both founders (and every
AI session) read and write:

| File | Role |
|------|------|
| `STATUS.md` | Live dashboard — every client and project, stage, owner, blockers |
| `clients/<slug>.md` | Per-client deep file: scope, systems built, contacts, interaction log, next actions |
| `PIPELINE.md` | Sales funnel + prospect inbox |
| `DECISIONS.md` | Append-only decision log with dated one-line rationales |
| `BACKLOG.md` / `scrum-log.md` | Queued work + weekly meeting history with a "captured since last scrum" buffer |
| `playbooks/` | Repeatable how-tos (onboarding, review-automation package, prospect engine) |

A root `CLAUDE.md` boots every session: read the brain first, act second, and **write back as
work happens** — status changes, decisions, client touchpoints, and new ideas get captured in
real time, so the weekly scrum reviews a week that already wrote itself. `git pull` is how one
founder receives the other's context.

## The AI teammates

Each is an agent skill with a name, a scope, and hard guardrails — the founders address them
like staff:

- **Pam (project manager)** — the "silent PM" behavior baked into every session: keeps the
  brain in sync, logs decisions, runs the weekly scrum from a playbook.
- **Sal (sales ops)** — follow-up sweeps, inbound lead triage, discovery-call prep, proposal
  drafts, funnel scoreboard. Runs on a weekday morning schedule *and* on demand.
- **Cora (content)** — sweeps shipped work for content ideas, drafts blog posts and short-form
  cuts, manages a consent-gated case-study queue.

## The design rule that makes it safe: draft-and-hold

**No agent sends anything.** Sal drafts the follow-up; a founder taps send. Cora drafts the
post; publishing is a human commit + push. Autonomy level is itself a logged decision. This
one constraint is what lets AI operate the pipeline without risking the brand's voice or a
client relationship.

## Results

- Client state, decisions, and pipeline survive across sessions, machines, and founders —
  onboarding an AI session to full company context takes one file read.
- Follow-ups stopped depending on memory: the sales desk surfaces what's due each morning.
- The weekly scrum went from reconstruction ("what happened this week?") to review.

## Why it's in this portfolio

It demonstrates system design where the hard part isn't code: choosing markdown + git over a
database app (see [Web Biz Tracker](../projects/web-biz-tracker/) — the app I built first and
retired), designing agent guardrails that make automation trustworthy, and building AI
workflows a non-technical operator actually uses every day.

> The brain's contents are the agency's confidential business data, so this is a case study
> rather than a code drop; the patterns (boot sequence, update protocol, draft-and-hold) are
> the portable part.
