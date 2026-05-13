# SDAC ST-HUBERT — Smoke Test Data Sheet

> Copy-paste companion to `smoke-test-checklist.md`. Every value below is ready to drop into the matching field — no thinking required.
> Section IDs (S1, S2a, …) match the checklist.

---

## Quick-Start Commands

```powershell
# Pre-flight — one-shot. Run each in its own terminal pane.
docker compose -f docker-compose.dev.yml up -d
dotnet run --project src/SdaManagement.Api
npm --prefix src/SdaManagement.Web run dev

# Health check
curl http://localhost:5000/health
```

Useful helper to get the next Saturday's date (paste into a PowerShell terminal):

```powershell
$nextSat = (Get-Date).AddDays((6 - [int](Get-Date).DayOfWeek + 7) % 7)
"Next Sabbath: $($nextSat.ToString('yyyy-MM-dd')) ($($nextSat.ToString('dddd', [System.Globalization.CultureInfo]::GetCultureInfo('fr-FR'))))"
```

---

## Pre-Seeded Dev Accounts (already in DB after `dotnet run`)

The `DatabaseSeeder.SeedDevDataAsync()` runs automatically in Development environment.

| Email | Password | Name | Role | Notes |
|-------|----------|------|------|-------|
| `<OWNER_EMAIL env var>` | `Test1234!` | Owner Account | OWNER | Password set by seeder on every startup |
| `admin.test@sdac.local` | `Test1234!` | Jean BAPTISTE | ADMIN | Auto-assigned to first dept, has a seeded avatar |
| `viewer.test@sdac.local` | `Test1234!` | Marie CLAIRE | VIEWER | No assignments until S4b |

> **Recommendation:** Use these pre-seeded accounts as Admin Alice (= Jean) and Viewer Victor (= Marie) to skip the user-creation step in S2e. Then only create *Admin Bob* (MF) manually. Saves ~10 min.

---

## S2a — Church Settings

| Field | Value |
|-------|-------|
| Church name | `Église Adventiste du Septième Jour de Saint-Hubert` |
| Address | `5470 Boulevard Cousineau, Saint-Hubert, QC J3Y 7G5` |
| Phone | `(450) 555-0186` |
| YouTube channel URL | `https://www.youtube.com/@EgliseAdventisteSaintHubert` |
| Default locale | `fr-CA` |
| Welcome message | (see block below) |

**Welcome message — copy entire block:**

```
Bienvenue à l'Église Adventiste du Septième Jour de Saint-Hubert. Chaque sabbat, notre communauté se rassemble pour adorer, étudier la Parole et partager l'espérance du retour de Jésus-Christ. Que vous soyez de passage ou en recherche, vous êtes ici chez vous.
```

**XSS payload — paste into welcome message after first save, save again, reload page, verify no alert fires:**

```html
<script>alert('XSS')</script><img src=x onerror="alert('XSS2')"> Bonjour <b>famille</b>!
```

---

## S2b — Departments

Create at least 2. Real abbreviations from the church Planning General.

| Name | Abbrev | Color (hex) | Notes |
|------|--------|-------------|-------|
| Jeunesse Adventiste | `JA` | `#4F46E5` (indigo) | Sub-ministry: Éclaireurs |
| Ministère de la Famille | `MF` | `#16A34A` (green) | |
| Ministère Personnel | `MP` | `#DC2626` (red) | Optional 3rd for richer filtering tests |
| Ministère de la Femme | `MIFEM` | `#DB2777` (pink) | Optional |
| Action Évangélique | `AE` | `#0EA5E9` (sky) | Optional |
| Ministère de l'Enfance | `ME` | `#F59E0B` (amber) | Optional |

**Sub-ministry to create under JA:**
- Name: `Éclaireurs`
- (description if asked): `Programme pour les jeunes de 10 à 15 ans — exploration, service et croissance spirituelle.`

---

## S2c — Activity Template

**Template name:** `Culte du Sabbat`

**Description (if field exists):**
```
Service principal du sabbat matin. Inclut prédication, ancien de service, annonces et équipe de diaconat.
```

**Roles to add:**

| Role label | Headcount | Critical? |
|------------|-----------|-----------|
| `Prédicateur` | 1 | ✓ (IsCritical) |
| `Ancien de service` | 1 | ✓ |
| `Annonces` | 1 | |
| `Diacres` | 2 → edit to 3 | |
| `Diaconesses` | 2 | |
| `École du Sabbat — Moniteur` | 1 | |

---

## S2d — Program Schedules

| Title | Day | Start | End | Department |
|-------|-----|-------|-----|------------|
| `École du Sabbat` | Samedi (Saturday) | `08:00` | `09:00` | (link to JA or leave generic) |
| `Culte Divin` | Samedi (Saturday) | `09:15` | `12:00` | — |
| `Réunion de prière` | Mercredi (Wednesday) | `19:00` | `20:00` | — (optional 3rd schedule) |

---

## S2e — Test Users (if not using pre-seeded)

If you skip pre-seeded accounts, create these manually:

| Field | Admin Alice | Viewer Victor | Admin Bob |
|-------|-------------|---------------|-----------|
| First name | `Alice` | `Victor` | `Bob` |
| Last name | `TREMBLAY` | `GAGNON` | `LEBLANC` |
| Email | `alice.tremblay@sdac.test` | `victor.gagnon@sdac.test` | `bob.leblanc@sdac.test` |
| Role | ADMIN | VIEWER | ADMIN |
| Department | JA | — | MF |
| First-login password | `Test1234!` | `Test1234!` | `Test1234!` |

**Recommendation: only create Admin Bob manually** (MF dept — needed for S4f/S9 scoping tests). Use seeded `admin.test@sdac.local` = Alice and `viewer.test@sdac.local` = Victor.

---

## S9 — Bulk User Creation (paste-ready)

For the "bulk create 3 users" check, paste this CSV into the bulk-create field (adjust delimiter to match the form):

```csv
firstName,lastName,email,role
Sophie,DUBOIS,sophie.dubois@sdac.test,VIEWER
Marc,LACROIX,marc.lacroix@sdac.test,VIEWER
Élise,BERGERON,elise.bergeron@sdac.test,ADMIN
```

If the form uses one-per-line names:
```
Sophie DUBOIS — sophie.dubois@sdac.test — VIEWER
Marc LACROIX — marc.lacroix@sdac.test — VIEWER
Élise BERGERON — elise.bergeron@sdac.test — ADMIN
```

---

## S4 — Activities

### 4a. First activity (public)

| Field | Value |
|-------|-------|
| Template | `Culte du Sabbat` |
| Title (if separate field) | `Culte du Sabbat — Sermon: L'Espérance` |
| Date | **Next Saturday** (use the PowerShell snippet above) |
| Start time | `09:15` |
| End time | `12:00` |
| Department | `JA` |
| Visibility | **Public** |
| Description | `Sermon principal de la matinée. Thème: l'espérance dans les épreuves. Cantiques: 12, 245, 503.` |

### 4b. Role assignment

- Open Prédicateur role → search `Marie` (or `Victor` if you created manual users) → select Viewer Victor.

### 4c. Guest speaker (inline)

| Field | Value |
|-------|-------|
| Role being filled | `Ancien de service` |
| Search query that yields no match | `Damien` |
| Guest first name | `Damien` |
| Guest last name | `MORENCY` |
| Title (if asked) | `Pasteur invité` |

### 4e. Second activity (authenticated-only)

| Field | Value |
|-------|-------|
| Title | `Réunion JA — Préparation Camp Meeting` |
| Date | Same Saturday as 4a |
| Start time | `14:00` |
| End time | `15:30` |
| Department | `JA` |
| Visibility | **Authenticated only** |
| Description | `Coordination de la logistique pour le Camp Meeting. Points: hébergement, transport, programme.` |

---

## S6 — Calendar Quick-Create

| Field | Value |
|-------|-------|
| Title | `Comité d'Église` |
| Start | `19:00` |
| End | `20:30` |
| Department | `JA` |
| Visibility | Authenticated |

---

## S8 — Real-Time / Concurrent Edit Inputs

- **Browser A title edit:** change `Culte du Sabbat — Sermon: L'Espérance` → `Culte du Sabbat — Spécial`
- **Browser A description edit:** append ` (mise à jour 1)` to existing description
- **Browser B title edit (will hit 409):** change to `Culte du Sabbat — Édition modifiée`

---

## S10 — Authorization Boundary Snippets

Open DevTools console while logged in as the appropriate user, then paste. Each returns the actual status code.

### Anonymous (run in incognito, no cookies)

```js
fetch('/api/activities').then(r => console.log('activities:', r.status)); // expect 401
fetch('/api/users').then(r => console.log('users:', r.status));           // expect 401
fetch('/api/config/admin').then(r => console.log('config:', r.status));   // expect 401
```

### VIEWER write attempts (logged in as Viewer Victor / Marie)

```js
fetch('/api/activities', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  body: JSON.stringify({ title: 'Hack', departmentId: 1, startUtc: '2026-12-01T14:00:00Z', endUtc: '2026-12-01T15:00:00Z' })
}).then(r => console.log('viewer POST activities:', r.status)); // expect 403

fetch('/api/config', {
  method: 'PUT', credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  body: JSON.stringify({ churchName: 'Hijack' })
}).then(r => console.log('viewer PUT config:', r.status)); // expect 403
```

### ADMIN attempting OWNER-only ops (logged in as Admin Alice)

```js
fetch('/api/config', {
  method: 'PUT', credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  body: JSON.stringify({ churchName: 'Hijack' })
}).then(r => console.log('admin PUT config:', r.status)); // expect 403

fetch('/api/activity-templates', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  body: JSON.stringify({ name: 'Hijack' })
}).then(r => console.log('admin POST template:', r.status)); // expect 403

fetch('/api/system-health', { credentials: 'include' })
  .then(r => console.log('admin GET health:', r.status)); // expect 403
```

### Public DTO leak check (no login required)

```js
fetch('/api/public/next-activity')
  .then(r => r.json())
  .then(d => {
    const forbidden = ['isGuest','userId','staffingCount','concurrencyToken','passwordHash','email'];
    const leaked = forbidden.filter(f => JSON.stringify(d).includes(`"${f}"`));
    console.log(leaked.length ? '❌ LEAKED:' + leaked : '✓ no leaks');
  });
```

---

## S9 — Avatar Upload Test Files

- **Valid (small JPEG):** use any phone selfie or grab a placeholder:
  - `https://i.pravatar.cc/300?img=12` → save-as → upload
- **Oversized (>512KB) — for validation rejection test:**
  - `https://picsum.photos/2000/2000` → save-as → should be ~1.5MB

---

## S11 — i18n Validation Probe

Submit the user-create form with all required fields empty. Expected error messages:

| Locale | Expected |
|--------|----------|
| FR | `Ce champ est requis` (or similar — `obligatoire`) |
| EN | `This field is required` |

Date label expectations:

| Locale | Saturday should render as |
|--------|---------------------------|
| FR | `samedi` (lowercase) |
| EN | `Saturday` |

---

## S12 — Mobile Spot-Check Viewport

DevTools device toolbar → set:
- Width: `375` px
- Height: `812` px
- DPR: `3` (iPhone X-ish)

Touch-target check: open the role assignment buttons — they must be ≥ 44px tall. Use the DevTools ruler to spot-check.

---

## Cleanup / Reset (if a test goes sideways)

```powershell
# Wipe and re-seed dev database
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
# Wait ~5s for Postgres, then:
dotnet run --project src/SdaManagement.Api   # re-seeds OWNER + dev users on startup
```

---

## Tester Notes

- **Speed tip:** Keep this file open in a split pane. Tab between the checklist (left), this data sheet (right), and the browser.
- **Date drift:** All "next Saturday" references assume you run the smoke test in a single session. If you span days, re-run the PowerShell snippet.
- **Multilingual UI:** Default is French. The checklist is bilingual but the UI labels you'll click are French — match against the values above.
