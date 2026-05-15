# QA Deployment Runbook — berrysmart

> **Audience**: future-you or anyone with SSH on `berrysmart` who needs to
> stand up the QA environment from scratch, recover it, or rotate a secret.
> Goal: zero-to-deployed in under 30 minutes once the prerequisites are met.

For the **why** behind these choices, read
[`qa-deployment-plan.md`](./qa-deployment-plan.md) (north-star decisions,
risk register, parked questions). This file is operational: follow the
steps in order.

---

## Prerequisites checklist

These must be complete before touching berrysmart. The tasks themselves are
documented in `qa-deployment-plan.md` (sections #1, #2, #3).

- [ ] **Cloudflare R2 bucket `sdac-qa-images`** exists with an Object
      Read & Write API token scoped to it. Endpoint URL, Access Key ID, and
      Secret Access Key saved in password manager ("SDAC QA / R2").
- [ ] **Cloudflare Tunnel `berrysmart-qa`** created with public hostname
      `qa.sdac.yohko.ca → http://caddy:8080`. Tunnel token saved in password
      manager ("SDAC QA / Tunnel"). DNS CNAME visible in Cloudflare DNS.
- [ ] **Google OAuth client "SDAC QA"** created with JS origin
      `https://qa.sdac.yohko.ca` and redirect URI
      `https://qa.sdac.yohko.ca/signin-google`. Client ID and Client Secret
      saved in password manager ("SDAC QA / Google OAuth").
- [ ] **GHCR PAT** for berrysmart with scope `read:packages` only. Save as
      "SDAC QA / GHCR PAT". (Issued at <https://github.com/settings/tokens>.)
- [ ] **SSH access to berrysmart** (Tailscale or LAN) working.
- [ ] **CI build green** — `gh run list --workflow build-and-push.yml` shows
      a successful run; `ghcr.io/yohkogit/sda-management:qa` is pullable.

---

## One-time bootstrap on berrysmart

Run all commands as the regular `yohko` user (not root). Replace `<user>` in
paths with the actual home directory user.

### 1. Clone the repo (or rsync deploy/qa)

```bash
ssh berrysmart
mkdir -p ~/berrysmart/repo
git clone https://github.com/YohkoGit/sda-management.git ~/berrysmart/repo/sda-management
```

Alternative (no full clone): rsync only `deploy/qa/` from your dev machine.
The full clone is recommended so you can `git pull` for runbook updates.

### 2. Create the stack directory

```bash
mkdir -p ~/berrysmart/config/sdac-qa/{postgres-data,caddy-data,caddy-config,avatars-volume,backups,scripts}
```

### 3. Copy stack files in place

```bash
SRC=~/berrysmart/repo/sda-management/deploy/qa
DST=~/berrysmart/config/sdac-qa

cp "$SRC/docker-compose.yml" "$DST/"
cp "$SRC/Caddyfile"          "$DST/"
cp "$SRC/scripts/"*.sh       "$DST/scripts/"
cp "$SRC/.env.example"       "$DST/.env"
```

### 4. Fill in `.env`

```bash
chmod 600 ~/berrysmart/config/sdac-qa/.env
nano ~/berrysmart/config/sdac-qa/.env
```

Generate the two random secrets directly:

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "Jwt__Secret=$(openssl rand -base64 64)"
```

Paste each into the `.env`, then also paste the **same** `POSTGRES_PASSWORD`
into the `ConnectionStrings__DefaultConnection=...` line (replacing the
`__SAME_AS_POSTGRES_PASSWORD__` placeholder).

Fill the remaining blanks from your password manager:
- `Google__ClientId`, `Google__ClientSecret` — "SDAC QA / Google OAuth"
- `BlobStorage__S3__Endpoint`, `...AccessKeyId`, `...SecretAccessKey` — "SDAC QA / R2"
- `TUNNEL_TOKEN` — "SDAC QA / Tunnel"

Verify permissions:

```bash
stat -c %a ~/berrysmart/config/sdac-qa/.env
# must print: 600
```

### 5. Make scripts executable

```bash
chmod +x ~/berrysmart/config/sdac-qa/scripts/*.sh
```

### 6. Fix the avatars-volume ownership (LocalDisk fallback only)

The `aspnet:10-alpine` runtime uses UID 1654 (`app` user). If you ever flip
`BlobStorage__Provider` back to `LocalDisk`, the bind-mounted dir needs to be
writable by that UID:

```bash
sudo chown -R 1654:1654 ~/berrysmart/config/sdac-qa/avatars-volume
```

Skip if you're only using R2 (the default for QA).

### 7. Log in to GHCR for the image pull

```bash
# Paste the PAT from your password manager when prompted, or use --password-stdin:
echo "<GHCR_PAT>" | docker login ghcr.io -u YohkoGit --password-stdin
```

Credentials persist in `~/.docker/config.json` (mode 600).

---

## First deploy

```bash
cd ~/berrysmart/config/sdac-qa
docker compose pull
docker compose up -d
docker compose ps
```

Watch the API come up:

```bash
docker compose logs -f api
```

You should see `Application started. Press Ctrl+C to shut down.` within
~30 seconds. The first start also runs EF migrations and seeds the OWNER
user — these only log if there's an error.

Smoke the public URL:

```bash
curl -fsSL https://qa.sdac.yohko.ca/health
# expected: Healthy
```

If `/health` returns 200 from outside the home network, the tunnel is wired
correctly and the rest of the stack is reachable.

---

## Install cron jobs

```bash
crontab -e
```

Append (replace `<user>` with the actual username):

```cron
# Daily Postgres backup at 04:00 local time
0 4 * * * /home/<user>/berrysmart/config/sdac-qa/scripts/backup-pg.sh

# Image refresh every 5 minutes, log to ./refresh.log
*/5 * * * * /home/<user>/berrysmart/config/sdac-qa/scripts/refresh.sh >> /home/<user>/berrysmart/config/sdac-qa/refresh.log 2>&1
```

Verify cron picked them up:

```bash
crontab -l | grep sdac-qa
```

The first backup will land in `~/berrysmart/config/sdac-qa/backups/` after
the next 04:00 tick.

---

## Verification smoke

Run through the checklist in `qa-deployment-plan.md` section #12 and capture
results in `_bmad-output/test-artifacts/qa-first-deploy-<date>.md`. Use the
existing smoke-test format (see
`_bmad-output/test-artifacts/smoke-test-results-2026-05-13.md` for the
template). Verdict: **GO / GO-with-caveats / NO-GO**.

Quick checks you can do from anywhere:

```bash
# DNS + TLS
dig +short qa.sdac.yohko.ca
curl -vI https://qa.sdac.yohko.ca 2>&1 | head -20

# Health + public APIs
curl -fsSL https://qa.sdac.yohko.ca/health
curl -fsSL https://qa.sdac.yohko.ca/api/public/program-schedules

# Browser
# - https://qa.sdac.yohko.ca → loads, no console errors
# - Click "Sign in with Google" → OAuth completes → OWNER created
# - Upload an avatar → see it appear in R2 dashboard under `avatars/<id>.webp`
```

---

## Troubleshooting

### Tunnel shows "inactive" in Cloudflare dashboard
- `docker compose logs cloudflared` — look for auth failures.
- Most common cause: stale or wrong `TUNNEL_TOKEN`. Re-copy from Cloudflare
  Zero Trust → Networks → Tunnels → berrysmart-qa → install command (the
  string after `--token`).
- Then `docker compose up -d cloudflared` to restart.

### Google sign-in returns `redirect_uri_mismatch`
- The URI in Google Cloud Console must be **exactly**
  `https://qa.sdac.yohko.ca/signin-google` — no trailing slash, no http://.
- Edit at <https://console.cloud.google.com> → APIs & Services → Credentials
  → SDAC QA → Authorized redirect URIs.
- No restart needed; Google picks up the change immediately.

### R2 403 on first avatar upload
- API token doesn't have `Object Read & Write` on the bucket, or isn't
  scoped to `sdac-qa-images`.
- Generate a new token in R2 dashboard, paste new keys into `.env`,
  `docker compose up -d api`.

### Postgres won't start
- `docker compose logs postgres` — look for permission errors on
  `/var/lib/postgresql/data`.
- If first run: delete `postgres-data/` (no data to lose yet) and retry.
- If existing data: `sudo chown -R 999:999 ~/berrysmart/config/sdac-qa/postgres-data`
  (postgres-alpine uses UID 999).

### API logs flooded with `MigrateAsync` exceptions
- Means postgres is up but the connection string is wrong, or the API
  started before postgres was actually healthy.
- Check `ConnectionStrings__DefaultConnection` host, port, user, password
  match `.env`'s POSTGRES_*.
- `docker compose restart api` to retry from a clean slate.

### Caddy 502 Bad Gateway on `/health`
- API container isn't healthy yet. `docker compose ps` should show
  `api` as `(healthy)`. If `(unhealthy)` or `(starting)`, check
  `docker compose logs api`.

### `docker compose pull` rate-limited from GHCR
- GHCR is generous but not infinite. If `refresh.sh` starts failing with
  HTTP 429: `docker login ghcr.io` again with the PAT.

### Cloudflare Tunnel down → site unreachable
- Fallback: SSH into berrysmart via Tailscale, browse to
  `http://<berrysmart-tailscale-ip>:8080` for an internal-only path.
- (Optional, not enabled by default — would require uncommenting a host
  port mapping in `docker-compose.yml`.)

---

## Rotation procedures

### Rotate JWT secret
1. `nano ~/berrysmart/config/sdac-qa/.env` → replace `Jwt__Secret` with
   `$(openssl rand -base64 64)`.
2. `docker compose up -d api`.
3. **Side effect**: every signed-in user gets logged out. Expected.

### Rotate R2 keys
1. Cloudflare dashboard → R2 → Manage R2 API Tokens → create a new token
   scoped to `sdac-qa-images` with Object Read & Write.
2. Paste new `AccessKeyId` and `SecretAccessKey` into `.env`.
3. `docker compose up -d api`.
4. Revoke the old token only after the new one is verified working.

### Rotate Google OAuth client secret
1. Google Cloud Console → Credentials → SDAC QA → "Reset Secret".
2. Paste the new secret into `.env`.
3. `docker compose up -d api`. Existing sessions stay valid; new sign-ins
   use the new secret.

### Rotate Cloudflare Tunnel token
1. Cloudflare Zero Trust → Networks → Tunnels → berrysmart-qa →
   Configure → "Refresh token" (or delete and re-create the connector).
2. Paste the new token into `.env`.
3. `docker compose up -d cloudflared`.

### Rotate Postgres password
This is messier because the password is baked into the running DB. Do
both halves in one window:

1. Generate a new value: `NEW=$(openssl rand -base64 32)`.
2. `docker compose exec -T postgres psql -U sdac -d sdac -c "ALTER USER sdac WITH PASSWORD '$NEW';"`
3. Edit `.env`: update **both** `POSTGRES_PASSWORD` and the password inside
   `ConnectionStrings__DefaultConnection`.
4. `docker compose up -d api`. (No postgres restart needed — `ALTER USER`
   takes effect immediately.)

---

## Backup and restore

### Daily backups
`scripts/backup-pg.sh` writes `backups/sdac-qa-<UTC-timestamp>.sql.gz`
nightly at 04:00. Retention is 14 days. **These live on berrysmart's NVMe
only** — if the host fails, the backups are gone. Acceptable risk for QA;
prod will need off-host sync.

The existing weekly `~/berrysmart/config/` backup catches `Caddyfile` and
the directory layout. **`.env` is in that path and contains secrets** —
either ensure the backup destination is encrypted at rest, or add `.env` to
the backup's exclude list and reconstruct from the password manager when
restoring.

### Manual restore
```bash
# Stop the API so nothing writes during restore
docker compose stop api

# Drop and recreate the DB (DANGER — wipes current QA data)
docker compose exec -T postgres psql -U sdac -d postgres -c "DROP DATABASE sdac;"
docker compose exec -T postgres psql -U sdac -d postgres -c "CREATE DATABASE sdac OWNER sdac;"

# Restore
gunzip -c ~/berrysmart/config/sdac-qa/backups/sdac-qa-<timestamp>.sql.gz \
  | docker compose exec -T postgres psql -U sdac -d sdac

# Restart API (which will re-apply migrations if the dump was older than
# the running image's schema)
docker compose up -d api
```

---

## Day-to-day operations

| Want to... | Command |
|---|---|
| See status of all containers | `docker compose ps` |
| Tail API logs | `docker compose logs -f api` |
| Tail Caddy access logs | `docker compose logs -f caddy` |
| Force a pull-and-restart | `~/berrysmart/config/sdac-qa/scripts/refresh.sh` |
| Restart everything | `docker compose restart` |
| Stop everything | `docker compose down` (preserves volumes) |
| Nuke everything (DANGER) | `docker compose down -v` (deletes postgres-data!) |
| Manual backup right now | `~/berrysmart/config/sdac-qa/scripts/backup-pg.sh` |
| Check disk used by stack | `du -sh ~/berrysmart/config/sdac-qa/*` |
| Check resource use | `docker stats --no-stream` |
