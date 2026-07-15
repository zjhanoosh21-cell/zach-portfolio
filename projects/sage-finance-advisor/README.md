# Sage — your personal financial advisor

> **Work in progress** — Sage is an active personal project, not a finished product.

**Hosted preview:** https://zach-sage-demo.vercel.app — fictional demo data, fully browsable.
The live AI advisor is disabled in the preview (it runs against a real Claude API key when
self-hosted); a seeded conversation on the Advisor page shows what a session looks like,
including the tool calls it makes.

A private, local-first finance app. Enter your accounts, income, budget, and goals —
or just *tell Sage about them in chat* and it records everything for you, builds your
budget, proposes goals, and gives advice grounded in your actual numbers.

Everything lives in a local SQLite database on your machine. Chat messages go to the
Claude API to generate responses; nothing else leaves your computer.

## Features

- **Sage advisor chat** (Claude-powered, streaming) — interviews you like a first
  meeting with an advisor, and uses tools to update your profile, accounts, income,
  budget categories, and goals directly from conversation. Persistent conversations +
  advisor memory notes.
- **Dashboard** — net worth trend, asset allocation, savings rate, emergency-fund
  months, rule-based observations, goal progress, debt table ordered by APR.
- **Accounts** — assets and debts with APRs, plus per-holding tracking for
  investment accounts.
- **Budget** — income sources (any pay frequency), needs/wants/savings categories,
  allocation bar with 50/30/20 framing, unallocated/over-budget callout.
- **Goals** — targets, deadlines, priority, and "$/mo to stay on pace" math.
- **Settings** — profile, API-key status, JSON export.

## Setup

```bash
npm install
cp .env.example .env            # DATABASE_URL (already correct for local)
echo 'ANTHROPIC_API_KEY=sk-ant-…' > .env.local
npx prisma migrate dev          # creates prisma/dev.db
npm run dev                     # http://localhost:3000
```

Without an API key everything works except the advisor chat (it shows a setup hint).

## Stack

Next.js (App Router) · Prisma 6 + SQLite · @anthropic-ai/sdk (`claude-opus-4-8`,
streaming + tool use) · Tailwind v4 · Recharts. Single-user by design; the schema and
data layer are structured so auth + Postgres can be added later (see the comment in
`prisma/schema.prisma`).
