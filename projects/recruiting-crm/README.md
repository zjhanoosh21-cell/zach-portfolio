# Recruiting CRM

A custom CRM built for a legal-staffing recruiting firm, replacing a patchwork of spreadsheets
and a legacy applicant-tracking export. It manages the firm's whole desk: candidates, jobs,
client companies, and pipeline analytics — with an AI-scored intake feed arriving automatically
from the companion [resume-scanner n8n workflow](../resume-scanner-n8n/).

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

> **Note:** client work. Environment files, uploaded resumes, and all candidate data are
> excluded from this copy.
