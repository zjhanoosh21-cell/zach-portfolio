# Web Biz Tracker

A lightweight operations tracker I built while standing up a web/AI services business —
one place for the work (phases → tasks), the pipeline (prospects), and the running
conversation (a shared notes feed), with multi-user auth.

## Try it

```bash
cp .env.example .env   # defaults work for local demo (SQLite)
npm install
npm run db:migrate     # creates prisma/dev.db
npm run db:seed
npm run dev            # http://localhost:3000
```

Sign in with **`zach@example.com` / `password`** (seeded demo users — all seeded
prospects, tasks, and playbook content are demo data).

## Features

- **Phases & tasks** — ordered project phases with assignable, statused tasks
- **Prospect tracking** — a simple pipeline with assignees
- **Activity feed** — shared notes so two founders stay in sync
- **Auth** — email/password with hashed credentials, per-user assignment throughout

## Stack

Next.js (App Router) · Prisma + SQLite · TypeScript · Tailwind

## Where it fits

Eventually replaced by a lighter git-and-markdown workflow — the lesson being that for a
two-person team, plain files an AI can read and update beat a database app you have to
maintain.
