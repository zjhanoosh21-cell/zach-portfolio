# CRI CRM — Deployment Runbook (Hostinger VPS, co-located with n8n)

The CRM goes live **on the same Hostinger VPS that already runs n8n + Caddy** (Azure was dropped
2026-06-24 — CRI's IT decided no Azure server is needed). The CRM's `docker-compose.yml` already joins
the external `caddy-net` network "created by the n8n stack," so this is a co-location, not a new box.

Architecture once live:
```
ZipRecruiter email → CRI Gmail → n8n (same VPS) → POST /api/intake/candidate → CRM (Next.js+Postgres)
                                                       ↑ Caddy terminates HTTPS at crm.example.com
```

> **Security posture:** the CRM already has full app-level auth (NextAuth login, bcrypt, roles, deletion
> PIN) **plus** an API-key-gated intake endpoint. **No extra password gate (e.g. Caddy basic-auth) is
> needed** — HTTPS via Caddy + the app's own login is the model. Postgres stays on the internal Docker
> network and is never published to the internet.

Running list — check off each item. Sections are chronological.

---

## PHASE 0 — DECISIONS / PREREQUISITES

- [ ] Confirm with CRI that **us hosting the CRM (candidate data on our VPS)** is acceptable — this
      reverses the old "client-owned infra" plan. (See `brain/DECISIONS.md` 2026-06-24.)
- [ ] **Confirm the scoring model** before activating the workflow. The committed workflow JSON now uses
      `o4-mini` (matches the node name + the documented-live model). If the live n8n actually runs a
      different model, fix it in the `o4-mini` node after import.
- [ ] Confirm the VPS already has: Docker + Docker Compose, Caddy running, the `caddy-net` network, and
      the n8n stack. (`docker network ls | grep caddy` and `docker ps`.)

---

## PHASE 1 — BEFORE YOU TOUCH THE SERVER (Prepare Locally)

### Environment file
- [ ] Create `clients/cri/crm/.env` on the VPS (do **not** commit it) with:
  ```
  DB_PASSWORD=<openssl rand -base64 32>
  NEXTAUTH_SECRET=<openssl rand -base64 32>
  NEXTAUTH_URL=https://crm.example.com
  NODE_ENV=production
  ```
  - `compose` builds `DATABASE_URL` automatically from `DB_PASSWORD` (see `docker-compose.yml`).
  - `NEXTAUTH_SECRET` must be a fresh 32+ char random string — never reuse a dev secret.
  - `NEXTAUTH_URL` must be `https://` — plain HTTP breaks sessions (Secure cookies).

### DNS
- [ ] Add an **A record**: `crm.example.com` → Hostinger VPS public IP.
- [ ] Wait for propagation before the Caddy step (`dig crm.example.com`). Caddy needs the
      name resolving to the VPS to issue a Let's Encrypt cert.

---

## PHASE 2 — DEPLOY THE CRM (on the VPS)

### Get the code onto the VPS
```bash
# If the monorepo isn't already cloned:
git clone git@github.com:zjhanoosh21-cell/zach-portfolio.git ~/zach-portfolio
cd ~/zach-portfolio/projects/recruiting-crm
# Put your .env here (scp it up or create it). It is gitignored.
```

### Pre-flight
- [ ] `docker network ls | grep caddy-net` — must exist (created by the n8n stack).
      If missing: `docker network create caddy-net`.

### Build + start
```bash
docker compose up -d --build
docker compose logs -f crm   # watch startup; the entrypoint runs `prisma migrate deploy` automatically
```
The stack exposes **no public ports** — Caddy reaches the `crm` container over `caddy-net`. Verify the
app is up from inside the VPS:
```bash
docker compose exec crm wget -qO- http://localhost:3000/api/health   # → {"status":"ok"}
```

### Seed the admin user + generate the API key
> ⚠️ The production image is a slim Next.js **standalone** build — it intentionally does **not** include
> `scripts/` or `tsx`, so `docker exec crm npx tsx scripts/seed.ts` will **not** work. Seed once via a
> throwaway Node container that shares the DB container's network:
```bash
docker run --rm \
  --network "container:cri-crm-db" \
  -v "$(pwd)":/repo -w /repo \
  -e DATABASE_URL="postgresql://cri:${DB_PASSWORD}@localhost:5432/cri_crm" \
  node:20-alpine sh -lc "apk add --no-cache openssl >/dev/null && npm ci >/dev/null 2>&1 && npx prisma generate >/dev/null 2>&1 && npx tsx scripts/seed.ts --email admin@example.com --name 'Zachary' --password 'STRONG_PASSWORD_HERE'"
```
- [ ] **Copy the `crm_…` API key it prints — it is shown only once.** Store it in a password manager.
- [ ] This key goes into the n8n credential in Phase 4.

---

## PHASE 3 — CADDY REVERSE PROXY

Add the CRM site to the Caddyfile that already fronts n8n:
```caddyfile
crm.example.com {
    reverse_proxy crm:3000
}
```
- [ ] `crm` resolves over the shared `caddy-net` network (the compose service name).
- [ ] Reload Caddy: `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`
- [ ] Verify: `curl -I https://crm.example.com` → `200` with a valid cert.
- [ ] Open the URL in a browser → login page loads → log in with the seeded admin.

---

## PHASE 4 — N8N WORKFLOW CONFIGURATION

The committed workflow (`clients/cri/n8n-workflow/cri-resume-scanner.json`) is already prepped: it points
at the production URL, uses an **HTTP Header Auth credential** (not a hardcoded key), and the model node
reads `o4-mini`.

- [ ] In n8n → **Credentials → New → HTTP Header Auth**:
  - Name: `CRI CRM API Key`
  - Header Name: `X-API-Key`
  - Header Value: *(the `crm_…` key from the Phase 2 seed)*
- [ ] Import the updated `cri-resume-scanner.json` (replaces the old version).
- [ ] Open the **Post to CRM** node → confirm it uses the `CRI CRM API Key` credential, and the URL is
      `https://crm.example.com/api/intake/candidate`.
      *(Optional optimization: since n8n and the CRM share `caddy-net`, you can switch this to the
      internal `http://cri-crm:3000/api/intake/candidate` to skip the public round-trip. Verify it
      resolves first.)*
- [ ] Open the **o4-mini** node → confirm the model is what the account actually serves.
- [ ] Open the **Schedule Trigger** → confirm interval (30 min).
- [ ] **Activate** the workflow.
- [ ] Run one manual execution against a real ZipRecruiter email in the inbox.

> **Note:** there is a separate, already-diagnosed bug in the *live* workflow (`SEND` Gmail node throws
> `paired_item_multiple_matches`; candidates miss their folder label + result emails duplicate — see
> `brain/clients/cri.md` 2026-06-25). Decide with Zach whether to fold that fix into this re-import or
> patch live separately, so re-importing this JSON doesn't regress it.

---

## PHASE 5 — POST-DEPLOYMENT VERIFICATION

### Smoke tests
- [ ] Login as admin works.
- [ ] Candidate created via n8n intake shows all fields (name, score, tier, triage action, resume download).
- [ ] Resume file downloads correctly from the CRM UI.
- [ ] Result email arrives with score card + resume attachment; Gmail label `CRI Agent/<role>` applied;
      original email marked read.

### Access & security
- [ ] Confirm the admin password is strong (or change it: `scripts/reset-password.ts` via the same
      throwaway-container pattern as the seed).
- [ ] Set a deletion PIN: Settings → Deletion PIN (in the CRM UI).
- [ ] Confirm uploads persist across restarts:
      `docker compose down && docker compose up -d` → an existing resume still downloads.
- [ ] Confirm Postgres (5432) is **not** published — the production `docker-compose.yml` has no `ports:`
      on `crm-db`; keep it that way.

---

## PHASE 6 — ONGOING MAINTENANCE

### Backups
- [ ] Cron the included script on the VPS:
  ```bash
  0 2 * * * /home/<user>/zach-portfolio/projects/recruiting-crm/scripts/backup-db.sh >> /var/log/cri-backup.log 2>&1
  ```
- [ ] Test a restore before relying on it.

### Updates
```bash
git pull
docker compose up -d --build crm   # rebuilds only the app container; migrations run on startup
```

### Monitoring
- [ ] `docker compose logs crm` periodically.
- [ ] Watch for `⚠️ CRM Intake FAILED` alert emails from n8n (a candidate didn't land).
- [ ] Watch VPS disk — resumes accumulate in the `crm-uploads` volume.

---

## QUICK REFERENCE

| Item | Value |
|------|-------|
| Production URL | `https://crm.example.com` |
| Intake endpoint | `POST /api/intake/candidate` (header `X-API-Key`) |
| Health endpoint | `GET /api/health` → `{"status":"ok"}` |
| API key location | n8n credential `CRI CRM API Key` (HTTP Header Auth) |
| App container | `cri-crm` (service `crm`, port 3000, not published) |
| DB container | `cri-crm-db` (service `crm-db`, Postgres 16, not published) |
| Docker volume (DB) | `crm-db-data` |
| Docker volume (uploads) | `crm-uploads` |
| Shared network (with Caddy/n8n) | `caddy-net` (external) |
| Internal network | `cri-crm-net` |
| Workflow schedule | Every 30 minutes |
| Admin / alert email | `admin@example.com` |

---

## RUN IT LOCALLY (deployed-state mirror)

To preview the CRM exactly as it deploys — production Docker image, migrations on startup — on your
laptop (see `docker-compose.local.yml`, which only adds published ports for local browser access):
```bash
cd clients/cri/crm
docker network create caddy-net 2>/dev/null || true
docker compose --env-file .env.local-prod -f docker-compose.yml -f docker-compose.local.yml up -d --build
# seed (host has node_modules; DB is published on localhost:5432 by the local override):
DATABASE_URL="postgresql://cri:<DB_PASSWORD>@localhost:5432/cri_crm" \
  npx tsx scripts/seed.ts --email you@example.com --name "You" --password "yourpassword"
# open http://localhost:3000  (use Chrome — Secure session cookies work on http://localhost there)
```
Tear down: `docker compose -f docker-compose.yml -f docker-compose.local.yml down` (add `-v` to wipe data).
For rapid code iteration instead of the prod image, use dev mode: `docker compose -f docker-compose.dev.yml up -d`
(Postgres only) then `npm run dev`.
