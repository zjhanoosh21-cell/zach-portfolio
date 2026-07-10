# Prospect Engine

Sales tooling that builds a **fully branded proof-of-concept website for every prospect** —
so the first message a business owner gets includes a live preview of *their* site, not a
generic pitch.

## How it works

1. **Research** — a Claude-driven research pass (Google Places + web) produces a JSON prospect
   file: business details, services, reviews, and optional branding fields.
2. **Branding (v2)** — the generator pulls the prospect's real logo, samples brand colors from
   it, and picks service-matched imagery; a per-trade config provides sensible fallbacks
   (`lib/tradeConfig.ts`).
3. **Render** — one dynamic Next.js route (`app/[slug]/`) turns each JSON file into a complete
   site: hero, services, reviews, contact.
4. **Deliver** — deployed on Vercel behind a branded wildcard preview domain, and a
   ready-to-send Gmail draft is generated for the founder to review and send
   (human-in-the-loop by design — nothing sends automatically).

## Why it's interesting

- **Sites as data** — the whole site is driven by a typed JSON schema (`lib/types.ts`);
  adding a prospect is adding a file, not writing code.
- **Programmatic branding** — logo fetching + color sampling means each POC looks
  custom-designed, at zero marginal effort.
- Used in real outreach: batches of first-touch messages have gone out with these previews
  attached.

## Stack

Next.js (App Router, dynamic `[slug]` routing) · TypeScript · Tailwind · Vercel

> **Note:** the `prospects/` data directory (real businesses researched for outreach) is
> excluded from this copy.
