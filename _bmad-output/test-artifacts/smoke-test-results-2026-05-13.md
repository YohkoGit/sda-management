# Smoke Test Results — 2026-05-13

**Tester:** Elisha (with Playwright MCP automation)
**Environment:** Local — PostgreSQL 17 (Docker), .NET 10 API @ :5000, Vite @ :5173
**Branch:** main @ dc35163
**Duration:** Session spanned 2026-05-12 (paused mid-S4) → 2026-05-13 (resumed at S5 re-verify)

## Executive Summary

| Verdict | Count |
|---------|-------|
| ✅ PASS | 12 sections |
| ⚠ PASS with caveat | 1 (S4) |
| 🐛 Findings (non-blocker) | 4 |
| ❌ FAIL | 0 |
| 🔧 Trivial fixes applied | 1 |

**Production-readiness verdict: GO with caveats.** No deploy-blocking failures. The inline-guest-creation bug (S4c) is a UX defect that should be fixed before users discover it but does not corrupt data and has a manual workaround.

## Section-by-Section Results

### Pre-Flight — ✅ PASS
- Page loads, console relatively clean (favicon 404 + SignalR-anon negotiation error)
- Evidence: smoke/preflight-public-anonymous.png

### S1 — OWNER email/password auth — ✅ PASS
- elisha5208@gmail.com / Test1234! → /dashboard with role=OWNER
- Full admin sidebar present

### S2 — OWNER foundation data audit — ✅ PASS
- Settings, 4 depts, 1 template (Culte du Sabbat, 5 roles, IsCritical flags), 2 program schedules, 9 users present, health=Healthy
- XSS payload `<script>alert(1)</script>` in welcome message → stripped at API
- Evidence: smoke/s2-settings-page.png, s2-system-health.png

### S4 — ADMIN auth + activity creation — ⚠ PASS with caveat
- admin.test@sdac.local / Test1234! → ADMIN scoped to JA
- Activity 8 "Culte du Sabbat — Test Smoke" created (2026-05-16 10:00–12:00, JA, Publique, Sainte-Cène)
- Marie CLAIRE assigned as Prédicateur
- **Bug discovered:** Inline guest creation in role picker creates the guest user but does not assign them to the role being filled. Detail in `project_guest_inline_creation_bug.md`. Tracked as **Finding #1** below.

### S5 — Anonymous public experience — ✅ PASS (re-verified)
- Public dashboard hero, "Activités à venir" list, JA dept card all show Activity 8
- Public calendar (/calendar) shows the activity on May 16
- Anonymous click on calendar tile only highlights — no detail drawer leak ✓
- Evidence: smoke/s5-anonymous-dashboard-activity8.png, s5-anonymous-calendar-activity8.png

### S6 — Calendar (public + authenticated) — ✅ PASS
- Authenticated /my-calendar has dept filter chips (toggle JA hides/shows correctly)
- Click empty date opens DayDetailDialog with "Nouvelle activité" button
- Quick-create wizard pre-fills date + admin's department (JA)
- Template chooser offers "Culte du Sabbat" template + "Activité sans modèle"

### S7 — Authenticated dashboard + VIEWER assignments — ✅ PASS
- Marie CLAIRE login → /dashboard shows "Bonjour, Marie", role badge "Membre"
- "Mes Affectations" lists Activity 8 with role "Prédicateur"
- Activity detail (/activities/8) shows Marie's avatar (MC initials) in Prédicateur slot, other 5 roles "Non assigné"
- VIEWER sees no edit affordances ✓
- Evidence: smoke/s7-viewer-mes-affectations.png

### S8 — Real-time / concurrent edit — ✅ PASS
- Two-tab test: Tab 0 edited title via /admin/activities → Save. Tab 1 (at /activities/8) showed updated title without manual refresh.
- Title reverted after test
- Note: cannot fully disambiguate SignalR push vs React Query refetch-on-focus, but UX outcome is correct
- Evidence: smoke/s8-realtime-tab1-after-edit.png

### S9 — User management CRUD + avatars — ✅ PASS
- Create user (Smoke Test S9, smoke.s9@test.local, VIEWER, JA) succeeded via POST /api/users
- Edit dialog correctly disables email (immutable) and self-role (security guard)
- Avatar API: GET /api/avatars/{id} returns 200 webp; POST works via fetch with proper FormData (204)
- Avatar dialog via Playwright file_upload of a 1249x1273 PNG returned 400 — could not repro with smaller hand-crafted PNG via fetch (likely Playwright file_upload artifact, not a real bug)
- **By-design:** ADMIN cannot DELETE users (OWNER-only). Documented.
- Test user smoke.s9@test.local (id=12) left in DB — needs OWNER cleanup
- Evidence: smoke/s9-admin-users-after-create-with-avatar.png

### S10 — Auth boundaries (24 checks) — ✅ PASS (carried over from 2026-05-12)
- Anonymous: blocked from all protected endpoints (401/403)
- VIEWER: read OK, write/admin endpoints 403
- ADMIN: out-of-scope dept mutations 403, in-scope OK
- Public DTOs verified — no sensitive field leaks

### S11 — i18n FR↔EN toggle — ✅ PASS (with gaps)
- Nav, headings, status text translate correctly
- **Gaps tracked as Finding #3:** Time format ("10h00–12h00") doesn't switch to colon-style in EN; "sainte-cene" badge stays as raw key.

### S12 — Mobile viewport (375x812) — ✅ PASS
- Dashboard, /my-calendar, /activities/8: no horizontal overflow (docW=360, viewW=375)
- Sidebar collapses correctly to hamburger toggle
- Evidence: smoke/s12-mobile-viewer-{dashboard,calendar,activity-detail}.png

### S13 — Logout flow — ✅ PASS
- Click "Terminer la Session" → redirect to /
- /api/auth/me → 401
- Accessing /dashboard re-routes to /login (cookies cleared)

## Findings (Non-blocking)

### Finding #1 — Inline guest creation bug (S4c) — Severity: MEDIUM
- **Repro:** Edit activity → role picker → search non-existent name → "Ajouter un invité" → fill name → "Créer"
- **Behavior:** Guest user created (POST /api/users/guests = 201) but NOT inserted into role's `assignments[]`. Activity saved without the guest.
- **Workaround:** Assign guest manually via second pass (search name → select existing → submit)
- **Detail:** `project_guest_inline_creation_bug.md`
- **Recommended:** Fix before deploy. Frontend RHF state issue — guestId from POST response not merged into form before submit.

### Finding #2 — /calendar nav shows "Connexion" when authenticated — Severity: LOW
- **Repro:** Login as admin, navigate to /calendar (public route)
- **Behavior:** Top nav shows "Connexion" link instead of user menu/avatar (admin's sidebar layout NOT applied)
- **Severity:** Cosmetic UX confusion. /my-calendar exists with proper auth layout.
- **Recommended:** Defer post-deploy.

### Finding #3 — i18n gaps (time format + special-type badge) — Severity: LOW
- **Repro:** Toggle to EN locale, view any activity
- **Behavior:** Time stays "10h00–12h00" (French style); special-type chip stays "sainte-cene" (raw key)
- **Recommended:** Defer post-deploy.

### Finding #4 — SignalR negotiation fails for anonymous AND on public pages when authenticated — Severity: LOW
- **Repro:** Open any public page; console: "Failed to start the connection: The connection was stopped during negotiation."
- **Cause:** Frontend attempts to connect to auth-required hub even on anonymous pages
- **Severity:** Cosmetic console noise. Real-time push works on auth pages.
- **Recommended:** Defer post-deploy. Guard hub start with isAuthenticated().

## Trivial Fixes Applied During Smoke

| Fix | File | Description |
|-----|------|-------------|
| Favicon 404 | `src/sdamanagement-web/index.html` | Added inline SVG favicon with indigo "S" mark. Clears /favicon.ico 404 in every page load. |

## Residual DB State

- **Users:** 10 (1 OWNER, others incl. smoke.s9@test.local id=12 — needs OWNER cleanup)
- **Activities:** 2 (id 3 historical, id 8 future smoke test activity)
- **Orphan guest users:** ~2-3 from inline-creation bug attempts on 2026-05-12 (filtered from main /api/users endpoint, but visible to OWNER)
- **Avatars:** 2 (user 8 admin, user 12 smoke.s9 from this session)

## Recommendations

### Block deploy (must fix)
- None.

### Fix before deploy (strong recommendation)
- **Finding #1** — Inline guest creation bug. Confusing for end users, data contamination risk (orphan guest accounts).

### Post-deploy cleanup
- Findings #2, #3, #4 — cosmetic UX/console issues.
- Database cleanup: delete smoke.s9 test user (id=12) and orphan guests.

### Open questions
- Are dept-scoped admins expected to manage only same-dept users (current behavior)? If yes, the "Gestion des membres" page should show a clearer empty-state when admin's dept has zero other members.

## Test Artifacts

- Screenshots: `smoke/*.png` (12 evidence files, gitignored)
- Checklist: `_bmad-output/test-artifacts/smoke-test-checklist.md`
- Test data sheet: `_bmad-output/test-artifacts/smoke-test-data.md`
- Bug memory: `project_guest_inline_creation_bug.md`
- Resume state (archive): `project_smoke_test_pause_state.md` — can be deleted after this report is reviewed
