# Draw Manager

A construction **draw management** app built for a custom-home builder — it replaces the
spreadsheet a contractor and their bank pass back and forth on a build. It tracks the full
financial life of a project: the line-item budget by vendor, what each draw pays out, change
orders with an approval trail, lien waivers, and bank-ready draw paperwork.

Live in production for the client (deployed on Vercel).

## Try the demo

```bash
# 1. Start a Postgres (Docker shown; any Postgres works)
docker run -d --name draw-demo-db -e POSTGRES_PASSWORD=demo -e POSTGRES_DB=draws -p 5432:5432 postgres:16

# 2. Point the app at it
echo 'DATABASE_URL=postgresql://postgres:demo@localhost:5432/draws' > .env

# 3. Install, create schema, seed fictional demo data
npm install
npx prisma generate && npx prisma db push
npm run seed          # prints the demo password

# 4. Run
npm run dev           # http://localhost:3337
```

**Sign in with password `demo2026`** (it's also shown on the login page). The seeded project —
owner, address, vendors, and every dollar amount — is fictional.

## What it does

- **Projects & line items** — a contract broken into vendor line items (original vs. adjusted
  contract, paid-to-date, retention withheld), the same structure a bank's draw worksheet uses.
- **Draws & payments** — payments recorded against line items per draw number, with a full
  payment history.
- **Change orders** — additions/deductions per line item with reason, approver, and date;
  adjusted contract totals update automatically.
- **Lien waiver tracking** — per-line-item waiver status, so nothing gets funded without paper.
- **Analytics & history** — budget vs. actual by category, project-level progress.
- **PDF output** — bank-ready draw documents generated client-side (jsPDF).
- **Settings-driven** — company info, alert toggles, and the app password live in the DB.

## Engineering notes

- **All money is integer cents** — no floating-point currency math anywhere.
- Next.js App Router with route groups for auth vs. app shells; a lightweight cookie session
  guards every app route via middleware.
- Prisma with the `@prisma/adapter-pg` driver adapter; schema push + seed for zero-friction
  setup.

## Stack

Next.js (App Router) · TypeScript · Prisma + PostgreSQL · Tailwind · Recharts · jsPDF · Zustand
