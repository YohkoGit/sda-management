# UX Compliance Report — Story 5.5: Public Calendar View

**Date:** 2026-03-13
**Validator:** UI Validation Workflow (Playwright + visual review)
**Screens captured:** 6

## UX Spec Sections Referenced

- §6 Visual Design Foundation — Color System (department colors, semantic tokens)
- §7 Design Direction — Mock Faithful Command (A+D Hybrid)
- §8 User Journey Flows — Journey 1: Open and Know
- §9 Component Strategy — WeekCalendar (Schedule-X)
- §10 UX Consistency Patterns — Public Register rules (min 14px text)
- §11 Responsive Design & Accessibility
- ADR-1: Calendar Rendering — Library-Based WeekCalendar (@schedule-x/react)

## Per-Screen Compliance

### Screen 01 — Month Grid Desktop (1280x800)

| # | Check | Result |
|---|-------|--------|
| 1 | Page heading in text-2xl font-bold text-slate-900 | [x] PASS |
| 2 | Schedule-X month grid visible with day cells | [x] PASS |
| 3 | Sunday-first week layout (firstDayOfWeek: 7) | [x] PASS — SUN is first column |
| 4 | Department-colored event blocks (CU rose, JA teal, MIFEM violet) | [x] PASS — left border + tinted background |
| 5 | Event blocks show dept abbreviation in title ([CU], [JA], [MIFEM]) | [x] PASS |
| 6 | Color blocks large enough for quick-scan category signal | [x] PASS — event fills cell width |
| 7 | mx-auto max-w-7xl wrapper | [x] PASS |
| 8 | Calendar container explicit height (h-[800px] on lg) | [x] PASS |
| 9 | Top nav consistent with other public pages | [x] PASS |
| 10 | View switcher visible (Month/Week/Day) | [x] PASS — dropdown selector |
| 11 | role=region with aria-label on calendar container | [x] PASS — verified via a11y snapshot |

### Screen 02 — Mobile Responsive Day View (375x812)

| # | Check | Result |
|---|-------|--------|
| 1 | Page heading visible | [x] PASS |
| 2 | Day view rendered (not month grid — responsive mode) | [x] PASS — isResponsive auto-switch |
| 3 | No horizontal scrolling | [x] PASS |
| 4 | Calendar fills container width | [x] PASS |
| 5 | Department-colored events visible on day timeline | [x] PASS — CU rose event on SAT 14 |
| 6 | Event blocks show dept abbreviation in title | [x] PASS — "[CU] Culte du Sabbat" |
| 7 | h-[600px] calendar container height on mobile | [x] PASS |
| 8 | px-4 py-6 padding | [x] PASS |

### Screen 03 — Week View Desktop (1280x800)

| # | Check | Result |
|---|-------|--------|
| 1 | 7-day week view with time axis | [x] PASS — scrollable 06:00–22:00 |
| 2 | Sunday-first layout (first column is Sunday) | [x] PASS — SUN 8 through SAT 14 |
| 3 | Department-colored event blocks in time slots | [x] PASS — CU rose on Saturday |
| 4 | Events positioned correctly in time slots | [x] PASS — 9:30 AM–12:00 PM block accurate |
| 5 | Event width ~95% of column (eventWidth: 95) | [x] PASS |

### Screen 04 — Error State Desktop (1280x800)

| # | Check | Result |
|---|-------|--------|
| 1 | Page heading still visible | [x] PASS |
| 2 | Error message in text-sm text-red-600 | [x] PASS — "Unable to load calendar" in red |
| 3 | Retry button visible (rounded-md bg-slate-100) | [x] PASS |
| 4 | Calendar container still rendered (not crashed) | [x] PASS — empty month grid |
| 5 | No broken layout | [x] PASS |

### Screen 05 — French Language Desktop (1280x800)

| # | Check | Result |
|---|-------|--------|
| 1 | Page heading 'Calendrier' (French) | [x] PASS |
| 2 | Nav labels in French (Accueil, Calendrier, Départements, En Direct) | [x] PASS |
| 3 | "Connexion" button (French) | [x] PASS |
| 4 | Schedule-X day headers in French locale | [ ] FINDING — see below |
| 5 | Department-colored events visible | [x] PASS |

### Screen 06 — Skeleton Loading Mobile (375x812)

| # | Check | Result |
|---|-------|--------|
| 1 | Skeleton h-8 w-48 for title placeholder | [x] PASS — gray bar visible |
| 2 | Skeleton h-[600px] w-full rounded-2xl for calendar placeholder | [x] PASS — large gray placeholder |
| 3 | mx-auto max-w-7xl px-4 py-6 wrapper | [x] PASS |
| 4 | No broken layout during loading | [x] PASS — nav renders, content area stable |

## Findings Summary

| # | Severity | Screen | Issue | Recommendation |
|---|----------|--------|-------|----------------|
| 1 | Minor (cosmetic) | 05 | Schedule-X day headers (SUN, MON, TUE...) don't update when language is toggled mid-session. `useCalendarApp` creates immutable config with initial locale. | Accept for MVP. Page refresh resolves it. Dynamic locale update requires calendar instance recreation, which is a Schedule-X limitation. Defer to Epic 7 (authenticated calendar) if locale reactivity is needed. |

## Overall Assessment: PASS

All 8 acceptance criteria are visually verified:

- **AC #1** (Sunday-first calendar with public activities): Screens 01, 05
- **AC #2** (Multiple view switching): Screens 01, 02, 03
- **AC #3** (Mobile layout adaptation): Screen 02
- **AC #4** (Public calendar API): Verified via route interception — correct data shape
- **AC #5** (Department color coding): Screens 01, 02, 03, 05
- **AC #6** (Loading and error states): Screen 04 (error + retry)
- **AC #7** (Dynamic event loading): Verified via route interception — onRangeUpdate fires
- **AC #8** (Accessibility): role=region + aria-label verified via a11y snapshot (Screen 01)

The single finding is cosmetic (Schedule-X locale doesn't update dynamically) and does not affect core functionality.
