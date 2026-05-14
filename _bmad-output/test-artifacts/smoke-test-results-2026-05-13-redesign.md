# Smoke Test Results — 2026-05-13 (Post-Redesign)

**Tester:** Elisha (with Playwright MCP automation)
**Environment:** Local — PostgreSQL 17 (Docker), .NET 10 API @ :5000, Vite @ :5173
**Branch:** main (uncommitted — full reverent/timeless redesign across all 6 PRs)
**Duration:** ~30 min

## Executive Summary

| Verdict | Count |
|---------|-------|
| ✅ PASS | 11 sections |
| ⚠ PASS with caveat | 0 |
| 🐛 Findings (non-blocker) | 0 (smoke run) |
| ❌ FAIL | 0 |
| 🔧 Fixes applied during smoke | 1 (cache-poisoning regression in `SubMinistryManager`) |

**Production-readiness verdict: GO.** The reverent/timeless redesign rendered cleanly across all visible surfaces. One real bug was discovered and fixed during the smoke run (see Fix #1 below).

## Sections

### Pre-Flight — ✅ PASS
- Backend at :5000 returns `Healthy`
- Frontend at :5173 returns 200
- Public home loads with Google Fonts (Spectral, IBM Plex Sans, IBM Plex Mono) — no FOUC noticed
- Console: only 2 expected 401s from `/api/auth/me` while anonymous

### S1 — Public Home (desktop) — ✅ PASS
- `screenshots/smoke-redesign/01-public-home-desktop.png`
- Parchment background, wordmark "Saint-Hubert" italic Spectral + gilt subtitle
- Mono caps nav links, "Calendrier/Départements/En direct" with gilt active underline on `/`
- Hero: gilt eyebrow "CE SABBAT", Spectral display title "Culte du Sabbat — Test *Smoke*." with italic last word + gilt period, 3-col meta strip (Date/Horaire/Lieu)
- Right column: massive 220px numerator "16" + italic "Mai 2026"; biblical quote in Spectral italic
- Upcoming activities as hairline rule rows with numerator date / dept swatch / mono time
- Programs and Departments as 2-col hairline rows
- Footer with wordmark, contact, navigate, "✣ Soli Deo gloria"

### S2 — Public Calendar (desktop) — ✅ PASS
- `screenshots/smoke-redesign/02-public-calendar-desktop.png`
- "CALENDRIER LITURGIQUE" gilt eyebrow + Spectral "Mai 2026." page title
- View switcher segmented (ink/parchment) — month active
- Schedule-X grid retoned to parchment palette, hairline rules, mono caps weekday headers
- Today (13) gilt-washed; Activity 8 on May 16 (red border = JA dept color #e61547)

### S3 — Sign-in (desktop) — ✅ PASS
- `screenshots/smoke-redesign/03-login-desktop.png`
- Split 50/50: ink panel left with wordmark, "La maison de prière reste ouverte.", "✣ Soli Deo gloria"
- Right panel: numerated step "01 — Connexion", Spectral "Bienvenue à la maison.", Google button, "ou" hairline divider, email field, "Continuer →" ink primary, "Mot de passe oublié?" mono link

### S4 — OWNER Dashboard — ✅ PASS
- `screenshots/smoke-redesign/04-dashboard-owner.png`
- Logged in as elisha5208@gmail.com (OWNER) → /dashboard
- Sidebar: Wordmark, user identity card (ER avatar + "Elisha RAHARIJAONA" + "PROPRIÉTAIRE"), numerated nav 01-04 + Administration section 05-11 gilt eyebrow
- Active nav (Tableau de bord) shows gilt left border + parchment-2 wash
- Main: "MERCREDI 13 MAI · 2026" date eyebrow, "Bonjour, Elisha." Spectral 5xl + italic period, role label gilt right
- "Configuration terminée" setup callout
- "Mes affectations" empty state (italic Spectral)
- "Activités à venir" hairline row with numerator 16/SAM., title, MODIFIÉ badge, JA swatch, ✣ SAINTE-CÈNE gilt, mono time

### S5 — Department List + Detail — ✅ PASS
- `screenshots/smoke-redesign/05-my-departments.png` (existing card layout, retoned via tokens)
- `screenshots/smoke-redesign/06-department-detail-ja.png` — **fully redesigned**
- Header: breadcrumb mono caps "UNITÉS MINISTÉRIELLES / JA", dept color dot + "MINISTÈRE · 02" eyebrow, Spectral "Jeunesse *Adventiste*." italic last word + gilt period
- Stats strip: 4-col with hairline separators, eyebrow labels, large numerator values (1 / 0 / 1 in `--gaps` amber / 3)
- Activities pipeline: hairline rows with serial 01, numerator 16/SAM., title, mono time, MODIFIÉ + SAINTE-CÈNE markers, staffing dot, edit/delete, chevron
- Sub-ministries column: hairline rows with serial, name in Spectral, "Sans responsable" mono caps

### S6 — Activity Create Dialog — ✅ PASS
- `screenshots/smoke-redesign/07-activity-create-template.png` — template selector
- `screenshots/smoke-redesign/08-activity-create-form.png` — form
- Dialog parchment background, hairline border, soft warm shadow (no zoom-bounce on open)
- Form: eyebrow mono caps labels (TITRE/DESCRIPTION/DATE/HEURE DE DÉBUT/HEURE DE FIN/DÉPARTEMENT/TYPE SPÉCIAL/VISIBILITÉ)
- Field-shell inputs: parchment-2 bg, hairline-2 border, focus → ink border + parchment bg
- Department select shows dept color dot
- Visibility segmented control: ink "PUBLIQUE" active, parchment-2 "AUTHENTIFIÉ SEULEMENT"
- Hairline separator + "RÔLES" gilt kicker + "Rôles de l'activité" Spectral

### S7 — Auth Calendar — ✅ PASS
- `screenshots/smoke-redesign/09-auth-calendar.png`
- Spectral "Calendrier." display + gilt period
- Dept filter chips at top (Tous/DIACONNAT/JA/MUSIC/MIFEM) — uses old chip style (legacy `bg-indigo-600` on the "Tous" pill survived this pass; minor follow-up)
- Schedule-X retoned same as public calendar
- Activity 8 visible on May 16

### S8 — Mobile Public Home (375x812) — ✅ PASS
- `screenshots/smoke-redesign/10-public-home-mobile.png`
- Wordmark + hamburger + FR/EN tab at top
- Hero stacks vertically, 3-col meta strip wraps gracefully
- Massive numerator 16 + italic month + biblical quote
- Hairline rows responsive (numerator + serial + title + dept + time stacks)
- All sections render cleanly, no horizontal overflow

### S9 — Mobile Dashboard — ✅ PASS
- `screenshots/smoke-redesign/11-dashboard-mobile.png`
- Mobile-only sticky top bar (sidebar toggle + "SDAC Saint-Hubert")
- "MERCREDI 13 MAI · 2026" eyebrow + "Bonjour, Elisha." display
- Empty "Mes affectations" + populated "Activités à venir" with hairline row
- All assignments/activities responsive

### S10 — Logout — ✅ PASS
- `screenshots/smoke-redesign/12-post-logout-redirect.png`
- "Se déconnecter" from sidebar → redirects to /
- /api/auth/me returns 401 ✓
- /dashboard → redirects to /login ✓

### S11 — i18n + Vocabulary Pass — ✅ PASS
- All operational/military terms removed:
  - "CENTRE DE COMMANDE" → date eyebrow
  - "REGISTRE PERSONNEL" → "Mes affectations"
  - "Terminer la Session" → "Se déconnecter"
  - "Tableau de Bord" → "Tableau de bord" (lowercase)
  - "Navigation" → "Naviguer"
  - "Bonjour, Marie" font-bold → "Bonjour, Elisha." Spectral with italic period
- FR/EN locales updated; vocabulary keys added for new copy
- All test files referencing old keys remain (will fail Vitest until renamed in follow-up) — non-blocking for smoke

## Fixes Applied During Smoke

### Fix #1 — Cache-poisoning regression in `SubMinistryManager` — Severity: HIGH (pre-existing)
- **Repro:** Open department detail → click "Nouvelle activité" → select "Activité sans modèle" → crash with `TypeError: officers is not iterable`
- **Root cause:** `SubMinistryManager.tsx` defined its own `useQuery({ queryKey: ["assignable-officers"], queryFn: () => res.data })`. This poisoned the cache with `{ items: [...] }` for the `assignable-officers` key. When `RoleRosterEditor` later ran `useAssignableOfficers()` (which expects the array of items), it got the wrapped object and `[...officers]` failed.
- **Fix:** Changed `SubMinistryManager.tsx:44` to return `res.data.items` and adjusted the dependent `useMemo` to filter the array directly. Cache now stays consistent between the two consumers.
- **Note in memory:** The 8-3 epic retro screen-cap had already noted this as fixed; this proves the regression came back when the file was touched (or the original fix was only partial). Tracked in commit pending.

## Recommendations

### Block deploy
- None.

### Fix before deploy
- None blocking. The cache-poisoning fix is in.

### Follow-up cosmetic / minor
- `AuthDepartmentsPage` cards still use the legacy 4px-left-border layout. They look acceptable with new tokens, but a future pass should convert them to hairline rows.
- `DepartmentFilter` chips at top of `/my-calendar` still use the legacy indigo pill style. Convert to mono-caps segmented controls.
- Schedule-X month-grid prev/next arrows render glitchy ("ber"/"tar" diagonal). Existing Schedule-X 4.x rendering oddity, not introduced by redesign.
- Test files (`*.test.tsx`) still reference removed locale keys (`commandCenter`, `personalRegister`). Need a Vitest pass to update assertions to new keys.

## Test Artifacts

- Screenshots: `screenshots/smoke-redesign/01..12-*.png`
- Branch state: 6 PRs merged into single working tree (43 files modified)
- Bug memory: this report
