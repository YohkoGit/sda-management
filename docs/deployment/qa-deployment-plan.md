# QA Deployment Plan — Continuation Doc

> **Read this when**: you're resuming the QA deployment work from a fresh
> context. Pair with `~/.claude/projects/.../memory/MEMORY.md` and the linked
> memory files for high-level decisions.

---

## TL;DR

We are bringing up a **QA environment** for the SDAC ST-HUBERT Operations app on
**berrysmart** (the home server, Beelink EQ14, Ubuntu 24.04). Public reach is
via **Cloudflare Tunnel** at `qa.sdac.yohko.ca`. Storage backend for avatars
(and future cover images) is **Cloudflare R2**, an S3-compatible bucket.
Prod deployment is deferred to the end of the cycle; the same Docker image
will deploy there unchanged.

Out of a 12-task plan, **6 are done**:
- #4 IBlobStore abstraction — Local + S3
- #5 AvatarService refactor — version column + blob-backed
- #6 Multistage Dockerfile + local smoke validation (also added missing
  production wiring in `Program.cs`)
- 3 production bug fixes the smoke surfaced (Alpine tzdata, /api fallthrough,
  startup migrations)

Pending: Cloudflare bootstrap (#1, #2, #3 — user does in browser), CI/CD (#7),
berrysmart compose stack (#8, #9, #10), runbook (#11), first deploy (#12).

---

## North star (don't relitigate)

These decisions are **locked in** and documented in memory. Don't re-debate
unless something specific has changed:

| Decision | Choice | Why | Memory ref |
|---|---|---|---|
| QA host | `berrysmart` (Beelink EQ14) | Already running, zero incremental cost, real Docker target | `reference_berrysmart_homeserver.md` |
| Public exposure | Cloudflare Tunnel | Real custom HTTPS URL, no home-network exposure, Google OAuth-compatible | `project_qa_environment_strategy.md` |
| Domain | `yohko.ca` at Cloudflare Registrar (~CAD $11/yr) — already purchased | One root for all personal projects | `project_qa_environment_strategy.md` |
| Blob provider | Cloudflare R2 | S3-compatible, free egress, same Cloudflare account, $0/mo at scale | n/a |
| Reverse proxy | Caddy in compose | Internal TLS termination, structured logs, security headers | n/a |
| Image refresh | Cron pull-and-restart, every 5 min (pins to `:qa` tag, not Watchtower) | Respects berrysmart's "no Watchtower" convention | `reference_berrysmart_homeserver.md` |
| Build location | GitHub Actions → GHCR | N150 is slow at .NET compile; GHCR is free for private repos | n/a |
| Avatar refactor scope | Fork B (version column in DB) | Removes sync I/O from hot list-endpoint paths; cleaner abstraction | n/a |
| Cover image storage | Same `IBlobStore` abstraction, separate per-kind service when story arrives | Foundation laid, specific cover service deferred (no speculative scope) | n/a |
| Secrets in QA | `.env` file at `~/berrysmart/config/sdac-qa/.env`, mode 600 | Tier-1 sufficient for QA; prod will use a real secret store | n/a |
| Currency | CAD | Elisha is in Montreal | `user_location_currency.md` |
| Azure region (when prod) | Canada East (Quebec City) | Closest to Montreal | `user_location_currency.md` |
| Prod nonprofit credit | Apply via TechSoup Canada to Microsoft for Nonprofits | $2K USD/yr Azure credit; likely eligible | `user_location_currency.md` |

---

## What's already done (don't redo)

### #4 — `IBlobStore` abstraction (Local + S3)
Files added at `src/SdaManagement.Api/Storage/`:
- `IBlobStore.cs` — interface with `PutAsync(key, stream, contentType, ct)`,
  `GetAsync(key, ct) → BlobReadResult?`. Record:
  `BlobReadResult(Stream Content, DateTime LastModifiedUtc, string ETag)`.
- `LocalDiskBlobStore.cs` — file-backed; rejects `..` and absolute paths in
  keys. Reads `BlobStorage:LocalDisk:BasePath` (default `data/blobs`).
- `S3BlobStore.cs` — `AWSSDK.S3` 4.0.23.2; `ForcePathStyle=true` (required
  for R2). Reads `BlobStorage:S3:{Endpoint,Bucket,AccessKeyId,SecretAccessKey}`.
- `ImageProcessor.cs` — static helper extracted from AvatarService for reuse
  by future cover services. `NormalizeToWebpAsync(src, dst, maxDim, quality,
  mode, ct)`.

DI: registered in `ServiceCollectionExtensions.RegisterBlobStore` based on
`BlobStorage:Provider` (`LocalDisk` | `S3`), singleton lifetime.

Tests: `tests/SdaManagement.Api.UnitTests/Storage/LocalDiskBlobStoreTests.cs`
(6 tests covering put/get/missing-key/path-traversal/absolute-path/empty-key).

### #5 — AvatarService refactor (Fork B: version column)
- EF migration: `20260515202809_AddUserAvatarVersion` adds
  `users.avatar_version int NOT NULL DEFAULT 0`.
- `AvatarService` (now scoped) — `IBlobStore` + `AppDbContext`:
  - `SaveAvatarAsync` normalizes → puts to `avatars/{userId}.webp` → bumps
    `User.AvatarVersion` via `ExecuteUpdateAsync` (atomic SQL).
  - `GetAvatarAsync(int) → AvatarReadResult(Stream, int Version)?` —
    reads version from DB, returns null if 0; else reads blob.
  - `HasAvatarAsync(int)` — DB-backed (was filesystem).
  - `GetAvatarUrl(int userId, int avatarVersion)` — pure, no I/O.
- `AvatarsController.Get` — ETag is now `"\"{Version}\""`. 304 path disposes
  the stream before returning.
- 8 callers refactored to project `AvatarVersion` from EF queries and inline
  the URL format (`"/api/avatars/" + u.Id + "?v=" + u.AvatarVersion`) so it
  translates to SQL — eliminates the N+1 syscall pattern. `IAvatarService`
  dependency removed from `UserService`, `DepartmentService`, `ActivityService`,
  `CalendarService`, `PublicService`. Retained in `AuthController`,
  `AuthService`, `DatabaseSeeder` (legitimate uses).
- Test factory now uses `BlobStorage:LocalDisk:BasePath` instead of
  `AvatarStorage:Path` (the `Path` setting was removed; `MaxDimension` and
  `MaxFileSizeBytes` remain because they're still used).
- Integration test dropped its `File.SetLastWriteTimeUtc` hack — version
  auto-bumps make it unnecessary.
- 271 unit + 481 integration tests green.

### #6 — Multistage Dockerfile + Production wiring
Files added at repo root:
- `Dockerfile` — 3 stages:
  1. `node:20-alpine` → `npm ci` + `npm run build` → `dist/`
  2. `mcr.microsoft.com/dotnet/sdk:10.0-alpine` → `dotnet publish -c Release`
  3. `mcr.microsoft.com/dotnet/aspnet:10.0-alpine` runtime — installs `tzdata`
     (Alpine has no IANA tz database, `PublicService.QuebecTimeZone` 500'd
     without it), uses built-in `app` non-root user, copies publish output +
     `dist/` → `wwwroot/`, owns `/app/data` for LocalDisk blob writes.
     Healthcheck via wget (BusyBox) on `/health`.
- `.dockerignore` — excludes node_modules, bin, obj, dist, screenshots,
  _bmad, .git, .env, etc.
- `docker-compose.smoke.yml` — local smoke harness (postgres-17-alpine with
  tmpfs data dir + api container with `BlobStorage:Provider=LocalDisk` + fake
  Google OAuth values for boot). Used to validate the image before pushing
  changes.

Production wiring added to `Program.cs` (was missing per architecture doc):
- `await dbContext.Database.MigrateAsync()` on startup, inside the scoped
  using-block before `seeder.SeedAsync()`.
- `app.UseDefaultFiles()` + `app.UseStaticFiles()` early in the pipeline
  (right after exception handler), to serve the SPA from `wwwroot/`.
- `app.MapFallback("/api/{**path}", ...)` → JSON 404 ProblemDetails for
  any unmatched `/api/*` path (prevents the SPA fallback from silently
  returning HTML for typo'd API routes).
- `app.MapFallbackToFile("index.html")` — final, catches all other unmatched
  routes so React Router can handle client-side navigation.

Smoke run results (validated):
- `/health` → 200 "Healthy" (proves migrations applied, DB reachable)
- `/` → 200 HTML (SPA index)
- `/dashboard`, `/calendar`, `/some/route` → 200 HTML (SPA fallback works)
- `/assets/index-*.js` → 200 JS bundle
- `/api/public/{next-activity,program-schedules,upcoming-activities,departments}`
  → 200 JSON (empty arrays for empty DB; correct)
- `/api/avatars/1` (no avatar uploaded) → 404 (correct, AvatarVersion=0)
- `/api/users` (auth required) → 401 (correct)
- `/api/foobar`, `/api/public/dashboard` (typo'd paths) → 404 ProblemDetails JSON

### Bug fixes ride-along
- **Alpine tzdata missing** — added `apk add --no-cache tzdata` to runtime.
- **`/api/*` fallthrough silent HTML** — added explicit `MapFallback` returning
  ProblemDetails 404 before the SPA fallback.
- **Migrations not auto-applied** — `MigrateAsync` call added to `Program.cs`.

---

## What remains — full task breakdown

### Recommended order
```
USER ENVIRONMENT BOOTSTRAP (~30 min, no code, do anytime)
  #1 → R2 bucket + token
  #2 → Cloudflare Tunnel
  #3 → Google OAuth client

CODE/CONFIG (Claude, parallel-safe)
  #7 → GitHub Actions
  #8 → berrysmart compose stack
  #9 → Caddyfile + .env.example
  #10 → cron scripts (backup + image-refresh)
       ↓
  #11 → QA deployment runbook (blocked by #7-#10)

INTEGRATION (Elisha runs against berrysmart)
  #12 → First deploy + verification smoke (blocked by #1, #2, #3, #11)
```

---

### #1 — Bootstrap Cloudflare R2 bucket + API token (USER)

**Where**: <https://dash.cloudflare.com> → R2 Object Storage.

**Steps**:
1. **Enable R2** if not already (one-time per account — Cloudflare may ask for
   payment info even though you stay under the free tier).
2. **Create bucket**: name `sdac-qa-images`, jurisdiction "Automatic" or
   "Eastern North America" (closer to berrysmart).
3. **Note the S3 endpoint URL** shown on the bucket page. Format is
   `https://<accountid>.r2.cloudflarestorage.com`. Save it.
4. **Create API token**:
   - R2 left nav → "Manage R2 API Tokens" → "Create API token"
   - Permission: **Object Read & Write**
   - Specify bucket: **Apply to specific buckets only** → `sdac-qa-images`
   - TTL: forever (rotate later if needed)
5. Capture (one-time visibility, R2 won't show secret again):
   - `Access Key ID`
   - `Secret Access Key`
   - Endpoint URL
6. **Save in your password manager NOW** (1Password / Bitwarden vault entry
   labelled "SDAC QA / R2"). These will be pasted into berrysmart's `.env`
   later.

**Definition of done**: bucket exists, you have endpoint+key+secret saved
where you can retrieve them later.

---

### #2 — Bootstrap Cloudflare Tunnel for `qa.sdac.yohko.ca` (USER)

**Where**: <https://one.dash.cloudflare.com> → Networks → Tunnels (Cloudflare Zero Trust).

**Steps**:
1. Make sure `yohko.ca` is added as a site in Cloudflare DNS (auto if you
   bought the domain through Cloudflare Registrar).
2. Create tunnel:
   - Click "Create a tunnel" → Cloudflared connector type
   - Name: `berrysmart-qa`
   - Save → **copy the tunnel token** (the JWT string shown in the install
     command, after `--token `). This goes into `.env` as `TUNNEL_TOKEN`.
3. On the "Public Hostname" tab of the new tunnel:
   - Subdomain: `qa.sdac` (yes, two segments — the FQDN becomes
     `qa.sdac.yohko.ca`)
   - Domain: `yohko.ca`
   - Service type: `HTTP`
   - URL: `caddy:8080` (this is the internal Docker DNS name of the Caddy
     reverse proxy on berrysmart's compose network)
   - Save
4. DNS auto-creates a CNAME `qa.sdac.yohko.ca → <tunnel-id>.cfargotunnel.com`.
   Verify it in Cloudflare DNS dashboard.
5. **Save tunnel token in password manager** ("SDAC QA / Tunnel").

**Definition of done**: tunnel exists, hostname route exists, you have the
token saved. `cloudflared` won't actually connect until task #8 runs, so the
tunnel will show as "inactive" — that's expected.

---

### #3 — Register QA Google OAuth client (USER)

**Where**: <https://console.cloud.google.com> → APIs & Services → Credentials.

**Steps**:
1. Pick or create a Google Cloud project for SDAC (if you don't have one
   already from the dev OAuth client).
2. **OAuth consent screen** — must be configured at least to "Testing" mode
   with your email as a test user. (Skip "publishing" for now; QA is
   internal.)
3. **Create OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Name: **SDAC QA**
   - Authorized JavaScript origins:
     - `https://qa.sdac.yohko.ca`
   - Authorized redirect URIs:
     - `https://qa.sdac.yohko.ca/signin-google`
4. Capture:
   - `Client ID` (looks like `<digits>-<hash>.apps.googleusercontent.com`)
   - `Client secret`
5. **Save in password manager** ("SDAC QA / Google OAuth").

> **Note on redirect URI path**: the dev project uses `/signin-google` (the
> ASP.NET Core Google authentication handler's default callback path — see
> `vite.config.ts` proxy block and `ServiceCollectionExtensions.cs` Google
> auth configuration). Keep `/signin-google` for QA. If you ever change it,
> update both the controller and the Google client config.

**Definition of done**: OAuth client exists with the QA redirect URI, you
have client ID + secret saved.

---

### #7 — GitHub Actions build-and-push workflow (CLAUDE)

**File**: `.github/workflows/build-and-push.yml`

**Behavior**:
- Triggers: push to `main`, manual `workflow_dispatch`
- Build the multistage Dockerfile
- Push to GHCR with tags:
  - `ghcr.io/yohkogit/sda-management:sha-<git-sha>` — immutable, used for prod
    promotion later
  - `ghcr.io/yohkogit/sda-management:qa` — moving tag, berrysmart's cron
    pulls this one

**Auth**: uses `${{ secrets.GITHUB_TOKEN }}` (auto-injected) with
`packages: write` permission. No long-lived PAT required for the workflow
itself. Berrysmart side needs a PAT scoped `read:packages` for the pull
(documented in #11).

**Caching**: Buildx layer cache via `cache-from`/`cache-to: type=gha`. Saves
~1–2 minutes per build by reusing the npm-restore and dotnet-restore layers.

**Skeleton**:
```yaml
name: Build & Push QA image

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/yohkogit/sda-management:sha-${{ github.sha }}
            ghcr.io/yohkogit/sda-management:qa
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

**Optional follow-up** (not part of #7 scope): a separate `ci.yml` that runs
`dotnet test` + `npm test` on PRs. Keep deploy decoupled from slow tests.

**Definition of done**: pushing a commit to `main` produces a green workflow
run that pushes both tags to GHCR. Verify by `docker pull ghcr.io/yohkogit/sda-management:qa`
from anywhere.

---

### #8 — berrysmart compose stack (CLAUDE)

**Location in repo**: `deploy/qa/docker-compose.yml`
**Location on berrysmart**: `~/berrysmart/config/sdac-qa/docker-compose.yml`
(rsync from repo or git-clone the repo and symlink).

**Services**:

| Service | Image | Purpose | Resource cap |
|---|---|---|---|
| `api` | `ghcr.io/yohkogit/sda-management:qa` | The app | `mem: 2g`, `cpus: '1.5'` |
| `postgres` | `postgres:17-alpine` | DB | `mem: 1g`, `cpus: '0.5'` |
| `caddy` | `caddy:2-alpine` | Internal reverse proxy + access logs | `mem: 128m` |
| `cloudflared` | `cloudflare/cloudflared:latest` | Tunnel connector | `mem: 128m` |

**Networking**:
- All services on the same default compose network.
- **No host port mappings** — cloudflared reaches caddy via Docker DNS
  (`http://caddy:8080`), caddy reaches api via `http://api:8080`. Postgres
  reachable only from `api`.
- Optional: expose Caddy's admin endpoint on `127.0.0.1:2019` for ops
  debugging.

**Volumes** (all under `~/berrysmart/config/sdac-qa/` on NVMe):
- `./postgres-data:/var/lib/postgresql/data` — PG storage on NVMe (small DB,
  IOPS-sensitive)
- `./caddy-data:/data` and `./caddy-config:/config` — Caddy state
- `./avatars-volume:/app/data/blobs` — bind mount as a fallback; the active
  store will be R2 via `BlobStorage:Provider=S3`, so this only matters if
  someone flips back to LocalDisk

**Healthchecks**:
- postgres: `pg_isready -U sdac -d sdac` interval 5s
- api: built-in HEALTHCHECK in Dockerfile (already covers `/health`)
- caddy: `wget --spider http://localhost:8080`
- cloudflared: relies on its own log-based liveness

**depends_on conditions**: api waits for postgres healthy; caddy waits for
api healthy; cloudflared waits for caddy healthy.

**Restart policy**: `unless-stopped` on all four (matches berrysmart convention).

**env_file**: `.env` (gitignored; documented in #9).

**Definition of done**: `docker compose pull && docker compose up -d` on
berrysmart brings all four services up healthy.

---

### #9 — Caddyfile + .env.example (CLAUDE)

**Caddyfile** at `deploy/qa/Caddyfile`:

```caddy
:8080 {
    encode gzip

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options    "nosniff"
        Referrer-Policy           "strict-origin-when-cross-origin"
        Permissions-Policy        "geolocation=(), microphone=(), camera=()"
        -Server
    }

    # SignalR over WebSockets
    @ws {
        header Connection *Upgrade*
        header Upgrade    websocket
    }
    reverse_proxy @ws api:8080

    reverse_proxy api:8080 {
        # Pass through the Cloudflare-supplied client IP so request logs are useful
        header_up X-Real-IP {http.request.remote.host}
    }

    log {
        output stdout
        format json
        level  INFO
    }
}
```

Notes:
- Caddy listens on `:8080` (no TLS); Cloudflare Tunnel terminates HTTPS at the
  edge.
- WebSockets are proxied for SignalR (`/hubs/notifications`).
- Tunnel guarantees the request comes from Cloudflare; no need for IP
  allowlisting at Caddy.

**.env.example** at `deploy/qa/.env.example` — documents every required key
but ships with no values:

```dotenv
# === Database ===
# Postgres internal credentials. Container-only; never exposed externally.
POSTGRES_DB=sdac
POSTGRES_USER=sdac
POSTGRES_PASSWORD=        # generate: openssl rand -base64 32

# Connection string the API uses (host=postgres = compose service name)
ConnectionStrings__DefaultConnection=Host=postgres;Port=5432;Database=sdac;Username=sdac;Password=__SAME_AS_POSTGRES_PASSWORD__

# === Auth ===
# JWT signing secret. Generate fresh per env: openssl rand -base64 64
Jwt__Secret=

# Google OAuth (QA client — see Cloudflare Console)
Google__ClientId=
Google__ClientSecret=

# === App config ===
ASPNETCORE_ENVIRONMENT=Production
FrontendUrl=https://qa.sdac.yohko.ca
Cors__AllowedOrigins__0=https://qa.sdac.yohko.ca

# OWNER auto-seeded on first run with this email
OwnerEmail=elisha.rahar@gmail.com

# Dev-only data seeds (test users, sample activities). Always false in QA/prod.
SeedDevData=false

# === Blob storage (Cloudflare R2) ===
BlobStorage__Provider=S3
BlobStorage__S3__Endpoint=https://<account-id>.r2.cloudflarestorage.com
BlobStorage__S3__Bucket=sdac-qa-images
BlobStorage__S3__AccessKeyId=
BlobStorage__S3__SecretAccessKey=

# === Cloudflare Tunnel ===
# Token from Zero Trust → Networks → Tunnels → berrysmart-qa
TUNNEL_TOKEN=
```

**File permissions**: the runbook (#11) will instruct
`chmod 600 ~/berrysmart/config/sdac-qa/.env` and verify with `stat -c %a`.

**Definition of done**: Caddyfile + .env.example committed; values
substitution documented.

---

### #10 — backup + image-refresh cron scripts (CLAUDE)

**Location in repo**: `deploy/qa/scripts/`
**Location on berrysmart**: `~/berrysmart/config/sdac-qa/scripts/`

**`backup-pg.sh`**:
```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="$HOME/berrysmart/config/sdac-qa/backups"
mkdir -p "$BACKUP_DIR"

TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)
OUT="$BACKUP_DIR/sdac-qa-$TS.sql.gz"

docker compose -f "$HOME/berrysmart/config/sdac-qa/docker-compose.yml" \
    exec -T postgres \
    pg_dump -U sdac sdac \
  | gzip -9 > "$OUT"

# Retention: keep last 14 days
find "$BACKUP_DIR" -name 'sdac-qa-*.sql.gz' -mtime +14 -delete

# Size sanity (no smaller than 1 KB = something is wrong)
test "$(stat -c %s "$OUT")" -gt 1024 || { echo "Backup suspiciously small: $OUT" >&2; exit 1; }
```

Cron: `0 4 * * * /home/yohko/berrysmart/config/sdac-qa/scripts/backup-pg.sh`

**`refresh.sh`**:
```bash
#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/berrysmart/config/sdac-qa"

# `compose pull` is idempotent — only downloads if remote digest differs.
# `compose up -d` is also idempotent — no-op if running container's image
# digest matches.
docker compose pull api
docker compose up -d api
```

Cron: `*/5 * * * * /home/yohko/berrysmart/config/sdac-qa/scripts/refresh.sh >> /home/yohko/berrysmart/config/sdac-qa/refresh.log 2>&1`

**Why this respects the "no Watchtower" rule**: berrysmart's existing convention
is no auto-updating arbitrary images. Here we pin to a specific tag (`:qa`) and
only refresh when CI explicitly moves that tag. Different blast radius from
Watchtower's "update everything to latest" pattern.

**Backup of .env / configs**: the existing weekly `~/berrysmart/config/`
backup catches `Caddyfile` and `.env`. Be aware that `.env` contains
secrets — backup destination should be encrypted-at-rest or excluded.
Document this caveat in #11.

**Definition of done**: both scripts written, marked executable, cron
installed and verified.

---

### #11 — QA deployment runbook (CLAUDE) — blocked by #5–#10

**File**: `docs/deployment/qa-on-berrysmart.md`

**Structure**:
1. **Prerequisites checklist** — `[ ]` items for tasks #1, #2, #3 done +
   tunnel token + R2 keys + Google OAuth secrets all captured.
2. **One-time bootstrap on berrysmart**:
   - SSH in
   - `git clone https://github.com/yohkogit/sda-management.git ~/berrysmart/repo/sda-management`
     (or rsync `deploy/qa/`)
   - `mkdir -p ~/berrysmart/config/sdac-qa/{postgres-data,caddy-data,caddy-config,backups,scripts}`
   - Copy `deploy/qa/{docker-compose.yml,Caddyfile,scripts/*}` into
     `~/berrysmart/config/sdac-qa/`
   - Copy `deploy/qa/.env.example` to `.env`, fill all values from password
     manager
   - `chmod 600 .env && stat -c %a .env` (must read `600`)
   - Generate fresh secrets:
     - `openssl rand -base64 32` for `POSTGRES_PASSWORD`
     - `openssl rand -base64 64` for `Jwt__Secret`
   - `chmod +x scripts/*.sh`
   - GHCR login: `echo $GHCR_PAT | docker login ghcr.io -u yohkogit --password-stdin`
     (PAT scope: `read:packages` only)
3. **First deploy**:
   - `docker compose pull`
   - `docker compose up -d`
   - Watch `docker compose logs -f api` until you see "Application started"
   - `curl https://qa.sdac.yohko.ca/health` → expect 200 Healthy
4. **Install cron jobs** (`crontab -e`):
   ```
   0 4 * * * /home/yohko/berrysmart/config/sdac-qa/scripts/backup-pg.sh
   */5 * * * * /home/yohko/berrysmart/config/sdac-qa/scripts/refresh.sh >> /home/yohko/berrysmart/config/sdac-qa/refresh.log 2>&1
   ```
5. **Verification smoke** — see #12 acceptance criteria.
6. **Troubleshooting** section:
   - Tunnel "inactive" → check `docker compose logs cloudflared`; usually
     means `TUNNEL_TOKEN` is wrong or stale.
   - Google OAuth `redirect_uri_mismatch` → verify the URI in Google Cloud
     Console exactly matches `https://qa.sdac.yohko.ca/signin-google`
     (no trailing slash).
   - R2 403 on first avatar upload → token doesn't have the bucket scoped or
     keys are mistyped; rotate token in R2 dashboard.
   - Postgres won't start → permissions on `postgres-data/`; delete if
     first-run (no data yet to lose) or `chown -R 999:999 postgres-data/`.
   - API logs flooded with `MigrateAsync` errors → check connection string,
     ensure postgres is healthy first.
7. **Rotation / change procedures**:
   - Rotate JWT secret: edit `.env`, `docker compose up -d api`; users get
     logged out (expected).
   - Rotate R2 keys: create new in dashboard, paste into `.env`, restart.
   - Rotate Google OAuth secret: re-issue in Google Console, paste, restart.
   - Rotate tunnel: re-create in Cloudflare, paste new token, restart
     cloudflared.

**Definition of done**: runbook is complete enough that you can hand it to
another engineer (or future-you) and they can deploy in <30 min.

---

### #12 — First QA deploy + verification smoke

**Acceptance criteria** (the smoke must validate ALL of these):

| Check | Expected | How to verify |
|---|---|---|
| Public DNS | `qa.sdac.yohko.ca` resolves to a Cloudflare IP | `dig qa.sdac.yohko.ca` |
| HTTPS | TLS cert is Cloudflare-issued, valid, no warnings | Browser address bar / `curl -vI https://qa.sdac.yohko.ca` |
| /health | 200 "Healthy" | `curl https://qa.sdac.yohko.ca/health` |
| SPA root | 200 HTML, Vite bundle loads | Browser, no console errors |
| Public API | `/api/public/program-schedules` returns JSON (possibly empty) | `curl ... | jq` |
| Anonymous landing | Loads with no auth | Incognito browser |
| Google sign-in | Completes flow → OWNER user created on first login | Click "Sign In with Google" |
| Authenticated dashboard | Loads after sign-in | Browse to /dashboard |
| Avatar upload | Writes blob to R2 bucket | Upload via admin UI, check R2 bucket has `avatars/{id}.webp` |
| Avatar serves | URL `/api/avatars/{id}?v=1` returns the WebP bytes | Refresh page, image visible |
| Re-upload bumps version | URL becomes `?v=2`, ETag changes | Re-upload, browser shows new image without cache-bust hack |
| Off-network access | Pastor's phone on cellular can reach the URL | Test from cell data |
| Resource cap | `docker stats` shows API <2GB RAM, postgres <500MB | Run during normal use |
| Jellyfin unaffected | Media transcoding works during QA testing | Play a video |
| Cron pull | New CI push → image updates on berrysmart within 5 min | `docker compose ps` shows new image after push |
| Daily backup | First backup file created in `backups/` | `ls -la ~/berrysmart/config/sdac-qa/backups/` after 4am UTC |
| Logs sanity | No exceptions for ~10 min of normal use | `docker compose logs api | grep -i exception` |

**Capture findings** in
`_bmad-output/test-artifacts/qa-first-deploy-<date>.md`.

**Verdict format**: GO / GO-with-caveats / NO-GO, matching the existing smoke
test results format (see
`_bmad-output/test-artifacts/smoke-test-results-2026-05-13.md` for template).

---

## Configuration contract (the canonical reference)

### Env var names — full list
Anything not on this list is not used. Names are case-sensitive (.NET
configuration system uses `__` for nested keys; `:` works in JSON but not in
shell).

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `ConnectionStrings__DefaultConnection` | yes | `Host=postgres;Port=5432;Database=sdac;Username=sdac;Password=...` | Npgsql connection string |
| `Jwt__Secret` | yes | (≥32 char random) | Sign/verify JWT cookies |
| `Google__ClientId` | yes | `....apps.googleusercontent.com` | OAuth client ID |
| `Google__ClientSecret` | yes | (Google secret) | OAuth client secret |
| `FrontendUrl` | yes | `https://qa.sdac.yohko.ca` | Used in OAuth redirects + emails |
| `Cors__AllowedOrigins__0` | yes | `https://qa.sdac.yohko.ca` | CORS allowlist (single origin) |
| `OwnerEmail` | yes | `elisha.rahar@gmail.com` | OWNER seeded on first run |
| `ASPNETCORE_ENVIRONMENT` | yes | `Production` | Disables dev features (OpenAPI, dev seed) |
| `SeedDevData` | no | `false` | Defaults true in dev; must be false in QA/prod |
| `BlobStorage__Provider` | yes | `S3` | `LocalDisk` or `S3` |
| `BlobStorage__S3__Endpoint` | yes if S3 | `https://<acct>.r2.cloudflarestorage.com` | R2 endpoint |
| `BlobStorage__S3__Bucket` | yes if S3 | `sdac-qa-images` | R2 bucket name |
| `BlobStorage__S3__AccessKeyId` | yes if S3 | (R2 token) | |
| `BlobStorage__S3__SecretAccessKey` | yes if S3 | (R2 token) | |
| `BlobStorage__LocalDisk__BasePath` | yes if LocalDisk | `/app/data/blobs` | Local filesystem path |
| `TUNNEL_TOKEN` | yes (cloudflared) | (JWT from Cloudflare) | Tunnel auth — consumed by cloudflared container |
| `POSTGRES_PASSWORD` | yes | (≥32 char random) | Internal postgres init |
| `POSTGRES_USER` | yes | `sdac` | Internal postgres user |
| `POSTGRES_DB` | yes | `sdac` | Internal postgres db name |

### Static config that stays in `appsettings.json` (not env vars)

`AvatarStorage:MaxFileSizeBytes` (default 512000) and
`AvatarStorage:MaxDimension` (default 256) — only ever overridden per env if
you tune them.

### Ports

| Port | Service | Exposure |
|---|---|---|
| 8080 | API (in container) | Internal compose network only |
| 8080 | Caddy (in container) | Internal compose network only |
| 5432 | Postgres (in container) | Internal compose network only |
| 443 | Cloudflare Tunnel | Public (TLS via Cloudflare) |
| 2019 | Caddy admin (optional) | `127.0.0.1` host only, for debugging |

**No host port mappings on berrysmart** — cloudflared handles the only public
path. This is intentional: the existing media stack on berrysmart already uses
8080 for Jellyfin alternatives and exposing another 8080 would collide.

### File paths

| Path | What | Permissions |
|---|---|---|
| `~/berrysmart/config/sdac-qa/` | Stack root on berrysmart | `0755`, owned by yohko |
| `~/berrysmart/config/sdac-qa/docker-compose.yml` | Compose stack | `0644` |
| `~/berrysmart/config/sdac-qa/.env` | Secrets | `0600` |
| `~/berrysmart/config/sdac-qa/Caddyfile` | Reverse proxy | `0644` |
| `~/berrysmart/config/sdac-qa/postgres-data/` | DB volume | postgres (UID 999) owns |
| `~/berrysmart/config/sdac-qa/backups/` | Daily PG dumps | yohko owns |
| `~/berrysmart/config/sdac-qa/scripts/*.sh` | Cron scripts | `0755` |
| `~/.docker/config.json` | GHCR auth cache | `0600`, created by `docker login` |

### Naming registry (avoid drift)

| Thing | Name |
|---|---|
| Compose project | `sdac-qa` (set via `COMPOSE_PROJECT_NAME=sdac-qa` in `.env`) |
| API container | `sdac-qa-api-1` |
| Postgres container | `sdac-qa-postgres-1` |
| GHCR image | `ghcr.io/yohkogit/sda-management` |
| Image tags | `:sha-<commit>`, `:qa` |
| R2 bucket | `sdac-qa-images` |
| Blob key prefix (avatars) | `avatars/{userId}.webp` |
| Blob key prefix (future covers) | `covers/{kind}/{id}.webp` (not yet implemented) |
| Cloudflare Tunnel | `berrysmart-qa` |
| Public hostname | `qa.sdac.yohko.ca` |
| Google OAuth client | `SDAC QA` (in Google Cloud Console) |
| Google OAuth redirect URI | `https://qa.sdac.yohko.ca/signin-google` |

---

## Sources of truth — where things live

### In the repo
- `src/SdaManagement.Api/Storage/` — blob abstraction (#4)
- `src/SdaManagement.Api/Services/AvatarService.cs` — refactored avatar service (#5)
- `src/SdaManagement.Api/Migrations/20260515202809_AddUserAvatarVersion.cs` — schema change (#5)
- `Dockerfile`, `.dockerignore`, `docker-compose.smoke.yml` — packaging + local smoke (#6)
- `src/SdaManagement.Api/Program.cs` — startup pipeline (migrations, static files, /api 404)
- `deploy/qa/` — will hold compose stack, Caddyfile, scripts (#8, #9, #10)
- `docs/deployment/qa-on-berrysmart.md` — runbook (#11, not yet written)
- `_bmad-output/planning-artifacts/architecture.md` — high-level architecture

### In Claude memory (`~/.claude/projects/.../memory/`)
- `MEMORY.md` — index
- `user_location_currency.md` — Montreal, CAD, Canada East
- `reference_berrysmart_homeserver.md` — server conventions, gaps, resource budget
- `project_qa_environment_strategy.md` — decision: berrysmart + Tunnel + yohko.ca

### Outside the repo (user controls)
- Password manager: R2 keys, tunnel token, Google OAuth secret, JWT secret,
  postgres password — all under labels like "SDAC QA / R2", "SDAC QA / Tunnel".
- Cloudflare dashboard: bucket, tunnel, DNS records
- Google Cloud Console: OAuth client config
- GitHub: pushed repo, GHCR images, Actions secrets (none yet)

---

## How to resume from a fresh Claude context

1. **Bootstrap context**: read `~/.claude/projects/.../memory/MEMORY.md`
   (auto-loaded), then this doc (`docs/deployment/qa-deployment-plan.md`).
2. **Check current state**:
   - `git log --oneline -5` — confirm where we are
   - `gh run list --limit 5` — any failed CI?
   - Verify task status: open the TaskList (Claude will remember tasks from
     last session if they're persisted; if not, re-create from the
     "Recommended order" section above)
3. **Pick the next task**: lowest-numbered pending task that isn't blocked.
4. **For each implementation task (#7–#10)**: write the files per the spec
   above, then build/test locally before committing. The `docker-compose.smoke.yml`
   harness is reusable for validating compose changes — run it against
   `deploy/qa/docker-compose.yml` with mock env values.
5. **For #11**: only start after #5–#10 are committed. The runbook references
   all of them.
6. **For #12**: only start after user has completed #1, #2, #3 and signaled go.
7. **When committing**: imperative-mood subject with scope prefix matching
   recent style (`feat(api):`, `feat(deploy):`, `chore(ci):`, etc.).
   **No `Co-Authored-By` line** (Elisha's preference).

---

## Risk register

Known issues / things to watch:

1. **R2 token rotation cadence** — not automated. Add a calendar reminder
   to rotate quarterly.
2. **No off-host PG backups** — backups land on berrysmart's NVMe. If
   berrysmart fails, you lose them. Acceptable for QA, not for prod.
   Prod story will add encrypted off-host sync to B2/R2.
3. **Single point of failure** — one box, one USB HDD (not used for SDAC),
   residential power, residential ISP. Fine for QA, not prod.
4. **N150 transcoding contention** — if QA users open a lot of public-page
   image-heavy flows while Jellyfin is transcoding, the API could slow.
   Mitigated by resource caps (caps reserve headroom).
5. **Cloudflare Tunnel as a SPOF** — if Cloudflare goes down, QA is
   unreachable. Tailscale offers a fallback path (already running on
   berrysmart) — document it in the runbook.
6. **Migrations on startup** — fine for small migrations, will block startup
   for long ones. If a future migration is >10s, switch to a separate
   `dotnet ef database update` step before container start.
7. **OAuth client per env** — sharing one client across QA + prod is a
   security smell. Separate clients (the plan above) is correct.
8. **`appsettings.{Env}.local.json`** loaded by Program.cs — gitignored,
   but make sure these files NEVER exist on berrysmart by accident (would
   override env vars and leak dev creds).

---

## Open questions parked for later (don't block QA)

- **Prod host**: Azure (with nonprofit credit) vs Fly.io vs Hetzner+Coolify.
  Re-decide closer to prod cutover, possibly after Microsoft Nonprofits
  approves the credit application.
- **Cover image stories**: when first story arrives, add `ICoverService` +
  `Department.CoverVersion` column. Foundation is ready.
- **Object-storage backups of PG** (off-host). Tied to prod story.
- **Authentik / SSO consolidation** for berrysmart's media stack. Out of
  scope for SDAC QA, mentioned because gaps were documented in
  `reference_berrysmart_homeserver.md`.
- **Monitoring / alerting** (Uptime Kuma, Healthchecks.io, Grafana). Defer
  until QA has been running for a week or two — premature otherwise.

---

*Last updated: 2026-05-15 — after task #6 completion. Update this file each
time a task moves to "done" so the next person has accurate state.*
