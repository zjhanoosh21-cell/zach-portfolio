# Resume Scanner — n8n AI Intake Workflow

A 44-node n8n workflow that turns a recruiting firm's email inbox into a structured,
AI-scored candidate pipeline. It's the front door of the [Recruiting CRM](../recruiting-crm/):
resumes arrive by email, and scored candidates appear in the CRM minutes later.

## Pipeline

1. **Watch** a Gmail inbox for incoming applications (labels track processing state so nothing
   is double-handled).
2. **Extract** resume attachments and parse them.
3. **Score** each candidate with an LLM (OpenAI o4-mini) against the firm's evaluation
   framework — producing a structured summary, skills extraction, and fit score.
4. **Deliver** the result to the CRM's intake API (`/api/intake/candidate`), where recruiters
   review it in the candidate navigator.

## Engineering notes

- **Idempotent by design** — Gmail labels + thread tracking make re-runs safe.
- **Credentialed, not hardcoded** — API keys live in n8n credentials, not workflow JSON
  (moved off an earlier inline-key setup as part of production hardening).
- **Paired-item correctness** — n8n's item-pairing semantics across merge/split nodes were a
  real source of subtle bugs; the workflow includes fixes for those paths.
- `import-resumate.ts` — the one-off TypeScript script that migrated the firm's legacy ATS
  export into the CRM at cutover.

## Status

Live and in daily use by the client.

> **Note:** this export is sanitized — the client's production endpoints and addresses are
> replaced with `example.com` placeholders, and no credentials are embedded (API keys live in
> n8n credentials, referenced by ID only). The workflow file is `resume-scanner.json`.
