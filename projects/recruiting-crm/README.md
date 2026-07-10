# Recruiting CRM

A custom CRM built for a legal-staffing recruiting firm, replacing a patchwork of spreadsheets
and a legacy applicant-tracking export. It manages the firm's whole desk: candidates, jobs,
client companies, and pipeline analytics — with an AI-scored intake feed arriving automatically
from the companion [resume-scanner n8n workflow](../resume-scanner-n8n/).

## Try the demo

**Hosted:** https://zach-crm-demo.vercel.app — sign in with `demo@example.com` / `DemoPass123!`.

Or run it locally:

```bash
# 1. Start a Postgres (Docker shown; any Postgres works)
docker run -d --name crm-demo-db -e POSTGRES_USER=cri -e POSTGRES_PASSWORD=demo -e POSTGRES_DB=cri_crm -p 5432:5432 postgres:16

# 2. Configure — copy the template and set two values:
cp .env.example .env
#    DATABASE_URL=postgresql://cri:demo@localhost:5432/cri_crm
#    NEXTAUTH_SECRET=<any long random string, e.g. `openssl rand -base64 32`>

# 3. Install, migrate, seed the fictional demo dataset (also creates the demo login)
npm install
npx prisma migrate deploy
npm run seed-demo

# 4. Run
npm run dev           # http://localhost:3000
```

**Sign in with `demo@example.com` / `DemoPass123!`** (also shown on the login page). The seed
loads a fictional desk: 17 candidates across every pipeline stage — AI-scored intake, legacy
imports, manual entries, two placements with fees — plus 3 law-firm clients and 7 job orders,
so every screen has something real-looking to click through. All of it is made up: example.com
emails, 555 phone numbers, invented names and firms.

## What it does

- **Candidate management** — searchable, filterable candidate database with a "navigator" API
  for fast keyboard-driven review, multi-select faceted filters (including a dynamic
  applied-role filter), and print-friendly views.
- **AI intake pipeline** — the n8n resume scanner posts parsed, scored candidates to
  `/api/intake/candidate`; recruiters review AI summaries and scores instead of reading raw
  resumes.
- **Jobs & clients** — open roles tied to client companies, with candidate-to-job pipelines.
- **Analytics dashboard** — desk-level activity and pipeline metrics.
- **Auth** — route-grouped App Router layout with separate `(auth)`, `(app)`, and `(print)`
  shells.

## Stack & architecture

- **Next.js (App Router)** with server components and API routes
- **Prisma + PostgreSQL** for the data layer
- **Tailwind + shadcn/ui-style components** for the UI
- **Docker** — multi-stage production image with an entrypoint script that runs migrations on
  boot; `docker-compose` files for local, dev, and production; deployment runbook in
  [DEPLOYMENT.md](DEPLOYMENT.md)
- Migrated the firm's legacy candidate data in via a one-off TypeScript import script

## My role

Sole developer — schema design, API contracts (including the intake API consumed by the n8n
workflow), UI, Docker packaging, and the deployment runbook.

> **Note:** client work. Environment files, uploaded resumes, and all real candidate data are
> excluded from this copy — the only data that ships here is the fictional demo seed.
