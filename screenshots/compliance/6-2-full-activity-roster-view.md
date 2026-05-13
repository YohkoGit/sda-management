# UI Validation — Story 6.2: Full Activity Roster View

**Date:** 2026-03-16
**Validated by:** Claude (UI Validation Workflow)
**Screenshots:** `screenshots/epic-6/6-2-full-activity-roster-view/`
**Screens captured:** 6 of 6 (no skips)

## UX Spec Sections Referenced

- §6 Visual Design Foundation — Color System, Typography, Spacing
- §8 User Journey Flows — Journey 2: Check and Confirm
- §9 Component Strategy — RoleSlot, DepartmentBadge, StaffingIndicator, ActivityCard
- §10 UX Consistency Patterns — Authenticated Register rules
- §11 Responsive Design & Accessibility

## Per-Screen Compliance

### Screen 01 — Activity Detail Data (Mobile 375px, VIEWER)

| # | Check | Result |
|---|-------|--------|
| 1 | Back button "Retour" links to /dashboard | PASS |
| 2 | Department badge "JA" with teal background | PASS |
| 3 | Formatted date ("Ce Sabbat") + relative distance ("dans 4 jours") | PASS |
| 4 | Activity title "Culte Divin" as h1, text-2xl font-black | PASS |
| 5 | Time range "10h00-12h00" | PASS |
| 6 | Special type badge "Journee de la Femme" | PASS |
| 7 | StaffingIndicator: shape icon + fraction "5/7" in amber | PASS |
| 8 | Description text visible | PASS |
| 9 | Department color left-border accent (4px teal) on header card | PASS |
| 10 | Section heading h2 "Composition de l'activite" | PASS |
| 11 | PREDICATEUR: uppercase micro-label text-[11px] font-black | PASS |
| 12 | Headcount "1/1" in emerald-600 (complete) | PASS |
| 13 | 48px avatar (InitialsAvatar size=lg) | PASS |
| 14 | ANCIEN DE SERVICE: "1/1" in emerald-600 | PASS |
| 15 | DIACRES: "2/3" in amber-600 (partial) | PASS |
| 16 | Two avatars + dashed-border empty slot "Non assigne" | PASS |
| 17 | DIACONESSES: "1/2" in amber-600 (partial) | PASS |
| 18 | Guest label "(Invite)" in muted text | PASS |
| 19 | Dashed-border 48px circle placeholder for unfilled slots | PASS |
| 20 | NO "Modifier" edit button (VIEWER role) | PASS |
| 21 | Role slots stacked single column (mobile) | PASS |
| 22 | Semantic tokens throughout | PASS |
| 23 | Minimum 11px text (authenticated register) | PASS |
| 24 | Full names under avatars (not abbreviated) | PASS |

### Screen 02 — Activity Detail Data (Desktop 1280px, VIEWER)

| # | Check | Result |
|---|-------|--------|
| 1 | Authenticated sidebar visible on left | PASS |
| 2 | Content area constrained (max-w container) | PASS |
| 3 | Back button and header visible | PASS |
| 4 | Department badge + date + title + time + special type + staffing indicator | PASS |
| 5 | Description text visible | PASS |
| 6 | Role slots in 2-column grid (lg:grid-cols-2) | PASS |
| 7 | 48px avatars with full names below | PASS |
| 8 | Empty slots with dashed borders + "Non assigne" | PASS |
| 9 | Guest label "(Invite)" visible | PASS |
| 10 | No edit button (VIEWER) | PASS |
| 11 | Proper spacing between header and roster | PASS |
| 12 | Full names under avatars (not abbreviated) | PASS |

### Screen 03 — Activity Detail (Desktop 1280px, ADMIN)

| # | Check | Result |
|---|-------|--------|
| 1 | "Modifier" edit link visible in header area | PASS |
| 2 | Edit link navigates to /admin/activities | PASS |
| 3 | Same roster display as VIEWER (read-only) | PASS |
| 4 | Sidebar shows admin navigation (Administration, Activites, Membres) | PASS |

### Screen 04 — Skeleton Loading (Mobile 375px)

| # | Check | Result |
|---|-------|--------|
| 1 | Skeleton placeholders matching final layout structure | PASS |
| 2 | Header skeleton (title, date, badge areas) | PASS |
| 3 | 4 role slot skeletons below header | PASS |
| 4 | Back button area visible during loading | PASS |
| 5 | No broken layout or flash of error state | PASS |

### Screen 05 — 404 Not Found (Mobile 375px)

| # | Check | Result |
|---|-------|--------|
| 1 | "Activite non trouvee" message displayed (h1) | PASS |
| 2 | Hint text: "Cette activite n'existe pas ou a ete supprimee" | PASS |
| 3 | Link "Retour au tableau de bord" navigates to /dashboard | PASS |
| 4 | Clean layout without broken components | PASS |

### Screen 06 — AssignmentCard Navigation (Mobile 375px)

| # | Check | Result |
|---|-------|--------|
| 1 | Assignment cards rendered as clickable links (`<a>` tags) | PASS |
| 2 | Cards have proper `<Link>` component wrapping | PASS |
| 3 | href attributes: /activities/1, /activities/2, /activities/3 | PASS |
| 4 | Cards maintain existing visual styling (rounded-2xl, department color border) | PASS |
| 5 | Accessible aria-labels on links (role + title + date) | PASS |

## Findings Summary

| Severity | Screen(s) | Issue | Resolution |
|----------|-----------|-------|------------|
| MINOR (FIXED) | 01, 02, 03 | Assignee names truncated by `w-16` (64px) container + `truncate` class. | Fixed: widened to `w-20` (80px), removed `truncate`. Names now display fully. Re-validated — all pass. |

## Overall Assessment

**Compliance: PASS** (0 open findings, 1 fixed during validation)

All 6 screens comply with the UX design specification after fixing the name truncation issue in `RoleSlotDisplay.tsx`. The fix widened person containers from `w-16` to `w-20` and removed the `truncate` class, allowing full names to display as specified in Story 6.2 Task 6.4. All 17 component tests pass after the fix.
