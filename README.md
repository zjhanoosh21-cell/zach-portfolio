# Zach Hanoosh — Portfolio

This repo collects the systems I've designed and built end-to-end: production client software,
internal tooling, and personal projects.

**🌐 Portfolio site:** https://zjhanoosh21-cell.github.io/zach-portfolio/

**▶ Live demos — click around, nothing to install:**

| App | URL | Sign in |
|---|---|---|
| Recruiting CRM | https://zach-crm-demo.vercel.app | `demo@example.com` / `DemoPass123!` |
| Draw Manager | https://zach-draw-demo.vercel.app | password `demo2026` |

## Projects

| Project | What it is | Stack | Status |
|---------|-----------|-------|--------|
| [Recruiting CRM](projects/recruiting-crm/) | Custom CRM for a legal-staffing recruiting firm — candidates, jobs, clients, analytics, AI-scored intake. **Runnable demo** with seeded data + demo login | Next.js (App Router), Prisma + Postgres, Tailwind, Docker | In production use by client |
| [Draw Manager](projects/draw-manager/) | Construction draw management for a custom-home builder — line-item budgets, draws, change orders, lien waivers, bank-ready PDFs. **Runnable demo** with seeded data + demo login | Next.js, Prisma + Postgres, Tailwind, jsPDF | In production use by client (Vercel) |
| [Resume Scanner](projects/resume-scanner-n8n/) | 44-node n8n workflow: watches a Gmail inbox, parses resumes with an LLM, scores candidates, and feeds the CRM via API | n8n, OpenAI (o4-mini), Gmail API, TypeScript migration script | Live, in daily client use |
| [Odyssey Marketing Site](projects/odyssey-website/) | The builder's public marketing site — 8 pages, gallery, SEO-first structure. **Live at [chooseodyssey.com](https://chooseodyssey.com)** | Static HTML/CSS/JS, Vercel edge | Live on the public web |
| [Prospect Engine](projects/prospect-engine/) | Generates a fully branded proof-of-concept website per sales prospect — real logo, sampled brand colors, trade-matched content — served on a wildcard preview domain | Next.js dynamic routing, Vercel, JSON-driven site schema | Live (v2), used for real outreach |
| [Sage — Personal Finance Advisor](projects/sage-finance-advisor/) | Local-first finance app with a Claude-powered advisor that updates your accounts, budget, and goals directly from conversation (streaming + tool use) | Next.js, Prisma + SQLite, Anthropic SDK, Recharts, Tailwind v4 | Personal project, feature-complete |
| [Web Biz Tracker](projects/web-biz-tracker/) | Lightweight operations tracker — phases, tasks, prospects, and a shared activity feed with auth | Next.js, Prisma + SQLite | Earlier personal project |

## What these show

- **Production ownership** — the CRM and resume scanner are live systems a client runs their
  business on: Dockerized deployment, migrations, API contracts between systems, and an
  AI pipeline with human-in-the-loop review.
- **AI beyond chatbots** — LLMs wired into real workflows: tool-using agents (Sage), document
  extraction and scoring (resume scanner), and programmatic content/brand generation
  (Prospect Engine).
- **Full-stack range** — schema design through UI polish, plus the unglamorous parts:
  deployment docs, entrypoint scripts, idempotent sync jobs, and secrets hygiene.

## Try the apps

The two client apps are **hosted as live demos** (links above) with the demo login printed
right on each sign-in page. To run them yourself instead, each has a one-command demo path
(Docker Postgres → migrate → seed → run) documented in its README.

All demo data is fictional — invented people, firms, addresses, and dollar amounts. No real
candidate resumes, homeowner records, prospect data, environment files, or databases are in
this repo, and the n8n workflow export is sanitized (placeholder endpoints, no credentials).

---

📫 zjhanoosh21@gmail.com
