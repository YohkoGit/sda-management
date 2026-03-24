# SDAC ST-HUBERT Operations Command — Manual QA Checklist

> **Status**: Pre-deployment production blocker
> **Created**: 2026-03-24 by Murat (Test Architect)
> **Scope**: All 9 epics — 12 API controllers, 16 frontend pages, 4 user roles
> **Estimated Effort**: 30–40 hours (thorough pass, mobile + desktop, FR + EN)
> **Quick version**: See `smoke-test-checklist.md` for a 3–4 hour critical-path pass

---

## How to Use This Checklist

- **Execute top-to-bottom** — sections follow the data dependency chain
- **Test each role** — use the role matrix at the end to verify access control per feature
- **Mark results**: `[x]` pass, `[!]` fail (add issue description), `[-]` skipped (add reason)
- **Environment**: Test against local dev (`localhost:5173` proxy to `:5000`) with seeded PostgreSQL
- **Browsers**: Chrome (primary), Firefox, Safari (mobile), Edge
- **Devices**: Desktop 1440px, Tablet 768px, Mobile 375px

---

## Dependency Chain

```
Phase 1: INFRASTRUCTURE
  Section 1 — App Startup, Health, Error Formats, Rate Limiting

Phase 2: OWNER BOOTSTRAP (log in as OWNER, seed all foundation data)
  Section 2 — OWNER Authentication
  Section 3 — Church Configuration (settings, setup checklist)
  Section 4 — Department Management (create depts + sub-ministries)
  Section 5 — Activity Templates (create templates with roles)
  Section 6 — Program Schedules (create recurring times)
  Section 7 — User & Role Administration (create ADMIN + VIEWER test users)
      ► Checkpoint A: verify public page shows church identity + schedules + departments

Phase 3: ADMIN OPERATIONS (log in as ADMIN, create activities)
  Section 8 — ADMIN Auth + Navigation Verification
  Section 9 — Activity Scheduling & Role Assignment (CRUD, templates, roster, guests, concurrency)
      ► Checkpoint B: verify public dashboard now shows activities with speakers

Phase 4: CONSUMER EXPERIENCE (verify what anonymous + authenticated users see)
  Section 10 — Public Dashboard & Anonymous Experience
  Section 11 — Public Calendar
  Section 12 — Authenticated Dashboard & Personal Assignments
  Section 13 — Authenticated Calendar

Phase 5: REAL-TIME & MULTI-USER
  Section 14 — Real-Time Updates (SignalR)

Phase 6: CROSS-CUTTING & HARDENING
  Section 15 — Application Shell & Navigation (all roles)
  Section 16 — Internationalization (i18n)
  Section 17 — Authorization Boundaries (Role × Feature Matrix)
  Section 18 — System Health (OWNER only)
  Section 19 — Mobile Responsiveness
  Section 20 — Accessibility (WCAG 2.1 AA)
  Section 21 — Performance
  Section 22 — Data Integrity
  Section 23 — Known Issues from Retros
```

**Key insight**: If Phase 2 fails (can't seed data), Phases 3–5 are all blocked. If Phase 3 fails (can't create activities), Sections 10–14 have nothing to verify.

---

## Test User Accounts

Create these accounts during Sections 4 + 7. They are referenced throughout the checklist.

| Name | Role | Department(s) | Purpose |
|------|------|---------------|---------|
| OWNER (seeded) | OWNER | all | Foundation setup, full admin |
| Admin Alice | ADMIN | JA (Jeunesse Adventiste) | Activity creation, scoped access |
| Admin Bob | ADMIN | MF (Ministère de la Famille) | Cross-dept scoping tests, concurrent edit |
| Viewer Victor | VIEWER | — | Dashboard, My Assignments, read-only tests |

---

# Phase 1: INFRASTRUCTURE

## Section 1: Infrastructure & Health

### 1.1 — Application Startup

- [ ] Backend starts without errors on `dotnet run`
- [ ] Frontend starts on `npm run dev` (Vite dev server on port 5173)
- [ ] Proxy routing: `/api/*` and `/hubs/*` requests forwarded to backend `:5000`
- [ ] `GET /health` returns `Healthy` when PostgreSQL is connected
- [ ] `GET /health` returns `Unhealthy` when PostgreSQL is stopped (stop Docker container, check, restart)
- [ ] Open `http://localhost:5173` in incognito → page loads (no blank screen, no JS console errors)
- [ ] Public page shows empty/default state (no church name, no activities — nothing seeded yet, this is expected)

### 1.2 — Error Response Format

- [ ] Invalid API request returns RFC 7807 ProblemDetails JSON (has `type`, `title`, `status`, `detail` fields)
- [ ] `type` field uses `urn:sdac:*` URI pattern
- [ ] Validation failure returns 400 with field-level error details
- [ ] Unauthorized request returns 401 ProblemDetails
- [ ] Forbidden request returns 403 ProblemDetails

### 1.3 — Rate Limiting

- [ ] Send 6 rapid auth requests (e.g., POST `/api/auth/login` with wrong credentials) — 6th returns 429
- [ ] 429 response includes `Retry-After` header
- [ ] Public endpoints have separate rate limit (higher threshold)

---

# Phase 2: OWNER BOOTSTRAP

> Log in as OWNER and seed all foundation data. Every section in Phases 3–5 depends on this.

## Section 2: OWNER Authentication

### 2.1 — Google OAuth Sign-In (if OWNER uses Google)

- [ ] Click "Connexion" button on public nav → redirected to Google consent screen
- [ ] Authorize with OWNER email → redirected back to app
- [ ] httpOnly cookies set (access token + refresh token) — verify in DevTools > Application > Cookies
- [ ] Authenticated shell renders (sidebar navigation, welcome greeting)
- [ ] OWNER role and name correctly displayed
- [ ] Full sidebar visible: Settings, Departments, Templates, Schedules, Users, System Health

### 2.2 — Google OAuth — Unrecognized Email

- [ ] Authorize with an email NOT in the user table → error message displayed
- [ ] Message: "Contactez votre administrateur" (or similar — no auto-account creation)
- [ ] No cookies set for unrecognized email
- [ ] App remains in public/anonymous view

### 2.3 — Email/Password Sign-In

- [ ] Navigate to login page → enter valid email + password → authenticated shell loads
- [ ] httpOnly cookies set on successful login
- [ ] Invalid credentials → generic error "Identifiants invalides" (no email enumeration)
- [ ] Same generic error for non-existent email (anti-enumeration)

### 2.4 — First-Login Password Set

- [ ] User created with no password → user attempts login
- [ ] Login flow prompts password creation (set-password form)
- [ ] Password set successfully → user can log in with new password
- [ ] Password stored as bcrypt hash (verify: cannot be read from DB as plaintext)

### 2.5 — Password Reset Flow

- [ ] Click "Mot de passe oublié" → enter email → "Reset email sent" confirmation
- [ ] Reset email contains valid token/link
- [ ] Click reset link → set new password → can login with new password
- [ ] Old password no longer works after reset
- [ ] Expired/invalid reset token shows error message

### 2.6 — Token Refresh

- [ ] After login, wait for access token to expire (or manually clear access token cookie, keep refresh)
- [ ] Make API request → 401 triggers transparent refresh → request succeeds without user action
- [ ] New access token cookie set after refresh
- [ ] If refresh token also expired → user redirected to public view (logout)

### 2.7 — Sign-Out

- [ ] Click logout button in authenticated shell
- [ ] httpOnly cookies cleared (both access and refresh)
- [ ] App redirects to public view (`/`)
- [ ] Subsequent API requests return 401 (no valid session)
- [ ] SignalR connection closed on logout (check WebSocket in DevTools Network tab)
- [ ] Log back in as OWNER before continuing to Section 3

---

## Section 3: Church Configuration (OWNER Only)

> _Logged in as: OWNER_

### 3.1 — Church Identity Settings

- [ ] Navigate to Admin > Settings
- [ ] First visit shows guided empty state: "Configurez l'identité de votre église"
- [ ] Form fields: Name, Address, YouTube URL, Phone, Welcome Message, Default Locale
- [ ] Required field validation: Name + Address required; submit without them shows inline errors
- [ ] Optional fields (YouTube URL, Phone, Welcome Message) can be left blank
- [ ] Fill in: church name = "Église Adventiste de Saint-Hubert", address, YouTube URL, welcome message
- [ ] Save → toast "Sauvegardé" (or similar success confirmation)
- [ ] Reload page → saved values persist
- [ ] Second save updates existing record (upsert — only 1 ChurchConfig record)

### 3.2 — Church Config — Security

- [ ] HTML/script injection: Enter `<script>alert('xss')</script>` in welcome message → sanitized on save
- [ ] Reload → no alert fires, script tags stripped
- [ ] Public endpoint `GET /api/config` returns: church name, address, welcome message, YouTube URL
- [ ] Public endpoint does NOT return: phone, locale, timestamps, internal IDs

### 3.3 — Setup Progress / First-Time Checklist

- [ ] OWNER sees setup progress (checklist or progress indicator)
- [ ] Steps: Church Settings → Departments → Activity Templates → Program Schedules → Users
- [ ] Church Settings step now shows complete (just configured above)
- [ ] Remaining steps show "configure now" prompts or empty states

---

## Section 4: Department Management

> _Logged in as: OWNER. Create at least 2 departments with different colors for downstream tests._

### 4.1 — Department CRUD (OWNER)

- [ ] Create "Jeunesse Adventiste (JA)" — abbreviation JA, pick a color (e.g., blue)
- [ ] Create "Ministère de la Famille (MF)" — abbreviation MF, different color (e.g., green)
- [ ] Both appear in department list immediately with correct colors
- [ ] Edit JA department (change description) → change reflected
- [ ] Department color renders correctly as badges/indicators
- [ ] Delete test: create a throwaway department → delete → removed from list

### 4.2 — Sub-Ministry Management

- [ ] Create sub-ministry under JA (e.g., "Éclaireurs") — name, description
- [ ] Sub-ministry appears nested under JA in department detail
- [ ] Edit sub-ministry → changes reflected
- [ ] Delete sub-ministry → removed from department detail

### 4.3 — Department Views (defer role-scoped tests to Phase 6)

- [ ] Department detail page shows: name, abbreviation, color, description, sub-ministries
- [ ] `GET /api/departments/with-staffing` returns department list
- [ ] Setup checklist: Departments step now shows complete

---

## Section 5: Activity Templates (OWNER Only)

> _Logged in as: OWNER_

### 5.1 — Template CRUD

- [ ] Create template "Culte du Sabbat" with roles: Prédicateur ×1, Ancien ×1, Diacres ×2, Diaconesses ×2
- [ ] Template appears in list after creation with role summary
- [ ] Create second template "Réunion de Prière" with different roles
- [ ] Edit "Culte du Sabbat" (change Diacres headcount to 3) → saved
- [ ] Delete "Réunion de Prière" → removed from list
- [ ] Non-OWNER users get 403 on all template endpoints (test in Phase 6)

### 5.2 — Template Behavior

- [ ] Template is a blueprint — editing template later does NOT affect existing activities (verify after Section 9)
- [ ] Setup checklist: Activity Templates step now shows complete

---

## Section 6: Program Schedules (OWNER Only)

> _Logged in as: OWNER_

### 6.1 — Schedule CRUD

- [ ] Create "École du Sabbat" — Saturday, 8:00–9:00, linked to JA department
- [ ] Create "Culte Divin" — Saturday, 9:15–12:00
- [ ] Both appear in schedule list
- [ ] Edit schedule (change time) → change reflected
- [ ] Delete test: create throwaway schedule → delete → removed
- [ ] Non-OWNER users get 403 (test in Phase 6)

### 6.2 — Public Display (verify in Phase 4)

- [ ] `GET /api/public/program-schedules` returns schedule list (test now via API)
- [ ] Setup checklist: Program Schedules step now shows complete

---

## Section 7: User & Role Administration

> _Logged in as: OWNER. Create the test user accounts needed for Phases 3–5._

### 7.1 — Single User Creation

- [ ] Click "Ajouter un utilisateur" → creation form appears
- [ ] Form fields: firstName, lastName, email, role dropdown, department checkboxes
- [ ] OWNER sees all departments in department picker
- [ ] OWNER can assign any role (VIEWER, ADMIN, OWNER)
- [ ] Create **Admin Alice** → ADMIN role → assign to JA department → toast "Utilisateur créé"
- [ ] Create **Admin Bob** → ADMIN role → assign to MF department → toast confirmation
- [ ] Create **Viewer Victor** → VIEWER role → no department required → toast confirmation
- [ ] All 3 appear in user list with correct role badges and department badges

### 7.2 — User List Display

- [ ] User list shows: OWNER + Admin Alice + Admin Bob + Viewer Victor
- [ ] Each user shows: name, email, role badge, department badges, avatar/initials
- [ ] List uses cursor-based pagination ("Load more" button, not page numbers)
- [ ] Loading more users appends to list (doesn't replace)

### 7.3 — Bulk User Creation

- [ ] Click "Importer plusieurs" → multi-entry form
- [ ] Can add multiple rows rapidly without dialog closing
- [ ] Form pre-fills selected role/department for next entry
- [ ] Create 3 bulk users → toast with count ("3 utilisateurs créés")
- [ ] Invalid entry on one row doesn't block other valid rows

### 7.4 — User Role & Department Management

- [ ] Open Admin Alice detail → edit role, department assignments visible
- [ ] OWNER can demote ADMIN → VIEWER (test, then revert)
- [ ] Department reassignment saves correctly
- [ ] OWNER can edit any user's role/departments (no scope restriction)

### 7.5 — OWNER Full User Access

- [ ] OWNER can create additional OWNER accounts
- [ ] OWNER can delete a bulk-created user → removed from list
- [ ] Duplicate email → 409 Conflict → inline error on email field

### 7.6 — Avatar Upload & Display

- [ ] Upload JPEG photo for Viewer Victor → avatar displays at 48px (list) and 28px (badges)
- [ ] Upload PNG for Admin Alice → renders correctly
- [ ] File > 512KB rejected with validation error
- [ ] Invalid file type rejected (try .txt)
- [ ] Re-upload different photo → ETag forces browser to fetch new image
- [ ] Users without photo → initials-based avatar with deterministic background color
- [ ] Avatar accessible anonymously: `GET /api/avatars/{victorId}` works without auth

### 7.7 — Guest User Exclusion

- [ ] Guest users (isGuest = true) excluded from user list (will have guests after Section 9)
- [ ] Setup checklist: Users step now shows complete

---

### ► Checkpoint A: Public Page Shows Foundation Data

_Switch to incognito browser (anonymous)_

- [ ] Public dashboard shows church name "Église Adventiste de Saint-Hubert" + address + welcome message
- [ ] Program schedules visible: "École du Sabbat" 8:00–9:00, "Culte Divin" 9:15–12:00
- [ ] Department overview shows JA and MF with their colors
- [ ] No activities yet (expected — ADMIN hasn't created any)
- [ ] YouTube live status indicator present (live or offline, no error)

---

# Phase 3: ADMIN OPERATIONS

> Log out of OWNER. Log in as Admin Alice (ADMIN, JA department).

## Section 8: ADMIN Auth & Navigation

### 8.1 — ADMIN Login

- [ ] Logout as OWNER → redirected to public view, cookies cleared
- [ ] Login as Admin Alice (set password on first login if email/password)
- [ ] Authenticated shell loads with ADMIN-appropriate sidebar
- [ ] Sidebar does NOT show: Settings, Activity Templates, Program Schedules, System Health (OWNER-only)
- [ ] Sidebar shows: Dashboard, Calendar, Activities, Departments, Users

### 8.2 — ADMIN Department Scoping

- [ ] Admin Alice sees JA in department views
- [ ] Admin Alice does NOT see MF management controls (or sees MF read-only)

---

## Section 9: Activity Scheduling & Role Assignment

> _Logged in as: Admin Alice (ADMIN, JA department)_

### 9.1 — Activity CRUD

- [ ] Navigate to Activities → click "New Activity"
- [ ] Activity creation form shows only JA in department picker (not MF — scoping enforced)
- [ ] Create activity manually: title "Veillée JA", date, times, department = JA, visibility = Authenticated only
- [ ] Activity appears in list and calendar after creation
- [ ] Edit activity (change title to "Veillée JA — Mars") → change saved
- [ ] Delete activity → removed from all views
- [ ] Department scoping: attempt to create activity for MF → rejected (no option in form, or 403 on API)

### 9.2 — Activity Creation from Template

- [ ] Click "New Activity" → template selector shows "Culte du Sabbat"
- [ ] Select template → roles auto-populate: Prédicateur ×1, Ancien ×1, Diacres ×3 (edited headcount), Diaconesses ×2
- [ ] Set date = upcoming Saturday, start/end times, department = JA, visibility = **Public**
- [ ] Save → toast → "Culte du Sabbat" activity created with all roles

### 9.3 — Role Roster Customization

- [ ] Open the "Culte du Sabbat" activity
- [ ] Add custom role "Musique" with headcount 2
- [ ] Remove a role (e.g., remove "Musique" before saving, or test with a different role)
- [ ] Change Diacres headcount from 3 → 2
- [ ] Save → changes persisted atomically (no partial state)

### 9.4 — Role Assignment via Contact Picker

- [ ] Click Prédicateur role → contact picker opens
- [ ] Contacts grouped by department, searchable
- [ ] Search "Victor" → Viewer Victor appears in results
- [ ] Select Victor → assigned as Prédicateur (chip + avatar visible)
- [ ] Click Ancien role → assign Admin Alice
- [ ] Multiple assignments: click Diacres role → assign 2 different people
- [ ] Unassign: click chip × on one Diacre → person removed

> **Critical**: Viewer Victor is now assigned as Prédicateur — this seeds data for Section 12 (My Assignments).

### 9.5 — Guest Speaker (Inline Creation)

- [ ] Open contact picker for a role → search "Pasteur Damien" → no match
- [ ] "Ajouter un invité" option appears → click
- [ ] Guest form: name "Pasteur Damien" (required), phone optional
- [ ] Submit → guest auto-assigned to role
- [ ] Picker didn't close/reload during flow
- [ ] Guest shows "(Invité)" label in roster view (authenticated)

### 9.6 — Activity Roster View & Staffing Indicators

- [ ] Activity detail shows full roster: Prédicateur = Victor, Ancien = Alice, Diacres = partial, Diaconesses = empty
- [ ] Each assigned person shows avatar (photo or initials) + name
- [ ] Staffing indicators: green (fully filled), amber (partial), red (empty)
- [ ] Empty roles show clear visual CTA to assign
- [ ] Mobile: roster stacks vertically, 44px touch targets

### 9.7 — Create Second Activity (Authenticated-Only)

- [ ] Create "Réunion de planification JA", same week, visibility = **Authenticated only**
- [ ] Save → appears in activity list
- [ ] We now have: 1 public activity + 1 authenticated-only activity for calendar/visibility tests

### 9.8 — OWNER Activity Access (switch to OWNER briefly)

- [ ] Login as OWNER → can create/edit/delete activity for ANY department (JA or MF)
- [ ] OWNER creates 1 activity for MF department (to populate MF for cross-dept tests)
- [ ] Log back out, continue as needed

### 9.9 — Concurrent Edit Detection

- [ ] **Setup**: Open "Culte du Sabbat" in two browser tabs (ADMIN Alice + OWNER, or two OWNER tabs)
- [ ] Tab A: Edit activity title → save → success
- [ ] Tab B: Edit activity description → save with stale concurrency token → 409 Conflict
- [ ] Conflict dialog appears with reload/overwrite options
- [ ] Reload → fetches fresh data, dialog dismissed
- [ ] Overwrite → saves changes (last-write-wins with acknowledgement)

---

### ► Checkpoint B: Public Dashboard Shows Activities

_Switch to incognito browser (anonymous)_

- [ ] Public dashboard now shows "Culte du Sabbat" as next activity
- [ ] Hero block: Prédicateur = "Victor" with avatar, date, times
- [ ] Guest speaker "Pasteur Damien" appears as regular member (NO "(Invité)" label on public)
- [ ] Upcoming activities list includes the public activity
- [ ] "Réunion de planification JA" (authenticated-only) is NOT visible on public dashboard
- [ ] Program schedules still visible
- [ ] Department overview shows JA and MF

---

# Phase 4: CONSUMER EXPERIENCE

> Now that foundation data + activities exist, verify what each user type actually sees.

## Section 10: Public Dashboard & Anonymous Experience

_Test as: incognito browser, no login_

### 10.1 — Public Dashboard — Hero Section

- [ ] Open app → public dashboard loads immediately (no blank screen)
- [ ] Church name, address, welcome message visible (identity-first loading)
- [ ] Hero section on dark slate background
- [ ] No login required to see any public content

### 10.2 — Next Activity Block

- [ ] Next public activity displayed with: speaker avatar, name, department badge, date, times
- [ ] Date formatted contextually ("Ce Sabbat" for this week, or full date for others)
- [ ] Special type tag displayed if applicable (e.g., Sainte-Cène)
- [ ] Guest speaker appears identical to regular members (NO "(Invité)" on public)

### 10.3 — Empty State (test by temporarily removing all public activities if feasible)

- [ ] "Aucune activité à venir" when no public activities exist
- [ ] Church identity still visible even with no activities

### 10.4 — Error Handling

- [ ] Skeleton loading placeholders appear while data loads
- [ ] If API fails (stop backend briefly), church identity still visible, subtle error message shown
- [ ] Restart backend → data recovers on refresh

### 10.5 — Public API Security

- [ ] `GET /api/public/next-activity` response contains NO: isGuest flag, userId, staffing counts, concurrency tokens
- [ ] `GET /api/public/upcoming-activities` contains NO sensitive internal data
- [ ] Guest speakers appear identical to regular members on all public endpoints

### 10.6 — YouTube Live Status

- [ ] If YouTube URL configured → live status indicator present
- [ ] When stream is live → pulsing indicator visible
- [ ] When stream is offline → appropriate offline state shown
- [ ] If no YouTube URL configured → graceful fallback (no broken embed/error)

### 10.7 — Upcoming Activities

- [ ] Below hero: list of upcoming public activities (4-week lookahead)
- [ ] Each card shows: date, activity type, department color badge, speaker name
- [ ] Activities grouped logically (by date or week)
- [ ] Only public-visibility activities shown (authenticated-only hidden)

### 10.8 — Public Department Overview

- [ ] Department grid/list with next scheduled activity per department
- [ ] Department descriptions displayed
- [ ] Department colors render correctly
- [ ] Mobile responsive: stacks to 1 column on 375px

### 10.9 — "Modifié" Badge

- [ ] Activities modified within 24 hours show "Modifié" badge
- [ ] Badge visible and readable on mobile
- [ ] Badge disappears after 24 hours (on page refresh)

### 10.10 — Visibility Enforcement

- [ ] Authenticated-only activities NOT visible anywhere on public site
- [ ] No sidebar, no admin links, no authenticated-only content anywhere
- [ ] Navigating to `/dashboard` → redirected to login

---

## Section 11: Public Calendar

_Test as: incognito browser, no login_

### 11.1 — Calendar Views

- [ ] Public calendar accessible at `/calendar` without login
- [ ] Sunday-first layout (Sunday = day 1, Saturday = day 7)
- [ ] Day view: single day with activities
- [ ] Week view: 7-column Sun–Sat layout
- [ ] Month view: grid with activity badges per date
- [ ] Year view: 12-month grid overview
- [ ] View selector to switch between views

### 11.2 — Calendar Navigation

- [ ] Previous/Next buttons navigate calendar
- [ ] "Today" button jumps to current date
- [ ] Navigation smooth, no full page reload

### 11.3 — Public Calendar — Visibility

- [ ] Public activity ("Culte du Sabbat") visible on correct date with department color
- [ ] Authenticated-only ("Réunion de planification JA") NOT visible
- [ ] Department color coding visible on activity entries

### 11.4 — Calendar — Mobile

- [ ] Calendar usable on 375px screen
- [ ] Date cells readable and tappable
- [ ] Activity detail accessible on tap

---

## Section 12: Authenticated Dashboard & Personal Assignments

### 12.1 — VIEWER Dashboard

_Login as: Viewer Victor (assigned as Prédicateur in Section 9.4)_

- [ ] Dashboard loads with "Bonjour Victor!" greeting
- [ ] **My Assignments** section shows "Culte du Sabbat" with role = Prédicateur
- [ ] Assignment card: activity date, title, department JA, role "Prédicateur", times
- [ ] Date formatted relatively ("Ce Samedi", "Dans 2 semaines")
- [ ] Click activity → roster detail page (read-only)
- [ ] Full roster visible: all roles with assigned people, avatars
- [ ] "(Invité)" label visible for Pasteur Damien in authenticated roster view
- [ ] No edit controls visible (VIEWER is read-only)
- [ ] Quick action buttons appropriate to VIEWER role (no "Create Activity")

### 12.2 — VIEWER Empty Assignment State

- [ ] If Victor had no assignments → "Aucune assignation à venir" message
- [ ] (Test by temporarily unassigning Victor, then reassign)

### 12.3 — ADMIN Dashboard

_Login as: Admin Alice_

- [ ] Dashboard loads with "Bonjour Alice!" greeting
- [ ] My Assignments section present (shows Alice's Ancien assignment)
- [ ] Quick action buttons: "Create Activity" visible (ADMIN+)
- [ ] Click activity → roster detail WITH edit controls (can assign/unassign people)
- [ ] All dashboard sections stack vertically on mobile

### 12.4 — Full Activity Roster View

- [ ] VIEWER+ clicks activity → detail page with full roster
- [ ] All roles listed with assigned people (avatars + names)
- [ ] "(Invité)" label visible for guest speakers in authenticated view
- [ ] Staffing color indicators (green/amber/red)
- [ ] VIEWER sees read-only; ADMIN sees edit controls for managed departments

---

## Section 13: Authenticated Calendar

_Login as: Admin Alice (or any authenticated user)_

### 13.1 — Visibility & Filtering

- [ ] Authenticated calendar shows ALL activities (public + authenticated-only)
- [ ] Both "Culte du Sabbat" (public) and "Réunion de planification JA" (auth-only) visible
- [ ] Department filter available (multi-select checkboxes)
- [ ] Filter by JA → only JA activities shown
- [ ] Filter by MF → only MF activities shown (OWNER's MF activity from 9.8)
- [ ] Select both → union of activities shown
- [ ] "All" toggle to quickly select/deselect all departments
- [ ] Department color coding on activity entries

### 13.2 — Admin Quick-Create from Calendar

- [ ] ADMIN clicks date cell → quick-create form appears with date pre-filled
- [ ] Department picker filtered to Admin Alice's scope (JA only)
- [ ] Fill minimal fields → save → activity immediately appears on calendar
- [ ] Mobile: form opens as sheet/dialog

---

# Phase 5: REAL-TIME & MULTI-USER

> Requires 2 browser sessions simultaneously.

## Section 14: Real-Time Updates (SignalR)

### 14.1 — Connection Lifecycle

- [ ] Login as Admin Alice in Browser A → DevTools > Network > WS → `/hubs/notifications` active
- [ ] Connection persists across page navigation (shared connection, not per-route)
- [ ] On logout → WebSocket disconnected
- [ ] On network drop → auto-reconnect (disconnect WiFi briefly, reconnect — verify WS reconnects)

### 14.2 — Activity Update Broadcasting

- [ ] Browser A (Admin Alice): open "Culte du Sabbat" → edit title to "Culte du Sabbat — Spécial" → save
- [ ] Browser B (Viewer Victor, same activity open): title updates WITHOUT page refresh (within ~1s)
- [ ] TanStack Query cache invalidated — stale data replaced with fresh

### 14.3 — Scoped Broadcasting

- [ ] Public activity edit → anonymous incognito browser: verify public dashboard reflects change on refresh
- [ ] Department-scoped: Admin Bob (MF) does NOT receive push for JA activity edit
- [ ] User viewing specific activity detail → receives granular update for that activity

---

# Phase 6: CROSS-CUTTING & HARDENING

> These sections can be tested in any order. They verify properties across the entire app with data already in place.

## Section 15: Application Shell & Navigation (All Roles)

### 15.1 — Public Navigation (Anonymous)

- [ ] Anonymous visitor sees top navbar with: church name, navigation links
- [ ] Navigation includes: Accueil, Calendrier, Départements, En Direct
- [ ] "Connexion" button visible in nav
- [ ] No sidebar visible for anonymous users

### 15.2 — Authenticated Navigation (Sidebar)

- [ ] After login, layout switches to sidebar navigation (288px on desktop)
- [ ] Sidebar shows role-filtered navigation items:
  - VIEWER: Dashboard, Calendar, Departments, Users (read-only)
  - ADMIN: + Activities management, Admin section
  - OWNER: + Settings, Activity Templates, Program Schedules, System Health
- [ ] Test each role → verify correct nav items shown/hidden
- [ ] Hamburger menu on mobile (< 768px) toggles sidebar
- [ ] Active page highlighted in sidebar

### 15.3 — Route Protection

- [ ] Anonymous user navigating to `/dashboard` → redirected or shown login prompt
- [ ] Anonymous user navigating to `/admin` → redirected or shown login prompt
- [ ] VIEWER navigating to `/admin/settings` → shown forbidden/access denied
- [ ] ADMIN navigating to `/admin/settings` → shown forbidden/access denied
- [ ] OWNER can access all routes

---

## Section 16: Internationalization (i18n)

- [ ] App starts in French by default (regardless of browser language)
- [ ] All visible UI strings are in French (labels, buttons, headings, empty states, errors)
- [ ] Language toggle available → switch to English → all strings change
- [ ] Switch back to French → all strings revert
- [ ] Language preference persists after page refresh (localStorage)
- [ ] Form validation error messages display in current language
- [ ] Date formatting respects locale (e.g., "samedi 21 mars" in French, "Saturday March 21" in English)
- [ ] French strings don't overflow layout containers (layouts accommodate +20-30% width vs English)

---

## Section 17: Authorization Boundaries (Role × Feature Matrix)

> Test each cell: expected behavior matches actual behavior.
> Use DevTools console `fetch()` or curl to test API-level enforcement.

### 17.1 — Anonymous → Protected Endpoints

- [ ] `GET /api/activities` without auth → 401
- [ ] `GET /api/users` without auth → 401
- [ ] `GET /api/config/admin` without auth → 401
- [ ] `POST /api/activities` without auth → 401
- [ ] `DELETE /api/users/{id}` without auth → 401

### 17.2 — VIEWER → Write Operations

- [ ] `POST /api/activities` as Viewer Victor → 403
- [ ] `PUT /api/activities/{id}` as Viewer Victor → 403
- [ ] `PUT /api/config` as Viewer Victor → 403
- [ ] `DELETE /api/users/{id}` as Viewer Victor → 403
- [ ] `POST /api/users` as Viewer Victor → 403

### 17.3 — ADMIN → OWNER-Only Operations

- [ ] `PUT /api/config` as Admin Alice → 403
- [ ] `GET /api/config/admin` as Admin Alice → 403
- [ ] `POST /api/activity-templates` as Admin Alice → 403
- [ ] `POST /api/program-schedules` as Admin Alice → 403
- [ ] `GET /api/system-health` as Admin Alice → 403
- [ ] `GET /api/setup-progress` as Admin Alice → 403
- [ ] ADMIN cannot assign OWNER role via user creation (dropdown filtered + API rejects)

### 17.4 — ADMIN → Out-of-Scope Department

- [ ] Admin Alice (JA) → `POST /api/activities` with MF department ID → 403
- [ ] Admin Alice (JA) → `PUT /api/activities/{mfActivityId}` → 403
- [ ] Admin Bob (MF) → cannot see/edit JA activities (verify both UI and API)
- [ ] Admin Alice → user list shows only users in JA (not MF users)

### 17.5 — Public API — No Data Leakage

- [ ] `GET /api/public/next-activity` → no `isGuest`, `userId`, `staffingCount`, `concurrencyToken`
- [ ] `GET /api/public/upcoming-activities` → no internal-only fields
- [ ] `GET /api/public/departments` → no sensitive data
- [ ] `GET /api/public/calendar` → only public-visibility activities returned

### 17.6 — Full Role × Feature Matrix

| Feature | ANONYMOUS | VIEWER | ADMIN (scoped) | OWNER |
|---------|-----------|--------|----------------|-------|
| Public Dashboard | View | View | View | View |
| Public Calendar | View public only | View public only | View public only | View public only |
| Login/Logout | Login only | Full | Full | Full |
| Auth Dashboard | 401 | View | View | View |
| My Assignments | 401 | View own | View own | View own |
| Auth Calendar | 401 | View all + filter | View all + filter + quick-create | View all + filter + quick-create |
| Activity Roster | 401 | Read-only | Edit (scoped dept) | Edit (all) |
| Activity CRUD | 401 | 403 | Create/Edit/Delete (scoped) | Create/Edit/Delete (all) |
| User List | 401 | Read-only (all) | Read + Create/Edit (scoped) | Full CRUD (all) |
| Bulk User Create | 401 | 403 | Create (scoped) | Create (all) |
| Avatar Upload | 401 | 403 | Upload (scoped users) | Upload (any user) |
| Church Settings | View public config | 403 | 403 | Full CRUD |
| Department CRUD | 401 | View only | Manage (scoped) | Full CRUD (all) |
| Sub-Ministry CRUD | 401 | View only | Manage (scoped) | Full CRUD (all) |
| Activity Templates | 401 | 403 | 403 | Full CRUD |
| Program Schedules | View public | 403 | 403 | Full CRUD |
| System Health | 401 | 403 | 403 | View |
| Setup Progress | 401 | 403 | 403 | View |
| SignalR Connection | No | Auto-connect | Auto-connect | Auto-connect |

---

## Section 18: System Health (OWNER Only)

- [ ] Login as OWNER → navigate to Admin > System Health
- [ ] Page shows database connectivity status (Healthy)
- [ ] Non-OWNER users get 403 on `/api/system-health` (verified in Section 17)
- [ ] Non-OWNER users don't see System Health in navigation

---

## Section 19: Mobile Responsiveness (375px)

_Resize browser to 375px or use phone on same WiFi network_

- [ ] Public dashboard: church name + hero readable, speaker name above fold without scrolling
- [ ] Public navigation: top nav usable, links accessible
- [ ] Authenticated navigation: hamburger menu visible → tap opens/closes sidebar
- [ ] Activity creation form: all fields accessible, buttons ≥ 44px touch targets
- [ ] Contact picker: searchable, chips removable on mobile
- [ ] Calendar month view: renders, dates tappable, activities identifiable
- [ ] User list: scrollable, "Load more" pagination works
- [ ] Roster view: stacks vertically, all roles and assignments readable
- [ ] All buttons/links throughout app: minimum 44px touch target
- [ ] No horizontal scroll on any page at 375px

---

## Section 20: Accessibility (WCAG 2.1 AA)

- [ ] Keyboard navigation: Tab through all form fields and buttons on key pages (login, activity form, user form)
- [ ] Shift+Tab: reverse navigation works
- [ ] Enter activates buttons and links
- [ ] Screen reader: interactive elements have `aria-label` or equivalent (test with narrator/NVDA)
- [ ] Form errors: `aria-describedby` connects error messages to fields
- [ ] Error announcements: validation errors announced to screen reader on form submit
- [ ] Color contrast: 4.5:1 minimum on all text (use DevTools Lighthouse audit or axe-core)
- [ ] Focus indicators: visible outline on all focusable elements (no `outline: none` without replacement)
- [ ] Minimum text size: no text below 12px
- [ ] Reduced motion: enable `prefers-reduced-motion` in OS → animations stop/simplify
- [ ] Non-decorative images have alt text; interactive icons have accessible labels

---

## Section 21: Performance

- [ ] Initial page load (public dashboard): < 2 seconds on throttled 4G (DevTools > Network > Throttle > Fast 3G)
- [ ] SPA navigation between routes: < 300ms (no full page reloads)
- [ ] API responses: < 500ms under normal load (check DevTools Network timing)
- [ ] Lazy-loaded routes: navigate to home first, verify calendar JS chunk NOT loaded until navigating to `/calendar`
- [ ] Bundle analysis: initial JS payload < 200KB gzipped (check DevTools Network, filter JS)

---

## Section 22: Data Integrity

- [ ] Activity creation: all roles + assignments saved atomically (create activity with 3 roles → verify all 3 exist via API GET)
- [ ] Activity deletion: CASCADE removes all role_assignments + activity_roles (delete activity → query DB or verify no orphans via API)
- [ ] User with assignments deleted → assignments cleaned up (delete a user assigned to a role → verify activity roster updates, no broken references)
- [ ] Department deletion cascade: delete a department that has activities → verify activities handled gracefully (FK constraint error or cascade — document which behavior exists)
- [ ] Concurrent save conflict resolved correctly (tested in Section 9.9 — verify no silent data loss)

---

## Section 23: Known Issues from Retro Action Items

These items were flagged during epic retrospectives. Verify their current state:

- [ ] **SixLabors.ImageSharp vulnerability** (GHSA-rxmq-m78w-7wmc) — check if version > 3.1.7 installed (`dotnet list package`)
- [ ] **Rate limiter flaky test** (SystemHealthEndpointTests 429) — run `dotnet test` 3 times, check for intermittent failure
- [ ] **Hardcoded business logic assertions** — spot-check 5 test files for hardcoded values that may break with config changes
- [ ] **FutureDate() standardization** — grep for hardcoded future dates in tests (e.g., `"2026-`, `"2027-`) that could expire
- [ ] **`.AsNoTracking()` with nested Includes** — navigate department detail page with sub-ministries + activities loaded → verify no EF Core tracking errors in backend logs
- [ ] **Pre-existing backend test failure** — run full `dotnet test` suite, document any pre-existing failures

---

## QA Sign-Off

| # | Section | Phase | Depends On | Tester | Date | Status | Notes |
|---|---------|-------|------------|--------|------|--------|-------|
| 1 | Infrastructure | 1 | — | | | | |
| 2 | OWNER Auth | 2 | §1 | | | | |
| 3 | Church Config | 2 | §2 | | | | |
| 4 | Departments | 2 | §2 | | | | |
| 5 | Activity Templates | 2 | §2 | | | | |
| 6 | Program Schedules | 2 | §2 | | | | |
| 7 | Users & Roles | 2 | §2, §4 | | | | |
| — | Checkpoint A | 2 | §3–§7 | | | | |
| 8 | ADMIN Auth | 3 | §7 | | | | |
| 9 | Activities & Assignments | 3 | §5, §7, §8 | | | | |
| — | Checkpoint B | 3 | §9 | | | | |
| 10 | Public Dashboard | 4 | §3, §9 | | | | |
| 11 | Public Calendar | 4 | §9 | | | | |
| 12 | Auth Dashboard | 4 | §9 | | | | |
| 13 | Auth Calendar | 4 | §9 | | | | |
| 14 | Real-Time (SignalR) | 5 | §9 | | | | |
| 15 | Shell & Navigation | 6 | §7 | | | | |
| 16 | i18n | 6 | any | | | | |
| 17 | Auth Boundaries | 6 | §7 | | | | |
| 18 | System Health | 6 | §2 | | | | |
| 19 | Mobile | 6 | §9 | | | | |
| 20 | Accessibility | 6 | §9 | | | | |
| 21 | Performance | 6 | §9 | | | | |
| 22 | Data Integrity | 6 | §9 | | | | |
| 23 | Known Issues | 6 | — | | | | |

**Production Deployment Gate**: ALL sections must be signed off with Status = PASS before deployment.
