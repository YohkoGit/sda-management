# SDAC ST-HUBERT — Smoke Test Checklist

> **Purpose**: Fast end-to-end validation of every critical path before full QA
> **Created**: 2026-03-24 by Murat (Test Architect)
> **Estimated Effort**: 3–4 hours (single tester, desktop + mobile spot-checks)
> **Prerequisite**: Full checklist at `manual-qa-checklist.md` for deep coverage
>
> **Rule**: If ANY smoke test fails, STOP and file the issue before continuing.
> A smoke test failure means the feature is fundamentally broken, not just rough.

---

## How to Use

1. **Execute top-to-bottom** — sections follow the data dependency chain (you can't test what doesn't exist yet)
2. Use one browser in incognito (anonymous) and one logged-in (switch roles as needed)
3. Mark: `[x]` pass, `[!]` FAIL — add 1-line description, `[-]` skipped + reason
4. Mobile spot-checks: resize browser to 375px or use phone on same network
5. **Target**: 100% pass rate = green light for full QA pass

### Dependency Chain

```
Pre-Flight (infra)
  └─► S1: OWNER Auth (must log in first)
        └─► S2: OWNER Seeds Foundation Data (config, depts, templates, schedules, users)
              ├─► S3: ADMIN Auth (log in as the ADMIN created in S2)
              │     └─► S4: ADMIN Creates Activities + Assigns Roles
              │           ├─► S5: Anonymous Public (NOW there's data to see)
              │           ├─► S6: Calendar (NOW there are entries)
              │           ├─► S7: Dashboard & Assignments (NOW VIEWER has assignments)
              │           ├─► S8: Real-Time (NOW there's content to edit/push)
              │           └─► S9: Concurrent Edit (needs existing activities)
              └─► S10: User Management (additional CRUD, avatars, bulk)
        └─► S11: Auth Boundaries (can test at any point after users exist)
              └─► S12: i18n + Mobile (cross-cutting, test last)
```

**Key insight**: Sections S5–S9 all depend on S4 completing successfully. If S4 fails (can't create activities), everything downstream is blocked.

---

## Pre-Flight (5 min)

- [ ] `docker compose -f docker-compose.dev.yml up -d` → PostgreSQL running
- [ ] `dotnet run` (backend) → no startup errors
- [ ] `npm run dev` (frontend) → Vite serves on :5173
- [ ] `GET http://localhost:5000/health` → returns `Healthy`
- [ ] Open `http://localhost:5173` in incognito → page loads (no blank screen, no JS console errors)
- [ ] Public page in empty state — no church name, no activities (this is expected — nothing seeded yet)

---

## S1 — OWNER Authentication (10 min)

_Test as: OWNER (seeded via OWNER_EMAIL env var)_

> **Why first**: You need OWNER access to seed all foundation data. Nothing else works without this.

### Google OAuth (if OWNER uses Google)
- [ ] Click "Connexion" → redirected to Google consent screen
- [ ] Authorize with OWNER email → redirected back, authenticated shell loads (sidebar appears)
- [ ] Verify httpOnly cookies set (DevTools > Application > Cookies — access + refresh tokens)

### Email/Password (if OWNER uses email auth)
- [ ] Navigate to login → first-login password set flow if first time
- [ ] Enter credentials → authenticated shell loads
- [ ] Invalid credentials → generic error "Identifiants invalides" (no email enumeration)

### Session Basics
- [ ] Refresh page → session persists (still logged in)
- [ ] OWNER sees full sidebar navigation (Settings, Departments, Templates, Schedules, Users, System Health)

---

## S2 — OWNER Seeds Foundation Data (20 min)

_Test as: OWNER — still logged in from S1_

> **Why second**: Every downstream test depends on this data existing. This is the "world-building" step.

### 2a. Church Settings
- [ ] Navigate to Admin > Settings → empty state prompt (first visit) or form loads
- [ ] Fill: church name = "Église Adventiste de Saint-Hubert", address, YouTube URL, welcome message
- [ ] Save → toast confirmation
- [ ] Reload → values persist (singleton upsert)
- [ ] XSS: enter `<script>alert(1)</script>` in welcome message → save → reload → no alert fires, tags stripped

### 2b. Departments (create at least 2 with different colors)
- [ ] Create "Jeunesse Adventiste (JA)" — abbreviation JA, pick a color
- [ ] Create "Ministère de la Famille (MF)" — abbreviation MF, different color
- [ ] Both appear in department list with correct colors
- [ ] Create sub-ministry under JA (e.g., "Éclaireurs") → nested display correct

### 2c. Activity Templates
- [ ] Create template "Culte du Sabbat" with roles: Prédicateur ×1, Ancien ×1, Diacres ×2, Diaconesses ×2
- [ ] Template appears in list with role summary
- [ ] Edit template (change Diacres headcount to 3) → saved

### 2d. Program Schedules
- [ ] Create "École du Sabbat" — Saturday, 8:00–9:00, linked to a department
- [ ] Create "Culte Divin" — Saturday, 9:15–12:00
- [ ] Both appear in schedule list

### 2e. Create Test Users (3 accounts needed for downstream tests)

| User | Role | Department | Purpose |
|------|------|------------|---------|
| Admin Alice | ADMIN | JA | Activity creation in S4 |
| Viewer Victor | VIEWER | — | Dashboard/assignments in S7 |
| Admin Bob | ADMIN | MF | Scoping test + concurrent edit in S9 |

- [ ] Create Admin Alice → assign to JA department → toast confirmation
- [ ] Create Viewer Victor → VIEWER role → toast confirmation
- [ ] Create Admin Bob → assign to MF department → toast confirmation
- [ ] All 3 appear in user list with correct role badges and department badges

### 2f. System Health
- [ ] Navigate to System Health → shows database status (Healthy)

### 2g. Setup Progress
- [ ] Setup checklist shows progress (most/all steps complete after seeding above)

### Checkpoint: Verify public data is now visible
- [ ] Open incognito browser → public dashboard now shows church name + welcome message
- [ ] Program schedules visible on public page
- [ ] Department overview shows JA and MF with their colors
- [ ] No activities yet (expected — ADMIN hasn't created any)

---

## S3 — ADMIN Authentication (5 min)

_Log out of OWNER. Log in as Admin Alice._

> **Why now**: We need an ADMIN session to create activities. Tests ADMIN-specific auth + navigation.

- [ ] Logout as OWNER → redirected to public view, cookies cleared
- [ ] Login as Admin Alice (set password on first login if email/password auth)
- [ ] Authenticated shell loads — sidebar shows ADMIN-appropriate nav (no Settings, no Templates, no System Health)
- [ ] ADMIN sees only JA in their department scope (not MF)

---

## S4 — ADMIN Creates Activities + Assigns Roles (25 min)

_Test as: Admin Alice (ADMIN, JA department)_

> **Why now**: This is the core workflow. Everything downstream depends on activities with assigned roles existing.

### 4a. Activity from Template
- [ ] Navigate to Activities → click "New Activity"
- [ ] Select "Culte du Sabbat" template → roles auto-populate (Prédicateur ×1, Ancien ×1, Diacres ×2+, Diaconesses ×2)
- [ ] Set date = upcoming Saturday, times, department = JA, visibility = **Public**
- [ ] Save → toast → activity appears in list

### 4b. Role Assignment — Assign Viewer Victor as Prédicateur
- [ ] Open the activity → click Prédicateur role → contact picker opens
- [ ] Search "Victor" → Viewer Victor appears in results
- [ ] Select → Victor assigned as Prédicateur (chip + avatar/initials visible)
- [ ] Save activity with assignment

> **Critical**: Viewer Victor now has an assignment — this seeds data for S7 (My Assignments).

### 4c. Guest Speaker — Inline Creation
- [ ] Open contact picker for Ancien role → search "Pasteur Damien" → no match
- [ ] "Ajouter un invité" option appears → click
- [ ] Enter name "Pasteur Damien" → submit → guest auto-assigned to Ancien
- [ ] Guest shows "(Invité)" label in roster view
- [ ] Picker didn't close/reload during flow

### 4d. Roster View
- [ ] Activity detail shows full roster: Prédicateur = Victor, Ancien = Pasteur Damien (Invité), Diacres = empty, Diaconesses = empty
- [ ] Staffing indicators: green on Prédicateur + Ancien, red on Diacres + Diaconesses

### 4e. Create a Second Activity (authenticated-only)
- [ ] Create another activity: "Réunion JA", same Saturday, visibility = **Authenticated only**
- [ ] Save → appears in activity list

### 4f. Department Scoping — Negative Test
- [ ] In activity creation form, verify only JA department is selectable (MF not available)
- [ ] If possible via API: `POST /api/activities` with departmentId = MF → should return 403

---

## S5 — Anonymous Public Experience (15 min)

_Test as: incognito browser, no login_

> **Why now**: S2 seeded config/depts/schedules, S4 created public activities. NOW we can verify the full anonymous experience.

### Dashboard
- [ ] **Church identity** — name "Église Adventiste de Saint-Hubert", address, welcome message visible
- [ ] **Next activity** — "Culte du Sabbat" with Prédicateur = "Victor" (avatar/initials + name), date, times
- [ ] **Guest speaker check** — Pasteur Damien appears as regular member (NO "(Invité)" label on public)
- [ ] **Upcoming activities** — 4-week list includes the public activity
- [ ] **Program schedules** — "École du Sabbat" 8:00–9:00, "Culte Divin" 9:15–12:00 visible
- [ ] **Department overview** — JA and MF with department colors
- [ ] **YouTube live status** — indicator present (live or offline, no error/crash)

### Visibility Enforcement
- [ ] "Réunion JA" (authenticated-only) is NOT visible on public dashboard
- [ ] "Réunion JA" is NOT visible on public calendar

### Public API Security
- [ ] DevTools > Network: inspect `GET /api/public/next-activity` response
- [ ] Response has NO: `isGuest`, `userId`, `staffingCount`, `concurrencyToken` fields
- [ ] No sidebar, no admin links, no authenticated-only content visible

### Skeleton/Error States
- [ ] Skeleton loading placeholders appear briefly while data fetches (or data loads fast enough to not notice)
- [ ] No JS console errors

---

## S6 — Calendar Full Stack (10 min)

> **Depends on**: S4 (activities exist on calendar)

### Public Calendar (incognito)
- [ ] Navigate to `/calendar` → month view renders, Sunday-first layout
- [ ] Public activity ("Culte du Sabbat") visible on correct date with department color
- [ ] Authenticated-only ("Réunion JA") NOT visible
- [ ] Switch views: Day / Week / Month / Year → all render without errors
- [ ] Navigation: Previous/Next + "Today" button work

### Authenticated Calendar (logged in as Admin Alice)
- [ ] Navigate to `/my-calendar` → BOTH activities visible (public + authenticated-only)
- [ ] Department filter → select JA → both JA activities shown
- [ ] Deselect JA → no activities (if only JA activities exist)

### Quick-Create (ADMIN)
- [ ] Click a future date cell → quick-create form with date pre-filled
- [ ] Fill title + time + department → save → activity appears on calendar immediately

---

## S7 — Authenticated Dashboard & Assignments (10 min)

> **Depends on**: S4b (Viewer Victor assigned as Prédicateur)

### VIEWER Dashboard
- [ ] Login as Viewer Victor → dashboard loads with "Bonjour Victor!" greeting
- [ ] **My Assignments** section shows "Culte du Sabbat" with role = Prédicateur
- [ ] Assignment card: activity date, title "Culte du Sabbat", department JA, role "Prédicateur", times
- [ ] Click activity → roster detail page (read-only)
- [ ] No edit controls (no assign/unassign buttons) — VIEWER is read-only
- [ ] Full roster visible: Victor as Prédicateur, Pasteur Damien as Ancien, empty Diacres/Diaconesses

### ADMIN Dashboard
- [ ] Login as Admin Alice → dashboard loads
- [ ] My Assignments section present (may be empty if Alice isn't assigned to roles)
- [ ] Click activity → roster detail WITH edit controls (can assign/unassign people)

---

## S8 — Real-Time Updates (10 min)

> **Depends on**: S4 (activities exist to edit and receive pushes)
> **Requires**: 2 browser sessions simultaneously

### SignalR Connection
- [ ] Login as Admin Alice in Browser A → DevTools > Network > WS → `/hubs/notifications` WebSocket active
- [ ] Navigate between pages → WebSocket stays connected (shared connection)

### Live Broadcast
- [ ] Browser A (Admin Alice): open "Culte du Sabbat" → edit title to "Culte du Sabbat — Spécial"→ save
- [ ] Browser B (Viewer Victor, same activity open): title updates WITHOUT page refresh (within ~1s)

### Concurrent Edit Detection
- [ ] Browser A (Admin Alice) + Browser B (same activity, open for editing — could use OWNER in second browser)
- [ ] Browser A: change description → save → success
- [ ] Browser B: change title → save with now-stale concurrency token → 409 Conflict warning
- [ ] Browser B: click "Reload" → fresh data loads with Browser A's description change

---

## S9 — User Management (10 min)

_Test as: OWNER_

> **Depends on**: S2e (test users exist)

### List & Display
- [ ] User list shows all users: OWNER + Admin Alice + Viewer Victor + Admin Bob + Pasteur Damien (guest)
- [ ] Wait — guest users should NOT be in list. Verify Pasteur Damien is excluded.
- [ ] Each user shows: name, email, role badge, department badges, avatar/initials

### CRUD
- [ ] Create 1 new user → appears immediately
- [ ] Edit user (change department) → change reflected
- [ ] Bulk create 3 users → toast with count

### Avatar
- [ ] Upload JPEG photo for Viewer Victor → avatar renders at 48px in roster
- [ ] Verify avatar also appears on public dashboard next-activity block (Victor is Prédicateur)
- [ ] Upload file > 512KB → validation error
- [ ] User without avatar → initials-based avatar with deterministic background color

### Validation
- [ ] Duplicate email → 409 error with inline email field error

### Role-Scoped Access
- [ ] Login as Admin Alice → user list shows only users in JA department
- [ ] Login as Viewer Victor → user list visible but no create/edit/delete controls

---

## S10 — Authorization Boundary Spot-Checks (10 min)

> **Depends on**: S2e (multiple roles exist to test against)
>
> _Use DevTools console fetch() or curl to hit API directly with each user's cookies_

### Anonymous → Protected Endpoints
- [ ] `GET /api/activities` without cookies → 401
- [ ] `GET /api/users` without cookies → 401
- [ ] `GET /api/config/admin` without cookies → 401

### VIEWER → Write Operations
- [ ] `POST /api/activities` as Viewer Victor → 403
- [ ] `PUT /api/config` as Viewer Victor → 403
- [ ] `DELETE /api/users/{anyId}` as Viewer Victor → 403

### ADMIN → OWNER-Only Operations
- [ ] `PUT /api/config` as Admin Alice → 403
- [ ] `POST /api/activity-templates` as Admin Alice → 403
- [ ] `POST /api/program-schedules` as Admin Alice → 403
- [ ] `GET /api/system-health` as Admin Alice → 403

### ADMIN → Out-of-Scope Department
- [ ] Admin Alice (JA) → `POST /api/activities` with MF department ID → 403
- [ ] Admin Bob (MF) → cannot see/edit JA activities

### Public API — No Data Leakage
- [ ] `GET /api/public/next-activity` → no `isGuest`, `userId`, `staffingCount`, `concurrencyToken`
- [ ] `GET /api/public/upcoming-activities` → no internal-only fields

---

## S11 — Internationalization (5 min)

- [ ] App starts in French — all labels, buttons, headings, empty states in French
- [ ] Toggle language to English → all UI strings switch
- [ ] Toggle back to French → all strings revert
- [ ] Refresh page → language preference persisted (localStorage)
- [ ] Form validation: submit empty required field → error message in current language
- [ ] Date formatting: "samedi" in FR, "Saturday" in EN

---

## S12 — Mobile Quick Pass (10 min)

_Resize browser to 375px width (or use phone on same WiFi)_

> Test with data already seeded from earlier sections

- [ ] Public dashboard: church name + hero section readable, speaker name above fold
- [ ] Navigation: hamburger menu visible → tap → sidebar opens/closes
- [ ] Activity creation form: all fields accessible, buttons ≥ 44px touch targets
- [ ] Contact picker: searchable, chips removable on mobile
- [ ] Calendar month view: renders, dates tappable
- [ ] User list: scrollable, "Load more" pagination works
- [ ] Roster view: stacks vertically, all roles readable

---

## S13 — Logout & Cleanup Verification (5 min)

_Final section — verify clean teardown_

- [ ] Logout as current user → cookies cleared (verify in DevTools)
- [ ] Navigate to `/dashboard` → redirected to login / access denied
- [ ] SignalR WebSocket closed (no WS connection in Network tab)
- [ ] Public dashboard still loads (no crash from being in previously-authenticated state)

---

## Smoke Test Sign-Off

| # | Section | Depends On | Result | Issues Found |
|---|---------|------------|--------|-------------|
| — | Pre-Flight | — | | |
| S1 | OWNER Auth | Pre-Flight | | |
| S2 | OWNER Seeds Data | S1 | | |
| S3 | ADMIN Auth | S2 | | |
| S4 | ADMIN Activities | S3 | | |
| S5 | Anonymous Public | S2 + S4 | | |
| S6 | Calendar | S4 | | |
| S7 | Dashboard & Assignments | S4 | | |
| S8 | Real-Time (SignalR) | S4 | | |
| S9 | User Management | S2 | | |
| S10 | Auth Boundaries | S2 | | |
| S11 | i18n | any | | |
| S12 | Mobile | S4 | | |
| S13 | Logout & Cleanup | any | | |

**Verdict**: [ ] PASS — Proceed to full QA &nbsp;&nbsp; [ ] FAIL — Fix blockers first

| Tester | Date | Duration | Verdict |
|--------|------|----------|---------|
| | | | |
