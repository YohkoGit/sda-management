# UI Validation — Compliance Report

**Story:** 5-4-public-department-overview
**Date:** 2026-03-13
**Screens captured:** 6
**Overall assessment:** PASS

## UX Spec Sections Referenced

- §6 Visual Design Foundation — Color System (indigo-600 accent, department hex colors as left-border)
- §6 Visual Design Foundation — Typography System (text-2xl font-bold headings, text-lg font-bold card titles, text-sm body, 14px minimum on public layer)
- §7 Design Direction — Mock Faithful Command (rounded-2xl cards, bg-slate-50 alternating sections)
- §8 User Journey Flows — Journey 1: Open and Know (department overview as passive consumption)
- §9 Component Strategy — Card pattern (border-l-4, inline borderLeftColor, Badge variant=secondary)
- §10 UX Consistency Patterns — Public Register (warm labels, sentence-case headings, no micro-labels)
- §11 Responsive Design & Accessibility (grid-cols-1 / sm:grid-cols-2 / lg:grid-cols-3, aria-labelledby, title attributes)

## Per-Screen Compliance

### Screen 01 — departments-mobile (375x812, FR)

| Check | Status |
|---|---|
| Section heading "Nos Departements" in text-2xl font-bold text-slate-900 | [x] PASS |
| bg-slate-50 section background (visual separation from ProgramTimes) | [x] PASS |
| Single-column layout on mobile (grid-cols-1) | [x] PASS |
| Cards: rounded-2xl border border-l-4 border-slate-200 bg-white p-4 | [x] PASS |
| 4px left border with department hex color (inline borderLeftColor) | [x] PASS |
| Department name in text-lg font-bold text-slate-900 | [x] PASS |
| Abbreviation badge (Badge variant=secondary) next to name | [x] PASS |
| Separator line (border-t border-slate-100) before next activity | [x] PASS |
| Next activity: locale date + time + title in text-sm text-slate-500 | [x] PASS |
| "Aucune activite planifiee" in text-sm italic text-slate-400 | [x] PASS |
| Minimum 14px text (public register) | [x] PASS |
| mx-auto max-w-7xl px-4 py-8 inner wrapper | [x] PASS |
| gap-4 between cards | [x] PASS |
| No hover effects, no cursor-pointer (static cards) | [x] PASS |

### Screen 02 — departments-desktop (1280x800, FR)

| Check | Status |
|---|---|
| 3-column grid layout (lg:grid-cols-3) | [x] PASS |
| bg-slate-50 section background | [x] PASS |
| sm:py-12 section vertical padding on desktop | [x] PASS |
| max-w-7xl content constraint | [x] PASS |
| Department cards with department color left-border accent | [x] PASS |
| Badge variant=secondary for abbreviation | [x] PASS |
| Cards have sm:p-5 padding on desktop | [x] PASS |
| gap-4 between cards | [x] PASS |

### Screen 03 — departments-tablet (768x1024, FR)

| Check | Status |
|---|---|
| 2-column grid layout (sm:grid-cols-2) | [x] PASS |
| Cards evenly distributed across 2 columns | [x] PASS |
| bg-slate-50 background | [x] PASS |
| Readable card content at tablet width | [x] PASS |

### Screen 04 — departments-empty-hidden (375x812, FR)

| Check | Status |
|---|---|
| No "Nos Departements" heading visible | [x] PASS |
| No empty container or gap where section would be | [x] PASS |
| Program Times section flows to page end cleanly | [x] PASS |

### Screen 05 — departments-error-mobile (375x812, FR)

| Check | Status |
|---|---|
| Section heading "Nos Departements" still visible | [x] PASS |
| Error message text (loadError key) in text-base text-slate-500 | [x] PASS |
| No broken layout, no crash | [x] PASS |

### Screen 06 — departments-english-desktop (1280x800, EN)

| Check | Status |
|---|---|
| Section heading "Our Departments" (English) | [x] PASS |
| "No planned activities" for dept without next activity (English) | [x] PASS |
| Date format adapts to English locale ("Friday 13 March", "Saturday 21 March") | [x] PASS |

## Findings Summary

| Severity | Screen | Issue |
|---|---|---|
| — | — | No findings — all checks pass |

## Notes

- **Description truncation (line-clamp-2):** Cannot verify visually because seeded departments have no descriptions in the database. The component code handles this correctly (`dept.description && ...` with `line-clamp-2` and `title` attribute). Covered by unit test #2 in DepartmentOverviewSection.test.tsx.
- **Skeleton loading state (AC #7):** Not captured via Playwright (requires API delay interception). Covered by unit test #7 which verifies `data-slot="skeleton"` elements render.
- **Department colors:** All 4 departments display distinct left-border colors (indigo/blue for Diaconnat, rose/red for JA, teal for Musique, purple for MIFEM) — matching the hex values stored in the database.
- **Date formatting:** French format verified ("vendredi 13 mars 19h00"), English format verified ("Friday 13 March 19h00"). Time always in French format ("19h00") per established pattern.

## Acceptance Criteria Coverage

| AC | Description | Visual | Unit Test |
|---|---|---|---|
| #1 | Department overview section on public dashboard | Screen 01, 02 | Test #1, #2 |
| #2 | Department card layout | Screen 01, 02 | Test #3 |
| #3 | Next activity per department | Screen 01, 06 | Test #4, #5 |
| #4 | Responsive grid (1/2/3 col) | Screen 01, 03, 02 | — |
| #5 | Public API endpoint | — (backend) | 566 backend tests |
| #6 | Empty states (hidden section, error) | Screen 04, 05 | Test #6, #8 |
| #7 | Skeleton loading | — (edge case) | Test #7 |
| #8 | Accessibility (aria-labelledby, title, h2) | Snapshot verified | Test #1 |
