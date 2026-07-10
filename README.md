# Zach Hanoosh — Portfolio

Full-stack developer and AI-systems builder. Co-founder of **Adaptive AI Services**, a two-person
agency building custom CRMs, AI automations, and client-facing web apps for small businesses —
where I own the CRM, integration, and build side of the house.

This repo collects the systems I've designed and built end-to-end: production client software,
internal agency tooling, and personal projects.

## Projects

| Project | What it is | Stack | Status |
|---------|-----------|-------|--------|
| [Recruiting CRM](projects/recruiting-crm/) | Custom CRM for a legal-staffing recruiting firm — candidates, jobs, clients, analytics, AI-scored intake | Next.js (App Router), Prisma + Postgres, Tailwind, Docker | In production use by client |
| [Resume Scanner](projects/resume-scanner-n8n/) | 44-node n8n workflow: watches a Gmail inbox, parses resumes with an LLM, scores candidates, and feeds the CRM via API | n8n, OpenAI (o4-mini), Gmail API, TypeScript migration script | Live, in daily client use |
| [Prospect Engine](projects/prospect-engine/) | Generates a fully branded proof-of-concept website per sales prospect — real logo, sampled brand colors, trade-matched content — served on a wildcard preview domain | Next.js dynamic routing, Vercel, JSON-driven site schema | Live (v2), used for real outreach |
| [Sage — Personal Finance Advisor](projects/sage-finance-advisor/) | Local-first finance app with a Claude-powered advisor that updates your accounts, budget, and goals directly from conversation (streaming + tool use) | Next.js, Prisma + SQLite, Anthropic SDK, Recharts, Tailwind v4 | Personal project, feature-complete |
| [Web Biz Tracker](projects/web-biz-tracker/) | Lightweight agency operations tracker — phases, tasks, prospects, and a shared activity feed with auth | Next.js, Prisma + SQLite | Earlier personal project |
| [Agency AI Operating System](case-studies/ai-operating-system.md) | Case study: a git-based "shared brain" + three named AI teammates (PM, sales ops, content) that run a real agency on Claude Code | Claude Code, agent skills, markdown-as-database | Live, runs the agency daily |

## What these show

- **Production ownership** — the CRM and resume scanner are live systems a client runs their
  business on: Dockerized deployment, migrations, API contracts between systems, and an
  AI pipeline with human-in-the-loop review.
- **AI beyond chatbots** — LLMs wired into real workflows: tool-using agents (Sage), document
  extraction and scoring (resume scanner), programmatic content/brand generation (Prospect
  Engine), and agentic operations (the agency OS).
- **Full-stack range** — schema design through UI polish, plus the unglamorous parts:
  deployment docs, entrypoint scripts, idempotent sync jobs, and secrets hygiene.

## Notes on client work

Client projects here are included with identifying data removed — no candidate resumes,
prospect records, environment files, or databases are in this repo. This repo is private;
the resume-scanner workflow JSON still references the client's production domain and would
need a sanitization pass before any public sharing.

---

📫 zjhanoosh21@gmail.com
