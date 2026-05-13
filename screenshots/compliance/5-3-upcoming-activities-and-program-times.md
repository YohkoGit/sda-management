# UI Compliance Report — Story 5.3: Upcoming Activities & Program Times

**Date:** 2026-03-13
**Validator:** Claude (UI Validation Workflow)
**Screens captured:** 8 (7 planned + 1 bonus)

## UX Spec Sections Referenced

- §6 Visual Design Foundation — Color System (indigo-600 accent, slate palette, department colors)
- §6 Visual Design Foundation — Typography System (text-2xl font-bold headings, 14px minimum public text)
- §6 Visual Design Foundation — Spacing & Layout (rounded-2xl cards, 4px base unit, gap-4)
- §7 Design Direction — Mock Faithful Command (A+D Hybrid)
- §8 User Journey Flows — Journey 1: Open and Know (upcoming activities list, program times)
- §9 Component Strategy — ActivityCard list variant (28px avatar, 4px left-border accent)
- §10 UX Consistency Patterns — Public Register rules (no micro-labels, min 14px text)
- §11 Responsive Design — Mobile-first (base → sm: → lg: breakpoints, NO md:)

## Per-Screen Compliance

### Screen 01 — Upcoming Activities Mobile (375×812)

| Check | Status |
|---|---|
| Section heading "Activités à venir" in text-2xl font-bold text-slate-900 | [x] PASS |
| bg-white section background | [x] PASS |
| Activity cards stacked vertically (single column on mobile) | [x] PASS |
| Each card has rounded-2xl border border-slate-200 bg-white | [x] PASS |
| Each card has 4px left border colored with department color | [x] PASS |
| Date line in text-sm font-semibold text-indigo-600 | [x] PASS |
| Time range in text-sm text-slate-600 (French format: 9h30–12h00) | [x] PASS |
| Activity title in text-lg font-bold text-slate-900 | [x] PASS |
| Department badge (Badge variant=secondary) with abbreviation | [x] PASS |
| Prédicateur row: 28px avatar (initials fallback bg-indigo-600) + name | [x] PASS |
| No prédicateur row when predicateurName is null | [x] PASS |
| Special type badge (variant=outline) when specialType present | [x] PASS |
| Minimum 14px text (public register) | [x] PASS |
| mx-auto max-w-7xl px-4 py-8 inner wrapper | [x] PASS |
| gap-4 between cards | [x] PASS |

### Screen 02 — Upcoming Activities Desktop (1280×800)

| Check | Status |
|---|---|
| Section heading "Activités à venir" in text-2xl font-bold | [x] PASS |
| 2-column grid layout (sm:grid-cols-2) | [x] PASS |
| Activity cards with department color left-border accent | [x] PASS |
| Cards have sm:p-5 padding on desktop | [x] PASS |
| max-w-7xl content constraint | [x] PASS |
| sm:py-12 section vertical padding | [x] PASS |

### Screen 03 — Program Times Mobile (375×812)

| Check | Status |
|---|---|
| Section heading "Horaire des programmes" in text-2xl font-bold text-slate-900 | [x] PASS |
| bg-slate-50 section background (subtle contrast from white) | [x] PASS |
| Each program row: title + host stacked above day + time (flex-col on mobile) | [x] PASS |
| Program title in text-base font-semibold text-slate-900 | [x] PASS |
| Host name in text-sm text-slate-500 with dash separator | N/A (no host names in seed data) |
| Day name in text-sm font-medium text-slate-700 (French: "Samedi") | [x] PASS |
| Time range in text-sm text-slate-500 (French format) | [x] PASS |
| divide-y divide-slate-200 separators between rows | [x] PASS |
| Readable without horizontal scrolling | [x] PASS |
| Minimum 14px text | [x] PASS |
| mx-auto max-w-7xl px-4 py-8 inner wrapper | [x] PASS |

### Screen 04 — Program Times Desktop (1280×800)

| Check | Status |
|---|---|
| Program rows: title+host left, day+time right (sm:flex-row sm:justify-between) | [x] PASS |
| bg-slate-50 section background | [x] PASS |
| sm:py-12 section vertical padding | [x] PASS |
| max-w-7xl content constraint | [x] PASS |

### Screen 05 — Empty Upcoming Activities Mobile

| Check | Status |
|---|---|
| Section heading still visible | [x] PASS |
| Empty message: "Aucune activité à venir — revenez bientôt!" | [x] PASS |
| Empty text in text-base text-slate-500 text-center | [x] PASS |
| No broken layout, no missing sections | [x] PASS |

### Screen 06 — Empty Program Schedules (section hidden)

| Check | Status |
|---|---|
| No "Horaire des programmes" heading visible | [x] PASS |
| No empty container or gap where section would be | [x] PASS |
| Upcoming activities section flows to next section placeholder | [x] PASS |

### Screen 07 — English Language Toggle Desktop

| Check | Status |
|---|---|
| Section heading "Upcoming Activities" (English) | [x] PASS (after i18n fix) |
| "Program Schedule" heading (English) | [x] PASS (after i18n fix) |
| Day names in English ("Saturday") | [x] PASS |
| Date format in English | [x] PASS |
| All card text in English | [x] PASS |

## Findings Summary

| # | Severity | Screen | Issue | Resolution |
|---|---|---|---|---|
| 1 | **Medium** | 07 | English i18n keys (`upcomingActivitiesTitle`, `programSchedulesTitle`, `liveStreamTitle`, `liveNow`, `watchOnYouTube`, `liveStreamDescription`) misplaced under `pages.adminActivities` instead of `pages.home` in `en/common.json`. Section headings stayed French when toggling to English. | **FIXED** during validation — keys moved to correct `pages.home` path, duplicates removed from `pages.adminActivities`. |

## Overall Assessment

**PASS** (1 finding found and fixed during validation)

All 8 screens comply with the UX design specification after the i18n fix. Activity cards correctly implement the list variant (28px avatar, 4px department color left-border, rounded-2xl). Both sections use proper responsive layouts (single column mobile, 2-column grid desktop for activities, stacked→side-by-side for program times). Empty states behave correctly (warm message for activities, completely hidden for schedules). Public register rules respected (no micro-labels, min 14px text).
